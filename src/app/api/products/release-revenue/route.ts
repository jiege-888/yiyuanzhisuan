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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: '缺少userId' }, { status: 400 });
    }

    const sb = getSupabaseClient();
    const now = new Date();

    // 1. 获取用户所有已到期但未释放收益的持仓
    const { data: userProducts, error: upErr } = await sb
      .from('user_products')
      .select('id, user_id, product_id, purchase_price, expected_profit, market_fee, revenue_released, expire_date, status')
      .eq('user_id', userId)
      .eq('revenue_released', false)
      .eq('status', 'holding');

    if (upErr) {
      return NextResponse.json({ success: false, message: '查询持仓失败' }, { status: 500 });
    }

    if (!userProducts || userProducts.length === 0) {
      return NextResponse.json({ success: true, message: '没有需要释放的产品', data: { released: 0 } });
    }

    // 过滤已到期的产品
    const expiredProducts = userProducts.filter((up: { expire_date: string }) => {
      if (!up.expire_date) return true; // 没有过期时间也视为到期
      return new Date(up.expire_date) <= now;
    });

    if (expiredProducts.length === 0) {
      return NextResponse.json({ success: true, message: '没有到期的产品', data: { released: 0 } });
    }

    // 2. 获取产品信息
    const productIds = expiredProducts.map((up: { product_id: string }) => up.product_id);
    const { data: products } = await sb
      .from('products')
      .select('id, name, price, period, total_rate, market_rate, profit_rate, provider_id')
      .in('id', productIds);

    const productMap = new Map<string, any>((products || []).map((p: any) => [p.id, p]));

    // 3. 获取用户信息
    const { data: holder } = await sb
      .from('users')
      .select('id, username, role, provider_id, inviter_id, branch_id, energy_value')
      .eq('id', userId)
      .single();

    if (!holder) {
      return NextResponse.json({ success: false, message: '用户不存在' }, { status: 404 });
    }

    // 4. 获取服务商信息
    const providerIds = new Set<string>();
    for (const p of products || []) {
      if (p.provider_id) providerIds.add(p.provider_id);
    }

    let providerUsers: { id: string; username: string; role: string; inviter_id: string | null; provider_id: string | null }[] = [];
    if (providerIds.size > 0) {
      const { data: pUsers } = await sb
        .from('users')
        .select('id, username, role, inviter_id, provider_id')
        .in('id', [...providerIds]);
      providerUsers = pUsers || [];
    }
    const providerUserMap = new Map<string, any>(providerUsers.map((u: any) => [u.id, u]));

    // 获取服务商的上级服务商
    const { data: allProviders } = await sb
      .from('providers')
      .select('user_id, id');
    const providerRecordMap = new Map<string, any>((allProviders || []).map((p: any) => [p.user_id, p]));

    // 获取直推人信息
    const inviterIds = new Set<string>();
    if (holder.inviter_id) inviterIds.add(holder.inviter_id);
    for (const pu of providerUsers) {
      if (pu.inviter_id) inviterIds.add(pu.inviter_id);
    }

    let inviterUsers: { id: string; username: string; role: string }[] = [];
    if (inviterIds.size > 0) {
      const { data: iUsers } = await sb
        .from('users')
        .select('id, username, role')
        .in('id', [...inviterIds]);
      inviterUsers = iUsers || [];
    }
    const inviterUserMap = new Map<string, any>(inviterUsers.map((u: any) => [u.id, u]));

    // 获取admin
    const { data: adminUsers } = await sb
      .from('users')
      .select('id, username')
      .eq('role', 'admin')
      .limit(1);
    const adminUser = adminUsers?.[0];

    // 5. 逐个释放
    let releasedCount = 0;
    const releaseLog: string[] = [];

    for (const up of expiredProducts) {
      const product = productMap.get(up.product_id);
      if (!product) continue;

      const productPrice = Number(product.price) || Number(up.purchase_price) || 0;

      // 5% 智算金分配
      const memberShare = Math.round(productPrice * 0.02 * 100) / 100;
      const providerShare = Math.round(productPrice * 0.02 * 100) / 100;
      const inviterShare = Math.round(productPrice * 0.0025 * 100) / 100;
      const upstreamShare = Math.round(productPrice * 0.0025 * 100) / 100;
      const branchShare = Math.round(productPrice * 0.001 * 100) / 100;
      const companyShare = Math.round(productPrice * 0.004 * 100) / 100;

      // (1) 会员 +2%
      await addEnergyValue(userId, memberShare, `到期释放-会员${holder.username}`);

      // (2) 服务商 +2%
      if (product.provider_id) {
        await addEnergyValue(product.provider_id, providerShare, `到期释放-服务商`);
      }

      // (3) 直推人 +0.25%（无直推或直推人是服务商 → 归服务商）
      const inviter = holder.inviter_id ? inviterUserMap.get(holder.inviter_id) : null;
      if (inviter && inviter.role !== 'provider' && !providerRecordMap.has(inviter.id)) {
        await addEnergyValue(holder.inviter_id!, inviterShare, `到期释放-直推${inviter.username}`);
      } else if (product.provider_id) {
        await addEnergyValue(product.provider_id, inviterShare, `到期释放-直推归服务商`);
      }

      // (4) 上级服务商 +0.25%（无上级服务商 → 归网点）
      let upstreamDistributed = false;
      if (product.provider_id) {
        const provUser = providerUserMap.get(product.provider_id);
        // 检查服务商的provider_id（即上级服务商）
        if (provUser?.provider_id && provUser.provider_id !== product.provider_id) {
          const upstreamProvider = inviterUserMap.get(provUser.provider_id);
          if (upstreamProvider && (upstreamProvider.role === 'provider' || providerRecordMap.has(upstreamProvider.id))) {
            await addEnergyValue(provUser.provider_id, upstreamShare, `到期释放-上级服务商${upstreamProvider.username}`);
            upstreamDistributed = true;
          }
        }
      }
      if (!upstreamDistributed && holder.branch_id) {
        await addEnergyValue(holder.branch_id, upstreamShare, `到期释放-上级归网点`);
      }

      // (5) 网点 +0.1%
      if (holder.branch_id) {
        await addEnergyValue(holder.branch_id, branchShare, `到期释放-网点`);
      }

      // (6) 公司 +0.4%
      if (adminUser) {
        await addEnergyValue(adminUser.id, companyShare, `到期释放-公司运营`);
      }

      // (7) 标记已释放
      const ok = await setRevenueReleased(up.id, true);
      if (ok) {
        releasedCount++;
        releaseLog.push(`${product.name} ¥${productPrice}: 会员+${memberShare} 服务商+${providerShare}`);
      }
    }

    console.log(`[release-revenue] 用户${userId}: 释放${releasedCount}个产品`);

    return NextResponse.json({
      success: true,
      message: `已释放 ${releasedCount} 个产品的收益`,
      data: { released: releasedCount, log: releaseLog },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[release-revenue] Error:', msg);
    return NextResponse.json({ success: false, message: '释放失败: ' + msg }, { status: 500 });
  }
}
