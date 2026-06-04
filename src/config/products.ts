// ============================================
// 艺元智算 - Token存储包产品配置
// ============================================
// 
// 【产品体系】
// - 国产GPU芯片：910B, 950P, RBR100/BR104, 深算DCU, K100, 思元590
// - 英伟达芯片：H800, A800
// - 三个等级：短期算力、中期算力、长期算力
// - 短期算力：10个产品，与服务商产品呼应
//
// ============================================

// GPU芯片类型
export type GPUChipType = 
  // 国产GPU
  | '910B'      // 华为昇腾910B
  | '950P'      // 华为昇腾950P
  | 'RBR100'    // 海光RBR100
  | 'BR104'     // 海光BR104
  | 'DCU'       // 深算DCU
  | 'K100'      // 壁仞K100
  | '590'       // 思元590
  // 英伟达
  | 'H800'      // NVIDIA H800
  | 'A800';     // NVIDIA A800

// 产品等级
export type ProductLevel = 'basic' | 'intermediate' | 'advanced';

// GPU品牌分类
export type GPUBrand = 'domestic' | 'nvidia';

// GPU芯片信息
export interface GPUChipInfo {
  type: GPUChipType;
  name: string;
  brand: GPUBrand;
  brandName: string;
  description: string;
  specs: {
    memory: string;
    bandwidth: string;
    performance: string;
  };
  image: string;
}

// 产品配置
export interface GPUProduct {
  id: string;
  productNo: string; // 产品编号
  name: string;
  chip: GPUChipType;
  level: ProductLevel;
  price: number;
  profitRate: number; // 收益率
  cycleDays: number;
  minEnergyValue: number; // 最低收益要求
  totalQuantity: number; // 总量
  availableQuantity: number; // 可用量
  image: string;
  description: string;
  features: string[];
  status: 'available' | 'running' | 'sold' | 'unavailable'; // 产品状态：可购买、运行中、已售、未起售
  sellerId?: string; // 卖出会员ID
  sellerName?: string; // 卖出会员名称
}

// ==================== GPU芯片信息 ====================

