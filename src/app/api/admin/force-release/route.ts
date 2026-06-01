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
    const { providerId, adminKey } = body;

    if (adminKey !== 'admin2024') {
      return NextResponse.json({ success: false, message: '无效的管理密钥' }, { status: 403 });
    }

    const sb = getSupabaseClient();

    // 获取所有未释放的持仓
    let query = sb
      .from('user_products')
      .select('id, user_id, product_id, purchase_price, revenue_released, status')
      .eq('revenue_released', false)
      .eq('status', 'holding');

    const { data: userProducts, error: upErr } = await query;

    if (upErr || !userProducts || userProducts.length === 0) {
      return NextResponse.json({ success: true, message: '没有需要释放的产品', data: { released: 0 } });
    }

    // 如果指定了providerId，需要过滤
    let filteredProducts = userProducts;
    if (providerId) {
      const { data: providerProducts } = await sb
        .from('products')
        .select('id')
        .eq('provider_id', providerId);
      const providerProductIds = new Set((providerProducts || []).map((p: { id: string }) => p.id));
      filteredProducts = userProducts.filter((up: { product_id: string }) => providerProductIds.has(up.product_id));
    }

    if (filteredProducts.length === 0) {
      return NextResponse.json({ success: true, message: '该服务商下没有需要释放的产品', data: { released: 0 } });
    }

    // 获取产品信息
    const productIds = filteredProducts.map((up: { product_id: string }) => up.product_id);
    const { data: products } = await sb
      .from('products')
      .select('id, name, price, provider_id')
      .in('id', productIds);
    const productMap = new Map<string, any>((products || []).map((p: any) => [p.id, p]));

    // 获取用户信息
    const userIds = [...new Set(filteredProducts.map((up: { user_id: string }) => up.user_id))];
    const { data: usersData } = await sb
      .from('users')
      .select('id, username, role, provider_id, inviter_id, branch_id')
      .in('id', userIds);
    const userMap = new Map<string, any>((usersData || []).map((u: any) => [u.id, u]));

    // 获取admin
    const { data: adminUsers } = await sb
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1);
    const adminUser = adminUsers?.[0];

    let releasedCount = 0;

    for (const up of filteredProducts) {
      const product = productMap.get(up.product_id);
      if (!product) continue;

      const holder = userMap.get(up.user_id);
      const productPrice = Number(product.price) || Number(up.purchase_price) || 0;

      // 5% 分配
      const memberShare = Math.round(productPrice * 0.02 * 100) / 100;
      const providerShare = Math.round(productPrice * 0.02 * 100) / 100;
      const inviterShare = Math.round(productPrice * 0.0025 * 100) / 100;
      const upstreamShare = Math.round(productPrice * 0.0025 * 100) / 100;
      const branchShare = Math.round(productPrice * 0.001 * 100) / 100;
      const companyShare = Math.round(productPrice * 0.004 * 100) / 100;

      // 会员 +2%
      await addEnergyValue(up.user_id, memberShare, '强制释放-会员');
      // 服务商 +2%
      if (product.provider_id) {
        await addEnergyValue(product.provider_id, providerShare, '强制释放-服务商');
      }
      // 直推 +0.25%
      if (holder?.inviter_id) {
        await addEnergyValue(holder.inviter_id, inviterShare, '强制释放-直推');
      }
      // 网点 +0.1%
      if (holder?.branch_id) {
        await addEnergyValue(holder.branch_id, branchShare, '强制释放-网点');
      }
      // 公司 +0.4%
      if (adminUser) {
        await addEnergyValue(adminUser.id, companyShare, '强制释放-公司');
      }
      // 上级服务商 +0.25%
      if (product.provider_id) {
        const { data: provUser } = await sb
          .from('users')
          .select('inviter_id')
          .eq('id', product.provider_id)
          .single();
        if (provUser?.inviter_id) {
          await addEnergyValue(provUser.inviter_id, upstreamShare, '强制释放-上级服务商');
        }
      }

      // 标记已释放
      const ok = await setRevenueReleased(up.id, true);
      if (ok) releasedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `已强制释放 ${releasedCount} 个产品的收益`,
      data: { released: releasedCount },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[force-release] Error:', msg);
    return NextResponse.json({ success: false, message: '释放失败: ' + msg }, { status: 500 });
  }
}
