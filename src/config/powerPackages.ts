// ============================================
// 艺元智算 - GPU算力基建平台
// ============================================
// 
// 【商业模式】
// 会员购买GPU产品，只付本金
// 到期卖出时释放收益按5%分配给各角色（智算金不足需找服务商充值）
// 收益按比例分配给服务商、运营、上级、服务网点、直推
// 
// 【角色层级】
// 智算中心 → 服务网点 → 服务商 → 会员
//
// 【核心机制】
// - 智算金：卖出时释放收益，可找服务商充值
// - 积分：到期收益，可转收益
// - 产品流转：会员间转让，服务商担保
//
// ============================================

// ==================== 类型定义 ====================

// 用户角色类型
export type UserRole = 'member' | 'provider' | 'branch' | 'admin';

// 会员等级类型
export type MemberLevel = 'normal';

// 产品周期类型
export type ProductCycle = '3days' | '7days' | '15days' | '30days' | '90days';

// 产品等级类型（按金额区间）
export type ProductTier = 'standard' | 'premium';

// 产品状态
export type ProductStatus = 'holding' | 'transferring' | 'completed';

// 订单状态
export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

// 转让状态
export type TransferStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

// ==================== 用户接口定义 ====================

// 基础用户信息
export interface BaseUser {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  createdAt: string;
  referrerId?: string; // 直推人ID
}

// 会员信息
export interface Member extends BaseUser {
  role: 'member';
  memberLevel: MemberLevel;
  points: number; // 积分
  providerId: string; // 归属服务商ID
  directReferrals: number; // 直推人数
  totalPurchase: number; // 总购买金额
}

// 服务商信息
export interface Provider extends BaseUser {
  role: 'provider';
  serviceFeePaid: boolean; // 是否已交3800技术服务费
  serviceFeeAmount: number; // 技术服务费金额
  initialQuota: number; // 初始额度
  currentQuota: number; // 当前可用额度
  totalSales: number; // 总销售额
  directReferrals: number; // 直推人数
  systemPurchase: number; // 体系购买额
  holdingMembers: number; // 持仓会员数
  branchId?: string; // 归属服务网点ID（无则归智算中心）
  parentProviderId?: string; // 上级服务商ID（拆分出来的来源）
  childProviderIds?: string[]; // 下级服务商ID列表（拆分出去的）
  status: 'active' | 'suspended' | 'bankrupt' | 'pending_split'; // 状态
  lastSaleDate: string; // 最后销售日期
  canUpgrade: boolean; // 是否可升级为服务网点
  needSplit: boolean; // 是否需要拆分（达到20万）
  splitQuota: number; // 已拆分出去的额度
}

// 服务网点信息
export interface Branch extends BaseUser {
  role: 'branch';
  deposit: number; // 质押金5万
  discount: number; // 拿货折扣70%
  directProviders: number; // 直推服务商数
  totalSales: number; // 总销售额
  status: 'active' | 'suspended' | 'bankrupt'; // 状态
}

// ==================== 产品接口定义 ====================

// 产品周期配置
export interface ProductCycleConfig {
  cycle: ProductCycle;
  name: string;
  cycleDays: number;
  totalProfitRate: number; // 总收益率
  memberProfitRate: number; // 会员实际到手收益率
  releaseRate: number; // 释放收益比例
  minPrice: number;
  maxPrice: number;
}

// 产品配置（旧，保留兼容）
export interface ProductConfig {
  tier: ProductTier;
  name: string;
  minPrice: number;
  maxPrice: number;
  profitRate: number; // 收益比例 5%或6%
  cycleDays: number; // 周期天数
}

// 用户持有产品
export interface UserProduct {
  id: string;
  memberId: string;
  cycle: ProductCycle; // 产品周期
  tier: ProductTier;
  amount: number; // 购买金额（本金）
  totalProfit: number; // 总收益
  memberProfit: number; // 会员实际到手收益
  releaseNeeded: number; // 卖出时需支付的收益
  status: ProductStatus;
  startDate: string;
  endDate: string;
  providerId: string; // 归属服务商
}

