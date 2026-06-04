/**
 * 收益分配工具函数
 * 
 * 当前只支持3天产品，固定5%分配规则：
 * - 会员: 2%
 * - 服务商: 2%
 * - 直推人: 0.25%
 * - 上级服务商: 0.25%
 * - 网点: 0.1%
 * - 运营: 0.4%
 * 合计: 5%
 */

import { queryOne, execute } from '@/storage/database/pg-client';

// 分配比例（占 market_fee 的百分比）
const DISTRIBUTION_RATIOS = {
  member: 0.40,            // 会员 40%
  provider: 0.40,          // 服务商 40%
  inviter: 0.05,           // 直推奖励 5%
  parentProvider: 0.05,    // 下级服务商 5%
  branch: 0.02,            // 服务网点 2%
  company: 0.08,           // 总台运营 8%
} as const;

// 验证比例总和 = 100%
// 40% + 40% + 5% + 5% + 2% + 8% = 100% ✓

interface DistributionResult {
  memberProfit: number;       // 会员profit_rate收益
  memberReleaseShare: number; // 会员从释放金中分得
  providerShare: number;      // 服务商分成
  parentProviderShare: number; // 下级服务商分成
  inviterShare: number;       // 直推奖励
  branchShare: number;        // 服务网点分成
  companyShare: number;       // 总台运营分成
  providerId: string;         // 服务商ID
  parentProviderId: string | null;  // 下级服务商ID
  inviterId: string | null;   // 直推人ID
  branchId: string | null;    // 服务网点ID
  adminId: string;            // 总台ID
}

/**
 * 计算收益分配
 */
export function calculateDistribution(
  productPrice: number,
  totalRate: number,    // 总收益率（如 5 表示 5%）
  marketRate: number,   // 释放费率（如 5 表示 5%）
): Omit<DistributionResult, 'providerId' | 'parentProviderId' | 'inviterId' | 'branchId' | 'adminId'> {
  const totalAmount = productPrice * totalRate / 100;    // 总收益金额
  const releaseFee = productPrice * marketRate / 100;     // 释放收益金额
  const memberProfit = totalAmount - releaseFee;          // 会员profit_rate收益 = 总收益 - 释放收益

  return {
    memberProfit: Math.round(memberProfit * 100) / 100,
    memberReleaseShare: Math.round(releaseFee * DISTRIBUTION_RATIOS.member * 100) / 100,
    providerShare: Math.round(releaseFee * DISTRIBUTION_RATIOS.provider * 100) / 100,
    parentProviderShare: Math.round(releaseFee * DISTRIBUTION_RATIOS.parentProvider * 100) / 100,
    inviterShare: Math.round(releaseFee * DISTRIBUTION_RATIOS.inviter * 100) / 100,
    branchShare: Math.round(releaseFee * DISTRIBUTION_RATIOS.branch * 100) / 100,
    companyShare: Math.round(releaseFee * DISTRIBUTION_RATIOS.company * 100) / 100,
  };
}

/**
 * 执行收益分配（写入各角色 energy_value/智算金）
 * @returns 完整的分配结果
 */
