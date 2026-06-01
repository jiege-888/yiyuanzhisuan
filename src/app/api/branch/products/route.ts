import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/storage/database/pg-client';

// 获取服务商下的所有产品
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const providerId = searchParams.get('providerId');

    if (!providerId) {
      return NextResponse.json({ error: '缺少服务商ID' }, { status: 400 });
    }

    const products = await query<{
      id: string;
      name: string;
      code: string;
      price: number;
      period: number;
      total_rate: number;
      market_rate: number;
      profit_rate: number;
      status: string;
      created_at: string;
    }>(
      `SELECT id, name, code, price, period, 
              COALESCE(total_rate, 0) as total_rate,
              COALESCE(market_rate, 0) as market_rate,
              COALESCE(profit_rate, 0) as profit_rate,
              status, created_at
       FROM products 
       WHERE provider_id = $1 
       ORDER BY created_at DESC`,
      [providerId]
    );

    // 统计
    const stats = {
      total: products.length,
      available: products.filter(p => p.status === 'available').length,
      sold: products.filter(p => p.status === 'sold').length,
      totalValue: products.reduce((sum, p) => sum + Number(p.price), 0),
    };

    return NextResponse.json({
      success: true,
      data: products,
      stats
    });
  } catch (error) {
    console.error('获取产品列表失败:', error);
    return NextResponse.json(
      { error: '获取产品列表失败', detail: String(error) },
      { status: 500 }
    );
  }
}