// 订单
export interface Order {
  id: string;
  memberId: string;
  productId: string;
  amount: number; // 本金
  totalPay: number; // 实际支付（只付本金）
  status: OrderStatus;
  createdAt: string;
  providerId: string;
}

// 产品转让记录
export interface ProductTransfer {
  id: string;
  productId: string;
  fromMemberId: string;
  toMemberId: string;
  providerId: string; // 担保服务商
  amount: number; // 转让金额
  status: TransferStatus;
  createdAt: string;
  confirmedAt?: string;
}

// ==================== 配置常量 ====================

// 产品周期配置（核心）
export const productCycleConfig: Record<ProductCycle, ProductCycleConfig> = {
  '3days': {
    cycle: '3days',
    name: '3天产品',
    cycleDays: 3,
    totalProfitRate: 5, // 总收益5%
    memberProfitRate: 2, // 会员到手2%
    releaseRate: 3, // 收益支付3%
    minPrice: 1000, // ¥1,000-5,000
    maxPrice: 5000,
  },
  '7days': {
    cycle: '7days',
    name: '7天产品',
    cycleDays: 7,
    totalProfitRate: 10, // 总收益10%
    memberProfitRate: 5, // 会员到手5%
    releaseRate: 5, // 收益支付5%
    minPrice: 1000, // ¥1,000-10,000
    maxPrice: 10000,
  },
  '15days': {
    cycle: '15days',
    name: '15天产品',
    cycleDays: 15,
    totalProfitRate: 20, // 总收益20%
    memberProfitRate: 10, // 会员到手10%
    releaseRate: 10, // 收益支付10%
    minPrice: 5000,
    maxPrice: 30000,
  },
  '30days': {
    cycle: '30days',
    name: '30天产品',
    cycleDays: 30,
    totalProfitRate: 44, // 总收益44%
    memberProfitRate: 22, // 会员到手22%
    releaseRate: 22, // 收益支付22%
    minPrice: 10000,
    maxPrice: 100000,
  },
  '90days': {
    cycle: '90days',
    name: '90天产品',
    cycleDays: 90,
    totalProfitRate: 120, // 总收益120%
    memberProfitRate: 60, // 会员到手60%
    releaseRate: 60, // 收益支付60%
    minPrice: 30000,
    maxPrice: 500000,
  },
};

// 产品等级配置（保留兼容）
export const productTierConfig: Record<ProductTier, ProductConfig> = {
  standard: {
    tier: 'standard',
    name: '标准产品',
    minPrice: 1000,
    maxPrice: 10000,
    profitRate: 5,
    cycleDays: 7,
  },
  premium: {
    tier: 'premium',
    name: '高级产品',
    minPrice: 10000,
    maxPrice: 30000,
    profitRate: 10,
    cycleDays: 15,
  },
};

// 释放收益分配配置 — 按产品价格比例，合计5%
export const releaseDistribution = {
  member: 2, // 会员 2%
  referral: 0.25, // 直推 0.25%
  provider: 2, // 服务商 2%
  parentProvider: 0.25, // 下级服务商 0.25%
  branch: 0.1, // 服务网点 0.1%
  company: 0.4, // 智算平台运营 0.4%
  total: 5, // 总计 5%
};

// 释放收益分配配置（旧，保留兼容）
export const marketFeeDistribution = {
  member: 2,
  referral: 0.25,
  provider: 2,
  parentProvider: 0.25,
  branch: 0.1,
  company: 0.4,
  total: 5,
};

// 服务商准入条件
export const providerRequirements = {
  serviceFee: 2800, // 技术服务费
  minDirectReferrals: 3, // 最少直推人数（会员升级服务商需要）
  minSystemPurchase: 50000, // 最少体系购买额
};

// 服务商拆分规则
export const providerSplitRules = {
  triggerSales: 200000, // 触发拆分的销售额：20万
  splitQuota: 50000, // 拆分额度：5万
  minChildProviders: 1, // 最少拆分出1个下级服务商
  maxChildProviders: 3, // 最多拆分出3个下级服务商
  description: '服务商销售额达到20万时，需要拆分5万额度给体系内成长起来的会员服务商',
};

