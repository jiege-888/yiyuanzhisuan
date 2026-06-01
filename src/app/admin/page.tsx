'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { ProviderManagement } from '@/components/admin/ProviderManagement';
import { MyProfile } from '@/components/admin/MyProfile';
import { 
  LayoutDashboard, 
  Database, 
  Building2, 
  UserCog, 
  Users, 
  Package, 
  Zap, 
  TrendingUp, 
  Wallet, 
  Settings,
  Loader2,
  Shield,
  ChevronUp,
  ChevronDown,
  ClipboardList,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  RefreshCw,
  Download,
  Eye,
  Edit,
  DollarSign,
	  Percent,
  Printer,
  Home,
  Plus,
  X,
  ShoppingCart,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  MessageSquare,
  Trash2,
  Clock,
  AlertTriangle,
  User,
  Key,
  FileCheck,
  Cpu,
  Search,
  Ticket,
  Network,
  Briefcase,
  UserCheck,
  Trophy,
  Activity,
  Coins,
  ArrowRight,
  LayoutGrid,
  Gift,
  Receipt,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

// 菜单类型
type MenuItem = {
  id: string;
  name: string;
  icon: React.ReactNode;
  children?: { id: string; name: string }[];
};

// 导航菜单配置
const menuItems: MenuItem[] = [
  { id: 'dashboard', name: '数据总览', icon: <BarChart3 className="w-5 h-5" /> },
  { id: 'my-profile', name: '我的', icon: <User className="w-5 h-5" /> },
  { id: 'release', name: '收益记录', icon: <TrendingUp className="w-5 h-5" /> },
  { id: 'quota', name: 'Token额度管理', icon: <Database className="w-5 h-5" /> },
  { id: 'withdraw', name: '提现审核', icon: <Wallet className="w-5 h-5" /> },
  { id: 'accounts', name: '账户管理', icon: <Users className="w-5 h-5" /> },
  { id: 'templates', name: '模板管理', icon: <LayoutGrid className="w-5 h-5" /> },
  { id: 'pointsShop', name: '积分兑换管理', icon: <Gift className="w-5 h-5" /> },
  { id: 'capitalFlow', name: '资金流水', icon: <ArrowRightLeft className="w-5 h-5" /> },
];

// 统计数据类型
interface Stats {
  branch_count: number;
  provider_count: number;
  member_count: number;
  total_balance: number;
  total_member_balance: number;
  pending_sell_count: number;
  pending_withdrawal_count: number;
  total_orders: number;
  total_revenue: number;
  today_orders: number;
  today_revenue: number;
}

// 会员类型
interface Member {
  id: string;
  username: string;
  phone?: string;
  real_name?: string;
  
  balance: number;
  is_active: boolean;
  created_at: string;
  provider_id?: string;
  inviter_id?: string;
}

// 订单类型
interface Order {
  id: string;
  user_id: string;
  username: string;
  product_name: string;
  order_type: string;
  amount: number;
  status: string;
  created_at: string;
}

// 提现记录
interface Withdrawal {
  id: string;
  user_id: string;
  username: string;
  amount: number;
  alipay_account: string;
  status: string;
  created_at: string;
}

// 服务商
interface Provider {
  id: string;
  username: string;
  quota: number;
  used_quota: number;
  total_sales: number;
  member_count: number;
  status: string;
  created_at: string;
}

// 算力模板
interface ProductTemplate {
  id: string;
  name: string;
  code: string;
  period: number;
  total_rate: number;
  market_rate: number;
  profit_rate: number;
  status: string;
}

export default function AdminPage() {
  const { user, loading: authLoading, logout } = useAuth('admin');

  // 移动端侧边栏状态
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 算力额度管理子Tab
  const [quotaSubTab, setQuotaSubTab] = useState<'overview' | 'templates' | 'records' | 'requests'>('overview');

  // 菜单状态
  const [activeMenu, setActiveMenu] = useState('overview');
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['orders', 'reports']);
  
  // 数据状态
  const [stats, setStats] = useState<Stats>({
    branch_count: 0,
    provider_count: 0,
    member_count: 0,
    total_balance: 0,
    total_member_balance: 0,
    pending_sell_count: 0,
    pending_withdrawal_count: 0,
    total_orders: 0,
    total_revenue: 0,
    today_orders: 0,
    today_revenue: 0,
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [quotaRequests, setQuotaRequests] = useState<any[]>([]);
  const [adminData, setAdminData] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchWithdrawals, setBranchWithdrawals] = useState<any[]>([]);
  
  // 数据总览子 Tab 状态
  const [overviewTab, setOverviewTab] = useState<'product' | 'user' | 'energy'>('product');
  const [overviewData, setOverviewData] = useState<any>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  
  // 算力额度管理子 Tab 状态
  const [quotaAccounts, setQuotaAccounts] = useState<any[]>([]);
  const [quotaRecords, setQuotaRecords] = useState<any[]>([]);
  const [quotaStats, setQuotaStats] = useState({ totalIssued: 0, totalIdle: 0, totalUsed: 0 });

  // 释放收益记录相关state
  const [releaseRecords, setReleaseRecords] = useState<any[]>([]);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [releaseDateRange, setReleaseDateRange] = useState<{start: string; end: string}>({start: '', end: ''});
  const [releaseStats, setReleaseStats] = useState<any>(null);

  // 手续费沉淀记录相关state
  const [feeRecords, setFeeRecords] = useState<any[]>([]);
  const [feeRecordsLoading, setFeeRecordsLoading] = useState(false);
  const [feeStats, setFeeStats] = useState<any>(null);

  // 账户管理相关state
  const [accountsData, setAccountsData] = useState<any>(null);
  const [accountsStats, setAccountsStats] = useState<any>(null);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [expandedProviderId, setExpandedProviderId] = useState<string | null>(null);
  const [providerMembers, setProviderMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [financialData, setFinancialData] = useState<any>(null);
  const [financialReport, setFinancialReport] = useState<any>(null);
  const [financialLoading, setFinancialLoading] = useState(false);
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('');

  // 人员账户Tab
  const [accountsTab, setAccountsTab] = useState('list');
  const [accountSearch, setAccountSearch] = useState('');
  const [roleChangeUser, setRoleChangeUser] = useState<{id: string; username: string; role: string} | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState('');

  // 账户列表转智算金
  const [acctTransferUser, setAcctTransferUser] = useState<any>(null);
  const [acctTransferAmount, setAcctTransferAmount] = useState('');
  const [acctTransferNote, setAcctTransferNote] = useState('');
  const [acctTransferring, setAcctTransferring] = useState(false);
  const [acctTransferDialogOpen, setAcctTransferDialogOpen] = useState(false);

  // 账户列表清除数据
  const [clearDataUser, setClearDataUser] = useState<any>(null);
  const [clearDataType, setClearDataType] = useState<'quota' | 'balance'>('quota');
  const [clearDataConfirm, setClearDataConfirm] = useState('');
  const [clearDataDialogOpen, setClearDataDialogOpen] = useState(false);
  const [acctClearLoading, setAcctClearLoading] = useState(false);

  // 账户编辑弹窗
  const [acctEditUser, setAcctEditUser] = useState<any>(null);
  const [acctEditDialogOpen, setAcctEditDialogOpen] = useState(false);

  // 数据总览 dashboard state
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  
  // 算力额度对话框状态
  const [showCreateQuotaDialog, setShowCreateQuotaDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createQuotaAmount, setCreateQuotaAmount] = useState('');
  const [createQuotaNote, setCreateQuotaNote] = useState('');
  const [createEnergyAmount, setCreateEnergyAmount] = useState('');
  const [createEnergyNote, setCreateEnergyNote] = useState('');
  const [transferTo, setTransferTo] = useState('');
  
  // 市场费分配子 Tab 状态
  const [incomeTab, setIncomeTab] = useState<'overview' | 'detail' | 'withdraw' | 'provider' | 'member' | 'branch'>('overview');
  const [incomeStats, setIncomeStats] = useState<any>({
    totalIncome: 0,
    todayIncome: 0,
    pendingSettlement: 0,
    distributed: 0,
    totalOrders: 0,
    todayOrders: 0,
    totalSales: 0,
    todaySales: 0,
  });
  const [shareBreakdown, setShareBreakdown] = useState<any>({
    member: { amount: 0, rate: '2%' },
    provider: { amount: 0, rate: '2%' },
    directReward: { amount: 0, rate: '0.25%' },
    parentProvider: { amount: 0, rate: '0.25%' },
    branch: { amount: 0, rate: '0.1%' },
    company: { amount: 0, rate: '0.4%' },
  });
  const [incomeRecords, setIncomeRecords] = useState<any[]>([]);
  const [providerIncome, setProviderIncome] = useState<any[]>([]);
  const [memberIncome, setMemberIncome] = useState<any[]>([]);
  const [branchIncome, setBranchIncome] = useState<any[]>([]);
  const [incomeLoading, setIncomeLoading] = useState(false);
  const [incomeTypeFilter, setIncomeTypeFilter] = useState('all');
  const [withdrawStats, setWithdrawStats] = useState<any>({
    pendingCount: 0, pendingAmount: 0, approvedAmount: 0, actualPaid: 0, todayAmount: 0, totalRequests: 0,
  });
  const [withdrawList, setWithdrawList] = useState<any[]>([]);

  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  
  // 资金流水统计state
  const [capitalFlowData, setCapitalFlowData] = useState<any>(null);
  const [capitalFlowLoading, setCapitalFlowLoading] = useState(false);
  const [capitalFlowTab, setCapitalFlowTab] = useState('all');
  const [capitalFlowPage, setCapitalFlowPage] = useState(1);

  // 搜索和筛选
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // 对话框状态
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    code: '',
    period: '7',
    total_rate: '10',
    market_rate: '5',
    profit_rate: '5',
    min_quota: 0,
  });
  
  // 消息提示
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 模板管理相关状态
  const [templateList, setTemplateList] = useState<any[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);

  // 积分商城相关状态
  const [pointsProducts, setPointsProducts] = useState<any[]>([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', image_url: '', points_price: 0 });
  const [exchangeOrders, setExchangeOrders] = useState<any[]>([]);
  const [showOrdersDialog, setShowOrdersDialog] = useState(false);

  // 会员管理相关状态
  const [memberTab, setMemberTab] = useState<'upgrade' | 'energy' | 'stats' | 'users'>('upgrade');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [memberStats, setMemberStats] = useState<any>(null);
  const [memberStatsLoading, setMemberStatsLoading] = useState(false);
  const [showEnergyAdjustDialog, setShowEnergyAdjustDialog] = useState(false);
  const [showEnergyRecordDialog, setShowEnergyRecordDialog] = useState(false);
  const [energyAdjustTarget, setEnergyAdjustTarget] = useState<any>(null);
  const [energyAdjustAmount, setEnergyAdjustAmount] = useState('');
  const [energyAdjustNote, setEnergyAdjustNote] = useState('');
  const [energyAdjustType, setEnergyAdjustType] = useState<'add' | 'deduct'>('add');
  const [energyRecordList, setEnergyRecordList] = useState<any[]>([]);
  const [energyRecordLoading, setEnergyRecordLoading] = useState(false);

  // 提现管理相关状态（提升到顶层避免 Hooks 规则违反）
  const [withdrawTab, setWithdrawTab] = useState<'deposit' | 'records'>('deposit');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [withdrawNote, setWithdrawNote] = useState('');

  // 市场费分配相关状态
  const [energyTab, setEnergyTab] = useState<'overview' | 'accounts' | 'transactions' | 'request' | 'withdraw'>('overview');
  const [energyData, setEnergyData] = useState<any>(null);
  const [energyAccounts, setEnergyAccounts] = useState<any[]>([]);
  const [energyTransactions, setEnergyTransactions] = useState<any[]>([]);
  const [energyLoading, setEnergyLoading] = useState(false);
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [releaseForm, setReleaseForm] = useState({ toUserId: '', amount: '', note: '' });
  const [energyTransactionType, setEnergyTransactionType] = useState<string>('all');
  const [branchEnergyRequests, setBranchEnergyRequests] = useState<any[]>([]);
  const [branchEnergyPendingCount, setBranchEnergyPendingCount] = useState(0);

  // 统一认证 fetch
  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(url, { ...options, headers, cache: 'no-store' });
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userData');
      window.location.href = '/';
    }
    return response;
  };

  // 系统配置类型
  type SystemConfig = Record<string, string>;

  // 系统配置 state
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({});
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [systemSubTab, setSystemSubTab] = useState<'config' | 'data' | 'assign-role' | 'invite-code' | 'force-release'>('config');
  
  // 数据清除 state
  const [clearDataPassword, setClearDataPassword] = useState('');
  const [clearDataLoading, setClearDataLoading] = useState(false);
  const [clearDataMessage, setClearDataMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // 账号赋权 state
  const [assignSearchKeyword, setAssignSearchKeyword] = useState('');
  const [assignSearchResults, setAssignSearchResults] = useState<any[]>([]);
  const [assignSearching, setAssignSearching] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignMessage, setAssignMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // 智算中心邀请码 state
  const [adminInviteCode, setAdminInviteCode] = useState('');
  const [forceReleaseLoading, setForceReleaseLoading] = useState(false);
  const [forceReleaseResult, setForceReleaseResult] = useState<any>(null);
  const [inviteCodeLoading, setInviteCodeLoading] = useState(false);
  const [inviteCodeMessage, setInviteCodeMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // 加载系统配置
  const loadSystemConfig = useCallback(async () => {
    const token = localStorage.getItem('token');
    setConfigLoading(true);
    try {
      const res = await fetch('/api/admin/system-config', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSystemConfig(data.data || {});
      }
    } catch (error) {
      console.error('加载系统配置失败:', error);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  // 保存配置
  const saveSystemConfig = useCallback(async () => {
    const token = localStorage.getItem('token');
    setConfigSaving(true);
    try {
      const res = await fetch('/api/admin/system-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ config: systemConfig })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: '配置保存成功' });
      } else {
        setMessage({ type: 'error', text: data.error || '保存失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '保存失败' });
    } finally {
      setConfigSaving(false);
    }
  }, [systemConfig]);

  // 配置变更处理
  const handleConfigChange = (key: string, value: string) => {
    setSystemConfig(prev => ({ ...prev, [key]: value }));
  };

  // 搜索用户（账号赋权用）
  const searchUsersForAssign = useCallback(async () => {
    if (!assignSearchKeyword || assignSearchKeyword.length < 2) return;
    setAssignSearching(true);
    setAssignMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/assign-role?keyword=${encodeURIComponent(assignSearchKeyword)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAssignSearchResults(data.data || []);
        if (data.data.length === 0) {
          setAssignMessage({ type: 'error', text: '未找到匹配的用户' });
        }
      } else {
        setAssignMessage({ type: 'error', text: data.error || '搜索失败' });
      }
    } catch (e) {
      setAssignMessage({ type: 'error', text: '搜索失败，请重试' });
    } finally {
      setAssignSearching(false);
    }
  }, [assignSearchKeyword]);

  // 赋权操作
  const handleAssignRole = useCallback(async (userId: string, targetRole: string, username: string) => {
    setAssignLoading(true);
    setAssignMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/assign-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId, targetRole, adminId: user?.id })
      });
      const data = await res.json();
      if (data.success) {
        const roleLabels: Record<string, string> = { admin: '智算中心', branch: '服务网点', provider: '服务商', member: '会员' };
        setAssignMessage({ type: 'success', text: `已将用户 ${username} 角色变更为${roleLabels[targetRole]}` });
        // 刷新搜索结果
        searchUsersForAssign();
      } else {
        setAssignMessage({ type: 'error', text: data.error || '赋权失败' });
      }
    } catch (e) {
      setAssignMessage({ type: 'error', text: '赋权失败，请重试' });
    } finally {
      setAssignLoading(false);
    }
  }, [user, searchUsersForAssign]);

  // 加载/生成智算中心邀请码
  const loadAdminInviteCode = useCallback(async () => {
    setInviteCodeLoading(true);
    setInviteCodeMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/invite-codes/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAdminInviteCode(data.data.invite_code);
      } else {
        setInviteCodeMessage({ type: 'error', text: data.error || '获取邀请码失败' });
      }
    } catch (e) {
      setInviteCodeMessage({ type: 'error', text: '获取邀请码失败' });
    } finally {
      setInviteCodeLoading(false);
    }
  }, []);

  // 强制释放到期收益
  const handleForceRelease = useCallback(async () => {
    if (!confirm('确定要强制释放所有到期未释放的产品收益吗？此操作会将到期产品的收益分配给会员。')) return;
    setForceReleaseLoading(true);
    setForceReleaseResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/force-release', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      setForceReleaseResult(data);
    } catch (e) {
      setForceReleaseResult({ success: false, message: '请求失败' });
    } finally {
      setForceReleaseLoading(false);
    }
  }, []);

  // 清除收益数据
  const handleClearEnergyData = async () => {
    if (clearDataPassword !== 'admin123') {
      setClearDataMessage({ type: 'error', text: '密码错误，请重试！' });
      return;
    }
    
    if (!confirm('确定要清除所有收益数据吗？此操作不可恢复！')) {
      return;
    }
    
    setClearDataLoading(true);
    setClearDataMessage(null);
    
    try {
      const res = await authFetch('/api/admin/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'energy', password: clearDataPassword })
      });
      const data = await res.json();
      
      if (data.success) {
        setClearDataMessage({ type: 'success', text: '收益数据已清除！' });
        setClearDataPassword('');
      } else {
        setClearDataMessage({ type: 'error', text: data.error || '操作失败' });
      }
    } catch (error) {
      setClearDataMessage({ type: 'error', text: '网络错误，请重试' });
    } finally {
      setClearDataLoading(false);
    }
  };

  // 清除算力额度数据
  const handleClearQuotaData = async () => {
    if (clearDataPassword !== 'admin123') {
      setClearDataMessage({ type: 'error', text: '密码错误，请重试！' });
      return;
    }
    
    if (!confirm('确定要清除所有算力额度数据吗？此操作不可恢复！')) {
      return;
    }
    
    setClearDataLoading(true);
    setClearDataMessage(null);
    
    try {
      const res = await authFetch('/api/admin/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'quota', password: clearDataPassword })
      });
      const data = await res.json();
      
      if (data.success) {
        setClearDataMessage({ type: 'success', text: '算力额度数据已清除！' });
        setClearDataPassword('');
      } else {
        setClearDataMessage({ type: 'error', text: data.error || '操作失败' });
      }
    } catch (error) {
      setClearDataMessage({ type: 'error', text: '网络错误，请重试' });
    } finally {
      setClearDataLoading(false);
    }
  };

  // 一键清除所有业务数据
  const handleClearAllData = async () => {
    if (clearDataPassword !== 'admin123') {
      setClearDataMessage({ type: 'error', text: '密码错误，请重试！' });
      return;
    }
    
    if (!confirm('⚠️ 警告：即将清除所有业务数据（收益、算力额度、产品、订单等），用户账号将保留。\n\n此操作不可恢复，确定继续吗？')) {
      return;
    }
    
    setClearDataLoading(true);
    setClearDataMessage(null);
    
    try {
      const res = await authFetch('/api/admin/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'all', password: clearDataPassword })
      });
      const data = await res.json();
      
      if (data.success) {
        setClearDataMessage({ type: 'success', text: '所有业务数据已清除！收益和算力额度统计将显示为0。' });
        setClearDataPassword('');
      } else {
        setClearDataMessage({ type: 'error', text: data.error || '操作失败' });
      }
    } catch (error) {
      setClearDataMessage({ type: 'error', text: '网络错误，请重试' });
    } finally {
      setClearDataLoading(false);
    }
  };

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      // 第一批：核心数据并行加载
      const [membersRes, ordersRes, templatesRes, providersRes, branchesRes, quotaRes, withdrawRes] = await Promise.all([
        authFetch('/api/admin/members').catch(e => { console.error('获取会员失败:', e); return null; }),
        authFetch('/api/admin/orders').catch(e => { console.error('获取订单失败:', e); return null; }),
        authFetch('/api/product-templates').catch(e => { console.error('获取模板失败:', e); return null; }),
        authFetch('/api/admin/provider-management').catch(e => { console.error('获取服务商列表失败:', e); return null; }),
        authFetch('/api/admin/users?role=branch').catch(e => { console.error('获取服务网点列表失败:', e); return null; }),
        authFetch('/api/quota-requests?status=pending&requesterType=branch').catch(e => { console.error('获取额度申请失败:', e); return null; }),
        authFetch('/api/withdrawals?tab=review&role=branch').catch(e => { console.error('获取服务网点提现申请失败:', e); return null; }),
      ]);

      // 并行解析JSON
      const [membersData, ordersData, templatesData, providersData, branchesData, quotaData, withdrawData] = await Promise.all([
        membersRes?.json().catch(() => null),
        ordersRes?.json().catch(() => null),
        templatesRes?.json().catch(() => null),
        providersRes?.json().catch(() => null),
        branchesRes?.json().catch(() => null),
        quotaRes?.json().catch(() => null),
        withdrawRes?.json().catch(() => null),
      ]);

      if (membersData?.success) {
        setMembers(membersData.data || []);
        const providerCount = new Set(membersData.data?.filter((m: Member) => m.provider_id).map((m: Member) => m.provider_id)).size;
        setStats(prev => ({
          ...prev,
          member_count: membersData.data?.length || 0,
          provider_count: providerCount || 0,
          total_balance: membersData.data?.reduce((sum: number, m: Member) => sum + (m.balance || 0), 0) || 0,
          total_member_balance: membersData.data?.reduce((sum: number, m: Member) => sum + (m.balance || 0), 0) || 0,
        }));
      }

      if (ordersData?.success) {
        setOrders(ordersData.data || []);
        const completedOrders = ordersData.data?.filter((o: Order) => o.status === 'completed') || [];
        setStats(prev => ({
          ...prev,
          total_orders: ordersData.data?.length || 0,
          total_revenue: completedOrders.reduce((sum: number, o: Order) => sum + (o.amount || 0), 0),
          pending_sell_count: ordersData.data?.filter((o: Order) => o.status === 'pending').length || 0,
        }));
      }

      if (templatesData?.success) {
        setTemplates(templatesData.data || []);
      }

      if (providersData?.success) {
        setProviders(providersData.data?.providers || []);
      }

      if (branchesData?.success) {
        setBranches(branchesData.data || []);
      }

      if (quotaData?.success) {
        setQuotaRequests(quotaData.data || []);
      }

      if (withdrawData?.success) {
        setBranchWithdrawals(withdrawData.data?.records || []);
      }

      // 第二批：额度相关数据并行加载
      const adminId = localStorage.getItem('userId');
      const ts = Date.now();
      const secondBatch = await Promise.all([
        adminId ? authFetch(`/api/quota?userId=${adminId}`).catch(e => { console.error('获取管理员额度失败:', e); return null; }) : Promise.resolve(null),
        authFetch(`/api/quota-accounts?_=${ts}`).catch(e => { console.error('获取额度账户失败:', e); return null; }),
        authFetch(`/api/quota-records?_=${ts}`).catch(e => { console.error('获取额度记录失败:', e); return null; }),
      ]);

      const [adminDataRes, accountsRes, recordsRes] = await Promise.all([
        secondBatch[0]?.json().catch(() => null),
        secondBatch[1]?.json().catch(() => null),
        secondBatch[2]?.json().catch(() => null),
      ]);

      if (adminDataRes?.success) {
        setAdminData(adminDataRes.data);
      }
      if (accountsRes?.success) {
        setQuotaAccounts(accountsRes.data || []);
      }
      if (recordsRes?.success) {
        setQuotaRecords(recordsRes.data || []);
        setQuotaStats(recordsRes.stats || { totalIssued: 0, totalIdle: 0, totalUsed: 0 });
      }

      // 生成图表数据
      const days = ['04-01', '04-02', '04-03', '04-04', '04-05', '04-06', '04-07'];
      const chartDataGenerated = days.map((day) => ({
        date: `2025年${day}`,
        订单金额: Math.floor(Math.random() * 3000000 + 500000),
        收益金额: Math.floor(Math.random() * 2000000 + 300000),
        订单数: Math.floor(Math.random() * 100 + 50),
        新用户: Math.floor(Math.random() * 30 + 10),
      }));
      setChartData(chartDataGenerated);

    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载市场费分配数据
  const loadIncomeData = useCallback(async (subType: string = 'overview') => {
    try {
      setIncomeLoading(true);
      const res = await authFetch(`/api/admin/income-stats?subType=${subType}`);
      const data = await res.json();
      if (data.success) {
        if (subType === 'overview') {
          setIncomeStats({
            totalIncome: data.data.summary.totalIncome || 0,
            todayIncome: data.data.summary.todayIncome || 0,
            pendingSettlement: data.data.summary.pendingSettlement || 0,
            distributed: data.data.summary.distributed || 0,
            totalOrders: data.data.summary.totalOrders || 0,
            todayOrders: data.data.summary.todayOrders || 0,
            totalSales: data.data.summary.totalSales || 0,
            todaySales: data.data.summary.todaySales || 0,
          });
          // 更新真实分配数据
          if (data.data.shareBreakdown) {
            setShareBreakdown(data.data.shareBreakdown);
          }
          // 更新收益趋势图表
          if (data.data.trend?.length > 0) {
            setChartData(data.data.trend.map((t: any) => ({
              date: t.date,
              收益金额: t.marketFee,
              订单金额: t.sales,
              订单数: t.orders,
            })));
          }
        } else if (subType === 'detail') {
          setIncomeRecords(data.data.records || []);
        } else if (subType === 'withdraw') {
          // 提现数据从 energy_withdraw_requests 加载
          if (data.data.stats) {
            setWithdrawStats(data.data.stats);
          }
          if (data.data.withdrawList) {
            setWithdrawList(data.data.withdrawList);
          }
        }
      }
    } catch (e) {
      console.error('获取收益数据失败:', e);
    } finally {
      setIncomeLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    }
  }, [authLoading, user, loadData]);

  // 市场费分配 tab 切换时加载数据
  useEffect(() => {
    if (activeMenu === 'income' && user) {
      loadIncomeData(incomeTab === 'withdraw' ? 'withdraw' : incomeTab === 'detail' ? 'detail' : 'overview');
    }
  }, [activeMenu, incomeTab, user, loadIncomeData]);

  // 账户管理/收益记录 tab 切换时加载数据
  useEffect(() => {
    if (!user) return;
    if (activeMenu === 'accounts') {
      loadAccountsData();
      if (accountsTab === 'finance') {
        loadFinancialReport();
      }
    }
    if (activeMenu === 'release') {
      loadReleaseRecords();
      loadFeeRecords();
    }
    if (activeMenu === 'dashboard') {
      loadDashboardData();
    }
    if (activeMenu === 'templates') {
      loadTemplates();
    }
    if (activeMenu === 'pointsShop') {
      loadPointsProducts();
    }
    if (activeMenu === 'capitalFlow') {
      loadCapitalFlow();
    }
  }, [activeMenu, accountsTab, user]);

  // 系统设置 tab 切换时加载配置
  useEffect(() => {
    if (activeMenu === 'settings') {
      loadSystemConfig();
    }
  }, [activeMenu, loadSystemConfig]);

  // 资金流水 tab/翻页切换时重新加载
  useEffect(() => {
    if (activeMenu === 'capitalFlow') {
      loadCapitalFlow();
    }
  }, [capitalFlowTab, capitalFlowPage]);

  // 切换菜单展开
  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  // 选择菜单
  const selectMenu = (menuId: string) => {
    setActiveMenu(menuId);
    
    // 如果选择数据总览，加载数据
    if (menuId === 'overview' || menuId.startsWith('overview-')) {
      loadOverviewData();
    }
    // 如果选择模板管理，加载模板数据
    if (menuId === 'templates') {
      loadTemplates();
    }
  };
  
  // 加载数据总览数据
  const loadOverviewData = async () => {
    setOverviewLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch('/api/admin/overview');
      const data = await response.json();
      if (data.success) {
        setOverviewData(data.data);
      }
    } catch (error) {
      console.error('加载数据总览失败:', error);
    } finally {
      setOverviewLoading(false);
    }
  };

  // 加载服务网点收益申请 pending 数量
  const loadBranchEnergyPendingCount = async () => {
    try {
      const response = await authFetch('/api/energy/branch-request?status=pending');
      const data = await response.json();
      if (data.success) {
        setBranchEnergyPendingCount(data.data?.stats?.pending?.count || 0);
      }
    } catch (error) {
      console.error('加载待审核申请数量失败:', error);
    }
  };

  // 格式化金额（转换为万）
  const formatWan = (amount: number | string | undefined | null) => {
    const num = Number(amount) || 0;
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num.toLocaleString();
  };

  // 加载所有用户列表
  const loadAllUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch('/api/admin/all-users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setAllUsers(data.data || []);
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
    }
  };

  // 重置用户密码
  const handleResetPassword = async (userId: string, username: string) => {
    if (!confirm(`确定要重置用户 "${username}" 的密码吗？\n重置后密码将变为: 123456`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await authFetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });
      const data = await response.json();
      if (data.success) {
        showMessage('success', `用户 ${username} 的密码已重置为 123456`);
        loadAllUsers(); // 刷新列表
      } else {
        showMessage('error', data.error || '重置失败');
      }
    } catch (error) {
      showMessage('error', '重置密码失败');
    }
  };

  // 显示消息
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // 审批额度申请
  const handleApproveQuotaRequest = async (requestId: string) => {
    const adminId = localStorage.getItem('userId');
    if (!adminId) return;

    setSubmitting(true);
    try {
      const response = await authFetch('/api/quota-requests/review', {
        method: 'POST',
        body: JSON.stringify({
          requestId,
          reviewerId: adminId,
          action: 'approve',
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', data.message || '额度申请已通过');
        loadData();
      } else {
        showMessage('error', data.error || '审批失败');
      }
    } catch (error) {
      showMessage('error', '网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // 拒绝额度申请
  const handleRejectQuotaRequest = async (requestId: string) => {
    const adminId = localStorage.getItem('userId');
    if (!adminId) return;

    const reason = prompt('请输入拒绝原因:');
    if (!reason) return;

    setSubmitting(true);
    try {
      const response = await authFetch('/api/quota-requests/review', {
        method: 'POST',
        body: JSON.stringify({
          requestId,
          reviewerId: adminId,
          action: 'reject',
          rejectReason: reason,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', '额度申请已拒绝');
        loadData();
      } else {
        showMessage('error', data.error || '操作失败');
      }
    } catch (error) {
      showMessage('error', '网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // 加载收益总览数据
  const loadEnergyOverview = async () => {
    setEnergyLoading(true);
    try {
      const response = await authFetch('/api/energy?type=all');
      const data = await response.json();
      if (data.success) {
        setEnergyData(data.data);
      }
    } catch (error) {
      console.error('加载收益总览失败:', error);
    } finally {
      setEnergyLoading(false);
    }
  };

  // 加载收益账户列表
  const loadEnergyAccounts = async () => {
    setEnergyLoading(true);
    try {
      const response = await authFetch('/api/energy-accounts');
      const data = await response.json();
      if (data.success) {
        setEnergyAccounts(data.data?.accounts || []);
      }
    } catch (error) {
      console.error('加载收益账户失败:', error);
    } finally {
      setEnergyLoading(false);
    }
  };

  // 加载收益流水记录
  const loadEnergyTransactions = async (type?: string) => {
    setEnergyLoading(true);
    try {
      const url = type && type !== 'all' ? `/api/energy-transactions?type=${type}` : '/api/energy-transactions';
      const response = await authFetch(url);
      const data = await response.json();
      if (data.success) {
        setEnergyTransactions(data.data?.transactions || []);
      }
    } catch (error) {
      console.error('加载收益流水失败:', error);
    } finally {
      setEnergyLoading(false);
    }
  };

  // 释放收益给服务网点
  const handleReleaseEnergy = async () => {
    const adminId = localStorage.getItem('userId');
    if (!adminId || !releaseForm.toUserId || !releaseForm.amount) {
      showMessage('error', '请填写完整信息');
      return;
    }

    setSubmitting(true);
    try {
      const response = await authFetch('/api/energy/manual-release', {
        method: 'POST',
        body: JSON.stringify({
          fromUserId: adminId,
          toUserId: releaseForm.toUserId,
          amount: Number(releaseForm.amount),
          note: releaseForm.note,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showMessage('success', '收益释放成功');
        setShowReleaseDialog(false);
        setReleaseForm({ toUserId: '', amount: '', note: '' });
        loadEnergyOverview();
      } else {
        showMessage('error', data.error || '操作失败');
      }
    } catch (error) {
      showMessage('error', '网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // 创建算力模板
  const handleCreateTemplate = async () => {
    setSubmitting(true);
    try {
      const response = await authFetch('/api/product-templates', {
        method: 'POST',
        body: JSON.stringify(templateForm),
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', '算力模板创建成功');
        setShowTemplateDialog(false);
        setTemplateForm({
          name: '',
          code: '',
          period: '7',
          total_rate: '10',
          market_rate: '5',
          profit_rate: '5',
          min_quota: 0,
        });
        loadData();
      } else {
        showMessage('error', data.error || '创建失败');
      }
    } catch (error) {
      showMessage('error', '网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // 创建收益
  const handleCreateEnergy = async () => {
    if (!createEnergyAmount || Number(createEnergyAmount) <= 0) {
      showMessage('error', '请输入有效的收益金额');
      return;
    }

    setSubmitting(true);
    try {
      const adminId = localStorage.getItem('userId');
      const response = await authFetch('/api/energy/admin-create', {
        method: 'POST',
        body: JSON.stringify({
          userId: adminId,
          amount: Number(createEnergyAmount),
          note: createEnergyNote,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', data.message || '收益创建成功');
        setShowCreateDialog(false);
        setCreateEnergyAmount('');
        setCreateEnergyNote('');
        loadEnergyOverview();
        loadEnergyAccounts();
      } else {
        showMessage('error', data.error || '创建失败');
      }
    } catch (error) {
      showMessage('error', '网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // 认证加载中
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-purple-900 flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-white animate-spin" />
      </div>
    );
  }

  // 渲染左侧导航
  const renderSidebar = () => (
    <>
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-purple-900 min-h-screen flex flex-col transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Logo */}
      <div className="p-6 border-b border-purple-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">算力中心</h1>
            <p className="text-xs text-purple-300">Order Snatching Center</p>
          </div>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {menuItems.map(menu => (
          <div key={menu.id}>
            <div
              onClick={() => {
                if (menu.children) {
                  toggleMenu(menu.id);
                } else {
                  selectMenu(menu.id);
                  setSidebarOpen(false);
                }
              }}
              className={`flex items-center justify-between px-6 py-3 cursor-pointer transition-colors ${
                activeMenu === menu.id ? 'bg-purple-700 text-white' : 'text-purple-200 hover:bg-purple-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                {menu.icon}
                <span>{menu.name}</span>
              </div>
              {menu.children && (
                expandedMenus.includes(menu.id) 
                  ? <ChevronUp className="w-4 h-4" />
                  : <ChevronDown className="w-4 h-4" />
              )}
            </div>
            {/* 子菜单 */}
            {menu.children && expandedMenus.includes(menu.id) && (
              <div className="bg-purple-950">
                {menu.children.map(child => (
                  <div
                    key={child.id}
                    onClick={() => { selectMenu(child.id); setSidebarOpen(false); }}
                    className={`pl-14 pr-6 py-2 cursor-pointer transition-colors ${
                      activeMenu === child.id ? 'bg-purple-600 text-white' : 'text-purple-300 hover:bg-purple-800 hover:text-white'
                    }`}
                  >
                    {child.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* 底部信息 */}
      <div className="p-4 border-t border-purple-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">智算中心</p>
            <p className="text-purple-300 text-xs">管理员</p>
          </div>
        </div>
        <Button onClick={logout} variant="ghost" className="w-full text-purple-200 hover:bg-purple-800 hover:text-white">
          退出登录
        </Button>
      </div>
      </aside>
    </>
  );

  // 渲染主页内容
  const renderHomeContent = () => (
    <div className="space-y-3 md:space-y-6">
      {/* 数据卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card className="mobile-compact-card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">服务商数量</p>
                <p className="text-3xl font-bold mobile-num">{stats.provider_count}</p>
              </div>
              <UserCog className="w-10 h-10 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="mobile-compact-card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">会员数量</p>
                <p className="text-3xl font-bold mobile-num">{stats.member_count}</p>
              </div>
              <Users className="w-10 h-10 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="mobile-compact-card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">总收益</p>
                <p className="text-3xl font-bold mobile-num">{stats.total_balance.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-10 h-10 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="mobile-compact-card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">总订单数</p>
                <p className="text-3xl font-bold mobile-num">{stats.total_orders}</p>
              </div>
              <ClipboardList className="w-10 h-10 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // 渲染数据总览内容
  const renderOverviewContent = () => {
    if (overviewLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      );
    }
    
    return (
      <div className="space-y-3 md:space-y-6">
        {/* 子 Tab 导航 - 左侧标题 + 右侧Tab样式 */}
        <div className="flex items-stretch bg-gradient-to-r from-purple-900 to-purple-800 rounded-lg overflow-hidden">
          {/* 左侧标题 */}
          <div className="flex items-center gap-3 px-6 py-4 bg-purple-950/50">
            <LayoutDashboard className="w-5 h-5 text-white" />
            <span className="text-white font-semibold text-lg">数据总览</span>
          </div>
          {/* 右侧Tab选项 */}
          <div className="flex items-center gap-1 px-4">
            <button
              onClick={() => setOverviewTab('product')}
              className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
                overviewTab === 'product' ? 'bg-purple-500 text-white' : 'bg-purple-800/50 text-white/80 hover:bg-purple-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                算力数据
              </span>
            </button>
            <button
              onClick={() => setOverviewTab('user')}
              className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
                overviewTab === 'user' ? 'bg-purple-500 text-white' : 'bg-purple-800/50 text-white/80 hover:bg-purple-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                用户数据
              </span>
            </button>
            <button
              onClick={() => setOverviewTab('energy')}
              className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
                overviewTab === 'energy' ? 'bg-purple-500 text-white' : 'bg-purple-800/50 text-white/80 hover:bg-purple-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                能力值统计
              </span>
            </button>
          </div>
        </div>
        
        {/* 算力数据 Tab */}
        {overviewTab === 'product' && (
          <div className="space-y-3 md:space-y-6">
            {/* 核心指标卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              <Card className="mobile-compact-card bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">算力售卖总数</p>
                      <p className="text-3xl font-bold mt-2">{overviewData?.product?.totalSold || 0}</p>
                      <p className="text-xs opacity-70 mt-1">累计已售出</p>
                    </div>
                    <ShoppingCart className="w-10 h-10 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="mobile-compact-card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">闲置算力数量</p>
                      <p className="text-3xl font-bold mt-2">{overviewData?.product?.idleCount || 0}</p>
                      <p className="text-xs opacity-70 mt-1">可上架销售</p>
                    </div>
                    <Package className="w-10 h-10 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="mobile-compact-card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">售卖总额度</p>
                      <p className="text-3xl font-bold mt-2">¥{(overviewData?.product?.totalSalesAmount || 0).toLocaleString()}</p>
                      <p className="text-xs opacity-70 mt-1">累计销售额</p>
                    </div>
                    <TrendingUp className="w-10 h-10 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="mobile-compact-card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">今日售卖</p>
                      <p className="text-3xl font-bold mt-2">{overviewData?.product?.todaySold || 0}</p>
                      <p className="text-xs opacity-70 mt-1">
                        今日销售额: ¥{(overviewData?.product?.todaySalesAmount || 0).toLocaleString()}
                      </p>
                    </div>
                    <ArrowUpRight className="w-10 h-10 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* 销售趋势图表 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  近7天销售趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overviewData?.product?.salesTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" orientation="left" stroke="#8b5cf6" />
                      <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="count" name="销售数量" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="amount" name="销售额(元)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* 按周期分布 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-purple-600" />
                  算力周期分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4">算力周期</th>
                        <th className="text-right py-3 px-4">销售数量</th>
                        <th className="text-right py-3 px-4">销售额</th>
                        <th className="text-right py-3 px-4">占比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(overviewData?.product?.productsByPeriod || []).map((item: any) => (
                        <tr key={item.period} className="border-b">
                          <td className="py-3 px-4 font-medium">{item.period}天</td>
                          <td className="py-3 px-4 text-right">{item.count}</td>
                          <td className="py-3 px-4 text-right text-green-600 font-medium">
                            ¥{item.amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {((item.amount / (overviewData?.product?.totalSalesAmount || 1)) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                      {(!overviewData?.product?.productsByPeriod || overviewData?.product?.productsByPeriod.length === 0) && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-500">暂无数据</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* 用户数据 Tab */}
        {overviewTab === 'user' && (
          <div className="space-y-3 md:space-y-6">
            {/* 核心指标卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              <Card className="mobile-compact-card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">总用户数</p>
                      <p className="text-3xl font-bold mt-2">{overviewData?.user?.totalUsers || 0}</p>
                      <p className="text-xs opacity-70 mt-1">全部注册用户</p>
                    </div>
                    <Users className="w-10 h-10 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="mobile-compact-card bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">今日新增注册</p>
                      <p className="text-3xl font-bold mt-2">{overviewData?.user?.todayNewUsers || 0}</p>
                      <p className="text-xs opacity-70 mt-1">
                        其中会员: {overviewData?.user?.todayNewMembers || 0}
                      </p>
                    </div>
                    <ArrowUpRight className="w-10 h-10 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="mobile-compact-card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">今日新增购买</p>
                      <p className="text-3xl font-bold mt-2">¥{(overviewData?.user?.todayPurchaseAmount || 0).toLocaleString()}</p>
                      <p className="text-xs opacity-70 mt-1">今日订单金额</p>
                    </div>
                    <TrendingUp className="w-10 h-10 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="mobile-compact-card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">会员总数</p>
                      <p className="text-3xl font-bold mt-2">{overviewData?.user?.totalMembers || 0}</p>
                      <p className="text-xs opacity-70 mt-1">购买用户</p>
                    </div>
                    <UserCog className="w-10 h-10 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* 用户增长趋势 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  近7天用户增长趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={overviewData?.user?.newUsersTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" name="新增用户" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* 购买金额趋势 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  近7天购买金额趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overviewData?.user?.purchaseTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => `¥${Number(value).toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="amount" name="购买金额" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* 能力值统计 Tab */}
        {overviewTab === 'energy' && (
          <div className="space-y-3 md:space-y-6">
            {/* 核心指标卡片 - 市场费分配统计 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
              <Card className="mobile-compact-card bg-gradient-to-br from-yellow-500 to-orange-500 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">能力值总额</p>
                      <p className="text-2xl font-bold mt-2">{(overviewData?.energy?.totalEnergy || 0).toLocaleString()}</p>
                      <p className="text-xs opacity-70 mt-1">平台总收益</p>
                    </div>
                    <Zap className="w-8 h-8 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="mobile-compact-card bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">今日递增</p>
                      <p className="text-2xl font-bold mt-2 flex items-center gap-1">
                        {(overviewData?.energy?.todayEnergyChange || 0) >= 0 ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5" />
                        )}
                        {Math.abs(overviewData?.energy?.todayEnergyChange || 0).toLocaleString()}
                      </p>
                      <p className="text-xs opacity-70 mt-1">会员收益转收益</p>
                    </div>
                    <TrendingUp className="w-8 h-8 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="mobile-compact-card bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">智算中心收益</p>
                      <p className="text-2xl font-bold mt-2">
                        {(overviewData?.energy?.energyDistribution?.admin || 0).toLocaleString()}
                      </p>
                      <p className="text-xs opacity-70 mt-1">智算中心持有</p>
                    </div>
                    <Shield className="w-8 h-8 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="mobile-compact-card bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">服务网点收益</p>
                      <p className="text-2xl font-bold mt-2">
                        {(overviewData?.energy?.energyDistribution?.branch || 0).toLocaleString()}
                      </p>
                      <p className="text-xs opacity-70 mt-1">服务网点持有</p>
                    </div>
                    <Building2 className="w-8 h-8 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="mobile-compact-card bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">服务商收益</p>
                      <p className="text-2xl font-bold mt-2">
                        {(overviewData?.energy?.energyDistribution?.provider || 0).toLocaleString()}
                      </p>
                      <p className="text-xs opacity-70 mt-1">服务商持有</p>
                    </div>
                    <UserCog className="w-8 h-8 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="mobile-compact-card bg-gradient-to-br from-pink-500 to-rose-500 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">会员收益</p>
                      <p className="text-2xl font-bold mt-2">
                        {(overviewData?.energy?.energyDistribution?.member || 0).toLocaleString()}
                      </p>
                      <p className="text-xs opacity-70 mt-1">会员持有</p>
                    </div>
                    <Users className="w-8 h-8 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Top 10 用户 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  收益 Top 10 用户
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4">排名</th>
                        <th className="text-left py-3 px-4">用户名</th>
                        <th className="text-right py-3 px-4">收益</th>
                        <th className="text-right py-3 px-4">占比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(overviewData?.energy?.topEnergyUsers || []).map((user: any, index: number) => (
                        <tr key={user.userId} className="border-b">
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              index === 0 ? 'bg-yellow-100 text-yellow-700' :
                              index === 1 ? 'bg-gray-100 text-gray-700' :
                              index === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-50 text-gray-600'
                            }`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium">{user.username}</td>
                          <td className="py-3 px-4 text-right text-yellow-600 font-medium">
                            {user.balance.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {((user.balance / (overviewData?.energy?.totalEnergy || 1)) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                      {(!overviewData?.energy?.topEnergyUsers || overviewData?.energy?.topEnergyUsers.length === 0) && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-500">暂无数据</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            {/* 收益趋势 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  近7天收益变化趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={overviewData?.energy?.energyTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" orientation="left" stroke="#f59e0b" />
                      <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="totalEnergy" name="累计收益" stroke="#f59e0b" strokeWidth={2} />
                      <Bar yAxisId="right" dataKey="change" name="日变化" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 消息提示 */}
        {message && (
          <div className={`fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg z-50 ${
            message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {message.text}
          </div>
        )}
      </div>
    );
  };
  
  // 渲染算力额度管理（合并：额度总览+算力模板+分配记录+额度申请）
  const renderQuotaManagement = () => {
    const subTabs = [
      { key: 'overview' as const, label: '额度总览', icon: Database },
      { key: 'templates' as const, label: '算力模板', icon: Cpu },
      { key: 'records' as const, label: '分配记录', icon: FileText },
      { key: 'requests' as const, label: '额度申请', icon: ClipboardList },
    ];

    const renderSubContent = () => {
      if (quotaSubTab === 'templates') {
        return renderProductTemplates();
      }
      if (quotaSubTab === 'records') {
        return <QuotaRecordsPanel />;
      }
      if (quotaSubTab === 'requests') {
        return <QuotaRequestsPanel />;
      }
      // 默认：额度总览
      return renderQuotaOverview();
    };

    return (
      <div className="space-y-4">
        {/* 子Tab导航 */}
        <div className="flex gap-2 border-b pb-2 mobile-tab-nav">
          {subTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setQuotaSubTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                  quotaSubTab === tab.key
                    ? 'bg-purple-100 text-purple-700 border-b-2 border-purple-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        {renderSubContent()}
      </div>
    );
  };

  // 额度总览
  const renderQuotaOverview = () => {
    // 获取智算中心账户信息
    const adminAccount = quotaAccounts.find(a => a.role === 'admin');
    const branchAccounts = quotaAccounts.filter(a => a.role === 'branch');
    const providerAccounts = quotaAccounts.filter(a => a.role === 'provider');
    
    // 计算统计数据
    const totalIssued = quotaStats.totalIssued || 0;
    const totalIdle = quotaStats.totalIdle || 0;
    const totalSold = quotaStats.totalUsed || 0;
    
    // 创建额度处理
    const handleCreateQuota = async () => {
      if (!createQuotaAmount || Number(createQuotaAmount) <= 0) {
        showMessage('error', '请输入有效的金额');
        return;
      }
      setSubmitting(true);
      try {
        const res = await authFetch('/api/quota-accounts/create', {
          method: 'POST',
          body: JSON.stringify({
            amount: Number(createQuotaAmount),
            note: createQuotaNote,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showMessage('success', '额度创建成功');
          setShowCreateQuotaDialog(false);
          setCreateQuotaAmount('');
          setCreateQuotaNote('');
          // 延迟刷新确保状态更新
          setTimeout(() => loadData(), 100);
        } else {
          showMessage('error', data.error || '创建失败');
        }
      } catch (e) {
        showMessage('error', '创建失败');
      } finally {
        setSubmitting(false);
      }
    };
    
    // 分配额度处理
    const handleTransfer = async () => {
      if (!transferTo || !transferAmount || Number(transferAmount) <= 0) {
        showMessage('error', '请选择分配对象并输入金额');
        return;
      }
      if (Number(transferAmount) < 10000) {
        showMessage('error', '最小分配额度为10000');
        return;
      }
      setSubmitting(true);
      try {
        // 智算中心→服务网点：调用 allocate-branch API（赠送20%收益）
        // 智算中心→服务商：暂不直接分配（通过服务网点分配）
        const res = await authFetch('/api/admin/allocate-branch', {
          method: 'POST',
          body: JSON.stringify({
            adminId: user?.id,
            branchId: transferTo,
            amount: Number(transferAmount),
            note: transferNote,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showMessage('success', data.message || '额度分配成功');
          setShowTransferDialog(false);
          setTransferTo('');
          setTransferAmount('');
          setTransferNote('');
          setTimeout(() => loadData(), 500);
        } else {
          showMessage('error', data.error || '分配失败');
        }
      } catch (e) {
        showMessage('error', '分配失败');
      } finally {
        setSubmitting(false);
      }
    };
    
    return (
      <div className="space-y-3 md:space-y-6">
        {/* 额度统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <div className="mobile-compact-card p-4 md:p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
            <p className="text-sm text-gray-600 mobile-label">智算中心额度</p>
            <p className="text-2xl md:text-3xl font-bold text-blue-600 mt-2 mobile-num">
              ¥{formatWan(adminAccount?.total_in)}
            </p>
            <p className="text-xs text-gray-500 mt-1 mobile-sub">
              已分配: ¥{formatWan(totalIssued)}
            </p>
          </div>
          <div className="mobile-compact-card p-4 md:p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
            <p className="text-sm text-gray-600 mobile-label">已分配额度</p>
            <p className="text-2xl md:text-3xl font-bold text-green-600 mt-2 mobile-num">
              ¥{formatWan(totalIssued)}
            </p>
            <p className="text-xs text-gray-500 mt-1 mobile-sub">
              分配给 {branchAccounts.length} 个服务网点
            </p>
          </div>
          <div className="mobile-compact-card p-4 md:p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
            <p className="text-sm text-gray-600 mobile-label">可用余额</p>
            <p className="text-2xl md:text-3xl font-bold text-orange-600 mt-2 mobile-num">
              ¥{formatWan(adminAccount?.balance)}
            </p>
            <p className="text-xs text-gray-500 mt-1 mobile-sub">
              可继续分配
            </p>
          </div>
          <div className="mobile-compact-card p-4 md:p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
            <p className="text-sm text-gray-600 mobile-label">已购买额度</p>
            <p className="text-2xl md:text-3xl font-bold text-purple-600 mt-2 mobile-num">
              ¥{formatWan(totalSold)}
            </p>
            <p className="text-xs text-gray-500 mt-1 mobile-sub">
              会员累计购买
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setShowTransferDialog(true)} variant="outline" className="border-green-500 text-green-600">
            <Zap className="w-4 h-4 mr-2" />分配额度
          </Button>
          <Button onClick={() => setShowCreateQuotaDialog(true)} className="bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />创建额度
          </Button>
        </div>

        {/* 下属服务网点额度 */}
        <Card>
          <CardHeader>
            <CardTitle>下属服务网点额度</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {branchAccounts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  暂无服务网点
                </div>
              )}
              {branchAccounts.map(account => (
                <div key={account.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{account.username}</p>
                      <p className="text-sm text-gray-500">{account.phone || '-'}</p>
                      {account.unique_id && <p className="text-xs text-gray-400">专属ID: {account.unique_id}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">
                        ¥{formatWan(account.balance)}
                      </p>
                      <p className="text-xs text-gray-500">
                        累计获得: ¥{formatWan(account.total_in)}
                      </p>
                    </div>
                  </div>
                  {account.total_in > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>额度使用</span>
                        <span>{account.total_in > 0 ? Math.round(((account.total_in - account.balance) / account.total_in) * 100) : 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 rounded-full h-2 transition-all"
                          style={{ width: `${account.total_in > 0 ? Math.round(((account.total_in - account.balance) / account.total_in) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 创建额度对话框 */}
        {showCreateQuotaDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>创建算力额度</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>额度金额</Label>
                  <Input
                    type="number"
                    value={createQuotaAmount}
                    onChange={(e) => setCreateQuotaAmount(e.target.value)}
                    placeholder="请输入额度金额"
                  />
                </div>
                <div>
                  <Label>备注说明</Label>
                  <Input
                    value={createQuotaNote}
                    onChange={(e) => setCreateQuotaNote(e.target.value)}
                    placeholder="请输入备注（可选）"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => setShowCreateQuotaDialog(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreateQuota} disabled={submitting}>
                    {submitting ? '创建中...' : '确认创建'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 分配额度对话框 */}
        {showTransferDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>分配算力额度给服务网点</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  分配额度给服务网点时，系统自动赠送20%收益给服务网点。例如分配10000元额度，服务网点额外获得2000收益。
                </div>
                <div>
                  <Label>选择服务网点</Label>
                  <select
                    className="w-full mt-1 p-2 border rounded-md"
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                  >
                    <option value="">请选择服务网点</option>
                    {branchAccounts.map(a => (
                        <option key={a.user_id} value={a.user_id}>{a.username} {a.phone ? `(${a.phone})` : ''}</option>
                      ))
                    }
                  </select>
                </div>
                <div>
                  <Label>分配金额（最低10000）</Label>
                  <Input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="请输入分配金额"
                  />
                </div>
                <div>
                  <Label>备注说明</Label>
                  <Input
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    placeholder="请输入备注（可选）"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
                    取消
                  </Button>
                  <Button onClick={handleTransfer} disabled={submitting}>
                    {submitting ? '分配中...' : '确认分配'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  };

  // 渲染额度审批
  const renderQuotaRequests = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>服务网点额度申请</CardTitle>
          <Badge className="bg-blue-100 text-blue-700">
            待审核: {quotaRequests.filter(r => r.status === 'pending').length}个
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {quotaRequests.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>暂无额度申请</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quotaRequests.map(request => (
              <div key={request.id} className="p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{branches.find(b => b.id === request.requester_id)?.real_name || '服务网点'}</h4>
                      <Badge className={
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        request.status === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }>
                        {request.status === 'pending' ? '待审核' :
                         request.status === 'approved' ? '已通过' : '已拒绝'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="text-gray-400">申请额度：</span>
                        <span className="text-green-600 font-medium">¥{request.requested_amount?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">批准额度：</span>
                        <span className="text-blue-600 font-medium">¥{request.approved_amount?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">奖励比例：</span>
                        <span className="text-orange-600 font-medium">{request.bonus_rate}%</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      申请时间: {new Date(request.created_at).toLocaleString()}
                    </div>
                  </div>
                  {request.status === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleApproveQuotaRequest(request.id)}
                        disabled={submitting}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />通过
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectQuotaRequest(request.id)}
                        disabled={submitting}
                      >
                        <XCircle className="w-4 h-4 mr-1" />拒绝
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // 分配记录Tab
  const QuotaRecordsPanel = React.memo(() => {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
      const fetchRecords = async () => {
        setLoading(true);
        try {
          const url = filterType === 'all' 
            ? '/api/quota-records' 
            : `/api/quota-records?type=${filterType}`;
          const res = await authFetch(url);
          const data = await res.json();
          if (data.success) {
            setRecords(data.data || []);
          }
        } catch (e) {
          console.error('获取分配记录失败:', e);
        } finally {
          setLoading(false);
        }
      };
      fetchRecords();
    }, [filterType]);

    const getTypeLabel = (type: string) => {
      const map: Record<string, string> = {
        transfer: '额度下发',
        allocate: '额度分配',
        create: '额度创建',
        return: '额度退回',
        use: '额度使用',
      };
      return map[type] || type;
    };

    const getTypeColor = (type: string) => {
      const map: Record<string, string> = {
        transfer: 'bg-blue-100 text-blue-700',
        allocate: 'bg-purple-100 text-purple-700',
        create: 'bg-green-100 text-green-700',
        return: 'bg-orange-100 text-orange-700',
        use: 'bg-red-100 text-red-700',
      };
      return map[type] || 'bg-gray-100 text-gray-700';
    };

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">分配记录</CardTitle>
          <div className="flex gap-2">
            {['all', 'transfer', 'allocate', 'create'].map(t => (
              <Button
                key={t}
                size="sm"
                variant={filterType === t ? 'default' : 'outline'}
                onClick={() => setFilterType(t)}
              >
                {t === 'all' ? '全部' : getTypeLabel(t)}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无分配记录</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">时间</th>
                    <th className="text-left py-3 px-2">类型</th>
                    <th className="text-left py-3 px-2">操作方</th>
                    <th className="text-left py-3 px-2">接收方</th>
                    <th className="text-right py-3 px-2">金额</th>
                    <th className="text-left py-3 px-2">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r: any, i: number) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2 text-gray-500 whitespace-nowrap">
                        {r.created_at ? new Date(r.created_at).toLocaleString('zh-CN') : '-'}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(r.type)}`}>
                          {getTypeLabel(r.type)}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {r.from_username ? (
                          <span>{r.from_username} <span className="text-gray-400 text-xs">({r.from_role})</span></span>
                        ) : <span className="text-gray-400">系统</span>}
                      </td>
                      <td className="py-3 px-2">
                        {r.to_username ? (
                          <span>{r.to_username} <span className="text-gray-400 text-xs">({r.to_role})</span></span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-blue-600">
                        ¥{Number(r.amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-gray-500 max-w-[200px] truncate">
                        {r.note || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  });

  // 额度申请Tab - 使用组件避免hooks规则违反
  const QuotaRequestsPanel = React.memo(() => {
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchApplications = async () => {
      setLoading(true);
      try {
        // 从 quota_requests 表读取（服务网点/服务商的申请都写在这里）
        const res = await authFetch('/api/quota-requests?requesterType=branch');
        const data = await res.json();
        if (data.success) {
          setApplications(data.data || []);
        }
      } catch (e) {
        console.error('获取额度申请失败:', e);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => { fetchApplications(); }, []);

    const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
      setActionLoading(requestId);
      try {
        const userId = localStorage.getItem('userId') || '';
        const res = await authFetch('/api/quota-requests/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, reviewerId: userId, action }),
        });
        const data = await res.json();
        if (data.success) {
          showMessage('success', data.message);
          fetchApplications();
          loadData();
        } else {
          showMessage('error', data.error || '操作失败');
        }
      } catch (e) {
        showMessage('error', '操作失败');
      } finally {
        setActionLoading(null);
      }
    };

    const getStatusBadge = (status: string) => {
      const map: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-700',
        approved: 'bg-green-100 text-green-700',
        rejected: 'bg-red-100 text-red-700',
      };
      const labelMap: Record<string, string> = {
        pending: '待审批',
        approved: '已通过',
        rejected: '已拒绝',
      };
      return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-700'}`}>
          {labelMap[status] || status}
        </span>
      );
    };

    const getTypeLabel = (type: string) => {
      const labels: Record<string, string> = {
        branch: '服务网点',
        provider: '服务商',
      };
      return labels[type] || type;
    };

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">服务网点额度申请</CardTitle>
          <Button size="sm" variant="outline" onClick={fetchApplications}>刷新</Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无额度申请</div>
          ) : (
            <div className="space-y-3">
              {applications.map((app: any) => (
                <div key={app.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">
                          {app.requester_name || '未知'}
                          <span className="text-xs text-gray-400 ml-2">{getTypeLabel(app.requester_type)}</span>
                        </p>
                        <p className="text-xs text-gray-500">{app.requester_phone || ''}</p>
                      </div>
                      {getStatusBadge(app.status)}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">¥{Number(app.requested_amount).toLocaleString()}</p>
                      {app.requester_type === 'branch' && (
                        <p className="text-xs text-orange-500">
                          配比收益: ¥{Math.floor(Number(app.requested_amount) * 0.2).toLocaleString()}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {app.created_at ? new Date(app.created_at).toLocaleString('zh-CN') : ''}
                      </p>
                    </div>
                  </div>
                  {app.reject_reason && (
                    <p className="text-sm text-red-600 mt-2">拒绝原因: {app.reject_reason}</p>
                  )}
                  {app.status === 'pending' && (
                    <div className="flex gap-2 mt-3 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-300 hover:bg-green-50"
                        onClick={() => handleAction(app.id, 'approve')}
                        disabled={actionLoading === app.id}
                      >
                        通过
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => handleAction(app.id, 'reject')}
                        disabled={actionLoading === app.id}
                      >
                        拒绝
                      </Button>
                    </div>
                  )}
                  {app.status === 'approved' && app.approved_amount && (
                    <p className="text-sm text-green-600 mt-2">审批额度: ¥{Number(app.approved_amount).toLocaleString()}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  });

  // 会员管理完整组件 - 使用 memo 优化防止不必要的重新渲染
  const MemberManagement = React.memo(() => {
    // 使用 ref 跟踪是否已初始化加载
    const initializedRef = useRef(false);
    
    // 组件挂载时自动加载所有数据
    useEffect(() => {
      if (!initializedRef.current) {
        initializedRef.current = true;
        handleRefreshUpgradeAudit();
        handleRefreshEnergyList();
        handleRefreshStats();
        loadAllUsers();
      }
    }, []);
    
    // State 定义
    const [upgradeAuditList, setUpgradeAuditList] = useState<any[]>([]);
    const [memberEnergyList, setMemberEnergyList] = useState<any[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [memberDetail, setMemberDetail] = useState<any>(null);
    const [memberDetailLoading, setMemberDetailLoading] = useState(false);
    const [memberDetailTab, setMemberDetailTab] = useState<'holdings' | 'orders' | 'energy'>('holdings');
    
    // 加载会员详情
    const loadMemberDetail = async (userId: string) => {
      setSelectedMemberId(userId);
      setMemberDetailLoading(true);
      setMemberDetailTab('holdings');
      try {
        const res = await authFetch(`/api/admin/member-detail?userId=${userId}`);
        const data = await res.json();
        if (data.success) {
          setMemberDetail(data.data);
        } else {
          console.error('获取会员详情失败:', data.error);
        }
      } catch (err) {
        console.error('获取会员详情失败:', err);
      } finally {
        setMemberDetailLoading(false);
      }
    };
    
    // 关闭会员详情
    const closeMemberDetail = () => {
      setSelectedMemberId(null);
      setMemberDetail(null);
    };
    
    // 刷新函数 - 刷新升级审核列表
    const handleRefreshUpgradeAudit = () => {
      authFetch('/api/provider-applications?status=pending')
        .then(res => res.json())
        .then(data => {
          if (data.success) setUpgradeAuditList(data.data || []);
        })
        .catch(err => console.error('刷新升级审核列表失败:', err));
    };

    // 刷新函数 - 刷新会员收益列表
    const handleRefreshEnergyList = () => {
      authFetch('/api/admin/members-energy')
        .then(res => res.json())
        .then(data => {
          if (data.success) setMemberEnergyList(data.data || []);
        })
        .catch(err => console.error('刷新会员收益列表失败:', err));
    };

    // 刷新函数 - 刷新会员统计
    const handleRefreshStats = () => {
      setMemberStatsLoading(true);
      authFetch('/api/admin/members-stats')
        .then(res => res.json())
        .then(data => {
          if (data.success) setMemberStats(data.data);
        })
        .catch(err => console.error('刷新会员统计失败:', err))
        .finally(() => setMemberStatsLoading(false));
    };

    // 处理升级审核
    const handleUpgradeAudit = (id: string, action: 'approve' | 'reject') => {
      authFetch('/api/provider-applications/review', {
        method: 'POST',
        body: JSON.stringify({ id, action }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            alert(action === 'approve' ? '审核通过' : '已拒绝');
            setUpgradeAuditList(prev => prev.filter(item => item.id !== id));
          } else {
            alert(data.error || '操作失败');
          }
        })
        .catch(() => alert('网络错误'));
    };

    // 收益调整
    const handleEnergyAdjust = (user: any) => {
      setEnergyAdjustTarget(user);
      setEnergyAdjustAmount('');
      setEnergyAdjustNote('');
      setEnergyAdjustType('add');
      setShowEnergyAdjustDialog(true);
    };

    const submitEnergyAdjust = async () => {
      if (!energyAdjustTarget || !energyAdjustAmount) return alert('请填写调整金额');
      const amount = parseFloat(energyAdjustAmount);
      if (isNaN(amount) || amount <= 0) return alert('请输入有效金额');

      try {
        const res = await authFetch('/api/admin/energy-adjust', {
          method: 'POST',
          body: JSON.stringify({
            userId: energyAdjustTarget.id,
            type: energyAdjustType,
            amount,
            note: energyAdjustNote || (energyAdjustType === 'add' ? '管理员调整增加' : '管理员调整扣除'),
          }),
        });
        const data = await res.json();
        if (data.success) {
          alert('收益调整成功');
          setShowEnergyAdjustDialog(false);
          // 刷新收益列表
          loadMemberEnergyList();
        } else {
          alert(data.error || '调整失败');
        }
      } catch {
        alert('网络错误');
      }
    };

    // 查看收益记录
    const handleViewEnergyRecord = async (user: any) => {
      setEnergyAdjustTarget(user);
      setShowEnergyRecordDialog(true);
      setEnergyRecordLoading(true);
      try {
        const res = await authFetch(`/api/energy-transactions?userId=${user.id}`);
        const data = await res.json();
        if (data.success) {
          setEnergyRecordList(data.data || []);
        }
      } catch {
        setEnergyRecordList([]);
      }
      setEnergyRecordLoading(false);
    };

    // 加载会员收益列表
    const loadMemberEnergyList = async () => {
      try {
        const res = await authFetch('/api/admin/members-energy');
        const data = await res.json();
        if (data.success) {
          setAllUsers(prev => {
            // 合并收益数据
            const energyMap = new Map((data.data || []).map((u: any) => [u.id, u]));
            return prev.map(u => {
              const e = energyMap.get(u.id);
              return e ? { ...u, ...e } : u;
            });
          });
        }
      } catch {}
    };

    // 升级审核Tab
    const renderUpgradeAuditTab = () => (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>升级审核</CardTitle>
            <Button variant="outline" onClick={handleRefreshUpgradeAudit}>
              <RefreshCw className="w-4 h-4 mr-2" />刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4">申请人</th>
                  <th className="text-left py-3 px-4">手机号</th>
                  <th className="text-left py-3 px-4">申请类型</th>
                  <th className="text-left py-3 px-4">申请时间</th>
                  <th className="text-left py-3 px-4">状态</th>
                  <th className="text-left py-3 px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {upgradeAuditList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-500">暂无待审核申请</td>
                  </tr>
                ) : (
                  upgradeAuditList.map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{item.applicant_name || item.username || '-'}</td>
                      <td className="py-3 px-4 text-gray-600">{item.phone || '-'}</td>
                      <td className="py-3 px-4">
                        <Badge className={item.apply_type === 'first' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                          {item.apply_type === 'first' ? '第一代申请' : '第二代申请'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">{item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}</td>
                      <td className="py-3 px-4">
                        <Badge className="bg-yellow-100 text-yellow-700">{item.status}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-600" onClick={() => handleUpgradeAudit(item.id, 'approve')}>通过</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleUpgradeAudit(item.id, 'reject')}>拒绝</Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );

    // 市场费分配Tab
    const renderEnergyManageTab = () => (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>市场费分配</CardTitle>
            <Button variant="outline" onClick={handleRefreshEnergyList}>
              <RefreshCw className="w-4 h-4 mr-2" />刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4">会员</th>
                  <th className="text-left py-3 px-4">手机号</th>
                  <th className="text-left py-3 px-4">当前余额</th>
                  <th className="text-left py-3 px-4">累计充值</th>
                  <th className="text-left py-3 px-4">累计转出</th>
                  <th className="text-left py-3 px-4">服务商</th>
                  <th className="text-left py-3 px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {memberEnergyList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-500">暂无数据</td>
                  </tr>
                ) : (
                  memberEnergyList.map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{item.username}</td>
                      <td className="py-3 px-4 text-gray-600">{item.phone || '-'}</td>
                      <td className="py-3 px-4 text-orange-600 font-medium">{Number(item.balance || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-green-600">{Number(item.total_in || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-red-600">{Number(item.total_out || 0).toLocaleString()}</td>
                      <td className="py-3 px-4">{item.provider_name || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEnergyAdjust(item)}>调整</Button>
                          <Button size="sm" variant="outline" onClick={() => handleViewEnergyRecord(item)}>记录</Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );

    // 会员统计Tab
    const renderMemberStatsTab = () => (
      <div className="space-y-3 md:space-y-6">
        {/* 概览卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <Card className="mobile-compact-card bg-gradient-to-br from-purple-500 to-purple-700 text-white">
            <CardContent className="p-4">
              <div className="text-sm opacity-80">会员总数</div>
              <div className="text-3xl font-bold mt-1">{memberStats?.totalMembers || 0}</div>
              <div className="text-xs opacity-70 mt-2">较昨日 +{memberStats?.yesterdayNewMembers || 0}</div>
            </CardContent>
          </Card>
          <Card className="mobile-compact-card bg-gradient-to-br from-blue-500 to-blue-700 text-white">
            <CardContent className="p-4">
              <div className="text-sm opacity-80">活跃会员</div>
              <div className="text-3xl font-bold mt-1">{memberStats?.activeMembers || 0}</div>
              <div className="text-xs opacity-70 mt-2">本周购买 ≥1</div>
            </CardContent>
          </Card>
          <Card className="mobile-compact-card bg-gradient-to-br from-green-500 to-green-700 text-white">
            <CardContent className="p-4">
              <div className="text-sm opacity-80">总投资金额</div>
              <div className="text-3xl font-bold mt-1">¥{(memberStats?.totalInvestment || 0).toLocaleString()}</div>
              <div className="text-xs opacity-70 mt-2">累计购买总额</div>
            </CardContent>
          </Card>
          <Card className="mobile-compact-card bg-gradient-to-br from-orange-500 to-orange-700 text-white">
            <CardContent className="p-4">
              <div className="text-sm opacity-80">持有收益</div>
              <div className="text-3xl font-bold mt-1">{(memberStats?.totalEnergy || 0).toLocaleString()}</div>
              <div className="text-xs opacity-70 mt-2">所有会员持有</div>
            </CardContent>
          </Card>
        </div>

        {/* 增长趋势图表区域 */}
        <Card>
          <CardHeader>
            <CardTitle>会员增长趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {memberStats?.newUsersTrend?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={memberStats.newUsersTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="新增会员" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">暂无趋势数据</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top榜单 */}
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>投资金额 Top 10</CardTitle>
            </CardHeader>
            <CardContent>
              {memberStats?.topInvestors?.length > 0 ? (
                <div className="space-y-3">
                  {memberStats.topInvestors.map((item: any, idx: number) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-400 text-white' : 
                        idx === 1 ? 'bg-gray-400 text-white' : 
                        idx === 2 ? 'bg-orange-400 text-white' : 
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{item.username}</div>
                        <div className="text-xs text-gray-500">{item.phone}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">¥{item.totalInvestment?.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{item.productCount} 个产品</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">暂无数据</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>收益 Top 10</CardTitle>
            </CardHeader>
            <CardContent>
              {memberStats?.topEnergyUsers?.length > 0 ? (
                <div className="space-y-3">
                  {memberStats.topEnergyUsers.map((item: any, idx: number) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-400 text-white' : 
                        idx === 1 ? 'bg-gray-400 text-white' : 
                        idx === 2 ? 'bg-orange-400 text-white' : 
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{item.username}</div>
                        <div className="text-xs text-gray-500">{item.phone}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-orange-600">{Number(item.balance || 0).toLocaleString()}</div>
                        <div className="text-xs text-gray-500">收益</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">暂无数据</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );

    // 用户管理Tab
    const renderUsersManagementTab = () => (
      <div className="space-y-3 md:space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>用户管理</CardTitle>
            <Button size="sm" variant="outline" onClick={loadAllUsers}>
              <RefreshCw className="w-4 h-4 mr-2" />刷新
            </Button>
          </CardHeader>
          <CardContent>
            {allUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-medium text-gray-600">用户名</th>
                      <th className="text-left p-3 font-medium text-gray-600">手机号</th>
                      <th className="text-left p-3 font-medium text-gray-600">角色</th>
                      <th className="text-left p-3 font-medium text-gray-600">所属服务网点</th>
                      <th className="text-left p-3 font-medium text-gray-600">所属服务商</th>
                      <th className="text-left p-3 font-medium text-gray-600">收益</th>
                      <th className="text-left p-3 font-medium text-gray-600">余额</th>
                      <th className="text-left p-3 font-medium text-gray-600">注册时间</th>
                      <th className="text-left p-3 font-medium text-gray-600">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium">{user.username}</div>
                        </td>
                        <td className="p-3 text-gray-600">{user.phone || '-'}</td>
                        <td className="p-3">
                          <Badge className={
                            user.role === 'admin' ? 'bg-red-100 text-red-700' :
                            user.role === 'branch' ? 'bg-blue-100 text-blue-700' :
                            user.role === 'provider' ? 'bg-purple-100 text-purple-700' :
                            'bg-green-100 text-green-700'
                          }>
                            {user.roleName}
                          </Badge>
                        </td>
                        <td className="p-3 text-gray-600">{user.branchName || '-'}</td>
                        <td className="p-3 text-gray-600">{user.providerName || '-'}</td>
                        <td className="p-3">
                          <span className="text-orange-600 font-medium">{Number(user.balance || 0).toLocaleString()}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-green-600 font-medium">¥{Number(user.balance || 0).toLocaleString()}</span>
                        </td>
                        <td className="p-3 text-gray-500 text-sm">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => loadMemberDetail(user.id)}
                            >
                              <Eye className="w-4 h-4 mr-1" />详情
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              onClick={() => handleResetPassword(user.id, user.username)}
                            >
                              <Key className="w-4 h-4 mr-1" />重置
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无用户数据</p>
                <Button size="sm" variant="outline" className="mt-4" onClick={loadAllUsers}>
                  加载用户列表
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 会员详情弹窗 */}
        {selectedMemberId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeMemberDetail}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              {memberDetailLoading ? (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                  <span className="ml-3 text-gray-500">加载中...</span>
                </div>
              ) : memberDetail ? (
                <div className="flex flex-col h-full">
                  {/* 头部 */}
                  <div className="p-6 border-b bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold">{memberDetail.user.username}</h3>
                        <p className="text-sm text-gray-500 mt-1">{memberDetail.user.phone} · {memberDetail.user.branchName} · {memberDetail.user.providerName}</p>
                      </div>
                      <button onClick={closeMemberDetail} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                    </div>
                    {/* 统计卡片 */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4">
                      <div className="bg-white rounded-lg p-3 border">
                        <div className="text-xs text-gray-500">收益余额</div>
                        <div className="text-lg font-bold text-orange-600">{Number(memberDetail.stats.energyBalance || 0).toLocaleString()}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border">
                        <div className="text-xs text-gray-500">累计充值</div>
                        <div className="text-lg font-bold text-green-600">{Number(memberDetail.stats.energyTotalIn || 0).toLocaleString()}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border">
                        <div className="text-xs text-gray-500">累计转出</div>
                        <div className="text-lg font-bold text-red-600">{Number(memberDetail.stats.energyTotalOut || 0).toLocaleString()}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border">
                        <div className="text-xs text-gray-500">购买次数</div>
                        <div className="text-lg font-bold text-blue-600">{memberDetail.stats.buyCount}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border">
                        <div className="text-xs text-gray-500">持有产品</div>
                        <div className="text-lg font-bold text-purple-600">{memberDetail.stats.holdingCount}</div>
                      </div>
                    </div>
                  </div>
                  {/* 子Tab */}
                  <div className="flex border-b px-6 pt-2">
                    <button
                      onClick={() => setMemberDetailTab('holdings')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        memberDetailTab === 'holdings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >持仓记录 ({memberDetail.holdings?.length || 0})</button>
                    <button
                      onClick={() => setMemberDetailTab('orders')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        memberDetailTab === 'orders' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >订单记录 ({memberDetail.orders?.length || 0})</button>
                    <button
                      onClick={() => setMemberDetailTab('energy')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        memberDetailTab === 'energy' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >收益流水 ({memberDetail.energyRecords?.length || 0})</button>
                  </div>
                  {/* 内容 */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {/* 持仓记录 */}
                    {memberDetailTab === 'holdings' && (
                      memberDetail.holdings?.length > 0 ? (
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="text-left p-2 text-sm text-gray-600">产品</th>
                              <th className="text-left p-2 text-sm text-gray-600">周期</th>
                              <th className="text-left p-2 text-sm text-gray-600">购买价</th>
                              <th className="text-left p-2 text-sm text-gray-600">预期收益</th>
                              <th className="text-left p-2 text-sm text-gray-600">市场费</th>
                              <th className="text-left p-2 text-sm text-gray-600">购买日期</th>
                              <th className="text-left p-2 text-sm text-gray-600">状态</th>
                            </tr>
                          </thead>
                          <tbody>
                            {memberDetail.holdings.map((h: any) => (
                              <tr key={h.id} className="border-b hover:bg-gray-50">
                                <td className="p-2 text-sm">{h.productName}</td>
                                <td className="p-2 text-sm">{h.period}天</td>
                                <td className="p-2 text-sm font-medium">¥{Number(h.purchasePrice).toLocaleString()}</td>
                                <td className="p-2 text-sm text-green-600">¥{Number(h.expectedProfit).toLocaleString()}</td>
                                <td className="p-2 text-sm text-orange-600">¥{Number(h.marketFee).toLocaleString()}</td>
                                <td className="p-2 text-sm text-gray-500">{h.purchaseDate ? new Date(h.purchaseDate).toLocaleDateString() : '-'}</td>
                                <td className="p-2">
                                  <Badge className={
                                    h.status === 'holding' ? 'bg-green-100 text-green-700' :
                                    h.status === 'expired' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'
                                  }>
                                    {h.status === 'holding' ? '持有中' : h.status === 'expired' ? '已到期' : h.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : <div className="text-center py-8 text-gray-400">暂无持仓记录</div>
                    )}
                    {/* 订单记录 */}
                    {memberDetailTab === 'orders' && (
                      memberDetail.orders?.length > 0 ? (
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="text-left p-2 text-sm text-gray-600">类型</th>
                              <th className="text-left p-2 text-sm text-gray-600">金额</th>
                              <th className="text-left p-2 text-sm text-gray-600">状态</th>
                              <th className="text-left p-2 text-sm text-gray-600">时间</th>
                            </tr>
                          </thead>
                          <tbody>
                            {memberDetail.orders.map((o: any) => (
                              <tr key={o.id} className="border-b hover:bg-gray-50">
                                <td className="p-2 text-sm">
                                  <Badge className={o.orderType === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                    {o.orderType === 'buy' ? '购买' : '卖出'}
                                  </Badge>
                                </td>
                                <td className="p-2 text-sm font-medium">¥{Number(o.amount).toLocaleString()}</td>
                                <td className="p-2 text-sm">
                                  <Badge className={
                                    o.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'
                                  }>
                                    {o.status === 'completed' ? '已完成' : o.status === 'pending' ? '待处理' : o.status}
                                  </Badge>
                                </td>
                                <td className="p-2 text-sm text-gray-500">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : <div className="text-center py-8 text-gray-400">暂无订单记录</div>
                    )}
                    {/* 收益流水 */}
                    {memberDetailTab === 'energy' && (
                      memberDetail.energyRecords?.length > 0 ? (
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="text-left p-2 text-sm text-gray-600">类型</th>
                              <th className="text-left p-2 text-sm text-gray-600">金额</th>
                              <th className="text-left p-2 text-sm text-gray-600">时间</th>
                            </tr>
                          </thead>
                          <tbody>
                            {memberDetail.energyRecords.map((e: any) => {
                              const typeMap: Record<string, string> = {
                                create: '系统创建', quota_match: '额度匹配', purchase: '购买',
                                transfer_in: '转入', transfer_out: '转出', withdraw_freeze: '变现冻结',
                                withdraw: '变现发放', burn: '销毁', recharge: '充值',
                              };
                              const isIn = ['create', 'quota_match', 'transfer_in', 'recharge'].includes(e.type);
                              return (
                                <tr key={e.id} className="border-b hover:bg-gray-50">
                                  <td className="p-2 text-sm">
                                    <Badge className={isIn ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                      {typeMap[e.type] || e.type}
                                    </Badge>
                                  </td>
                                  <td className={`p-2 text-sm font-medium ${isIn ? 'text-green-600' : 'text-red-600'}`}>
                                    {isIn ? '+' : '-'}{Number(e.amount).toLocaleString()}
                                  </td>
                                  <td className="p-2 text-sm text-gray-500">{e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '-'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : <div className="text-center py-8 text-gray-400">暂无收益流水</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-gray-400">加载失败</div>
              )}
            </div>
          </div>
        )}
      </div>
    );

    // 渲染当前Tab内容
    const renderTabContent = () => {
      switch (memberTab) {
        case 'upgrade': return renderUpgradeAuditTab();
        case 'energy': return renderEnergyManageTab();
        case 'stats': return renderMemberStatsTab();
        case 'users': return renderUsersManagementTab();
        default: return renderUpgradeAuditTab();
      }
    };

    return (
      <div className="space-y-6 relative z-10">
        {/* 子Tab导航 */}
        <div className="flex gap-1">
          <button
            onClick={() => setMemberTab('upgrade')}
            className={`px-4 py-2 rounded-t-md transition-colors cursor-pointer relative z-10 ${
              memberTab === 'upgrade' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            升级审核
            {upgradeAuditList.length > 0 && (
              <Badge className="ml-2 bg-red-500 text-white text-xs">{upgradeAuditList.length}</Badge>
            )}
          </button>
          <button
            onClick={() => setMemberTab('energy')}
            className={`px-4 py-2 rounded-t-md transition-colors cursor-pointer relative z-10 ${
              memberTab === 'energy' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            市场费分配
          </button>
          <button
            onClick={() => setMemberTab('stats')}
            className={`px-4 py-2 rounded-t-md transition-colors cursor-pointer relative z-10 ${
              memberTab === 'stats' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            会员统计
          </button>
          <button
            onClick={() => { setMemberTab('users'); loadAllUsers(); }}
            className={`px-4 py-2 rounded-t-md transition-colors cursor-pointer relative z-10 ${
              memberTab === 'users' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            用户管理
          </button>
        </div>
        {renderTabContent()}
      </div>
    );
  });

  // 渲染会员审核
  const renderMemberAudit = () => (
    <Card>
      <CardHeader>
        <CardTitle>会员审核</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-gray-500">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">暂无待审核的会员</p>
          <p className="text-sm">新注册会员将在此显示</p>
        </div>
      </CardContent>
    </Card>
  );

  // 渲染订单统计
  const renderOrderStats = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>订单统计</CardTitle>
          <div className="flex items-center gap-2">
            <Label>时间范围：</Label>
            <Input type="month" defaultValue="2025-04" className="w-40" />
            <Button variant="outline" size="sm"><Printer className="w-4 h-4 mr-1" />打印</Button>
            <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />导出</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`} />
              <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="订单金额" fill="#ef4444" name="订单金额" />
              <Bar dataKey="收益金额" fill="#3b82f6" name="收益金额" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-center">
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-500">总订单数</p>
            <p className="text-2xl font-bold text-purple-600">{stats.total_orders}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-500">总金额</p>
            <p className="text-2xl font-bold text-blue-600">¥{(stats.total_revenue / 10000).toFixed(0)}万</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-500">已完成</p>
            <p className="text-2xl font-bold text-green-600">{orders.filter(o => o.status === 'completed').length}</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-500">待处理</p>
            <p className="text-2xl font-bold text-orange-600">{stats.pending_sell_count}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // 渲染收益统计
  const renderRevenueStats = () => (
    <Card>
      <CardHeader>
        <CardTitle>收益统计</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`} />
              <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
              <Legend />
              <Line type="monotone" dataKey="收益金额" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  // 渲染收益总览
  const renderIncomeOverview = () => (
    <div className="space-y-3 md:space-y-6">
      {/* 子Tab导航 - 左侧标题 + 右侧Tab样式 */}
      <div className="flex items-stretch bg-gradient-to-r from-purple-900 to-purple-800 rounded-lg overflow-hidden">
        {/* 左侧标题 */}
        <div className="flex items-center gap-3 px-6 py-4 bg-purple-950/50">
          <TrendingUp className="w-5 h-5 text-white" />
          <span className="text-white font-semibold text-lg">市场费分配</span>
        </div>
        {/* 右侧Tab选项 - 简化版3Tab */}
        <div className="flex items-center gap-1 px-4">
          <button
            onClick={() => setIncomeTab('overview')}
            className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
              incomeTab === 'overview' ? 'bg-purple-500 text-white' : 'bg-purple-800/50 text-white/80 hover:bg-purple-700'
            }`}
          >
            收益总览
          </button>
          <button
            onClick={() => setIncomeTab('detail')}
            className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
              incomeTab === 'detail' ? 'bg-purple-500 text-white' : 'bg-purple-800/50 text-white/80 hover:bg-purple-700'
            }`}
          >
            收益明细
          </button>
          <button
            onClick={() => setIncomeTab('withdraw')}
            className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
              incomeTab === 'withdraw' ? 'bg-purple-500 text-white' : 'bg-purple-800/50 text-white/80 hover:bg-purple-700'
            }`}
          >
            提现管理
          </button>
        </div>
      </div>
      
      {/* 收益总览内容 */}
      {incomeTab === 'overview' && (
        <>
          {/* 统计卡片 - 市场费总额 + 今日 + 订单数 + 销售额 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <Card className="mobile-compact-card bg-gradient-to-br from-purple-500 to-purple-700 text-white">
              <CardContent className="p-4">
                <div className="text-sm opacity-80 mobile-label">市场费总额</div>
                <div className="text-3xl font-bold mt-1 mobile-num">¥{incomeStats.totalIncome.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="mobile-compact-card bg-gradient-to-br from-green-500 to-green-700 text-white">
              <CardContent className="p-4">
                <div className="text-sm opacity-80 mobile-label">今日市场费</div>
                <div className="text-3xl font-bold mt-1 mobile-num">¥{incomeStats.todayIncome.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="mobile-compact-card bg-gradient-to-br from-orange-500 to-orange-700 text-white">
              <CardContent className="p-4">
                <div className="text-sm opacity-80 mobile-label">总订单数</div>
                <div className="text-3xl font-bold mt-1 mobile-num">{incomeStats.totalOrders || 0}</div>
              </CardContent>
            </Card>
            <Card className="mobile-compact-card bg-gradient-to-br from-blue-500 to-blue-700 text-white">
              <CardContent className="p-4">
                <div className="text-sm opacity-80 mobile-label">总销售额</div>
                <div className="text-3xl font-bold mt-1 mobile-num">¥{(incomeStats.totalSales || 0).toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          {/* 5%分润分配比例卡片 - 使用真实分配数据 */}
          <div className="grid grid-cols-6 gap-2 md:gap-3">
            <Card className="mobile-compact-card text-center">
              <CardContent className="p-3">
                <div className="text-xs text-gray-500 mobile-label">会员 {shareBreakdown.member.rate}</div>
                <div className="text-lg font-bold text-blue-600 mobile-num">¥{shareBreakdown.member.amount.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="mobile-compact-card text-center">
              <CardContent className="p-3">
                <div className="text-xs text-gray-500 mobile-label">服务商 {shareBreakdown.provider.rate}</div>
                <div className="text-lg font-bold text-purple-600 mobile-num">¥{shareBreakdown.provider.amount.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="mobile-compact-card text-center">
              <CardContent className="p-3">
                <div className="text-xs text-gray-500 mobile-label">直推奖励 {shareBreakdown.directReward.rate}</div>
                <div className="text-lg font-bold text-pink-600 mobile-num">¥{shareBreakdown.directReward.amount.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="mobile-compact-card text-center">
              <CardContent className="p-3">
                <div className="text-xs text-gray-500 mobile-label">下级服务商 {shareBreakdown.parentProvider.rate}</div>
                <div className="text-lg font-bold text-indigo-600 mobile-num">¥{shareBreakdown.parentProvider.amount.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="mobile-compact-card text-center">
              <CardContent className="p-3">
                <div className="text-xs text-gray-500 mobile-label">服务网点 {shareBreakdown.branch.rate}</div>
                <div className="text-lg font-bold text-teal-600 mobile-num">¥{shareBreakdown.branch.amount.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="mobile-compact-card text-center">
              <CardContent className="p-3">
                <div className="text-xs text-gray-500 mobile-label">智算中心运营 {shareBreakdown.company.rate}</div>
                <div className="text-lg font-bold text-emerald-600 mobile-num">¥{shareBreakdown.company.amount.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          {/* 收益趋势图表 */}
          <Card>
            <CardHeader>
              <CardTitle>收益趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => value >= 10000 ? `${(value / 10000).toFixed(0)}万` : `${value}`} />
                    <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="收益金额" stroke="#8b5cf6" strokeWidth={2} name="收益金额" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 收益来源分布 - 市场费分配比例 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
            <Card>
              <CardHeader>
                <CardTitle>市场费分配比例</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={[
                          { name: `会员 ${shareBreakdown.member.rate}`, value: Math.max(shareBreakdown.member.amount, 1), color: '#3b82f6' },
                          { name: `服务商 ${shareBreakdown.provider.rate}`, value: Math.max(shareBreakdown.provider.amount, 1), color: '#8b5cf6' },
                          { name: `直推奖励 ${shareBreakdown.directReward.rate}`, value: Math.max(shareBreakdown.directReward.amount, 1), color: '#ec4899' },
                          { name: `下级服务商 ${shareBreakdown.parentProvider.rate}`, value: Math.max(shareBreakdown.parentProvider.amount, 1), color: '#6366f1' },
                          { name: `服务网点 ${shareBreakdown.branch.rate}`, value: Math.max(shareBreakdown.branch.amount, 1), color: '#14b8a6' },
                          { name: `智算中心运营 ${shareBreakdown.company.rate}`, value: Math.max(shareBreakdown.company.amount, 1), color: '#10b981' },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { color: '#8b5cf6' },
                          { color: '#ec4899' },
                          { color: '#6366f1' },
                          { color: '#14b8a6' },
                          { color: '#10b981' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>服务商收益排行 TOP5</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {providers.slice(0, 5).map((p: any, idx: number) => {
                    const balance = p.balance || 0;
                    const maxBalance = (providers[0] as any)?.balance || 1;
                    const percent = Math.max(Math.round((balance / maxBalance) * 100), 5);
                    return (
                      <div key={p.id || idx} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-yellow-500 text-white' :
                          idx === 1 ? 'bg-gray-400 text-white' :
                          idx === 2 ? 'bg-amber-600 text-white' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm">
                            <span>{p.username || p.name || `服务商${idx + 1}`}</span>
                            <span className="font-medium">{balance.toLocaleString()} 收益</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div
                              className="bg-purple-600 h-1.5 rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {providers.length === 0 && (
                    <div className="text-center text-gray-400 py-4">暂无服务商数据</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );

  // 渲染收益明细
  // 渲染收益明细
  const renderIncomeDetail = () => (
    <div className="space-y-3 md:space-y-6">
      {/* 子Tab导航 - 左侧标题 + 右侧Tab样式 */}
      <div className="flex items-stretch bg-gradient-to-r from-purple-900 to-purple-800 rounded-lg overflow-hidden">
        {/* 左侧标题 */}
        <div className="flex items-center gap-3 px-6 py-4 bg-purple-950/50">
          <TrendingUp className="w-5 h-5 text-white" />
          <span className="text-white font-semibold text-lg">市场费分配</span>
        </div>
        {/* 右侧Tab选项 - 简化版3Tab */}
        <div className="flex items-center gap-1 px-4">
          <button
            onClick={() => setIncomeTab('overview')}
            className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
              incomeTab === 'overview' ? 'bg-purple-500 text-white' : 'bg-purple-800/50 text-white/80 hover:bg-purple-700'
            }`}
          >
            收益总览
          </button>
          <button
            onClick={() => setIncomeTab('detail')}
            className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
              incomeTab === 'detail' ? 'bg-purple-500 text-white' : 'bg-purple-800/50 text-white/80 hover:bg-purple-700'
            }`}
          >
            收益明细
          </button>
          <button
            onClick={() => setIncomeTab('withdraw')}
            className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
              incomeTab === 'withdraw' ? 'bg-purple-500 text-white' : 'bg-purple-800/50 text-white/80 hover:bg-purple-700'
            }`}
          >
            提现管理
          </button>
        </div>
      </div>

      {/* 收益明细内容 - 每笔购买订单的市场费分配 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>收益明细（市场费分配）</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => loadIncomeData('detail')}>
                <RefreshCw className="w-4 h-4 mr-2" />刷新
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>产品</TableHead>
                <TableHead>购买价</TableHead>
                <TableHead>市场费</TableHead>
                <TableHead>会员2%</TableHead>
                <TableHead>直推0.25%</TableHead>
                <TableHead>服务商2%</TableHead>
                <TableHead>上级0.25%</TableHead>
                <TableHead>网点0.1%</TableHead>
                <TableHead>运营0.40%</TableHead>
                <TableHead>买家</TableHead>
                <TableHead>服务商</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomeRecords.length > 0 ? incomeRecords.map((record: any) => (
                <TableRow key={record.id}>
                  <TableCell className="font-mono text-sm whitespace-nowrap">{record.date?.substring(0, 10)}</TableCell>
                  <TableCell>
                    <div className="text-sm">{record.productName || '-'}</div>
                    <div className="text-xs text-gray-400">{record.period}天</div>
                  </TableCell>
                  <TableCell className="font-medium">¥{(record.purchasePrice || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-purple-600 font-medium">¥{(record.marketFee || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-purple-500">¥{(record.shareDetail?.member || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-purple-500">¥{(record.shareDetail?.directReward || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-purple-500">¥{(record.shareDetail?.provider || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-teal-500">¥{(record.shareDetail?.parentProvider || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-emerald-500">¥{(record.shareDetail?.branch || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-emerald-500">¥{(record.shareDetail?.company || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{record.buyerName || '-'}</TableCell>
                  <TableCell className="text-sm">{record.providerName || '-'}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-gray-400 py-8">
                    {incomeLoading ? '加载中...' : '暂无收益记录'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // 渲染提现管理（市场费分配Tab）
  const renderWithdrawManagement = () => (
    <div className="space-y-3 md:space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card className="mobile-compact-card bg-gradient-to-br from-purple-500 to-purple-700 text-white">
          <CardContent className="p-4">
            <div className="text-sm opacity-80 mobile-label">待审核</div>
            <div className="text-3xl font-bold mt-1 mobile-num">{withdrawStats.pendingCount || 0}</div>
          </CardContent>
        </Card>
        <Card className="mobile-compact-card bg-gradient-to-br from-orange-500 to-orange-700 text-white">
          <CardContent className="p-4">
            <div className="text-sm opacity-80 mobile-label">待发放</div>
            <div className="text-3xl font-bold mt-1 mobile-num">¥{(withdrawStats.pendingAmount || 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="mobile-compact-card bg-gradient-to-br from-green-500 to-green-700 text-white">
          <CardContent className="p-4">
            <div className="text-sm opacity-80 mobile-label">已发放</div>
            <div className="text-3xl font-bold mt-1 mobile-num">¥{(withdrawStats.actualPaid || 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="mobile-compact-card bg-gradient-to-br from-blue-500 to-blue-700 text-white">
          <CardContent className="p-4">
            <div className="text-sm opacity-80 mobile-label">本月总额</div>
            <div className="text-3xl font-bold mt-1 mobile-num">¥{(withdrawStats.todayAmount || 0).toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* 提现申请表格 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>提现申请列表</CardTitle>
            <Button variant="outline" onClick={() => loadIncomeData('withdraw')}>
              <RefreshCw className="w-4 h-4 mr-2" />刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>申请时间</TableHead>
                <TableHead>申请人</TableHead>
                <TableHead>提现金额</TableHead>
                <TableHead>手续费(5%)</TableHead>
                <TableHead>实发金额</TableHead>
                <TableHead>支付宝</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                    暂无提现申请记录
                  </TableCell>
                </TableRow>
              ) : withdrawList.map((w: any) => (
                <TableRow key={w.id}>
                  <TableCell className="text-xs">{w.createdAt?.substring(0, 16) || '-'}</TableCell>
                  <TableCell>{w.username || w.userId?.substring(0, 8) || '-'}</TableCell>
                  <TableCell>¥{(w.amount || 0).toLocaleString()}</TableCell>
                  <TableCell>¥{(w.fee || 0).toLocaleString()}</TableCell>
                  <TableCell>¥{(w.actualAmount || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{w.alipayAccount || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={w.status === 'pending' ? 'outline' : w.status === 'approved' ? 'default' : 'secondary'}>
                      {w.status === 'pending' ? '待审核' : w.status === 'approved' ? '已通过' : w.status === 'rejected' ? '已拒绝' : w.status === 'completed' ? '已发放' : w.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {w.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="default" onClick={async () => {
                          await authFetch('/api/withdrawals/confirm', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ withdrawalId: w.id, action: 'approve' }),
                          });
                          loadIncomeData('withdraw');
                        }}>通过</Button>
                        <Button size="sm" variant="destructive" onClick={async () => {
                          await authFetch('/api/withdrawals/confirm', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ withdrawalId: w.id, action: 'reject' }),
                          });
                          loadIncomeData('withdraw');
                        }}>拒绝</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // 渲染财务管理（不使用内部状态，通过父组件financeTab管理）
  const FinanceManagementPanel = React.memo(() => {
    // 加载服务网点提现和手续费记录
    const [allWithdrawals, setAllWithdrawals] = useState<any[]>([]);
    const [withdrawRoleFilter, setWithdrawRoleFilter] = useState<string>('all');
    const [withdrawStats, setWithdrawStats] = useState<any>({});
    const [feeRecords, setFeeRecords] = useState<any[]>([]);
    const [feeStats, setFeeStats] = useState<any>({});
    const [financeLoading, setFinanceLoading] = useState(false);
    const [financeSubTab, setFinanceSubTab] = useState<'overview' | 'withdraw-review' | 'fee-records' | 'transfer-balance' | 'revenue-account'>('overview');
    const [feeTypeFilter, setFeeTypeFilter] = useState<string>('all');
    const [feeRoleFilter, setFeeRoleFilter] = useState<string>('all');
    const [feeDateFrom, setFeeDateFrom] = useState<string>('');
    const [feeDateTo, setFeeDateTo] = useState<string>('');
    const [feeSearch, setFeeSearch] = useState<string>('');
    // 转智算金相关状态
    const [tbSearchQuery, setTbSearchQuery] = useState('');
    const [tbSearchResults, setTbSearchResults] = useState<any[]>([]);
    const [tbSearching, setTbSearching] = useState(false);
    const [tbSelectedUser, setTbSelectedUser] = useState<any>(null);
    const [tbAmount, setTbAmount] = useState('');
    const [tbNote, setTbNote] = useState('');
    const [tbTransferring, setTbTransferring] = useState(false);
    const [tbTransferResult, setTbTransferResult] = useState<any>(null);
    // 收益账户状态
    const [adminAccount, setAdminAccount] = useState<any>(null);

    const loadFinanceData = async () => {
      setFinanceLoading(true);
      try {
        const [withdrawalRes, feeRes, adminRes] = await Promise.all([
          authFetch('/api/withdrawals?tab=review'),
          authFetch('/api/admin/fee-records'),
          authFetch('/api/admin/accounts?search=&role=admin'),
        ]);
        const withdrawalData = await withdrawalRes.json();
        const feeData = await feeRes.json();
        const adminData = await adminRes.json();
        if (withdrawalData.success) {
          setAllWithdrawals(withdrawalData.data?.records || []);
          setWithdrawStats(withdrawalData.data?.stats || {});
        }
        if (feeData.success) {
          setFeeRecords(feeData.data?.records || []);
          setFeeStats(feeData.data?.stats || {});
        }
        if (adminData.success && adminData.data?.users?.length > 0) {
          setAdminAccount(adminData.data.users[0]);
        }
      } catch (err) {
        console.error('加载财务数据失败', err);
      } finally {
        setFinanceLoading(false);
      }
    };

    const handleReviewBranchWithdrawal = async (withdrawalId: string, action: string) => {
      try {
        const res = await authFetch('/api/withdrawals/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ withdrawalId, action }),
        });
        const data = await res.json();
        if (data.success) {
          alert(data.message || '操作成功');
          loadFinanceData();
        } else {
          alert(data.message || '操作失败');
        }
      } catch (err) {
        alert('网络错误');
      }
    };

    // 转智算金 - 搜索用户
    const handleTbSearch = async () => {
      if (!tbSearchQuery.trim()) return;
      setTbSearching(true);
      setTbSearchResults([]);
      try {
        const res = await authFetch(`/api/users/search?q=${encodeURIComponent(tbSearchQuery.trim())}`);
        const data = await res.json();
        if (data.success) {
          setTbSearchResults(data.data || []);
        }
      } catch { setTbSearchResults([]); }
      finally { setTbSearching(false); }
    };

    // 转智算金 - 执行转账
    const handleTbTransfer = async () => {
      if (!tbSelectedUser || !tbAmount) return;
      const amt = parseFloat(tbAmount);
      if (isNaN(amt) || amt <= 0) { alert('请输入有效金额'); return; }
      if (!confirm(`确认向 ${tbSelectedUser.username} 转入 ${amt} 智算金？`)) return;
      setTbTransferring(true);
      setTbTransferResult(null);
      try {
        const res = await authFetch('/api/admin/transfer-balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toUserId: tbSelectedUser.id, amount: amt, note: tbNote }),
        });
        const data = await res.json();
        if (data.success) {
          setTbTransferResult(data);
          setTbAmount('');
          setTbNote('');
        } else {
          alert(data.error || '转账失败');
        }
      } catch { alert('网络错误'); }
      finally { setTbTransferring(false); }
    };

    useEffect(() => { loadFinanceData(); }, []);

    const totalFee = Number(feeStats.total_fee || 0);
    const withdrawFee = Number(feeStats.total_withdrawal_fee || 0);
    const marketFeeOps = Number(feeStats.total_market_fee_ops || 0);
    const pendingWithdrawals = allWithdrawals.filter((w: any) => w.status === 'pending');

    return (
      <div className="space-y-3 md:space-y-6">
        {/* 子Tab导航 */}
        <div className="flex items-stretch bg-gradient-to-r from-purple-900 to-purple-800 rounded-lg overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 bg-purple-950/50">
            <Wallet className="w-5 h-5 text-white" />
            <span className="text-white font-semibold text-lg">财务管理</span>
          </div>
          <div className="flex items-center gap-1 px-4">
            <button onClick={() => setFinanceSubTab('overview')} className={`px-4 py-2 rounded-md transition-colors ${financeSubTab === 'overview' ? 'bg-purple-500 text-white' : 'bg-purple-800/50 text-white/80 hover:bg-purple-700'}`}>财务总览</button>
            <button onClick={() => setFinanceSubTab('withdraw-review')} className={`px-4 py-2 rounded-md transition-colors flex items-center gap-1 ${financeSubTab === 'withdraw-review' ? 'bg-purple-500 text-white' : 'bg-purple-800/50 text-white/80 hover:bg-purple-700'}`}>提现记录{pendingWithdrawals.length > 0 && <Badge className="bg-red-500 text-white text-xs ml-1">{pendingWithdrawals.length}</Badge>}</button>
            <button onClick={() => setFinanceSubTab('fee-records')} className={`px-4 py-2 rounded-md transition-colors ${financeSubTab === 'fee-records' ? 'bg-purple-500 text-white' : 'bg-purple-800/50 text-white/80 hover:bg-purple-700'}`}>手续费记录</button>
            <button onClick={() => setFinanceSubTab('transfer-balance')} className={`px-4 py-2 rounded-md transition-colors ${financeSubTab === 'transfer-balance' ? 'bg-purple-500 text-white' : 'bg-purple-800/50 text-white/80 hover:bg-purple-700'}`}>转智算金</button>
            <button onClick={() => setFinanceSubTab('revenue-account')} className={`px-4 py-2 rounded-md transition-colors ${financeSubTab === 'revenue-account' ? 'bg-purple-500 text-white' : 'bg-purple-800/50 text-white/80 hover:bg-purple-700'}`}>收益账户</button>
          </div>
        </div>

        {financeSubTab === 'overview' && (
          <>
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              <Card className="mobile-compact-card bg-gradient-to-br from-purple-500 to-purple-700 text-white">
                <CardContent className="p-4">
                  <div className="text-sm opacity-80">累计手续费沉淀</div>
                  <div className="text-3xl font-bold mt-1">¥{totalFee.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="mobile-compact-card bg-gradient-to-br from-green-500 to-green-700 text-white">
                <CardContent className="p-4">
                  <div className="text-sm opacity-80">提现手续费</div>
                  <div className="text-3xl font-bold mt-1">¥{withdrawFee.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="mobile-compact-card bg-gradient-to-br from-orange-500 to-orange-700 text-white">
                <CardContent className="p-4">
                  <div className="text-sm opacity-80">市场费运营沉淀</div>
                  <div className="text-3xl font-bold mt-1">¥{marketFeeOps.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="mobile-compact-card bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                <CardContent className="p-4">
                  <div className="text-sm opacity-80">待审核提现</div>
                  <div className="text-3xl font-bold mt-1">{pendingWithdrawals.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* 最近手续费记录 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>最近手续费记录</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setFinanceSubTab('fee-records')}>查看全部</Button>
                </div>
              </CardHeader>
              <CardContent>
                {feeRecords.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>时间</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>金额</TableHead>
                        <TableHead>来源角色</TableHead>
                        <TableHead>说明</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeRecords.slice(0, 10).map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>{r.type === 'withdrawal_fee' ? '提现手续费' : r.type === 'market_fee_ops' ? '市场费运营' : r.type}</TableCell>
                          <TableCell className="text-green-600 font-medium">+¥{Number(r.amount).toLocaleString()}</TableCell>
                          <TableCell>{r.source_role === 'member' ? '会员' : r.source_role === 'provider' ? '服务商' : r.source_role === 'branch' ? '服务网点' : r.source_role}</TableCell>
                          <TableCell className="text-sm text-gray-500 max-w-xs truncate">{r.note || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-500 text-center py-8">暂无手续费记录</p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {financeSubTab === 'withdraw-review' && (() => {
          // 角色筛选
          const filteredWithdrawals = allWithdrawals.filter((w: any) => {
            if (withdrawRoleFilter !== 'all') {
              const wRole = w.user_role || w.user_role_name;
              if (withdrawRoleFilter !== wRole) return false;
            }
            return true;
          });
          const roleLabel = (r: string) => r === 'member' ? '会员' : r === 'provider' ? '服务商' : r === 'branch' ? '服务网点' : r || '未知';
          const roleBadgeColor = (r: string) => r === 'member' ? 'bg-blue-500' : r === 'provider' ? 'bg-purple-500' : r === 'branch' ? 'bg-orange-500' : 'bg-gray-500';
          // 统计
          const memberW = allWithdrawals.filter(w => (w.user_role || w.user_role_name) === 'member');
          const providerW = allWithdrawals.filter(w => (w.user_role || w.user_role_name) === 'provider');
          const branchW = allWithdrawals.filter(w => (w.user_role || w.user_role_name) === 'branch');

          return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5" />
                  提现记录
                </CardTitle>
                <div className="flex gap-2 items-center">
                  <select value={withdrawRoleFilter} onChange={(e) => setWithdrawRoleFilter(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm bg-white">
                    <option value="all">全部角色</option>
                    <option value="member">会员</option>
                    <option value="provider">服务商</option>
                    <option value="branch">服务网点</option>
                  </select>
                  <Button variant="outline" size="sm" onClick={loadFinanceData} disabled={financeLoading}>
                    <RefreshCw className={`w-4 h-4 mr-1 ${financeLoading ? 'animate-spin' : ''}`} />刷新
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* 角色统计卡片 */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-blue-600 font-medium">会员提现</div>
                  <div className="text-lg font-bold text-blue-700">{memberW.length}笔</div>
                  <div className="text-xs text-blue-500">待审核: {memberW.filter(w => w.status === 'pending').length}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-purple-600 font-medium">服务商提现</div>
                  <div className="text-lg font-bold text-purple-700">{providerW.length}笔</div>
                  <div className="text-xs text-purple-500">待审核: {providerW.filter(w => w.status === 'pending').length}</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-orange-600 font-medium">网点提现</div>
                  <div className="text-lg font-bold text-orange-700">{branchW.length}笔</div>
                  <div className="text-xs text-orange-500">待审核: {branchW.filter(w => w.status === 'pending').length}</div>
                </div>
              </div>
              {filteredWithdrawals.length > 0 ? (
                <div className="space-y-4">
                  {filteredWithdrawals.map((w: any) => {
                    const wRole = w.user_role || w.user_role_name || 'unknown';
                    const isBranchWithdraw = wRole === 'branch';
                    return (
                    <div key={w.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{w.username || '用户'}</p>
                            <Badge className={roleBadgeColor(wRole)}>{roleLabel(wRole)}</Badge>
                          </div>
                          <p className="text-sm text-gray-500">{w.phone ? `${w.phone}` : ''} {w.created_at ? `· ${new Date(w.created_at).toLocaleString()}` : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-orange-600">¥{Number(w.amount).toLocaleString()}</p>
                          <p className="text-xs text-gray-500">手续费: ¥{Number(w.fee_amount || w.fee).toLocaleString()} | 实际: ¥{Number(w.actual_amount).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div className="text-gray-600"><span className="font-medium">支付宝:</span> {w.alipay_account || '-'}</div>
                        <div className="text-gray-600"><span className="font-medium">姓名:</span> {w.real_name || '-'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={w.status === 'pending' ? 'bg-yellow-500' : w.status === 'completed' || w.status === 'approved' || w.status === 'transferred' ? 'bg-green-500' : 'bg-red-500'}>
                          {w.status === 'pending' ? '待审核付款' : w.status === 'approved' ? '已完成' : w.status === 'transferred' ? '已完成' : w.status === 'completed' ? '已完成' : '已拒绝'}
                        </Badge>
                        {w.status === 'pending' && isBranchWithdraw && (
                          <div className="flex gap-2 ml-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleReviewBranchWithdrawal(w.id, 'approve')}>审核通过</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleReviewBranchWithdrawal(w.id, 'reject')}>拒绝</Button>
                          </div>
                        )}
                        {w.status === 'pending' && !isBranchWithdraw && (
                          <span className="text-xs text-gray-400 ml-2">（由服务网点审核）</span>
                        )}
                        {w.status === 'completed' && (
                          <span className="text-xs text-green-600 ml-2">已完成</span>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">暂无提现记录</p>
              )}
            </CardContent>
          </Card>
          );
        })()}

        {financeSubTab === 'fee-records' && (() => {
          // 筛选逻辑（使用组件级state）
          const filteredFeeRecords = feeRecords.filter((r: any) => {
            if (feeTypeFilter !== 'all') {
              if (feeTypeFilter === 'withdrawal_fee' && r.type !== 'withdrawal_fee') return false;
              if (feeTypeFilter === 'market_fee_ops' && r.type !== 'market_fee_ops') return false;
            }
            if (feeRoleFilter !== 'all' && r.source_role !== feeRoleFilter) return false;
            if (feeDateFrom && r.created_at && new Date(r.created_at) < new Date(feeDateFrom)) return false;
            if (feeDateTo && r.created_at && new Date(r.created_at) > new Date(feeDateTo + 'T23:59:59')) return false;
            if (feeSearch) {
              const s = feeSearch.toLowerCase();
              const matchNote = (r.note || '').toLowerCase().includes(s);
              const matchAmount = String(r.amount).includes(s);
              const matchRole = (r.source_role === 'member' ? '会员' : r.source_role === 'provider' ? '服务商' : r.source_role === 'branch' ? '服务网点' : r.source_role || '').includes(s);
              if (!matchNote && !matchAmount && !matchRole) return false;
            }
            return true;
          });

          // 统计筛选结果
          const filteredTotal = filteredFeeRecords.reduce((sum: number, r: any) => sum + Number(r.amount), 0);
          const filteredWithdrawFee = filteredFeeRecords.filter((r: any) => r.type === 'withdrawal_fee').reduce((sum: number, r: any) => sum + Number(r.amount), 0);
          const filteredMarketFee = filteredFeeRecords.filter((r: any) => r.type === 'market_fee_ops').reduce((sum: number, r: any) => sum + Number(r.amount), 0);

          return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle>手续费沉淀记录</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <div className="bg-green-50 px-3 py-1 rounded text-sm text-green-700">筛选合计: ¥{filteredTotal.toLocaleString()}</div>
                  <div className="bg-blue-50 px-3 py-1 rounded text-sm text-blue-700">提现手续费: ¥{filteredWithdrawFee.toLocaleString()}</div>
                  <div className="bg-orange-50 px-3 py-1 rounded text-sm text-orange-700">市场费运营: ¥{filteredMarketFee.toLocaleString()}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* 筛选栏 */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 font-medium">类型筛选</label>
                    <select value={feeTypeFilter} onChange={(e) => setFeeTypeFilter(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm bg-white">
                      <option value="all">全部类型</option>
                      <option value="withdrawal_fee">提现手续费</option>
                      <option value="market_fee_ops">市场费运营</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 font-medium">来源角色</label>
                    <select value={feeRoleFilter} onChange={(e) => setFeeRoleFilter(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm bg-white">
                      <option value="all">全部角色</option>
                      <option value="member">会员</option>
                      <option value="provider">服务商</option>
                      <option value="branch">服务网点</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 font-medium">开始日期</label>
                    <input type="date" value={feeDateFrom} onChange={(e) => setFeeDateFrom(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm bg-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 font-medium">结束日期</label>
                    <input type="date" value={feeDateTo} onChange={(e) => setFeeDateTo(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm bg-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500 font-medium">搜索</label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" placeholder="金额/说明/角色" value={feeSearch} onChange={(e) => setFeeSearch(e.target.value)} className="border rounded-md pl-8 pr-3 py-1.5 text-sm bg-white w-40" />
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setFeeTypeFilter('all'); setFeeRoleFilter('all'); setFeeDateFrom(''); setFeeDateTo(''); setFeeSearch(''); }} className="h-8">重置</Button>
                </div>
                <div className="text-xs text-gray-400">共 {filteredFeeRecords.length} 条记录</div>
              </div>

              {filteredFeeRecords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>时间</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>来源角色</TableHead>
                      <TableHead>说明</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFeeRecords.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</TableCell>
                        <TableCell>{r.type === 'withdrawal_fee' ? '提现手续费' : r.type === 'market_fee_ops' ? '市场费运营' : r.type}</TableCell>
                        <TableCell className="text-green-600 font-medium">+¥{Number(r.amount).toLocaleString()}</TableCell>
                        <TableCell>{r.source_role === 'member' ? '会员' : r.source_role === 'provider' ? '服务商' : r.source_role === 'branch' ? '服务网点' : r.source_role}</TableCell>
                        <TableCell className="text-sm text-gray-500 max-w-xs truncate">{r.note || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500 text-center py-8">暂无匹配的手续费记录</p>
              )}
            </CardContent>
          </Card>
          );
        })()}

        {financeSubTab === 'transfer-balance' && (
          <Card>
            <CardHeader>
              <CardTitle>转智算金</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">给任意账号直接转入智算金，即时到账</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 搜索用户 */}
              <div className="space-y-3">
                <label className="text-sm font-medium">搜索目标账号</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="输入用户名 / 手机号 / 专属ID"
                      value={tbSearchQuery}
                      onChange={(e) => setTbSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTbSearch()}
                      className="w-full border rounded-md pl-9 pr-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <Button onClick={handleTbSearch} disabled={tbSearching} size="sm">
                    {tbSearching ? '搜索中...' : '搜索'}
                  </Button>
                </div>

                {/* 搜索结果 */}
                {tbSearchResults.length > 0 && !tbSelectedUser && (
                  <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
                    {tbSearchResults.map((u: any) => {
                      const roleLabel = u.role === 'admin' ? '智算中心' : u.role === 'branch' ? '服务网点' : u.role === 'provider' ? '服务商' : '会员';
                      const roleColor = u.role === 'admin' ? 'bg-red-100 text-red-700' : u.role === 'branch' ? 'bg-blue-100 text-blue-700' : u.role === 'provider' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700';
                      return (
                        <div key={u.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer" onClick={() => { setTbSelectedUser(u); setTbSearchResults([]); setTbSearchQuery(''); setTbTransferResult(null); }}>
                          <div>
                            <span className="font-medium">{u.username}</span>
                            {u.unique_id && <span className="text-xs text-gray-400 ml-2">[{u.unique_id}]</span>}
                            {u.phone && <span className="text-xs text-gray-400 ml-2">({u.phone})</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${roleColor}`}>{roleLabel}</span>
                            <span className="text-xs text-gray-500">智算金: ¥{Number(u.balance || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {tbSearchResults.length === 0 && tbSearchQuery && !tbSearching && !tbSelectedUser && (
                  <p className="text-sm text-gray-400 text-center py-4">未找到匹配用户</p>
                )}
              </div>

              {/* 已选中用户 */}
              {tbSelectedUser && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-base">{tbSelectedUser.username}</span>
                        {tbSelectedUser.unique_id && <span className="text-sm text-gray-400 ml-2">[{tbSelectedUser.unique_id}]</span>}
                        {tbSelectedUser.phone && <span className="text-sm text-gray-400 ml-2">({tbSelectedUser.phone})</span>}
                        <span className={`text-xs px-2 py-0.5 rounded ml-2 ${tbSelectedUser.role === 'admin' ? 'bg-red-100 text-red-700' : tbSelectedUser.role === 'branch' ? 'bg-blue-100 text-blue-700' : tbSelectedUser.role === 'provider' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                          {tbSelectedUser.role === 'admin' ? '智算中心' : tbSelectedUser.role === 'branch' ? '服务网点' : tbSelectedUser.role === 'provider' ? '服务商' : '会员'}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => { setTbSelectedUser(null); setTbTransferResult(null); }}>重新选择</Button>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">当前智算金余额: ¥{Number(tbSelectedUser.balance || 0).toLocaleString()}</div>
                  </div>

                  {/* 输入金额和备注 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">转账金额（智算金）</label>
                      <input
                        type="number"
                        placeholder="请输入金额"
                        value={tbAmount}
                        onChange={(e) => setTbAmount(e.target.value)}
                        className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">备注（可选）</label>
                      <input
                        type="text"
                        placeholder="转账说明"
                        value={tbNote}
                        onChange={(e) => setTbNote(e.target.value)}
                        className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                      />
                    </div>
                  </div>

                  {/* 快捷金额 */}
                  <div className="flex gap-2 flex-wrap">
                    {[100, 500, 1000, 5000, 10000].map(v => (
                      <Button key={v} variant="outline" size="sm" onClick={() => setTbAmount(String(v))}>¥{v.toLocaleString()}</Button>
                    ))}
                  </div>

                  {/* 确认按钮 */}
                  <Button
                    onClick={handleTbTransfer}
                    disabled={tbTransferring || !tbAmount}
                    className="w-full md:w-auto"
                  >
                    {tbTransferring ? '转账中...' : `确认转入 ${tbAmount ? '¥' + parseFloat(tbAmount).toLocaleString() : ''} 智算金`}
                  </Button>

                  {/* 转账结果 */}
                  {tbTransferResult && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-800">转账成功</span>
                      </div>
                      <div className="text-sm text-green-700 space-y-1">
                        <p>转入账号: {tbTransferResult.data?.toUsername}</p>
                        <p>转入金额: ¥{Number(tbTransferResult.data?.amount).toLocaleString()}</p>
                        <p>最新余额: ¥{Number(tbTransferResult.data?.newBalance).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {financeSubTab === 'revenue-account' && (() => {
          const adminBalance = adminAccount ? Number(adminAccount.balance || 0) : 0;
          const adminPoints = adminAccount ? Number(adminAccount.points || 0) : 0;
          const withdrawFeeTotal = feeRecords.filter((r: any) => r.type === 'withdrawal_fee').reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
          const marketOpsTotal = feeRecords.filter((r: any) => r.type === 'market_fee_ops').reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-amber-500 to-amber-700 text-white">
                  <CardContent className="p-4">
                    <div className="text-sm opacity-80">智算中心智算金余额</div>
                    <div className="text-3xl font-bold mt-1">¥{adminBalance.toLocaleString()}</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                  <CardContent className="p-4">
                    <div className="text-sm opacity-80">提现手续费收入</div>
                    <div className="text-3xl font-bold mt-1">¥{withdrawFeeTotal.toLocaleString()}</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-500 to-green-700 text-white">
                  <CardContent className="p-4">
                    <div className="text-sm opacity-80">市场费运营沉淀</div>
                    <div className="text-3xl font-bold mt-1">¥{marketOpsTotal.toLocaleString()}</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500 to-purple-700 text-white">
                  <CardContent className="p-4">
                    <div className="text-sm opacity-80">智算中心积分余额</div>
                    <div className="text-3xl font-bold mt-1">{adminPoints.toLocaleString()}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>收益来源明细</CardTitle>
                </CardHeader>
                <CardContent>
                  {feeRecords.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>时间</TableHead>
                          <TableHead>来源类型</TableHead>
                          <TableHead>金额</TableHead>
                          <TableHead>来源角色</TableHead>
                          <TableHead>说明</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feeRecords.map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-sm">{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={r.type === 'withdrawal_fee' ? 'border-blue-300 text-blue-600' : r.type === 'market_fee_ops' ? 'border-green-300 text-green-600' : 'border-gray-300'}>
                                {r.type === 'withdrawal_fee' ? '提现手续费' : r.type === 'market_fee_ops' ? '市场费运营' : r.type === 'admin_transfer_in' ? '智算金转入' : r.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-green-600 font-medium">+¥{Number(r.amount).toLocaleString()}</TableCell>
                            <TableCell>
                              {r.source_role === 'member' ? '会员' : r.source_role === 'provider' ? '服务商' : r.source_role === 'branch' ? '服务网点' : r.source_role || '-'}
                            </TableCell>
                            <TableCell className="text-sm text-gray-500 max-w-xs truncate">{r.note || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-gray-500 text-center py-8">暂无收益记录</p>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })()}
      </div>
    );
  });

  // 渲染用户统计
  const renderUserStats = () => (
    <Card>
      <CardHeader>
        <CardTitle>用户统计</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="新用户" fill="#8b5cf6" name="新用户" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  // 渲染订单列表
  const renderOrderList = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>普通订单列表</CardTitle>
          <div className="flex gap-2">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="all">全部状态</option>
              <option value="pending">待处理</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />刷新
            </Button>
            <Button className="bg-purple-600">
              <Download className="w-4 h-4 mr-2" />导出
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4">订单ID</th>
                <th className="text-left py-3 px-4">用户</th>
                <th className="text-left py-3 px-4">算力</th>
                <th className="text-left py-3 px-4">类型</th>
                <th className="text-left py-3 px-4">金额</th>
                <th className="text-left py-3 px-4">状态</th>
                <th className="text-left py-3 px-4">时间</th>
                <th className="text-left py-3 px-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {orders
                .filter(o => statusFilter === 'all' || o.status === statusFilter)
                .map(order => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-mono">{order.id.slice(0, 8)}</td>
                    <td className="py-3 px-4 font-medium">{order.username}</td>
                    <td className="py-3 px-4">{order.product_name}</td>
                    <td className="py-3 px-4">
                      <Badge variant={order.order_type === 'buy' ? 'default' : 'secondary'}>
                        {order.order_type === 'buy' ? '购买' : '卖出'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-green-600 font-medium">¥{order.amount.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <Badge className={
                        order.status === 'completed' ? 'bg-green-100 text-green-700' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }>
                        {order.status === 'completed' ? '已完成' : order.status === 'pending' ? '待处理' : '已取消'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{order.created_at?.slice(0, 16)}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" title="查看详情"><Eye className="w-4 h-4" /></Button>
                        {order.status === 'pending' && (
                          <>
                            <Button size="sm" variant="ghost" className="text-green-600" title="通过"><CheckCircle className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" className="text-red-600" title="拒绝"><XCircle className="w-4 h-4" /></Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  // 渲染平台仓单管理
  const renderWarehouseOrders = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>平台仓单管理</CardTitle>
          <Button className="bg-purple-600"><Plus className="w-4 h-4 mr-2" />新增仓单</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4">仓单编号</th>
                <th className="text-left py-3 px-4">算力名称</th>
                <th className="text-left py-3 px-4">数量</th>
                <th className="text-left py-3 px-4">状态</th>
                <th className="text-left py-3 px-4">创建时间</th>
                <th className="text-left py-3 px-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map(i => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono">WH{String(i).padStart(6, '0')}</td>
                  <td className="py-3 px-4">Token存储包 {i}</td>
                  <td className="py-3 px-4">{i * 10} 份</td>
                  <td className="py-3 px-4"><Badge className="bg-green-100 text-green-700">可匹配</Badge></td>
                  <td className="py-3 px-4 text-sm text-gray-500">2026-04-0{i}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost"><Eye className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost"><Edit className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  // 渲染平台仓单匹配
  const renderWarehouseMatch = () => (
    <Card>
      <CardHeader>
        <CardTitle>平台仓单匹配</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">待匹配订单</h4>
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-3 border rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium">订单 #ORD{String(i).padStart(6, '0')}</p>
                    <p className="text-sm text-gray-500">金额: ¥{(i * 10000).toLocaleString()}</p>
                  </div>
                  <Button size="sm">匹配</Button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3">可匹配仓单</h4>
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-3 border rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium">仓单 #WH{String(i).padStart(6, '0')}</p>
                    <p className="text-sm text-gray-500">剩余: {i * 5} 份</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700">可用</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // 渲染预约仓单
  const renderReserveOrders = () => (
    <Card>
      <CardHeader>
        <CardTitle>预约仓单</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4">预约编号</th>
                <th className="text-left py-3 px-4">用户</th>
                <th className="text-left py-3 px-4">算力</th>
                <th className="text-left py-3 px-4">预约金额</th>
                <th className="text-left py-3 px-4">状态</th>
                <th className="text-left py-3 px-4">预约时间</th>
                <th className="text-left py-3 px-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2].map(i => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono">RSV{String(i).padStart(6, '0')}</td>
                  <td className="py-3 px-4">user00{i}</td>
                  <td className="py-3 px-4">Token存储包 {i}</td>
                  <td className="py-3 px-4 text-green-600">¥{(i * 5000).toLocaleString()}</td>
                  <td className="py-3 px-4"><Badge className="bg-blue-100 text-blue-700">等待中</Badge></td>
                  <td className="py-3 px-4 text-sm text-gray-500">2026-04-0{i}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <Button size="sm">分配</Button>
                      <Button size="sm" variant="ghost">取消</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  const loadReleaseRecords = async (startDate?: string, endDate?: string) => {
    setReleaseLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);
      let url = `/api/admin/release-records?adminId=${user.id}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setReleaseRecords(data.data || []);
        if (data.stats) setReleaseStats(data.stats);
      }
    } catch (e) {
      console.error('加载释放收益记录失败', e);
    } finally {
      setReleaseLoading(false);
    }
  };

  const loadFeeRecords = async () => {
    setFeeRecordsLoading(true);
    try {
      const res = await fetch('/api/admin/fee-records');
      const data = await res.json();
      if (data.success) {
        setFeeRecords(data.data?.records || []);
        setFeeStats(data.data?.stats || null);
      }
    } catch (e) {
      console.error('加载手续费沉淀记录失败', e);
    } finally {
      setFeeRecordsLoading(false);
    }
  };

  const loadDashboardData = async () => {
    setDashboardLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard');
      const data = await res.json();
      if (data.success) {
        setDashboardData(data.data);
      }
    } catch (e) {
      console.error('加载数据总览失败', e);
    } finally {
      setDashboardLoading(false);
    }
  };

  const loadAccountsData = async () => {
    setAccountsLoading(true);
    try {
      const res = await fetch('/api/admin/accounts');
      const data = await res.json();
      console.log('[账户管理] API返回:', data.success, 'users:', data.data?.users?.length, 'stats:', data.data?.stats);
      if (data.success && data.data) {
        setAccountsData(data.data);
        setAccountsStats(data.data.stats || {});
      } else {
        setAccountsData({ users: [], stats: {}, hierarchy: [] });
      }
    } catch (e) {
      console.error('加载账户数据失败', e);
      setAccountsData({ users: [], stats: {}, hierarchy: [] });
    } finally {
      setAccountsLoading(false);
    }
  };

  // 获取服务商下的会员明细
  const loadProviderMembers = async (providerId: string) => {
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/branch/members?branchId=all&providerId=${providerId}&pageSize=50`);
      const data = await res.json();
      if (data.success) {
        setProviderMembers(data.data?.members || []);
      } else {
        setProviderMembers([]);
      }
    } catch {
      setProviderMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  // 点击服务商展开会员明细
  const handleProviderClick = (providerId: string) => {
    if (expandedProviderId === providerId) {
      setExpandedProviderId(null);
      setProviderMembers([]);
    } else {
      setExpandedProviderId(providerId);
      loadProviderMembers(providerId);
    }
  };

  // 删除会员
  const handleDeleteMember = async () => {
    if (!deleteConfirmMember) return;
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/delete-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ memberId: deleteConfirmMember.id }),
      });
      const data = await res.json();
      if (data.success) {
        setDeleteConfirmMember(null);
        setExpandedProviderId(null);
        setProviderMembers([]);
        loadAccountsData();
      } else {
        alert(data.error || data.message || '删除失败');
      }
    } catch {
      alert('删除请求失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  const loadFinancialReport = async () => {
    setFinancialLoading(true);
    try {
      const res = await fetch('/api/admin/financial-report');
      const data = await res.json();
      if (data.success) {
        setFinancialReport(data.data || {});
      }
    } catch (e) {
      console.error('加载财务报表失败', e);
    } finally {
      setFinancialLoading(false);
    }
  };

  const renderDashboard = () => {
    const d = dashboardData as any;
    if (dashboardLoading || !d) {
      return (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">加载数据总览...</span>
        </div>
      );
    }

    const users = d.users || {};
    const products = d.products || {};
    const revenue = d.revenue || {};
    const quota = d.quota || {};
    const withdrawals = d.withdrawals || {};
    const circulation = d.circulation || {};

    return (
      <div className="space-y-6">
        {/* 顶部统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">总用户</p>
                  <p className="text-2xl font-bold">{users.total || 0}</p>
                  <p className="text-xs text-green-600">今日+{users.todayNew || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg"><ShoppingCart className="w-5 h-5 text-green-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">总销售额</p>
                  <p className="text-2xl font-bold">¥{((products.totalSalesAmount || 0)).toLocaleString()}</p>
                  <p className="text-xs text-green-600">今日¥{((products.todayPurchaseAmount || 0)).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg"><TrendingUp className="w-5 h-5 text-amber-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">总释放收益</p>
                  <p className="text-2xl font-bold">¥{((revenue.totalReleaseAmount || 0)).toLocaleString()}</p>
                  <p className="text-xs text-green-600">今日¥{((revenue.todayReleaseAmount || 0)).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg"><Wallet className="w-5 h-5 text-red-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">待审核提现</p>
                  <p className="text-2xl font-bold">{withdrawals.pendingCount || 0}笔</p>
                  <p className="text-xs text-red-600">¥{((withdrawals.pendingAmount || 0)).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 数据流动图 - 中心概览 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" />平台数据流动</CardTitle>
            <CardDescription>额度下发 → 产品生成 → 会员购买 → 收益释放 → 提现回流</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2 overflow-x-auto py-4">
              {/* 智算中心额度 */}
              <div className="flex-shrink-0 text-center p-4 bg-primary/5 border-2 border-primary/20 rounded-xl min-w-[140px]">
                <Database className="w-8 h-8 mx-auto text-primary mb-2" />
                <p className="text-sm font-semibold text-primary">智算中心额度</p>
                <p className="text-lg font-bold">¥{((quota.companyQuota?.total_quota || 0) / 10000).toFixed(0)}万</p>
                <p className="text-xs text-muted-foreground">可用 ¥{((quota.companyQuota?.available_quota || 0) / 10000).toFixed(0)}万</p>
              </div>
              <ArrowRight className="w-6 h-6 text-muted-foreground flex-shrink-0" />
              {/* 服务商额度 */}
              <div className="flex-shrink-0 text-center p-4 bg-blue-50 border-2 border-blue-200 rounded-xl min-w-[140px]">
                <Briefcase className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <p className="text-sm font-semibold text-blue-700">服务商额度</p>
                <p className="text-lg font-bold">¥{((quota.totalProviderQuota || 0) / 10000).toFixed(1)}万</p>
                <p className="text-xs text-blue-600">已用 ¥{((quota.totalProviderUsedQuota || 0) / 10000).toFixed(1)}万</p>
              </div>
              <ArrowRight className="w-6 h-6 text-muted-foreground flex-shrink-0" />
              {/* 产品销售 */}
              <div className="flex-shrink-0 text-center p-4 bg-green-50 border-2 border-green-200 rounded-xl min-w-[140px]">
                <ShoppingCart className="w-8 h-8 mx-auto text-green-600 mb-2" />
                <p className="text-sm font-semibold text-green-700">产品销售</p>
                <p className="text-lg font-bold">{products.sold || 0}件</p>
                <p className="text-xs text-green-600">闲置 {products.available || 0}件</p>
              </div>
              <ArrowRight className="w-6 h-6 text-muted-foreground flex-shrink-0" />
              {/* 收益释放 */}
              <div className="flex-shrink-0 text-center p-4 bg-amber-50 border-2 border-amber-200 rounded-xl min-w-[140px]">
                <TrendingUp className="w-8 h-8 mx-auto text-amber-600 mb-2" />
                <p className="text-sm font-semibold text-amber-700">收益释放(5%)</p>
                <p className="text-lg font-bold">¥{((revenue.totalReleaseAmount || 0)).toLocaleString()}</p>
                <p className="text-xs text-amber-600">7项分配</p>
              </div>
              <ArrowRight className="w-6 h-6 text-muted-foreground flex-shrink-0" />
              {/* 提现回流 */}
              <div className="flex-shrink-0 text-center p-4 bg-red-50 border-2 border-red-200 rounded-xl min-w-[140px]">
                <Wallet className="w-8 h-8 mx-auto text-red-600 mb-2" />
                <p className="text-sm font-semibold text-red-700">提现回流</p>
                <p className="text-lg font-bold">¥{((withdrawals.approvedAmount || 0)).toLocaleString()}</p>
                <p className="text-xs text-red-600">待审 ¥{((withdrawals.pendingAmount || 0)).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 趋势图表区域 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 购买趋势 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="w-4 h-4" />近7天购买趋势</CardTitle>
            </CardHeader>
            <CardContent>
              {(products.purchaseTrend || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={products.purchaseTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `¥${v.toLocaleString()}`} />
                    <Bar dataKey="amount" fill="#22c55e" name="销售金额" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">暂无数据</p>}
            </CardContent>
          </Card>

          {/* 注册趋势 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" />近7天注册趋势</CardTitle>
            </CardHeader>
            <CardContent>
              {(users.registrationTrend || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={users.registrationTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" name="注册人数" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">暂无数据</p>}
            </CardContent>
          </Card>

          {/* 释放收益趋势 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" />近7天释放收益趋势</CardTitle>
            </CardHeader>
            <CardContent>
              {(revenue.releaseTrend || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={revenue.releaseTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `¥${v.toLocaleString()}`} />
                    <Area type="monotone" dataKey="amount" stroke="#f59e0b" fill="#fef3c7" name="释放金额" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">暂无数据</p>}
            </CardContent>
          </Card>

          {/* 释放分配饼图 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><PieChartIcon className="w-4 h-4" />收益释放分配</CardTitle>
            </CardHeader>
            <CardContent>
              {revenue.releaseDistribution ? (
                <ResponsiveContainer width="100%" height={220}>
                  <RechartsPieChart>
                    <Pie
                      data={[
                        { name: '会员(2%)', value: revenue.releaseDistribution.memberShare || 0 },
                        { name: '服务商(2%)', value: revenue.releaseDistribution.providerShare || 0 },
                        { name: '直推(0.25%)', value: revenue.releaseDistribution.directReferralShare || 0 },
                        { name: '上级(0.25%)', value: revenue.releaseDistribution.parentProviderShare || 0 },
                        { name: '网点(0.1%)', value: revenue.releaseDistribution.branchShare || 0 },
                        { name: '运营(0.4%)', value: revenue.releaseDistribution.companyShare || 0 },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {['#22c55e','#3b82f6','#a855f7','#f97316','#06b6d4','#eab308','#ef4444'].map((color, i) => (
                        <Cell key={i} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `¥${v.toLocaleString()}`} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">暂无数据</p>}
            </CardContent>
          </Card>
        </div>

        {/* 团队排名 + 平台流通 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 服务商排名 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Trophy className="w-4 h-4" />服务商收益排名</CardTitle>
            </CardHeader>
            <CardContent>
              {(d.teamRanking || []).length > 0 ? (
                <div className="space-y-2">
                  {(d.teamRanking as any[]).slice(0, 10).map((team: any, idx: number) => (
                    <div key={team.providerId} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx < 3 ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>{idx + 1}</span>
                        <div>
                          <p className="text-sm font-medium">{team.providerName}</p>
                          <p className="text-xs text-muted-foreground">{team.memberCount}会员 | {team.soldCount}笔销售</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">¥{(team.totalRevenue || 0).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">额度¥{(team.quota || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-center text-muted-foreground py-8">暂无数据</p>}
            </CardContent>
          </Card>

          {/* 网点排名 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" />服务网点排名</CardTitle>
            </CardHeader>
            <CardContent>
              {(d.branchRanking || []).length > 0 ? (
                <div className="space-y-2">
                  {(d.branchRanking as any[]).slice(0, 10).map((branch: any, idx: number) => (
                    <div key={branch.branchId} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx < 3 ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'}`}>{idx + 1}</span>
                        <div>
                          <p className="text-sm font-medium">{branch.branchName}</p>
                          <p className="text-xs text-muted-foreground">{branch.providerCount}服务商 | {branch.memberCount}会员</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-blue-600">¥{(branch.totalRevenue || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-center text-muted-foreground py-8">暂无数据</p>}
            </CardContent>
          </Card>
        </div>

        {/* 平台流通数据 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Coins className="w-4 h-4" />平台流通数据</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">¥{((circulation.totalBalance || 0)).toLocaleString()}</p>
                <p className="text-sm text-green-600">智算金流通总额</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-700">{((circulation.totalPoints || 0)).toLocaleString()}</p>
                <p className="text-sm text-amber-600">积分总量</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">{users.branches || 0}</p>
                <p className="text-sm text-blue-600">服务网点</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-700">{users.providers || 0}</p>
                <p className="text-sm text-purple-600">服务商</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderReleaseRecords = () => {
    // 从releaseStats获取统计数据
    const stats = releaseStats as any;
    const totalRelease = Number(stats?.total_release) || 0;
    const totalCount = Number(stats?.total_count) || 0;
    const totalMember = Number(stats?.total_member_share) || 0;
    const totalDirect = Number(stats?.total_direct_share) || 0;
    const totalProvider = Number(stats?.total_provider_share) || 0;
    const totalParentProvider = Number(stats?.total_parent_provider_share) || 0;
    const totalBranch = Number(stats?.total_branch_share) || 0;
    const totalCompany = Number(stats?.total_company_share) || 0;

    return (
    <div className="space-y-4">
      {/* 总统计卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            释放收益总统计
          </CardTitle>
          <CardDescription>产品到期释放市场费收益，按5项比例分配到各方</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 核心汇总 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">释放总金额</div>
                <div className="text-2xl font-bold text-primary">¥{totalRelease.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">释放笔数</div>
                <div className="text-2xl font-bold text-primary">{totalCount}</div>
              </CardContent>
            </Card>

          </div>

          {/* 市场费分配明细统计 */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3 text-sm">市场费分配去向明细</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">会员 (2%)</div>
                <div className="text-lg font-bold text-blue-600">¥{totalMember.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{totalRelease > 0 ? ((totalMember / totalRelease) * 100).toFixed(1) : '0.0'}%</div>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">服务商 (2%)</div>
                <div className="text-lg font-bold text-purple-600">¥{totalProvider.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{totalRelease > 0 ? ((totalProvider / totalRelease) * 100).toFixed(1) : '0.0'}%</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">直推人 (0.25%)</div>
                <div className="text-lg font-bold text-green-600">¥{totalDirect.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{totalRelease > 0 ? ((totalDirect / totalRelease) * 100).toFixed(1) : '0.0'}%</div>
              </div>
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">上级服务商 (0.25%)</div>
                <div className="text-lg font-bold text-orange-600">¥{totalParentProvider.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{totalRelease > 0 ? ((totalParentProvider / totalRelease) * 100).toFixed(1) : '0.0'}%</div>
              </div>
              <div className="text-center p-3 bg-teal-50 dark:bg-teal-950/30 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">服务网点 (0.1%)</div>
                <div className="text-lg font-bold text-teal-600">¥{totalBranch.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{totalRelease > 0 ? ((totalBranch / totalRelease) * 100).toFixed(1) : '0.0'}%</div>
              </div>
              <div className="text-center p-3 bg-slate-50 dark:bg-slate-950/30 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">智算中心运营 (0.4%)</div>
                <div className="text-lg font-bold text-slate-600">¥{totalCompany.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{totalRelease > 0 ? ((totalCompany / totalRelease) * 100).toFixed(1) : '0.0'}%</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 释放记录明细 */}
      <Card>
        <CardHeader>
          <CardTitle>释放收益明细记录</CardTitle>
          <CardDescription>产品到期释放市场费，按比例分配到各方（会员2% / 服务商2% / 直推0.25% / 上级0.25% / 网点0.1% / 智算中心0.4%）</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 筛选区 */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <Input type="date" className="w-40" value={releaseDateRange.start} onChange={e => setReleaseDateRange(prev => ({...prev, start: e.target.value}))} />
            <span className="text-muted-foreground">至</span>
            <Input type="date" className="w-40" value={releaseDateRange.end} onChange={e => setReleaseDateRange(prev => ({...prev, end: e.target.value}))} />
            <Button onClick={() => loadReleaseRecords(releaseDateRange.start, releaseDateRange.end)}>查询</Button>
            <Button variant="outline" onClick={() => { setReleaseDateRange({start: '', end: ''}); loadReleaseRecords(); }}>全部</Button>
          </div>

          {releaseLoading ? (
            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
          ) : releaseRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无释放收益记录</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>产品</TableHead>
                    <TableHead>释放时间</TableHead>
                    <TableHead>产品价格</TableHead>
                    <TableHead>市场费总额</TableHead>
                    <TableHead>会员(2%)</TableHead>
                    <TableHead>服务商(2%)</TableHead>
                    <TableHead>直推(0.25%)</TableHead>
                    <TableHead>上级(0.25%)</TableHead>
                    <TableHead>网点(0.1%)</TableHead>
                    <TableHead>智算中心(0.4%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {releaseRecords.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-mono text-xs">{r.product_name || '-'}</div>
                        <div className="text-xs text-muted-foreground">购买人: {r.member_name || '-'}</div>
                      </TableCell>
                      <TableCell className="text-xs">{new Date(r.created_at).toLocaleString('zh-CN')}</TableCell>
                      <TableCell>¥{Number(r.product_price).toLocaleString()}</TableCell>
                      <TableCell className="font-bold text-primary">¥{Number(r.release_amount).toLocaleString()}</TableCell>
                      <TableCell className="text-blue-600">¥{Number(r.member_share).toLocaleString()}</TableCell>
                      <TableCell className="text-purple-600">¥{Number(r.provider_share).toLocaleString()}</TableCell>
                      <TableCell className="text-green-600">¥{Number(r.direct_referral_share).toLocaleString()}</TableCell>
                      <TableCell className="text-orange-600">¥{Number(r.parent_provider_share).toLocaleString()}</TableCell>
                      <TableCell className="text-teal-600">¥{Number(r.branch_share).toLocaleString()}</TableCell>
                      <TableCell className="text-slate-600">¥{Number(r.company_share).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {/* 手续费沉淀记录 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            手续费沉淀记录
          </CardTitle>
          <CardDescription>提现手续费5%沉淀记录，包含提现手续费和智算金提现手续费</CardDescription>
        </CardHeader>
        <CardContent>
          {feeRecordsLoading ? (
            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
          ) : feeRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无手续费沉淀记录</div>
          ) : (
            <>
              {/* 汇总统计 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">手续费总计</div>
                    <div className="text-2xl font-bold text-amber-600">¥{Number(feeStats?.total_amount || 0).toLocaleString()}</div>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">沉淀笔数</div>
                    <div className="text-2xl font-bold text-amber-600">{feeStats?.total_count || 0}</div>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">提现手续费</div>
                    <div className="text-lg font-bold text-amber-600">¥{Number(feeStats?.withdrawal_fee_total || 0).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{feeStats?.withdrawal_fee_count || 0}笔</div>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">智算金提现手续费</div>
                    <div className="text-lg font-bold text-amber-600">¥{Number(feeStats?.energy_withdrawal_fee_total || 0).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{feeStats?.energy_withdrawal_fee_count || 0}笔</div>
                  </CardContent>
                </Card>
              </div>
              {/* 明细列表 */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户</TableHead>
                      <TableHead>手续费类型</TableHead>
                      <TableHead>原始金额</TableHead>
                      <TableHead>手续费率</TableHead>
                      <TableHead>手续费金额</TableHead>
                      <TableHead>备注</TableHead>
                      <TableHead>时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeRecords.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.real_name || r.username || '-'}</div>
                          <div className="text-xs text-muted-foreground">{r.unique_id || ''} {r.phone ? `(${r.phone?.slice(0,3)}****${r.phone?.slice(-4)})` : ''}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.fee_type === 'withdrawal_fee' ? 'default' : 'secondary'}>
                            {r.fee_type === 'withdrawal_fee' ? '提现手续费' : '智算金提现手续费'}
                          </Badge>
                        </TableCell>
                        <TableCell>¥{Number(r.original_amount).toLocaleString()}</TableCell>
                        <TableCell>{r.fee_rate}%</TableCell>
                        <TableCell className="font-bold text-amber-600">¥{Number(r.amount).toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{r.note || '-'}</TableCell>
                        <TableCell className="text-xs">{new Date(r.created_at).toLocaleString('zh-CN')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
    );
  };

  // 渲染人员账户管理
  const renderAccountsManagement = () => {
    const roleLabel = (role: string) => {
      switch(role) {
        case 'admin': return '智算中心';
        case 'branch': return '服务网点';
        case 'provider': return '服务商';
        case 'member': return '会员';
        default: return role;
      }
    };

    const statusLabel = (status: boolean) => status ? '正常' : '停用';

    return (
    <div className="space-y-4">
      {/* 子Tab切换 */}
      <div className="flex gap-2">
        <Button variant={accountsTab === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setAccountsTab('list')}>
          <Users className="w-4 h-4 mr-1" />账户列表
        </Button>
        <Button variant={accountsTab === 'hierarchy' ? 'default' : 'outline'} size="sm" onClick={() => setAccountsTab('hierarchy')}>
          <Network className="w-4 h-4 mr-1" />层级明细
        </Button>
        <Button variant={accountsTab === 'finance' ? 'default' : 'outline'} size="sm" onClick={() => setAccountsTab('finance')}>
          <BarChart3 className="w-4 h-4 mr-1" />财务报表
        </Button>
      </div>

      {/* 账户列表 */}
      {accountsTab === 'list' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  账户列表
                </CardTitle>
                <CardDescription>管理所有账户信息，支持修改身份、状态管控</CardDescription>
              </div>
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索用户名/手机号/专属ID"
                    className="pl-9 w-56"
                    value={accountSearch}
                    onChange={e => setAccountSearch(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={loadAccountsData}>
                  <RefreshCw className="w-4 h-4 mr-1" />刷新
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {accountsData ? (
              <div className="space-y-6">
                {/* 角色统计卡片 */}
                <div className="grid grid-cols-5 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{accountsData.stats?.totalBranches || 0}</div>
                    <div className="text-sm text-blue-600">服务网点</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">{accountsData.stats?.totalProviders || 0}</div>
                    <div className="text-sm text-purple-600">服务商</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{accountsData.stats?.totalMembers || 0}</div>
                    <div className="text-sm text-green-600">会员</div>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">{accountsData.stats?.totalUsers || 0}</div>
                    <div className="text-sm text-orange-600">总用户数</div>
                  </div>
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-teal-600">¥{(accountsData.stats?.totalHoldingToken || 0).toLocaleString()}</div>
                    <div className="text-sm text-teal-600">产力值总值</div>
                  </div>
                </div>

                {/* 账户表格 */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-3 px-4">用户名</th>
                        <th className="text-left py-3 px-4">角色</th>
                        <th className="text-left py-3 px-4">手机号</th>
                        <th className="text-left py-3 px-4">专属ID</th>
                        <th className="text-left py-3 px-4">隶属关系</th>
                        <th className="text-left py-3 px-4">推荐人</th>
                        <th className="text-left py-3 px-4">智算金</th>
                        <th className="text-left py-3 px-4">产力值</th>
                        <th className="text-left py-3 px-4">算力值</th>
                        <th className="text-left py-3 px-4">注册日期</th>
                        <th className="text-left py-3 px-4">状态</th>
                        <th className="text-left py-3 px-4">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountsData.users?.filter((u: { id: string; username: string; role: string; phone: string; unique_id: string; balance: number; holding_token: number; quota_balance: number; is_active: boolean; provider_name?: string; inviter_name?: string; branch_name?: string }) => {
                        if (!accountSearch.trim()) return true;
                        const q = accountSearch.trim().toLowerCase();
                        return (u.username || '').toLowerCase().includes(q)
                          || (u.phone || '').includes(q)
                          || (u.unique_id || '').toLowerCase().includes(q);
                      }).map((u: { id: string; username: string; role: string; phone: string; unique_id: string; balance: number; holding_token: number; quota_balance: number; is_active: boolean; provider_name?: string; inviter_name?: string; branch_name?: string }) => (
                        <tr key={u.id} className="border-b hover:bg-muted/30">
                          <td className="py-3 px-4 font-medium">{u.username}</td>
                          <td className="py-3 px-4">
                            <Badge className={
                              u.role === 'admin' ? 'bg-red-100 text-red-700' :
                              u.role === 'branch' ? 'bg-blue-100 text-blue-700' :
                              u.role === 'provider' ? 'bg-purple-100 text-purple-700' :
                              'bg-green-100 text-green-700'
                            }>
                              {roleLabel(u.role)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">{u.phone || '-'}</td>
                          <td className="py-3 px-4 font-mono text-xs">{u.unique_id || '-'}</td>
                          <td className="py-3 px-4 text-xs">
                            {u.role === 'member' && (
                              <div className="space-y-0.5">
                                {u.provider_name && u.provider_name !== '-' && <div><span className="text-muted-foreground">服务商:</span> {u.provider_name}</div>}
                                {(!u.provider_name || u.provider_name === '-') && <span className="text-muted-foreground">-</span>}
                              </div>
                            )}
                            {u.role === 'provider' && (
                              <div>
                                {u.branch_name && u.branch_name !== '-'
                                  ? <><span className="text-muted-foreground">网点:</span> {u.branch_name}</>
                                  : <span className="text-muted-foreground">-</span>}
                              </div>
                            )}
                            {u.role === 'branch' && <span className="text-muted-foreground">隶属智算中心</span>}
                            {u.role === 'admin' && <span className="text-muted-foreground">-</span>}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{u.inviter_name || '-'}</td>
                          <td className="py-3 px-4 text-green-600 font-medium">¥{(u.balance || 0).toLocaleString()}</td>
                          <td className="py-3 px-4 text-blue-600 font-medium">¥{(u.holding_token || 0).toLocaleString()}</td>
                          <td className="py-3 px-4 text-amber-600 font-medium">{(u.role === 'branch' || u.role === 'provider' || u.role === 'admin') ? `¥${(u.quota_balance || 0).toLocaleString()}` : '-'}</td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">{(u as any).created_at ? new Date((u as any).created_at).toLocaleDateString('zh-CN') : '-'}</td>
                          <td className="py-3 px-4">
                            <Badge className={u.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                              {statusLabel(u.is_active !== false)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Button size="sm" variant="outline" className="text-primary border-primary/30 hover:bg-primary/5" onClick={() => {
                              setAcctEditUser(u);
                              setAcctEditDialogOpen(true);
                            }}>
                              编辑
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>加载账户数据中...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 层级明细 */}
      {accountsTab === 'hierarchy' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Network className="w-5 h-5" />
                  层级明细
                </CardTitle>
                <CardDescription>服务网点 → 服务商 → 会员 层级关系</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadAccountsData}>
                <RefreshCw className="w-4 h-4 mr-1" />刷新
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {accountsData?.hierarchy ? (
              <div className="space-y-4">
                {(accountsData.hierarchy as Array<{ branchId: string; branchName: string; providers: Array<{ providerId: string; providerName: string; memberCount: number; quota: number; usedQuota: number }> }>).map((branch) => (
                  <div key={branch.branchId} className="border rounded-lg overflow-hidden">
                    {/* 服务网点头 */}
                    <div className="bg-blue-50 border-b border-blue-200 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5 text-blue-600" />
                          <div>
                            <h3 className="font-semibold text-blue-800">{branch.branchName}</h3>
                            <p className="text-xs text-blue-600">服务网点</p>
                          </div>
                        </div>
                        <div className="text-sm text-blue-700">
                          服务商: {branch.providers?.length || 0} 个
                        </div>
                      </div>
                    </div>
                    {/* 服务商列表 */}
                    {branch.providers?.map((provider) => (
                      <div key={provider.providerId} className="border-b last:border-b-0">
                        <div className="bg-purple-50 p-3 pl-10 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-purple-600" />
                            <button
                              type="button"
                              className="font-medium text-purple-800 hover:text-purple-600 hover:underline cursor-pointer"
                              onClick={() => handleProviderClick(provider.providerId)}
                            >
                              {provider.providerName}
                            </button>
                            <Badge className="bg-purple-100 text-purple-700 text-xs">服务商</Badge>
                            {expandedProviderId === provider.providerId && (
                              <ChevronDown className="w-4 h-4 text-purple-500" />
                            )}
                          </div>
                          <div className="flex gap-4 text-sm text-purple-700">
                            <span>会员: {provider.memberCount} 人</span>
                            <span>额度: ¥{(provider.quota || 0).toLocaleString()}</span>
                            <span>已用: ¥{(provider.usedQuota || 0).toLocaleString()}</span>
                          </div>
                        </div>
                        {/* 会员数提示 - 可点击展开 */}
                        <button
                          type="button"
                          className="bg-green-50/50 p-2 pl-20 text-sm text-green-700 hover:bg-green-100/50 w-full text-left cursor-pointer"
                          onClick={() => handleProviderClick(provider.providerId)}
                        >
                          <UserCheck className="w-3 h-3 inline mr-1" />
                          {expandedProviderId === provider.providerId ? '收起会员列表' : `会员数: ${provider.memberCount} 人（点击查看明细）`}
                        </button>
                        {/* 展开的会员明细 */}
                        {expandedProviderId === provider.providerId && (
                          <div className="bg-gray-50 p-3 pl-20">
                            {membersLoading ? (
                              <div className="text-center py-4 text-muted-foreground text-sm">加载中...</div>
                            ) : providerMembers.length === 0 ? (
                              <div className="text-center py-4 text-muted-foreground text-sm">暂无会员</div>
                            ) : (
                              <div className="space-y-2">
                                <div className="grid grid-cols-6 gap-2 text-xs text-muted-foreground font-medium px-3 py-1">
                                  <span>用户名</span>
                                  <span>手机号</span>
                                  <span>智算金</span>
                                  <span>持仓产品</span>
                                  <span>注册日期</span>
                                  <span>操作</span>
                                </div>
                                {providerMembers.map((m: { id: string; username?: string; phone?: string; realName?: string; energyValue?: number; holdingProducts?: number; totalInvestment?: number; createdAt?: string }) => (
                                  <div key={m.id} className="grid grid-cols-6 gap-2 items-center bg-white rounded px-3 py-2 text-sm border">
                                    <span className="font-medium">{m.username || m.realName || '-'}</span>
                                    <span className="text-muted-foreground">{m.phone || '-'}</span>
                                    <span>{(m.energyValue || 0).toLocaleString()}</span>
                                    <span className={(m.holdingProducts || 0) > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                                      {(m.holdingProducts || 0) > 0 ? `${m.holdingProducts} 个` : '无持仓'}
                                    </span>
                                    <span className="text-muted-foreground text-xs">{m.createdAt ? new Date(m.createdAt).toLocaleDateString('zh-CN') : '-'}</span>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="h-7 text-xs"
                                      disabled={(m.holdingProducts || 0) > 0}
                                      onClick={() => setDeleteConfirmMember({ id: m.id, username: m.username || m.realName || '-', phone: m.phone, holdingCount: m.holdingProducts || 0 })}
                                    >
                                      {(m.holdingProducts || 0) > 0 ? '有持仓无法删除' : '删除账号'}
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Network className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>加载层级数据中...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 财务报表 */}
      {accountsTab === 'finance' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    财务报表
                  </CardTitle>
                  <CardDescription>额度分配与收益比例分析，收益超额度30%预警</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadFinancialReport}>
                  <RefreshCw className="w-4 h-4 mr-1" />刷新
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {financialReport ? (
                <div className="space-y-6">
                  {/* 总览统计 */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">¥{(financialReport.company?.total_quota || 0).toLocaleString()}</div>
                      <div className="text-sm text-blue-600">系统总额度</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">¥{(financialReport.summary?.total_allocated || 0).toLocaleString()}</div>
                      <div className="text-sm text-green-600">已分配额度</div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">¥{(financialReport.summary?.total_revenue || 0).toLocaleString()}</div>
                      <div className="text-sm text-orange-600">体系总收益（智算金）</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">{financialReport.summary?.warning_count || 0}</div>
                      <div className="text-sm text-red-600">30%预警数</div>
                    </div>
                  </div>

                  {/* 收益/额度比进度 */}
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">整体收益/额度比</span>
                      <span className="text-sm font-bold">
                        {((financialReport.summary?.total_revenue || 0) / (financialReport.summary?.total_allocated || 1) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          ((financialReport.summary?.total_revenue || 0) / (financialReport.summary?.total_allocated || 1) * 100) > 30
                            ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{width: `${Math.min(((financialReport.summary?.total_revenue || 0) / (financialReport.summary?.total_allocated || 1) * 100), 100)}%`}}
                      />
                    </div>
                    <div className="relative w-full mt-1">
                      <div className="absolute left-[30%] top-0 w-px h-2 bg-red-400" />
                      <span className="absolute left-[30%] -translate-x-1/2 top-3 text-xs text-red-400">30%预警线</span>
                    </div>
                  </div>

                  {/* 各服务商报表 */}
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    服务商收益与Token额度
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left py-3 px-4">服务商</th>
                          <th className="text-left py-3 px-4">Token额度</th>
                          <th className="text-left py-3 px-4">已用额度</th>
                          <th className="text-left py-3 px-4">闲置Token</th>
                          <th className="text-left py-3 px-4">体系收益(智算金)</th>
                          <th className="text-left py-3 px-4">收益/额度比</th>
                          <th className="text-left py-3 px-4">30%阈值</th>
                          <th className="text-left py-3 px-4">状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(financialReport.providers || []).map((p: any, idx: number) => {
                          const ratio = Number(p.quota_ratio) || (p.quota > 0 ? (p.total_revenue / p.quota * 100) : 0);
                          const threshold = p.quota * 0.3;
                          const idleQuota = (p.quota || 0) - (p.used_quota || 0);
                          return (
                            <tr key={p.id || idx} className={`border-b ${p.is_warning ? 'bg-red-50' : 'hover:bg-muted/30'}`}>
                              <td className="py-3 px-4 font-medium">
                                {p.username || p.real_name || '-'}
                                {p.phone ? <span className="text-xs text-muted-foreground ml-2">{p.phone}</span> : null}
                              </td>
                              <td className="py-3 px-4">¥{(p.quota || 0).toLocaleString()}</td>
                              <td className="py-3 px-4">¥{(p.used_quota || 0).toLocaleString()}</td>
                              <td className="py-3 px-4 text-orange-600">¥{idleQuota.toLocaleString()}</td>
                              <td className="py-3 px-4 text-green-600 font-medium">¥{(p.total_revenue || 0).toLocaleString()}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-24 bg-gray-200 rounded-full h-2">
                                    <div className={`h-2 rounded-full ${ratio > 30 ? 'bg-red-500' : ratio > 20 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{width: `${Math.min(ratio, 100)}%`}} />
                                  </div>
                                  <span className={ratio > 30 ? 'text-red-600 font-bold' : ''}>{ratio.toFixed(1)}%</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">¥{threshold.toLocaleString()}</td>
                              <td className="py-3 px-4">
                                {p.is_warning ? (
                                  <Badge className="bg-red-100 text-red-700">⚠ 超过30%预警</Badge>
                                ) : (
                                  <Badge className="bg-green-100 text-green-700">正常</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* 各网点报表 */}
                  {(financialReport.branches || []).length > 0 && (
                    <>
                      <h3 className="text-base font-semibold flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        网点维度统计
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left py-3 px-4">网点</th>
                              <th className="text-left py-3 px-4">服务商数</th>
                              <th className="text-left py-3 px-4">算力总额度</th>
                              <th className="text-left py-3 px-4">体系收益</th>
                              <th className="text-left py-3 px-4">智算金余额</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(financialReport.branches || []).map((b: any, idx: number) => (
                              <tr key={b.id || idx} className="border-b hover:bg-muted/30">
                                <td className="py-3 px-4 font-medium">{b.username || b.real_name || '-'}</td>
                                <td className="py-3 px-4">{b.provider_count || 0}</td>
                                <td className="py-3 px-4">¥{(b.quota || 0).toLocaleString()}</td>
                                <td className="py-3 px-4 text-green-600 font-medium">¥{(b.total_revenue || 0).toLocaleString()}</td>
                                <td className="py-3 px-4 text-blue-600">¥{(b.balance || 0).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {/* 智算金分布 */}
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <Coins className="w-4 h-4" />
                    智算金分布
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        ¥{(financialReport.providers || []).reduce((s: number, p: any) => s + (Number(p.balance) || 0), 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-blue-600">服务商持有</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        ¥{(financialReport.branches || []).reduce((s: number, b: any) => s + (Number(b.balance) || 0), 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-purple-600">网点持有</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        ¥{(financialReport.summary?.total_revenue || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-green-600">体系总收益</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>{financialLoading ? '加载报表数据中...' : '点击刷新加载报表数据'}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 账户编辑弹窗 */}
      <Dialog open={acctEditDialogOpen} onOpenChange={setAcctEditDialogOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>编辑账户</DialogTitle>
            <DialogDescription>
              {acctEditUser && (
                <span className="flex items-center gap-1 mt-1">
                  {acctEditUser.username}
                  {acctEditUser.unique_id && <span className="text-muted-foreground text-xs">[{acctEditUser.unique_id}]</span>}
                  <Badge variant="outline" className="text-xs ml-1">{acctEditUser.role === 'admin' ? '智算中心' : acctEditUser.role === 'branch' ? '网点' : acctEditUser.role === 'provider' ? '服务商' : '会员'}</Badge>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Button
              className="w-full justify-start gap-3 h-12"
              variant="outline"
              onClick={() => {
                setAcctEditDialogOpen(false);
                setAcctTransferUser(acctEditUser);
                setAcctTransferAmount('');
                setAcctTransferNote('');
                setAcctTransferDialogOpen(true);
              }}
            >
              <span className="text-purple-600 font-medium">转智算金</span>
              <span className="text-muted-foreground text-xs ml-auto">向该账户转入智算金</span>
            </Button>
            {acctEditUser && acctEditUser.role !== 'admin' && acctEditUser.role !== 'branch' && (
            <Button
              className="w-full justify-start gap-3 h-12"
              variant="outline"
              onClick={() => {
                setAcctEditDialogOpen(false);
                setClearDataUser(acctEditUser);
                setClearDataType('quota');
                setClearDataConfirm('');
                setClearDataDialogOpen(true);
              }}
            >
              <span className="text-red-600 font-medium">清除数据</span>
              <span className="text-muted-foreground text-xs ml-auto">清除额度或收益</span>
            </Button>
            )}
            <Button
              className="w-full justify-start gap-3 h-12"
              variant="outline"
              onClick={() => {
                setAcctEditDialogOpen(false);
                setRoleChangeUser({ id: acctEditUser.id, username: acctEditUser.username, role: acctEditUser.role });
                setSelectedNewRole(acctEditUser.role);
              }}
            >
              <span className="text-amber-600 font-medium">修改身份</span>
              <span className="text-muted-foreground text-xs ml-auto">变更用户角色</span>
            </Button>
            <Button
              className="w-full justify-start gap-3 h-12"
              variant="outline"
              onClick={async () => {
                if (!confirm(`确认${acctEditUser.is_active !== false ? '停用' : '启用'}账户 ${acctEditUser.username}？`)) return;
                try {
                  const res = await authFetch('/api/admin/accounts', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: acctEditUser.id, action: 'toggleStatus', isActive: acctEditUser.is_active === false })
                  });
                  const data = await res.json();
                  if (data.success) {
                    setAcctEditDialogOpen(false);
                    loadAccountsData();
                  }
                } catch(e) { console.error(e); }
              }}
            >
              <span className={acctEditUser?.is_active !== false ? 'text-red-600' : 'text-green-600'} style={{ fontWeight: 600 }}>
                {acctEditUser?.is_active !== false ? '停用' : '启用'}
              </span>
              <span className="text-muted-foreground text-xs ml-auto">{acctEditUser?.is_active !== false ? '暂停该账户使用' : '恢复该账户使用'}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 账户列表转智算金弹窗 */}
      <Dialog open={acctTransferDialogOpen} onOpenChange={setAcctTransferDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>转智算金</DialogTitle>
            <DialogDescription>直接向该账户转入智算金，即时到账</DialogDescription>
          </DialogHeader>
          {acctTransferUser && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">用户名</span>
                  <span className="font-medium">{acctTransferUser.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">身份</span>
                  <Badge className={acctTransferUser.role === 'admin' ? 'bg-red-100 text-red-700' : acctTransferUser.role === 'branch' ? 'bg-blue-100 text-blue-700' : acctTransferUser.role === 'provider' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}>
                    {acctTransferUser.role === 'admin' ? '智算中心' : acctTransferUser.role === 'branch' ? '服务网点' : acctTransferUser.role === 'provider' ? '服务商' : '会员'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">当前智算金</span>
                  <span className="font-medium text-purple-600">¥{(acctTransferUser.balance || 0).toLocaleString()}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">转入金额</label>
                <Input
                  type="number"
                  placeholder="请输入转入金额"
                  value={acctTransferAmount}
                  onChange={(e) => setAcctTransferAmount(e.target.value)}
                />
                <div className="flex gap-2 flex-wrap">
                  {[100, 500, 1000, 5000, 10000].map(v => (
                    <Button key={v} size="sm" variant="outline" onClick={() => setAcctTransferAmount(String(v))}>
                      ¥{v.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">备注（可选）</label>
                <Input
                  placeholder="备注说明"
                  value={acctTransferNote}
                  onChange={(e) => setAcctTransferNote(e.target.value)}
                />
              </div>
              {acctTransferAmount && parseFloat(acctTransferAmount) > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-sm text-purple-700">
                    将向 <strong>{acctTransferUser.username}</strong> 转入 <strong>¥{parseFloat(acctTransferAmount).toLocaleString()}</strong> 智算金，即时到账
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcctTransferDialogOpen(false)}>取消</Button>
            <Button
              disabled={!acctTransferAmount || parseFloat(acctTransferAmount) <= 0 || acctTransferring}
              onClick={async () => {
                if (!acctTransferUser || !acctTransferAmount) return;
                const amt = parseFloat(acctTransferAmount);
                if (isNaN(amt) || amt <= 0) { alert('请输入有效金额'); return; }
                if (!confirm(`确认向 ${acctTransferUser.username} 转入 ¥${amt.toLocaleString()} 智算金？`)) return;
                setAcctTransferring(true);
                try {
                  const res = await authFetch('/api/admin/transfer-balance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ toUserId: acctTransferUser.id, amount: amt, note: acctTransferNote || `智算中心转入智算金 ¥${amt}` }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    alert(`成功转入 ¥${amt.toLocaleString()} 智算金给 ${acctTransferUser.username}`);
                    setAcctTransferDialogOpen(false);
                    loadAccountsData();
                  } else {
                    alert(data.error || '转账失败');
                  }
                } catch (e) {
                  console.error(e);
                  alert('转账失败');
                } finally {
                  setAcctTransferring(false);
                }
              }}
            >
              {acctTransferring ? '转账中...' : '确认转账'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 清除数据弹窗 */}
      <Dialog open={clearDataDialogOpen} onOpenChange={setClearDataDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>清除用户数据</DialogTitle>
            <DialogDescription>此操作不可逆，请谨慎执行</DialogDescription>
          </DialogHeader>
          {clearDataUser && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">用户名</span>
                  <span className="font-medium">{clearDataUser.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">身份</span>
                  <Badge className={clearDataUser.role === 'provider' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}>
                    {clearDataUser.role === 'provider' ? '服务商' : '会员'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">当前收益</span>
                  <span className="font-medium text-green-600">¥{(clearDataUser.balance || 0).toLocaleString()}</span>
                </div>
                {clearDataUser.role === 'member' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">产力值</span>
                    <span className="font-medium text-blue-600">¥{(clearDataUser.holding_token || 0).toLocaleString()}</span>
                  </div>
                )}
                {(clearDataUser.role === 'branch' || clearDataUser.role === 'provider' || clearDataUser.role === 'admin') && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">算力值</span>
                    <span className="font-medium text-amber-600">¥{(clearDataUser.quota_balance || 0).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">选择清除类型</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={`p-3 rounded-lg border-2 text-center transition-colors ${clearDataType === 'quota' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}
                    onClick={() => setClearDataType('quota')}
                  >
                    <div className="font-medium">{clearDataUser.role === 'provider' ? '清除算力额度' : '清除产品额度'}</div>
                    <div className="text-xs mt-1 opacity-70">
                      {clearDataUser.role === 'provider' ? '额度回到网点可分配额度' : '销毁产品，额度回到服务商'}
                    </div>
                  </button>
                  <button
                    className={`p-3 rounded-lg border-2 text-center transition-colors ${clearDataType === 'balance' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300'}`}
                    onClick={() => setClearDataType('balance')}
                  >
                    <div className="font-medium">清除收益</div>
                    <div className="text-xs mt-1 opacity-70">将收益余额清零</div>
                  </button>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700 font-medium">⚠️ 操作提示</p>
                <p className="text-sm text-red-600 mt-1">
                  {clearDataType === 'quota'
                    ? (clearDataUser.role === 'provider'
                      ? `将清除服务商 ${clearDataUser.username} 的算力额度，额度将归还到网点可分配额度`
                      : `将销毁会员 ${clearDataUser.username} 持有的所有产品，算力额度归还给服务商`)
                    : `将清除 ${clearDataUser.username} 的收益余额 ¥${(clearDataUser.balance || 0).toLocaleString()}，清零后不可恢复`
                  }
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">请输入 <span className="text-red-600 font-bold">确认清除</span> 以确认操作</label>
                <Input
                  placeholder='请输入"确认清除"'
                  value={clearDataConfirm}
                  onChange={(e) => setClearDataConfirm(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearDataDialogOpen(false)}>取消</Button>
            <Button
              variant="destructive"
              disabled={clearDataConfirm !== '确认清除' || acctClearLoading}
              onClick={async () => {
                if (!clearDataUser || clearDataConfirm !== '确认清除') return;
                setAcctClearLoading(true);
                try {
                  const res = await authFetch('/api/admin/clear-user-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: clearDataUser.id, clearType: clearDataType }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    alert(data.message);
                    setClearDataDialogOpen(false);
                    loadAccountsData();
                  } else {
                    alert(data.error || '操作失败');
                  }
                } catch (e) {
                  console.error(e);
                  alert('操作失败');
                } finally {
                  setAcctClearLoading(false);
                }
              }}
            >
              {acctClearLoading ? '执行中...' : '确认清除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 修改身份确认弹窗 */}
      <Dialog open={!!roleChangeUser} onOpenChange={(open) => { if (!open) setRoleChangeUser(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>修改用户身份</DialogTitle>
            <DialogDescription>确认修改用户身份，此操作需谨慎执行</DialogDescription>
          </DialogHeader>
          {roleChangeUser && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">用户名</span>
                  <span className="font-medium">{roleChangeUser.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">当前身份</span>
                  <Badge className={roleChangeUser.role === 'admin' ? 'bg-red-100 text-red-700' : roleChangeUser.role === 'branch' ? 'bg-blue-100 text-blue-700' : roleChangeUser.role === 'provider' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}>
                    {roleChangeUser.role === 'admin' ? '智算中心' : roleChangeUser.role === 'branch' ? '服务网点' : roleChangeUser.role === 'provider' ? '服务商' : '会员'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">选择新身份</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={selectedNewRole}
                  onChange={(e) => setSelectedNewRole(e.target.value)}
                >
                  <option value="">-- 请选择 --</option>
                  {roleChangeUser.role !== 'member' && <option value="member">会员</option>}
                  {roleChangeUser.role !== 'provider' && <option value="provider">服务商</option>}
                  {roleChangeUser.role !== 'branch' && <option value="branch">服务网点</option>}
                </select>
              </div>
              {selectedNewRole && selectedNewRole !== roleChangeUser.role && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-700">
                    即将把 <strong>{roleChangeUser.username}</strong> 的身份从 <strong>{roleChangeUser.role === 'admin' ? '智算中心' : roleChangeUser.role === 'branch' ? '服务网点' : roleChangeUser.role === 'provider' ? '服务商' : '会员'}</strong> 修改为 <strong>{selectedNewRole === 'branch' ? '服务网点' : selectedNewRole === 'provider' ? '服务商' : '会员'}</strong>
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleChangeUser(null)}>取消</Button>
            <Button
              disabled={!selectedNewRole || selectedNewRole === roleChangeUser?.role}
              onClick={async () => {
                if (!roleChangeUser || !selectedNewRole) return;
                try {
                  const res = await authFetch('/api/admin/accounts', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: roleChangeUser.id, action: 'changeRole', role: selectedNewRole })
                  });
                  const data = await res.json();
                  if (data.success) {
                    setRoleChangeUser(null);
                    loadAccountsData();
                  } else {
                    alert(data.error || '修改失败');
                  }
                } catch(e) {
                  console.error(e);
                  alert('修改失败');
                }
              }}
            >
              确认修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    );
  };

  // 渲染提现审核
  const renderWithdrawAudit = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>服务网点提现审核</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />刷新
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4">申请ID</th>
                <th className="text-left py-3 px-4">用户</th>
                <th className="text-left py-3 px-4">提现金额</th>
                <th className="text-left py-3 px-4">支付宝账号</th>
                <th className="text-left py-3 px-4">状态</th>
                <th className="text-left py-3 px-4">申请时间</th>
                <th className="text-left py-3 px-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map(w => (
                <tr key={w.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono">{w.id}</td>
                  <td className="py-3 px-4 font-medium">{w.username}</td>
                  <td className="py-3 px-4 text-green-600 font-medium">¥{w.amount.toLocaleString()}</td>
                  <td className="py-3 px-4">{w.alipay_account}</td>
                  <td className="py-3 px-4">
                    <Badge className={
                      w.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      w.status === 'completed' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }>
                      {w.status === 'pending' ? '待审核付款' : w.status === 'completed' ? '已完成' : '已拒绝'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">{w.created_at}</td>
                  <td className="py-3 px-4">
                    {w.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-4 h-4 mr-1" />通过
                        </Button>
                        <Button size="sm" variant="destructive">
                          <XCircle className="w-4 h-4 mr-1" />拒绝
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  // 渲染充值记录
  const renderRechargeList = () => (
    <Card>
      <CardHeader>
        <CardTitle>充值记录</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-gray-500">
          <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">暂无充值记录</p>
        </div>
      </CardContent>
    </Card>
  );

  // 渲染交易流水
  const renderTransactionList = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>交易流水</CardTitle>
          <div className="flex gap-2">
            <Input placeholder="搜索..." className="w-64" />
            <Input type="date" className="w-40" />
            <Button className="bg-purple-600"><Download className="w-4 h-4 mr-2" />导出</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4">流水号</th>
                <th className="text-left py-3 px-4">用户</th>
                <th className="text-left py-3 px-4">类型</th>
                <th className="text-left py-3 px-4">金额</th>
                <th className="text-left py-3 px-4">余额变化</th>
                <th className="text-left py-3 px-4">时间</th>
                <th className="text-left py-3 px-4">备注</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map((order, i) => (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm">{order.id.slice(0, 8)}</td>
                  <td className="py-3 px-4">{order.username}</td>
                  <td className="py-3 px-4">
                    <Badge variant={order.order_type === 'buy' ? 'default' : 'secondary'}>
                      {order.order_type === 'buy' ? '购买' : '卖出'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-green-600">+¥{order.amount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm">¥{order.amount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{order.created_at?.slice(0, 16)}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  // 渲染聊天管理
  const renderChatManagement = () => (
    <Card>
      <CardHeader>
        <CardTitle>聊天管理</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-gray-500">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">聊天管理功能</p>
          <p className="text-sm">管理用户聊天记录和客服对话</p>
        </div>
      </CardContent>
    </Card>
  );

  // 渲染服务商列表
  const renderProviderList = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>服务商列表</CardTitle>
          <div className="flex gap-2">
            <Input placeholder="搜索服务商..." className="w-64" />
            <Button className="bg-purple-600"><Plus className="w-4 h-4 mr-2" />添加服务商</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4">ID</th>
                <th className="text-left py-3 px-4">服务商</th>
                <th className="text-left py-3 px-4">总额度</th>
                <th className="text-left py-3 px-4">已用额度</th>
                <th className="text-left py-3 px-4">总销售额</th>
                <th className="text-left py-3 px-4">会员数</th>
                <th className="text-left py-3 px-4">状态</th>
                <th className="text-left py-3 px-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {providers.map(provider => (
                <tr key={provider.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm">{provider.id}</td>
                  <td className="py-3 px-4 font-medium">{provider.username}</td>
                  <td className="py-3 px-4">¥{provider.quota.toLocaleString()}</td>
                  <td className="py-3 px-4 text-orange-600">¥{provider.used_quota.toLocaleString()}</td>
                  <td className="py-3 px-4 text-green-600">¥{provider.total_sales.toLocaleString()}</td>
                  <td className="py-3 px-4">{provider.member_count}</td>
                  <td className="py-3 px-4">
                    <Badge className="bg-green-100 text-green-700">正常</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost"><Eye className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost"><Edit className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  // 渲染服务商审核
  const renderProviderAudit = () => (
    <Card>
      <CardHeader>
        <CardTitle>服务商审核</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-gray-500">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">暂无待审核的服务商</p>
        </div>
      </CardContent>
    </Card>
  );

  // 渲染算力模板
  const renderProductTemplates = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>算力模板</CardTitle>
          <Button onClick={() => setShowTemplateDialog(true)} className="bg-purple-600">
            <Plus className="w-4 h-4 mr-2" />新建模板
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.length > 0 ? templates.map(template => (
            <Card key={template.id} className="border-purple-200 hover:shadow-lg transition-shadow">
              <CardContent className="pt-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-sm md:text-lg truncate">{template.name}</h4>
                    <p className="text-sm text-gray-500">代码: {template.code}</p>
                  </div>
                  <Badge className={template.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                    {template.status === 'active' ? '启用中' : '已禁用'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-purple-50 rounded">
                    <p className="text-gray-500">周期</p>
                    <p className="font-medium text-purple-600">{template.period}天</p>
                  </div>
                  <div className="p-2 bg-green-50 rounded">
                    <p className="text-gray-500">总收益率</p>
                    <p className="font-medium text-green-600">{template.total_rate}%</p>
                  </div>
                  <div className="p-2 bg-orange-50 rounded">
                    <p className="text-gray-500">市场费率</p>
                    <p className="font-medium text-orange-600">{template.market_rate}%</p>
                  </div>
                  <div className="p-2 bg-blue-50 rounded">
                    <p className="text-gray-500">会员收益</p>
                    <p className="font-medium text-blue-600">{template.profit_rate}%</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t flex justify-end items-center gap-1">
                  <div className="flex gap-1">

                    <Button size="sm" variant="ghost"><Edit className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )) : (
            <div className="col-span-1 md:col-span-2 text-center py-12 text-gray-500">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>暂无算力模板，点击上方按钮创建</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // 渲染算力列表
  const renderProductList = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>算力列表</CardTitle>
          <div className="flex gap-2">
            <select className="border rounded px-3 py-2">
              <option value="all">全部状态</option>
              <option value="available">可购买</option>
              <option value="sold">已售出</option>
            </select>
            <Button className="bg-purple-600"><Download className="w-4 h-4 mr-2" />导出</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-gray-500">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">算力列表</p>
          <p className="text-sm">服务商创建的算力将在此显示</p>
        </div>
      </CardContent>
    </Card>
  );

  // 渲染系统设置
  const renderSystemConfig = () => {
    if (configLoading) {
      return (
        <Card>
          <CardContent className="p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3 md:space-y-6">
        {/* 子Tab导航 */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
          <button
            onClick={() => setSystemSubTab('config')}
            className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
              systemSubTab === 'config' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            参数配置
          </button>
          <button
            onClick={() => setSystemSubTab('data')}
            className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
              systemSubTab === 'data' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            数据管理
          </button>
          <button
            onClick={() => setSystemSubTab('assign-role')}
            className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
              systemSubTab === 'assign-role' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            账号赋权
          </button>
          <button
            onClick={() => { setSystemSubTab('invite-code'); if (!adminInviteCode) loadAdminInviteCode(); }}
            className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
              systemSubTab === 'invite-code' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            邀请码
          </button>
          <button
            onClick={() => setSystemSubTab('force-release')}
            className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
              systemSubTab === 'force-release' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            到期释放
          </button>
        </div>

        {systemSubTab === 'config' && (
          <>
        {/* 产品收益配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              产品收益配置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <Label className="text-sm text-gray-500">3天产品收益率</Label>
                <div className="flex items-center mt-1">
                  <Input 
                    type="number" 
                    value={systemConfig['profit_rate_3d'] || ''}
                    onChange={(e) => handleConfigChange('profit_rate_3d', e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <span className="ml-2 text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">会员实际到手: {(parseFloat(systemConfig['profit_rate_3d'] || '0') / 2)}%</p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">7天产品收益率</Label>
                <div className="flex items-center mt-1">
                  <Input 
                    type="number" 
                    value={systemConfig['profit_rate_7d'] || ''}
                    onChange={(e) => handleConfigChange('profit_rate_7d', e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <span className="ml-2 text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">会员实际到手: {(parseFloat(systemConfig['profit_rate_7d'] || '0') / 2)}%</p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">15天产品收益率</Label>
                <div className="flex items-center mt-1">
                  <Input 
                    type="number" 
                    value={systemConfig['profit_rate_15d'] || ''}
                    onChange={(e) => handleConfigChange('profit_rate_15d', e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <span className="ml-2 text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">会员实际到手: {(parseFloat(systemConfig['profit_rate_15d'] || '0') / 2)}%</p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">30天产品收益率</Label>
                <div className="flex items-center mt-1">
                  <Input 
                    type="number" 
                    value={systemConfig['profit_rate_30d'] || ''}
                    onChange={(e) => handleConfigChange('profit_rate_30d', e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <span className="ml-2 text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">会员实际到手: {(parseFloat(systemConfig['profit_rate_30d'] || '0') / 2)}%</p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">90天产品收益率</Label>
                <div className="flex items-center mt-1">
                  <Input 
                    type="number" 
                    value={systemConfig['profit_rate_90d'] || ''}
                    onChange={(e) => handleConfigChange('profit_rate_90d', e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <span className="ml-2 text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">会员实际到手: {(parseFloat(systemConfig['profit_rate_90d'] || '0') / 2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 市场费分配配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              市场费分配比例
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <Label className="text-sm text-gray-500">服务商</Label>
                <div className="flex items-center mt-1">
                  <Input 
                    type="number" 
                    value={systemConfig['energy_allocation_provider'] || ''}
                    onChange={(e) => handleConfigChange('energy_allocation_provider', e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <span className="ml-2 text-gray-500">%</span>
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-500">公司运营</Label>
                <div className="flex items-center mt-1">
                  <Input 
                    type="number" 
                    value={systemConfig['energy_allocation_company'] || ''}
                    onChange={(e) => handleConfigChange('energy_allocation_company', e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <span className="ml-2 text-gray-500">%</span>
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-500">直推奖励</Label>
                <div className="flex items-center mt-1">
                  <Input 
                    type="number" 
                    value={systemConfig['energy_allocation_direct'] || ''}
                    onChange={(e) => handleConfigChange('energy_allocation_direct', e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <span className="ml-2 text-gray-500">%</span>
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-500">上级服务商</Label>
                <div className="flex items-center mt-1">
                  <Input 
                    type="number" 
                    value={systemConfig['energy_allocation_parent_provider'] || ''}
                    onChange={(e) => handleConfigChange('energy_allocation_parent_provider', e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <span className="ml-2 text-gray-500">%</span>
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-500">服务网点</Label>
                <div className="flex items-center mt-1">
                  <Input 
                    type="number" 
                    value={systemConfig['energy_allocation_branch'] || ''}
                    onChange={(e) => handleConfigChange('energy_allocation_branch', e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <span className="ml-2 text-gray-500">%</span>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>分配说明：</strong>会员卖出产品时，需要用收益支付市场费。市场费按比例分配给各方。
                <br />
                <span className="text-xs text-gray-400">
                  总计: {(parseFloat(systemConfig['energy_allocation_provider'] || '0') + 
                    parseFloat(systemConfig['energy_allocation_company'] || '0') + 
                    parseFloat(systemConfig['energy_allocation_direct'] || '0') + 
                    parseFloat(systemConfig['energy_allocation_parent_provider'] || '0') + 
                    parseFloat(systemConfig['energy_allocation_branch'] || '0'))}%
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 额度与变现配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              额度与变现配置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm text-gray-500">额度申请赠送收益比例</Label>
                <div className="flex items-center mt-1">
                  <Input 
                    type="number" 
                    value={systemConfig['quota_energy_bonus_ratio'] || ''}
                    onChange={(e) => handleConfigChange('quota_energy_bonus_ratio', e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <span className="ml-2 text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">申请1万额度赠送N收益</p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">变现手续费率</Label>
                <div className="flex items-center mt-1">
                  <Input 
                    type="number" 
                    value={systemConfig['withdraw_fee_rate'] || ''}
                    onChange={(e) => handleConfigChange('withdraw_fee_rate', e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <span className="ml-2 text-gray-500">%</span>
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-500">最低提现金额</Label>
                <div className="flex items-center mt-1">
                  <span className="text-gray-500 mr-1">¥</span>
                  <Input 
                    type="number" 
                    value={systemConfig['min_withdraw_amount'] || ''}
                    onChange={(e) => handleConfigChange('min_withdraw_amount', e.target.value)}
                    className="text-lg font-semibold"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-500">收益兑换比例</Label>
                <div className="flex items-center mt-1">
                  <span className="text-gray-500 mr-1">1收益=</span>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={systemConfig['energy_to_money_ratio'] || ''}
                    onChange={(e) => handleConfigChange('energy_to_money_ratio', e.target.value)}
                    className="text-lg font-semibold w-20"
                  />
                  <span className="ml-1 text-gray-500">元</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 平台基础配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              平台基础配置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-500">平台名称</Label>
                <Input 
                  value={systemConfig['platform_name'] || ''}
                  onChange={(e) => handleConfigChange('platform_name', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-500">客服电话</Label>
                <Input 
                  value={systemConfig['service_phone'] || ''}
                  onChange={(e) => handleConfigChange('service_phone', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-500">流转有效期</Label>
                <div className="flex items-center mt-1">
                  <Input 
                    type="number" 
                    value={systemConfig['transfer_expire_hours'] || ''}
                    onChange={(e) => handleConfigChange('transfer_expire_hours', e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <span className="ml-2 text-gray-500">小时</span>
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-500">收益积分比例</Label>
                <div className="flex items-center mt-1">
                  <Input 
                    type="number" 
                    value={systemConfig['profit_points_ratio'] || ''}
                    onChange={(e) => handleConfigChange('profit_points_ratio', e.target.value)}
                    className="text-lg font-semibold"
                  />
                  <span className="ml-2 text-gray-500">%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 保存按钮 */}
        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => loadSystemConfig()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            重置
          </Button>
          <Button 
            className="bg-purple-600 hover:bg-purple-700"
            onClick={saveSystemConfig}
            disabled={configSaving}
          >
            {configSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            保存配置
          </Button>
        </div>
          </>
        )}

        {systemSubTab === 'data' && (
          /* 数据管理Tab */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                数据管理
              </CardTitle>
              <CardDescription>开发阶段专用功能，清除测试数据</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-6">
              {/* 操作说明 */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-yellow-800 font-medium">危险操作警告</p>
                    <p className="text-xs text-yellow-700 mt-1">此操作将永久清除以下数据，且无法恢复：</p>
                    <ul className="text-xs text-yellow-700 mt-2 list-disc list-inside space-y-1">
                      <li>所有收益账户和流水记录</li>
                      <li>所有算力额度和分配记录</li>
                      <li>所有服务商配置信息</li>
                      <li>所有产品、订单和持仓数据</li>
                      <li>重置所有用户的收益和余额为0</li>
                    </ul>
                    <p className="text-xs text-yellow-700 mt-2">操作前请确认已备份重要数据！</p>
                  </div>
                </div>
              </div>

              {/* 密码验证 */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">请输入管理员密码确认操作</Label>
                  <Input 
                    type="password"
                    placeholder="请输入密码"
                    value={clearDataPassword}
                    onChange={(e) => setClearDataPassword(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="destructive"
                    onClick={handleClearEnergyData}
                    disabled={clearDataLoading || !clearDataPassword}
                  >
                    {clearDataLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    清除收益数据
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleClearQuotaData}
                    disabled={clearDataLoading || !clearDataPassword}
                  >
                    {clearDataLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    清除算力额度数据
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleClearAllData}
                    disabled={clearDataLoading || !clearDataPassword}
                  >
                    {clearDataLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    一键清除所有业务数据
                  </Button>
                </div>
                {clearDataMessage && (
                  <div className={`p-3 rounded-lg text-sm ${
                    clearDataMessage.type === 'success' 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {clearDataMessage.text}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 账号赋权Tab */}
        {systemSubTab === 'assign-role' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                账号赋权
              </CardTitle>
              <CardDescription>指定账号赋予任意角色身份（智算中心/服务网点/服务商/会员）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 搜索区域 */}
              <div className="flex gap-2">
                <Input
                  placeholder="输入用户名/手机号/专属ID搜索"
                  value={assignSearchKeyword}
                  onChange={(e) => setAssignSearchKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUsersForAssign()}
                  className="flex-1"
                />
                <Button 
                  onClick={searchUsersForAssign} 
                  disabled={assignSearching || assignSearchKeyword.length < 2}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {assignSearching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  搜索
                </Button>
              </div>

              {/* 操作提示 */}
              {assignMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  assignMessage.type === 'success' 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {assignMessage.text}
                </div>
              )}

              {/* 搜索结果 */}
              {assignSearchResults.length > 0 && (
                <div className="space-y-3">
                  {assignSearchResults.map((u: any) => {
                    const roleLabels: Record<string, string> = { admin: '智算中心', branch: '服务网点', provider: '服务商', member: '会员' };
                    const roleColors: Record<string, string> = { 
                      admin: 'bg-red-100 text-red-700', 
                      branch: 'bg-blue-100 text-blue-700', 
                      provider: 'bg-purple-100 text-purple-700', 
                      member: 'bg-green-100 text-green-700' 
                    };
                    return (
                      <div key={u.id} className="p-4 border rounded-lg flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{u.username}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${roleColors[u.role] || 'bg-gray-100 text-gray-700'}`}>
                              {roleLabels[u.role] || u.role}
                            </span>
                            {u.unique_id && <span className="text-xs text-gray-400">[{u.unique_id}]</span>}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {u.phone && <span>{u.phone}</span>}
                            {u.branch_name && <span className="ml-3">服务网点: {u.branch_name}</span>}
                            {u.provider_name && <span className="ml-3">服务商: {u.provider_name}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select 
                            id={`role-select-${u.id}`}
                            className="text-sm border rounded-md px-3 py-1.5 bg-white"
                            defaultValue=""
                          >
                            <option value="" disabled>选择角色</option>
                            <option value="admin">智算中心</option>
                            <option value="branch">服务网点</option>
                            <option value="provider">服务商</option>
                            <option value="member">会员</option>
                          </select>
                          <Button 
                            size="sm"
                            onClick={() => {
                              const select = document.getElementById(`role-select-${u.id}`) as HTMLSelectElement;
                              if (select && select.value) {
                                handleAssignRole(u.id, select.value, u.username);
                              }
                            }}
                            disabled={assignLoading}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {assignLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '赋权'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 空状态 */}
              {assignSearchResults.length === 0 && !assignMessage && (
                <div className="text-center py-8 text-gray-400">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>输入用户名、手机号或专属ID搜索用户</p>
                  <p className="text-sm mt-1">搜索后可选择目标角色进行赋权</p>
                </div>
              )}

              {/* 赋权说明 */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">赋权规则说明</p>
                <ul className="text-xs text-blue-700 mt-2 list-disc list-inside space-y-1">
                  <li><strong>智算中心</strong>：拥有系统最高权限，可管理所有数据和账号</li>
                  <li><strong>服务网点</strong>：管理下级服务商和会员，分配额度</li>
                  <li><strong>服务商</strong>：生成和上架产品，管理会员，审核交易</li>
                  <li><strong>会员</strong>：购买产品，查看持仓，管理收益</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 邀请码Tab */}
        {systemSubTab === 'invite-code' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="w-5 h-5" />
                智算中心邀请码
              </CardTitle>
              <CardDescription>使用智算中心邀请码注册的账号将自动成为服务网点角色</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {inviteCodeMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  inviteCodeMessage.type === 'success' 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {inviteCodeMessage.text}
                </div>
              )}

              {/* 专属邀请码展示 */}
              <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-dashed border-purple-200 rounded-xl text-center">
                <p className="text-sm text-gray-500 mb-2">智算中心专属邀请码</p>
                <p className="text-3xl font-bold text-purple-700 tracking-widest">{user?.unique_id || 'AD00001'}</p>
                <p className="text-xs text-gray-400 mt-2">使用此邀请码注册 → 自动成为服务网点</p>
                <div className="flex justify-center gap-3 mt-4">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(user?.unique_id || '');
                      setInviteCodeMessage({ type: 'success', text: '邀请码已复制到剪贴板' });
                      setTimeout(() => setInviteCodeMessage(null), 2000);
                    }}
                  >
                    复制邀请码
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => {
                      const link = `${window.location.origin}/?invite=${user?.unique_id || ''}`;
                      navigator.clipboard.writeText(link);
                      setInviteCodeMessage({ type: 'success', text: '邀请链接已复制到剪贴板' });
                      setTimeout(() => setInviteCodeMessage(null), 2000);
                    }}
                  >
                    复制邀请链接
                  </Button>
                </div>
              </div>

              {/* 邀请码规则说明 */}
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium">邀请码类型说明</p>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-yellow-700">
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-mono">AD</span>
                    <span>智算中心邀请码 → 注册为<strong>服务网点</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-yellow-700">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-mono">BR</span>
                    <span>服务网点邀请码 → 注册为<strong>服务商</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-yellow-700">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-mono">PV</span>
                    <span>服务商邀请码 → 注册为<strong>会员</strong>（绑定该服务商）</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-yellow-700">
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded font-mono">MB</span>
                    <span>会员邀请码 → 注册为<strong>会员</strong>（绑定同服务商）</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {systemSubTab === 'force-release' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                强制释放到期收益
              </CardTitle>
              <CardDescription>
                手动触发释放所有已到期但未自动释放的产品收益。系统会在会员端加载时自动释放，如遇异常可手动操作。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={handleForceRelease}
                  disabled={forceReleaseLoading}
                >
                  {forceReleaseLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />释放中...</>
                  ) : (
                    <><Zap className="w-4 h-4 mr-2" />立即释放到期收益</>
                  )}
                </Button>
                <span className="text-sm text-gray-500">
                  将查找所有到期未释放的产品，自动计算收益并分配到会员余额
                </span>
              </div>

              {forceReleaseResult && (
                <div className={`p-4 rounded-lg border ${
                  forceReleaseResult.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <p className={`font-medium ${
                    forceReleaseResult.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {forceReleaseResult.message}
                  </p>
                  {forceReleaseResult.success && forceReleaseResult.data?.details?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm text-green-600 font-medium">释放明细：</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-green-200">
                              <th className="text-left py-1 px-2">产品名称</th>
                              <th className="text-left py-1 px-2">会员</th>
                              <th className="text-right py-1 px-2">本金</th>
                              <th className="text-right py-1 px-2">收益率</th>
                              <th className="text-right py-1 px-2">收益金额</th>
                            </tr>
                          </thead>
                          <tbody>
                            {forceReleaseResult.data.details.map((d: any, i: number) => (
                              <tr key={i} className="border-b border-green-100">
                                <td className="py-1 px-2">{d.productName}</td>
                                <td className="py-1 px-2">{d.memberName} [{d.memberId}]</td>
                                <td className="text-right py-1 px-2">¥{d.purchasePrice.toLocaleString()}</td>
                                <td className="text-right py-1 px-2">{d.profitRate}%</td>
                                <td className="text-right py-1 px-2 font-medium text-green-700">¥{d.memberProfit.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <p className="font-medium mb-1">说明</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>产品到期后，会员端加载时会自动释放收益</li>
                  <li>如遇网络异常导致自动释放失败，可使用此功能手动触发</li>
                  <li>释放后会员余额增加 profit_rate% 的收益金额</li>
                  <li>已释放的产品不会重复释放</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };
  const renderAnnouncements = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>公告管理</CardTitle>
          <Button className="bg-purple-600"><Plus className="w-4 h-4 mr-2" />发布公告</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="p-4 border rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">系统升级公告</h4>
                <p className="text-sm text-gray-500 mt-1">系统将于4月5日凌晨进行升级维护...</p>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-green-100 text-green-700">已发布</Badge>
                <Button size="sm" variant="ghost"><Edit className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">新功能上线</h4>
                <p className="text-sm text-gray-500 mt-1">新增预约仓单功能，欢迎体验...</p>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-green-100 text-green-700">已发布</Badge>
                <Button size="sm" variant="ghost"><Edit className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // 智算中心 - 提现管理
  const renderBranchWithdrawManagement = () => {
    const handleReview = async (id: string, action: 'approve' | 'reject') => {
      setProcessingId(id);
      try {
        const res = await authFetch('/api/withdrawals/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ withdrawalId: id, action, rejectReason: action === 'reject' ? withdrawNote : undefined }),
        });
        const data = await res.json();
        if (data.success) {
          setMessage({ type: 'success', text: data.message });
          // 重新加载数据
          const withdrawRes = await authFetch('/api/withdrawals?tab=review');
          const withdrawData = await withdrawRes.json();
          if (withdrawData.success) {
            setBranchWithdrawals(withdrawData.data?.records || []);
          }
        } else {
          setMessage({ type: 'error', text: data.message });
        }
      } catch (error) {
        setMessage({ type: 'error', text: '处理失败' });
      } finally {
        setProcessingId(null);
      }
    };

    // 计算统计 - 直接从 withdrawals 表的字段读取状态
    const pendingCount = branchWithdrawals.filter((w: any) => w.status === 'pending').length;

    const totalApproved = branchWithdrawals.reduce((sum: number, w: any) => {
      if (w.status === 'completed') return sum + (Number(w.amount) || 0);
      return sum;
    }, 0);

    const totalRejected = branchWithdrawals.reduce((sum: number, w: any) => {
      if (w.status === 'rejected') return sum + (Number(w.amount) || 0);
      return sum;
    }, 0);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">待审核</div>
              <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">已通过</div>
              <div className="text-2xl font-bold text-green-600">{totalApproved.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">已拒绝</div>
              <div className="text-2xl font-bold text-red-600">{totalRejected.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">总记录</div>
              <div className="text-2xl font-bold">{branchWithdrawals.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <button
                  onClick={() => setWithdrawTab('deposit')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    withdrawTab === 'deposit' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  服务网点变现申请
                </button>
                <button
                  onClick={() => setWithdrawTab('records')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    withdrawTab === 'records' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  沉淀记录
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {withdrawTab === 'deposit' ? (
              <div className="space-y-4">
                <div className="text-sm text-gray-500">
                  <p>• 服务网点向智算中心变现收益</p>
                  <p>• 智算中心线下转账后确认到账，收益从服务网点扣除</p>
                  <p>• 拒绝后收益将返还给服务网点</p>
                </div>

                {branchWithdrawals.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无变现申请
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>申请时间</TableHead>
                        <TableHead>服务网点</TableHead>
                        <TableHead>变现金额</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branchWithdrawals.map((withdraw: any) => {
                        const isPending = withdraw.status === 'pending';
                        
                        return (
                          <TableRow key={withdraw.id}>
                            <TableCell>{new Date(withdraw.created_at).toLocaleString()}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{withdraw.username || '-'}</div>
                                <div className="text-xs text-gray-500">{withdraw.unique_id || ''} · {withdraw.user_role === 'branch' ? '网点' : withdraw.user_role === 'provider' ? '服务商' : '会员'}</div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-blue-600">
                              ¥{Number(withdraw.amount).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                withdraw.status === 'completed' ? 'bg-green-100 text-green-700' :
                                withdraw.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }>
                                {withdraw.status === 'completed' ? '已完成' :
                                 withdraw.status === 'rejected' ? '已拒绝' :
                                 withdraw.status === 'pending' ? '待审核' : withdraw.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {isPending && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    disabled={processingId === withdraw.id}
                                    onClick={() => handleReview(withdraw.id, 'approve')}
                                  >
                                    {processingId === withdraw.id ? '处理中...' : '确认转账'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={processingId === withdraw.id}
                                    onClick={() => handleReview(withdraw.id, 'reject')}
                                  >
                                    拒绝
                                  </Button>
                                </div>
                              )}
                              {!isPending && withdraw.reject_reason && (
                                <span className="text-sm text-gray-500">原因: {withdraw.reject_reason}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-gray-500">
                  <p>• 展示所有服务网点变现通过的记录（5%手续费沉淀）</p>
                  <p>• 沉淀比例：变现金额的5%作为平台手续费</p>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>时间</TableHead>
                      <TableHead>服务网点</TableHead>
                      <TableHead>变现金额</TableHead>
                      <TableHead>沉淀金额(5%)</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branchWithdrawals
                      .filter((w: any) => w.status === 'completed')
                      .map((withdraw: any) => {
                        const depositAmount = Math.floor((Number(withdraw.amount) || 0) * 0.05);
                        
                        return (
                          <TableRow key={withdraw.id}>
                            <TableCell>{new Date(withdraw.created_at).toLocaleString()}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{withdraw.username || '-'}</div>
                                <div className="text-xs text-gray-500">{withdraw.unique_id || ''} · {withdraw.user_role === 'branch' ? '网点' : withdraw.user_role === 'provider' ? '服务商' : '会员'}</div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              ¥{Number(withdraw.amount).toLocaleString()}
                            </TableCell>
                            <TableCell className="font-medium text-purple-600">
                              ¥{depositAmount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-700">已沉淀</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    {branchWithdrawals.filter((w: any) => w.status === 'completed').length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          暂无沉淀记录
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-2">沉淀统计</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
                    <div>
                      <div className="text-sm text-gray-500">通过笔数</div>
                      <div className="text-xl font-bold text-purple-600">
                        {branchWithdrawals.filter((w: any) => w.status === 'completed').length}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">总变现金额</div>
                      <div className="text-xl font-bold text-purple-600">
                        ¥{totalApproved.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">累计沉淀</div>
                      <div className="text-xl font-bold text-purple-600">
                        ¥{Math.floor(totalApproved * 0.05).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // 智算中心 - 市场费分配（独立组件）
  const EnergyManagement = () => {
    const [energyTab, setEnergyTab] = useState<'overview' | 'accounts' | 'transactions' | 'request' | 'withdraw' | 'fee'>('overview');
    const [energyData, setEnergyData] = useState<any>(null);
    const [energyAccounts, setEnergyAccounts] = useState<any[]>([]);
    const [energyTransactions, setEnergyTransactions] = useState<any[]>([]);
    const [energyLoading, setEnergyLoading] = useState(false);
    const [energyTransactionType, setEnergyTransactionType] = useState<string>('all');
    const [branchEnergyRequests, setBranchEnergyRequests] = useState<any[]>([]);
    const [branchEnergyPendingCount, setBranchEnergyPendingCount] = useState(0);
    const [showReleaseDialog, setShowReleaseDialog] = useState(false);
    const [releaseForm, setReleaseForm] = useState({ toUserId: '', amount: '', note: '' });
    const [showTransferDialog, setShowTransferDialog] = useState(false);
    const [transferForm, setTransferForm] = useState({ toUserId: '', amount: '', note: '' });
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [allUsersList, setAllUsersList] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [withdrawRequests, setWithdrawRequests] = useState<any[]>([]);
    const [withdrawStats, setWithdrawStats] = useState<any>(null);
    const [withdrawFilter, setWithdrawFilter] = useState<string>(''); // 变现审核筛选状态
    const [branchList, setBranchList] = useState<any[]>([]); // 服务网点列表
    const searchContainerRef = useRef<HTMLDivElement>(null); // 搜索容器 ref
    const isMountedRef = useRef(true); // 组件卸载标记

    // 显示消息
    const showMessage = (type: 'success' | 'error', text: string) => {
      setMessage({ type, text });
      setTimeout(() => setMessage(null), 3000);
    };

    // 组件卸载时设置标记
    useEffect(() => {
      return () => {
        isMountedRef.current = false;
      };
    }, []);

    // 点击外部关闭下拉
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
          setShowUserDropdown(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 加载服务网点收益申请记录
    const loadBranchEnergyRequestsInComponent = async () => {
      if (!isMountedRef.current) return;
      setEnergyLoading(true);
      try {
        const response = await authFetch('/api/energy/branch-request');
        if (!isMountedRef.current) return;
        if (!response.ok) {
          setEnergyLoading(false);
          return;
        }
        const data = await response.json();
        if (data.success && data.data) {
          setBranchEnergyRequests(data.data.records || []);
          setBranchEnergyPendingCount(data.data.stats?.pending?.count || 0);
        }
      } catch (error) {
        if (isMountedRef.current) {
          console.error('加载服务网点收益申请失败:', error);
        }
      } finally {
        if (isMountedRef.current) {
          setEnergyLoading(false);
        }
      }
    };

    // 审核服务网点收益申请
    const handleApproveBranchEnergyRequestInComponent = async (requestId: string, action: 'approve' | 'reject', note?: string) => {
      const adminId = localStorage.getItem('userId');
      if (!adminId) return;

      setSubmitting(true);
      try {
        const response = await authFetch('/api/energy/approve-branch-request', {
          method: 'POST',
          body: JSON.stringify({
            requestId,
            adminId,
            action,
            note,
          }),
        });

        const data = await response.json();
        if (data.success) {
          showMessage('success', data.message || '操作成功');
          loadBranchEnergyRequestsInComponent();
          loadEnergyOverview();
          loadBranchEnergyPendingCount();
        } else {
          showMessage('error', data.error || '操作失败');
        }
      } catch (error) {
        showMessage('error', '网络错误');
      } finally {
        setSubmitting(false);
      }
    };

    // 申请审核视图（EnergyManagement组件内）
    const renderRequestTabInComponent = () => {
      const pendingRequests = branchEnergyRequests.filter((r: any) => r.status === 'pending');
      const approvedRequests = branchEnergyRequests.filter((r: any) => r.status === 'approved');
      const rejectedRequests = branchEnergyRequests.filter((r: any) => r.status === 'rejected');

      return (
        <div className="space-y-3 md:space-y-6">
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <Card className="mobile-compact-card bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">总申请数</p>
                    <p className="text-2xl font-bold mt-1">{branchEnergyRequests.length}</p>
                    <p className="text-xs opacity-70 mt-1">次</p>
                  </div>
                  <Zap className="w-10 h-10 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card 
              className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => {
                const pendingList = document.getElementById('pending-requests');
                pendingList?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">待审核</p>
                    <p className="text-2xl font-bold mt-1">{pendingRequests.length}</p>
                    <p className="text-xs opacity-70 mt-1">次</p>
                  </div>
                  <Clock className="w-10 h-10 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="mobile-compact-card bg-gradient-to-br from-green-500 to-emerald-500 text-white">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">已通过</p>
                    <p className="text-2xl font-bold mt-1">
                      {approvedRequests.reduce((sum: number, r: any) => sum + (r.amount || 0), 0).toLocaleString()}
                    </p>
                    <p className="text-xs opacity-70 mt-1">收益</p>
                  </div>
                  <CheckCircle className="w-10 h-10 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="mobile-compact-card bg-gradient-to-br from-gray-500 to-gray-600 text-white">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">已拒绝</p>
                    <p className="text-2xl font-bold mt-1">{rejectedRequests.length}</p>
                    <p className="text-xs opacity-70 mt-1">次</p>
                  </div>
                  <XCircle className="w-10 h-10 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 待审核申请 */}
          <Card id="pending-requests">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                待审核申请
                {pendingRequests.length > 0 && (
                  <Badge className="ml-2 bg-yellow-500 text-white">{pendingRequests.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingRequests.length > 0 ? (
                <div className="space-y-4">
                  {pendingRequests.map((request: any) => (
                    <div key={request.id} className="p-4 border border-yellow-200 rounded-lg hover:bg-yellow-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="font-medium text-lg">
                              {request.branchName}
                              <span className="text-sm text-gray-500 ml-2">
                                (手机: {request.branchPhone || '-'})
                              </span>
                            </p>
                            <Badge className="bg-yellow-100 text-yellow-700">
                              待审核
                            </Badge>
                          </div>
                          <p className="text-2xl font-bold text-purple-600 mt-2">
                            申请收益: {request.amount?.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            申请时间: {request.createdAt ? new Date(request.createdAt).toLocaleString() : '-'}
                          </p>
                          {request.note && (
                            <p className="text-xs text-gray-400 mt-1">备注: {request.note}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproveBranchEnergyRequestInComponent(request.id, 'approve')}
                            disabled={submitting}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            通过
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const note = prompt('请输入拒绝原因（可选）:');
                              handleApproveBranchEnergyRequestInComponent(request.id, 'reject', note || undefined);
                            }}
                            disabled={submitting}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            拒绝
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <CheckCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">暂无待审核的申请</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 已处理申请记录 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                已处理记录
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>申请时间</TableHead>
                    <TableHead>服务网点</TableHead>
                    <TableHead>申请金额</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>审核时间</TableHead>
                    <TableHead>审核备注</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branchEnergyRequests
                    .filter((r: any) => r.status !== 'pending')
                    .slice(0, 20)
                    .map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell className="text-xs">
                          {request.createdAt ? new Date(request.createdAt).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell className="font-medium">{request.branchName}</TableCell>
                        <TableCell className="text-purple-600 font-medium">
                          {request.amount?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            request.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }>
                            {request.status === 'approved' ? '已通过' : '已拒绝'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {request.reviewerNote || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  {branchEnergyRequests.filter((r: any) => r.status !== 'pending').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        暂无已处理记录
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 操作说明 */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <h4 className="font-semibold text-blue-800 mb-2">服务网点收益申请审核说明</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>1. 服务网点向智算中心申请收益，最低申请金额为 50 收益</li>
                <li>2. 智算中心审核通过后，收益会自动从智算中心账户扣除并发放给服务网点</li>
                <li>3. 智算中心审核拒绝后，服务网点申请将被标记为已拒绝</li>
                <li>4. 收益用于服务网点给服务商分配，服务商给会员充值后产生收益</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      );
    };

    // 加载收益总览数据
    const loadEnergyOverview = async () => {
      setEnergyLoading(true);
      try {
        const response = await authFetch('/api/energy?type=all');
        if (!response.ok) {
          setEnergyLoading(false);
          return;
        }
        const data = await response.json();
        if (data.success) {
          setEnergyData(data.data);
        }
      } catch (error) {
        console.error('加载收益总览失败:', error);
      } finally {
        setEnergyLoading(false);
      }
    };

    // 加载收益账户列表
    const loadEnergyAccounts = async () => {
      setEnergyLoading(true);
      try {
        const response = await authFetch('/api/energy-accounts');
        if (!response.ok) {
          setEnergyLoading(false);
          return;
        }
        const data = await response.json();
        if (data.success) {
          setEnergyAccounts(data.data?.accounts || []);
        }
      } catch (error) {
        console.error('加载收益账户失败:', error);
      } finally {
        setEnergyLoading(false);
      }
    };

    // 加载收益流水记录
    const loadEnergyTransactions = async (type?: string) => {
      if (!isMountedRef.current) return;
      setEnergyLoading(true);
      try {
        const url = type && type !== 'all' ? `/api/energy-transactions?type=${type}` : '/api/energy-transactions';
        const response = await authFetch(url);
        if (!isMountedRef.current) return;
        if (!response.ok) {
          setEnergyLoading(false);
          return;
        }
        const data = await response.json();
        if (data.success) {
          setEnergyTransactions(data.data?.transactions || []);
        }
      } catch (error) {
        if (isMountedRef.current) {
          console.error('加载收益流水失败:', error);
        }
      } finally {
        if (isMountedRef.current) {
          setEnergyLoading(false);
        }
      }
    };

    // 加载服务网点列表
    const loadBranchList = async () => {
      if (!isMountedRef.current) return;
      try {
        const response = await authFetch('/api/admin/users?role=branch');
        if (!isMountedRef.current) return;
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (data.success) {
          setBranchList(data.data || []);
        }
      } catch (error) {
        if (isMountedRef.current) {
          console.error('加载服务网点列表失败:', error);
        }
      }
    };

    // 加载所有用户列表（用于转账）
    const loadAllUsersList = async () => {
      if (!isMountedRef.current) return;
      try {
        const response = await authFetch('/api/admin/users');
        if (!isMountedRef.current) return;
        if (!response.ok) {
          console.error('加载用户列表失败:', response.status);
          return;
        }
        const data = await response.json();
        if (data.success) {
          // 过滤掉admin用户，只保留服务网点、服务商、会员
          const filteredUsers = (data.data || []).filter((u: any) => u.role !== 'admin');
          setAllUsersList(filteredUsers);
        }
      } catch (error) {
        if (isMountedRef.current) {
          console.error('加载用户列表失败:', error);
        }
      }
    };

    // 加载变现申请列表
    const loadWithdrawRequests = async (status?: string) => {
      setEnergyLoading(true);
      if (status !== undefined) {
        setWithdrawFilter(status);
      }
      try {
        const url = status 
          ? `/api/withdrawals?tab=review&status=${status}` 
          : '/api/withdrawals?tab=review';
        const response = await authFetch(url);
        if (!response.ok) {
          setEnergyLoading(false);
          return;
        }
        const data = await response.json();
        if (data.success) {
          setWithdrawRequests(data.data?.records || []);
          setWithdrawStats(data.data?.stats || null);
        }
      } catch (error) {
        console.error('加载变现申请列表失败:', error);
      } finally {
        setEnergyLoading(false);
      }
    };

    // 审核变现申请
    const handleApproveWithdraw = async (requestId: string, action: 'approve' | 'reject', note?: string) => {
      if (!user?.id) {
        showMessage('error', '请先登录');
        return;
      }

      setSubmitting(true);
      try {
        const response = await authFetch('/api/withdrawals/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            withdrawalId: requestId,
            action,
            rejectReason: action === 'reject' ? note : undefined,
          }),
        });

        const data = await response.json();
        if (data.success) {
          showMessage('success', data.message || `已${action === 'approve' ? '通过' : '拒绝'}变现申请`);
          loadWithdrawRequests();
          loadEnergyOverview();
          loadEnergyAccounts();
        } else {
          showMessage('error', data.error || '操作失败');
        }
      } catch (error) {
        showMessage('error', '网络错误');
      } finally {
        setSubmitting(false);
      }
    };

    // 释放收益给服务网点
    const handleReleaseEnergy = async () => {
      const adminId = localStorage.getItem('userId');
      if (!adminId || !releaseForm.toUserId || !releaseForm.amount) {
        showMessage('error', '请填写完整信息');
        return;
      }

      setSubmitting(true);
      try {
        const response = await authFetch('/api/energy/manual-release', {
          method: 'POST',
          body: JSON.stringify({
            fromUserId: adminId,
            toUserId: releaseForm.toUserId,
            amount: Number(releaseForm.amount),
            note: releaseForm.note,
          }),
        });

        const data = await response.json();
        if (data.success) {
          showMessage('success', '收益释放成功');
          setShowReleaseDialog(false);
          setReleaseForm({ toUserId: '', amount: '', note: '' });
          loadEnergyOverview();
        } else {
          showMessage('error', data.error || '操作失败');
        }
      } catch (error) {
        showMessage('error', '网络错误');
      } finally {
        setSubmitting(false);
      }
    };

    // 向任意用户转账收益
    const handleTransferEnergy = async () => {
      const adminId = localStorage.getItem('userId');
      if (!adminId || !transferForm.toUserId || !transferForm.amount) {
        showMessage('error', '请填写完整信息');
        return;
      }

      setSubmitting(true);
      try {
        const response = await authFetch('/api/energy/admin-transfer', {
          method: 'POST',
          body: JSON.stringify({
            fromUserId: adminId,
            toUserId: transferForm.toUserId,
            amount: Number(transferForm.amount),
            note: transferForm.note,
          }),
        });

        const data = await response.json();
        if (data.success) {
          showMessage('success', data.message || '转账成功');
          setShowTransferDialog(false);
          setTransferForm({ toUserId: '', amount: '', note: '' });
          loadEnergyOverview();
          loadEnergyAccounts();
        } else {
          showMessage('error', data.error || '操作失败');
        }
      } catch (error) {
        showMessage('error', '网络错误');
      } finally {
        setSubmitting(false);
      }
    };
    
    useEffect(() => {
      if (energyTab === 'overview') {
        loadEnergyOverview();
      } else if (energyTab === 'accounts') {
        loadEnergyAccounts();
      } else if (energyTab === 'transactions') {
        loadEnergyTransactions(energyTransactionType);
      } else if (energyTab === 'request') {
        loadBranchEnergyRequestsInComponent();
      } else if (energyTab === 'withdraw') {
        loadWithdrawRequests(withdrawFilter || undefined);
      }
      // 服务网点列表和用户列表只需要在组件挂载时加载一次
      loadBranchList();
      loadAllUsersList();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [energyTab, energyTransactionType, withdrawFilter]);

    const formatEnergy = (amount: number | string | undefined | null) => {
      const num = Number(amount) || 0;
      if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
      }
      return num.toLocaleString();
    };

    const getTypeName = (type: string) => {
      const typeMap: Record<string, string> = {
        quota_match: '算力额度匹配',
        purchase: '收益购买',
        market_transfer: '市场内流转',
        withdraw: '提现沉淀',
        manual: '人工释放',
        burn: '收益销毁',
        create: '收益创建',
        transfer_out: '转出',
        transfer_in: '转入',
      };
      return typeMap[type] || type;
    };

    const getTypeColor = (type: string) => {
      const colorMap: Record<string, string> = {
        quota_match: 'bg-blue-100 text-blue-700',
        purchase: 'bg-green-100 text-green-700',
        market_transfer: 'bg-purple-100 text-purple-700',
        withdraw: 'bg-red-100 text-red-700',
        manual: 'bg-orange-100 text-orange-700',
        burn: 'bg-red-100 text-red-700',
        create: 'bg-amber-100 text-amber-700',
        transfer_out: 'bg-gray-100 text-gray-700',
        transfer_in: 'bg-gray-100 text-gray-700',
      };
      return colorMap[type] || 'bg-gray-100 text-gray-700';
    };

    // 五大板块数据
    const quotaMatchData = energyData?.quotaMatch || { records: [], total: 0 };
    const purchaseData = energyData?.purchase || { records: [], total: 0 };
    const marketDistribution = energyData?.marketDistribution || { accounts: [], total: 0 };
    const marketTransfer = energyData?.marketTransfer || { records: [], total: 0 };
    const withdrawData = energyData?.withdraw || { records: [], total: 0, withdrawApprovedAmount: 0, burnAmount: 0, feeAmount: 0, pendingCount: 0, pendingAmount: 0 };

    // 总览视图
    const renderOverviewTab = () => (
      <div className="space-y-3 md:space-y-6">
        {/* 顶部统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="mobile-compact-card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">智算中心收益余额</p>
                  <p className="text-2xl font-bold">{formatEnergy(energyData?.adminBalance)}</p>
                  <p className="text-xs opacity-70 mt-1">收益</p>
                </div>
                <Zap className="w-10 h-10 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="mobile-compact-card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">算力额度匹配</p>
                  <p className="text-2xl font-bold">{formatEnergy(quotaMatchData.total)}</p>
                  <p className="text-xs opacity-70 mt-1">智算中心→服务网点</p>
                </div>
                <Database className="w-10 h-10 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="mobile-compact-card bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">收益购买</p>
                  <p className="text-2xl font-bold">{formatEnergy(purchaseData.total)}</p>
                  <p className="text-xs opacity-70 mt-1">服务网点→智算中心</p>
                </div>
                <ShoppingCart className="w-10 h-10 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="mobile-compact-card bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">销毁的收益</p>
                  <p className="text-2xl font-bold">{formatEnergy(withdrawData.burnAmount)}</p>
                  <p className="text-xs opacity-70 mt-1">
                    待审核: {withdrawData.pendingCount}笔 / {formatEnergy(withdrawData.pendingAmount)}
                  </p>
                </div>
                <Wallet className="w-10 h-10 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="mobile-compact-card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">提现沉淀</p>
                  <p className="text-2xl font-bold">{formatEnergy(withdrawData.feeAmount)}</p>
                  <p className="text-xs opacity-70 mt-1">手续费(5%)</p>
                </div>
                <TrendingDown className="w-10 h-10 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 五大板块详情 */}
        <div className="grid grid-cols-2 gap-6">
          {/* 板块1：算力额度匹配 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                板块1：算力额度匹配
                <Badge className="bg-blue-100 text-blue-700">智算中心→服务网点</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 mb-4">
                {formatEnergy(quotaMatchData.total)} 收益
              </div>
              <div className="text-sm text-gray-500 mb-4">
                <p>智算中心分配算力额度给服务网点时，同步分配20%收益</p>
              </div>
              <div className="max-h-40 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>时间</TableHead>
                      <TableHead>服务网点</TableHead>
                      <TableHead>金额</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotaMatchData.records.slice(0, 5).map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell className="text-xs">{new Date(record.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{record.to_username || '-'}</TableCell>
                        <TableCell className="font-medium">{record.amount?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* 板块2：收益购买 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-600" />
                板块2：收益购买
                <Badge className="bg-green-100 text-green-700">服务网点→智算中心</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 mb-4">
                {formatEnergy(purchaseData.total)} 收益
              </div>
              <div className="text-sm text-gray-500 mb-4">
                <p>服务网点向智算中心购买收益，用于给服务商充值</p>
                <p className="mt-1">服务商给会员充值收益，会员支付市场费</p>
              </div>
              <div className="max-h-40 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>时间</TableHead>
                      <TableHead>服务网点</TableHead>
                      <TableHead>金额</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseData.records.slice(0, 5).map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell className="text-xs">{new Date(record.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{record.from_username || '-'}</TableCell>
                        <TableCell className="font-medium">{record.amount?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* 板块3：市场收益分布 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-purple-600" />
                板块3：市场收益分布
                <Badge className="bg-purple-100 text-purple-700">服务商+会员</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600 mb-4">
                {formatEnergy(marketDistribution.total)} 收益
              </div>
              <div className="text-sm text-gray-500 mb-4">
                <p>服务商和会员的收益账户余额分布</p>
              </div>
              <div className="max-h-40 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>角色</TableHead>
                      <TableHead>用户名</TableHead>
                      <TableHead>余额</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marketDistribution.accounts.slice(0, 5).map((account: any) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <Badge variant="outline" className={
                            account.role === 'admin' ? 'border-amber-500 text-amber-600' :
                            account.role === 'provider' ? 'border-purple-500 text-purple-600' : 
                            'border-blue-500 text-blue-600'
                          }>
                            {account.role === 'admin' ? '智算中心' : account.role === 'provider' ? '服务商' : '会员'}
                          </Badge>
                        </TableCell>
                        <TableCell>{account.username}</TableCell>
                        <TableCell className="font-medium">{formatEnergy(account.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* 板块4：市场内流转 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-600" />
                板块4：市场内流转
                <Badge className="bg-cyan-100 text-cyan-700">会员↔服务商</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-600 mb-4">
                {formatEnergy(marketTransfer.total)} 收益
              </div>
              <div className="text-sm text-gray-500 mb-4">
                <p>会员卖出产品时支付市场费，按以下比例分配</p>
              </div>
              <div className="grid grid-cols-5 gap-4 mb-4">
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-xl font-bold text-purple-600">70%</div>
                  <div className="text-xs text-gray-600 mt-1">服务商收益</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">5%</div>
                  <div className="text-xs text-gray-600 mt-1">公司运营</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">10%</div>
                  <div className="text-xs text-gray-600 mt-1">直推奖励</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-xl font-bold text-orange-600">10%</div>
                  <div className="text-xs text-gray-600 mt-1">上级服务商</div>
                </div>
                <div className="text-center p-3 bg-cyan-50 rounded-lg">
                  <div className="text-xl font-bold text-cyan-600">5%</div>
                  <div className="text-xs text-gray-600 mt-1">服务网点</div>
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>时间</TableHead>
                      <TableHead>转出方</TableHead>
                      <TableHead>转入方</TableHead>
                      <TableHead>金额</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marketTransfer.records.slice(0, 5).map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell className="text-xs">{new Date(record.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-xs">{record.from_username || '-'}</TableCell>
                        <TableCell className="text-xs">{record.to_username || '-'}</TableCell>
                        <TableCell className="font-medium">{record.amount?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* 板块5：提现沉淀 */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                板块5：提现沉淀
                <Badge className="bg-red-100 text-red-700">服务网点→智算中心</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 mb-4">
                销毁: {formatEnergy(withdrawData.burnAmount)} 收益 / 手续费: {formatEnergy(withdrawData.feeAmount)} 收益
              </div>
              <div className="text-sm text-gray-500 mb-4">
                <p>服务网点向智算中心提现收益，收益回流到智算中心账户</p>
                <p className="mt-1">提现最低门槛：50收益，手续费率：5%</p>
              </div>
              <div className="max-h-40 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>时间</TableHead>
                      <TableHead>服务网点</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>备注</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawData.records.slice(0, 5).map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell className="text-xs">{new Date(record.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{record.from_username || '-'}</TableCell>
                        <TableCell className="font-medium">{record.amount?.toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-gray-500">{record.note || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );

    // 账户列表视图
    const renderAccountsTab = () => (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>收益账户列表</CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                <Plus className="w-4 h-4 mr-2" />
                创建收益
              </Button>
              <Button onClick={() => setShowTransferDialog(true)} className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                转账收益
              </Button>
              <Button onClick={() => setShowReleaseDialog(true)} className="bg-purple-600 hover:bg-purple-700">
                <Zap className="w-4 h-4 mr-2" />
                释放收益
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户名</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>手机号</TableHead>
                <TableHead className="text-right">余额</TableHead>
                <TableHead className="text-right">累计收入</TableHead>
                <TableHead className="text-right">累计支出</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {energyAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.username}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      account.role === 'admin' ? 'border-amber-500 text-amber-600' :
                      account.role === 'branch' ? 'border-cyan-500 text-cyan-600' :
                      account.role === 'provider' ? 'border-purple-500 text-purple-600' :
                      'border-blue-500 text-blue-600'
                    }>
                      {account.role === 'admin' ? '智算中心' : account.role === 'branch' ? '服务网点' : account.role === 'provider' ? '服务商' : '会员'}
                    </Badge>
                  </TableCell>
                  <TableCell>{account.phone || '-'}</TableCell>
                  <TableCell className="text-right font-medium">{formatEnergy(account.balance)}</TableCell>
                  <TableCell className="text-right text-green-600">{formatEnergy(account.totalIn)}</TableCell>
                  <TableCell className="text-right text-red-600">{formatEnergy(account.totalOut)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );

    // 流水记录视图
    const renderTransactionsTab = () => (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>收益流水记录</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={energyTransactionType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEnergyTransactionType('all')}
              >
                全部
              </Button>
              <Button
                variant={energyTransactionType === 'quota_match' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEnergyTransactionType('quota_match')}
              >
                额度匹配
              </Button>
              <Button
                variant={energyTransactionType === 'purchase' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEnergyTransactionType('purchase')}
              >
                购买
              </Button>
              <Button
                variant={energyTransactionType === 'market_transfer' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEnergyTransactionType('market_transfer')}
              >
                市场流转
              </Button>
              <Button
                variant={energyTransactionType === 'withdraw' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEnergyTransactionType('withdraw')}
              >
                提现
              </Button>
              <Button
                variant={energyTransactionType === 'burn' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEnergyTransactionType('burn')}
              >
                销毁
              </Button>
              <Button
                variant={energyTransactionType === 'create' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEnergyTransactionType('create')}
              >
                创建
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>转出方</TableHead>
                <TableHead>转入方</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead>备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {energyTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-xs">{new Date(tx.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={getTypeColor(tx.type)}>
                      {getTypeName(tx.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>{tx.fromUsername || '-'}</div>
                    <div className="text-gray-400">{tx.fromRole || ''}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>{tx.toUsername || '-'}</div>
                    <div className="text-gray-400">{tx.toRole || ''}</div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{tx.amount?.toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-gray-500">{tx.note || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );

    // 加载服务网点收益申请记录
    const loadBranchEnergyRequests = async () => {
      setEnergyLoading(true);
      try {
        const response = await authFetch('/api/energy/branch-request');
        const data = await response.json();
        if (data.success && data.data) {
          setBranchEnergyRequests(data.data.records || []);
          setBranchEnergyPendingCount(data.data.stats?.pending?.count || 0);
        }
      } catch (error) {
        console.error('加载服务网点收益申请失败:', error);
      } finally {
        setEnergyLoading(false);
      }
    };

    // 审核服务网点收益申请
    const handleApproveBranchEnergyRequest = async (requestId: string, action: 'approve' | 'reject', note?: string) => {
      const adminId = localStorage.getItem('userId');
      if (!adminId) return;

      setSubmitting(true);
      try {
        const response = await authFetch('/api/energy/approve-branch-request', {
          method: 'POST',
          body: JSON.stringify({
            requestId,
            adminId,
            action,
            note,
          }),
        });

        const data = await response.json();
        if (data.success) {
          showMessage('success', data.message || '操作成功');
          loadBranchEnergyRequests();
          loadData();
        } else {
          showMessage('error', data.error || '操作失败');
        }
      } catch (error) {
        showMessage('error', '网络错误');
      } finally {
        setSubmitting(false);
      }
    };

    // 申请审核视图
    const renderRequestTab = () => {
      const pendingRequests = branchEnergyRequests.filter((r: any) => r.status === 'pending');
      const approvedRequests = branchEnergyRequests.filter((r: any) => r.status === 'approved');
      const rejectedRequests = branchEnergyRequests.filter((r: any) => r.status === 'rejected');

      return (
        <div className="space-y-3 md:space-y-6">
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <Card className="mobile-compact-card bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">总申请数</p>
                    <p className="text-2xl font-bold mt-1">{branchEnergyRequests.length}</p>
                    <p className="text-xs opacity-70 mt-1">次</p>
                  </div>
                  <Zap className="w-10 h-10 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card 
              className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => {
                const pendingList = document.getElementById('pending-requests');
                pendingList?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">待审核</p>
                    <p className="text-2xl font-bold mt-1">{pendingRequests.length}</p>
                    <p className="text-xs opacity-70 mt-1">次</p>
                  </div>
                  <Clock className="w-10 h-10 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="mobile-compact-card bg-gradient-to-br from-green-500 to-emerald-500 text-white">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">已通过</p>
                    <p className="text-2xl font-bold mt-1">
                      {approvedRequests.reduce((sum: number, r: any) => sum + (r.amount || 0), 0).toLocaleString()}
                    </p>
                    <p className="text-xs opacity-70 mt-1">收益</p>
                  </div>
                  <CheckCircle className="w-10 h-10 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="mobile-compact-card bg-gradient-to-br from-gray-500 to-gray-600 text-white">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">已拒绝</p>
                    <p className="text-2xl font-bold mt-1">{rejectedRequests.length}</p>
                    <p className="text-xs opacity-70 mt-1">次</p>
                  </div>
                  <XCircle className="w-10 h-10 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 待审核申请 */}
          <Card id="pending-requests">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                待审核申请
                {pendingRequests.length > 0 && (
                  <Badge className="ml-2 bg-yellow-500 text-white">{pendingRequests.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingRequests.length > 0 ? (
                <div className="space-y-4">
                  {pendingRequests.map((request: any) => (
                    <div key={request.id} className="p-4 border border-yellow-200 rounded-lg hover:bg-yellow-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="font-medium text-lg">
                              {request.branchName}
                              <span className="text-sm text-gray-500 ml-2">
                                (手机: {request.branchPhone || '-'})
                              </span>
                            </p>
                            <Badge className="bg-yellow-100 text-yellow-700">
                              待审核
                            </Badge>
                          </div>
                          <p className="text-2xl font-bold text-purple-600 mt-2">
                            申请收益: {request.amount?.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            申请时间: {request.createdAt ? new Date(request.createdAt).toLocaleString() : '-'}
                          </p>
                          {request.note && (
                            <p className="text-xs text-gray-400 mt-1">备注: {request.note}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproveBranchEnergyRequest(request.id, 'approve')}
                            disabled={submitting}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            通过
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const note = prompt('请输入拒绝原因（可选）:');
                              handleApproveBranchEnergyRequest(request.id, 'reject', note || undefined);
                            }}
                            disabled={submitting}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            拒绝
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <CheckCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">暂无待审核的申请</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 已处理申请记录 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                已处理记录
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>申请时间</TableHead>
                    <TableHead>服务网点</TableHead>
                    <TableHead>申请金额</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>审核时间</TableHead>
                    <TableHead>审核备注</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branchEnergyRequests
                    .filter((r: any) => r.status !== 'pending')
                    .slice(0, 20)
                    .map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell className="text-xs">
                          {request.createdAt ? new Date(request.createdAt).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell className="font-medium">{request.branchName}</TableCell>
                        <TableCell className="text-purple-600 font-medium">
                          {request.amount?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            request.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }>
                            {request.status === 'approved' ? '已通过' : '已拒绝'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {request.reviewerNote || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  {branchEnergyRequests.filter((r: any) => r.status !== 'pending').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        暂无已处理记录
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 操作说明 */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <h4 className="font-semibold text-blue-800 mb-2">服务网点收益申请审核说明</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>1. 服务网点向智算中心申请收益，最低申请金额为 50 收益</li>
                <li>2. 智算中心审核通过后，收益会自动从智算中心账户扣除并发放给服务网点</li>
                <li>3. 智算中心审核拒绝后，服务网点申请将被标记为已拒绝</li>
                <li>4. 收益用于服务网点给服务商分配，服务商给会员充值后产生收益</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      );
    };

    // 5%回收统计视图
    const renderFeeTab = () => {
      // 计算5%回收总额
      const totalFee = withdrawData?.totalBurn || 0;
      const totalWithdraw = withdrawData?.approvedAmount || 0;
      const estimatedFee = totalWithdraw * 0.05;

      return (
        <div className="space-y-3 md:space-y-6">
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
            <Card className="mobile-compact-card bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
              <CardContent className="pt-4">
                <p className="text-sm opacity-80">累计回收总额</p>
                <p className="text-3xl font-bold mt-2">{totalFee.toLocaleString()}</p>
                <p className="text-xs opacity-70 mt-2">收益</p>
              </CardContent>
            </Card>
            <Card className="mobile-compact-card bg-gradient-to-br from-green-500 to-emerald-500 text-white">
              <CardContent className="pt-4">
                <p className="text-sm opacity-80">累计提现总额</p>
                <p className="text-3xl font-bold mt-2">{totalWithdraw.toLocaleString()}</p>
                <p className="text-xs opacity-70 mt-2">收益</p>
              </CardContent>
            </Card>
            <Card className="mobile-compact-card bg-gradient-to-br from-amber-500 to-orange-500 text-white">
              <CardContent className="pt-4">
                <p className="text-sm opacity-80">回收比例</p>
                <p className="text-3xl font-bold mt-2">5%</p>
                <p className="text-xs opacity-70 mt-2">每次提现</p>
              </CardContent>
            </Card>
          </div>

          {/* 回收说明 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-purple-600" />
                5%回收机制说明
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-2">回收流程</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>会员申请提现收益（如：100收益）</li>
                    <li>服务商审核通过，线下给会员转账（如：95元）</li>
                    <li>确认后，会员收益扣除100</li>
                    <li>服务商收益增加95</li>
                    <li>智算中心回收5收益（5%）</li>
                  </ol>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">回收明细</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">会员申请提现</span>
                      <span className="font-semibold">100 收益</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">服务商获得</span>
                      <span className="font-semibold text-blue-600">+95 收益</span>
                    </div>
                    <div className="flex justify-between border-t border-green-200 pt-2">
                      <span className="text-green-800 font-medium">智算中心回收（5%）</span>
                      <span className="font-bold text-purple-600">+5 收益</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 回收记录列表 */}
          <Card>
            <CardHeader>
              <CardTitle>回收记录</CardTitle>
            </CardHeader>
            <CardContent>
              {withdrawData?.requests && withdrawData.requests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>会员</TableHead>
                      <TableHead>服务商</TableHead>
                      <TableHead>申请金额</TableHead>
                      <TableHead>实付金额</TableHead>
                      <TableHead>回收金额（5%）</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawData.requests
                      .filter((r: any) => r.status === 'completed')
                      .map((request: any) => {
                        const feeAmount = (request.amount || 0) * 0.05;
                        return (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">
                              {request.member?.username || request.memberName || '-'}
                            </TableCell>
                            <TableCell>{request.provider?.username || request.providerName || '-'}</TableCell>
                            <TableCell>{request.amount?.toLocaleString()}</TableCell>
                            <TableCell className="text-blue-600">{(request.amount * 0.95).toLocaleString()}</TableCell>
                            <TableCell className="text-purple-600 font-semibold">+{feeAmount.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge className="bg-green-500">{request.status}</Badge>
                            </TableCell>
                            <TableCell className="text-gray-500">
                              {request.updated_at ? new Date(request.updated_at).toLocaleString() : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <Percent className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>暂无回收记录</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 回收统计图表 */}
          {withdrawData?.requests && withdrawData.requests.filter((r: any) => r.status === 'completed').length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>回收趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={withdrawData.requests
                      .filter((r: any) => r.status === 'completed')
                      .map((r: any) => ({
                        ...r,
                        feeAmount: (r.amount || 0) * 0.05,
                        date: r.updated_at ? new Date(r.updated_at).toLocaleDateString() : 'Unknown'
                      }))
                    }>
                      <XAxis dataKey="date" />
                      <YAxis />
                      <CartesianGrid strokeDasharray="3 3" />
                      <Tooltip />
                      <Area type="monotone" dataKey="feeAmount" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} name="回收金额" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      );
    };

    // 变现审核视图
    const renderWithdrawTab = () => (
      <div className="space-y-3 md:space-y-6">
        {/* 统计卡片 - 可点击跳转筛选 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
          <Card 
            className="bg-gradient-to-br from-amber-500 to-orange-500 text-white cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => {
              setEnergyTab('withdraw');
              loadWithdrawRequests('pending');
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">待审核</p>
                  <p className="text-2xl font-bold">{withdrawStats?.pending?.count || 0} 笔</p>
                  <p className="text-xs opacity-70 mt-1">金额: {formatEnergy(withdrawStats?.pending?.amount || 0)}</p>
                </div>
                <Clock className="w-10 h-10 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-green-500 to-emerald-500 text-white cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => {
              setEnergyTab('withdraw');
              loadWithdrawRequests('approved');
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">已通过</p>
                  <p className="text-2xl font-bold">{withdrawStats?.approved?.count || 0} 笔</p>
                  <p className="text-xs opacity-70 mt-1">金额: {formatEnergy(withdrawStats?.approved?.amount || 0)}</p>
                </div>
                <CheckCircle className="w-10 h-10 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-gray-500 to-gray-600 text-white cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => {
              setEnergyTab('withdraw');
              loadWithdrawRequests('rejected');
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">已拒绝</p>
                  <p className="text-2xl font-bold">{withdrawStats?.rejected?.count || 0} 笔</p>
                  <p className="text-xs opacity-70 mt-1">金额: {formatEnergy(withdrawStats?.rejected?.amount || 0)}</p>
                </div>
                <XCircle className="w-10 h-10 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 变现申请列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>变现申请列表</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadWithdrawRequests()}
                >
                  全部
                </Button>
                <Button
                  variant={withdrawFilter === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  className={withdrawFilter === 'pending' ? 'bg-amber-500' : 'border-amber-500 text-amber-600'}
                  onClick={() => loadWithdrawRequests('pending')}
                >
                  待审核
                </Button>
                <Button
                  variant={withdrawFilter === 'approved' ? 'default' : 'outline'}
                  size="sm"
                  className={withdrawFilter === 'approved' ? 'bg-green-500' : 'border-green-500 text-green-600'}
                  onClick={() => loadWithdrawRequests('approved')}
                >
                  已通过
                </Button>
                <Button
                  variant={withdrawFilter === 'rejected' ? 'default' : 'outline'}
                  size="sm"
                  className={withdrawFilter === 'rejected' ? 'bg-gray-500' : 'border-gray-500 text-gray-600'}
                  onClick={() => loadWithdrawRequests('rejected')}
                >
                  已拒绝
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {withdrawRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>暂无变现申请记录</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>申请时间</TableHead>
                    <TableHead>服务网点</TableHead>
                    <TableHead>手机号</TableHead>
                    <TableHead className="text-right">申请金额</TableHead>
                    <TableHead className="text-right">手续费(5%)</TableHead>
                    <TableHead className="text-right">实际到账</TableHead>
                    <TableHead>收款方式</TableHead>
                    <TableHead>收款账号</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawRequests.map((req: any) => (
                    <TableRow key={req.id}>
                      <TableCell className="text-xs">
                        {new Date(req.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">{req.username}</TableCell>
                      <TableCell className="text-xs">{req.phone || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(req.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-red-500">
                        -{Number(req.fee).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {Number(req.actual_amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {req.payment_method === 'bank' ? '银行卡' : req.payment_method === 'alipay' ? '支付宝' : '其他'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{req.payment_account}</TableCell>
                      <TableCell>
                        <Badge className={
                          req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          req.status === 'approved' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {req.status === 'pending' ? '待审核' : req.status === 'approved' ? '已通过' : '已拒绝'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {req.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-500 text-green-600 hover:bg-green-50"
                              onClick={() => handleApproveWithdraw(req.id, 'approve')}
                              disabled={submitting}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              通过
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-red-600 hover:bg-red-50"
                              onClick={() => handleApproveWithdraw(req.id, 'reject')}
                              disabled={submitting}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              拒绝
                            </Button>
                          </div>
                        )}
                        {req.status === 'approved' && (
                          <span className="text-xs text-green-600">已打款</span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="text-xs text-gray-500">收益已返还</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 操作说明 */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h4 className="font-semibold text-blue-800 mb-2">变现审核说明</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>1. 服务网点申请变现时，收益会被冻结并扣除</li>
              <li>2. 智算中心审核通过后，产生两条流水记录：
                <span className="font-semibold text-red-600"> 收益销毁（实际打款部分）</span> + 
                <span className="font-semibold text-orange-600"> 提现沉淀（手续费5%）</span>
              </li>
              <li>3. 智算中心需要线下打款给服务网点，实际到账金额 = 申请金额 × 95%</li>
              <li>4. 拒绝申请后，收益会返还给服务网点</li>
              <li>5. 最低变现门槛：50 收益</li>
            </ul>
          </CardContent>
        </Card>

        {/* 变现流水记录 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              变现流水记录
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>服务网点</TableHead>
                  <TableHead className="text-right">销毁金额</TableHead>
                  <TableHead className="text-right">沉淀金额</TableHead>
                  <TableHead>备注</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawRequests
                  .filter((req: any) => req.status === 'approved')
                  .map((req: any) => (
                    <TableRow key={req.id}>
                      <TableCell className="text-xs">
                        {new Date(req.updated_at || req.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-red-100 text-red-700 mr-1">
                          销毁: {Number(req.actual_amount).toLocaleString()}
                        </Badge>
                        <Badge className="bg-orange-100 text-orange-700">
                          沉淀: {Number(req.fee).toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{req.username}</TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {Number(req.actual_amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-orange-600 font-medium">
                        {Number(req.fee).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs">
                        {req.payment_method === 'bank' ? '银行卡' : req.payment_method === 'alipay' ? '支付宝' : '其他'}：
                        {req.payment_account}
                      </TableCell>
                    </TableRow>
                  ))}
                {withdrawRequests.filter((req: any) => req.status === 'approved').length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      暂无已处理的变现记录
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );

    return (
      <div className="space-y-3 md:space-y-6">
        {/* 消息提示 */}
        {message && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg ${
            message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white shadow-lg`}>
            {message.text}
          </div>
        )}

        {/* Tab 切换 - 左侧标题 + 右侧Tab样式 - 深紫色主题 */}
        <div className="flex items-stretch bg-gradient-to-r from-violet-900 to-purple-900 rounded-lg overflow-hidden">
          {/* 左侧标题 */}
          <div className="flex items-center gap-3 px-6 py-4 bg-purple-950/50">
            <Zap className="w-5 h-5 text-white" />
            <span className="text-white font-semibold text-lg">市场费分配</span>
          </div>
          {/* 右侧Tab选项 */}
          <div className="flex items-center gap-1 px-4">
            <button
              onClick={() => setEnergyTab('overview')}
              className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
                energyTab === 'overview' ? 'bg-white text-purple-900 font-semibold shadow-md' : 'bg-purple-800/50 text-white/80 hover:bg-purple-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                数据总览
              </span>
            </button>
            <button
              onClick={() => setEnergyTab('accounts')}
              className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
                energyTab === 'accounts' ? 'bg-white text-purple-900 font-semibold shadow-md' : 'bg-purple-800/50 text-white/80 hover:bg-purple-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                账户列表
              </span>
            </button>
            <button
              onClick={() => setEnergyTab('transactions')}
              className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
                energyTab === 'transactions' ? 'bg-white text-purple-900 font-semibold shadow-md' : 'bg-purple-800/50 text-white/80 hover:bg-purple-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                流水记录
              </span>
            </button>
            <button
              onClick={() => { loadBranchEnergyRequestsInComponent(); setEnergyTab('request'); }}
              className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
                energyTab === 'request' ? 'bg-white text-purple-900 font-semibold shadow-md' : 'bg-purple-800/50 text-white/80 hover:bg-purple-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                申请审核
                {branchEnergyPendingCount > 0 && (
                  <Badge className="ml-1 bg-red-500 text-white text-xs">{branchEnergyPendingCount}</Badge>
                )}
              </span>
            </button>
            <button
              onClick={() => setEnergyTab('withdraw')}
              className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
                energyTab === 'withdraw' ? 'bg-white text-purple-900 font-semibold shadow-md' : 'bg-purple-800/50 text-white/80 hover:bg-purple-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                变现审核
                {withdrawData?.pendingCount > 0 && (
                  <Badge className="ml-1 bg-red-500 text-white text-xs">{withdrawData.pendingCount}</Badge>
                )}
              </span>
            </button>
            <button
              onClick={() => setEnergyTab('fee')}
              className={`px-4 py-2 rounded-md transition-colors cursor-pointer ${
                energyTab === 'fee' ? 'bg-white text-purple-900 font-semibold shadow-md' : 'bg-purple-800/50 text-white/80 hover:bg-purple-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                5%回收统计
              </span>
            </button>
          </div>
        </div>

        {/* Tab 内容 */}
        {energyLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : (
          <>
            {energyTab === 'overview' && renderOverviewTab()}
            {energyTab === 'accounts' && renderAccountsTab()}
            {energyTab === 'transactions' && renderTransactionsTab()}
            {energyTab === 'request' && renderRequestTabInComponent()}
            {energyTab === 'withdraw' && renderWithdrawTab()}
            {energyTab === 'fee' && renderFeeTab()}
          </>
        )}

        {/* 创建收益对话框 */}
        {showCreateDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-[500px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  创建收益
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">创建收益不能超过分配给服务网点额度的30%</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>创建金额</Label>
                  <Input
                    type="number"
                    placeholder="请输入收益金额"
                    value={createEnergyAmount}
                    onChange={(e) => setCreateEnergyAmount(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>备注说明</Label>
                  <Input
                    placeholder="请输入备注（可选）"
                    value={createEnergyNote}
                    onChange={(e) => setCreateEnergyNote(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreateEnergy} disabled={submitting}>
                    {submitting ? '创建中...' : '确认创建'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 释放收益对话框 */}
        {showReleaseDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-[500px]">
              <CardHeader>
                <CardTitle>释放收益给服务网点</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>选择服务网点</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    value={releaseForm.toUserId}
                    onChange={(e) => setReleaseForm({ ...releaseForm, toUserId: e.target.value })}
                  >
                    <option value="">请选择服务网点</option>
                    {branchList.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.username}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>释放金额</Label>
                  <Input
                    type="number"
                    placeholder="请输入释放金额"
                    value={releaseForm.amount}
                    onChange={(e) => setReleaseForm({ ...releaseForm, amount: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>备注</Label>
                  <Input
                    placeholder="请输入备注（可选）"
                    value={releaseForm.note}
                    onChange={(e) => setReleaseForm({ ...releaseForm, note: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowReleaseDialog(false)}>
                    取消
                  </Button>
                  <Button onClick={handleReleaseEnergy} disabled={submitting}>
                    {submitting ? '处理中...' : '确认释放'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 转账收益对话框 */}
        {showTransferDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-[520px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                  向任意用户转账收益
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">智算中心可向任何服务网点、服务商或会员转账收益</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 搜索用户 */}
                <div className="relative" ref={searchContainerRef}>
                  <Label>搜索转入用户</Label>
                  <Input
                    placeholder="输入名称、ID或手机号搜索..."
                    value={userSearchQuery}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      setShowUserDropdown(true);
                    }}
                    onFocus={() => setShowUserDropdown(true)}
                    className="mt-1"
                  />
                  {/* 搜索结果下拉 */}
                  {showUserDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {allUsersList.length === 0 ? (
                        <div className="px-3 py-2 text-gray-500 text-sm">暂无数据</div>
                      ) : (
                        allUsersList
                          .filter((u: any) => {
                            const query = userSearchQuery.toLowerCase();
                            if (!query) return true;
                            return (
                              u.username?.toLowerCase().includes(query) ||
                              u.id?.toLowerCase().includes(query) ||
                              u.phone?.toLowerCase().includes(query)
                            );
                          })
                          .slice(0, 10)
                          .map((u: any) => {
                            const energyAccount = energyAccounts.find((ea: any) => ea.userId === u.id);
                            const correctBalance = energyAccount ? Number(energyAccount.balance || 0) : 0;
                            const roleLabel = u.role === 'branch' ? '服务网点' : u.role === 'provider' ? '服务商' : '会员';
                            return (
                              <div
                                key={u.id}
                                className={`px-3 py-2 cursor-pointer hover:bg-blue-50 border-b last:border-b-0 ${
                                  transferForm.toUserId === u.id ? 'bg-blue-100' : ''
                                }`}
                                onClick={() => {
                                  setTransferForm({ ...transferForm, toUserId: u.id });
                                  setUserSearchQuery(u.username + ' [' + roleLabel + ']');
                                  setShowUserDropdown(false);
                                }}
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <span className="font-medium">{u.username}</span>
                                    <span className="ml-2 text-xs text-gray-500">[{roleLabel}]</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs text-gray-500">ID: {u.id.slice(0, 8)}...</div>
                                    {u.phone && <div className="text-xs text-gray-400">{u.phone}</div>}
                                  </div>
                                </div>
                                <div className="text-xs text-green-600 mt-1">余额: {formatEnergy(correctBalance)}</div>
                              </div>
                            );
                          })
                      )}
                      {userSearchQuery && allUsersList.filter((u: any) => {
                        const query = userSearchQuery.toLowerCase();
                        return (
                          u.username?.toLowerCase().includes(query) ||
                          u.id?.toLowerCase().includes(query) ||
                          u.phone?.toLowerCase().includes(query)
                        );
                      }).length === 0 && (
                        <div className="px-3 py-2 text-gray-500 text-sm">未找到匹配的用户</div>
                      )}
                    </div>
                  )}
                </div>
                {/* 已选择用户显示 */}
                {transferForm.toUserId && (
                  <div className="p-3 bg-green-50 rounded-md border border-green-200">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm">
                        {allUsersList.find((u: any) => u.id === transferForm.toUserId)?.username?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="font-medium">
                          {allUsersList.find((u: any) => u.id === transferForm.toUserId)?.username}
                        </div>
                        <div className="text-xs text-gray-500">
                          {allUsersList.find((u: any) => u.id === transferForm.toUserId)?.role === 'branch' ? '服务网点' : 
                           allUsersList.find((u: any) => u.id === transferForm.toUserId)?.role === 'provider' ? '服务商' : '会员'}
                        </div>
                      </div>
                      <button
                        className="ml-auto text-gray-400 hover:text-red-500"
                        onClick={() => {
                          setTransferForm({ ...transferForm, toUserId: '' });
                          setUserSearchQuery('');
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <Label>转账金额</Label>
                  <Input
                    type="number"
                    placeholder="请输入转账金额"
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">当前智算中心余额：{formatEnergy(energyData?.adminBalance)} 收益</p>
                </div>
                <div>
                  <Label>备注</Label>
                  <Input
                    placeholder="请输入备注（可选）"
                    value={transferForm.note}
                    onChange={(e) => setTransferForm({ ...transferForm, note: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => {
                    setShowTransferDialog(false);
                    setTransferForm({ toUserId: '', amount: '', note: '' });
                    setUserSearchQuery('');
                  }}>
                    取消
                  </Button>
                  <Button onClick={handleTransferEnergy} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                    {submitting ? '处理中...' : '确认转账'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  };

  // 模板管理
  const loadTemplates = async () => {
    setTemplateLoading(true);
    try {
      const res = await fetch('/api/product-templates');
      const data = await res.json();
      if (data.success) {
        setTemplateList(data.data);
      }
    } catch (e) {
      console.error('加载模板失败', e);
    } finally {
      setTemplateLoading(false);
    }
  };

  const toggleTemplateStatus = async (templateId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch('/api/product-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        loadTemplates();
      } else {
        setMessage({ type: 'error', text: data.error || '操作失败' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: '操作失败' });
    }
  };

  const renderTemplateManagement = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">模板管理</h2>
            <p className="text-sm text-gray-500 mt-1">控制服务商端可用的产品模板，禁用后服务商将无法看到该模板</p>
          </div>
          <button
            onClick={loadTemplates}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
          >
            刷新
          </button>
        </div>

        {templateLoading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templateList.map((tpl: any) => {
              const isActive = tpl.status === 'active';
              return (
                <div
                  key={tpl.id}
                  className={`rounded-xl border-2 p-5 transition-all ${
                    isActive
                      ? 'border-green-300 bg-green-50/50 shadow-md'
                      : 'border-gray-200 bg-gray-50 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span className="font-bold text-gray-800">{tpl.name}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {isActive ? '已启用' : '已禁用'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex justify-between">
                      <span>产品编号</span>
                      <span className="font-mono">{tpl.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>周期</span>
                      <span className="font-medium">{tpl.period}天</span>
                    </div>
                    <div className="flex justify-between">
                      <span>总收益率</span>
                      <span className="font-medium text-orange-600">{tpl.total_rate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>会员到手</span>
                      <span className="font-medium text-green-600">{tpl.profit_rate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>智算金支付</span>
                      <span className="font-medium text-blue-600">{tpl.market_rate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>最低额度</span>
                      <span className="font-medium">¥{(tpl.min_quota || 10000).toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleTemplateStatus(tpl.id, tpl.status)}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {isActive ? '禁用模板' : '启用模板'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {!templateLoading && templateList.length === 0 && (
          <div className="text-center py-12 text-gray-400">暂无模板数据</div>
        )}
      </div>
    );
  };

  // 积分兑换管理
  const loadPointsProducts = async () => {
    setPointsLoading(true);
    try {
      const res = await fetch('/api/points-products');
      const data = await res.json();
      if (data.success) {
        setPointsProducts(data.data || []);
      }
    } catch (e) {
      console.error('加载积分商品失败', e);
    } finally {
      setPointsLoading(false);
    }
  };

  const loadExchangeOrders = async () => {
    try {
      const res = await fetch('/api/points-exchange/orders');
      const data = await res.json();
      if (data.success) {
        setExchangeOrders(data.data || []);
      }
    } catch (e) {
      console.error('加载兑换订单失败', e);
    }
  };

  // 资金流水加载
  const loadCapitalFlow = async () => {
    setCapitalFlowLoading(true);
    try {
      const flowType = capitalFlowTab === 'all' ? '' : capitalFlowTab;
      const params = new URLSearchParams({
        page: String(capitalFlowPage),
        pageSize: '20',
      });
      if (flowType) params.set('flowType', flowType);
      const res = await fetch(`/api/capital-flow?${params}`);
      const data = await res.json();
      if (data.success) {
        setCapitalFlowData(data.data);
      }
    } catch (e) {
      console.error('加载资金流水失败', e);
    } finally {
      setCapitalFlowLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.points_price) {
      setMessage({ type: 'error', text: '请填写商品名称和兑换积分' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/points-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProduct.name,
          description: newProduct.description,
          imageUrl: newProduct.image_url,
          pointsPrice: newProduct.points_price,
          stock: -1,
          createdBy: user?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: '商品添加成功' });
        setShowAddProductDialog(false);
        setNewProduct({ name: '', description: '', image_url: '', points_price: 0 });
        loadPointsProducts();
      } else {
        setMessage({ type: 'error', text: data.error || '添加失败' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: '添加失败' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('确定删除该商品？')) return;
    try {
      const res = await fetch(`/api/points-products/${productId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: '商品已删除' });
        loadPointsProducts();
      } else {
        setMessage({ type: 'error', text: data.error || '删除失败' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: '删除失败' });
    }
  };

  const renderPointsShopManagement = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">积分兑换管理</h2>
            <p className="text-sm text-gray-500 mt-1">添加和管理积分兑换商品，三端（会员/服务商/网点）均可浏览兑换</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { loadExchangeOrders(); setShowOrdersDialog(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              兑换记录
            </button>
            <button
              onClick={loadPointsProducts}
              className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              刷新
            </button>
            <button
              onClick={() => setShowAddProductDialog(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> 添加商品
            </button>
          </div>
        </div>

        {pointsLoading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pointsProducts.map((product: any) => (
              <div key={product.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {product.image_url ? (
                  <div className="h-40 bg-gray-100 overflow-hidden">
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-40 bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
                    <Gift className="w-12 h-12 text-purple-300" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-800 truncate">{product.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {product.status === 'active' ? '上架' : '下架'}
                    </span>
                  </div>
                  {product.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-orange-600 font-bold">
                      <Coins className="w-4 h-4" />
                      <span>{product.points_price} 积分</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {product.stock !== -1 && (
                    <div className="text-xs text-gray-400 mt-2">库存: {product.stock}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!pointsLoading && pointsProducts.length === 0 && (
          <div className="text-center py-16">
            <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">暂无积分商品，点击"添加商品"创建</p>
          </div>
        )}
      </div>
    );
  };

  // 资金流水统计
  const renderCapitalFlow = () => {
    const stats = capitalFlowData?.stats || {};
    const typeStats = capitalFlowData?.typeStats || [];
    const records = capitalFlowData?.records || [];
    const pagination = capitalFlowData?.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 };

    const flowTypeOptions = [
      { value: 'all', label: '全部' },
      { value: 'transfer_out', label: '转出' },
      { value: 'transfer_in', label: '转入' },
      { value: 'withdraw', label: '提现' },
      { value: 'energy_to_points', label: '转积分' },
      { value: 'withdraw_income', label: '提现收入' },
    ];

    const flowTypeLabels: Record<string, string> = {
      transfer_out: '转出',
      transfer_in: '转入',
      energy_to_points: '转积分',
      withdraw: '提现',
      withdraw_income: '提现收入',
      withdraw_fee: '提现手续费',
    };

    const flowTypeColors: Record<string, string> = {
      transfer_out: 'text-red-600 bg-red-50',
      transfer_in: 'text-green-600 bg-green-50',
      energy_to_points: 'text-purple-600 bg-purple-50',
      withdraw: 'text-orange-600 bg-orange-50',
      withdraw_income: 'text-emerald-600 bg-emerald-50',
      recharge: 'text-blue-600 bg-blue-50',
      sell_profit: 'text-emerald-600 bg-emerald-50',
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">资金流水</h2>
            <p className="text-sm text-gray-500 mt-1">全局资金流水记录：转账、转积分、提现、充值</p>
          </div>
          <button
            onClick={loadCapitalFlow}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" /> 刷新
          </button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="w-4 h-4 text-red-500" />
              <span className="text-xs text-gray-500">转出总额</span>
            </div>
            <div className="text-lg font-bold text-red-600">{Number(stats.total_transfer_out || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownRight className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500">转入总额</span>
            </div>
            <div className="text-lg font-bold text-green-600">{Number(stats.total_transfer_in || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-gray-500">转积分总额</span>
            </div>
            <div className="text-lg font-bold text-purple-600">{Number(stats.total_to_points || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-gray-500">提现总额</span>
            </div>
            <div className="text-lg font-bold text-orange-600">{Number(stats.total_withdraw || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-gray-500">提现收入</span>
            </div>
            <div className="text-lg font-bold text-emerald-600">{Number(stats.total_withdraw_income || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-500">手续费合计</span>
            </div>
            <div className="text-lg font-bold text-gray-700">
              {Number((Number(stats.total_transfer_fee || 0) + Number(stats.total_withdraw_fee || 0))).toLocaleString()}
            </div>
          </div>
        </div>

        {/* 类型分布 */}
        {typeStats.length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">流水类型分布</h3>
            <div className="flex flex-wrap gap-3">
              {typeStats.map((ts: any) => (
                <div key={ts.flow_type} className={`px-4 py-2 rounded-lg ${flowTypeColors[ts.flow_type] || 'text-gray-600 bg-gray-50'}`}>
                  <span className="text-xs font-medium">{flowTypeLabels[ts.flow_type] || ts.flow_type}</span>
                  <div className="text-lg font-bold">{Number(ts.total_amount).toLocaleString()}</div>
                  <span className="text-xs opacity-70">{ts.count}笔</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 类型筛选Tab */}
        <div className="flex flex-wrap gap-2">
          {flowTypeOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setCapitalFlowTab(opt.value); setCapitalFlowPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                capitalFlowTab === opt.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 明细列表 */}
        {capitalFlowLoading ? (
          <div className="text-center py-12 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            加载中...
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>手续费</TableHead>
                  <TableHead>实际金额</TableHead>
                  <TableHead>关联方</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${flowTypeColors[r.flowType] || 'text-gray-600 bg-gray-50'}`}>
                        {flowTypeLabels[r.flowType] || r.flowType}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{r.userName || '-'}</div>
                      {r.userPhone && <div className="text-xs text-gray-400">{r.userPhone}</div>}
                    </TableCell>
                    <TableCell className="font-semibold">{Number(r.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-red-500 text-sm">{r.feeAmount > 0 ? `-${r.feeAmount}` : '-'}</TableCell>
                    <TableCell className="text-sm">{Number(r.actualAmount).toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-gray-500">{r.relatedUserName || '-'}</TableCell>
                    <TableCell className="text-xs text-gray-400 max-w-32 truncate">{r.note || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        r.status === 'completed' ? 'bg-green-100 text-green-700' :
                        r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {r.status === 'completed' ? '已完成' : r.status === 'pending' ? '进行中' : r.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {records.length === 0 && (
              <div className="text-center py-12 text-gray-400">暂无流水记录</div>
            )}
          </div>
        )}

        {/* 分页 */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              共 {pagination.total} 条记录，第 {pagination.page}/{pagination.totalPages} 页
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setCapitalFlowPage(p => Math.max(1, p - 1)); }}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                上一页
              </button>
              <button
                onClick={() => { setCapitalFlowPage(p => Math.min(pagination.totalPages, p + 1)); }}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 根据当前菜单渲染内容
  const renderContent = () => {
    switch (activeMenu) {
      case 'my-profile':
        return <MyProfile />;
      case 'dashboard':
        return renderDashboard();
      case 'release':
        return renderReleaseRecords();
      case 'quota':
        return renderQuotaManagement();
      case 'withdraw':
        return renderWithdrawAudit();
      case 'accounts':
        return renderAccountsManagement();
      case 'templates':
        return renderTemplateManagement();
      case 'pointsShop':
        return renderPointsShopManagement();
      case 'capitalFlow':
        return renderCapitalFlow();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* 消息提示 */}
      {message && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg ${
          message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white shadow-lg`}>
          {message.text}
        </div>
      )}

      {/* 创建模板对话框 */}
      {showTemplateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[500px]">
            <CardHeader>
              <CardTitle>创建算力模板</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>模板名称</Label>
                  <Input 
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                    placeholder="如: Token存储包"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>模板代码</Label>
                  <Input 
                    value={templateForm.code}
                    onChange={(e) => setTemplateForm({...templateForm, code: e.target.value})}
                    placeholder="如: GPU-7D"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>周期(天)</Label>
                  <Input 
                    type="number"
                    value={templateForm.period}
                    onChange={(e) => setTemplateForm({...templateForm, period: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>总收益率(%)</Label>
                  <Input 
                    type="number"
                    value={templateForm.total_rate}
                    onChange={(e) => setTemplateForm({...templateForm, total_rate: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>市场费率(%)</Label>
                  <Input 
                    type="number"
                    value={templateForm.market_rate}
                    onChange={(e) => setTemplateForm({...templateForm, market_rate: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>会员收益(%)</Label>
                  <Input 
                    type="number"
                    value={templateForm.profit_rate}
                    onChange={(e) => setTemplateForm({...templateForm, profit_rate: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>取消</Button>
                <Button 
                  className="bg-purple-600" 
                  onClick={handleCreateTemplate}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  创建
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 添加积分商品弹窗 */}
      {showAddProductDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[500px]">
            <CardHeader>
              <CardTitle>添加积分商品</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>商品名称 *</Label>
                <Input
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="请输入商品名称"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>商品说明</Label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  placeholder="请输入商品说明"
                  className="mt-1 w-full p-2 border rounded-lg min-h-[80px] resize-none"
                />
              </div>
              <div>
                <Label>商品图片</Label>
                <div className="mt-1">
                  {newProduct.image_url ? (
                    <div className="relative inline-block">
                      <img src={newProduct.image_url} alt="商品图片" className="w-32 h-32 object-cover rounded-lg border" />
                      <button
                        type="button"
                        onClick={() => setNewProduct({ ...newProduct, image_url: '' })}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="mt-1 text-xs text-gray-500">点击上传图片</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) { alert('图片大小不能超过5MB'); return; }
                          const formData = new FormData();
                          formData.append('file', file);
                          try {
                            const token = localStorage.getItem('token');
                            const res = await fetch('/api/upload', { method: 'POST', body: formData, headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
                            const data = await res.json();
                            if (res.status === 401) { alert('登录已过期，请重新登录'); return; }
                            if (data.success) {
                              setNewProduct({ ...newProduct, image_url: data.data.url });
                            } else {
                              alert(data.error || '上传失败');
                            }
                          } catch { alert('上传失败'); }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div>
                <Label>兑换积分 *</Label>
                <Input
                  type="number"
                  value={newProduct.points_price || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, points_price: parseInt(e.target.value) || 0 })}
                  placeholder="请输入兑换所需积分"
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddProductDialog(false)}>取消</Button>
                <Button
                  className="bg-purple-600"
                  onClick={handleAddProduct}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  添加
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 兑换记录弹窗 */}
      {showOrdersDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[700px] max-h-[80vh] overflow-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>兑换记录</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowOrdersDialog(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {exchangeOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-400">暂无兑换记录</div>
              ) : (
                <div className="space-y-3">
                  {exchangeOrders.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800">{order.product_name || '商品'}</p>
                        <p className="text-sm text-gray-500">{order.username || order.user_id} | {order.receiver_name} {order.receiver_phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-orange-600 font-bold">{order.points_cost} 积分</p>
                        <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 收益调整弹窗 */}
      {showEnergyAdjustDialog && energyAdjustTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">调整收益 - {energyAdjustTarget.username}</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-500">当前收益</p>
                <p className="text-xl font-bold text-orange-600">{energyAdjustTarget.balance?.toLocaleString() || 0}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">调整类型</label>
                <select 
                  value={energyAdjustType} 
                  onChange={e => setEnergyAdjustType(e.target.value as 'add' | 'deduct')}
                  className="w-full mt-1 p-2 border rounded-lg"
                >
                  <option value="add">增加收益</option>
                  <option value="deduct">扣除收益</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">调整数量</label>
                <input
                  type="number"
                  value={energyAdjustAmount}
                  onChange={e => setEnergyAdjustAmount(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg"
                  placeholder="输入调整数量"
                  min="1"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">备注</label>
                <input
                  type="text"
                  value={energyAdjustNote}
                  onChange={e => setEnergyAdjustNote(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg"
                  placeholder="输入调整原因"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowEnergyAdjustDialog(false)}>取消</Button>
              <Button 
                className="flex-1 bg-orange-600 hover:bg-orange-700" 
                onClick={async () => {
                  if (!energyAdjustTarget || !energyAdjustAmount) return alert('请填写调整金额');
                  const amount = parseFloat(energyAdjustAmount);
                  if (isNaN(amount) || amount <= 0) return alert('请输入有效金额');
                  try {
                    const res = await authFetch('/api/admin/energy-adjust', {
                      method: 'POST',
                      body: JSON.stringify({
                        userId: energyAdjustTarget.id,
                        type: energyAdjustType,
                        amount,
                        note: energyAdjustNote || (energyAdjustType === 'add' ? '管理员调整增加' : '管理员调整扣除'),
                      }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      alert('收益调整成功');
                      setShowEnergyAdjustDialog(false);
                      setEnergyAdjustAmount('');
                      setEnergyAdjustNote('');
                      try { const r = await authFetch('/api/admin/members-energy'); const d = await r.json(); if(d.success) setAllUsers(prev => { const m = new Map((d.data||[]).map((u:any)=>[u.id,u])); return prev.map(u => { const e = m.get(u.id); return e ? {...u,...e} : u; }); }); } catch {}
                    } else {
                      alert(data.error || '调整失败');
                    }
                  } catch (e) {
                    alert('调整失败');
                  }
                }}
                disabled={submitting || !energyAdjustAmount || parseFloat(energyAdjustAmount) <= 0}
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                确认调整
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 收益记录弹窗 */}
      {showEnergyRecordDialog && energyAdjustTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">收益记录 - {energyAdjustTarget.username}</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowEnergyRecordDialog(false)}>✕</Button>
            </div>
            {energyRecordList.length > 0 ? (
              <div className="space-y-2">
                {energyRecordList.map((record: { id: string; type: string; amount: number; from_user_id: string | null; to_user_id: string | null; created_at: string; note?: string }) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        ['create', 'purchase', 'quota_match', 'transfer_in'].includes(record.type) 
                          ? 'bg-green-100 text-green-700' 
                          : record.type === 'withdraw' 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-gray-100 text-gray-700'
                      }`}>
                        {record.type === 'create' ? '创建' 
                          : record.type === 'purchase' ? '购买' 
                          : record.type === 'quota_match' ? '额度匹配' 
                          : record.type === 'transfer_in' ? '转入' 
                          : record.type === 'transfer_out' ? '转出' 
                          : record.type === 'withdraw' ? '变现' 
                          : record.type === 'withdraw_freeze' ? '变现冻结' 
                          : record.type === 'burn' ? '销毁' 
                          : record.type}
                      </span>
                      <span className={`font-medium ${record.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {record.amount > 0 ? '+' : ''}{record.amount}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(record.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">暂无收益记录</div>
            )}
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setShowEnergyRecordDialog(false)}>关闭</Button>
            </div>
          </div>
        </div>
      )}

      {/* 左侧导航 */}
      {renderSidebar()}

      {/* 右侧内容 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 移动端顶部栏 */}
        <div className="lg:hidden flex items-center gap-3 p-4 bg-purple-900 text-white sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-purple-800 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span className="font-bold">算力中心</span>
          </div>
          <div className="ml-auto text-sm text-purple-200">
            {menuItems.find(m => m.id === activeMenu)?.name || '功能模块'}
          </div>
        </div>

        <main className="flex-1 p-3 md:p-6 overflow-auto">
          {/* 面包屑 - 手机端隐藏 */}
          <div className="mb-4 text-sm text-gray-500 hidden lg:block">
          <span className="text-purple-600 cursor-pointer hover:underline" onClick={() => selectMenu('home')}>智算中心</span> / 
          <span className="ml-1">{menuItems.find(m => m.id === activeMenu)?.name || 
            menuItems.find(m => m.children?.some(c => c.id === activeMenu))?.children?.find(c => c.id === activeMenu)?.name || '功能模块'}</span>
        </div>

        {/* 页面内容 */}
        {renderContent()}
      </main>
      </div>

      {/* 删除会员确认弹窗 */}
      <Dialog open={!!deleteConfirmMember} onOpenChange={(open) => !open && setDeleteConfirmMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              确认删除账号
            </DialogTitle>
            <DialogDescription>
              此操作不可恢复，请确认以下信息后操作
            </DialogDescription>
          </DialogHeader>
          {deleteConfirmMember && (
            <div className="space-y-3 py-2">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">用户名</span>
                  <span className="font-medium">{deleteConfirmMember.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">手机号</span>
                  <span>{deleteConfirmMember.phone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">专属ID</span>
                  <span>{deleteConfirmMember.unique_id || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">智算金</span>
                  <span>{deleteConfirmMember.energy_value || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">收益余额</span>
                  <span>{deleteConfirmMember.balance || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">积分</span>
                  <span>{deleteConfirmMember.points || 0}</span>
                </div>
              </div>
              {deleteConfirmMember.holdingCount > 0 ? (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3 text-sm text-red-600">
                  该会员有 {deleteConfirmMember.holdingCount} 个持仓中的产品，无法删除账号。请先处理持仓后再操作。
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 text-sm text-amber-700">
                  删除后将清除该账号的所有数据（智算金、收益、积分、持仓记录等），此操作不可恢复！
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmMember(null)}>取消</Button>
            {deleteConfirmMember && deleteConfirmMember.holdingCount === 0 && (
              <Button variant="destructive" onClick={() => handleDeleteMember()}>
                确认删除
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
