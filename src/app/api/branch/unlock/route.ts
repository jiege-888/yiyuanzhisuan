import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/env';
import { execute as pgExecute } from '@/lib/supabase-client';

// 解锁产品并释放收益（网点端操作：解锁即收益到账）
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userProductIds } = body; // 支持批量：数组

    if (!userProductIds || !Array.isArray(userProductIds) || userProductIds.length === 0) {
      return NextResponse.json({ success: false, message: '缺少userProductIds' }, { status: 400 });
    }

    const url = getSupabaseUrl();
    const key = getSupabaseServiceRoleKey();
    const supabase = createClient(url, key);

    // 查询要解锁的产品
    const { data: userProducts, error: queryError } = await supabase
      .from('user_products')
      .select('id, user_id, product_id, purchase_price, revenue_released, status')
      .in('id', userProductIds)
      .eq('status', 'holding');

    if (queryError) {
      return NextResponse.json({ success: false, message: '查询产品失败' }, { status: 500 });
    }

    if (!userProducts || userProducts.length === 0) {
      return NextResponse.json({ success: false, message: '未找到可解锁的产品' }, { status: 404 });
    }

    // 过滤已释放的
    const toRelease = userProducts.filter((up: any) => !up.revenue_released);
    if (toRelease.length === 0) {
      return NextResponse.json({ success: true, message: '所有产品已解锁', unlockedCount: 0 });
    }

    let unlockedCount = 0;
    const distributionDetails: any[] = [];
    const errors: string[] = [];

    for (const up of toRelease) {
      const purchasePrice = Number(up.purchase_price);

      // 获取产品信息
      const { data: productInfo } = await supabase
        .from('products')
        .select('id, name, code, price, period, profit_rate, market_rate, provider_id')
        .eq('id', up.product_id)
        .single();

      if (!productInfo) {
        errors.push(`产品 ${up.product_id} 不存在`);
        continue;
      }

      // 获取会员信息
      const { data: memberInfo } = await supabase
        .from('users')
        .select('id, username, unique_id, phone, inviter_id, provider_id')
        .eq('id', up.user_id)
        .single();

      if (!memberInfo) {
        errors.push(`用户 ${up.user_id} 不存在`);
        continue;
      }

      // === 5%智算金分配 ===
      // 产品价值的5%作为智算金释放
      const totalReleaseRate = 5;
      const totalReleaseAmount = purchasePrice * totalReleaseRate / 100;
      const memberShare = purchasePrice * 2 / 100;       // 会员2%
      const providerShare = purchasePrice * 2 / 100;     // 服务商2%
      const inviterShare = purchasePrice * 0.25 / 100;   // 直推0.25%
      const upProviderShare = purchasePrice * 0.25 / 100; // 上级服务商0.25%
      const branchShare = purchasePrice * 0.1 / 100;     // 网点0.1%
      const companyShare = purchasePrice * 0.4 / 100;    // 公司0.4%

      // 1. 会员2% → energy_value（智算金，用户前端显示的"智算金"就是energy_value）
      try {
        const result1 = await pgExecute(`UPDATE users SET energy_value = COALESCE(energy_value, 0) + ${memberShare} WHERE id = '${up.user_id}'`);
        console.log(`[unlock] 会员 ${memberInfo.username} energy_value +${memberShare}, result:`, JSON.stringify(result1));
      } catch (e) {
        console.error('[unlock] 更新会员energy_value失败:', e);
        errors.push(`会员 ${memberInfo.username} 智算金更新失败`);
      }

      // 2. 服务商2% → energy_value（服务商的智算金也是energy_value）
      if (productInfo.provider_id) {
        try {
          const result2 = await pgExecute(`UPDATE users SET energy_value = COALESCE(energy_value, 0) + ${providerShare} WHERE id = '${productInfo.provider_id}'`);
          console.log(`[unlock] 服务商 energy_value +${providerShare}, result:`, JSON.stringify(result2));
        } catch (e) {
          console.error('[unlock] 更新服务商energy_value失败:', e);
          errors.push(`服务商智算金更新失败`);
        }
      }

      // 3. 直推0.25% → energy_value
      if (memberInfo.inviter_id) {
        try {
          const result3 = await pgExecute(`UPDATE users SET energy_value = COALESCE(energy_value, 0) + ${inviterShare} WHERE id = '${memberInfo.inviter_id}'`);
          console.log(`[unlock] 直推人 energy_value +${inviterShare}, result:`, JSON.stringify(result3));
        } catch (e) {
          console.error('[unlock] 更新直推人energy_value失败:', e);
          errors.push(`直推人智算金更新失败`);
        }
      }

      // 4. 上级服务商0.25% → energy_value（memberInfo.provider_id 是该会员所属的服务商）
      // 注意：productInfo.provider_id 是产品所属服务商，和 memberInfo.provider_id 可能相同
      // 上级服务商应该是服务商的上级（如果有），否则就是产品所属服务商
      if (memberInfo.provider_id && memberInfo.provider_id !== productInfo.provider_id) {
        try {
          const result4 = await pgExecute(`UPDATE users SET energy_value = COALESCE(energy_value, 0) + ${upProviderShare} WHERE id = '${memberInfo.provider_id}'`);
          console.log(`[unlock] 上级服务商 energy_value +${upProviderShare}, result:`, JSON.stringify(result4));
        } catch (e) {
          console.error('[unlock] 更新上级服务商energy_value失败:', e);
          errors.push(`上级服务商智算金更新失败`);
        }
      }

      // 5. 网点0.1% → energy_value（查该服务商所属分公司）
      if (productInfo.provider_id) {
        const { data: providerRecord } = await supabase.from('providers').select('branch_id').eq('user_id', productInfo.provider_id).maybeSingle();
        if (providerRecord?.branch_id) {
          try {
            const result5 = await pgExecute(`UPDATE users SET energy_value = COALESCE(energy_value, 0) + ${branchShare} WHERE id = '${providerRecord.branch_id}'`);
            console.log(`[unlock] 网点 energy_value +${branchShare}, result:`, JSON.stringify(result5));
          } catch (e) {
            console.error('[unlock] 更新网点energy_value失败:', e);
            errors.push(`网点智算金更新失败`);
          }
        }
      }

      // 6. 公司0.4% → energy_value（admin用户）
      const { data: adminData } = await supabase.from('users').select('id').eq('role', 'admin').limit(1).maybeSingle();
      if (adminData) {
        try {
          const result6 = await pgExecute(`UPDATE users SET energy_value = COALESCE(energy_value, 0) + ${companyShare} WHERE id = '${adminData.id}'`);
          console.log(`[unlock] 公司 energy_value +${companyShare}, result:`, JSON.stringify(result6));
        } catch (e) {
          console.error('[unlock] 更新公司energy_value失败:', e);
          errors.push(`公司智算金更新失败`);
        }
      }

      // 关键步骤：更新 user_products.revenue_released = true
      try {
        const result7 = await pgExecute(`UPDATE user_products SET revenue_released = true WHERE id = '${up.id}'`);
        console.log(`[unlock] user_products ${up.id} revenue_released = true, result:`, JSON.stringify(result7));
      } catch (e) {
        console.error('[unlock] 更新revenue_released失败:', e);
        errors.push(`产品状态更新失败`);
      }

      // 写入收益释放记录
      try {
        await supabase.from('release_records').insert({
          user_product_id: up.id,
          user_id: up.user_id,
          product_id: up.product_id,
          total_release_amount: totalReleaseAmount,
          member_share: memberShare,
          provider_share: providerShare,
          inviter_share: inviterShare,
          up_provider_share: upProviderShare,
          branch_share: branchShare,
          company_share: companyShare,
          released_at: new Date().toISOString()
        });
      } catch (_e) { /* 表不存在则忽略 */ }

      // 通知会员
      try {
        await supabase.from('notifications').insert({
          user_id: up.user_id,
          type: 'revenue',
          title: '收益已到账',
          content: `您持有的产品 ${productInfo.name || ''} 已解锁，收益 ¥${memberShare.toFixed(2)} 已到账智算金，产品可卖出`
        });
      } catch (_e) { /* 忽略 */ }

      distributionDetails.push({
        userProductId: up.id,
        purchasePrice,
        totalReleaseAmount,
        memberShare,
        providerShare,
        inviterShare,
        upProviderShare,
        branchShare,
        companyShare
      });

      unlockedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `成功解锁 ${unlockedCount} 个产品，5%智算金已分配到账`,
      unlockedCount,
      details: distributionDetails,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err: any) {
    console.error('[unlock] 解锁释放失败:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