// 会员升级服务商条件
export const memberUpgradeRules = {
  minDirectReferrals: 3, // 最少直推会员数
  description: '会员需要直推3个以上会员，才能申请升级为服务商',
  note: '升级后，该会员的直推会员将划归到自己的服务商体系',
};

// 服务商管理规则
export const providerRules = {
  minInitialQuota: 10000, // 最小初始额度：1万起
  maxInitialQuota: 500000, // 最大初始额度：50万
  defaultInitialQuota: 50000, // 默认初始额度：5万
  productsPerWan: 4, // 每1万额度对应4个产品
  productCycleDays: [3, 7], // 服务商可用周期：3天和7天
  replenishConditions: {
    minHoldingMembers: 10, // 最少持仓会员数
    newRegistrations: 3, // 新注册会员数
  },
  withdrawalFeeThreshold: 10, // 提现手续费门槛（持仓会员数）
  withdrawalFeeRate: 0.05, // 提现手续费率5%
  suspendDays: 30, // 无销售停止权益天数
};

// 服务商产品配置规则
export const providerProductConfig = {
  minQuota: 10000, // 最低配额：1万起
  defaultQuota: 50000, // 默认配额：5万
  productsPerWan: 4, // 每1万额度对应4个产品
  // 产品周期配置
  cycles: [
    { days: 3, profitRate: 5, memberRate: 2, energyRate: 3, minPrice: 200, maxPrice: 5000 },
    { days: 7, profitRate: 10, memberRate: 5, energyRate: 5, minPrice: 200, maxPrice: 10000 },
  ],
  // 整额价格池（200-10000）
  pricePool: [
    // 小额产品 (200-1000)
    200, 300, 400, 500, 600, 700, 800, 900, 1000,
    // 中小产品 (1000-3000)
    1000, 1500, 2000, 2500, 3000,
    // 中大产品 (3000-6000)
    3000, 4000, 5000, 6000,
    // 大额产品 (6000-10000)
    6000, 7000, 8000, 9000, 10000,
  ],
  // 根据额度计算产品数量
  // 1万 = 4个，2万 = 8个，3万 = 12个，4万 = 16个，5万 = 20个
  calculateProductCount: (totalQuota: number): number => {
    return Math.floor(totalQuota / 10000) * 4;
  },
  // 根据配额生成产品（贪心算法，尽量用完所有额度）
  generateProducts: (totalQuota: number): Array<{
    price: number;
    period: number;
    totalRate: number;
    memberRate: number;
    energyRate: number;
  }> => {
    const products: Array<{
      price: number;
      period: number;
      totalRate: number;
      memberRate: number;
      energyRate: number;
    }> = [];
    
    // 3天产品配置
    const cycle3day = { days: 3, profitRate: 5, memberRate: 2, energyRate: 3, minPrice: 200, maxPrice: 5000 };
    // 7天产品配置
    const cycle7day = { days: 7, profitRate: 10, memberRate: 5, energyRate: 5, minPrice: 200, maxPrice: 10000 };
    
    // 价格池（从大到小排序，用于贪心算法）
    const pricePool = [...providerProductConfig.pricePool].sort((a, b) => b - a);
    
    let remainingQuota = totalQuota; // 剩余额度
    let productIndex = 0; // 产品索引
    
    // 贪心算法：尽量用完所有额度
    while (remainingQuota >= 200) { // 最低价格200
      const is3Day = productIndex % 2 === 0;
      const cycle = is3Day ? cycle3day : cycle7day;
      
      // 筛选适合该周期的价格（不能超过剩余额度）
      const availablePrices = pricePool.filter(p => 
        p >= cycle.minPrice && 
        p <= cycle.maxPrice && 
        p <= remainingQuota
      );
      
      // 如果没有合适的价格，尝试选择剩余额度内最大的
      if (availablePrices.length === 0) {
        // 找一个不超过剩余额度的最大价格
        const maxUnderQuota = pricePool.filter(p => p <= remainingQuota);
        if (maxUnderQuota.length === 0) break; // 额度太小，无法生成
        const price = maxUnderQuota[0];
        products.push({
          price,
          period: cycle.days,
          totalRate: cycle.profitRate,
          memberRate: cycle.memberRate,
          energyRate: cycle.energyRate,
        });
        remainingQuota -= price;
      } else {
        // 随机选择一个可用价格
        const randomIndex = Math.floor(Math.random() * availablePrices.length);
        const price = availablePrices[randomIndex];
        products.push({
          price,
          period: cycle.days,
          totalRate: cycle.profitRate,
          memberRate: cycle.memberRate,
          energyRate: cycle.energyRate,
        });
        remainingQuota -= price;
      }
      
      productIndex++;
      
      // 防止无限循环（额度太小无法生成）
      if (productIndex > 100) break;
    }
    
    return products;
  },
};