export const gpuChips: Record<GPUChipType, GPUChipInfo> = {
  // 国产GPU芯片
  '910B': {
    type: '910B',
    name: '华为昇腾910B',
    brand: 'domestic',
    brandName: '华为昇腾',
    description: '国产AI训练旗舰芯片，性能强劲',
    specs: {
      memory: '64GB HBM2e',
      bandwidth: '1.2TB/s',
      performance: '310 TFLOPS(FP16)',
    },
    image: 'https://coze-coding-project.tos.coze.site/coze_storage_7622897315468115978/image/generate_image_12dc17e3-addf-4f09-8d7e-a361987a9442.jpeg?sign=1806551671-705820bd7d-0-ef765bcde7d4efd6e36f12c0eb8b4ee26d24a6f590a496c4157162ee1f5e74b7',
  },
  '950P': {
    type: '950P',
    name: '华为昇腾950P',
    brand: 'domestic',
    brandName: '华为昇腾',
    description: '新一代推理优化芯片',
    specs: {
      memory: '48GB HBM2e',
      bandwidth: '900GB/s',
      performance: '280 TFLOPS(FP16)',
    },
    image: 'https://coze-coding-project.tos.coze.site/coze_storage_7622897315468115978/image/generate_image_ece93a52-1220-48b5-bc7c-8ebd6e090448.jpeg?sign=1806550971-6eed654fb7-0-ad0182c3811115d88f6dcc1b37f26fc878c1d12692c1953f33c3360e9d9ac04a',
  },
  'RBR100': {
    type: 'RBR100',
    name: '海光RBR100',
    brand: 'domestic',
    brandName: '海光信息',
    description: '高性价比通用计算芯片',
    specs: {
      memory: '32GB HBM2',
      bandwidth: '800GB/s',
      performance: '200 TFLOPS(FP16)',
    },
    image: 'https://coze-coding-project.tos.coze.site/coze_storage_7622897315468115978/image/generate_image_b9dbd071-4e07-4c54-88a5-102ccb6fe322.jpeg?sign=1806394969-3aa54d80eb-0-6a65089e6c3271fd4b943d163c1e234a42450af07d2806c95af114067399e750',
  },
  'BR104': {
    type: 'BR104',
    name: '海光BR104',
    brand: 'domestic',
    brandName: '海光信息',
    description: '入门级AI推理芯片',
    specs: {
      memory: '24GB HBM2',
      bandwidth: '600GB/s',
      performance: '150 TFLOPS(FP16)',
    },
    image: 'https://coze-coding-project.tos.coze.site/coze_storage_7622897315468115978/image/generate_image_a4796f6a-28ff-4201-a891-0845fd2e717b.jpeg?sign=1806394970-10799d7b07-0-dc87a9e4b6175ed13033e7bb8b6bec0ea657529c5b176ce184e9d13247c1791e',
  },
  'DCU': {
    type: 'DCU',
    name: '深算DCU',
    brand: 'domestic',
    brandName: '深算科技',
    description: '深度学习加速单元',
    specs: {
      memory: '40GB HBM2',
      bandwidth: '750GB/s',
      performance: '180 TFLOPS(FP16)',
    },
    image: 'https://coze-coding-project.tos.coze.site/coze_storage_7622897315468115978/image/generate_image_f845048a-7e07-4ad2-94dd-71815c9716af.jpeg?sign=1806394972-bd75495b47-0-659a41813b9d1ab893c6130f0340b44105f52ff445d8c7db98784dc0c3f5afcc',
  },
  'K100': {
    type: 'K100',
    name: '壁仞K100',
    brand: 'domestic',
    brandName: '壁仞科技',
    description: '云端AI推理加速卡',
    specs: {
      memory: '32GB HBM2e',
      bandwidth: '850GB/s',
      performance: '220 TFLOPS(FP16)',
    },
    image: 'https://coze-coding-project.tos.coze.site/coze_storage_7622897315468115978/image/generate_image_866a5f24-d00b-4b73-9909-74efbc9e1f10.jpeg?sign=1806394971-9e8b992c88-0-8210748800a6f8d6f65d0b545ac17d65cbf57994c53d344e2585b28cc99a93b0',
  },
  '590': {
    type: '590',
    name: '思元590',
    brand: 'domestic',
    brandName: '寒武纪',
    description: '智能处理器旗舰产品',
    specs: {
      memory: '48GB HBM2',
      bandwidth: '900GB/s',
      performance: '250 TFLOPS(FP16)',
    },
    image: 'https://coze-coding-project.tos.coze.site/coze_storage_7622897315468115978/image/generate_image_452bf68d-3d46-4f9e-aaff-c5472ec5470f.jpeg?sign=1806394972-93b5429179-0-4be3283f549aa062ea2f2e07f3a746f309fe127e5c25ecbd2e5e005fc8b528f2',
  },
  // 英伟达芯片
  'H800': {
    type: 'H800',
    name: 'NVIDIA H800',
    brand: 'nvidia',
    brandName: 'NVIDIA',
    description: '顶级AI训练加速卡',
    specs: {
      memory: '80GB HBM3',
      bandwidth: '3.35TB/s',
      performance: '1979 TFLOPS(FP16)',
    },
    image: 'https://coze-coding-project.tos.coze.site/coze_storage_7622897315468115978/image/generate_image_a9055c3c-069b-40bd-bdb9-3991499bcb7c.jpeg?sign=1806394969-4375b95d67-0-7af95b2a029828af2838a34ab30cc76303449b5fcc09fa03946634fffeaf57a1',
  },
  'A800': {
    type: 'A800',
    name: 'NVIDIA A800',
    brand: 'nvidia',
    brandName: 'NVIDIA',
    description: '高性能AI推理加速卡',
    specs: {
      memory: '80GB HBM2e',
      bandwidth: '1.55TB/s',
      performance: '312 TFLOPS(FP16)',
    },
    image: 'https://coze-coding-project.tos.coze.site/coze_storage_7622897315468115978/image/generate_image_77b7c8e7-edc6-4f3c-a24b-25a7b19fab9a.jpeg?sign=1806394969-f7be904ab9-0-32ad45a51ce327931d8d6433f16a65ef3e425409cc922d61f6007fdd14d02a70',
  },
};

