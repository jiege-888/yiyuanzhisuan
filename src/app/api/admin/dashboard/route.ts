import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { query, queryOne } from '@/storage/database/pg-client';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. 用户统计 - 使用SQL聚合
    const userBase = await queryOne<{
      total_users: string; total_branches: string; total_providers: string; total_members: string;
      today_new: string; seven_day_new: string;
    }>(`
      SELECT
        COUNT(*)::text as total_users,
        COALESCE(SUM(CASE WHEN role = 'branch' THEN 1 ELSE 0 END), 0)::text as total_branches,
        COALESCE(SUM(CASE WHEN role = 'provider' THEN 1 ELSE 0 END), 0)::text as total_providers,
        COALESCE(SUM(CASE WHEN role = 'member' THEN 1 ELSE 0 END), 0)::text as total_members,
        COALESCE(SUM(CASE WHEN created_at >= '${todayStart}' THEN 1 ELSE 0 END), 0)::text as today_new,
        COALESCE(SUM(CASE WHEN created_at >= '${sevenDaysAgo}' THEN 1 ELSE 0 END), 0)::text as seven_day_new
      FROM users
    `);

    // 7天注册趋势
    const registrationTrend = await query<{ date: string; count: string }>(`
      SELECT d.date::text, COALESCE(COUNT(u.id), 0)::text as count
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') AS d(date)
      LEFT JOIN users u ON u.created_at::date = d.date
      GROUP BY d.date ORDER BY d.date
    `);

    // 2. 产品/购买统计
    const productBase = await queryOne<{
      total_products: string; available: string; sold: string; total_sales: string;
      today_purchase_count: string; today_purchase_amount: string;
    }>(`
      SELECT
        COUNT(*)::text as total_products,
        COALESCE(SUM(CASE WHEN status IN ('available','unlisted') THEN 1 ELSE 0 END), 0)::text as available,
        COALESCE(SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END), 0)::text as sold,
        COALESCE(SUM(CASE WHEN status = 'sold' THEN price ELSE 0 END), 0)::text as total_sales
      FROM products
    `);

    const todayPurchase = await queryOne<{
      count: string; amount: string;
    }>(`
      SELECT
        COUNT(*)::text as count,
        COALESCE(SUM(purchase_price), 0)::text as amount
      FROM user_products
      WHERE purchase_date >= '${todayStart}'
    `);

    // 7天购买趋势
    const purchaseTrend = await query<{ date: string; count: string; amount: string }>(`
      SELECT d.date::text,
        COALESCE(COUNT(up.id), 0)::text as count,
        COALESCE(SUM(up.purchase_price), 0)::text as amount
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') AS d(date)
      LEFT JOIN user_products up ON up.purchase_date::date = d.date
      GROUP BY d.date ORDER BY d.date
    `);

    // 产品周期分布
    const productsByPeriod = await query<{ period: number; count: string; amount: string }>(`
      SELECT period, COUNT(*)::text as count, COALESCE(SUM(price), 0)::text as amount
      FROM products GROUP BY period ORDER BY period
    `);

    // 3. 收益释放统计 - 从 provider_revenue_distribution 聚合
    const releaseBase = await queryOne<{
      total_count: string; total_release: string; total_provider_share: string;
      total_direct_share: string; total_parent_provider_share: string;
      total_branch_share: string; total_company_share: string;
    }>(`
      SELECT
        COUNT(*)::text as total_count,
        COALESCE(SUM(market_fee), 0)::text as total_release,
        COALESCE(SUM(provider_share), 0)::text as total_provider_share,
        COALESCE(SUM(direct_reward), 0)::text as total_direct_share,
        COALESCE(SUM(parent_provider_share), 0)::text as total_parent_provider_share,
        COALESCE(SUM(branch_share), 0)::text as total_branch_share,
        COALESCE(SUM(company_share), 0)::text as total_company_share
      FROM provider_revenue_distribution
    `);

    // 会员总收益从 member_revenue 获取
    const memberRevenueBase = await queryOne<{ total_member_share: string }>(`
      SELECT COALESCE(SUM(profit), 0)::text as total_member_share FROM member_revenue
    `);

    const todayRelease = await queryOne<{ amount: string }>(`
      SELECT COALESCE(SUM(market_fee), 0)::text as amount
      FROM provider_revenue_distribution
      WHERE created_at >= '${todayStart}'
    `);

    // 7天释放趋势
    const releaseTrend = await query<{ date: string; amount: string }>(`
      SELECT d.date::text,
        COALESCE(SUM(prd.market_fee), 0)::text as amount
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') AS d(date)
      LEFT JOIN provider_revenue_distribution prd ON prd.created_at::date = d.date
      GROUP BY d.date ORDER BY d.date
    `);

    // 4. 额度统计
    const companyQuota = await queryOne<{
      total_quota: string; used_quota: string; available_quota: string;
    }>(`
      SELECT total_quota::text, used_quota::text, available_quota::text
      FROM company_quota LIMIT 1
    `);

    const providerQuotaBase = await queryOne<{
      total_quota: string; used_quota: string;
    }>(`
      SELECT
        COALESCE(SUM(quota), 0)::text as total_quota,
        COALESCE(SUM(used_quota), 0)::text as used_quota
      FROM providers
    `);

    // 5. 提现统计 - 从 energy_withdraw_requests 读取
    const withdrawalBase = await queryOne<{
      pending_count: string; pending_amount: string;
      approved_count: string; approved_amount: string;
    }>(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0)::text as pending_count,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0)::text as pending_amount,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0)::text as approved_count,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN actual_amount ELSE 0 END), 0)::text as approved_amount
      FROM energy_withdraw_requests
    `);

    // 6. 团队排名（服务商）
    const teamRanking = await query<{
      provider_id: string; provider_name: string; phone: string;
      quota: string; used_quota: string; total_sales: string;
      total_revenue: string; member_count: string; sold_count: string;
    }>(`
      SELECT
        p.user_id as provider_id,
        COALESCE(u.username, u.real_name, '-') as provider_name,
        COALESCE(u.phone, '-') as phone,
        COALESCE(p.quota, 0)::text as quota,
        COALESCE(p.used_quota, 0)::text as used_quota,
        COALESCE(p.total_sales, 0)::text as total_sales,
        COALESCE((SELECT SUM(prd.provider_share) FROM provider_revenue_distribution prd WHERE prd.provider_id = p.user_id::text), 0)::text as total_revenue,
        COALESCE((SELECT COUNT(*) FROM users WHERE provider_id = p.user_id AND role = 'member'), 0)::text as member_count,
        COALESCE((SELECT COUNT(*) FROM products WHERE provider_id = p.user_id AND status = 'sold'), 0)::text as sold_count
      FROM providers p
      LEFT JOIN users u ON u.id = p.user_id
      ORDER BY total_revenue DESC
    `);

    // 7. 网点排名
    const branchRanking = await query<{
      branch_id: string; branch_name: string; phone: string;
      provider_count: string; member_count: string; total_sales: string;
      total_revenue: string; balance: string;
    }>(`
      SELECT
        u.id as branch_id,
        COALESCE(u.username, u.real_name, '-') as branch_name,
        COALESCE(u.phone, '-') as phone,
        COALESCE((SELECT COUNT(*) FROM providers p WHERE p.branch_id = u.id), 0)::text as provider_count,
        COALESCE((SELECT COUNT(*) FROM users m WHERE m.role = 'member' AND m.provider_id IN (SELECT p2.user_id FROM providers p2 WHERE p2.branch_id = u.id)), 0)::text as member_count,
        COALESCE((SELECT SUM(p3.total_sales) FROM providers p3 WHERE p3.branch_id = u.id), 0)::text as total_sales,
        COALESCE((SELECT SUM(prd.branch_share) FROM provider_revenue_distribution prd WHERE prd.branch_id = u.id::text), 0)::text as total_revenue,
        COALESCE(u.balance, 0)::text as balance
      FROM users u
      WHERE u.role = 'branch'
      ORDER BY total_revenue DESC
    `);

    // 8. 平台总流通 + 各角色产力值分布
    const circulationBase = await queryOne<{ total_balance: string; total_energy: string }>(`
      SELECT
        COALESCE(SUM(balance), 0)::text as total_balance,
        COALESCE(SUM(energy_value), 0)::text as total_energy
      FROM users
    `);
    const energyDistribution = await query(`SELECT role, COALESCE(SUM(energy_value), 0)::text as total_energy FROM users GROUP BY role`);

    // 构建返回数据
    return NextResponse.json({
      success: true,
      data: {
        users: {
          total: parseInt(userBase?.total_users || '0'),
          branches: parseInt(userBase?.total_branches || '0'),
          providers: parseInt(userBase?.total_providers || '0'),
          members: parseInt(userBase?.total_members || '0'),
          todayNew: parseInt(userBase?.today_new || '0'),
          sevenDayNew: parseInt(userBase?.seven_day_new || '0'),
          registrationTrend: (registrationTrend || []).map(r => ({
            date: r.date, count: parseInt(r.count),
          })),
        },
        products: {
          total: parseInt(productBase?.total_products || '0'),
          available: parseInt(productBase?.available || '0'),
          sold: parseInt(productBase?.sold || '0'),
          totalSalesAmount: parseFloat(productBase?.total_sales || '0'),
          todayPurchaseCount: parseInt(todayPurchase?.count || '0'),
          todayPurchaseAmount: parseFloat(todayPurchase?.amount || '0'),
          purchaseTrend: (purchaseTrend || []).map(p => ({
            date: p.date, count: parseInt(p.count), amount: parseFloat(p.amount),
          })),
          productsByPeriod: (productsByPeriod || []).map(p => ({
            period: p.period, count: parseInt(p.count), amount: parseFloat(p.amount),
          })),
        },
        revenue: {
          totalReleaseAmount: parseFloat(releaseBase?.total_release || '0'),
          todayReleaseAmount: parseFloat(todayRelease?.amount || '0'),
          releaseTrend: (releaseTrend || []).map(r => ({
            date: r.date, amount: parseFloat(r.amount),
          })),
          releaseDistribution: {
            memberShare: parseFloat(memberRevenueBase?.total_member_share || '0'),
            directReferralShare: parseFloat(releaseBase?.total_direct_share || '0'),
            providerShare: parseFloat(releaseBase?.total_provider_share || '0'),
            parentProviderShare: parseFloat(releaseBase?.total_parent_provider_share || '0'),
            seniorProviderShare: 0,
            branchShare: parseFloat(releaseBase?.total_branch_share || '0'),
            companyShare: parseFloat(releaseBase?.total_company_share || '0'),
          },
        },
        quota: {
          companyQuota: companyQuota ? {
            total_quota: parseFloat(companyQuota.total_quota),
            used_quota: parseFloat(companyQuota.used_quota),
            available_quota: parseFloat(companyQuota.available_quota),
          } : { total_quota: 0, used_quota: 0, available_quota: 0 },
          totalProviderQuota: parseFloat(providerQuotaBase?.total_quota || '0'),
          totalProviderUsedQuota: parseFloat(providerQuotaBase?.used_quota || '0'),
        },
        withdrawals: {
          pendingCount: parseInt(withdrawalBase?.pending_count || '0'),
          pendingAmount: parseFloat(withdrawalBase?.pending_amount || '0'),
          approvedAmount: parseFloat(withdrawalBase?.approved_amount || '0'),
        },
        circulation: {
          totalBalance: parseFloat(circulationBase?.total_balance || '0'),
          totalPoints: parseFloat(circulationBase?.total_energy || '0'),
          adminEnergy: parseFloat((energyDistribution as any[])?.find(r => r.role === 'admin')?.total_energy || '0'),
          branchEnergy: parseFloat((energyDistribution as any[])?.find(r => r.role === 'branch')?.total_energy || '0'),
          providerEnergy: parseFloat((energyDistribution as any[])?.find(r => r.role === 'provider')?.total_energy || '0'),
          memberEnergy: parseFloat((energyDistribution as any[])?.find(r => r.role === 'member')?.total_energy || '0'),
        },
        teamRanking: (teamRanking || []).map(t => ({
          providerId: t.provider_id,
          providerName: t.provider_name,
          phone: t.phone,
          quota: parseFloat(t.quota),
          usedQuota: parseFloat(t.used_quota),
          totalSales: parseFloat(t.total_sales),
          totalRevenue: parseFloat(t.total_revenue),
          memberCount: parseInt(t.member_count),
          soldCount: parseInt(t.sold_count),
        })),
        branchRanking: (branchRanking || []).map(b => ({
          branchId: b.branch_id,
          branchName: b.branch_name,
          phone: b.phone,
          providerCount: parseInt(b.provider_count),
          memberCount: parseInt(b.member_count),
          totalSales: parseFloat(b.total_sales),
          totalRevenue: parseFloat(b.total_revenue),
          balance: parseFloat(b.balance),
        })),
      },
    });
  } catch (error: any) {
    console.error('[dashboard] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
