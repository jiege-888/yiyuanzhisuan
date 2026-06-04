'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, Users, TrendingUp, DollarSign, Activity, 
  Server, LogOut, Database, Cpu,
  Coins, Wallet, AlertCircle, Shield, RefreshCw,
  Crown, Settings, Percent, Package, Eye, ArrowRightLeft,
  BarChart3, PieChart, TrendingDown, HelpCircle, Bell,
  Clock, XCircle, Building, ChevronDown, ChevronRight,
  LayoutDashboard, BuildingIcon, UserCog, User, ShoppingCart,
  Zap, TrendingUpIcon, DatabaseIcon, Settings2,
  ChevronLeft, ChevronUp, Search, Filter, Download,
  CheckCircle, X, MoreHorizontal, Plus, Edit, Trash2,
  ArrowUpRight, ArrowDownRight, EyeOff, History
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { NotificationCenter } from '@/components/NotificationCenter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

// 视图类型
type ViewType = 'global' | 'branch';
type NavItemType = 'overview' | 'branches' | 'providers' | 'members' | 'orders' | 'energy' | 'income' | 'quota' | 'settings';
type OrderType = 'products' | 'transfers' | 'repurchases';

// 接口定义
interface Branch {
  id: string;
  username: string;
  phone?: string;
  
  balance: number;
  quota?: number;
  used_quota?: number;
  total_sales?: number;
  member_count?: number;
  provider_count?: number;
  created_at: string;
  region?: string;
  status?: string;
}

interface Provider {
  id: string;
  user_id: string;
  username: string;
  phone?: string;
  branch_id: string | null;
  
  balance: number;
  quota: number;
  used_quota: number;
  total_sales: number;
  member_count?: number;
  is_active: boolean;
  created_at: string;
}

interface Member {
  id: string;
  username: string;
  phone?: string;
  provider_id: string | null;
  branch_id?: string | null;
  
  balance: number;
  points: number;
  total_investment?: number;
  total_profit?: number;
  is_active: boolean;
  created_at: string;
}

interface Order {
  id: string;
  order_type: string;
  member_name: string;
  member_id: string;
  branch_name?: string;
  provider_name?: string;
  product_name: string;
  product_price: number;
  amount: number;
  status: string;
  created_at: string;
}

interface EnergyTransaction {
  id: string;
  type: string;
  from_user: string;
  to_user: string;
  amount: number;
  reason: string;
  created_at: string;
}

interface IncomeRecord {
  id: string;
  source: string;
  amount: number;
  type: string;
  from_user: string;
  to_user: string;
  created_at: string;
}

interface QuotaAllocation {
  id: string;
  from_user: string;
  to_user: string;
  amount: number;
  energy_bonus: number;
  status: string;
  created_at: string;
}

// 侧边导航组件
function Sidebar({ 
  activeNav, 
  onNavChange 
}: { 
  activeNav: NavItemType; 
  onNavChange: (nav: NavItemType) => void;
}) {
  const navItems = [
    { id: 'overview', label: '概览', icon: LayoutDashboard },
    { id: 'branches', label: '服务网点管理', icon: BuildingIcon },
    { id: 'providers', label: '服务商管理', icon: UserCog },
    { id: 'members', label: '会员管理', icon: User },
    { id: 'orders', label: '订单管理', icon: ShoppingCart },
    { id: 'energy', label: '收益管理', icon: Zap },
    { id: 'income', label: '收益管理', icon: TrendingUpIcon },
    { id: 'quota', label: '额度管理', icon: DatabaseIcon },
    { id: 'settings', label: '系统设置', icon: Settings2 },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold">智算中心后台</h1>
            <p className="text-gray-500 text-xs">艺元智算管理</p>
          </div>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavChange(item.id as NavItemType)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              activeNav === item.id
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-gray-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* 底部信息 */}
      <div className="p-4 border-t border-slate-800">
        <div className="text-xs text-gray-500 text-center">
          v2.0 · 双视图模式
        </div>
      </div>
    </aside>
  );
}

