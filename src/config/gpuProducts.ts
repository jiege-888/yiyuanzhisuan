// ============================================
// 艺元智算 - 产品配置
// ============================================
// 
// 当前只支持3天产品，5%收益分配
// 会员2% + 服务商2% + 直推0.25% + 上级服务商0.25% + 网点0.1% + 运营0.4% = 5%
//
// ============================================

// 产品等级
export type ProductLevel = 'entry' | 'advanced' | 'premium';

// 周期配置
export interface CycleConfig {
  cycle: string;
  name: string;
  days: number;
  totalRate: number;
  memberRate: number;
}

// 当前只支持3天产品
export const cycleConfigs: CycleConfig[] = [
  { cycle: '3days', name: '3天产品', days: 3, totalRate: 5, memberRate: 2 },
];

// 等级颜色配置
export const levelColors = {
  entry: {
    primary: 'blue',
    gradient: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50',
    bgDark: 'bg-blue-600',
    textLight: 'text-blue-600',
    textDark: 'text-blue-400',
    border: 'border-blue-300',
    badge: 'bg-blue-100 text-blue-700',
    iconBg: 'bg-blue-500',
  },
  advanced: {
    primary: 'green',
    gradient: 'from-green-500 to-emerald-600',
    bgLight: 'bg-green-50',
    bgDark: 'bg-green-600',
    textLight: 'text-green-600',
    textDark: 'text-green-400',
    border: 'border-green-300',
    badge: 'bg-green-100 text-green-700',
    iconBg: 'bg-green-500',
  },
  premium: {
    primary: 'amber',
    gradient: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-50',
    bgDark: 'bg-amber-600',
    textLight: 'text-amber-600',
    textDark: 'text-amber-400',
    border: 'border-amber-300',
    badge: 'bg-amber-100 text-amber-700',
    iconBg: 'bg-amber-500',
  },
};

// 周期颜色配置
export const cycleColors: Record<string, { gradient: string; bgLight: string; textLight: string; border: string }> = {
  '3days': {
    gradient: 'from-blue-500 to-cyan-500',
    bgLight: 'bg-blue-50',
    textLight: 'text-blue-600',
    border: 'border-blue-200',
  },
};
