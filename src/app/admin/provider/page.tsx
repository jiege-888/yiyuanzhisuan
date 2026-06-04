'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, Database, Coins, BarChart3, 
  Zap, CheckCircle, User, Loader2,
  Shield, Award, Users, ArrowRightLeft, Plus, LogOut, 
  ChevronRight, ChevronLeft, Gift, Copy, Check, Lock, TrendingUp,
  Search, X, Eye, EyeOff, TrendingDown, ArrowUpRight, ArrowDownRight,
  DollarSign, CreditCard, ArrowUp, ArrowDown, RefreshCw, Filter, Edit, Menu, ArrowLeftRight,
  Repeat, Wallet, Banknote
} from 'lucide-react';
import { ChangePasswordDialog } from '@/components/admin/ChangePasswordDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface ProviderStats {
  memberCount: number;
  totalInvestment: number;
  totalProducts: number;
  availableProducts: number;
  soldProducts: number;
  quota: number;
  usedQuota: number;
}

interface Product {
  id: string;
  name: string;
  code: string;
  price: number;
  period: number;
  total_rate: number;
  market_rate: number;
  profit_rate: number;
  status: string;
  created_at: string;
}

interface Member {
  id: string;
  username: string;
  phone: string;
  
  balance: number;
  energy_value: number;
  real_name?: string;
  totalInvestment: number;
  holdingProducts: number;
  created_at: string;
}

interface EnergyRecord {
  id: string;
  type: string;
  amount: number;
  note?: string;
  created_at: string;
  from_username?: string;
  to_username?: string;
  status?: string;
}

interface EnergyRequest {
  id: string;
  amount: number;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  branch_name?: string;
}

