import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { addEnergyValue, setRevenueReleased } from '@/lib/energy-utils';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'Prefer': 'return=representation', 'Cache-Control': 'no-cache' } },
  });
}

/**
 * 5%智算金分配规则：
 * - 会员: 2% (profit_rate对应的实际收益)
 * - 服务商: 2%
 * - 直推人: 0.25%
 * - 上级服务商: 0.25%
 * - 网点(分公司): 0.1%
 * - 公司(运营): 0.4%
 */
interface DistributionResult {
  userId: string;
  role: string;
  amount: number;
  description: string;
  success: boolean;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userProductIds } = body;

    if (!userProductIds || !Array.isArray(userProductIds) || userProductIds.length === 0) {
      return NextResponse.json({ success: false, message: '请选择要解锁的产品' }, { status: 400 });
    }

    const sb = getSupabaseClient();

    // 1. 获取待解锁的持仓记录
    const { data: userProducts, error: upErr } = await sb
      .from('user_products')
      .select('id, user_id, product_id, purchase_price, expected_profit, market_fee, revenue_released, status, purchase_date, expire_date')
      .in('id', userProductIds);

    if (upErr || !userProducts || userProducts.length === 0) {
      return NextResponse.json({ success: false, message: '未找到可解锁的产品' }, { status: 404 });
    }

    // 2. 先收集所有待解锁的product_id，用于去重查询
    const allProductIds = userProducts.map((up: { product_id: string }) => up.product_id);

    // 3. 检查哪些产品已有分配记录（避免重复分配energy_value和重复写记录）
    // 用 provider_revenue_distribution 去重（release_records表可能为空）
    const { data: existingRecords } = await sb
      .from('provider_revenue_distribution')
      .select('product_id, member_id, product_price')
      .in('product_id', allProductIds);

    // 构建已分配的集合：product_id + member_id 组合去重
    const releasedSet = new Set<string>(
      (existingRecords || []).map((r: { product_id: string; member_id: string }) => `${r.product_id}|${r.member_id}`)
    );

    // 过滤出需要分配收益的产品（未分配过的）
    const toDistribute: Array<{ id: string; product_id: string; user_id: string; purchase_price: number; purchase_date?: string }> = userProducts.filter((up: { id: string; product_id: string; user_id: string }) => 
      !releasedSet.has(`${up.product_id}|${up.user_id}`)
    );

    if (toDistribute.length === 0) {
      return NextResponse.json({ success: true, message: '所有产品已分配过收益', data: { total: userProducts.length, success: 0, skipped: userProducts.length } });
    }

    const productIds: string[] = toDistribute.map((up: { product_id: string }) => up.product_id);
    
    // 4. 获取产品信息
    const { data: products } = await sb
      .from('products')
      .select('id, name, price, period, total_rate, market_rate, profit_rate, provider_id, code')
      .in('id', productIds);

    const productMap = new Map<string, any>((products || []).map((p: any) => [p.id, p]));

    // 4. 获取所有相关的用户信息
    const userIds = new Set<string>();
    const providerIds = new Set<string>();
    
    for (const up of toDistribute as any[]) {
      userIds.add(up.user_id);
      const product = productMap.get(up.product_id);
      if (product?.provider_id) providerIds.add(product.provider_id);
    }

    const allUserIds = [...userIds, ...providerIds];
    const { data: users } = await sb
      .from('users')
      .select('id, username, role, provider_id, inviter_id, branch_id, energy_value')
      .in('id', allUserIds);

    const userMap = new Map<string, any>((users || []).map((u: any) => [u.id, u]));

    // 5. 获取服务商的上级服务商信息
    const providerUserIds = [...providerIds];
    const { data: providers } = await sb
      .from('providers')
      .select('user_id, id, parent_provider_id')
      .in('user_id', providerUserIds);

    const providerMap = new Map((providers || []).map((p: { user_id: string }) => [p.user_id, p]));

    // 获取所有服务商（用于判断上级）
    const { data: allProviders } = await sb
      .from('providers')
      .select('user_id, id, parent_provider_id');

    const allProviderMap = new Map<string, any>((allProviders || []).map((p: any) => [p.user_id, p]));

    // 获取分公司用户信息
    const branchIds = new Set<string>();
    for (const u of users || []) {
      if (u.branch_id) branchIds.add(u.branch_id);
    }
    
    let branchUsers: { id: string; username: string }[] = [];
    if (branchIds.size > 0) {
      const { data: bUsers } = await sb
        .from('users')
        .select('id, username')
        .in('id', [...branchIds]);
      branchUsers = bUsers || [];
    }
    const branchUserMap = new Map<string, any>(branchUsers.map((u: any) => [u.id, u]));

    // 获取admin用户
    const { data: adminUsers } = await sb
      .from('users')
      .select('id, username')
      .eq('role', 'admin')
      .limit(1);
    const adminUser = adminUsers?.[0];

    // 6. 逐个处理解锁
    const results: DistributionResult[] = [];
    const distributionLog: string[] = [];
    let successCount = 0;

    for (const up of toDistribute) {
      const product = productMap.get(up.product_id);
      if (!product) {
        distributionLog.push(`产品不存在: ${up.product_id}`);
        continue;
      }

      const purchasePrice = Number(up.purchase_price) || 0;
      const productPrice = Number(product.price) || purchasePrice;
      
      // 5% 智算金 = 产品价格 × 5%
      const revenue5pct = productPrice * 0.05;
      
      // 分配金额
      const memberShare = Math.round(productPrice * 0.02 * 100) / 100;    // 2%
      const providerShare = Math.round(productPrice * 0.02 * 100) / 100;  // 2%
      const inviterShare = Math.round(productPrice * 0.0025 * 100) / 100; // 0.25%
      const upstreamShare = Math.round(productPrice * 0.0025 * 100) / 100; // 0.25%
      const branchShare = Math.round(productPrice * 0.001 * 100) / 100;   // 0.1%
      const companyShare = Math.round(productPrice * 0.004 * 100) / 100;  // 0.4%

      const holder = userMap.get(up.user_id);
      const provider = product.provider_id ? userMap.get(product.provider_id) : null;

      // 跟踪实际分配去向（用于写记录）
      let actualDirectRewardTo: string | null = null;
      let actualDirectReward: number = 0;
      let actualProviderTotal = providerShare; // 服务商总收益（含直推归入）
      let actualUpstreamProviderId: string | null = null;
      let actualUpstreamShare: number = 0;
      let actualBranchTotal = branchShare; // 网点总收益（含上级归入）
      let actualCompanyShare = companyShare;

      // (1) 会员 +2%
      if (holder) {
        const r = await addEnergyValue(holder.id, memberShare, `解锁收益-会员${holder.username}`, up.user_id, 'profit_release');
        results.push({ userId: holder.id, role: 'member', amount: memberShare, description: `会员${holder.username}`, success: r !== null });
      }

      // (2) 服务商 +2%
      if (provider) {
        const r = await addEnergyValue(provider.id, providerShare, `解锁收益-服务商${provider.username}`, up.user_id, 'provider_share');
        results.push({ userId: provider.id, role: 'provider', amount: providerShare, description: `服务商${provider.username}`, success: r !== null });
      }

      // (3) 直推人 +0.25%
      const inviterUser = holder?.inviter_id ? userMap.get(holder.inviter_id) : null;
      if (inviterUser && inviterUser.role !== 'provider' && !allProviderMap.has(inviterUser.id)) {
        // 直推人是会员 → 给直推人
        const r = await addEnergyValue(inviterUser.id, inviterShare, `解锁收益-直推${inviterUser.username}`, up.user_id, 'direct_reward');
        results.push({ userId: inviterUser.id, role: 'inviter', amount: inviterShare, description: `直推${inviterUser.username}`, success: r !== null });
        actualDirectRewardTo = inviterUser.id;
        actualDirectReward = inviterShare;
      } else {
        // 无直推或直推人是服务商 → 归服务商
        if (provider) {
          const r = await addEnergyValue(provider.id, inviterShare, `解锁收益-直推归服务商${provider.username}`, up.user_id, 'provider_share');
          results.push({ userId: provider.id, role: 'provider_inviter', amount: inviterShare, description: `直推归服务商${provider.username}`, success: r !== null });
          actualProviderTotal += inviterShare;
          actualDirectRewardTo = provider.id;
          actualDirectReward = inviterShare;
        }
      }

      // (4) 上级服务商 +0.25%
      let upstreamDistributed = false;
      if (provider) {
        const providerInfo = allProviderMap.get(provider.id);
        if (providerInfo?.parent_provider_id) {
          // 查上级服务商的user_id
          const parentProviderInfo = allProviders?.find((p: any) => p.id === providerInfo.parent_provider_id);
          if (parentProviderInfo?.user_id) {
            const upstreamProvider = userMap.get(parentProviderInfo.user_id);
            if (upstreamProvider && (upstreamProvider.role === 'provider' || allProviderMap.has(upstreamProvider.id))) {
              const r = await addEnergyValue(upstreamProvider.id, upstreamShare, `解锁收益-上级服务商${upstreamProvider.username}`, up.user_id, 'upstream_provider_share');
              results.push({ userId: upstreamProvider.id, role: 'upstream_provider', amount: upstreamShare, description: `上级服务商${upstreamProvider.username}`, success: r !== null });
              upstreamDistributed = true;
              actualUpstreamProviderId = parentProviderInfo.user_id;
              actualUpstreamShare = upstreamShare;
            }
          }
        }
      }
      if (!upstreamDistributed) {
        // 无上级服务商 → 归网点
        const branchId = holder?.branch_id || provider?.branch_id;
        if (branchId) {
          const branchUser = branchUserMap.get(branchId);
          const r = await addEnergyValue(branchId, upstreamShare, `解锁收益-上级归网点${branchUser?.username || ''}`, up.user_id, 'branch_share');
          results.push({ userId: branchId, role: 'branch_upstream', amount: upstreamShare, description: `上级归网点${branchUser?.username || ''}`, success: r !== null });
          actualBranchTotal += upstreamShare;
        }
      }

      // (5) 网点(分公司) +0.1%
      if (holder?.branch_id) {
        const branchUser = branchUserMap.get(holder.branch_id);
        if (branchUser) {
          const r = await addEnergyValue(holder.branch_id, branchShare, `解锁收益-网点${branchUser.username}`, up.user_id, 'branch_share');
          results.push({ userId: holder.branch_id, role: 'branch', amount: branchShare, description: `网点${branchUser.username}`, success: r !== null });
        }
      }

      // (6) 公司运营 +0.4%
      if (adminUser) {
        const r = await addEnergyValue(adminUser.id, companyShare, `解锁收益-公司运营`, up.user_id, 'company_share');
        results.push({ userId: adminUser.id, role: 'admin', amount: companyShare, description: '公司运营', success: r !== null });
      }

      // (7) 标记为已释放 + 状态改为unlocked
      const releaseOk = await setRevenueReleased(up.id, true);
      // 更新持仓状态为已解锁
      try {
        await sb.from('user_products').update({ status: 'unlocked' }).eq('id', up.id);
      } catch (e: any) {
        console.error('[unlock] 更新status=unlocked失败:', e?.message);
      }
      
      if (releaseOk) {
        successCount++;
        distributionLog.push(
          `${product.name} ¥${productPrice}: 会员+${memberShare}, 服务商+${providerShare}, ` +
          `直推+${inviterShare}, 上级+${upstreamShare}, 网点+${branchShare}, 公司+${companyShare}`
        );
      } else {
        distributionLog.push(`${product.name}: 标记revenue_released失败`);
      }

      // (8) 写入 release_records 完整记录
      try {
        await sb.from('release_records').insert({
          product_id: up.product_id,
          product_name: product.name || 'Token存储包',
          product_price: productPrice,
          release_amount: revenue5pct,
          release_rate: 5,
          member_id: up.user_id,
          member_name: holder?.username || '',
          member_share: memberShare,
          direct_referral_id: holder?.inviter_id || null,
          direct_referral_share: actualDirectReward,
          provider_id: product.provider_id || '',
          provider_name: provider?.username || '',
          provider_share: actualProviderTotal,
          parent_provider_id: actualUpstreamProviderId,
          parent_provider_share: actualUpstreamShare,
          branch_id: holder?.branch_id || provider?.branch_id || '',
          branch_share: actualBranchTotal,
          company_share: actualCompanyShare,
          created_at: new Date().toISOString()
        });
        distributionLog.push(`  → release_records 已写入`);
      } catch (e: any) {
        console.error('[unlock] 写入release_records失败:', e?.message);
        distributionLog.push(`  → release_records 写入失败: ${e?.message}`);
      }

      // (9) 写入 provider_revenue_distribution 完整记录
      try {
        await sb.from('provider_revenue_distribution').insert({
          id: `prd-${up.id}-${Date.now()}`,
          product_id: up.product_id,
          provider_id: product.provider_id || '',
          member_id: up.user_id,
          member_inviter_id: holder?.inviter_id || null,
          product_price: productPrice,
          market_fee: productPrice * (Number(product.market_rate) || 5) / 100,
          provider_share: actualProviderTotal,
          direct_reward: actualDirectReward,
          direct_reward_to: actualDirectRewardTo,
          parent_provider_share: actualUpstreamShare,
          parent_provider_id: actualUpstreamProviderId,
          branch_share: actualBranchTotal,
          branch_id: holder?.branch_id || provider?.branch_id || '',
          company_share: actualCompanyShare,
          status: 'completed',
          created_at: new Date().toISOString()
        });
        distributionLog.push(`  → provider_revenue_distribution 已写入`);
      } catch (e: any) {
        console.error('[unlock] 写入provider_revenue_distribution失败:', e?.message);
        distributionLog.push(`  → provider_revenue_distribution 写入失败: ${e?.message}`);
      }

      // (10) 写入 member_revenue 完整记录
      try {
        const purchaseDateStr = String((up as any).purchase_date || new Date().toISOString());
        const holdingMs = Date.now() - new Date(purchaseDateStr).getTime();
        const holdingDays = Math.max(1, Math.floor(holdingMs / (1000 * 60 * 60 * 24)));
        await sb.from('member_revenue').insert({
          user_id: up.user_id,
          user_product_id: up.id,
          principal: purchasePrice,
          profit: memberShare,
          total_amount: purchasePrice + memberShare,
          converted_to_energy: 0,
          status: 'completed',
          product_name: product.name || 'Token存储包',
          product_code: product.code || '',
          product_period: product.period || 7,
          total_rate: product.total_rate || 0,
          profit_rate: product.profit_rate || 0,
          market_rate: product.market_rate || 0,
          holding_days: holdingDays
        });
        distributionLog.push(`  → member_revenue 已写入`);
      } catch (e: any) {
        console.error('[unlock] 写入member_revenue失败:', e?.message);
        distributionLog.push(`  → member_revenue 写入失败: ${e?.message}`);
      }

      // (11) 写入 branch_revenue_records 网点收益记录
      const branchId = holder?.branch_id || provider?.branch_id;
      if (branchId) {
        try {
          await sb.from('branch_revenue_records').insert({
            branch_id: branchId,
            product_id: up.product_id,
            product_name: product.name || 'Token存储包',
            product_price: productPrice,
            member_id: up.user_id,
            member_name: holder?.username || '',
            provider_id: product.provider_id || '',
            provider_name: provider?.username || '',
            branch_share: actualBranchTotal,
            company_share: actualCompanyShare,
            total_amount: revenue5pct,
            status: 'completed',
            created_at: new Date().toISOString()
          });
          distributionLog.push(`  → branch_revenue_records 已写入`);
        } catch (e: any) {
          console.error('[unlock] 写入branch_revenue_records失败:', e?.message);
          distributionLog.push(`  → branch_revenue_records 写入失败: ${e?.message}`);
        }
      }

      // (12) 写入 admin_revenue_records 公司运营收益记录
      if (adminUser) {
        try {
          await sb.from('admin_revenue_records').insert({
            admin_id: adminUser.id,
            product_id: up.product_id,
            product_name: product.name || 'Token存储包',
            product_price: productPrice,
            member_id: up.user_id,
            member_name: holder?.username || '',
            provider_id: product.provider_id || '',
            provider_name: provider?.username || '',
            branch_id: branchId || '',
            company_share: actualCompanyShare,
            total_amount: revenue5pct,
            status: 'completed',
            created_at: new Date().toISOString()
          });
          distributionLog.push(`  → admin_revenue_records 已写入`);
        } catch (e: any) {
          console.error('[unlock] 写入admin_revenue_records失败:', e?.message);
          // 表可能不存在，静默处理
          distributionLog.push(`  → admin_revenue_records 写入失败: ${e?.message}`);
        }
      }
    }

    const failedResults = results.filter(r => !r.success);
    
    console.log(`[unlock] 完成: 成功${successCount}/${toDistribute.length}, 分配失败${failedResults.length}`);
    distributionLog.forEach(l => console.log(`  ${l}`));

    return NextResponse.json({
      success: true,
      message: `成功解锁 ${successCount} 个产品`,
      data: {
        total: toDistribute.length,
        success: successCount,
        distributions: results,
        failedDistributions: failedResults,
        log: distributionLog,
      },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[unlock] Error:', msg);
    return NextResponse.json({ success: false, message: '解锁失败: ' + msg }, { status: 500 });
  }
}
