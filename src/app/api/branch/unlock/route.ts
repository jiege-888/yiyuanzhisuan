import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/env';

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

      // 1. 会员2% → balance
      const { data: memberData } = await supabase.from('users').select('balance').eq('id', up.user_id).single();
      if (memberData) {
        await supabase.from('users').update({ balance: (Number(memberData.balance) || 0) + memberShare }).eq('id', up.user_id);
      }

      // 2. 服务商2% → balance
      if (productInfo.provider_id) {
        const { data: provData } = await supabase.from('users').select('balance').eq('id', productInfo.provider_id).single();
        if (provData) {
          await supabase.from('users').update({ balance: (Number(provData.balance) || 0) + providerShare }).eq('id', productInfo.provider_id);
        }
      }

      // 3. 直推0.25% → balance
      if (memberInfo.inviter_id) {
        const { data: inviterData } = await supabase.from('users').select('balance').eq('id', memberInfo.inviter_id).single();
        if (inviterData) {
          await supabase.from('users').update({ balance: (Number(inviterData.balance) || 0) + inviterShare }).eq('id', memberInfo.inviter_id);
        }
      }

      // 4. 上级服务商0.25% → balance
      if (memberInfo.provider_id) {
        const { data: upProvData } = await supabase.from('users').select('balance').eq('id', memberInfo.provider_id).single();
        if (upProvData) {
          await supabase.from('users').update({ balance: (Number(upProvData.balance) || 0) + upProviderShare }).eq('id', memberInfo.provider_id);
        }
      }

      // 5. 网点0.1% → balance（查该服务商所属分公司）
      if (productInfo.provider_id) {
        const { data: providerRecord } = await supabase.from('providers').select('branch_id').eq('user_id', productInfo.provider_id).single();
        if (providerRecord?.branch_id) {
          const { data: branchData } = await supabase.from('users').select('balance').eq('id', providerRecord.branch_id).single();
          if (branchData) {
            await supabase.from('users').update({ balance: (Number(branchData.balance) || 0) + branchShare }).eq('id', providerRecord.branch_id);
          }
        }
      }

      // 6. 公司0.4% → balance（admin用户）
      const { data: adminData } = await supabase.from('users').select('id, balance').eq('role', 'admin').limit(1).single();
      if (adminData) {
        await supabase.from('users').update({ balance: (Number(adminData.balance) || 0) + companyShare }).eq('id', adminData.id);
      }

      // 更新 user_products: 标记收益已释放
      await supabase
        .from('user_products')
        .update({ revenue_released: true })
        .eq('id', up.id);

      // 写入收益释放记录
      try { await supabase.from('release_records').insert({
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
      }); } catch (_e) { /* 表不存在则忽略 */ }

      // 通知会员
      await supabase.from('notifications').insert({
        user_id: up.user_id,
        type: 'revenue',
        title: '收益已到账',
        content: `您持有的产品 ${productInfo.name || ''} 已解锁，收益 ¥${memberShare.toFixed(2)} 已到账余额，产品可卖出`
      });

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
