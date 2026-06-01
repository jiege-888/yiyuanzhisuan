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

    // 查询所有到期的持仓（含各种状态：时间锁中、已解锁、已释放、已卖出）
    const now = new Date().toISOString();
    const { data: expired, error: upError } = await supabase
      .from('user_products')
      .select(`
        id, user_id, product_id, purchase_price, purchase_date, expire_date,
        status, revenue_released, expected_profit, unlock_time
      `)
      .in('product_id', productIds)
      .eq('status', 'holding')
      .lt('expire_date', now);

    if (upError) {
      return NextResponse.json({ success: false, message: '查询到期产品失败' }, { status: 500 });
    }

    // 批量查询产品信息
    const upProductIds = [...new Set((expired || []).map((e: any) => e.product_id))];
    const { data: productDetails } = await supabase
      .from('products')
      .select('id, name, code, price, period, total_rate, market_rate, profit_rate, provider_id')
      .in('id', upProductIds);

    const productMap: Record<string, any> = {};
    (productDetails || []).forEach((p: any) => {
      productMap[p.id] = p;
    });

    // 批量查询持有人名称
    const userIds = [...new Set((expired || []).map((e: any) => e.user_id))];
    const { data: users } = await supabase
      .from('users')
      .select('id, username, unique_id, phone')
      .in('id', userIds);

    const userNameMap: Record<string, any> = {};
    (users || []).forEach((u: any) => {
      userNameMap[u.id] = u;
    });

    // 批量查询服务商名称
    const providerIds2 = [...new Set((productDetails || []).map((p: any) => p.provider_id))];
    const { data: providerUsers } = await supabase
      .from('users')
      .select('id, username')
      .in('id', providerIds2);

    const providerNameMap: Record<string, string> = {};
    (providerUsers || []).forEach((u: any) => {
      providerNameMap[u.id] = u.username;
    });

    // 查询流转记录
    const upIds = (expired || []).map((e: any) => e.id);
    const { data: flowRecords } = await supabase
      .from('product_flow_records')
      .select('user_product_id, flow_type, buyer_name, seller_name, created_at')
      .in('user_product_id', upIds);

    const flowMap: Record<string, any[]> = {};
    (flowRecords || []).forEach((r: any) => {
      if (!flowMap[r.user_product_id]) flowMap[r.user_product_id] = [];
      flowMap[r.user_product_id].push(r);
    });

    const result = (expired || []).map((e: any) => {
      const product = productMap[e.product_id] || {};
      const user = userNameMap[e.user_id] || {};
      const flows = flowMap[e.id] || [];
      const isUnlocked = e.unlock_time ? new Date(e.unlock_time) <= new Date() : false;
      const isReleased = e.revenue_released === true;

      // 判断状态：时间锁中 → 已解锁 → 已释放收益 → 已卖出
      let releaseStatus = 'locked'; // 时间锁中
      if (isUnlocked && !isReleased) releaseStatus = 'unlocked'; // 已解锁未释放
      if (isReleased) releaseStatus = 'released'; // 已释放收益

      return {
        ...e,
        product_name: product.name || '-',
        product_code: product.code || '-',
        price: product.price || e.purchase_price,
        period: product.period || '-',
        total_rate: product.total_rate || 0,
        market_rate: product.market_rate || 0,
        profit_rate: product.profit_rate || 0,
        provider_name: providerNameMap[product.provider_id] || '-',
        member_name: user.username || '-',
        member_unique_id: user.unique_id || '-',
        member_phone: user.phone || '-',
        flow_records: flows,
        release_status: releaseStatus,
        unlock_time: e.unlock_time,
        // 计算5%智算金分配
        distribution_amount: Number(e.purchase_price) * 0.05,
        member_share: Number(e.purchase_price) * 0.02,
        provider_share: Number(e.purchase_price) * 0.02,
        inviter_share: Number(e.purchase_price) * 0.0025,
        parent_provider_share: Number(e.purchase_price) * 0.0025,
        branch_share: Number(e.purchase_price) * 0.001,
        company_share: Number(e.purchase_price) * 0.004
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error('查询到期产品失败:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
