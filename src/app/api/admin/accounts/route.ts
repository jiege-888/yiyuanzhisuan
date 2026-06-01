import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const branchId = searchParams.get('branchId');
    const providerId = searchParams.get('providerId');

    const client = getSupabase();

    // === 按 role 查询详细列表 ===
    if (role === 'branch') {
      const { data: branches, error } = await client
        .from('users')
        .select('id, username, real_name, phone, unique_id, role, balance, energy_value, points, is_active, created_at, branch_id')
        .eq('role', 'branch')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const branchesWithStats = await Promise.all((branches || []).map(async (b: any) => {
        const { data: providers } = await client
          .from('providers')
          .select('user_id, quota, used_quota, total_sales')
          .eq('branch_id', b.id);

        const providerCount = providers?.length || 0;
        let memberCount = 0;
        if (providers && providers.length > 0) {
          const providerIds = providers.map((p: any) => p.user_id);
          const { count } = await client
            .from('users')
            .select('*', { count: 'exact', head: true })
            .in('provider_id', providerIds)
            .eq('role', 'member');
          memberCount = count || 0;
        }

        const { data: allocations } = await client
          .from('quota_allocations')
          .select('quota_amount, used_amount')
          .eq('branch_id', b.id);

        const totalQuota = allocations?.reduce((s: number, a: any) => s + (Number(a.quota_amount) || 0), 0) || 0;
        const usedQuota = allocations?.reduce((s: number, a: any) => s + (Number(a.used_amount) || 0), 0) || 0;

        return {
          ...b,
          provider_count: providerCount,
          member_count: memberCount,
          total_quota: totalQuota,
          used_quota: usedQuota,
        };
      }));

      return NextResponse.json({ success: true, data: branchesWithStats });
    }

    if (role === 'provider') {
      let query = client
        .from('providers')
        .select('id, user_id, quota, used_quota, total_sales, branch_id')
        .order('created_at', { ascending: false });

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const { data: providers, error } = await query;
      if (error) throw error;

      const providersWithStats = await Promise.all((providers || []).map(async (p: any) => {
        const { data: user } = await client
          .from('users')
          .select('id, username, real_name, phone, unique_id, role, balance, energy_value, points, is_active, created_at, inviter_id')
          .eq('id', p.user_id)
          .single();

        const { count: memberCount } = await client
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', p.user_id)
          .eq('role', 'member');

        const { data: releaseRecords } = await client
          .from('release_records')
          .select('provider_share')
          .eq('provider_id', p.user_id);

        const totalRevenue = releaseRecords?.reduce((s: number, r: any) => s + (Number(r.provider_share) || 0), 0) || 0;
        const quotaRatio = p.quota > 0 ? (totalRevenue / p.quota) * 100 : 0;
        const isWarning = quotaRatio > 30;

        return {
          ...p,
          user: user || {},
          member_count: memberCount || 0,
          total_revenue: totalRevenue,
          quota_ratio: quotaRatio,
          is_warning: isWarning,
          available_quota: Number(p.quota) - Number(p.used_quota),
        };
      }));

      return NextResponse.json({ success: true, data: providersWithStats });
    }

    if (role === 'member') {
      let memberQuery = client
        .from('users')
        .select('id, username, real_name, phone, unique_id, role, balance, energy_value, points, is_active, created_at, provider_id, inviter_id')
        .eq('role', 'member')
        .order('created_at', { ascending: false });

      if (providerId) {
        memberQuery = memberQuery.eq('provider_id', providerId);
      }

      const { data: members, error } = await memberQuery;
      if (error) throw error;

      const membersWithStats = await Promise.all((members || []).map(async (m: any) => {
        let providerName = '-';
        if (m.provider_id) {
          const { data: providerUser } = await client
            .from('users')
            .select('username')
            .eq('id', m.provider_id)
            .single();
          providerName = providerUser?.username || '-';
        }

        const { count: holdingCount } = await client
          .from('user_products')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', m.id)
          .eq('status', 'holding');

        const { data: releaseRecords } = await client
          .from('release_records')
          .select('member_share')
          .eq('member_id', m.id);

        const totalRevenue = releaseRecords?.reduce((s: number, r: any) => s + (Number(r.member_share) || 0), 0) || 0;

        return {
          ...m,
          provider_name: providerName,
          holding_count: holdingCount || 0,
          total_revenue: totalRevenue,
        };
      }));

      return NextResponse.json({ success: true, data: membersWithStats });
    }

    // === 默认：返回完整账户列表 + 统计 + 层级 ===
    // 查询所有用户
    const { data: allUsers, error: usersError } = await client
      .from('users')
      .select('id, username, real_name, phone, unique_id, role, balance, points, energy_value, is_active, created_at, provider_id, branch_id, inviter_id')
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    // 查询每个用户的持有产力值（holding状态的user_products总purchase_price）
    const { data: holdingData } = await client
      .from('user_products')
      .select('user_id, purchase_price')
      .eq('status', 'holding');

    const holdingTokenMap: Record<string, number> = {};
    (holdingData || []).forEach((h: any) => {
      const uid = h.user_id;
      holdingTokenMap[uid] = (holdingTokenMap[uid] || 0) + (Number(h.purchase_price) || 0);
    });

    // 查询每个用户的算力值（quota_accounts 中的 balance）
    const { data: quotaAccountsData } = await client
      .from('quota_accounts')
      .select('user_id, balance');

    const quotaBalanceMap: Record<string, number> = {};
    (quotaAccountsData || []).forEach((qa: any) => {
      quotaBalanceMap[qa.user_id] = Number(qa.balance) || 0;
    });

    // 构建用户ID到用户名的映射，用于解析隶属关系
    const userIdMap = new Map<string, string>();
    (allUsers || []).forEach((u: any) => {
      userIdMap.set(u.id, u.username || u.real_name || '-');
    });

    // 给每个用户附加 holding_token(产力值)、quota_balance(算力值) 和隶属关系名称
    let usersWithHolding = (allUsers || []).map((u: any) => ({
      ...u,
      holding_token: holdingTokenMap[u.id] || 0,
      quota_balance: quotaBalanceMap[u.id] || 0,
      provider_name: u.provider_id ? (userIdMap.get(u.provider_id) || '-') : '-',
      inviter_name: u.inviter_id ? (userIdMap.get(u.inviter_id) || '-') : '-',
      branch_name: u.branch_id ? (userIdMap.get(u.branch_id) || '-') : '-',
    }));

    // 智算中心的算力值从 company_quota 表读取
    const { data: companyQuota } = await client
      .from('company_quota')
      .select('available_quota')
      .limit(1);
    if (companyQuota && companyQuota.length > 0) {
      const adminUser = usersWithHolding.find((u: any) => u.role === 'admin');
      if (adminUser) {
        adminUser.quota_balance = Number(companyQuota[0].available_quota) || 0;
      }
    }

    // 统计
    const stats = {
      totalUsers: allUsers?.length || 0,
      totalBranches: allUsers?.filter((u: any) => u.role === 'branch').length || 0,
      totalProviders: allUsers?.filter((u: any) => u.role === 'provider').length || 0,
      totalMembers: allUsers?.filter((u: any) => u.role === 'member').length || 0,
      totalBalance: allUsers?.reduce((s: number, u: any) => s + (Number(u.balance) || 0), 0) || 0,
      totalPoints: allUsers?.reduce((s: number, u: any) => s + (Number(u.points) || 0), 0) || 0,
      totalHoldingToken: Object.values(holdingTokenMap).reduce((s: number, v: any) => s + Number(v), 0) || 0,
    };

    // 层级数据 - 使用 usersWithHolding
    const branches = usersWithHolding?.filter((u: any) => u.role === 'branch') || [];
    const providers = usersWithHolding?.filter((u: any) => u.role === 'provider') || [];
    const members = usersWithHolding?.filter((u: any) => u.role === 'member') || [];

    // 查询 providers 表获取额度信息
    const { data: providerRecords } = await client
      .from('providers')
      .select('user_id, quota, used_quota, total_sales, branch_id');

    const providerMap = new Map((providerRecords || []).map((p: any) => [p.user_id, p]));

    // 构建层级
    const hierarchy = branches.map((branch: any) => {
      // 该网点下的服务商
      const branchProviders = providers.filter((p: any) => {
        const pRecord = providerMap.get(p.id);
        return pRecord?.branch_id === branch.id || p.branch_id === branch.id;
      });

      const providerDetails = branchProviders.map((p: any) => {
        const pRecord = providerMap.get(p.id) || {} as any;
        const pMembers = members.filter((m: any) => m.provider_id === p.id);

        return {
          providerId: p.id,
          providerName: p.username || p.real_name || '-',
          providerPhone: p.phone || '-',
          quota: Number(pRecord.quota) || 0,
          usedQuota: Number(pRecord.used_quota) || 0,
          totalSales: Number(pRecord.total_sales) || 0,
          balance: Number(p.balance) || 0,
          memberCount: pMembers.length,
          members: pMembers.map((m: any) => ({
            memberId: m.id,
            memberName: m.username || m.real_name || '-',
            memberPhone: m.phone || '-',
            balance: Number(m.balance) || 0,
            points: Number(m.points) || 0,
            isActive: m.is_active !== false,
            createdAt: m.created_at,
          })),
        };
      });

      // 统计该网点下的会员总数
      const branchMemberCount = branchProviders.reduce((s: number, p: any) => {
        return s + members.filter((m: any) => m.provider_id === p.id).length;
      }, 0);

      // 网点下服务商的总额度
      const branchTotalQuota = branchProviders.reduce((s: number, p: any) => {
        const pRecord = providerMap.get(p.id);
        return s + (Number(pRecord?.quota) || 0);
      }, 0);

      return {
        branchId: branch.id,
        branchName: branch.username || branch.real_name || '-',
        branchPhone: branch.phone || '-',
        branchBalance: Number(branch.balance) || 0,
        providerCount: branchProviders.length,
        memberCount: branchMemberCount,
        totalQuota: branchTotalQuota,
        providers: providerDetails,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        users: usersWithHolding,
        stats,
        hierarchy,
      },
    });
  } catch (error: any) {
    console.error('[accounts] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 修改账户状态或角色
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, value } = body;

    if (!userId || !action) {
      return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 });
    }

    const client = getSupabase();

    if (action === 'toggle_status' || action === 'toggleStatus') {
      const { data: user } = await client.from('users').select('is_active').eq('id', userId).single();
      const newStatus = user?.is_active ? false : true;

      const { error } = await client.from('users').update({ is_active: newStatus }).eq('id', userId);
      if (error) throw error;

      return NextResponse.json({ success: true, message: `账户已${newStatus ? '启用' : '停用'}` });
    }

    if (action === 'change_role' || action === 'changeRole') {
      const { error } = await client.from('users').update({ role: value || body.role }).eq('id', userId);
      if (error) throw error;

      return NextResponse.json({ success: true, message: `角色已修改为${value || body.role}` });
    }

    return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
  } catch (error: any) {
    console.error('[accounts] PUT Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