// 产品等级配置
// 短期算力：与服务商产品呼应，3天/7天周期
// 中期算力、长期算力：保持原有配置
export const productLevelConfig = {
  basic: {
    name: '短期算力',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-400',
    badge: '短期',
    priceRange: [500, 10000] as [number, number],
    profitRate: 10, // 最高总收益10%（7天）
    cycleDays: 7,
  },
  intermediate: {
    name: '中期算力',
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-400',
    badge: '中期',
    priceRange: [5000, 15000] as [number, number],
    profitRate: 20, // 15天周期总收益20%
    cycleDays: 15,
  },
  advanced: {
    name: '长期算力',
    color: 'from-yellow-500 to-orange-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    textColor: 'text-yellow-400',
    badge: '长期',
    priceRange: [15000, 50000] as [number, number],
    profitRate: 44, // 30天周期总收益44%
    cycleDays: 30,
  },
};

// ==================== GPU产品列表（30个产品）====================

// 生成产品编号
const generateProductNo = (level: ProductLevel, index: number): string => {
  const levelPrefix = { basic: 'JC', intermediate: 'ZJ', advanced: 'GJ' };
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `${levelPrefix[level]}${date}-${String(index).padStart(3, '0')}`;
};

// 生成产品ID
const generateProductId = (level: ProductLevel, index: number): string => {
  return `GPU-${level.toUpperCase()}-${String(index).padStart(2, '0')}`;
};

// 模拟卖家数据
const mockSellers = [
  { id: 'm1', name: '张伟' },
  { id: 'm3', name: '王强' },
  { id: 'm5', name: '孙丽' },
  { id: 'm7', name: '吴芳' },
  { id: 'm9', name: '陈红' },
];

