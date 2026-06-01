import { NextResponse } from 'next/server';
import { query } from '@/lib/supabase-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = `AND prd.created_at >= '${startDate}' AND prd.created_at <= '${endDate} 23:59:59'`;
    }

    // 统计
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(prd.market_fee), 0) as total_release,
        COALESCE(SUM(prd.provider_share), 0) as total_provider_share,
        COALESCE(SUM(prd.direct_reward), 0) as total_direct_share,
        COALESCE(SUM(prd.parent_provider_share), 0) as total_parent_provider_share,
        COALESCE(SUM(prd.branch_share), 0) as total_branch_share,
        COALESCE(SUM(prd.company_share), 0) as total_company_share
      FROM provider_revenue_distribution prd
      WHERE 1=1 ${dateFilter}
    `);

    // 会员总收益从 member_revenue 获取
    const memberStats = await query(`
      SELECT COALESCE(SUM(profit), 0) as total_member_share FROM member_revenue
    `);

    const stats = {
      ...(statsResult?.[0] || {}),
      total_member_share: memberStats?.[0]?.total_member_share || 0,
    };

    const offset = (page - 1) * pageSize;

    // 记录列表 - JOIN products 和 users 获取名称
    const records = await query(`
      SELECT 
        prd.id,
        prd.product_id,
        prd.product_price,
        prd.market_fee as release_amount,
        prd.provider_share,
        prd.direct_reward,
        prd.direct_reward_to,
        prd.parent_provider_share,
        prd.parent_provider_id,
        prd.branch_share,
        prd.branch_id,
        prd.company_share,
        prd.member_id,
        prd.provider_id,
        prd.status,
        prd.created_at,
        p.name as product_name,
        p.market_rate as release_rate,
        m.username as member_name,
        pv.username as provider_name
      FROM provider_revenue_distribution prd
      LEFT JOIN products p ON p.id = prd.product_id
      LEFT JOIN users m ON m.id::text = prd.member_id::text
      LEFT JOIN users pv ON pv.id::text = prd.provider_id::text
      WHERE 1=1 ${dateFilter}
      ORDER BY prd.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    // 获取产品的profit_rate用于计算会员收益
    const productProfitRateMap: Record<string, number> = {};
    const productIds = [...new Set((records || []).map((r: Record<string, unknown>) => String(r.product_id)).filter(Boolean))];
    if (productIds.length > 0) {
      const productResult = await query(`
        SELECT id, profit_rate FROM products WHERE id::text IN ('${productIds.join("','")}')
      `);
      (productResult || []).forEach((p: Record<string, unknown>) => {
        productProfitRateMap[String(p.id)] = parseFloat(String(p.profit_rate || 0));
      });
    }

    const enrichedRecords = (records || []).map((r: Record<string, unknown>) => {
      const productPrice = parseFloat(String(r.product_price || 0));
      const profitRate = productProfitRateMap[String(r.product_id)] || 2;
      const memberShare = productPrice * profitRate / 100;
      return {
        ...r,
        member_share: memberShare,
        release_rate: parseFloat(String(r.release_rate || 5)),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        stats,
        records: enrichedRecords,
        pagination: {
          page,
          pageSize,
          total: stats.total_count,
        },
      },
    });
  } catch (error) {
    console.error('获取释放收益记录失败:', error);
    return NextResponse.json({ error: '获取释放收益记录失败' }, { status: 500 });
  }
}
