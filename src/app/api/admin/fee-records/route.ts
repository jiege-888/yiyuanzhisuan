import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/supabase-client';
import { authenticateRequest } from '@/lib/auth';

/**
 * 手续费沉淀记录 API
 * GET /api/admin/fee-records?type=withdrawal_fee&startDate=xxx&endDate=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: '无权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const feeType = searchParams.get('type') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (feeType) {
      whereConditions.push(`fsr.fee_type = $${paramIndex++}`);
      params.push(feeType);
    }
    if (startDate) {
      whereConditions.push(`fsr.created_at >= $${paramIndex++}`);
      params.push(startDate);
    }
    if (endDate) {
      whereConditions.push(`fsr.created_at <= $${paramIndex++}::timestamptz`);
      params.push(endDate + 'T23:59:59');
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // 获取汇总统计 - 增加market_fee_ops统计
    const statsSql = `
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN fee_type = 'withdrawal_fee' THEN amount ELSE 0 END), 0) as withdrawal_fee_total,
        COALESCE(SUM(CASE WHEN fee_type = 'energy_withdrawal_fee' THEN amount ELSE 0 END), 0) as energy_withdrawal_fee_total,
        COALESCE(SUM(CASE WHEN fee_type = 'market_fee_ops' THEN amount ELSE 0 END), 0) as market_fee_ops_total,
        COUNT(CASE WHEN fee_type = 'withdrawal_fee' THEN 1 END) as withdrawal_fee_count,
        COUNT(CASE WHEN fee_type = 'energy_withdrawal_fee' THEN 1 END) as energy_withdrawal_fee_count,
        COUNT(CASE WHEN fee_type = 'market_fee_ops' THEN 1 END) as market_fee_ops_count
      FROM fee_sedimentation_records fsr ${whereClause}
    `;
    const stats = await queryOne<any>(statsSql, params);

    // 获取明细列表 - 映射fee_type为type以兼容前端
    const listSql = `
      SELECT fsr.id, fsr.user_id, fsr.fee_type, fsr.amount, fsr.original_amount, fsr.fee_rate,
             fsr.related_order_id, fsr.related_type, fsr.note, fsr.status, fsr.created_at,
             u.username, u.real_name, u.unique_id, u.phone, u.role as source_role
      FROM fee_sedimentation_records fsr
      LEFT JOIN users u ON fsr.user_id::uuid = u.id::uuid
      ${whereClause}
      ORDER BY fsr.created_at DESC
      LIMIT 200
    `;
    const rawRecords = await query<any>(listSql, params);

    // 映射fee_type → type 以兼容前端代码
    const records = (rawRecords || []).map((r: any) => ({
      ...r,
      type: r.fee_type,
    }));

    return NextResponse.json({
      success: true,
      data: {
        stats: stats || { total_count: 0, total_amount: 0, withdrawal_fee_total: 0, energy_withdrawal_fee_total: 0, market_fee_ops_total: 0, withdrawal_fee_count: 0, energy_withdrawal_fee_count: 0, market_fee_ops_count: 0 },
        records: records || []
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[FEE RECORDS] Error:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