// 视图切换器组件
function ViewSwitcher({
  view,
  branchId,
  branches,
  onViewChange,
  onBranchChange
}: {
  view: ViewType;
  branchId: string | null;
  branches: Branch[];
  onViewChange: (view: ViewType) => void;
  onBranchChange: (branchId: string | null) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const selectedBranch = branches.find(b => b.id === branchId);

  return (
    <div className="flex items-center gap-2">
      <div className="flex bg-slate-800 rounded-lg p-1">
        <button
          onClick={() => {
            onViewChange('global');
            onBranchChange(null);
          }}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === 'global'
              ? 'bg-blue-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          全局视图
        </button>
        <button
          onClick={() => {
            onViewChange('branch');
            if (!branchId && branches.length > 0) {
              onBranchChange(branches[0].id);
            }
          }}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === 'branch'
              ? 'bg-blue-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          服务网点视图
        </button>
      </div>

      {view === 'branch' && (
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm hover:bg-slate-700"
          >
            <BuildingIcon className="w-4 h-4" />
            <span>{selectedBranch?.username || '选择服务网点'}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          
          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => {
                    onBranchChange(branch.id);
                    setShowDropdown(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-700 ${
                    branchId === branch.id ? 'text-blue-400' : 'text-white'
                  }`}
                >
                  {branch.username}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 概览页面 - 全局视图
function OverviewGlobal({
  stats,
  branches,
  providers,
  members,
  recentOrders
}: {
  stats: any;
  branches: Branch[];
  providers: Provider[];
  members: Member[];
  recentOrders: Order[];
}) {
  // 模拟趋势数据
  const trendData = [
    { month: '1月', sales: 420, members: 120 },
    { month: '2月', sales: 380, members: 135 },
    { month: '3月', sales: 510, members: 158 },
    { month: '4月', sales: 470, members: 175 },
    { month: '5月', sales: 580, members: 198 },
    { month: '6月', sales: 630, members: 220 },
  ];

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-400" />
              <span className="text-gray-400 text-sm">服务网点数量</span>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{stats?.branch_count || 0}</p>
            <p className="text-green-400 text-sm mt-1">全部活跃</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-yellow-400" />
              <span className="text-gray-400 text-sm">服务商数量</span>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{stats?.provider_count || 0}</p>
            <p className="text-blue-400 text-sm mt-1">在线运营</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <span className="text-gray-400 text-sm">会员总数</span>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{stats?.member_count || 0}</p>
            <p className="text-gray-500 text-sm mt-1">持仓中</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-green-400" />
              <span className="text-gray-400 text-sm">总收益</span>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{(stats?.total_energy || 0).toLocaleString()}</p>
            <p className="text-gray-500 text-sm mt-1">全系统</p>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">销售额趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">会员增长趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="members" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 服务网点分布 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">服务网点收益分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width={200} height={200}>
              <RechartsPie>
                <Pie
                  data={branches.map((b, i) => ({ name: b.username, value: b.balance || 1000 }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {branches.map((_, i) => (
                    <Cell key={i} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'][i % 5]} />
                  ))}
                </Pie>
              </RechartsPie>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {branches.map((branch, i) => (
                <div key={branch.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-${['blue', 'purple', 'pink', 'green', 'amber'][i % 5]}-500`} />
                    <span className="text-gray-300 text-sm">{branch.username}</span>
                  </div>
                  <span className="text-white text-sm">{(branch.balance || 1000).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 最新订单 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">最新订单</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-gray-400">订单ID</TableHead>
                <TableHead className="text-gray-400">会员</TableHead>
                <TableHead className="text-gray-400">产品</TableHead>
                <TableHead className="text-gray-400 text-right">金额</TableHead>
                <TableHead className="text-gray-400">状态</TableHead>
                <TableHead className="text-gray-400">时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.length === 0 ? (
                <TableRow className="border-slate-700/50">
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">暂无订单数据</TableCell>
                </TableRow>
              ) : (
                recentOrders.slice(0, 5).map((order) => (
                  <TableRow key={order.id} className="border-slate-700/50">
                    <TableCell className="text-white font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-white">{order.member_name}</TableCell>
                    <TableCell className="text-gray-400">{order.product_name}</TableCell>
                    <TableCell className="text-right text-white">¥{order.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={order.status === 'completed' ? 'bg-green-500/20 text-green-400 border-0' : 'bg-yellow-500/20 text-yellow-400 border-0'}>
                        {order.status === 'completed' ? '已完成' : '处理中'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm">
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// 概览页面 - 服务网点视图
function OverviewBranch({
  branch,
  providers,
  members,
  recentOrders
}: {
  branch: Branch | null;
  providers: Provider[];
  members: Member[];
  recentOrders: Order[];
}) {
  if (!branch) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        请在顶部选择要查看的服务网点
      </div>
    );
  }

  const branchProviders = providers.filter(p => p.branch_id === branch.id);
  const branchMembers = members.filter(m => m.branch_id === branch.id);
  const branchOrders = recentOrders.filter(o => o.branch_name === branch.username);

  return (
    <div className="space-y-6">
      {/* 服务网点信息 */}
      <Card className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-500/30">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <BuildingIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{branch.username}</h2>
                <p className="text-gray-400">服务网点概览</p>
              </div>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-0 px-4 py-1">
              活跃
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-yellow-400" />
              <span className="text-gray-400 text-sm">服务商数量</span>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{branchProviders.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <span className="text-gray-400 text-sm">会员数量</span>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{branchMembers.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-green-400" />
              <span className="text-gray-400 text-sm">收益余额</span>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{(branch.balance || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-400" />
              <span className="text-gray-400 text-sm">订单数</span>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{branchOrders.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* 服务商排行 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">服务商列表</CardTitle>
        </CardHeader>
        <CardContent>
          {branchProviders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无服务商</div>
          ) : (
            <div className="space-y-3">
              {branchProviders.map((provider, index) => (
                <div key={provider.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-slate-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium">{provider.username}</p>
                      <p className="text-gray-400 text-xs">收益: {provider.balance.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white">¥{provider.total_sales.toLocaleString()}</p>
                    <p className="text-gray-400 text-xs">销售额</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 会员活跃度 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">会员列表</CardTitle>
        </CardHeader>
        <CardContent>
          {branchMembers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无会员</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-gray-400">会员</TableHead>
                  <TableHead className="text-gray-400">收益</TableHead>
                  <TableHead className="text-gray-400 text-right">余额</TableHead>
                  <TableHead className="text-gray-400">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branchMembers.slice(0, 10).map((member) => (
                  <TableRow key={member.id} className="border-slate-700/50">
                    <TableCell className="text-white">{member.username}</TableCell>
                    <TableCell className="text-cyan-400">{member.balance.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-white">¥{member.balance.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-500/20 text-green-400 border-0">活跃</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 服务网点管理页面
function BranchesPage({
  view,
  branchId,
  branches,
  providers,
  members
}: {
  view: ViewType;
  branchId: string | null;
  branches: Branch[];
  providers: Provider[];
  members: Member[];
}) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBranches = branches.filter(b => 
    b.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 服务网点视图时显示选中服务网点的详情
  if (view === 'branch' && branchId) {
    const selectedBranch = branches.find(b => b.id === branchId);
    if (selectedBranch) {
      const branchProviders = providers.filter(p => p.branch_id === branchId);
      const branchMembers = members.filter(m => m.branch_id === branchId);

      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">{selectedBranch.username}</h2>
              <p className="text-gray-400">服务网点详情</p>
            </div>
          </div>

          {/* 基本信息 */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">基本信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">服务网点名称</p>
                  <p className="text-white font-medium">{selectedBranch.username}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">联系电话</p>
                  <p className="text-white">{selectedBranch.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">创建时间</p>
                  <p className="text-white">{new Date(selectedBranch.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">状态</p>
                  <Badge className="bg-green-500/20 text-green-400 border-0">活跃</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 额度信息 */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">额度信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-900/50 rounded-lg">
                  <p className="text-gray-400 text-sm">总额度</p>
                  <p className="text-2xl font-bold text-white">¥{(selectedBranch.quota || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-lg">
                  <p className="text-gray-400 text-sm">已使用</p>
                  <p className="text-2xl font-bold text-yellow-400">¥{(selectedBranch.used_quota || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-lg">
                  <p className="text-gray-400 text-sm">剩余</p>
                  <p className="text-2xl font-bold text-green-400">
                    ¥{((selectedBranch.quota || 0) - (selectedBranch.used_quota || 0)).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 服务商列表 */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">服务商列表 ({branchProviders.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-gray-400">服务商</TableHead>
                    <TableHead className="text-gray-400 text-right">额度</TableHead>
                    <TableHead className="text-gray-400 text-right">销售额</TableHead>
                    <TableHead className="text-gray-400">会员数</TableHead>
                    <TableHead className="text-gray-400">状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branchProviders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">暂无服务商</TableCell>
                    </TableRow>
                  ) : (
                    branchProviders.map((provider) => (
                      <TableRow key={provider.id} className="border-slate-700/50">
                        <TableCell className="text-white">{provider.username}</TableCell>
                        <TableCell className="text-right text-white">¥{provider.quota.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-white">¥{provider.total_sales.toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-blue-500/20 text-blue-400 border-0">{provider.member_count || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={provider.is_active ? 'bg-green-500/20 text-green-400 border-0' : 'bg-red-500/20 text-red-400 border-0'}>
                            {provider.is_active ? '活跃' : '暂停'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 会员列表 */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">会员列表 ({branchMembers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-gray-400">会员</TableHead>
                    <TableHead className="text-gray-400">收益</TableHead>
                    <TableHead className="text-gray-400 text-right">余额</TableHead>
                    <TableHead className="text-gray-400">状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branchMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500 py-8">暂无会员</TableCell>
                    </TableRow>
                  ) : (
                    branchMembers.map((member) => (
                      <TableRow key={member.id} className="border-slate-700/50">
                        <TableCell className="text-white">{member.username}</TableCell>
                        <TableCell className="text-cyan-400">{member.balance.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-white">¥{member.balance.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-500/20 text-green-400 border-0">活跃</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // 全局视图
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">服务网点管理</h2>
          <p className="text-gray-400">管理所有服务网点</p>
        </div>
        <Button className="bg-blue-500 hover:bg-blue-600" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          创建服务网点
        </Button>
      </div>

      {/* 搜索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="搜索服务网点..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-slate-800 border-slate-700 text-white"
        />
      </div>

      {/* 服务网点列表 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-gray-400">服务网点</TableHead>
                <TableHead className="text-gray-400">区域</TableHead>
                <TableHead className="text-gray-400 text-center">服务商数</TableHead>
                <TableHead className="text-gray-400 text-center">会员数</TableHead>
                <TableHead className="text-gray-400 text-right">销售额</TableHead>
                <TableHead className="text-gray-400 text-right">收益</TableHead>
                <TableHead className="text-gray-400">状态</TableHead>
                <TableHead className="text-gray-400">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBranches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">暂无服务网点数据</TableCell>
                </TableRow>
              ) : (
                filteredBranches.map((branch) => (
                  <TableRow key={branch.id} className="border-slate-700/50">
                    <TableCell className="text-white font-medium">{branch.username}</TableCell>
                    <TableCell className="text-gray-400">{branch.region || '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-purple-500/20 text-purple-400 border-0">
                        {providers.filter(p => p.branch_id === branch.id).length}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-blue-500/20 text-blue-400 border-0">
                        {members.filter(m => m.branch_id === branch.id).length}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-white">
                      ¥{(branch.total_sales || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-cyan-400">
                      {(branch.balance || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-500/20 text-green-400 border-0">活跃</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// 服务商管理页面
function ProvidersPage({
  view,
  branchId,
  branches,
  providers,
  members
}: {
  view: ViewType;
  branchId: string | null;
  branches: Branch[];
  providers: Provider[];
  members: Member[];
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState<string>('all');

  // 根据视图过滤
  let filteredProviders = view === 'branch' && branchId
    ? providers.filter(p => p.branch_id === branchId)
    : providers;

  // 应用搜索和筛选
  filteredProviders = filteredProviders.filter(p => {
    const matchesSearch = p.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = filterBranch === 'all' || p.branch_id === filterBranch;
    return matchesSearch && matchesBranch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">服务商管理</h2>
          <p className="text-gray-400">
            {view === 'global' ? '管理所有服务商' : `管理 ${branches.find(b => b.id === branchId)?.username} 下的服务商`}
          </p>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索服务商..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white"
          />
        </div>
        {view === 'global' && (
          <Select value={filterBranch} onValueChange={setFilterBranch}>
            <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="筛选服务网点" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">所有服务网点</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>{branch.username}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* 服务商列表 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-gray-400">服务商</TableHead>
                <TableHead className="text-gray-400">所属服务网点</TableHead>
                <TableHead className="text-gray-400 text-right">额度</TableHead>
                <TableHead className="text-gray-400 text-right">已用额度</TableHead>
                <TableHead className="text-gray-400 text-right">销售额</TableHead>
                <TableHead className="text-gray-400 text-center">会员数</TableHead>
                <TableHead className="text-gray-400">收益</TableHead>
                <TableHead className="text-gray-400">状态</TableHead>
                <TableHead className="text-gray-400">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProviders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8">暂无服务商数据</TableCell>
                </TableRow>
              ) : (
                filteredProviders.map((provider) => {
                  const branch = branches.find(b => b.id === provider.branch_id);
                  const providerMembers = members.filter(m => m.provider_id === provider.user_id);
                  return (
                    <TableRow key={provider.id} className="border-slate-700/50">
                      <TableCell className="text-white font-medium">{provider.username}</TableCell>
                      <TableCell>
                        <Badge className="bg-purple-500/20 text-purple-400 border-0">
                          {branch?.username || '未分配'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-white">
                        ¥{provider.quota.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-yellow-400">
                        ¥{provider.used_quota.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-green-400">
                        ¥{provider.total_sales.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-blue-500/20 text-blue-400 border-0">
                          {providerMembers.length}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-cyan-400">
                        {provider.balance.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={provider.is_active ? 'bg-green-500/20 text-green-400 border-0' : 'bg-red-500/20 text-red-400 border-0'}>
                          {provider.is_active ? '活跃' : '暂停'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// 会员管理页面
function MembersPage({
  view,
  branchId,
  branches,
  providers,
  members
}: {
  view: ViewType;
  branchId: string | null;
  branches: Branch[];
  providers: Provider[];
  members: Member[];
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterProvider, setFilterProvider] = useState<string>('all');

  // 根据视图过滤
  let filteredMembers = view === 'branch' && branchId
    ? members.filter(m => m.branch_id === branchId)
    : members;

  // 应用搜索和筛选
  filteredMembers = filteredMembers.filter(m => {
    const matchesSearch = m.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = filterBranch === 'all' || m.branch_id === filterBranch;
    const matchesProvider = filterProvider === 'all' || m.provider_id === filterProvider;
    return matchesSearch && matchesBranch && matchesProvider;
  });

  // 获取当前视图下的服务商
  const availableProviders = view === 'branch' && branchId
    ? providers.filter(p => p.branch_id === branchId)
    : providers;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">会员管理</h2>
          <p className="text-gray-400">
            {view === 'global' ? '管理所有会员' : `管理 ${branches.find(b => b.id === branchId)?.username} 下的会员`}
          </p>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索会员..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white"
          />
        </div>
        {view === 'global' && (
          <>
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="筛选服务网点" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">所有服务网点</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>{branch.username}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterProvider} onValueChange={setFilterProvider}>
              <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="筛选服务商" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">所有服务商</SelectItem>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.user_id}>{provider.username}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* 会员列表 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-gray-400">会员</TableHead>
                <TableHead className="text-gray-400">所属服务商</TableHead>
                <TableHead className="text-gray-400">所属服务网点</TableHead>
                <TableHead className="text-gray-400">收益</TableHead>
                <TableHead className="text-gray-400 text-right">余额</TableHead>
                <TableHead className="text-gray-400 text-right">积分</TableHead>
                <TableHead className="text-gray-400">状态</TableHead>
                <TableHead className="text-gray-400">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">暂无会员数据</TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => {
                  const provider = providers.find(p => p.user_id === member.provider_id);
                  const branch = provider ? branches.find(b => b.id === provider.branch_id) : null;
                  return (
                    <TableRow key={member.id} className="border-slate-700/50">
                      <TableCell className="text-white font-medium">{member.username}</TableCell>
                      <TableCell>
                        <Badge className="bg-blue-500/20 text-blue-400 border-0">
                          {provider?.username || '未分配'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-purple-500/20 text-purple-400 border-0">
                          {branch?.username || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-cyan-400">
                        {member.balance.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-white">
                        ¥{member.balance.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-yellow-400">
                        {member.points.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={member.is_active ? 'bg-green-500/20 text-green-400 border-0' : 'bg-red-500/20 text-red-400 border-0'}>
                          {member.is_active ? '活跃' : '暂停'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// 订单管理页面
function OrdersPage({
  view,
  branchId,
  branches,
  orders
}: {
  view: ViewType;
  branchId: string | null;
  branches: Branch[];
  orders: Order[];
}) {
  const [activeTab, setActiveTab] = useState<OrderType>('products');

  // 根据视图过滤
  const filteredOrders = view === 'branch' && branchId
    ? orders.filter(o => o.branch_name === branches.find(b => b.id === branchId)?.username)
    : orders;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">订单管理</h2>
        <p className="text-gray-400">
          {view === 'global' ? '管理所有订单' : `管理 ${branches.find(b => b.id === branchId)?.username} 下的订单`}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as OrderType)}>
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="products" className="data-[state=active]:bg-blue-500">产品订单</TabsTrigger>
          <TabsTrigger value="transfers" className="data-[state=active]:bg-blue-500">流转订单</TabsTrigger>
          <TabsTrigger value="repurchases" className="data-[state=active]:bg-blue-500">回购订单</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-gray-400">订单ID</TableHead>
                    <TableHead className="text-gray-400">会员</TableHead>
                    <TableHead className="text-gray-400">所属服务网点</TableHead>
                    <TableHead className="text-gray-400">产品</TableHead>
                    <TableHead className="text-gray-400 text-right">金额</TableHead>
                    <TableHead className="text-gray-400">状态</TableHead>
                    <TableHead className="text-gray-400">时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">暂无订单数据</TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id} className="border-slate-700/50">
                        <TableCell className="text-white font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
                        <TableCell className="text-white">{order.member_name}</TableCell>
                        <TableCell className="text-gray-400">{order.branch_name || '-'}</TableCell>
                        <TableCell className="text-gray-400">{order.product_name}</TableCell>
                        <TableCell className="text-right text-white">¥{order.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={order.status === 'completed' ? 'bg-green-500/20 text-green-400 border-0' : 'bg-yellow-500/20 text-yellow-400 border-0'}>
                            {order.status === 'completed' ? '已完成' : '处理中'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-400 text-sm">
                          {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers" className="mt-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-8 text-center text-gray-500">
              暂无流转订单数据
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repurchases" className="mt-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-8 text-center text-gray-500">
              暂无回购订单数据
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 收益管理页面
function EnergyPage({
  view,
  branchId,
  branches,
  providers,
  members
}: {
  view: ViewType;
  branchId: string | null;
  branches: Branch[];
  providers: Provider[];
  members: Member[];
}) {
  // 计算收益分布
  const totalBalance = branches.reduce((sum, b) => sum + (b.balance || 0), 0) +
    providers.reduce((sum, p) => sum + p.balance, 0) +
    members.reduce((sum, m) => sum + m.balance, 0);

  const distributionData = branches.map((branch, i) => ({
    name: branch.username,
    value: branch.balance || 0,
    color: ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'][i % 5]
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">收益管理</h2>
        <p className="text-gray-400">收益统计与分布</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <p className="text-gray-400 text-sm">系统总收益</p>
            <p className="text-2xl font-bold text-white mt-2">{totalBalance.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <p className="text-gray-400 text-sm">服务网点收益</p>
            <p className="text-2xl font-bold text-purple-400 mt-2">
              {branches.reduce((sum, b) => sum + (b.balance || 0), 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <p className="text-gray-400 text-sm">服务商收益</p>
            <p className="text-2xl font-bold text-yellow-400 mt-2">
              {providers.reduce((sum, p) => sum + p.balance, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <p className="text-gray-400 text-sm">会员收益</p>
            <p className="text-2xl font-bold text-cyan-400 mt-2">
              {members.reduce((sum, m) => sum + m.balance, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 分布图表 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">收益分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width={250} height={250}>
              <RechartsPie>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </RechartsPie>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {distributionData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-300">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-medium">{item.value.toLocaleString()}</span>
                    <span className="text-gray-500 text-sm ml-2">
                      ({totalBalance > 0 ? ((item.value / totalBalance) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 服务网点详情 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">服务网点收益详情</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-gray-400">服务网点</TableHead>
                <TableHead className="text-gray-400 text-right">收益</TableHead>
                <TableHead className="text-gray-400 text-right">占比</TableHead>
                <TableHead className="text-gray-400">服务商数</TableHead>
                <TableHead className="text-gray-400">会员数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch, i) => {
                const branchProviders = providers.filter(p => p.branch_id === branch.id);
                const branchMembers = members.filter(m => m.branch_id === branch.id);
                return (
                  <TableRow key={branch.id} className="border-slate-700/50">
                    <TableCell className="text-white font-medium">{branch.username}</TableCell>
                    <TableCell className="text-right text-cyan-400">
                      {(branch.balance || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-gray-400">
                      {totalBalance > 0 ? ((branch.balance / totalBalance) * 100).toFixed(1) : 0}%
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-purple-500/20 text-purple-400 border-0">{branchProviders.length}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-blue-500/20 text-blue-400 border-0">{branchMembers.length}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// 收益管理页面
function IncomePage({
  view,
  branchId,
  branches,
  stats
}: {
  view: ViewType;
  branchId: string | null;
  branches: Branch[];
  stats: any;
}) {
  const totalIncome = stats?.total_member_balance || 0;
  const selectedBranch = branches.find(b => b.id === branchId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">收益管理</h2>
        <p className="text-gray-400">
          {view === 'global' ? '全系统收益统计' : `${selectedBranch?.username} 收益统计`}
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <p className="text-gray-400 text-sm">总收益</p>
            <p className="text-2xl font-bold text-white mt-2">¥{totalIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <p className="text-gray-400 text-sm">会员余额</p>
            <p className="text-2xl font-bold text-green-400 mt-2">
              ¥{(stats?.member_balance || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <p className="text-gray-400 text-sm">待提现</p>
            <p className="text-2xl font-bold text-yellow-400 mt-2">
              ¥{(stats?.pending_withdrawal_count || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 收益分布 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">收益分布</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-gray-400">来源</TableHead>
                <TableHead className="text-gray-400 text-right">金额</TableHead>
                <TableHead className="text-gray-400 text-right">占比</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-slate-700/50">
                <TableCell className="text-white">会员投资</TableCell>
                <TableCell className="text-right text-white">¥{(stats?.member_balance || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right text-gray-400">100%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// 额度管理页面
function QuotaPage({
  view,
  branchId,
  branches,
  providers
}: {
  view: ViewType;
  branchId: string | null;
  branches: Branch[];
  providers: Provider[];
}) {
  const [allocateDialog, setAllocateDialog] = useState(false);
  const [allocateAmount, setAllocateAmount] = useState('');
  const [allocateBranchId, setAllocateBranchId] = useState<string>('');
  const [isAllocating, setIsAllocating] = useState(false);

  const totalQuota = branches.reduce((sum, b) => sum + (b.quota || 0), 0);
  const usedQuota = branches.reduce((sum, b) => sum + (b.used_quota || 0), 0);
  const availableQuota = totalQuota - usedQuota;

  const handleAllocate = async () => {
    if (!allocateBranchId || !allocateAmount) {
      alert('请选择服务网点并输入分配额度');
      return;
    }

    setIsAllocating(true);
    try {
      const res = await fetch('/api/admin/allocate-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: '00000000-0000-0000-0000-000000000001',
          branchId: allocateBranchId,
          amount: parseFloat(allocateAmount),
          note: '额度分配'
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`分配成功！已分配 ${parseFloat(allocateAmount).toLocaleString()} 元，赠送 ${data.data.bonus_energy.toLocaleString()} 收益`);
        setAllocateDialog(false);
        setAllocateBranchId('');
        setAllocateAmount('');
        // 刷新数据
        window.location.reload();
      } else {
        alert(data.error || '分配失败');
      }
    } catch (error) {
      alert('分配失败，请重试');
    } finally {
      setIsAllocating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">额度管理</h2>
          <p className="text-gray-400">系统额度分配与统计</p>
        </div>
        <Button className="bg-blue-500 hover:bg-blue-600" onClick={() => setAllocateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          分配额度
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <p className="text-gray-400 text-sm">总额度</p>
            <p className="text-2xl font-bold text-white mt-2">¥{totalQuota.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <p className="text-gray-400 text-sm">已分配</p>
            <p className="text-2xl font-bold text-yellow-400 mt-2">¥{usedQuota.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <p className="text-gray-400 text-sm">剩余可用</p>
            <p className="text-2xl font-bold text-green-400 mt-2">¥{availableQuota.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* 额度分布 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">服务网点额度分配</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-gray-400">服务网点</TableHead>
                <TableHead className="text-gray-400 text-right">分配额度</TableHead>
                <TableHead className="text-gray-400 text-right">已用额度</TableHead>
                <TableHead className="text-gray-400 text-right">剩余额度</TableHead>
                <TableHead className="text-gray-400">使用率</TableHead>
                <TableHead className="text-gray-400">服务商数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => {
                const branchProviders = providers.filter(p => p.branch_id === branch.id);
                const branchQuota = branch.quota || 0;
                const branchUsed = branch.used_quota || 0;
                const usageRate = branchQuota > 0 ? (branchUsed / branchQuota) * 100 : 0;
                return (
                  <TableRow key={branch.id} className="border-slate-700/50">
                    <TableCell className="text-white font-medium">{branch.username}</TableCell>
                    <TableCell className="text-right text-white">¥{branchQuota.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-yellow-400">¥{branchUsed.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-green-400">¥{(branchQuota - branchUsed).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500" 
                            style={{ width: `${Math.min(usageRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-gray-400 text-sm">{usageRate.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-purple-500/20 text-purple-400 border-0">{branchProviders.length}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 分配对话框 */}
      <Dialog open={allocateDialog} onOpenChange={setAllocateDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">分配额度</DialogTitle>
            <DialogDescription className="text-gray-400">
              选择服务网点并分配额度，分配时自动赠送30%收益
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-gray-400 text-sm">选择服务网点</label>
              <Select value={allocateBranchId} onValueChange={setAllocateBranchId}>
                <SelectTrigger className="mt-1 bg-slate-900 border-slate-700 text-white">
                  <SelectValue placeholder="请选择服务网点" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-gray-400 text-sm">分配额度</label>
              <Input
                type="number"
                value={allocateAmount}
                onChange={(e) => setAllocateAmount(e.target.value)}
                placeholder="请输入额度"
                className="mt-1 bg-slate-900 border-slate-700 text-white"
              />
              <p className="text-blue-400 text-sm mt-2">
                将赠送 {(parseFloat(allocateAmount || '0') * 0.2).toLocaleString()} 收益（20%）
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAllocateDialog(false)} className="text-gray-400">
              取消
            </Button>
            <Button 
              className="bg-blue-500 hover:bg-blue-600" 
              onClick={handleAllocate}
              disabled={isAllocating || !allocateBranchId || !allocateAmount}
            >
              {isAllocating ? '分配中...' : '确认分配'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 系统设置页面
function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">系统设置</h2>
        <p className="text-gray-400">系统参数配置</p>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">收益配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
            <div>
              <p className="text-white">3天产品总收益</p>
              <p className="text-gray-400 text-sm">会员投资3天期产品的总收益率</p>
            </div>
            <div className="flex items-center gap-2">
              <Input className="w-24 bg-slate-900 border-slate-700 text-white text-right" defaultValue="5" />
              <span className="text-gray-400">%</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
            <div>
              <p className="text-white">服务商分成比例</p>
              <p className="text-gray-400 text-sm">会员卖出时服务商获得的收益比例</p>
            </div>
            <div className="flex items-center gap-2">
              <Input className="w-24 bg-slate-900 border-slate-700 text-white text-right" defaultValue="2" />
              <span className="text-gray-400">%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">额度配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
            <div>
              <p className="text-white">额度赠送比例</p>
              <p className="text-gray-400 text-sm">智算中心分配额度时的收益赠送比例</p>
            </div>
            <div className="flex items-center gap-2">
              <Input className="w-24 bg-slate-900 border-slate-700 text-white text-right" defaultValue="30" />
              <span className="text-gray-400">%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button className="bg-blue-500 hover:bg-blue-600">
        保存配置
      </Button>
    </div>
  );
}

// 主页面组件
export default function PlatformAdminPage() {
  const [activeNav, setActiveNav] = useState<NavItemType>('overview');
  const [view, setView] = useState<ViewType>('global');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  
  // 数据状态
  const [branches, setBranches] = useState<Branch[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<any>({});

  const { user, loading, logout } = useAuth('platform');

  // 获取数据
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`/api/admin/overview?adminId=${user.id}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          setBranches(result.data.branches || []);
          setProviders(result.data.providers || []);
          setMembers(result.data.members || []);
          setOrders(result.data.activities?.map((a: any) => ({
            id: a.id,
            order_type: a.activity_type,
            member_name: a.username || '未知',
            member_id: a.user_id,
            branch_name: result.data.branches.find((b: any) => 
              result.data.providers.some((p: any) => p.branch_id === b.id && p.user_id === a.user_id)
            )?.username,
            provider_name: result.data.providers.find((p: any) => p.user_id === a.user_id)?.username,
            product_name: a.details?.product_name || '产品',
            product_price: a.details?.price || 0,
            amount: a.details?.amount || 0,
            status: a.status === 'completed' ? 'completed' : 'pending',
            created_at: a.created_at,
          })) || []);
          setStats(result.data.stats || {});
        }
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        setDataLoading(false);
      }
    };

    if (!loading && user?.id) {
      fetchData();
    }
  }, [loading, user]);

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  const selectedBranch = branches.find(b => b.id === selectedBranchId);

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* 侧边导航 */}
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部栏 */}
        <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* 视图切换器 */}
            <ViewSwitcher
              view={view}
              branchId={selectedBranchId}
              branches={branches}
              onViewChange={setView}
              onBranchChange={setSelectedBranchId}
            />
            
            {/* 右侧信息 */}
            <div className="flex items-center gap-4">
              <NotificationCenter />
              <Badge variant="outline" className="border-blue-500 text-blue-400">
                {user?.name || '管理员'}
              </Badge>
              <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                退出
              </Button>
            </div>
          </div>
        </header>

        {/* 内容区域 */}
        <main className="flex-1 p-6 overflow-auto">
          {activeNav === 'overview' && (
            view === 'global' ? (
              <OverviewGlobal
                stats={stats}
                branches={branches}
                providers={providers}
                members={members}
                recentOrders={orders}
              />
            ) : (
              <OverviewBranch
                branch={selectedBranch || null}
                providers={providers}
                members={members}
                recentOrders={orders}
              />
            )
          )}
          {activeNav === 'branches' && (
            <BranchesPage
              view={view}
              branchId={selectedBranchId}
              branches={branches}
              providers={providers}
              members={members}
            />
          )}
          {activeNav === 'providers' && (
            <ProvidersPage
              view={view}
              branchId={selectedBranchId}
              branches={branches}
              providers={providers}
              members={members}
            />
          )}
          {activeNav === 'members' && (
            <MembersPage
              view={view}
              branchId={selectedBranchId}
              branches={branches}
              providers={providers}
              members={members}
            />
          )}
          {activeNav === 'orders' && (
            <OrdersPage
              view={view}
              branchId={selectedBranchId}
              branches={branches}
              orders={orders}
            />
          )}
          {activeNav === 'energy' && (
            <EnergyPage
              view={view}
              branchId={selectedBranchId}
              branches={branches}
              providers={providers}
              members={members}
            />
          )}
          {activeNav === 'income' && (
            <IncomePage
              view={view}
              branchId={selectedBranchId}
              branches={branches}
              stats={stats}
            />
          )}
          {activeNav === 'quota' && (
            <QuotaPage
              view={view}
              branchId={selectedBranchId}
              branches={branches}
              providers={providers}
            />
          )}
          {activeNav === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}
