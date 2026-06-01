import { NextResponse } from 'next/server';
import { query } from '@/lib/supabase-client';

export async function GET() {
  try {
    // 5% 分配汇总
    const summary = await query(`
      SELECT 
        rd.type,
        SUM(rd.amount) as total_amount,
        COUNT(*) as record_count
      FROM revenue_details rd
      GROUP BY rd.type
      ORDER BY rd.type
    `);

    // 各角色收益明细
    const byRole = await query(`
      SELECT 
        u.role,
        u.username,
        u.id as user_id,
        SUM(rd.amount) as total_amount,
        COUNT(*) as record_count
      FROM revenue_details rd
      LEFT JOIN users u ON u.id::text = rd.user_id::text
      GROUP BY u.role, u.username, u.id
      ORDER BY u.role, total_amount DESC
    `);

    // 类型标签映射
    const typeLabels: Record<string, { label: string; rate: string }> = {
      member_profit: { label: '会员收益', rate: '2%' },
      provider_share: { label: '服务商分成', rate: '2%' },
      direct_reward: { label: '直推奖励', rate: '0.25%' },
      parent_provider_share: { label: '上级服务商分成', rate: '0.25%' },
      branch_share: { label: '网点分成', rate: '0.1%' },
      company_share: { label: '公司运营分成', rate: '0.4%' },
    };

    const summaryWithLabels = (summary || []).map((s: any) => ({
      ...s,
      total_amount: Number(s.total_amount),
      record_count: Number(s.record_count),
      label: typeLabels[s.type]?.label || s.type,
      rate: typeLabels[s.type]?.rate || '',
    }));

    const totalAmount = summaryWithLabels.reduce((sum: number, s: any) => sum + s.total_amount, 0);

    return NextResponse.json({
      success: true,
      data: {
        summary: summaryWithLabels,
        byRole: byRole || [],
        totalAmount,
      },
    });
  } catch (error) {
    console.error('revenue-summary error:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
