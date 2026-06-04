import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/pg-client';
import { authenticateRequest } from '@/lib/auth';

/**
 * 获取服务商直属会员列表
 * GET /api/provider/members
 */
export async function GET(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    if (!user || user.role !== 'provider') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const providerId = user.userId;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';

    // 构建查询
    let whereClause = 'WHERE provider_id = $1 AND role = $2';
    const params: any[] = [providerId, 'member'];

    if (search) {
      whereClause += ` AND (username ILIKE $3 OR phone ILIKE $3)`;
      params.push(`%${search}%`);
    }

    // 获取总数
    const countResult = await query(
      `SELECT COUNT(*) as count FROM users ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0]?.count || '0');

    // 获取会员列表
    const offset = (page - 1) * pageSize;
    const members = await query(
      `SELECT 
        id, username, phone, balance, energy_value, created_at,
        real_name, wechat_account, alipay_account
       FROM users 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );

    // 获取每个会员的投资金额
    const enrichedMembers = await Promise.all(
      members.map(async (member: any) => {
        const investmentResult = await query(
          `SELECT COALESCE(SUM(purchase_price), 0) as total 
           FROM user_products WHERE user_id = $1`,
          [member.id]
        );
        const productResult = await query(
          `SELECT COUNT(*) as count FROM user_products WHERE user_id = $1 AND status = 'holding'`,
          [member.id]
        );
        return {
          ...member,
          totalInvestment: parseFloat(investmentResult[0]?.total || '0'),
          holdingProducts: parseInt(productResult[0]?.count || '0'),
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        members: enrichedMembers,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        }
      }
    });
  } catch (error) {
    console.error('获取会员列表失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