// 会员购买限制
export const memberPurchaseRules = {
  maxProductsPerMember: 3, // 每个会员最多购买3个产品
  maxAmountPerProduct: 10000, // 单个产品最大金额
  minAmountPerProduct: 500, // 单个产品最小金额
};

// 卖出审核状态
export type SellReviewStatus = 'pending' | 'approved' | 'on_market' | 'repurchased' | 'rejected';

// 卖出申请接口
export interface SellRequest {
  id: string;
  memberId: string;
  memberName: string;
  productId: string;
  productNo: string;
  amount: number; // 产品金额
  profit: number; // 收益
  releaseNeeded: number; // 需支付收益
  providerId: string;
  providerName: string;
  status: SellReviewStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
  // 市场状态
  onMarketAt?: string; // 上架市场时间
  grabbedAt?: string; // 被抢购时间
  repurchasedAt?: string; // 回购时间
  grabberId?: string; // 抢购者ID
  grabberName?: string; // 抢购者名称
}

// 服务网点准入条件
export const branchRequirements = {
  deposit: 50000, // 质押金
  minDirectProviders: 5, // 最少直推服务商数
};

// 服务网点规则
export const branchRules = {
  discount: 0.7, // 拿货折扣7折
  bankruptcyBuybackRate: 0.5, // 破产回购折扣5折
  bankruptcyClearanceMonths: 6, // 破产清算分期月数
};

// 会员等级配置
// ==================== 计算函数 ====================

// 根据金额获取推荐产品周期
export function getRecommendedCycle(amount: number): ProductCycle {
  if (amount <= 5000) return '3days';
  if (amount <= 10000) return '7days';
  if (amount <= 30000) return '15days';
  if (amount <= 100000) return '30days';
  return '90days';
}

// 计算产品收益（新逻辑）
export function calculateProductProfitByCycle(
  amount: number, 
  cycle: ProductCycle
): { 
  cycle: ProductCycle;
  totalProfit: number; // 总收益
  memberProfit: number; // 会员实际到手
  releaseNeeded: number; // 卖出时需支付的收益
  cycleDays: number;
} {
  const config = productCycleConfig[cycle];
  
  return {
    cycle,
    totalProfit: Math.floor(amount * config.totalProfitRate / 100),
    memberProfit: Math.floor(amount * config.memberProfitRate / 100),
    releaseNeeded: Math.floor(amount * config.releaseRate / 100),
    cycleDays: config.cycleDays,
  };
}

// 计算收益分配
export function calculateReleaseDistribution(amount: number): {
  total: number;
  provider: number;
  company: number;
  parentProvider: number;
  branch: number;
  referral: number;
} {
  return {
    total: amount,
    provider: Math.floor(amount * releaseDistribution.provider / 100),
    company: Math.floor(amount * releaseDistribution.company / 100),
    parentProvider: Math.floor(amount * releaseDistribution.parentProvider / 100),
    branch: Math.floor(amount * releaseDistribution.branch / 100),
    referral: Math.floor(amount * releaseDistribution.referral / 100),
  };
}

// 计算产品收益（旧，保留兼容）
export function calculateProductProfit(amount: number): { 
  tier: ProductTier; 
  points: number; 
  cycleDays: number;
} {
  let tier: ProductTier = 'standard';
  if (amount > 10000) {
    tier = 'premium';
  }
  
  const config = productTierConfig[tier];
  const points = amount * config.profitRate / 100;
  
  return {
    tier,
    points,
    cycleDays: config.cycleDays,
  };
}

