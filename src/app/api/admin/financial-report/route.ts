import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/storage/database/pg-client';

export async function GET(request: NextRequest) {
  try {
    // 1. 公司总额度
    const companyQuota = await queryOne<{
      total_quota: string; used_quota: string; available_quota: string;
    }>(`SELECT total_quota::text, used_quota::text, available_quota::text FROM company_quota LIMIT 1`);

    const totalQuota = parseFloat(companyQuota?.total_quota || '100000000');
    const usedQuota = parseFloat(companyQuota?.used_quota || '0');
    const availableQuota = parseFloat(companyQuota?.available_quota || String(totalQuota - usedQuota));

    // 2. 各服务网点额度分配
    const allocations = await query<{
      branch_id: string; quota_amount: string; used_amount: string; provider_id: string;
    }>(`SELECT branch_id, quota_amount::text, used_amount::text, provider_id FROM quota_allocations`);

    const branchMap: Record<string, { quota: number; used: number; providers: string[] }> = {};
    (allocations || []).forEach((a: any) => {
      if (!branchMap[a.branch_id]) {
        branchMap[a.branch_id] = { quota: 0, used: 0, providers: [] };
      }
      branchMap[a.branch_id].quota += Number(a.quota_amount) || 0;
      branchMap[a.branch_id].used += Number(a.used_amount) || 0;
      if (a.provider_id) branchMap[a.branch_id].providers.push(a.provider_id);
    });

    // 3. 各服务商额度与收益
    const providers = await query<{
      id: string; user_id: string; quota: string; used_quota: string; total_sales: string; branch_id: string;
    }>(`SELECT id, user_id, quota::text, used_quota::text, total_sales::text, branch_id FROM providers`);

    // 服务商用户信息
    const providerUserIds = (providers || []).map((p: any) => `'${p.user_id}'`).join("','");
    const providerUsers = providerUserIds ? await query<{
      id: string; username: string; real_name: string; phone: string; unique_id: string; balance: string; energy_value: string;
    }>(`SELECT id, username, real_name, phone, unique_id, balance::text, energy_value::text FROM users WHERE id IN (${providerUserIds})`) : [];

    const userMap: Record<string, any> = {};
    (providerUsers || []).forEach((u: any) => { userMap[u.id] = u; });

    // 从 provider_revenue_distribution 按服务商聚合收益
    const revenueByProvider = await query<{
      provider_id: string; total_revenue: string; total_product_price: string;
    }>(`
      SELECT 
        provider_id,
        COALESCE(SUM(provider_share), 0)::text as total_revenue,
        COALESCE(SUM(product_price), 0)::text as total_product_price
      FROM provider_revenue_distribution
      GROUP BY provider_id
    `);

    const providerRevenueMap: Record<string, { total_revenue: number; total_product_price: number }> = {};
    (revenueByProvider || []).forEach((r: any) => {
      providerRevenueMap[r.provider_id] = {
        total_revenue: parseFloat(r.total_revenue) || 0,
        total_product_price: parseFloat(r.total_product_price) || 0,
      };
    });

    // 按网点聚合收益
    const revenueByBranch = await query<{
      branch_id: string; total_revenue: string;
    }>(`
      SELECT 
        branch_id,
        COALESCE(SUM(branch_share), 0)::text as total_revenue
      FROM provider_revenue_distribution
      WHERE branch_id IS NOT NULL
      GROUP BY branch_id
    `);

    const branchRevenueMap: Record<string, number> = {};
    (revenueByBranch || []).forEach((r: any) => {
      branchRevenueMap[r.branch_id] = parseFloat(r.total_revenue) || 0;
    });

    // 构建服务商列表（含预警）
    const providerStats = (providers || []).map((p: any) => {
      const user = userMap[p.user_id] || {};
      const revenue = providerRevenueMap[p.user_id] || { total_revenue: 0, total_product_price: 0 };
      const quotaNum = Number(p.quota) || 0;
      const quotaRatio = quotaNum > 0 ? (revenue.total_revenue / quotaNum) * 100 : 0;
      const isWarning = quotaRatio > 30;

      return {
        id: p.id,
        user_id: p.user_id,
        username: user.username || '-',
        real_name: user.real_name || '-',
        phone: user.phone || '-',
        unique_id: user.unique_id || '-',
        branch_id: p.branch_id,
        quota: quotaNum,
        used_quota: Number(p.used_quota) || 0,
        available_quota: quotaNum - Number(p.used_quota) || 0,
        total_sales: Number(p.total_sales) || 0,
        balance: Number(user.balance) || 0,
        energy_value: Number(user.energy_value) || 0,
        total_revenue: revenue.total_revenue,
        total_product_price: revenue.total_product_price,
        quota_ratio: Math.round(quotaRatio * 100) / 100,
        is_warning: isWarning,
      };
    });

    // 4. 各网点信息
    const branchIds = Object.keys(branchMap);
    const branchUserIds = branchIds.map(id => `'${id}'`).join("','");
    const branchUsers = branchUserIds ? await query<{
      id: string; username: string; real_name: string; phone: string; unique_id: string; balance: string; energy_value: string;
    }>(`SELECT id, username, real_name, phone, unique_id, balance::text, energy_value::text FROM users WHERE id IN (${branchUserIds}) AND role = 'branch'`) : [];

    const branchStats = branchIds.map((bid: string) => {
      const bData = branchMap[bid];
      const bUser = (branchUsers || []).find((u: any) => u.id === bid) || {} as any;
      // 该网点下的服务商
      const branchProviders = providerStats.filter((p: any) => p.branch_id === bid);
      const branchTotalRevenue = branchRevenueMap[bid] || 0;

      return {
        id: bid,
        username: bUser.username || '-',
        real_name: bUser.real_name || '-',
        phone: bUser.phone || '-',
        balance: Number(bUser.balance) || 0,
        energy_value: Number(bUser.energy_value) || 0,
        quota: bData.quota,
        used: bData.used,
        available: bData.quota - bData.used,
        provider_count: branchProviders.length,
        total_revenue: branchTotalRevenue,
        providers: branchProviders,
      };
    });

    // 5. 预警列表
    const warningList = providerStats.filter((p: any) => p.is_warning);

    // 6. 公司运营总收益（智算金）
    const companyRevenue = await queryOne<{ total_company_share: string }>(`
      SELECT COALESCE(SUM(company_share), 0)::text as total_company_share
      FROM provider_revenue_distribution
    `);

    return NextResponse.json({
      success: true,
      data: {
        company: {
          total_quota: totalQuota,
          used_quota: usedQuota,
          available_quota: availableQuota,
        },
        branches: branchStats,
        providers: providerStats,
        warnings: warningList,
        summary: {
          total_providers: providerStats.length,
          total_branches: branchStats.length,
          warning_count: warningList.length,
          total_revenue: providerStats.reduce((s: number, p: any) => s + p.total_revenue, 0),
          total_allocated: providerStats.reduce((s: number, p: any) => s + p.quota, 0),
          total_company_share: parseFloat(companyRevenue?.total_company_share || '0'),
        }
      }
    });
  } catch (error: any) {
    console.error('[financial-report] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