export default function ProviderDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [token, setToken] = useState('');
  
  // 数据状态
  const [stats, setStats] = useState<ProviderStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productStats, setProductStats] = useState({ total: 0, available: 0, sold: 0, availableAmount: 0, soldAmount: 0 });
  const [members, setMembers] = useState<Member[]>([]);
  const [memberPagination, setMemberPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [energyRecords, setEnergyRecords] = useState<EnergyRecord[]>([]);
  const [energyStats, setEnergyStats] = useState({ totalRecharge: 0, totalTransferIn: 0, totalTransferOut: 0 });
  const [balanceInfo, setBalanceInfo] = useState({ balance: 0, energyValue: 0, revenue: 0, quota: 0, usedQuota: 0, totalSales: 0 });
  const [revenueRecords, setRevenueRecords] = useState<any[]>([]);
  const [revenueStats, setRevenueStats] = useState({ totalRevenue: 0, availableRevenue: 0, totalWithdrawn: 0, totalConverted: 0 });
  
  // 充值状态
  const [rechargeMember, setRechargeMember] = useState<Member | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeNote, setRechargeNote] = useState('');
  const [recharging, setRecharging] = useState(false);
  const [rechargeSuccess, setRechargeSuccess] = useState('');
  
  // 向服务网点申请收益状态
  const [branchRequestAmount, setBranchRequestAmount] = useState('');
  const [branchRequestNote, setBranchRequestNote] = useState('');
  const [requestingBranch, setRequestingBranch] = useState(false);
  const [branchRequestSuccess, setBranchRequestSuccess] = useState('');
  const [branchRequests, setBranchRequests] = useState<EnergyRequest[]>([]);
  const [branchName, setBranchName] = useState('');
  
  // 向服务网点申请算力额度状态
  const [quotaRequestAmount, setQuotaRequestAmount] = useState('');
  const [quotaRequestNote, setQuotaRequestNote] = useState('');
  const [requestingQuota, setRequestingQuota] = useState(false);
  const [quotaRequestSuccess, setQuotaRequestSuccess] = useState('');
  const [quotaRequests, setQuotaRequests] = useState<any[]>([]);
  const [quotaBranchName, setQuotaBranchName] = useState('');
  
  // 收益提现记录
  const [energyWithdrawRecords, setEnergyWithdrawRecords] = useState<any[]>([]);
  
  // 收益提现状态
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState('');
  
  // 搜索状态
  const [memberSearch, setMemberSearch] = useState('');
  const [productFilter, setProductFilter] = useState('all');
  const [showcaseFilter, setShowcaseFilter] = useState('all');
  
  // 匹配管理状态
  const [matchProducts, setMatchProducts] = useState<any[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [matchingProductId, setMatchingProductId] = useState<string | null>(null);
  const [selectedMatchMember, setSelectedMatchMember] = useState('');
  const [matchTargetProduct, setMatchTargetProduct] = useState<any>(null);
  const [assigningMatch, setAssigningMatch] = useState(false);
  const [matchMembers, setMatchMembers] = useState<any[]>([]);
  const [matchAssigning, setMatchAssigning] = useState<string | null>(null);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [confirmingMatchIds, setConfirmingMatchIds] = useState<Set<string>>(new Set());

  // 回购管理状态
  const [repurchases, setRepurchases] = useState<any[]>([]);
  const [repurchaseLoading, setRepurchaseLoading] = useState(false);
  const [repurchasingId, setRepurchasingId] = useState<string | null>(null);

  const [matchConfirming, setMatchConfirming] = useState<string | null>(null);
  const [recycling, setRecycling] = useState<string | null>(null);

  // 智算金互转状态
  const [showBalanceTransfer, setShowBalanceTransfer] = useState(false);
  const [transferSearchKeyword, setTransferSearchKeyword] = useState('');
  const [transferTargets, setTransferTargets] = useState<any[]>([]);
  const [transferToUserId, setTransferToUserId] = useState('');
  const [transferToAmount, setTransferToAmount] = useState('');
  const [transferToNote, setTransferToNote] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [convertAmount, setConvertAmount] = useState('');
  const [converting, setConverting] = useState(false);
  const [showBalanceConvertDialog, setShowBalanceConvertDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showEnergyActionDialog, setShowEnergyActionDialog] = useState(false);

  // Toast
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // 用户名编辑状态
  const [editingUsername, setEditingUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);

  // 保存用户名
  const handleSaveUsername = async () => {
    if (!editingUsername.trim() || editingUsername === user?.username) {
      setIsEditingUsername(false);
      return;
    }
    
    setSavingUsername(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ username: editingUsername.trim() })
      });
      const data = await res.json();
      if (data.success) {
        // 更新本地用户数据
        const updatedUser = { ...user, username: editingUsername.trim() };
        setUser(updatedUser);
        localStorage.setItem('userData', JSON.stringify(updatedUser));
        localStorage.setItem('userName', editingUsername.trim());
        showToast('用户名修改成功', 'success');
        setIsEditingUsername(false);
      } else {
        showToast(data.error || '修改失败', 'error');
      }
    } catch (err) {
      showToast('修改失败', 'error');
    }
    setSavingUsername(false);
  };

  useEffect(() => {
    const userData = localStorage.getItem('userData');
    const savedToken = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('解析用户数据失败', e);
      }
    }
    if (savedToken) {
      setToken(savedToken);
    }
    // 如果是服务商角色直接访问此页面，重定向到 /provider
    if (userRole === 'provider') {
      window.location.href = '/provider';
      return;
    }
    setLoading(false);
  }, []);

  // 获取请求头
  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }), [token]);

  // 获取服务商数据总览
  const fetchOverview = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/provider/overview', { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setStats(data.data.stats);
      }
    } catch (err) {
      console.error('获取总览失败:', err);
    }
  }, [token, getHeaders]);

  // 获取产品列表
  const fetchProducts = useCallback(async () => {
    if (!token) return;
    try {
      const url = productFilter !== 'all' ? `/api/provider/products?status=${productFilter}` : '/api/provider/products';
      const res = await fetch(url, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setProducts(data.data.products);
        setProductStats(data.data.stats);
      }
    } catch (err) {
      console.error('获取产品失败:', err);
    }
  }, [token, getHeaders, productFilter]);

  // 获取会员列表
  const fetchMembers = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/provider/members?${params}`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setMembers(data.data.members);
        setMemberPagination(data.data.pagination);
      }
    } catch (err) {
      console.error('获取会员失败:', err);
    }
  }, [token, getHeaders]);

  // 获取收益信息
  const fetchEnergy = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/provider/energy', { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setBalanceInfo({
          balance: data.data.balance,
          energyValue: data.data.energyValue || 0,
          revenue: data.data.revenue || 0,
          quota: data.data.quota,
          usedQuota: data.data.usedQuota,
          totalSales: data.data.totalSales,
        });
        setEnergyStats(data.data.stats);
        setEnergyRecords(data.data.records);
      }
    } catch (err) {
      console.error('获取收益失败:', err);
    }
  }, [token, getHeaders]);

  // 获取产品分成收益记录
  const fetchRevenue = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/provider/revenue?providerId=${user.id}`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setRevenueRecords(data.data?.records || []);
        setRevenueStats(data.data?.stats || { totalRevenue: 0, availableRevenue: 0, totalWithdrawn: 0, totalConverted: 0 });
      }
    } catch (err) {
      console.error('获取分成收益失败:', err);
    }
  }, [user?.id, getHeaders]);

  // 初始化加载
  useEffect(() => {
    if (token && activeMenu === 'overview') {
      fetchOverview();
    }
  }, [token, activeMenu, fetchOverview]);

  useEffect(() => {
    if (token && activeMenu === 'products') {
      fetchProducts();
    }
  }, [token, activeMenu, fetchProducts]);

  useEffect(() => {
    if (token && activeMenu === 'product-showcase') {
      // 确保展示页面获取全部产品（不受productFilter影响）
      const fetchAllProducts = async () => {
        try {
          const res = await fetch('/api/provider/products', { headers: getHeaders() });
          const data = await res.json();
          if (data.success) {
            setProducts(data.data.products);
            setProductStats(data.data.stats);
          }
        } catch (err) {
          console.error('获取产品失败:', err);
        }
      };
      fetchAllProducts();
    }
  }, [token, activeMenu, getHeaders]);

  useEffect(() => {
    if (token && activeMenu === 'members') {
      fetchMembers(1, memberSearch);
    }
  }, [token, activeMenu, memberSearch, fetchMembers]);

  useEffect(() => {
    if (token && activeMenu === 'energy') {
      fetchEnergy();
      fetchRevenue();
      fetchBranchRequests();
      fetchEnergyWithdrawRecords();
    }
  }, [token, activeMenu, fetchEnergy, fetchRevenue]);

  useEffect(() => {
    if (token && activeMenu === 'quota') {
      fetchQuotaRequests();
    }
  }, [token, activeMenu]);

  useEffect(() => {
    if (token && activeMenu === 'transfer') {
      fetchMatchProducts();
    }
  }, [token, activeMenu]);

  // 获取流转列表
  // 获取待匹配产品列表
  const fetchMatchProducts = async () => {
    if (!user?.id) return;
    setMatchLoading(true);
    try {
      const res = await fetch(`/api/products/match/list?providerId=${user.id}`, {
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setMatchProducts(data.data || []);
      }
    } catch (err) {
      console.error('获取匹配列表失败:', err);
    } finally {
      setMatchLoading(false);
    }
  };

  // 服务商指定匹配会员
  const handleMatchAssign = async (productId: string, targetUserId: string) => {
    setMatchAssigning(productId);
    try {
      const res = await fetch('/api/products/match/assign', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ productId, targetUserId })
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: '已指定匹配会员，等待确认', type: 'success' });
        fetchMatchProducts();
        setShowMatchDialog(false);
      } else {
        setToast({ message: data.error || '指定失败', type: 'error' });
      }
    } catch (err) {
      setToast({ message: '指定匹配失败', type: 'error' });
    } finally {
      setMatchAssigning(null);
    }
  };

  // 服务商确认匹配（单个或批量）
  const handleRecycle = async (productId: string) => {
    if (!confirm('确认回收该产品？产品将回到在售列表，会员端将显示"已回收"。')) return;
    setRecycling(productId);
    try {
      const res = await fetch('/api/products/match/recycle', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ productId, providerId: user?.id })
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: '产品已回收，回到在售列表', type: 'success' });
        fetchMatchProducts();
      } else {
        setToast({ message: data.error || '回收失败', type: 'error' });
      }
    } catch {
      setToast({ message: '回收操作失败', type: 'error' });
    } finally {
      setRecycling(null);
    }
  };

  const handleMatchConfirm = async (productIds: string[]) => {
    // 单个确认时用第一个productId作为loading标识
    const confirmKey = productIds.length === 1 ? productIds[0] : 'batch';
    setMatchConfirming(confirmKey);
    try {
      const res = await fetch('/api/products/match/confirm', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ productIds })
      });
      const data = await res.json();
      if (data.success) {
        const results = data.data?.results || [];
        const successItems = results.filter((r: { success: boolean }) => r.success);
        const failItems = results.filter((r: { success: boolean }) => !r.success);
        let msg = `${successItems.length}个产品匹配成功`;
        if (failItems.length > 0) {
          const failMsgs = failItems.map((r: { message: string }) => r.message).join('；');
          msg += `，${failItems.length}个失败：${failMsgs}`;
        }
        setToast({ message: msg, type: successItems.length > 0 ? 'success' : 'error' });
        fetchMatchProducts();
        setSelectedMatchIds([]);
      } else {
        // 显示更详细的错误信息
        const detailMsg = data.data?.results?.map((r: { message: string }) => r.message).join('；') || data.message || '匹配失败';
        setToast({ message: detailMsg, type: 'error' });
      }
    } catch {
      setToast({ message: '匹配操作失败，请稍后重试', type: 'error' });
    } finally {
      setMatchConfirming(null);
    }
  };

  // 处理充值
  const handleCancelAssign = async (productId: string) => {
    try {
      const res = await fetch('/api/products/match/assign', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ productId, action: 'cancel' })
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: '已取消匹配', type: 'success' });
        fetchMatchProducts();
      } else {
        setToast({ message: data.message || '操作失败', type: 'error' });
      }
    } catch {
      setToast({ message: '操作失败', type: 'error' });
    }
  };

  const handleBatchConfirm = async () => {
    const assignedProducts = matchProducts.filter((p: Record<string, unknown>) => p.pending_match_user_id);
    const productIds = assignedProducts.map((p: Record<string, unknown>) => p.id);
    if (productIds.length === 0) {
      setToast({ message: '没有待确认的产品', type: 'error' });
      return;
    }
    await handleMatchConfirm(productIds as string[]);
  };

  const fetchChainMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/chain', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data?.members) {
        setMatchMembers(data.data.members);
      }
    } catch { /* ignore */ }
  };

  const handleOpenMatchDialog = (product: Record<string, unknown>) => {
    setMatchTargetProduct(product);
    setSelectedMatchMember('');
    fetchChainMembers();
  };

  const handleRepurchase = async (_productId: string) => {
    setToast({ message: '回购功能暂未开放', type: 'error' });
  };

  const handleRecharge = async () => {
    if (!rechargeMember || !rechargeAmount || parseFloat(rechargeAmount) <= 0) {
      setToast({ message: '请选择会员并输入正确的充值金额', type: 'error' });
      return;
    }
    if (parseFloat(rechargeAmount) > balanceInfo.balance) {
      setToast({ message: '收益余额不足', type: 'error' });
      return;
    }

    setRecharging(true);
    try {
      const res = await fetch('/api/provider/energy/recharge', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          memberId: rechargeMember.id,
          amount: parseFloat(rechargeAmount),
          note: rechargeNote
        })
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: data.message, type: 'success' });
        setRechargeSuccess(data.message);
        setRechargeMember(null);
        setRechargeAmount('');
        setRechargeNote('');
        fetchEnergy(); // 刷新数据
        setTimeout(() => setRechargeSuccess(''), 3000);
      } else {
        setToast({ message: data.error, type: 'error' });
      }
    } catch (err) {
      setToast({ message: '充值失败', type: 'error' });
    }
    setRecharging(false);
  };

  // 向服务网点申请收益
  const handleBranchRequest = async () => {
    if (!branchRequestAmount || parseFloat(branchRequestAmount) <= 0) {
      setToast({ message: '请输入正确的申请金额', type: 'error' });
      return;
    }

    setRequestingBranch(true);
    try {
      const res = await fetch('/api/provider/energy-request', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          providerId: user?.id,
          amount: parseFloat(branchRequestAmount),
          note: branchRequestNote
        })
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: data.message, type: 'success' });
        setBranchRequestSuccess(data.message);
        setBranchRequestAmount('');
        setBranchRequestNote('');
        fetchBranchRequests(); // 刷新申请记录
        setTimeout(() => setBranchRequestSuccess(''), 3000);
      } else {
        setToast({ message: data.error, type: 'error' });
      }
    } catch (err) {
      setToast({ message: '申请失败', type: 'error' });
    }
    setRequestingBranch(false);
  };

  // 获取向服务网点的申请记录
  const fetchBranchRequests = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/provider/energy-request', { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setBranchRequests(data.data.requests || []);
        setBranchName(data.data.branchName || '');
      }
    } catch (err) {
      console.error('获取申请记录失败:', err);
    }
  };

  // 收益提现 - 统一调用 /api/withdrawals
  const handleEnergyWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 100) {
      setToast({ message: '最低提现金额为 100 元', type: 'error' });
      return;
    }

    setWithdrawing(true);
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          amount: amount,
          alipayAccount: user?.alipay_account || '',
          realName: user?.real_name || ''
        })
      });
      const data = await res.json();
      if (data.success) {
        setWithdrawSuccess(`提现申请已提交！手续费: ¥${data.data.fee}，实际到账: ¥${data.data.actualAmount}，等待网点审核`);
        setWithdrawAmount('');
        fetchEnergyWithdrawRecords();
        fetchOverview();
        setTimeout(() => setWithdrawSuccess(''), 5000);
      } else {
        setToast({ message: data.message || '提现申请失败', type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: `提现申请失败: ${err?.message || '网络错误'}`, type: 'error' });
      console.error('提现申请错误:', err);
    }
    setWithdrawing(false);
  };

  // 向服务网点申请算力额度
  const handleQuotaRequest = async () => {
    const amount = parseInt(quotaRequestAmount);
    if (!amount || amount < 5000) {
      setToast({ message: '申请金额必须大于等于5000', type: 'error' });
      return;
    }

    setRequestingQuota(true);
    try {
      const res = await fetch('/api/provider/request-quota', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          providerId: user?.id,
          amount: amount,
          note: quotaRequestNote
        })
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: data.message, type: 'success' });
        setQuotaRequestSuccess(data.message);
        setQuotaRequestAmount('');
        setQuotaRequestNote('');
        fetchQuotaRequests(); // 刷新申请记录
        setTimeout(() => setQuotaRequestSuccess(''), 3000);
      } else {
        setToast({ message: data.error, type: 'error' });
      }
    } catch (err) {
      setToast({ message: '申请失败', type: 'error' });
    }
    setRequestingQuota(false);
  };

  // 获取算力额度申请记录
  const fetchQuotaRequests = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/provider/request-quota', { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setQuotaRequests(data.data || []);
        setQuotaBranchName(data.branchName || user?.branch_name || '');
      }
    } catch (err) {
      console.error('获取算力额度申请记录失败:', err);
    }
  };

  // 获取提现记录 - 统一调用 /api/withdrawals
  const fetchEnergyWithdrawRecords = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/withdrawals?tab=mine', { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setEnergyWithdrawRecords(data.data?.records || []);
      }
    } catch (err) {
      console.error('获取提现记录失败:', err);
    }
  };

  const handleMemberSearch = () => {
    fetchMembers(1, memberSearch);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('已复制到剪贴板', 'success');
  };

  const menuItems = [
    { id: 'overview', name: '数据总览', icon: BarChart3, badge: 0 },
    { id: 'profile', name: '我的资料', icon: User, badge: 0 },
    { id: 'products', name: '我的产品', icon: Package, badge: 0 },
    { id: 'members', name: '会员管理', icon: Users, badge: 0 },
    { id: 'reviews', name: '审核申请', icon: CheckCircle, badge: 0 },
    { id: 'recharge-review', name: '充值审核', icon: Zap, badge: 0 },
    { id: 'repurchase', name: '回购管理', icon: RefreshCw, badge: 0 },
    { id: 'transfer', name: '产品匹配', icon: ArrowRightLeft, badge: matchProducts.filter(p => p.status === 'pending_match').length },
    { id: 'quota', name: '算力额度', icon: Database, badge: 0 },
    { id: 'energy', name: '收益管理', icon: Coins, badge: 0 },
    { id: 'balance-transfer', name: '智算金互转', icon: ArrowLeftRight, badge: 0 },
    { id: 'product-showcase', name: '产品展示', icon: Package, badge: 0 },
  ];

  const menuNames: Record<string, string> = {
    overview: '数据总览',
    profile: '我的资料',
    products: '我的产品',
    members: '会员管理',
    reviews: '审核申请',
    'recharge-review': '充值审核',
    repurchase: '回购管理',
    transfer: '产品流转',
    quota: '算力额度',
    energy: '收益管理',
    'balance-transfer': '智算金互转',
    'product-showcase': '产品展示',
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">我的资料</h1>
              <p className="text-gray-500 text-sm mt-1">管理您的个人信息</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  基本信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">用户名</Label>
                    <div className="flex gap-2 mt-1">
                      {isEditingUsername ? (
                        <>
                          <Input 
                            value={editingUsername} 
                            onChange={(e) => setEditingUsername(e.target.value)}
                            className="flex-1"
                            maxLength={20}
                            placeholder="请输入新用户名"
                          />
                          <Button 
                            size="sm" 
                            onClick={handleSaveUsername}
                            disabled={savingUsername}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {savingUsername ? '保存中...' : '保存'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setEditingUsername(user?.username || '');
                              setIsEditingUsername(false);
                            }}
                          >
                            取消
                          </Button>
                        </>
                      ) : (
                        <>
                          <Input value={user?.username || ''} disabled className="flex-1 bg-gray-100" />
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setIsEditingUsername(true)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">3-20个字符，可包含中文、字母、数字</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">手机号</Label>
                    <Input value={user?.phone || ''} disabled className="mt-1 bg-gray-100" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">专属ID</Label>
                    <Input value={user?.unique_id || ''} disabled className="mt-1 bg-gray-100" />
                  </div>
                  <div>
                    <Label className="text-gray-500">收益</Label>
                    <Input value={user?.balance || 0} disabled className="mt-1 bg-gray-100" />
                  </div>
                </div>
                {/* 专属邀请码 & 分享链接 */}
                <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Gift className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-purple-800">专属邀请码 & 分享链接</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="px-4 py-2 bg-white rounded-lg border-2 border-dashed border-purple-300">
                      <p className="text-2xl font-bold text-purple-700 tracking-wider">{user?.unique_id || 'PV00001'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-100"
                        onClick={() => {
                          const code = user?.unique_id || '';
                          if (code) {
                            navigator.clipboard.writeText(code).then(() => setToast({ message: '邀请码已复制', type: 'success' }));
                          }
                        }}>
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        复制邀请码
                      </Button>
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => {
                          const code = user?.unique_id || '';
                          const link = `${window.location.origin}/?invite=${code}`;
                          navigator.clipboard.writeText(link).then(() => setToast({ message: '邀请链接已复制，发送给好友即可自动填充邀请码注册', type: 'success' }));
                        }}>
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        复制邀请链接
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-purple-500 mt-2">好友通过邀请链接注册，邀请码自动填充</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  账户安全
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>
                  <Lock className="w-4 h-4 mr-2" />
                  修改密码
                </Button>
              </CardContent>
            </Card>
            {/* 邀请码已整合到基本信息卡片中 */}
          </div>
        );

      case 'overview':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">数据总览</h1>
              <p className="text-gray-500 text-sm mt-1">欢迎回来，{user?.username || '服务商'}</p>
            </div>
            {/* 智算金大卡片 */}
            <Card className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-purple-200 text-sm font-medium">智算金</span>
                    </div>
                    <p className="text-3xl font-bold mt-2">¥{(balanceInfo.energyValue || user?.energy_value || 0).toLocaleString()}</p>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" className="h-8 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
                        onClick={() => setActiveMenu('balance-transfer')}>
                        <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />互转
                      </Button>
                      <Button size="sm" className="h-8 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
                        onClick={() => setShowBalanceConvertDialog(true)}>
                        <Repeat className="w-3.5 h-3.5 mr-1" />转积分
                      </Button>
                      <Button size="sm" className="h-8 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
                        onClick={() => setShowWithdrawDialog(true)}>
                        <Wallet className="w-3.5 h-3.5 mr-1" />提现
                      </Button>
                    </div>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Coins className="w-8 h-8 text-white/80" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">会员总数</p>
                      <p className="text-3xl font-bold mt-1">{stats?.memberCount || 0}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">累计投资额</p>
                      <p className="text-3xl font-bold mt-1">{formatCurrency(stats?.totalInvestment || 0)}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">产品销售额</p>
                      <p className="text-3xl font-bold mt-1">{formatCurrency(productStats.soldAmount)}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white">
                      <Package className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* 邀请码 & 分享链接卡片 */}
            <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <Gift className="w-5 h-5" />
                  专属邀请码 & 分享链接
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-white rounded-lg border-2 border-dashed border-purple-300">
                      <p className="text-2xl font-bold text-purple-700 tracking-wider">{user?.unique_id || 'PV00001'}</p>
                    </div>
                    <Button size="sm" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-100"
                      onClick={() => {
                        const code = user?.unique_id || '';
                        if (code) {
                          navigator.clipboard.writeText(code).then(() => setToast({ message: '邀请码已复制', type: 'success' }));
                        }
                      }}>
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      复制邀请码
                    </Button>
                  </div>
                  <div className="h-8 w-px bg-purple-200 hidden sm:block" />
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => {
                        const code = user?.unique_id || '';
                        const link = `${window.location.origin}/?invite=${code}`;
                        navigator.clipboard.writeText(link).then(() => setToast({ message: '邀请链接已复制，发送给好友即可自动填充邀请码注册', type: 'success' }));
                      }}>
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      复制邀请链接
                    </Button>
                    <p className="text-xs text-purple-500">好友通过链接注册，邀请码自动填充</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-500" />
                  服务商收益规则
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-800">技术服务费</h4>
                    <p className="text-sm text-purple-600 mt-1">服务商入驻需缴纳技术服务费 ¥2,800</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-lg">
                    <h4 className="font-medium text-amber-800">培养服务商</h4>
                    <p className="text-sm text-amber-600 mt-1">培养1个服务商得0.3%，≥3个得0.5%交易额分成</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800">提现手续费</h4>
                    <p className="text-sm text-green-600 mt-1">服务商收益提现收取5%手续费</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800">最低提现</h4>
                    <p className="text-sm text-blue-600 mt-1">服务商收益提现最低 ¥100 起</p>
                  </div>
                </div>
                
                {/* 服务商收益标准 */}
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-2">服务商收益标准</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody className="divide-y">

                        <tr className="bg-gray-50">
                          <td className="px-4 py-2 text-gray-600">服务商收益提现手续费</td>
                          <td className="px-4 py-2 text-gray-800 font-medium">5%</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="px-4 py-2 text-gray-600">最低提现金额</td>
                          <td className="px-4 py-2 text-gray-800 font-medium">¥100 起</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="px-4 py-2 text-gray-600">培养1个服务商分成</td>
                          <td className="px-4 py-2 text-gray-800 font-medium">下级交易额的 0.3%</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="px-4 py-2 text-gray-600">培养≥3个服务商分成</td>
                          <td className="px-4 py-2 text-gray-800 font-medium">所有下级交易额的 0.5%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'products':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">我的产品</h1>
                <p className="text-gray-500 text-sm mt-1">管理您的Token存储包</p>
              </div>
              <div className="flex items-center gap-4">
                <select 
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="all">全部产品</option>
                  <option value="available">可购买</option>
                  <option value="sold">已售出</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <Card className="border-blue-200">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">产品总数</p>
                  <p className="text-2xl font-bold">{productStats.total}</p>
                </CardContent>
              </Card>
              <Card className="border-green-200">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">可购买</p>
                  <p className="text-2xl font-bold text-green-600">{productStats.available}</p>
                </CardContent>
              </Card>
              <Card className="border-purple-200">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">已售出</p>
                  <p className="text-2xl font-bold text-purple-600">{productStats.sold}</p>
                </CardContent>
              </Card>
              <Card className="border-amber-200">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">待售金额</p>
                  <p className="text-2xl font-bold text-amber-600">{formatCurrency(productStats.availableAmount)}</p>
                </CardContent>
              </Card>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>暂无产品数据</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">产品名称</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">产品编号</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">价格</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">周期</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">收益率</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{product.name} #{product.code}</td>
                        <td className="px-4 py-3 font-medium">{formatCurrency(product.price)}</td>
                        <td className="px-4 py-3">{product.period}天</td>
                        <td className="px-4 py-3 text-green-600">+{product.total_rate}%</td>
                        <td className="px-4 py-3">
                          <Badge variant={product.status === 'available' ? 'default' : 'secondary'}
                            className={product.status === 'available' ? 'bg-green-100 text-green-700' : ''}>
                            {product.status === 'available' ? '可购买' : '已售出'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case 'members':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">会员管理</h1>
                <p className="text-gray-500 text-sm mt-1">管理您的直属会员</p>
              </div>
            </div>
            
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                      placeholder="搜索用户名或手机号..." 
                      className="pl-9"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleMemberSearch()}
                    />
                  </div>
                  <Button onClick={handleMemberSearch}>搜索</Button>
                </div>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>暂无会员数据</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white rounded-lg border overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">用户名</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">手机号</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">收益</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">智算金余额</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">累计投资</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">持仓产品</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">注册时间</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {members.map((member) => (
                            <tr key={member.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium">{member.username}</td>
                              <td className="px-4 py-3 text-gray-500">{member.phone}</td>
                              <td className="px-4 py-3 text-amber-600">{member.balance}</td>
                              <td className="px-4 py-3 text-blue-600 font-medium">{(member.energy_value || 0).toLocaleString()}</td>
                              <td className="px-4 py-3">{formatCurrency(member.totalInvestment)}</td>
                              <td className="px-4 py-3">{member.holdingProducts}</td>
                              <td className="px-4 py-3 text-gray-500">{formatDate(member.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {memberPagination.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-gray-500">
                          第 {memberPagination.page} / {memberPagination.totalPages} 页，共 {memberPagination.total} 条
                        </p>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={memberPagination.page <= 1}
                            onClick={() => fetchMembers(memberPagination.page - 1, memberSearch)}
                          >
                            上一页
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={memberPagination.page >= memberPagination.totalPages}
                            onClick={() => fetchMembers(memberPagination.page + 1, memberSearch)}
                          >
                            下一页
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'quota':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">算力额度</h1>
              <p className="text-gray-500 text-sm mt-1">管理您的算力额度</p>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <Card className="border-blue-200">
                <CardContent className="p-6">
                  <p className="text-sm text-gray-500">初始算力额度</p>
                  <p className="text-3xl font-bold mt-1">{stats?.quota || 0}</p>
                </CardContent>
              </Card>
              <Card className="border-red-200">
                <CardContent className="p-6">
                  <p className="text-sm text-gray-500">已使用算力</p>
                  <p className="text-3xl font-bold mt-1 text-red-500">{stats?.usedQuota || 0}</p>
                </CardContent>
              </Card>
              <Card className="border-green-200">
                <CardContent className="p-6">
                  <p className="text-sm text-gray-500">剩余算力</p>
                  <p className="text-3xl font-bold mt-1 text-green-500">{(stats?.quota || 0) - (stats?.usedQuota || 0)}</p>
                </CardContent>
              </Card>
            </div>
            
            {/* 向服务网点申请算力额度 */}
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-500" />
                  向服务网点申请算力额度
                </CardTitle>
                <CardDescription>向所属服务网点申请算力额度，每次申请至少5000元起</CardDescription>
              </CardHeader>
              <CardContent>
                {quotaRequestSuccess && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                    {quotaRequestSuccess}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>所属服务网点</Label>
                    <Input 
                      value={quotaBranchName || user?.branch_name || '加载中...'}
                      disabled
                      className="mt-1 bg-gray-100"
                    />
                  </div>
                  <div>
                    <Label>申请金额 (最低5000)</Label>
                    <Input 
                      type="number"
                      placeholder="输入申请算力额度"
                      value={quotaRequestAmount}
                      onChange={(e) => setQuotaRequestAmount(e.target.value)}
                      min="5000"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>申请说明 (可选)</Label>
                    <Input 
                      placeholder="备注说明"
                      value={quotaRequestNote}
                      onChange={(e) => setQuotaRequestNote(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button 
                  className="mt-4 bg-blue-600 hover:bg-blue-700"
                  onClick={handleQuotaRequest}
                  disabled={requestingQuota || !quotaRequestAmount || parseInt(quotaRequestAmount) < 5000}
                >
                  {requestingQuota ? '申请中...' : '提交申请'}
                </Button>

                {/* 申请记录 */}
                {quotaRequests.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-700 mb-3">申请记录</h4>
                    <div className="space-y-2">
                      {quotaRequests.map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">申请金额: ¥{req.requested_amount?.toLocaleString() || 0}</p>
                            <p className="text-sm text-gray-500">
                              {req.note || '无备注'} · {req.created_at ? formatDate(req.created_at) : '-'}
                            </p>
                          </div>
                          <Badge variant={
                            req.status === 'pending' ? 'secondary' :
                            req.status === 'approved' ? 'default' : 'destructive'
                          } className={
                            req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            req.status === 'approved' ? 'bg-green-100 text-green-700' : ''
                          }>
                            {req.status === 'pending' ? '待审核' :
                             req.status === 'approved' ? '已通过' : '已拒绝'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'energy':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">收益管理</h1>
              <p className="text-gray-500 text-sm mt-1">管理您的收益，为会员充值</p>
            </div>
            
            {/* 智算金大卡片 - 点击弹窗选择功能 */}
            <div 
              className="bg-gradient-to-br from-purple-600 to-purple-800 text-white rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow p-6"
              onClick={() => setShowEnergyActionDialog(true)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                      <Coins className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-purple-200 text-sm font-medium">智算金</span>
                  </div>
                  <p className="text-3xl font-bold mt-2">¥{(balanceInfo.energyValue || 0).toLocaleString()}</p>
                  <p className="text-xs opacity-70 mt-1">点击选择：互转 / 转积分 / 提现</p>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center ml-4">
                  <ChevronRight className="w-8 h-8 text-white/80" />
                </div>
              </div>
            </div>

            {/* 收益统计卡片 */}
            <div className="grid grid-cols-3 gap-6">
              <Card className="border-green-200">
                <CardContent className="p-6">
                  <p className="text-sm text-gray-500">累计充值</p>
                  <p className="text-3xl font-bold mt-1 text-green-600">{energyStats.totalRecharge}</p>
                </CardContent>
              </Card>
              <Card className="border-blue-200">
                <CardContent className="p-6">
                  <p className="text-sm text-gray-500">累计获得</p>
                  <p className="text-3xl font-bold mt-1 text-blue-600">{energyStats.totalTransferIn}</p>
                </CardContent>
              </Card>
              <Card className="border-red-200">
                <CardContent className="p-6">
                  <p className="text-sm text-gray-500">累计转出</p>
                  <p className="text-3xl font-bold mt-1 text-red-600">{energyStats.totalTransferOut}</p>
                </CardContent>
              </Card>
            </div>

            {/* 给会员充值 */}
            <Card className="border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-500" />
                  给会员充值收益
                </CardTitle>
                <CardDescription>服务商线下收款后，在此为会员充值收益</CardDescription>
              </CardHeader>
              <CardContent>
                {rechargeSuccess && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                    {rechargeSuccess}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>选择会员</Label>
                    <Input 
                      placeholder="输入会员用户名或手机号"
                      value={rechargeMember?.username || ''}
                      onChange={async (e) => {
                        const search = e.target.value;
                        if (search.length >= 2) {
                          const res = await fetch(`/api/provider/energy/recharge?search=${search}`, { headers: getHeaders() });
                          const data = await res.json();
                          if (data.success && data.data.length > 0) {
                            setRechargeMember(data.data[0]);
                          }
                        }
                      }}
                      className="mt-1"
                    />
                    {rechargeMember && (
                      <p className="text-sm text-green-600 mt-1">
                        已选择: {rechargeMember.username} (当前收益: {rechargeMember.balance})
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>充值金额</Label>
                    <Input 
                      type="number"
                      placeholder="输入收益数量"
                      value={rechargeAmount}
                      onChange={(e) => setRechargeAmount(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">可用余额: {balanceInfo.balance}</p>
                  </div>
                  <div>
                    <Label>备注 (可选)</Label>
                    <Input 
                      placeholder="备注说明"
                      value={rechargeNote}
                      onChange={(e) => setRechargeNote(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button 
                  className="mt-4 bg-purple-600 hover:bg-purple-700"
                  onClick={handleRecharge}
                  disabled={recharging || !rechargeMember || !rechargeAmount}
                >
                  {recharging ? '充值中...' : '确认充值'}
                </Button>
              </CardContent>
            </Card>

            {/* 向服务网点申请收益 */}
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-500" />
                  向服务网点申请收益
                </CardTitle>
                <CardDescription>向所属服务网点申请收益配额，等待审核后发放</CardDescription>
              </CardHeader>
              <CardContent>
                {branchRequestSuccess && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                    {branchRequestSuccess}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>所属服务网点</Label>
                    <Input 
                      value={branchName || user?.branch_name || '加载中...'}
                      disabled
                      className="mt-1 bg-gray-100"
                    />
                  </div>
                  <div>
                    <Label>申请金额</Label>
                    <Input 
                      type="number"
                      placeholder="输入申请收益数量"
                      value={branchRequestAmount}
                      onChange={(e) => setBranchRequestAmount(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>申请说明 (可选)</Label>
                    <Input 
                      placeholder="备注说明"
                      value={branchRequestNote}
                      onChange={(e) => setBranchRequestNote(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button 
                  className="mt-4 bg-blue-600 hover:bg-blue-700"
                  onClick={handleBranchRequest}
                  disabled={requestingBranch || !branchRequestAmount}
                >
                  {requestingBranch ? '申请中...' : '提交申请'}
                </Button>

                {/* 申请记录 */}
                {branchRequests.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-700 mb-3">申请记录</h4>
                    <div className="space-y-2">
                      {branchRequests.map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">申请金额: {req.amount}</p>
                            <p className="text-sm text-gray-500">
                              {req.note || '无备注'} · {formatDate(req.created_at)}
                            </p>
                          </div>
                          <Badge variant={
                            req.status === 'pending' ? 'secondary' :
                            req.status === 'approved' ? 'default' : 'destructive'
                          } className={
                            req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            req.status === 'approved' ? 'bg-green-100 text-green-700' : ''
                          }>
                            {req.status === 'pending' ? '待审核' :
                             req.status === 'approved' ? '已通过' : '已拒绝'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 收益提现 */}
            <Card id="withdraw-section" className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  智算金提现
                </CardTitle>
                <CardDescription>将智算金提现，最低100起，手续费5%，提交后等待网点审核</CardDescription>
              </CardHeader>
              <CardContent>
                {withdrawSuccess && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                    {withdrawSuccess}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>可提现智算金</Label>
                    <Input 
                      value={user?.energy_value || 0}
                      disabled
                      className="mt-1 bg-gray-100"
                    />
                  </div>
                  <div>
                    <Label>提现金额 (最低100)</Label>
                    <Input 
                      type="number"
                      placeholder="输入提现金额"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      min="100"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      className="mt-1 bg-red-600 hover:bg-red-700"
                      onClick={handleEnergyWithdraw}
                      disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) < 100}
                    >
                      {withdrawing ? '提现中...' : '申请提现'}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">手续费5%，最低提现金额100元，提交后等待网点审核</p>
              </CardContent>
            </Card>

            {/* 收益记录 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  产品分成收益记录
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* 收益统计 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">总收益</p>
                    <p className="text-lg font-bold text-green-600">¥{revenueStats.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">可用收益</p>
                    <p className="text-lg font-bold text-blue-600">¥{revenueStats.availableRevenue.toLocaleString()}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">已提现</p>
                    <p className="text-lg font-bold text-orange-600">¥{revenueStats.totalWithdrawn.toLocaleString()}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">已转收益</p>
                    <p className="text-lg font-bold text-purple-600">¥{revenueStats.totalConverted.toLocaleString()}</p>
                  </div>
                </div>
                {revenueRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>暂无收益记录</p>
                    <p className="text-sm mt-1">会员购买产品后，分成收益将在此显示</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {revenueRecords.map((record: any) => (
                      <div key={record.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={record.source === 'distribution' ? 'default' : 'secondary'}>
                                {record.source_label || (record.source === 'distribution' ? '产品分成' : '下级分成')}
                              </Badge>
                              <span className="font-medium text-gray-800">
                                {record.product_name || record.productName || '产品'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                              {record.product_price > 0 && (
                                <span>产品价格: ¥{Number(record.product_price).toLocaleString()}</span>
                              )}
                              {record.market_fee > 0 && (
                                <span>收益释放: ¥{Number(record.market_fee).toLocaleString()}</span>
                              )}
                              {record.member_name && (
                                <span>购买会员: {record.member_name}{record.member_phone ? ` (${record.member_phone})` : ''}</span>
                              )}
                              {record.subordinate_name && (
                                <span>下级服务商: {record.subordinate_name}</span>
                              )}
                            </div>
                            {record.source === 'distribution' && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-400">
                                <span>服务商分成: ¥{Number(record.amount).toLocaleString()}</span>
                                {record.direct_reward > 0 && <span>直推奖励: ¥{Number(record.direct_reward).toLocaleString()}</span>}
                                {record.parent_provider_share > 0 && <span>上级分成: ¥{Number(record.parent_provider_share).toLocaleString()}</span>}
                              </div>
                            )}
                            <div className="mt-1 text-xs text-gray-400">
                              {formatDate(record.created_at)}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">+¥{Number(record.amount).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 智算金流转记录 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5" />
                  智算金流转记录
                </CardTitle>
              </CardHeader>
              <CardContent>
                {energyRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Coins className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>暂无流转记录</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {energyRecords.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            record.type === 'recharge' ? 'bg-green-100 text-green-600' :
                            record.type === 'transfer_in' ? 'bg-blue-100 text-blue-600' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {record.type === 'transfer_out' ? <ArrowDown className="w-5 h-5" /> : <ArrowUp className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-medium">
                              {record.type === 'recharge' ? '充值' : 
                               record.type === 'transfer_in' ? '从 ' + (record.from_username || '系统') + ' 转入' :
                               '转出给 ' + (record.to_username || '未知')}
                            </p>
                            <p className="text-sm text-gray-500">{record.note || '无备注'} · {formatDate(record.created_at)}</p>
                          </div>
                        </div>
                        <p className={`font-bold ${record.type === 'transfer_out' ? 'text-red-600' : 'text-green-600'}`}>
                          {record.type === 'transfer_out' ? '-' : '+'}{record.amount}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 提现记录 */}
            <Card>
              <CardHeader>
                <CardTitle>提现记录</CardTitle>
              </CardHeader>
              <CardContent>
                {withdrawSuccess && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                    {withdrawSuccess}
                  </div>
                )}
                {energyWithdrawRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>暂无提现记录</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {energyWithdrawRecords.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">申请金额: ¥{record.amount}</p>
                          <p className="text-sm text-gray-500">
                            实际到账: ¥{record.actual_amount} · 手续费: ¥{record.fee}
                          </p>
                          <p className="text-sm text-gray-500">
                            {record.alipay_account ? `支付宝: ${record.alipay_account} · ` : ''}{formatDate(record.created_at)}
                          </p>
                        </div>
                        <Badge variant={
                          record.status === 'pending' ? 'secondary' :
                          record.status === 'completed' ? 'default' : 'destructive'
                        } className={
                          record.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          record.status === 'completed' ? 'bg-green-100 text-green-700' : ''
                        }>
                          {record.status === 'pending' ? '待审核' :
                           record.status === 'completed' ? '已完成' :
                           record.status === 'approved' ? '已通过' : '已拒绝'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'reviews':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">审核申请</h1>
              <p className="text-gray-500 text-sm mt-1">待审核的购买申请</p>
            </div>
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>暂无待审核申请</p>
            </div>
          </div>
        );

      case 'recharge-review':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">充值审核</h1>
              <p className="text-gray-500 text-sm mt-1">会员收益充值申请</p>
            </div>
            <div className="text-center py-12 text-gray-500">
              <Zap className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>暂无待处理充值</p>
            </div>
          </div>
        );

      case 'repurchase':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">回购管理</h1>
                <p className="text-gray-500 text-sm mt-1">超时未售出的流转产品需要回购，回购后线下返还Token值给卖家</p>
              </div>
              <Button onClick={() => {}} variant="outline" size="sm" disabled={repurchaseLoading}>
                <RefreshCw className="w-4 h-4 mr-1" /> 刷新
              </Button>
            </div>

            {/* 回购规则说明 */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold text-amber-800 mb-2">回购规则</h3>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• 流转产品发布后 <strong>24小时</strong> 无人购买，触发服务商回购机制</li>
                <li>• 服务商需 <strong>线下返还Token值</strong> 给卖家会员</li>
                <li>• 卖家确认收到Token值后，产品回到服务商在售列表</li>
                <li>• 回购仅返还Token值，不包含收益</li>
              </ul>
            </div>

            {repurchaseLoading ? (
              <div className="text-center py-12 text-gray-500">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                <p>加载中...</p>
              </div>
            ) : repurchases.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <RefreshCw className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>暂无待回购产品</p>
                <p className="text-sm mt-1">流转产品超过24小时无人购买时会出现在这里</p>
              </div>
            ) : (
              <div className="space-y-4">
                {repurchases.map((item: any) => (
                  <div key={item.id} className="bg-white rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{item.product_name || item.product_code || '产品'}</span>
                          <Badge variant={item.status === 'repurchasing' ? 'default' : 'outline'}>
                            {item.status === 'repurchasing' ? '待卖家确认' : '待回购'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                          <div>卖家：{item.seller_name || '-'}</div>
                          <div>产品价格：¥{item.product_price?.toLocaleString() || '-'}</div>
                          <div>发布时间：{item.created_at ? new Date(item.created_at).toLocaleString() : '-'}</div>
                          <div>超时时间：{item.timeout_at ? new Date(item.timeout_at).toLocaleString() : '-'}</div>
                        </div>
                        {item.status === 'repurchasing' && (
                          <div className="mt-2 text-sm text-amber-600 bg-amber-50 rounded p-2">
                            已发起回购，等待卖家确认收到Token值...
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        {item.status === 'pending_repurchase' ? (
                          <Button
                            onClick={() => handleRepurchase(item.id)}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            发起回购
                          </Button>
                        ) : item.status === 'repurchasing' ? (
                          <span className="text-sm text-amber-600">等待确认</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'transfer':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">流转记录</h1>
                <p className="text-gray-500 text-sm mt-1">会员出售产品匹配管理</p>
              </div>
              <div className="flex gap-2">
                {matchProducts.some(p => p.pending_match_user_id) && (
                  <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleBatchConfirm} disabled={matchConfirming === 'batch'}>
                    {matchConfirming === 'batch' ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                    一键匹配成功
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={fetchMatchProducts}>
                  <RefreshCw className="w-4 h-4 mr-1" /> 刷新
                </Button>
              </div>
            </div>

            {/* 统计 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">待匹配产品</div>
                  <div className="text-2xl font-bold text-orange-600">{matchProducts.filter(p => !p.pending_match_user_id).length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">待确认匹配</div>
                  <div className="text-2xl font-bold text-blue-600">{matchProducts.filter(p => p.pending_match_user_id).length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">总流转额度</div>
                  <div className="text-2xl font-bold text-purple-600">¥{matchProducts.reduce((s, p) => s + p.price, 0).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">产品总数</div>
                  <div className="text-2xl font-bold">{matchProducts.length}</div>
                </CardContent>
              </Card>
            </div>

            {matchLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : matchProducts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ArrowRightLeft className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>暂无流转记录</p>
              </div>
            ) : (
              <div className="space-y-4">
                {matchProducts.map((product) => {
                  const isAssigned = !!product.pending_match_user_id;
                  return (
                    <Card key={product.id} className={isAssigned ? 'border-blue-300 bg-blue-50/30' : 'border-orange-300 bg-orange-50/20'}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-gray-500" />
                              <span className="font-semibold text-gray-900">{product.name} #{product.code}</span>
                              <Badge className={isAssigned ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}>
                                {isAssigned ? '待确认匹配' : '待匹配'}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-sm">
                              <div className="text-gray-500">
                                产品价格: <span className="text-gray-900 font-medium">¥{product.price.toLocaleString()}</span>
                              </div>
                              <div className="text-gray-500">
                                周期: <span className="text-gray-900 font-medium">{product.period}天</span>
                              </div>
                              <div className="text-gray-500">
                                原持有人: <span className="text-gray-900 font-medium">{product.previous_holder_name || '未知'}</span>
                              </div>
                              {isAssigned && (
                                <>
                                  <div className="text-gray-500">
                                    匹配会员: <span className="text-blue-700 font-medium">{product.pending_match_name || '未知'}</span>
                                  </div>
                                  <div className="text-gray-500">
                                    会员收益: <span className={`font-medium ${(product.pending_match_energy || 0) >= product.price * product.market_rate / 100 ? 'text-green-600' : 'text-red-600'}`}>
                                      {product.pending_match_energy || 0}
                                    </span>
                                    <span className="text-xs text-gray-400 ml-1">（需{Math.floor(product.price * product.market_rate / 100)}）</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 ml-4">
                            {!isAssigned ? (
                              <>
                                <Button size="sm" variant="default" onClick={() => handleOpenMatchDialog(product)}>
                                  匹配
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                  disabled={recycling === product.id}
                                  onClick={() => handleRecycle(product.id)}
                                >
                                  {recycling === product.id ? <Loader2 className="w-4 h-4 animate-spin" /> : '回收'}
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700"
                                  disabled={matchConfirming === product.id}
                                  onClick={() => handleMatchConfirm([product.id])}
                                >
                                  {matchConfirming === product.id ? <Loader2 className="w-4 h-4 animate-spin" /> : '匹配成功'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancelAssign(product.id)}
                                >
                                  取消
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                  disabled={recycling === product.id}
                                  onClick={() => handleRecycle(product.id)}
                                >
                                  {recycling === product.id ? <Loader2 className="w-4 h-4 animate-spin" /> : '回收'}
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* 匹配会员选择Dialog */}
            <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>匹配产品给会员</DialogTitle>
                  <DialogDescription>
                    产品：{matchTargetProduct?.name}（¥{matchTargetProduct?.price.toLocaleString()}）
                    <br />
                    需要会员收益：{matchTargetProduct ? Math.floor(matchTargetProduct.price * matchTargetProduct.market_rate / 100) : 0}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {matchMembers.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">暂无可匹配的会员</p>
                  ) : (
                    matchMembers.map((member) => (
                      <div
                        key={member.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedMatchMember === member.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedMatchMember(member.id)}
                      >
                        <div>
                          <div className="font-medium text-gray-900">{member.username}</div>
                          <div className="text-xs text-gray-500">{member.phone || member.unique_id || ''}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${member.balance >= (matchTargetProduct?.price || 0) * (matchTargetProduct?.market_rate || 0) / 100 ? 'text-green-600' : 'text-red-500'}`}>
                            收益: {member.balance}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowMatchDialog(false)}>取消</Button>
                  <Button
                    disabled={!selectedMatchMember || assigningMatch}
                    onClick={() => handleMatchAssign(matchTargetProduct.id, selectedMatchMember)}
                  >
                    {assigningMatch ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    确认匹配
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        );

      case 'balance-transfer': {
        const providerUserId = localStorage.getItem('userId') || '';
        const searchTransferTargets = () => {
          if (!transferSearchKeyword.trim()) return;
          fetch(`/api/balance/transfer?userId=${providerUserId}&keyword=${encodeURIComponent(transferSearchKeyword.trim())}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
            .then(r => r.json())
            .then(data => {
              if (data.success) {
                const targets = data.data || [];
                setTransferTargets(targets);
                if (targets.length === 1) {
                  setTransferToUserId(targets[0].id);
                } else {
                  setTransferToUserId('');
                }
              } else { setTransferTargets([]); setToast({ message: data.error || '搜索失败', type: 'error' }); }
            })
            .catch(() => { setTransferTargets([]); setToast({ message: '搜索失败', type: 'error' }); });
        };
        const handleBalanceTransfer = async () => {
          if (!transferToUserId || !transferToAmount || parseFloat(transferToAmount) < 100) {
            setToast({ message: '请选择转账对象且金额不低于100', type: 'error' });
            return;
          }
          setTransferring(true);
          try {
            const res = await fetch('/api/balance/transfer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ fromUserId: providerUserId, toUserId: transferToUserId, amount: parseFloat(transferToAmount), note: transferToNote }),
            });
            const data = await res.json();
            if (data.success) {
              setToast({ message: data.message, type: 'success' });
              setShowBalanceTransfer(false);
              setTransferToUserId('');
              setTransferToAmount('');
              setTransferToNote('');
              setTransferTargets([]);
              fetchEnergy();
            } else {
              setToast({ message: data.error || '转账失败', type: 'error' });
            }
          } catch { setToast({ message: '网络错误', type: 'error' }); }
          finally { setTransferring(false); }
        };
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">智算金互转</h1>
              <p className="text-gray-500 text-sm mt-1">向其他用户互转智算金，5%自动转为积分，95%到账对方</p>
            </div>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-700"><strong>说明：</strong>互转时5%自动转化为积分（归您），95%到账对方智算金。最低转账金额为100。</p>
                </div>
                <div className="bg-slate-100 rounded-lg p-3">
                  <p className="text-xs text-gray-500">您的智算金余额</p>
                  <p className="text-xl font-bold text-green-600">¥{balanceInfo.balance.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">搜索转账对象</label>
                  <div className="flex gap-2">
                    <Input placeholder="输入用户名/手机号/专属ID" value={transferSearchKeyword} onChange={(e) => setTransferSearchKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') searchTransferTargets(); }} />
                    <Button variant="outline" onClick={searchTransferTargets}><Search className="w-4 h-4 mr-1" />搜索</Button>
                  </div>
                </div>
                {transferTargets.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">选择转账对象</label>
                    <select className="w-full p-2 border rounded-md bg-white" value={transferToUserId} onChange={(e) => setTransferToUserId(e.target.value)}>
                      <option value="">请选择</option>
                      {transferTargets.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.username} {t.uniqueId ? `[${t.uniqueId}]` : ''} {t.phone ? `(${t.phone})` : ''} - {t.roleLabel || t.role}</option>
                      ))}
                    </select>
                  </div>
                )}
                {transferToUserId && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-700">已选择：{transferTargets.find((t: any) => t.id === transferToUserId)?.username} {transferTargets.find((t: any) => t.id === transferToUserId)?.uniqueId ? `[${transferTargets.find((t: any) => t.id === transferToUserId)?.uniqueId}]` : ''}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium mb-2 block">转账金额</label>
                  <Input type="number" placeholder="请输入转账金额（最低100）" value={transferToAmount} onChange={(e) => setTransferToAmount(e.target.value)} min="100" />
                  <p className="text-xs text-gray-500 mt-1">{transferToAmount && parseFloat(transferToAmount) > 0 ? `到账: ${(parseFloat(transferToAmount) * 0.95).toFixed(2)} | 积分: ${(parseFloat(transferToAmount) * 0.05).toFixed(2)}` : '互转时5%转化为积分，95%到账对方'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">备注（可选）</label>
                  <Input placeholder="如: 业务转账" value={transferToNote} onChange={(e) => setTransferToNote(e.target.value)} />
                </div>
                <Button className="w-full bg-amber-600 hover:bg-amber-700" disabled={transferring || !transferToUserId || !transferToAmount || parseFloat(transferToAmount) < 100} onClick={handleBalanceTransfer}>
                  {transferring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowLeftRight className="w-4 h-4 mr-2" />}确认转账
                </Button>
              </CardContent>
            </Card>

            {/* 智算金转积分 */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">智算金转积分</h2>
                  <p className="text-xs text-gray-500 mt-1">将智算金按1:1比例转换为积分，转换后不可撤回</p>
                </div>
                <div className="bg-slate-100 rounded-lg p-3">
                  <p className="text-xs text-gray-500">您的智算金余额</p>
                  <p className="text-xl font-bold text-green-600">¥{balanceInfo.balance.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">转换金额</label>
                  <Input type="number" placeholder="请输入转换金额（最低50）" value={convertAmount} onChange={(e) => setConvertAmount(e.target.value)} min="50" />
                  <p className="text-xs text-gray-500 mt-1">转换后获得等额积分：{convertAmount && parseFloat(convertAmount) > 0 ? parseFloat(convertAmount).toFixed(0) + ' 积分' : '-'}</p>
                </div>
                <Button className="w-full bg-violet-600 hover:bg-violet-700" disabled={converting || !convertAmount || parseFloat(convertAmount) < 50 || parseFloat(convertAmount) > balanceInfo.balance} onClick={async () => {
                  if (!convertAmount || parseFloat(convertAmount) < 50) { setToast({ message: '最低转换金额为50', type: 'error' }); return; }
                  if (parseFloat(convertAmount) > balanceInfo.balance) { setToast({ message: '余额不足', type: 'error' }); return; }
                  setConverting(true);
                  try {
                    const res = await fetch('/api/balance/convert', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({ userId: providerUserId, amount: parseFloat(convertAmount), type: 'to_points' }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      setToast({ message: data.message || '转换成功', type: 'success' });
                      setConvertAmount('');
                      fetchEnergy();
                    } else {
                      setToast({ message: data.error || '转换失败', type: 'error' });
                    }
                  } catch { setToast({ message: '网络错误', type: 'error' }); }
                  finally { setConverting(false); }
                }}>
                  {converting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Coins className="w-4 h-4 mr-2" />}确认转换为积分
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      }

      case 'product-showcase': {
        const getProductTier = (price: number) => {
          if (price <= 5000) return {
            name: '入门级', color: 'blue', stars: 3,
            bgGradient: 'from-blue-900/90 to-slate-900',
            iconBg: 'from-blue-500/40 to-cyan-500/40',
            iconBorder: 'border-blue-500/60',
            iconColor: 'text-blue-400',
            badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            headerBg: 'from-blue-600/90 to-blue-700/70',
          };
          if (price <= 30000) return {
            name: '进阶级', color: 'green', stars: 4,
            bgGradient: 'from-green-900/90 to-slate-900',
            iconBg: 'from-green-500/40 to-emerald-500/40',
            iconBorder: 'border-green-500/60',
            iconColor: 'text-green-400',
            badge: 'bg-green-500/20 text-green-400 border-green-500/30',
            headerBg: 'from-green-600/90 to-green-700/70',
          };
          return {
            name: '高端级', color: 'amber', stars: 5,
            bgGradient: 'from-amber-900/90 to-slate-900',
            iconBg: 'from-amber-500/40 to-orange-500/40',
            iconBorder: 'border-amber-500/60',
            iconColor: 'text-amber-400',
            badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            headerBg: 'from-amber-600/90 to-amber-700/70',
          };
        };

        const statusLabel = (status: string) => {
          switch (status) {
            case 'available': return { text: '在售', cls: 'bg-green-500/20 text-green-400 border-green-500/30' };
            case 'sold': return { text: '已售', cls: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };
            case 'pending_sell': return { text: '流转中', cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
            default: return { text: status, cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
          }
        };

        const filteredProducts = showcaseFilter === 'all'
          ? products
          : products.filter(p => p.status === showcaseFilter);

        const showcaseStats = {
          total: products.length,
          available: products.filter(p => p.status === 'available').length,
          sold: products.filter(p => p.status === 'sold').length,
          transferring: products.filter(p => p.status === 'pending_sell').length,
        };

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">产品展示</h1>
                <p className="text-gray-500 text-sm mt-1">查看所有产品及其状态</p>
              </div>
              <div className="flex items-center gap-2">
                {['all', 'available', 'sold', 'pending_sell'].map(f => (
                  <Button
                    key={f}
                    size="sm"
                    variant={showcaseFilter === f ? 'default' : 'outline'}
                    onClick={() => setShowcaseFilter(f)}
                  >
                    {f === 'all' ? '全部' : f === 'available' ? '在售' : f === 'sold' ? '已售' : '流转中'}
                  </Button>
                ))}
              </div>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="border-slate-200">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">产品总数</p>
                  <p className="text-2xl font-bold">{showcaseStats.total}</p>
                </CardContent>
              </Card>
              <Card className="border-green-200">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">在售</p>
                  <p className="text-2xl font-bold text-green-600">{showcaseStats.available}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-300">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">已售出</p>
                  <p className="text-2xl font-bold text-slate-500">{showcaseStats.sold}</p>
                </CardContent>
              </Card>
              <Card className="border-orange-200">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">流转中</p>
                  <p className="text-2xl font-bold text-orange-600">{showcaseStats.transferring}</p>
                </CardContent>
              </Card>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>暂无产品数据</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => {
                  const tier = getProductTier(product.price);
                  const total_rate = product.total_rate || 5;
                  const profit_rate = product.profit_rate || 2;
                  const market_rate = product.market_rate || (total_rate - profit_rate);
                  const st = statusLabel(product.status);

                  return (
                    <Card
                      key={product.id}
                      className={`bg-gradient-to-br ${tier.bgGradient} border-slate-700 overflow-hidden transition-all duration-300 hover:shadow-xl`}
                    >
                      {/* 顶部GPU展示区域 */}
                      <div className="relative h-28 md:h-36 overflow-hidden">
                        <div className={`absolute inset-0 bg-gradient-to-br ${tier.headerBg}`}>
                          <div className="absolute inset-0 opacity-10" style={{
                            backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
                            backgroundSize: '20px 20px'
                          }} />
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        </div>

                        {/* GPU芯片图标 */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className={`w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl bg-gradient-to-br ${tier.iconBg} border-2 ${tier.iconBorder} flex flex-col items-center justify-center backdrop-blur-sm shadow-2xl`}>
                            <span className={`text-lg md:text-2xl font-black ${tier.iconColor}`}>GPU</span>
                            <span className={`text-[8px] md:text-[10px] font-bold mt-0.5 md:mt-1 ${tier.iconColor}`}>{product.period}天</span>
                          </div>
                        </div>

                        {/* 等级标签 */}
                        <div className="absolute top-2 left-2 md:top-3 md:left-3">
                          <span className={`px-1.5 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${tier.badge} border backdrop-blur-sm`}>
                            {tier.name}
                          </span>
                        </div>

                        {/* 状态标签 */}
                        <div className="absolute top-2 right-2 md:top-3 md:right-3">
                          <span className={`px-1.5 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold border ${st.cls}`}>
                            {st.text}
                          </span>
                        </div>

                        {/* 产品编码 */}
                        <div className="absolute bottom-2 right-2 md:bottom-3 md:right-3">
                          <span className="px-1.5 py-0.5 bg-slate-900/80 rounded text-[9px] md:text-xs text-slate-300 font-mono backdrop-blur-sm">
                            {product.code || `GPU-${product.id.slice(0, 6).toUpperCase()}`}
                          </span>
                        </div>
                      </div>

                      {/* 产品信息区域 */}
                      <CardContent className="p-2.5 md:p-5">
                        {/* 周期+收益标签 */}
                        <div className="flex items-center gap-1.5 mb-2 md:mb-3">
                          <Badge variant="outline" className={`${tier.badge} border text-[10px] md:text-xs px-1.5 md:px-2.5`}>
                            {product.period}天周期
                          </Badge>
                          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] md:text-xs px-1.5 md:px-2.5">
                            到期+{total_rate}%
                          </Badge>
                        </div>

                        {/* 核心参数 */}
                        <div className="hidden md:grid grid-cols-2 gap-3 mb-4">
                          <div className={`p-3 rounded-xl border ${tier.color === 'blue' ? 'bg-blue-500/10 border-blue-500/30' : tier.color === 'green' ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                            <p className="text-xs text-slate-400 mb-1">预期收益</p>
                            <p className={`text-xl font-bold ${tier.color === 'blue' ? 'text-blue-400' : tier.color === 'green' ? 'text-green-400' : 'text-amber-400'}`}>+{total_rate}%</p>
                            <p className="text-xs text-slate-500">总收益率</p>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <p className="text-xs text-slate-400 mb-1">会员到手</p>
                            <p className="text-xl font-bold text-emerald-400">{profit_rate}%</p>
                            <p className="text-xs text-slate-500">实际收益</p>
                          </div>
                        </div>

                        {/* 移动端参数 */}
                        <div className="flex gap-2 mb-2 md:hidden">
                          <div className={`flex-1 p-2 rounded-lg border ${tier.color === 'blue' ? 'bg-blue-500/10 border-blue-500/30' : tier.color === 'green' ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                            <p className={`text-base font-bold ${tier.color === 'blue' ? 'text-blue-400' : tier.color === 'green' ? 'text-green-400' : 'text-amber-400'}`}>+{total_rate}%</p>
                            <p className="text-[9px] text-slate-500">总收益</p>
                          </div>
                          <div className="flex-1 p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                            <p className="text-base font-bold text-emerald-400">{profit_rate}%</p>
                            <p className="text-[9px] text-slate-500">到手</p>
                          </div>
                        </div>

                        {/* 价格 */}
                        <div className={`flex items-center justify-between p-2 md:p-3 rounded-lg mb-2 md:mb-4 border ${tier.color === 'blue' ? 'bg-blue-500/10 border-blue-500/30' : tier.color === 'green' ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                          <span className="text-[10px] md:text-sm text-slate-400">价格</span>
                          <span className="text-sm md:text-xl font-bold text-white">¥{product.price.toLocaleString()}</span>
                        </div>

                        {/* 收益释放 */}
                        <div className="mb-2 md:mb-3 p-2 md:p-3 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 text-center text-xs md:text-sm">
                          <Zap className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />
                          收益释放 {market_rate}% · 需收益 ¥{Math.round(product.price * market_rate / 100).toLocaleString()}
                        </div>

                        {/* 状态指示 - 已售时显示持有人信息提示 */}
                        {product.status === 'sold' && (
                          <div className="p-2 md:p-3 rounded-lg bg-slate-500/20 border border-slate-500/30 text-slate-400 text-center text-xs md:text-sm">
                            <Shield className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />
                            已售出 · 会员持有中
                          </div>
                        )}
                        {product.status === 'pending_sell' && (
                          <div className="p-2 md:p-3 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-300 text-center text-xs md:text-sm">
                            <RefreshCw className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />
                            流转中 · 等待买家购买
                          </div>
                        )}
                        {product.status === 'available' && (
                          <div className="p-2 md:p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-center text-xs md:text-sm">
                            <Package className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />
                            在售 · 等待会员购买
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* 移动端遮罩 */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* 移动端顶部Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setMobileSidebarOpen(true)} className="text-white p-1">
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-sm">服务商后台</span>
        </div>
        <button onClick={handleLogout} className="text-red-400 p-1">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* 左侧导航 - 移动端抽屉 / PC端固定 */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 ${sidebarCollapsed ? 'md:w-20' : 'md:w-64'} w-64 bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col border-r border-slate-700 transition-transform duration-300 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Logo区域 */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-white font-bold text-lg">服务商后台</h1>
                <p className="text-slate-400 text-xs">GPU算力服务平台</p>
              </div>
            )}
          </div>
        </div>

        {/* 菜单 */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => { setActiveMenu(item.id); setMobileSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                      activeMenu === item.id
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    } ${sidebarCollapsed ? 'justify-center' : ''}`}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {!sidebarCollapsed && <span className="font-medium text-sm">{item.name}</span>}
                    </div>
                    {!sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                      <Badge className="bg-red-500 text-white text-xs">{item.badge}</Badge>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 底部按钮 */}
        <div className="p-3 border-t border-slate-700 space-y-2">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            {!sidebarCollapsed && <span className="text-sm">收起</span>}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {!sidebarCollapsed && <span className="text-sm">退出登录</span>}
          </button>
        </div>
      </aside>

      {/* 右侧内容 */}
      <main className="flex-1 p-3 md:p-6 overflow-auto pt-16 md:pt-6">
        {/* 面包屑 */}
        <div className="mb-4 text-sm text-gray-500 hidden md:block">
          <span className="text-purple-600">服务商后台</span> / <span>{menuNames[activeMenu]}</span>
        </div>

        {/* 页面内容 */}
        {renderContent()}

        {/* 修改密码对话框 */}
        <ChangePasswordDialog
          open={showPasswordDialog}
          onOpenChange={setShowPasswordDialog}
          userId={user?.id || ''}
        />

        {/* 智算金转积分对话框 */}
        <Dialog open={showBalanceConvertDialog} onOpenChange={setShowBalanceConvertDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>智算金转积分</DialogTitle>
              <DialogDescription>将智算金转换为积分，转换比例 1:1</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-700">当前智算金余额: ¥{user?.balance || 0}</p>
              </div>
              <div>
                <Label>转换金额</Label>
                <Input type="number" placeholder="输入转换金额" value={convertAmount} onChange={e => setConvertAmount(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBalanceConvertDialog(false)}>取消</Button>
              <Button disabled={converting || !convertAmount} onClick={async () => {
                setConverting(true);
                try {
                  const token = localStorage.getItem('token');
                  const res = await fetch('/api/balance/convert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ userId: user?.id, amount: parseFloat(convertAmount) })
                  });
                  const data = await res.json();
                  if (data.success) {
                    alert('转换成功！');
                    setShowBalanceConvertDialog(false);
                    setConvertAmount('');
                    fetchOverview();
                    // 更新本地用户余额
                    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                    if (userData.balance !== undefined) {
                      userData.balance = (parseFloat(userData.balance) || 0) - parseFloat(convertAmount);
                      localStorage.setItem('userData', JSON.stringify(userData));
                      setUser(userData);
                    }
                  } else {
                    alert(data.message || '转换失败');
                  }
                } catch (err) {
                  alert('转换失败');
                } finally {
                  setConverting(false);
                }
              }}>
                {converting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                确认转换
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 智算金操作弹窗 */}
        <Dialog open={showEnergyActionDialog} onOpenChange={setShowEnergyActionDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">智算金操作</DialogTitle>
              <DialogDescription className="text-center">当前余额：¥{(balanceInfo.energyValue || 0).toLocaleString()}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Button
                className="w-full h-14 text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => { setShowEnergyActionDialog(false); setActiveMenu('balance-transfer'); }}
              >
                <ArrowLeftRight className="w-5 h-5 mr-2" /> 智算金互转
              </Button>
              <Button
                className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => { setShowEnergyActionDialog(false); setShowBalanceConvertDialog(true); }}
              >
                <RefreshCw className="w-5 h-5 mr-2" /> 转积分
              </Button>
              <Button
                className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 text-white"
                onClick={() => { setShowEnergyActionDialog(false); setShowWithdrawDialog(true); }}
              >
                <Wallet className="w-5 h-5 mr-2" /> 提现
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 提现对话框 */}
        <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>智算金提现</DialogTitle>
              <DialogDescription>申请提现智算金，手续费5%，最低提现¥100，提交后等待网点审核</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-700">当前智算金余额: ¥{user?.energy_value || 0}</p>
              </div>
              <div>
                <Label>提现金额</Label>
                <Input type="number" placeholder="输入提现金额（最低¥100）" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
              </div>
              {Number(withdrawAmount) > 0 && (
                <div className="text-sm text-gray-500">
                  手续费(5%): ¥{(Number(withdrawAmount) * 0.05).toFixed(2)}，实际到账: ¥{(Number(withdrawAmount) * 0.95).toFixed(2)}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>取消</Button>
              <Button disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) < 100} onClick={async () => {
                setWithdrawing(true);
                try {
                  const token = localStorage.getItem('token');
                  const res = await fetch('/api/withdrawals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                      amount: parseFloat(withdrawAmount),
                      alipayAccount: user?.alipay_account || '',
                      realName: user?.real_name || ''
                    })
                  });
                  const data = await res.json();
                  if (data.success) {
                    setToast({ message: `提现申请已提交！手续费¥${data.data.fee}，实际到账¥${data.data.actualAmount}，等待网点审核`, type: 'success' });
                    setShowWithdrawDialog(false);
                    setWithdrawAmount('');
                    fetchOverview();
                    fetchEnergyWithdrawRecords();
                  } else {
                    setToast({ message: data.message || '提现申请失败', type: 'error' });
                  }
                } catch (err: any) {
                  setToast({ message: `提现失败: ${err?.message || '网络错误'}`, type: 'error' });
                  console.error('提现申请错误:', err);
                } finally {
                  setWithdrawing(false);
                }
              }}>
                {withdrawing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                确认提现
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
