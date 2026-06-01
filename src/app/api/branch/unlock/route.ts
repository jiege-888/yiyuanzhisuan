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
    // 支持"补发"模式：已解锁但没分配记录的产品也会重新分配收益
    const { data: userProducts, error: upErr } = await sb
      .from('user_products')
      .select('id, user_id, product_id, purchase_price, expected_profit, market_fee, revenue_released, status')
      .in('id', userProductIds);

    if (upErr || !userProducts || userProducts.length === 0) {
      return NextResponse.json({ success: false, message: '未找到可解锁的产品' }, { status: 404 });
    }

    // 2. 检查哪些产品已有分配记录（避免重复分配）
    const { data: existingRecords } = await sb
      .from('release_records')
      .select('user_product_id')
      .in('user_product_id', userProductIds);

    const releasedSet = new Set((existingRecords || []).map((r: { user_product_id: string }) => r.user_product_id));

    // 过滤出需要分配收益的产品（未分配过的）
    const toDistribute = userProducts.filter((up: { id: string }) => !releasedSet.has(up.id));

    const productIds = toDistribute.map((up: { product_id: string }) => up.product_id);
    
    // 3. 获取产品信息
    const { data: products } = await sb
      .from('products')
      .select('id, name, price, period, total_rate, market_rate, profit_rate, provider_id')
      .in('id', productIds);

    const productMap = new Map<string, any>((products || []).map((p: any) => [p.id, p]));

    // 3. 获取所有相关的用户信息
    const userIds = new Set<string>();
    const providerIds = new Set<string>();
    
    for (const up of toDistribute) {
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

    // 4. 获取服务商的上级服务商信息
    const providerUserIds = [...providerIds];
    const { data: providers } = await sb
      .from('providers')
      .select('user_id, id')
      .in('user_id', providerUserIds);

    const providerMap = new Map((providers || []).map((p: { user_id: string }) => [p.user_id, p]));

    // 获取上级服务商（providers表的上级）
    const { data: allProviders } = await sb
      .from('providers')
      .select('user_id, id');

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

    // 5. 逐个处理解锁
    const results: DistributionResult[] = [];
    const distributionLog: string[] = [];
    let successCount = 0;

    for (const up of userProducts) {
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

      // (1) 会员 +2%
      if (holder) {
        const r = await addEnergyValue(holder.id, memberShare, `解锁收益-会员${holder.username}`);
        results.push({ userId: holder.id, role: 'member', amount: memberShare, description: `会员${holder.username}`, success: r !== null });
      }

      // (2) 服务商 +2%
      if (provider) {
        const r = await addEnergyValue(provider.id, providerShare, `解锁收益-服务商${provider.username}`);
        results.push({ userId: provider.id, role: 'provider', amount: providerShare, description: `服务商${provider.username}`, success: r !== null });
      }

      // (3) 直推人 +0.25%
      if (holder?.inviter_id) {
        const inviter = userMap.get(holder.inviter_id);
        if (inviter) {
          const r = await addEnergyValue(inviter.id, inviterShare, `解锁收益-直推${inviter.username}`);
          results.push({ userId: inviter.id, role: 'inviter', amount: inviterShare, description: `直推${inviter.username}`, success: r !== null });
        }
      }

      // (4) 上级服务商 +0.25%
      if (provider) {
        const providerRecord = providerMap.get(provider.id);
        // 查找该服务商的上级服务商
        const providerUser = userMap.get(provider.id);
        if (providerUser?.inviter_id) {
          const inviterUser = userMap.get(providerUser.inviter_id);
          if (inviterUser && (inviterUser.role === 'provider' || allProviderMap.has(inviterUser.id))) {
            const r = await addEnergyValue(inviterUser.id, upstreamShare, `解锁收益-上级服务商${inviterUser.username}`);
            results.push({ userId: inviterUser.id, role: 'upstream_provider', amount: upstreamShare, description: `上级服务商${inviterUser.username}`, success: r !== null });
          }
        }
      }

      // (5) 网点(分公司) +0.1%
      if (holder?.branch_id) {
        const branchUser = branchUserMap.get(holder.branch_id);
        if (branchUser) {
          const r = await addEnergyValue(holder.branch_id, branchShare, `解锁收益-网点${branchUser.username}`);
          results.push({ userId: holder.branch_id, role: 'branch', amount: branchShare, description: `网点${branchUser.username}`, success: r !== null });
        }
      }

      // (6) 公司运营 +0.4%
      if (adminUser) {
        const r = await addEnergyValue(adminUser.id, companyShare, `解锁收益-公司运营`);
        results.push({ userId: adminUser.id, role: 'admin', amount: companyShare, description: '公司运营', success: r !== null });
      }

      // (7) 标记为已释放
      const releaseOk = await setRevenueReleased(up.id, true);
      
      if (releaseOk) {
        successCount++;
        distributionLog.push(
          `${product.name} ¥${productPrice}: 会员+${memberShare}, 服务商+${providerShare}, ` +
          `直推+${inviterShare}, 上级+${upstreamShare}, 网点+${branchShare}, 公司+${companyShare}`
        );
      } else {
        distributionLog.push(`${product.name}: 标记revenue_released失败`);
      }

      // (8) 写入分配记录（只记录核心字段，避免schema不匹配）
      try {
        await sb.from('release_records').insert({
          user_product_id: up.id,
          user_id: up.user_id,
          product_id: up.product_id,
          created_at: new Date().toISOString()
        });
      } catch (e: any) {
        console.error('[unlock] 写入release_records失败:', e?.message);
      }
    }

    const failedResults = results.filter(r => !r.success);
    
    console.log(`[unlock] 完成: 成功${successCount}/${userProducts.length}, 分配失败${failedResults.length}`);
    distributionLog.forEach(l => console.log(`  ${l}`));

    return NextResponse.json({
      success: true,
      message: `成功解锁 ${successCount} 个产品`,
      data: {
        total: userProducts.length,
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