// 产品配置生成器
const createProducts = (): GPUProduct[] => {
  const products: GPUProduct[] = [];
  
  // 国产芯片列表
  const domesticChips: GPUChipType[] = ['910B', '950P', 'RBR100', 'BR104', 'DCU', 'K100', '590'];
  // 英伟达芯片列表
  const nvidiaChips: GPUChipType[] = ['H800', 'A800'];
  
  // 所有芯片（国产优先）
  const allChips: GPUChipType[] = [...domesticChips, ...nvidiaChips];
  
  // 随机状态：部分可购买，部分运行中
  const getRandomStatus = (): 'available' | 'running' => {
    return Math.random() > 0.3 ? 'available' : 'running';
  };
  
  // 短期算力（15个）- 与服务商产品完全一致，3天/7天周期
  // 15个产品价格配置，总额50000元
  const shortTermConfigs = [
    { price: 500, cycleDays: 3 as const },
    { price: 600, cycleDays: 7 as const },
    { price: 800, cycleDays: 3 as const },
    { price: 1000, cycleDays: 7 as const },
    { price: 2000, cycleDays: 3 as const },
    { price: 3000, cycleDays: 7 as const },
    { price: 4000, cycleDays: 3 as const },
    { price: 5000, cycleDays: 7 as const },
    { price: 5000, cycleDays: 3 as const },
    { price: 5400, cycleDays: 7 as const },
    { price: 900, cycleDays: 3 as const },
    { price: 8000, cycleDays: 7 as const },
    { price: 800, cycleDays: 3 as const },
    { price: 8000, cycleDays: 7 as const },
    { price: 5000, cycleDays: 3 as const }, // 总额50000
  ];
  
  // 产品编号格式：服务商前缀 + 日期 + 序号（如 P001-240327-001）
  const generateProviderProductNo = (index: number): string => {
    const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const seq = String(index + 1).padStart(3, '0');
    return `P001-${date}-${seq}`; // P001表示服务商编号
  };
  
  for (let i = 0; i < 15; i++) {
    const config = shortTermConfigs[i];
    const chip = allChips[i % allChips.length];
    const status = getRandomStatus();
    const seller = status === 'available' ? mockSellers[i % mockSellers.length] : undefined;
    
    // 只支持3天产品，固定5%收益分配
    const cycleRates = { totalProfitRate: 5, memberProfitRate: 2, releaseRate: 5 };
    
    products.push({
      id: `provider-product-${i + 1}`,
      productNo: generateProviderProductNo(i),
      name: `${gpuChips[chip].name}-${i + 1}`,
      chip,
      level: 'basic',
      price: config.price,
      profitRate: cycleRates.totalProfitRate,
      cycleDays: config.cycleDays,
      minEnergyValue: Math.floor(config.price * cycleRates.releaseRate / 100),
      totalQuantity: 100,
      availableQuantity: status === 'available' ? 1 : 0,
      image: gpuChips[chip].image,
      description: `${gpuChips[chip].description}，${config.price}元起`,
      features: [
        `${gpuChips[chip].specs.memory} 显存`,
        `带宽 ${gpuChips[chip].specs.bandwidth}`,
        `${gpuChips[chip].specs.performance} 算力`,
        `${config.cycleDays}天周期 总收益${cycleRates.totalProfitRate}%`,
      ],
      status,
      sellerId: seller?.id,
      sellerName: seller?.name,
    });
  }
  
  // 中期算力（10个）- 15天周期，总收益20%，到手10% - 未起售
  const intermediatePrices = [5000, 6000, 7000, 8000, 10000, 12000, 13000, 14000, 15000, 15000];
  for (let i = 0; i < 10; i++) {
    const chip = allChips[(i + 2) % allChips.length];
    
    products.push({
      id: generateProductId('intermediate', i + 1),
      productNo: generateProductNo('intermediate', i + 1),
      name: `${gpuChips[chip].name}-${i + 1}`,
      chip,
      level: 'intermediate',
      price: intermediatePrices[i],
      profitRate: 20, // 15天周期总收益20%
      cycleDays: 15,
      minEnergyValue: Math.floor(intermediatePrices[i] * 0.1), // 收益10%
      totalQuantity: 50,
      availableQuantity: 0, // 未起售，无库存
      image: gpuChips[chip].image,
      description: `${gpuChips[chip].description}，${intermediatePrices[i]}元起`,
      features: [
        `${gpuChips[chip].specs.memory} 显存`,
        `带宽 ${gpuChips[chip].specs.bandwidth}`,
        `${gpuChips[chip].specs.performance} 算力`,
        '15天周期 总收益20%',
        '专属客服支持',
      ],
      status: 'unavailable', // 未起售
    });
  }
  
  // 长期算力（10个）- 30天周期，总收益44%，到手22% - 未起售
  const advancedPrices = [15000, 18000, 20000, 25000, 30000, 35000, 40000, 45000, 50000, 50000];
  for (let i = 0; i < 10; i++) {
    // 高级产品优先使用英伟达和高端国产芯片
    const advancedChips: GPUChipType[] = ['H800', 'A800', '910B', '950P', '590'];
    const chip = advancedChips[i % advancedChips.length];
    
    products.push({
      id: generateProductId('advanced', i + 1),
      productNo: generateProductNo('advanced', i + 1),
      name: `${gpuChips[chip].name}-${i + 1}`,
      chip,
      level: 'advanced',
      price: advancedPrices[i],
      profitRate: 44, // 30天周期总收益44%
      cycleDays: 30,
      minEnergyValue: Math.floor(advancedPrices[i] * 0.22), // 收益22%
      totalQuantity: 20,
      availableQuantity: 0, // 未起售，无库存
      image: gpuChips[chip].image,
      description: `${gpuChips[chip].description}，${advancedPrices[i]}元起`,
      features: [
        `${gpuChips[chip].specs.memory} 显存`,
        `带宽 ${gpuChips[chip].specs.bandwidth}`,
        `${gpuChips[chip].specs.performance} 算力`,
        '30天周期 总收益44%',
        'VIP专属通道',
        '优先技术支持',
        '收益加速特权',
      ],
      status: 'unavailable', // 未起售
    });
  }
  
  return products;
};

