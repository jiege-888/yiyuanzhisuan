import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/supabase-client';
import { authenticateRequest } from '@/lib/auth';

// 获取服务网点收益记录
export async function GET(request: NextRequest) {
  try {
    const authUser = authenticateRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    if (authUser.role !== 'branch') {
      return NextResponse.json({ error: '仅服务网点可查看' }, { status: 403 });
    }

    const branchUserId = authUser.userId;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    let whereClause = `WHERE branch_id = '${branchUserId}'`;
    if (status) {
      whereClause += ` AND status = '${status}'`;
    }

    // 统计
    const statsResult = await query(`
      SELECT 
        COALESCE(SUM(branch_share), 0) as total_branch_share,
        COALESCE(COUNT(*), 0) as total_count,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN branch_share ELSE 0 END), 0) as completed_amount
      FROM branch_revenue_records ${whereClause}
    `);

    const stats = statsResult?.[0] || {};

    // 记录列表
    const offset = (page - 1) * pageSize;
    const records = await query(`
      SELECT 
        brr.*,
        m.username as member_name,
        pv.username as provider_name
      FROM branch_revenue_records brr
      LEFT JOIN users m ON m.id::text = brr.member_id::text
      LEFT JOIN users pv ON pv.id::text = brr.provider_id::text
      ${whereClause}
      ORDER BY brr.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    return NextResponse.json({
      success: true,
      data: {
        records: records || [],
        stats,
        pagination: {
          page,
          pageSize,
          total: parseInt(String(stats.total_count || 0)),
        },
      },
    });
  } catch (error) {
    console.error('获取服务网点收益记录失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取收益记录失败' },
      { status: 500 }
    );
  }
}
