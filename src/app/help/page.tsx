'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  HelpCircle, ChevronDown, ChevronUp, Search, 
  MessageCircle, Phone, Mail, FileText, 
  CreditCard, Users, Gift, Shield, Zap,
  ArrowLeft, Book, Video, ExternalLink
} from 'lucide-react';
import Link from 'next/link';

// FAQ分类
const faqCategories = [
  { id: 'basic', name: '基础概念', icon: Book },
  { id: 'trade', name: '交易相关', icon: CreditCard },
  { id: 'profit', name: '收益说明', icon: Zap },
  { id: 'energy', name: '收益', icon: Gift },
  { id: 'referral', name: '直推奖励', icon: Users },
  { id: 'security', name: '账户安全', icon: Shield },
];

// FAQ列表
const faqData = {
  basic: [
    { 
      q: '什么是艺元智算？', 
      a: '艺元智算是一个GPU算力租赁平台，会员可以购买GPU算力，获得稳定收益。我们提供多种周期的算力，包括短期（3-7天）、中期（15天）和长期（30天）算力。' 
    },
    { 
      q: '什么是收益？', 
      a: '智算金是平台内的虚拟资产，用于算力到期卖出时支付释放收益。智算金可以通过服务商充值获得，也可以通过直推奖励获得。' 
    },
    { 
      q: '什么是积分？', 
      a: '积分是算力到期后获得的收益，可以转换为收益使用。' 
    },
    { 
      q: '会员、服务商、服务网点有什么区别？', 
      a: '会员：购买算力获得收益\n服务商：提供服务，获得技术服务费和收益分成\n服务网点：管理多个服务商，获得服务网点收益分成\n智算中心：平台运营管理' 
    },
  ],
  trade: [
    { 
      q: '如何购买算力？', 
      a: '1. 登录会员账户\n2. 在算力市场选择心仪的算力\n3. 点击"立即购买"\n4. 支付Token值即可完成购买\n注意：只需支付本金，收益在到期时结算' 
    },
    { 
      q: '算力可以转让吗？', 
      a: '是的，算力可以在会员之间流转。流转需要服务商确认，确认后算力将转移到新买家名下。' 
    },
    { 
      q: '算力到期后如何处理？', 
      a: '算力到期后可以卖出，卖出时释放收益按5%比例分配给各角色。具体比例根据算力周期而定。' 
    },
    { 
      q: '购买算力后可以退款吗？', 
      a: '算力购买后不支持退款，但可以通过流转的方式转让给其他会员。' 
    },
  ],
  profit: [
    { 
      q: '收益是如何计算的？', 
      a: '收益 = Token值 × 收益率\n\n不同周期收益率不同（具体以产品标注为准）：\n• 1天周期：总收益3.4%（到手2%）\n• 3天周期：总收益5%（到手2%）\n• 7天周期：总收益10%（到手5%）\n• 15天周期：总收益20%（到手10%）\n• 30天周期：总收益44%（到手22%）\n• 90天周期：总收益120%（到手60%）\n\n收益进入智算金账户，可互转、提现或转积分' 
    },
    { 
      q: '收益什么时候到账？', 
      a: '算力到期卖出后，收益会立即到账。您可以在"我的持仓"中查看收益明细。' 
    },
    { 
      q: '为什么收益要分成两部分？', 
      a: '为了保障平台运营和各方利益，收益分为：\n• 实际到手部分：直接进入您的智算金账户\n• 释放收益部分：按比例分配给服务商、服务网点、直推人等' 
    },
  ],
  energy: [
    { 
      q: '如何获得收益？', 
      a: '收益获取方式：\n1. 找服务商充值（推荐）\n2. 直推会员购买算力获得奖励\n3. 积分转换\n4. 参与平台活动' 
    },
    { 
      q: '收益可以转让吗？', 
      a: '收益只能在平台内使用，不支持转让给其他会员。' 
    },
    { 
      q: '收益不足怎么办？', 
      a: '算力到期卖出需要智算金支付释放收益。如果智算金不足，请及时联系您的服务商充值，否则无法完成卖出操作。' 
    },
  ],
  referral: [
    { 
      q: '如何成为服务商？', 
      a: '成为服务商需要满足以下条件：\n1. 缴纳3800元技术服务费\n2. 直推会员达到一定数量\n3. 体系购买额达到要求\n\n您可以在会员中心申请升级为服务商。' 
    },
    { 
      q: '直推奖励如何计算？', 
      a: '直推会员购买算力或支付收益时，您可获得5%的奖励。奖励会自动计入您的收益账户。' 
    },
    { 
      q: '如何查看我的直推会员？', 
      a: '在会员中心点击"我的团队"，可以查看所有直推会员的购买情况和贡献收益。' 
    },
  ],
  security: [
    { 
      q: '如何保障账户安全？', 
      a: '建议您：\n1. 设置复杂的登录密码\n2. 不要将验证码告知他人\n3. 定期更换密码\n4. 不要点击不明链接' 
    },
    { 
      q: '忘记密码怎么办？', 
      a: '在登录页面点击"忘记密码"，通过手机验证码重置密码。' 
    },
    { 
      q: '手机号可以更换吗？', 
      a: '出于安全考虑，手机号更换需要联系客服进行人工审核。' 
    },
  ],
};

