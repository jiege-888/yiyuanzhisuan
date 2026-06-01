import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const providerId = searchParams.get('providerId');

    if (!branchId && !providerId) {
      return NextResponse.json({ success: false, message: '缺少branchId或providerId' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(supabaseUrl, supabaseKey);

    // 1. 找到下属服务商的 user_id 列表
    let providerUserIds: string[] = [];
    if (providerId) {
      // 指定了服务商，直接用
      providerUserIds = [providerId];
    } else if (branchId) {
      // 通过网点找所有下属服务商
      const { data: provList, error: provErr } = await sb
        .from('providers')
        .select('user_id')
        .eq('branch_id', branchId);
      if (provErr) {
        console.error('[expired-products] providers query error:', provErr);
        return NextResponse.json({ success: false, message: '查询服务商失败' }, { status: 500 });
      }
      providerUserIds = (provList || []).map((p: { user_id: string }) => p.user_id);
    }

    if (providerUserIds.length === 0) {
      return NextResponse.json({ success: true, data: { products: [], stats: { total: 0, locked: 0, unlocked: 0, totalValue: 0, totalRevenue5pct: 0 } } });
    }

    // 2. 找这些服务商下的所有会员
    const { data: members, error: memErr } = await sb
      .from('users')
      .select('id, username, unique_id, phone, inviter_id, provider_id')
      .in('provider_id', providerUserIds)
      .eq('role', 'member');

    if (memErr) {
      console.error('[expired-products] members query error:', memErr);
      return NextResponse.json({ success: false, message: '查询会员失败' }, { status: 500 });
    }

    const memberIds = (members || []).map((m: { id: string }) => m.id);

    if (memberIds.length === 0) {
      return NextResponse.json({ success: true, data: { products: [], stats: { total: 0, locked: 0, unlocked: 0, totalValue: 0, totalRevenue5pct: 0 } } });
    }

    // 3. 查这些会员的持仓产品
    const { data: userProducts, error: upErr } = await sb
      .from('user_products')
      .select('id, user_id, product_id, purchase_price, purchase_date, expire_date, status, revenue_released, expected_profit, market_fee')
      .in('user_id', memberIds)
      .eq('status', 'holding');

    if (upErr) {
      console.error('[expired-products] user_products query error:', upErr);
      return NextResponse.json({ success: false, message: '查询持仓失败' }, { status: 500 });
    }

    if (!userProducts || userProducts.length === 0) {
      return NextResponse.json({ success: true, data: { products: [], stats: { total: 0, locked: 0, unlocked: 0, totalValue: 0, totalRevenue5pct: 0 } } });
    }

    // 4. 获取关联的产品信息
    const productIds = [...new Set(userProducts.map((up: { product_id: string }) => up.product_id))];
    const { data: products } = await sb
      .from('products')
      .select('id, name, code, price, period, profit_rate, market_rate, total_rate, provider_id')
      .in('id', productIds);

    const productMap: Record<string, any> = {};
    (products || []).forEach((p: any) => { productMap[p.id] = p; });

    // 5. 获取推荐人信息
    const inviterIds = [...new Set((members || []).map((m: { inviter_id: string | null }) => m.inviter_id).filter(Boolean))] as string[];
    let inviters: Record<string, any> = {};
    if (inviterIds.length > 0) {
      const { data: inviterData } = await sb
        .from('users')
        .select('id, username, unique_id')
        .in('id', inviterIds);
      (inviterData || []).forEach((inv: any) => { inviters[inv.id] = inv; });
    }

    // 6. 会员信息映射
    const memberMap: Record<string, any> = {};
    (members || []).forEach((m: any) => { memberMap[m.id] = m; });

    // 7. 组装数据
    const resultList = userProducts.map((up: any) => {
      const product = productMap[up.product_id] || {};
      const member = memberMap[up.user_id] || {};
      const inviter = member.inviter_id ? inviters[member.inviter_id] : null;
      const purchasePrice = Number(up.purchase_price) || 0;
      const revenue5pct = purchasePrice * 0.05;

      return {
        id: up.id,
        userId: up.user_id,
        productId: up.product_id,
        purchasePrice,
        purchaseDate: up.purchase_date,
        expireDate: up.expire_date,
        status: up.status,
        revenueReleased: up.revenue_released,
        expectedProfit: Number(up.expected_profit) || 0,
        marketFee: Number(up.market_fee) || 0,
        productName: product.name || '-',
        productCode: product.code || '-',
        productPrice: Number(product.price) || 0,
        period: product.period || 0,
        profitRate: Number(product.profit_rate) || 0,
        marketRate: Number(product.market_rate) || 0,
        totalRate: Number(product.total_rate) || 0,
        holderName: member.username || '-',
        holderUniqueId: member.unique_id || '-',
        holderPhone: member.phone || '-',
        inviterId: member.inviter_id || null,
        inviterName: inviter?.username || '-',
        inviterUniqueId: inviter?.unique_id || '-',
        providerId: product.provider_id || member.provider_id || '',
        revenue5pct,
        memberShare: purchasePrice * 0.02,
        providerShare: purchasePrice * 0.02,
        inviterShare: purchasePrice * 0.0025,
        parentProviderShare: purchasePrice * 0.0025,
        branchShare: purchasePrice * 0.001,
        companyShare: purchasePrice * 0.004,
        unlockStatus: up.revenue_released ? 'unlocked' : 'locked',
      };
    });

    const stats = {
      total: resultList.length,
      locked: resultList.filter(p => p.unlockStatus === 'locked').length,
      unlocked: resultList.filter(p => p.unlockStatus === 'unlocked').length,
      totalValue: resultList.reduce((sum, p) => sum + p.purchasePrice, 0),
      totalRevenue5pct: resultList.reduce((sum, p) => sum + p.revenue5pct, 0),
    };

    return NextResponse.json({ success: true, data: { products: resultList, stats } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[branch/expired-products] Error:', msg);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
