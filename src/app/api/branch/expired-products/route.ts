import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/storage/database/pg-client';

// 获取服务商下的到期产品（含流转信息）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const providerId = searchParams.get('providerId');

    if (!providerId) {
      return NextResponse.json({ error: '缺少服务商ID' }, { status: 400 });
    }

    // 查询该服务商下所有持仓中的用户产品
    const userProducts = await query<{
      id: string;
      user_id: string;
      product_id: string;
      purchase_price: number;
      purchase_date: string;
      expire_date: string;
      status: string;
      revenue_released: boolean;
      expected_profit: number;
      product_name: string;
      product_code: string;
      product_price: number;
      period: number;
      profit_rate: number;
      market_rate: number;
      provider_id: string;
      username: string;
      phone: string;
      unique_id: string;
      real_name: string;
    }>(
      `SELECT 
        up.id, up.user_id, up.product_id, up.purchase_price, 
        up.purchase_date, up.expire_date, up.status, up.revenue_released,
        COALESCE(up.expected_profit, 0) as expected_profit,
        p.name as product_name, p.code as product_code, 
        p.price as product_price, p.period, 
        COALESCE(p.profit_rate, 0) as profit_rate,
        COALESCE(p.market_rate, 0) as market_rate,
        p.provider_id,
        u.username, u.phone, u.unique_id, u.real_name
      FROM user_products up
      JOIN products p ON up.product_id = p.id
      JOIN users u ON up.user_id = u.id
      WHERE p.provider_id = $1 AND up.status = 'holding'
      ORDER BY up.expire_date ASC`,
      [providerId]
    );

    // 查询每个产品的流转记录
    const productIds = userProducts.map(up => up.product_id);
    let flowRecords: Array<{
      product_id: string;
      flow_type: string;
      buyer_name: string;
      buyer_phone: string;
      seller_name: string;
      seller_phone: string;
      created_at: string;
    }> = [];

    if (productIds.length > 0) {
      flowRecords = await query(
        `SELECT product_id, flow_type, buyer_name, buyer_phone, 
                seller_name, seller_phone, created_at
         FROM product_flow_records 
         WHERE product_id = ANY($1)
         ORDER BY created_at ASC`,
        [productIds]
      );
    }

    // 按产品ID分组流转记录
    const flowMap = new Map<string, typeof flowRecords>();
    for (const r of flowRecords) {
      if (!flowMap.has(r.product_id)) flowMap.set(r.product_id, []);
      flowMap.get(r.product_id)!.push(r);
    }

    // 组装结果
    const products = userProducts.map(up => {
      const fivePercent = Number(up.purchase_price) * 5 / 100;
      const now = new Date();
      const expireDate = new Date(up.expire_date);
      const isExpired = now >= expireDate;

      return {
        id: up.id,
        productId: up.product_id,
        productName: up.product_name,
        productCode: up.product_code,
        productPrice: Number(up.product_price),
        purchasePrice: Number(up.purchase_price),
        period: up.period,
        profitRate: up.profit_rate,
        marketRate: up.market_rate,
        expectedProfit: Number(up.expected_profit),
        fivePercent: fivePercent,
        // 持有人信息
        holderId: up.user_id,
        holderName: up.username || up.real_name || '未知',
        holderPhone: up.phone || '',
        holderUniqueId: up.unique_id || '',
        // 时间
        purchaseDate: up.purchase_date,
        expireDate: up.expire_date,
        isExpired: isExpired,
        // 状态
        status: up.status,
        revenueReleased: up.revenue_released,
        // 解锁状态
        lockStatus: !up.revenue_released ? 'locked' : 'unlocked',
        // 流转记录
        flowRecords: flowMap.get(up.product_id) || [],
        // 5%智算金分配明细
        distribution: {
          member: fivePercent * 2 / 5,      // 2%
          provider: fivePercent * 2 / 5,    // 2%
          directReferrer: fivePercent * 0.25 / 5, // 0.25%
          upstreamProvider: fivePercent * 0.25 / 5, // 0.25%
          branch: fivePercent * 0.1 / 5,   // 0.1%
          company: fivePercent * 0.4 / 5,  // 0.4%
        }
      };
    });

    // 统计
    const stats = {
      total: products.length,
      expired: products.filter(p => p.isExpired).length,
      locked: products.filter(p => p.isExpired && p.lockStatus === 'locked').length,
      unlocked: products.filter(p => p.revenueReleased).length,
      totalFivePercent: products.filter(p => p.isExpired && p.lockStatus === 'locked')
        .reduce((sum, p) => sum + p.fivePercent, 0),
    };

    return NextResponse.json({
      success: true,
      data: products,
      stats
    });
  } catch (error) {
    console.error('获取到期产品失败:', error);
    return NextResponse.json(
      { error: '获取到期产品失败', detail: String(error) },
      { status: 500 }
    );
  }
}
