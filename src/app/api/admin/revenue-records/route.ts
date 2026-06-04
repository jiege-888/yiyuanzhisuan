import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/pg-client';
import { authenticateRequest } from '@/lib/auth';

// 获取总管理后台收益记录
export async function GET(request: NextRequest) {
  try {
    const authUser = authenticateRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    if (authUser.role !== 'admin') {
      return NextResponse.json({ error: '仅总管理可查看' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let sql = 'SELECT * FROM admin_revenue_records WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 1;

    if (status) {
      sql += ` AND status = $${paramIdx}`;
      params.push(status);
      paramIdx++;
    }

    sql += ' ORDER BY created_at DESC';

    const data = await query(sql, params);

    // 统计
    const stats = await query(
      `SELECT 
        COALESCE(SUM(company_share), 0) as total_company_share,
        COALESCE(COUNT(*), 0) as total_count,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN company_share ELSE 0 END), 0) as completed_amount
      FROM admin_revenue_records`
    );

    return NextResponse.json({
      success: true,
      data: {
        records: data,
        stats: stats[0] || {},
      },
    });
  } catch (error) {
    console.error('获取总管理收益记录失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取收益记录失败' },
      { status: 500 }
    );
  }
}
