// ============================================
// 艺元智算 - GPU算力基建平台
// ============================================
// 
// 【商业模式】
// 会员购买GPU产品，只付本金
// 到期解锁时释放收益按5%分配给各角色（以智算金形式到账）
// 收益按比例分配给会员、服务商、直推、上级服务商、网点、运营
// 
// 【角色层级】
// 智算中心 → 服务网点 → 服务商 → 会员
//
// 【核心机制】
// - 智算金：到期解锁收益，可找服务商充值
// - 产品流转：会员间转让，服务商担保
// - 当前只支持3天产品，5%收益分配
//
// ============================================

// ==================== 类型定义 ====================

// 用户角色类型
export type UserRole = 'member' | 'provider' | 'branch' | 'admin';

// 会员等级类型
export type MemberLevel = 'normal';

// 产品周期类型（当前只支持3天）
export type ProductCycle = '3days';

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
  serviceFeePaid: boolean; // 是否已交技术服务费
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
  deposit: number; // 质押金
  discount: number; // 拿货折扣
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
  minPrice: number;
  maxPrice: number;
}

// 用户持有产品
export interface UserProduct {
  id: string;
  memberId: string;
  cycle: ProductCycle; // 产品周期
  amount: number; // 购买金额（本金）
  totalProfit: number; // 总收益
  memberProfit: number; // 会员实际到手收益
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
  totalPay: number; // 实付 = 本金
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

// 产品周期配置（当前只支持3天）
export const productCycleConfig: Record<ProductCycle, ProductCycleConfig> = {
  '3days': {
    cycle: '3days',
    name: '3天产品',
    cycleDays: 3,
    totalProfitRate: 5, // 总收益5%
    memberProfitRate: 2, // 会员到手2%
    minPrice: 1000, // ¥1,000-5,000
    maxPrice: 5000,
  },
};

// 收益分配配置 — 3天产品5%分配
export const releaseDistribution = {
  member: 2,        // 会员 2%
  referral: 0.25,   // 直推 0.25%
  provider: 2,      // 服务商 2%
  parentProvider: 0.25, // 上级服务商 0.25%
  branch: 0.1,      // 服务网点 0.1%
  company: 0.4,     // 智算平台运营 0.4%
  total: 5,         // 总计 5%
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
  productCycleDays: [3], // 服务商可用周期：3天
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
  // 产品周期配置（当前只支持3天）
  cycles: [
    { days: 3, profitRate: 5, memberRate: 2, minPrice: 200, maxPrice: 5000 },
  ],
  // 整额价格池（200-5000，3天产品）
  pricePool: [
    // 小额产品 (200-1000)
    200, 300, 400, 500, 600, 700, 800, 900, 1000,
    // 中小产品 (1000-3000)
    1000, 1500, 2000, 2500, 3000,
    // 中大产品 (3000-5000)
    3000, 4000, 5000,
  ],
  // 根据配额生成产品（贪心算法，尽量用完所有额度）
  generateProducts: (totalQuota: number): Array<{
    price: number;
    period: number;
    totalRate: number;
    memberRate: number;
  }> => {
    const products: Array<{
      price: number;
      period: number;
      totalRate: number;
      memberRate: number;
    }> = [];
    
    // 3天产品配置
    const cycle3day = { days: 3, profitRate: 5, memberRate: 2, minPrice: 200, maxPrice: 5000 };
    
    // 价格池（从大到小排序，用于贪心算法）
    const pricePool = [...providerProductConfig.pricePool].sort((a, b) => b - a);
    
    let remainingQuota = totalQuota; // 剩余额度
    
    // 贪心算法：尽量用完所有额度，全部生成3天产品
    while (remainingQuota >= 200) {
      // 筛选适合3天周期的价格（不能超过剩余额度）
      const availablePrices = pricePool.filter(p => 
        p >= cycle3day.minPrice && 
        p <= cycle3day.maxPrice && 
        p <= remainingQuota
      );
      
      if (availablePrices.length === 0) {
        // 找一个不超过剩余额度的最大价格
        const maxUnderQuota = pricePool.filter(p => p <= remainingQuota);
        if (maxUnderQuota.length === 0) break;
        const price = maxUnderQuota[0];
        products.push({
          price,
          period: cycle3day.days,
          totalRate: cycle3day.profitRate,
          memberRate: cycle3day.memberRate,
        });
        remainingQuota -= price;
      } else {
        // 随机选择一个可用价格
        const randomIndex = Math.floor(Math.random() * availablePrices.length);
        const price = availablePrices[randomIndex];
        products.push({
          price,
          period: cycle3day.days,
          totalRate: cycle3day.profitRate,
          memberRate: cycle3day.memberRate,
        });
        remainingQuota -= price;
      }
      
      // 防止无限循环
      if (products.length > 100) break;
    }
    
    return products;
  },
};

// 会员购买限制
export const memberPurchaseRules = {
  maxProductsPerMember: 3, // 每个会员最多购买3个产品
  maxAmountPerProduct: 5000, // 单个产品最大金额（3天产品上限）
  minAmountPerProduct: 200, // 单个产品最小金额
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

// ==================== 计算函数 ====================

// 获取推荐产品周期（当前只有3天）
export function getRecommendedCycle(_amount: number): ProductCycle {
  return '3days';
}

// 计算产品收益
export function calculateProductProfitByCycle(
  amount: number, 
  _cycle: ProductCycle
): { 
  cycle: ProductCycle;
  totalProfit: number; // 总收益
  memberProfit: number; // 会员实际到手
  cycleDays: number;
} {
  const config = productCycleConfig['3days'];
  
  return {
    cycle: '3days',
    totalProfit: Math.floor(amount * config.totalProfitRate / 100),
    memberProfit: Math.floor(amount * config.memberProfitRate / 100),
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
    provider: Math.round(amount * releaseDistribution.provider / 100 * 100) / 100,
    company: Math.round(amount * releaseDistribution.company / 100 * 100) / 100,
    parentProvider: Math.round(amount * releaseDistribution.parentProvider / 100 * 100) / 100,
    branch: Math.round(amount * releaseDistribution.branch / 100 * 100) / 100,
    referral: Math.round(amount * releaseDistribution.referral / 100 * 100) / 100,
  };
}

// 计算购买总支付（只付本金，收益到期结算）
export function calculateTotalPay(amount: number, _cycle: ProductCycle): {
  productAmount: number; // 本金
  totalPay: number; // 实付 = 本金
  totalProfit: number; // 总收益
  memberProfit: number; // 会员实际到手
  cycleDays: number;
} {
  const profitInfo = calculateProductProfitByCycle(amount, '3days');
  return {
    productAmount: amount,
    totalPay: amount, // 只付本金
    totalProfit: profitInfo.totalProfit,
    memberProfit: profitInfo.memberProfit,
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
  const totalQuota = branch.totalSales * 0.3;
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
