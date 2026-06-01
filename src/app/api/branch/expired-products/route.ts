import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/env';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const providerId = searchParams.get('providerId');

    const url = getSupabaseUrl();
    const key = getSupabaseServiceRoleKey();
    const supabase = createClient(url, key);

    let targetProviderIds: string[] = [];

    if (providerId) {
      targetProviderIds = [providerId];
    } else if (branchId) {
      const { data: providers } = await supabase
        .from('providers')
        .select('user_id')
        .eq('branch_id', branchId);
      targetProviderIds = (providers || []).map((p: any) => p.user_id);
    } else {
      return NextResponse.json({ success: false, message: '缺少branchId或providerId' }, { status: 400 });
    }

    if (targetProviderIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 查询这些服务商的产品
    const { data: products } = await supabase
      .from('products')
      .select('id, provider_id')
      .in('provider_id', targetProviderIds);

    const productIds = (products || []).map((p: any) => p.id);
    if (productIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 查询到期未释放的持仓
    const now = new Date().toISOString();
    const { data: expired, error: upError } = await supabase
      .from('user_products')
      .select(`
        id, user_id, product_id, purchase_price, purchase_date, expire_date,
        status, revenue_released, expected_profit,
        product:products(id, name, code, price, period, total_rate, market_rate, profit_rate)
      `)
      .in('product_id', productIds)
      .eq('status', 'holding')
      .eq('revenue_released', false)
      .lt('expire_date', now);

    if (upError) {
      return NextResponse.json({ success: false, message: '查询到期产品失败' }, { status: 500 });
    }

    // 批量查询持有人名称
    const userIds = [...new Set((expired || []).map((e: any) => e.user_id))];
    const { data: users } = await supabase
      .from('users')
      .select('id, username')
      .in('id', userIds);

    const userNameMap: Record<string, string> = {};
    (users || []).forEach((u: any) => {
      userNameMap[u.id] = u.username;
    });

    const result = (expired || []).map((e: any) => ({
      ...e,
      product_name: e.product?.name || '-',
      product_code: e.product?.code || '-',
      price: e.product?.price || e.purchase_price,
      period: e.product?.period || '-',
      total_rate: e.product?.total_rate || 0,
      market_rate: e.product?.market_rate || 0,
      profit_rate: e.product?.profit_rate || 0,
      member_name: userNameMap[e.user_id] || '-'
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error('查询到期产品失败:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
