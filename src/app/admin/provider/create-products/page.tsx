'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Package, Database, Zap, Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProductItem {
  id: string;
  name: string;
  price: number;
  period: number;
  total_rate: number;
  profit_rate: number;
  market_rate: number;
}

interface QuotaAllocation {
  id: string;
  quota_amount: string;
  used_amount: string;
}

function CreateProductsContent() {
  const searchParams = useSearchParams();
  const providerId = searchParams.get('providerId') || '';

  const [quotaAllocations, setQuotaAllocations] = useState<QuotaAllocation[]>([]);
  const [selectedAllocation, setSelectedAllocation] = useState<QuotaAllocation | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 获取额度分配数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/quota-allocations?providerId=${providerId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          setQuotaAllocations(result.data);
          if (result.data.length > 0) {
            setSelectedAllocation(result.data[0]);
          }
        }
      } catch (error) {
        console.error('获取额度数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [providerId]);

  // 计算统计数据
  const totalQuota = selectedAllocation 
    ? parseFloat(selectedAllocation.quota_amount) 
    : 0;
  const usedQuota = selectedAllocation 
    ? parseFloat(selectedAllocation.used_amount) 
    : 0;
  const remainingQuota = totalQuota - usedQuota;
  const totalProductPrice = products.reduce((sum, p) => sum + p.price, 0);
  const remainingAfterCreate = remainingQuota - totalProductPrice;

  // 添加新产品
  const addProduct = () => {
    const newProduct: ProductItem = {
      id: `new-${Date.now()}`,
      name: `产品-${products.length + 1}`,
      price: 1000,
      period: 7,
      total_rate: 10,
      profit_rate: 5,
      market_rate: 5
    };
    setProducts([...products, newProduct]);
  };

  // 删除产品
  const deleteProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  // 更新产品
  const updateProduct = (id: string, field: keyof ProductItem, value: number) => {
    setProducts(products.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  // 提交生成产品
  const handleSubmit = async () => {
    if (products.length === 0) {
      alert('请至少添加一个产品！');
      return;
    }

    if (!selectedAllocation) {
      alert('请选择额度分配！');
      return;
    }

    if (totalProductPrice > remainingQuota) {
      alert(`额度不足！\n\n剩余额度：¥${remainingQuota.toLocaleString()}\n需要额度：¥${totalProductPrice.toLocaleString()}`);
      return;
    }

    if (!confirm(`确认生成 ${products.length} 个产品？\n\n总金额：¥${totalProductPrice.toLocaleString()}\n使用额度：¥${totalProductPrice.toLocaleString()}\n\n生成后额度将立即扣减`)) {
      return;
    }

    setSaving(true);
    try {
      // 逐个创建产品
      for (const product of products) {
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: product.name,
            code: `GPU${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
            price: product.price,
            period: product.period,
            totalRate: product.total_rate,
            marketRate: product.market_rate,
            profitRate: product.profit_rate,
            providerId: providerId
          })
        });
        
        const result = await response.json();
        if (!result.success) {
          throw new Error(`创建产品 "${product.name}" 失败：${result.error}`);
        }
      }

      // 扣减额度
      const quotaResponse = await fetch(`/api/quota-allocations/${selectedAllocation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usedAmount: parseFloat(selectedAllocation.used_amount) + totalProductPrice
        })
      });

      if (!quotaResponse.ok) {
        throw new Error('扣减额度失败');
      }

      alert(`成功生成 ${products.length} 个产品！`);
      window.location.href = '/admin/provider';
    } catch (error: any) {
      alert(error.message || '生成产品失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  // 快速生成产品（使用算法）
  const quickGenerate = (quotaAmount: number) => {
    const newProducts: ProductItem[] = [];
    const productCount = Math.floor(quotaAmount / 10000) * 3;
    
    // 生成产品价格列表
    const basePrices = [500, 600, 800, 1000, 2000, 3000, 4000, 5000, 5000, 5400, 900, 8000, 800, 8000, 5000];
    
    for (let i = 0; i < productCount; i++) {
      const price = basePrices[i % basePrices.length];
      const period = i % 2 === 0 ? 3 : 7;
      // 根据产品模板配置：3天=总5%/会员2%/收益3%，7天=总10%/会员5%/收益5%
      const cycleRates = period === 3 
        ? { total_rate: 5, profit_rate: 2, market_rate: 3 }
        : { total_rate: 10, profit_rate: 5, market_rate: 5 };
      
      newProducts.push({
        id: `auto-${Date.now()}-${i}`,
        name: `Token存储包`,
        price,
        period,
        ...cycleRates
      });
    }
    
    setProducts(newProducts);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* 顶部导航 */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                className="text-gray-400 hover:text-white"
                onClick={() => window.location.href = '/admin/provider'}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">创建产品</h1>
                <p className="text-xs text-gray-400">手动配置产品参数</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                className="bg-red-500 hover:bg-red-600"
                onClick={async () => {
                  if (!confirm('确认清空所有产品？\n\n此操作不可恢复！')) return;
                  try {
                    const response = await fetch(`/api/products/clear?providerId=${providerId}`, {
                      method: 'DELETE'
                    });
                    const result = await response.json();
                    if (result.success) {
                      alert(`成功清空 ${result.data.count} 个产品！`);
                    } else {
                      alert('清空失败：' + result.error);
                    }
                  } catch (error) {
                    alert('清空失败，请稍后重试');
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                清空所有产品
              </Button>
              <Button 
                className="bg-green-500 hover:bg-green-600"
                onClick={handleSubmit}
                disabled={saving || products.length === 0}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? '保存中...' : '保存并生成'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：额度选择 */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/50 border-slate-700 sticky top-24">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-400" />
                  额度选择
                </CardTitle>
                <CardDescription>
                  选择要使用的额度分配
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {quotaAllocations.map((allocation) => {
                  const total = parseFloat(allocation.quota_amount);
                  const used = parseFloat(allocation.used_amount);
                  const remaining = total - used;
                  const remainingPercent = (remaining / total * 100).toFixed(0);
                  
                  return (
                    <div 
                      key={allocation.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedAllocation?.id === allocation.id
                          ? 'bg-yellow-500/10 border-yellow-500/30'
                          : 'bg-slate-700/30 border-slate-600'
                      }`}
                      onClick={() => setSelectedAllocation(allocation)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">
                          ¥{total.toLocaleString()}
                        </span>
                        <Badge className={
                          remaining > 0 
                            ? 'bg-green-500/20 text-green-400 border-0' 
                            : 'bg-gray-500/20 text-gray-400 border-0'
                        }>
                          {remaining > 0 ? '可使用' : '已用完'}
                        </Badge>
                      </div>
                      <div className="text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-400">剩余</span>
                          <span className="text-blue-400">¥{remaining.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-600 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              remaining > 0 ? 'bg-blue-500' : 'bg-gray-500'
                            }`}
                            style={{ width: `${remainingPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* 快速生成 */}
            <Card className="bg-slate-800/50 border-slate-700 mt-4">
              <CardHeader>
                <CardTitle className="text-white text-sm">快速生成</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    className="border-slate-600 text-gray-300 hover:bg-slate-700"
                    onClick={() => quickGenerate(10000)}
                  >
                    1万额度（3个产品）
                  </Button>
                  <Button
                    variant="outline"
                    className="border-slate-600 text-gray-300 hover:bg-slate-700"
                    onClick={() => quickGenerate(20000)}
                  >
                    2万额度（6个产品）
                  </Button>
                  <Button
                    variant="outline"
                    className="border-slate-600 text-gray-300 hover:bg-slate-700"
                    onClick={() => quickGenerate(30000)}
                  >
                    3万额度（9个产品）
                  </Button>
                  <Button
                    variant="outline"
                    className="border-slate-600 text-gray-300 hover:bg-slate-700"
                    onClick={() => quickGenerate(50000)}
                  >
                    5万额度（15个产品）
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：产品编辑 */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Package className="w-5 h-5 text-green-400" />
                      产品列表
                    </CardTitle>
                    <CardDescription>
                      手动配置产品参数
                    </CardDescription>
                  </div>
                  <Button 
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600"
                    onClick={addProduct}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    添加产品
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-400 mb-4">暂无产品</p>
                    <Button 
                      className="bg-blue-500 hover:bg-blue-600"
                      onClick={addProduct}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      添加第一个产品
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {products.map((product, index) => (
                      <div key={product.id} className="p-4 rounded-lg border border-slate-600 bg-slate-700/30">
                        <div className="flex items-center justify-between mb-3">
                          <Input
                            value={product.name}
                            onChange={(e) => updateProduct(product.id, 'name', parseFloat(e.target.value) || 0)}
                            className="bg-slate-600 border-slate-500 text-white w-1/2"
                            placeholder="产品名称"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => deleteProduct(product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-gray-400 text-xs">价格</label>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-gray-400">¥</span>
                              <Input
                                type="number"
                                value={product.price}
                                onChange={(e) => updateProduct(product.id, 'price', parseFloat(e.target.value) || 0)}
                                className="bg-slate-600 border-slate-500 text-white"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-gray-400 text-xs">周期（天）</label>
                            <Input
                              type="number"
                              value={product.period}
                              onChange={(e) => updateProduct(product.id, 'period', parseFloat(e.target.value) || 0)}
                              className="bg-slate-600 border-slate-500 text-white mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-gray-400 text-xs">总收益率（%）</label>
                            <Input
                              type="number"
                              value={product.total_rate}
                              onChange={(e) => updateProduct(product.id, 'total_rate', parseFloat(e.target.value) || 0)}
                              className="bg-slate-600 border-slate-500 text-white mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-gray-400 text-xs">会员收益率（%）</label>
                            <Input
                              type="number"
                              value={product.profit_rate}
                              onChange={(e) => updateProduct(product.id, 'profit_rate', parseFloat(e.target.value) || 0)}
                              className="bg-slate-600 border-slate-500 text-white mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-gray-400 text-xs">释放费率（%）</label>
                            <Input
                              type="number"
                              value={product.market_rate}
                              onChange={(e) => updateProduct(product.id, 'market_rate', parseFloat(e.target.value) || 0)}
                              className="bg-slate-600 border-slate-500 text-white mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 统计信息 */}
            <Card className="bg-slate-800/50 border-slate-700 mt-4">
              <CardHeader>
                <CardTitle className="text-white text-sm">统计信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-gray-400 text-xs">产品数量</p>
                    <p className="text-xl font-bold text-white">{products.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">产品总价</p>
                    <p className="text-xl font-bold text-blue-400">¥{totalProductPrice.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">剩余额度</p>
                    <p className="text-xl font-bold text-green-400">¥{remainingQuota.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">生成后剩余</p>
                    <p className={`text-xl font-bold ${remainingAfterCreate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ¥{remainingAfterCreate.toLocaleString()}
                    </p>
                  </div>
                </div>
                {remainingAfterCreate < 0 && (
                  <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/30">
                    <p className="text-red-400 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      额度不足！超出 ¥{Math.abs(remainingAfterCreate).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CreateProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">加载中...</p>
        </div>
      </div>
    }>
      <CreateProductsContent />
    </Suspense>
  );
}