// 快捷入口
const quickLinks = [
  { name: '新手教程', icon: Video, href: '#', color: 'text-blue-400' },
  { name: '收益计算器', icon: Zap, href: '#', color: 'text-green-400' },
  { name: '在线客服', icon: MessageCircle, href: '#', color: 'text-purple-400' },
  { name: '用户协议', icon: FileText, href: '#', color: 'text-orange-400' },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('basic');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  
  const toggleItem = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  // 搜索过滤
  const filteredFaqs = searchQuery 
    ? Object.entries(faqData).flatMap(([cat, faqs]) => 
        faqs.filter(faq => 
          faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.a.toLowerCase().includes(searchQuery.toLowerCase())
        ).map((faq, idx) => ({ ...faq, category: cat, id: `${cat}-${idx}` }))
      )
    : faqData[activeCategory as keyof typeof faqData].map((faq, idx) => ({ ...faq, id: `${activeCategory}-${idx}` }));

  return (
    <div className="min-h-screen bg-slate-900">
      {/* 顶部导航 */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-white">帮助中心</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* 搜索框 */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input 
              placeholder="搜索问题..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-slate-800 border-slate-700 text-white placeholder-gray-400"
            />
          </div>
        </div>

        {/* 快捷入口 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Card key={link.name} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 cursor-pointer transition-colors">
                <CardContent className="py-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${link.color}`} />
                  </div>
                  <span className="text-white font-medium">{link.name}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 分类导航 */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/50 border-slate-700 sticky top-24">
              <CardHeader>
                <CardTitle className="text-white text-lg">问题分类</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {faqCategories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <Button
                      key={cat.id}
                      variant={activeCategory === cat.id ? 'default' : 'ghost'}
                      className={`w-full justify-start ${activeCategory === cat.id ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white hover:bg-slate-700'}`}
                      onClick={() => {
                        setActiveCategory(cat.id);
                        setSearchQuery('');
                      }}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {cat.name}
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* FAQ列表 */}
          <div className="lg:col-span-3">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-400" />
                  {searchQuery ? '搜索结果' : faqCategories.find(c => c.id === activeCategory)?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredFaqs.length === 0 ? (
                  <div className="py-12 text-center">
                    <HelpCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">未找到相关问题</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredFaqs.map((faq) => (
                      <div 
                        key={faq.id}
                        className="border border-slate-700 rounded-lg overflow-hidden"
                      >
                        <button
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
                          onClick={() => toggleItem(faq.id)}
                        >
                          <span className="text-white font-medium pr-4">{faq.q}</span>
                          {expandedItems.includes(faq.id) ? (
                            <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          )}
                        </button>
                        {expandedItems.includes(faq.id) && (
                          <div className="px-4 pb-4 pt-0">
                            <div className="p-4 rounded-lg bg-slate-700/30 text-gray-300 text-sm whitespace-pre-line leading-relaxed">
                              {faq.a}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 联系客服 */}
            <Card className="bg-slate-800/50 border-slate-700 mt-6">
              <CardHeader>
                <CardTitle className="text-white">没有找到答案？</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 h-auto py-4">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    在线客服
                  </Button>
                  <Button variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10 h-auto py-4">
                    <Phone className="w-5 h-5 mr-2" />
                    电话咨询
                  </Button>
                  <Button variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 h-auto py-4">
                    <Mail className="w-5 h-5 mr-2" />
                    邮件反馈
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
