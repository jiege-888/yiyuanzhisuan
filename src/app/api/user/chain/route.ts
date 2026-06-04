import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/storage/database/pg-client';
import { authenticateRequest } from '@/lib/auth';

// 获取用户关系链
export async function GET(request: NextRequest) {
  try {
    const authUser = authenticateRequest(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: '未登录，请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || authUser.userId;

    // 获取当前用户信息
    let userResult;
    try {
      userResult = await query(`
        SELECT 
          u.id, u.username, u.phone, u.role, u.provider_id, u.inviter_id,
          u.branch_id, u.balance, u.real_name
        FROM users u
        WHERE u.id = $1
      `, [userId]);
    } catch (dbError) {
      console.error('数据库查询失败:', dbError);
      return NextResponse.json({
        success: true,
        data: {
          self: { id: authUser.userId, username: authUser.username, role: authUser.role, phone: null, balance: 0 },
          inviter: null, provider: null, branch: null, members: [], providers: [],
          message: '暂无关系链数据'
        }
      });
    }

    if (userResult.length === 0) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    const currentUser = userResult[0];
    const chain: {
      self: any; inviter: any; provider: any; branch: any; members: any[]; providers: any[];
    } = {
      self: {
        id: currentUser.id, username: currentUser.username, phone: currentUser.phone,
        role: currentUser.role, realName: currentUser.real_name, balance: currentUser.balance
      },
      inviter: null, provider: null, branch: null, members: [], providers: []
    };

    // 获取推荐人信息
    if (currentUser.provider_id) {
      const inviterResult = await query(`
        SELECT u.id, u.username, u.phone, u.role, u.real_name, u.balance
        FROM users u WHERE u.id = $1
      `, [currentUser.provider_id]);

      if (inviterResult.length > 0) {
        const inviter = inviterResult[0];
        chain.inviter = {
          id: inviter.id, username: inviter.username, phone: inviter.phone,
          role: inviter.role, realName: inviter.real_name, balance: inviter.balance,
          roleName: getRoleName(inviter.role)
        };
      }
    }

    // 获取服务商信息
    if (currentUser.provider_id) {
      const providerResult = await query(`
        SELECT u.id, u.username, u.phone, u.real_name, u.balance,
          p.quota, p.used_quota
        FROM users u
        LEFT JOIN providers p ON p.user_id = u.id
        WHERE u.id = $1 AND u.role = 'provider'
      `, [currentUser.provider_id]);

      if (providerResult.length > 0) {
        const provider = providerResult[0];
        chain.provider = {
          id: provider.id, username: provider.username, phone: provider.phone,
          realName: provider.real_name, balance: provider.balance,
          quota: provider.quota || 0, usedQuota: provider.used_quota || 0, roleName: '服务商'
        };
      }
    }

    // 获取服务网点信息
    if (currentUser.branch_id) {
      const branchResult = await query(`
        SELECT u.id, u.username, u.phone, u.real_name, u.balance
        FROM users u WHERE u.id = $1 AND u.role = 'branch'
      `, [currentUser.branch_id]);

      if (branchResult.length > 0) {
        const branch = branchResult[0];
        chain.branch = {
          id: branch.id, username: branch.username, phone: branch.phone,
          realName: branch.real_name, balance: branch.balance, roleName: '服务网点'
        };
      }
    }

    // 如果当前用户是服务商，获取下级会员列表
    if (currentUser.role === 'provider') {
      const membersResult = await query(`
        SELECT u.id, u.username, u.phone, u.real_name, u.balance, u.energy_value,
          u.unique_id, u.inviter_id, u.created_at
        FROM users u WHERE u.provider_id = $1 AND u.role = 'member'
        ORDER BY u.created_at DESC
      `, [userId]);

      chain.members = membersResult.map((m: any) => ({
        id: m.id, username: m.username, phone: m.phone, realName: m.real_name,
        balance: m.balance || 0, energyValue: m.energy_value || 0, uniqueId: m.unique_id, createdAt: m.created_at, roleName: '会员'
      }));

      // 批量获取会员持仓统计
      if (membersResult.length > 0) {
        const memberIds = membersResult.map((m: any) => m.id);
        const holdingsResult = await query(`
          SELECT up.user_id, COUNT(*) as product_count,
            COALESCE(SUM(up.purchase_price), 0) as total_amount
          FROM user_products up
          WHERE up.user_id = ANY($1) AND up.status = 'holding'
          GROUP BY up.user_id
        `, [memberIds]);

        const holdingsMap: Record<string, { productCount: number; totalAmount: number }> = {};
        holdingsResult.forEach((h: any) => {
          holdingsMap[h.user_id] = {
            productCount: parseInt(h.product_count) || 0,
            totalAmount: parseFloat(h.total_amount) || 0
          };
        });

        // 批量获取推荐人信息
        const inviterIds = membersResult.map((m: any) => m.inviter_id).filter(Boolean);
        const inviterMap: Record<string, string> = {};
        if (inviterIds.length > 0) {
          const inviterResult = await query(`
            SELECT id, username, real_name, unique_id FROM users WHERE id = ANY($1)
          `, [inviterIds]);
          inviterResult.forEach((inv: any) => {
            inviterMap[inv.id] = (inv.real_name || inv.username) + (inv.unique_id ? ` [${inv.unique_id}]` : '');
          });
        }

        chain.members = membersResult.map((m: any) => ({
          id: m.id, username: m.username, phone: m.phone, realName: m.real_name,
          balance: m.balance || 0, energyValue: m.energy_value || 0, uniqueId: m.unique_id,
          productCount: holdingsMap[m.id]?.productCount || 0,
          totalAmount: holdingsMap[m.id]?.totalAmount || 0,
          inviterId: m.inviter_id,
          inviterName: m.inviter_id ? (inviterMap[m.inviter_id] || '未知') : '-',
          createdAt: m.created_at, roleName: '会员'
        }));
      }

      // 获取下级服务商
      const providersResult = await query(`
        SELECT u.id, u.username, u.phone, u.real_name, u.balance,
          p.quota, p.used_quota, u.created_at
        FROM users u
        LEFT JOIN providers p ON p.user_id = u.id
        WHERE u.inviter_id = $1 AND u.role = 'provider'
        ORDER BY u.created_at DESC
      `, [userId]);

      chain.providers = providersResult.map((p: any) => ({
        id: p.id, username: p.username, phone: p.phone, realName: p.real_name,
        balance: p.balance, quota: p.quota || 0, usedQuota: p.used_quota || 0,
        createdAt: p.created_at, roleName: '服务商'
      }));
    }

    return NextResponse.json({ success: true, data: chain });
  } catch (error) {
    console.error('获取用户关系链失败:', error);
    return NextResponse.json({ success: false, error: '获取关系链失败' }, { status: 500 });
  }
}

function getRoleName(role: string): string {
  const roleMap: Record<string, string> = {
    admin: '智算中心', branch: '服务网点', provider: '服务商', member: '会员'
  };
  return roleMap[role] || role;
}