export async function distributeRevenue(params: {
  userId: string;         // 购买/持有的会员ID
  productId: string;      // 产品ID
  productPrice: number;   // 产品价格
  totalRate: number;      // 总收益率
  marketRate: number;     // 释放费率
  orderId?: string;       // 关联订单ID
  distributionType: string; // 分配类型：buy/sell/transfer
}): Promise<DistributionResult> {
  const { userId, productId, productPrice, totalRate, marketRate, orderId, distributionType } = params;

  // 计算各角色分配金额
  const amounts = calculateDistribution(productPrice, totalRate, marketRate);

  // 查询服务商信息
  const user = await queryOne(
    `SELECT u.id, u.provider_id, u.inviter_id, u.branch_id, p.user_id as provider_user_id, p.parent_provider_id
     FROM users u
     LEFT JOIN providers p ON u.provider_id = p.id
     WHERE u.id = $1`,
    [userId]
  );

  if (!user) throw new Error('用户不存在');

  const providerId = user.provider_id || '';
  const inviterId = user.inviter_id || null;
  const branchId = user.branch_id || null;
  const parentProviderId = user.parent_provider_id || null;

  // 查找上级服务商的user_id
  let parentProviderUserId: string | null = null;
  if (parentProviderId) {
    const parentProvider = await queryOne(
      `SELECT user_id FROM providers WHERE id = $1`,
      [parentProviderId]
    );
    parentProviderUserId = parentProvider?.user_id || null;
  }

  // 智算中心ID（固定为admin角色的用户）
  const admin = await queryOne(
    `SELECT id FROM users WHERE role = 'admin' LIMIT 1`,
    []
  );
  const adminId = admin?.id || '00000000-0000-0000-0000-000000000001';

  // 开始分配
  const distributionResults: { role: string; userId: string; amount: number }[] = [];

  // 1. 会员收益
  distributionResults.push({ role: 'member', userId, amount: amounts.memberProfit });

  // 2. 服务商收益
  if (providerId) {
    const providerUser = await queryOne(
      `SELECT user_id FROM providers WHERE id = $1`,
      [providerId]
    );
    if (providerUser) {
      distributionResults.push({ role: 'provider', userId: providerUser.user_id, amount: amounts.providerShare });
    }
  }

  // 3. 上级服务商收益
  if (parentProviderUserId && amounts.parentProviderShare > 0) {
    distributionResults.push({ role: 'parent_provider', userId: parentProviderUserId, amount: amounts.parentProviderShare });
  } else if (amounts.parentProviderShare > 0) {
    // 无上级服务商，归智算中心
    distributionResults.push({ role: 'company', userId: adminId, amount: amounts.parentProviderShare });
  }

  // 4. 直推奖励
  if (inviterId && amounts.inviterShare > 0) {
    distributionResults.push({ role: 'inviter', userId: inviterId, amount: amounts.inviterShare });
  } else if (amounts.inviterShare > 0) {
    // 无直推人，归智算中心
    distributionResults.push({ role: 'company', userId: adminId, amount: amounts.inviterShare });
  }

  // 5. 服务网点收益
  if (branchId && amounts.branchShare > 0) {
    distributionResults.push({ role: 'branch', userId: branchId, amount: amounts.branchShare });
  } else if (amounts.branchShare > 0) {
    distributionResults.push({ role: 'company', userId: adminId, amount: amounts.branchShare });
  }

  // 6. 智算中心收益（基础 + 归属部分）
  const companyTotal = distributionResults
    .filter(r => r.role === 'company')
    .reduce((sum, r) => sum + r.amount, 0) + amounts.companyShare;
  
  // 移除临时的company记录，统一添加
  const finalResults = distributionResults.filter(r => r.role !== 'company');
  finalResults.push({ role: 'company', userId: adminId, amount: companyTotal });

  // 执行余额更新
  for (const result of finalResults) {
    if (result.amount > 0) {
      await execute(
        `UPDATE users SET balance = COALESCE(balance, 0) + $1 WHERE id = $2`,
        [result.amount, result.userId]
      );
    }
  }

  // 写入分配记录
  await execute(
    `INSERT INTO provider_revenue_distribution (
      user_id, product_id, provider_id, order_id,
      total_amount, market_fee, member_profit,
      provider_share, provider_user_id,
      parent_provider_share, parent_provider_id,
      inviter_share, inviter_id,
      senior_provider_share, senior_provider_id,
      branch_share, branch_id,
      company_share, distribution_type
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
    [
      userId, productId, providerId, orderId || null,
      productPrice * totalRate / 100, productPrice * marketRate / 100, amounts.memberProfit,
      amounts.providerShare, providerId ? (await queryOne(`SELECT user_id FROM providers WHERE id = $1`, [providerId]))?.user_id : null,
      amounts.parentProviderShare, parentProviderId,
      amounts.inviterShare, inviterId,
      0, null,  // 高级服务商已移除，字段保留为0/null
      amounts.branchShare, branchId,
      companyTotal, distributionType
    ]
  );

  return {
    ...amounts,
    providerId,
    parentProviderId,
    inviterId,
    branchId,
    adminId,
  };
}
