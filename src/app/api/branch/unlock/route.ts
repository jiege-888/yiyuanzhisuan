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

    for (const up of toRelease) {
      const purchasePrice = Number(up.purchase_price);

      // 获取产品信息
      const { data: productInfo } = await supabase
        .from('products')
        .select('id, name, code, price, period, profit_rate, market_rate, provider_id')
        .eq('id', up.product_id)
        .single();

      if (!productInfo) continue;

      // 获取会员信息
      const { data: memberInfo } = await supabase
        .from('users')
        .select('id, username, unique_id, phone, inviter_id, provider_id')
        .eq('id', up.user_id)
        .single();

      if (!memberInfo) continue;

      // === 5%智算金分配 ===
      const totalReleaseRate = 5;
      const totalReleaseAmount = purchasePrice * totalReleaseRate / 100;
      const memberShare = purchasePrice * 2 / 100;       // 会员2%
      const providerShare = purchasePrice * 2 / 100;     // 服务商2%
      const inviterShare = purchasePrice * 0.25 / 100;   // 直推0.25%
      const upProviderShare = purchasePrice * 0.25 / 100; // 上级服务商0.25%
      const branchShare = purchasePrice * 0.1 / 100;     // 网点0.1%
      const companyShare = purchasePrice * 0.4 / 100;    // 公司0.4%

      // 1. 会员2% → balance（用SQL直接执行，避免静默失败）
      try {
        await pgExecute(`UPDATE users SET balance = COALESCE(balance, 0) + ${memberShare} WHERE id = '${up.user_id}'`);
      } catch (e) {
        console.error('更新会员balance失败:', e);
      }

      // 2. 服务商2% → balance
      if (productInfo.provider_id) {
        try {
          await pgExecute(`UPDATE users SET balance = COALESCE(balance, 0) + ${providerShare} WHERE id = '${productInfo.provider_id}'`);
        } catch (e) {
          console.error('更新服务商balance失败:', e);
        }
      }

      // 3. 直推0.25% → balance
      if (memberInfo.inviter_id) {
        try {
          await pgExecute(`UPDATE users SET balance = COALESCE(balance, 0) + ${inviterShare} WHERE id = '${memberInfo.inviter_id}'`);
        } catch (e) {
          console.error('更新直推人balance失败:', e);
        }
      }

      // 4. 上级服务商0.25% → balance（memberInfo.provider_id 是该会员所属的服务商）
      if (memberInfo.provider_id) {
        try {
          await pgExecute(`UPDATE users SET balance = COALESCE(balance, 0) + ${upProviderShare} WHERE id = '${memberInfo.provider_id}'`);
        } catch (e) {
          console.error('更新上级服务商balance失败:', e);
        }
      }

      // 5. 网点0.1% → balance（查该服务商所属分公司）
      if (productInfo.provider_id) {
        const { data: providerRecord } = await supabase.from('providers').select('branch_id').eq('user_id', productInfo.provider_id).maybeSingle();
        if (providerRecord?.branch_id) {
          try {
            await pgExecute(`UPDATE users SET balance = COALESCE(balance, 0) + ${branchShare} WHERE id = '${providerRecord.branch_id}'`);
          } catch (e) {
            console.error('更新网点balance失败:', e);
          }
        }
      }

      // 6. 公司0.4% → balance（admin用户）
      const { data: adminData } = await supabase.from('users').select('id').eq('role', 'admin').limit(1).maybeSingle();
      if (adminData) {
        try {
          await pgExecute(`UPDATE users SET balance = COALESCE(balance, 0) + ${companyShare} WHERE id = '${adminData.id}'`);
        } catch (e) {
          console.error('更新公司balance失败:', e);
        }
      }

      // 关键步骤：更新 user_products.revenue_released = true（用SQL直接执行）
      try {
        await pgExecute(`UPDATE user_products SET revenue_released = true WHERE id = '${up.id}'`);
      } catch (e) {
        console.error('更新revenue_released失败:', e);
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
          content: `您持有的产品 ${productInfo.name || ''} 已解锁，收益 ¥${memberShare.toFixed(2)} 已到账余额，产品可卖出`
        });
      } catch (_e) { /* 忽略 */ }

      distributionDetails.push({
        userProductId: up.id,
        purchasePrice,
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
      details: distributionDetails
    });
  } catch (err: any) {
    console.error('解锁释放失败:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