// 计算释放收益分配（更新为新比例）
export function calculateMarketFeeDistribution(amount: number): {
  total: number;
  provider: number;
  parentProvider: number;
  referral: number;
  branch: number;
  company: number;
} {
  const totalFee = amount;
  
  return {
    total: totalFee,
    provider: Math.floor(totalFee * releaseDistribution.provider / 100),
    parentProvider: Math.floor(totalFee * releaseDistribution.parentProvider / 100),
    referral: Math.floor(totalFee * releaseDistribution.referral / 100),
    branch: Math.floor(totalFee * releaseDistribution.branch / 100),
    company: Math.floor(totalFee * releaseDistribution.company / 100),
  };
}

// 计算购买总支付（新逻辑：只付本金，释放收益到期结算）
export function calculateTotalPay(amount: number, cycle: ProductCycle): {
  productAmount: number; // 本金
  totalPay: number; // 实付 = 本金
  totalProfit: number; // 总收益
  memberProfit: number; // 会员实际到手
  releaseNeeded: number; // 卖出时需支付的收益
  cycleDays: number;
} {
  const profitInfo = calculateProductProfitByCycle(amount, cycle);
  return {
    productAmount: amount,
    totalPay: amount, // 只付本金
    totalProfit: profitInfo.totalProfit,
    memberProfit: profitInfo.memberProfit,
    releaseNeeded: profitInfo.releaseNeeded,
    cycleDays: profitInfo.cycleDays,
  };
}

// 判断会员是否可升级为服务商
export function canUpgradeToProvider(member: Member): {
  canUpgrade: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  
  if (member.directReferrals < providerRequirements.minDirectReferrals) {
    reasons.push(`直推人数不足（需≥${providerRequirements.minDirectReferrals}人）`);
  }
  
  if (member.totalPurchase < providerRequirements.minSystemPurchase) {
    reasons.push(`体系购买额不足（需≥¥${providerRequirements.minSystemPurchase.toLocaleString()}）`);
  }
  
  return {
    canUpgrade: reasons.length === 0,
    reasons,
  };
}

// 判断服务商是否可升级为服务网点
export function canUpgradeToBranch(provider: Provider): {
  canUpgrade: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  
  if (provider.directReferrals < branchRequirements.minDirectProviders) {
    reasons.push(`直推服务商不足（需≥${branchRequirements.minDirectProviders}个）`);
  }
  
  return {
    canUpgrade: reasons.length === 0,
    reasons,
  };
}

// 判断服务商是否可补货
export function canReplenishQuota(provider: Provider): {
  canReplenish: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  
  if (provider.holdingMembers < providerRules.replenishConditions.minHoldingMembers) {
    reasons.push(`持仓会员不足（需≥${providerRules.replenishConditions.minHoldingMembers}人）`);
  }
  
  if (provider.currentQuota > 0) {
    reasons.push('当前额度未用完');
  }
  
  return {
    canReplenish: reasons.length === 0,
    reasons,
  };
}

// 检查服务商是否应停止权益
export function shouldSuspendProvider(provider: Provider): boolean {
  const lastSale = new Date(provider.lastSaleDate);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - lastSale.getTime()) / (1000 * 60 * 60 * 24));
  return daysDiff >= providerRules.suspendDays;
}

// 计算服务网点破产清算
export function calculateBranchBankruptcy(branch: Branch): {
  totalQuota: number;
  buybackAmount: number;
  monthlyPayment: number;
  months: number;
} {
  // 假设totalQuota需要计算
  const totalQuota = branch.totalSales * 0.3; // 简化计算
  const buybackAmount = totalQuota * branchRules.bankruptcyBuybackRate;
  const months = branchRules.bankruptcyClearanceMonths;
  const monthlyPayment = buybackAmount / months;
  
  return {
    totalQuota,
    buybackAmount,
    monthlyPayment,
    months,
  };
};