// 导出产品列表
export const gpuProducts: GPUProduct[] = createProducts();

// ==================== 辅助函数 ====================

// 获取指定等级的产品
export const getProductsByLevel = (level: ProductLevel): GPUProduct[] => {
  return gpuProducts.filter(p => p.level === level);
};

// 获取指定芯片的产品
export const getProductsByChip = (chip: GPUChipType): GPUProduct[] => {
  return gpuProducts.filter(p => p.chip === chip);
};

// 获取国产芯片产品
export const getDomesticProducts = (): GPUProduct[] => {
  const domesticChips: GPUChipType[] = ['910B', '950P', 'RBR100', 'BR104', 'DCU', 'K100', '590'];
  return gpuProducts.filter(p => domesticChips.includes(p.chip));
};

// 获取英伟达芯片产品
export const getNvidiaProducts = (): GPUProduct[] => {
  const nvidiaChips: GPUChipType[] = ['H800', 'A800'];
  return gpuProducts.filter(p => nvidiaChips.includes(p.chip));
};

// 计算产品收益（新逻辑）
export const calculateProductProfit = (product: GPUProduct): {
  profit: number;
  profitRate: number;
  totalReturn: number;
} => {
  const profit = product.price * product.profitRate / 100;
  return {
    profit,
    profitRate: product.profitRate,
    totalReturn: product.price + profit,
  };
};

// 根据周期获取收益比例（当前只支持3天产品）
export const getCycleProfitRates = (_cycleDays: number): {
  totalProfitRate: number; // 总收益率 5%
  memberProfitRate: number; // 会员实际到手 2%
  releaseRate: number; // 收益分配 5%
} => {
  return { totalProfitRate: 5, memberProfitRate: 2, releaseRate: 5 };
};

// 计算购买所需支付（新逻辑：只付本金）
export const calculatePurchasePayment = (product: GPUProduct, quantity: number = 1): {
  productAmount: number; // 本金
  totalPay: number; // 实付 = 本金
  totalProfit: number; // 总收益
  memberProfit: number; // 会员实际到手
  releaseNeeded: number; // 卖出时需支付的收益
  cycleDays: number;
} => {
  const productAmount = product.price * quantity;
  const rates = getCycleProfitRates(product.cycleDays);
  
  return {
    productAmount,
    totalPay: productAmount, // 只付本金
    totalProfit: Math.floor(productAmount * rates.totalProfitRate / 100),
    memberProfit: Math.floor(productAmount * rates.memberProfitRate / 100),
    releaseNeeded: Math.floor(productAmount * rates.releaseRate / 100),
    cycleDays: product.cycleDays,
  };
};

// 按品牌分组产品
export const getProductsByBrand = (): {
  domestic: GPUProduct[];
  nvidia: GPUProduct[];
} => {
  return {
    domestic: getDomesticProducts(),
    nvidia: getNvidiaProducts(),
  };
};

// 获取产品统计
export const getProductStats = (): {
  total: number;
  byLevel: Record<ProductLevel, number>;
  byBrand: { domestic: number; nvidia: number };
} => {
  return {
    total: gpuProducts.length,
    byLevel: {
      basic: getProductsByLevel('basic').length,
      intermediate: getProductsByLevel('intermediate').length,
      advanced: getProductsByLevel('advanced').length,
    },
    byBrand: {
      domestic: getDomesticProducts().length,
      nvidia: getNvidiaProducts().length,
    },
  };
};
