'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Users, Zap, Package, Loader2, Send, Building2, 
  RefreshCw, Plus, Bell, ChevronDown, ChevronUp,
  Eye, DollarSign, ClipboardList, CheckCircle, XCircle, Database,
  FileCheck, ClipboardCheck, User, History, Banknote, Gift, TrendingUp,
  AlertCircle, Cpu, Share2, FileText, PlusCircle, ArrowRightLeft, Search,
  Repeat, Wallet, CheckSquare, Square, Lock, Unlock,
  ShoppingCart, LockOpen
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// 用户数据接口（兼容 useAuth 返回类型）
interface UserData {
  id: string;
  username: string;
  role: string;
  phone: string | null;
  real_name: string | null;
  alipay_account: string | null;
  provider_id: string | null;
  inviter_id: string | null;
  balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  branch_id?: string | null;
  unique_id?: string;
}

interface Provider {
  id: string;
  username: string;
  balance: number;
  energy_value: number;
  quota?: number;
  used_quota?: number;
  available_quota?: number;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  code: string;
  period: number;
  total_rate: number;
  market_rate: number;
  profit_rate: number;
  status?: string;
}

interface QuotaAllocation {
  id: string;
  provider_id: string;
  template_id: string;
  quota_amount: number;
  used_amount: number;
  status: string;
  created_at: string;
  provider?: { id: string; username: string };
  product_templates?: Template;
}

interface ProviderApplication {
  id: string;
  user_id: string;
  applicant_name: string;
  phone: string;
  user_phone?: string;
  username?: string;
  real_name?: string;
  alipay_account: string;
  apply_type: string;
  quota_request: number;
  quota_approved?: number;
  status: string;
  reject_reason?: string;
  parent_provider_name?: string;
  parent_provider_id?: string;
  created_at: string;
  users?: { id: string; username: string; real_name: string };
}

interface Stats {
  provider_count: number;
  member_count: number;
  total_member_energy: number;
  total_member_balance: number;
  pending_sell_count: number;
  pending_withdrawal_count: number;
  total_quota?: number;
  available_quota?: number;
  used_quota?: number;
}

interface QuotaRequest {
  id: string;
  requested_amount: number;
  approved_amount: number;
  bonus_rate: number;
  status: string;
  created_at: string;
}

export default function BranchPage() {
  const { user, setUser, loading: authLoading, logout, refreshUser } = useAuth('branch');
  
  // 统一的 API 请求方法（带认证）
  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
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

  const [stats, setStats] = useState<Stats>({
    provider_count: 0,
    member_count: 0,
    total_member_energy: 0,
    total_member_balance: 0,
    pending_sell_count: 0,
    pending_withdrawal_count: 0,
  });
  const [providers, setProviders] = useState<Provider[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [allocations, setAllocations] = useState<QuotaAllocation[]>([]);
  const [applications, setApplications] = useState<ProviderApplication[]>([]);
  const [quotaRequests, setQuotaRequests] = useState<QuotaRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [quotaSubTab, setQuotaSubTab] = useState('overview');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // 服务商额度申请审批相关
  const [providerQuotaRequests, setProviderQuotaRequests] = useState<any[]>([]);
  const [quotaApiResult, setQuotaApiResult] = useState<any>(null);
  const [energyTransactions, setEnergyTransactions] = useState<any[]>([]);
  
  
  // 会员转移相关状态
  const [showMemberTransferDialog, setShowMemberTransferDialog] = useState(false);
  const [transferMemberId, setTransferMemberId] = useState("");
  const [transferMemberInfo, setTransferMemberInfo] = useState<any>(null);
  const [transferTargetProvider, setTransferTargetProvider] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  // 收款信息和修改密码相关状态
  const [profileAlipayAccount, setProfileAlipayAccount] = useState("");
  const [profileWechatAccount, setProfileWechatAccount] = useState("");

  // 资金流水
  const [capitalFlowData, setCapitalFlowData] = useState<any>(null);
  const [capitalFlowLoading, setCapitalFlowLoading] = useState(false);
  const [capitalFlowTab, setCapitalFlowTab] = useState('all');
  const [capitalFlowPage, setCapitalFlowPage] = useState(1);

  // 产品信息相关状态
  const [branchProducts, setBranchProducts] = useState<any[]>([]);
  const [branchProductsLoading, setBranchProductsLoading] = useState(false);

  // 到期释放相关状态
  const [expiredProducts, setExpiredProducts] = useState<any[]>([]);
  const [expiredProductsLoading, setExpiredProductsLoading] = useState(false);
  const [releasingIds, setReleasingIds] = useState<Set<string>>(new Set());
  const [releaseAllLoading, setReleaseAllLoading] = useState(false);
  const [selectedExpiredIds, setSelectedExpiredIds] = useState<Set<string>>(new Set());
  const [sellingIds, setSellingIds] = useState<Set<string>>(new Set());
  const [batchSelling, setBatchSelling] = useState(false);

  // 服务商详情展开状态
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [providerDetailTab, setProviderDetailTab] = useState<'products' | 'release'>('products');
  const [providerProducts, setProviderProducts] = useState<any[]>([]);
  const [providerDetailLoading, setProviderDetailLoading] = useState(false);
  const [providerExpiredProducts, setProviderExpiredProducts] = useState<any[]>([]);
  const [providerExpiredLoading, setProviderExpiredLoading] = useState(false);

  // 智算金互转相关状态
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferSearchQuery, setTransferSearchQuery] = useState("");
  const [transferSearchResults, setTransferSearchResults] = useState<any[]>([]);
  const [transferSearching, setTransferSearching] = useState(false);
  const [transferSelectedUser, setTransferSelectedUser] = useState<any>(null);
  const [transferUserId, setTransferUserId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [profileBankName, setProfileBankName] = useState("");
  const [profileBankAccount, setProfileBankAccount] = useState("");
  const [profileBankHolder, setProfileBankHolder] = useState("");
  const [savingPaymentInfo, setSavingPaymentInfo] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [transferPreview, setTransferPreview] = useState<any>(null);
  
  // 编辑资料状态
  const [editUsername, setEditUsername] = useState("");
  const [editRealName, setEditRealName] = useState("");
  const [editAlipayAccount, setEditAlipayAccount] = useState("");
  
  // 服务网点收益余额
  const [branchEnergyBalance, setBranchEnergyBalance] = useState(0);
  
  // 服务网点申请收益
  const [branchApplyAmount, setBranchApplyAmount] = useState("");
  
  // 服务网点列表（同级互转）
  const [branchList, setBranchList] = useState<Array<{id: string; username: string; role: string}>>([]);
  
  // 服务网点变现申请
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawRequests, setWithdrawRequests] = useState<any[]>([]);

  // 提现审核
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [branchWithdrawRecords, setBranchWithdrawRecords] = useState<any[]>([]);
  const [branchRevenueRecords, setBranchRevenueRecords] = useState<any[]>([]);
  const [branchRevenueStats, setBranchRevenueStats] = useState<any>({});
  const [branchWithdrawAmount, setBranchWithdrawAmount] = useState("");
  const [branchWithdrawAlipay, setBranchWithdrawAlipay] = useState("");
  const [branchWithdrawRealName, setBranchWithdrawRealName] = useState("");
  const [showBranchWithdrawDialog, setShowBranchWithdrawDialog] = useState(false);

  // 收益转收益
  const [showConvertToEnergyDialog, setShowConvertToEnergyDialog] = useState(false);
  const [convertToEnergyAmount, setConvertToEnergyAmount] = useState("");

  // 积分兑换商城
  const [showPointsShop, setShowPointsShop] = useState(false);
  const [pointsShopProducts, setPointsShopProducts] = useState<any[]>([]);
  const [pointsShopLoading, setPointsShopLoading] = useState(false);
  const [showExchangeForm, setShowExchangeForm] = useState(false);
  const [exchangeProduct, setExchangeProduct] = useState<any>(null);
  const [exchangeForm, setExchangeForm] = useState({ name: '', phone: '', address: '' });

  // 服务网点收益流转记录
  const [energyRecords, setEnergyRecords] = useState<any[]>([]);
  const [energyFilterType, setEnergyFilterType] = useState<string>('all');
  const [energyStats, setEnergyStats] = useState({
    totalIn: 0,
    totalOut: 0,
    rechargeCount: 0,
    transferInCount: 0,
    transferOutCount: 0,
  });

  // 会员管理
  const [memberList, setMemberList] = useState<any[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberFilterProvider, setMemberFilterProvider] = useState<string>('all');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberPage, setMemberPage] = useState(1);
  const [memberTotalPages, setMemberTotalPages] = useState(1);
  const [memberTotal, setMemberTotal] = useState(0);

  // 加载收益流转记录
  const loadEnergyRecords = async (filterType: string = 'all') => {
    const branchId = localStorage.getItem('userId');
    if (!branchId) return;

    try {
      const response = await authFetch(`/api/branch/energy-records?branchId=${branchId}&type=${filterType}`);
      const data = await response.json();
      if (data.success) {
        setEnergyRecords(data.data.records || []);
        setEnergyStats(data.data.stats || energyStats);
      }
    } catch (error) {
      console.error('加载收益记录失败:', error);
    }
  };

  // 收益申请审批相关状态
  const [energyRequests, setEnergyRequests] = useState<any[]>([]);
  
  // 收益管理子Tab
  const [energySubTab, setEnergySubTab] = useState<string>('records'); // records, review, transfer
  
  // 提现审核弹窗
  const [reviewingWithdraw, setReviewingWithdraw] = useState<any>(null);
  
  // 服务网点向智算中心申请收益相关状态
  const [myEnergyRequests, setMyEnergyRequests] = useState<any[]>([]);
  const [myEnergyApplyPendingCount, setMyEnergyApplyPendingCount] = useState(0);
  
  // 服务商向本服务网点申请收益相关状态
  const [providerEnergyRequests, setProviderEnergyRequests] = useState<any[]>([]);
  
  // 提现审核弹窗
  const [rejectReason, setRejectReason] = useState('');
  
  // 分配额度表单
  const [showAllocateDialog, setShowAllocateDialog] = useState(false);
  const [showQuotaApplyDialog, setShowQuotaApplyDialog] = useState(false);
  const [showEnergyApplyDialog, setShowEnergyApplyDialog] = useState(false);
  const [energyApplyAmount, setEnergyApplyAmount] = useState('');
  const [energyApplyNote, setEnergyApplyNote] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [quotaAmount, setQuotaAmount] = useState<string>('50000');
  const [applyQuotaAmount, setApplyQuotaAmount] = useState<string>('');

  // 打开分配额度对话框时刷新服务商列表
  const openAllocateDialog = async () => {
    const branchId = localStorage.getItem('userId');
    if (!branchId) return;
    
    // 重新获取服务商列表
    try {
      const res = await authFetch(`/api/branch/providers?branchId=${branchId}`);
      const data = await res.json();
      if (data.success && data.data?.providers) {
        setProviders(data.data.providers);
      }
    } catch (e) {
      console.error('获取服务商列表失败:', e);
    }
    setShowAllocateDialog(true);
  };

  const loadData = useCallback(async () => {
    const branchId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    console.log('[loadData] START - branchId:', branchId, 'username:', username);
    if (!branchId) {
      console.log('loadData: branchId is null');
      return;
    }

    const token = localStorage.getItem('token');
    console.log('loadData token:', token ? 'exists' : 'null');
    console.log('loadData branchId:', branchId);

    // 辅助函数：解析 Promise.allSettled 的结果
    const extractResult = async (result: PromiseSettledResult<Response>): Promise<any> => {
      if (result.status === 'fulfilled') {
        try {
          return await result.value.json();
        } catch {
          return { success: false, error: 'JSON parse failed' };
        }
      } else {
        console.error('API rejected:', result.reason);
        return { success: false, error: 'Request failed' };
      }
    };

    try {
      console.log('[loadData] 开始发送API请求...');
      const results = await Promise.allSettled([
        fetch(`/api/branch/overview?branchId=${branchId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/admin/branch-templates?branchId=${branchId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/quota-allocations?branchId=${branchId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/branch/approve-provider?branchId=${branchId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/quota?userId=${branchId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/quota-requests?requesterId=${branchId}&requesterType=branch`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/branch/approve-quota?branchId=${branchId}&status=pending`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/energy/branch-stats?branchId=${branchId}&username=${username || ''}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/withdrawals?tab=review`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);
      console.log('[loadData] 所有API请求完成');
      
      // 调试：显示每个请求的状态
      const requestNames = ['branch/overview', 'admin/branch-templates', 'quota-allocations', 'provider-applications', 'quota', 'quota-requests', 'branch/approve-quota', 'energy/branch-stats', 'withdrawals/review'];
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`[loadData] 请求 ${requestNames[index]} 失败:`, result.reason);
        } else if (!result.value.ok) {
          console.error(`[loadData] 请求 ${requestNames[index]} HTTP错误:`, result.value.status);
        } else {
          console.log(`[loadData] 请求 ${requestNames[index]} HTTP状态:`, result.value.status);
        }
      });
      
      const [overviewData, branchTemplatesData, allocationsData, applicationsData, quotaData, myQuotaRequestsData, providerQuotaRequestsData, energyStatsData, withdrawReviewData] = await Promise.all(results.map(extractResult));

      console.log('[loadData] overviewData:', JSON.stringify(overviewData).substring(0, 500));

      // 更新服务网点收益余额
      if (energyStatsData.success && energyStatsData.data?.branch) {
        console.log('[loadData] energyStatsData SUCCESS - branch balance:', energyStatsData.data.branch.balance);
        setBranchEnergyBalance(energyStatsData.data.branch.balance || 0);
      } else {
        console.log('[loadData] energyStatsData result:', energyStatsData);
      }

      if (overviewData.success) {
        setStats(prev => ({
          ...prev,
          ...overviewData.data.stats,
        }));
        setProviders(overviewData.data.providers || []);
      }

      // 从分配记录中提取模板信息
      if (branchTemplatesData.success) {
        const allocations = branchTemplatesData.data?.allocations || [];
        // 将分配记录转换为模板格式
        const templatesFromAllocations = allocations.map((alloc: any) => ({
          id: alloc.template_id,
          name: alloc.template_name,
          code: alloc.template_code,
          period: alloc.period,
          total_rate: alloc.total_rate,
          market_rate: alloc.market_rate,
          profit_rate: alloc.profit_rate,
          quota_amount: alloc.quota_amount,
          used_amount: alloc.used_amount,
          available_amount: alloc.quota_amount - alloc.used_amount,
        }));
        setTemplates(templatesFromAllocations);
      }

      if (allocationsData.success) {
        // 兼容两种格式：数组或 { records: [], stats: {} }
        const records = Array.isArray(allocationsData.data) 
          ? allocationsData.data 
          : (allocationsData.data?.records || []);
        setAllocations(records);
        // 如果有 stats 信息，也更新额度统计
        if (allocationsData.data?.stats) {
          setStats(prev => ({
            ...prev,
            total_quota: allocationsData.data.stats.totalQuota || 0,
            available_quota: allocationsData.data.stats.availableQuota || 0,
            used_quota: allocationsData.data.stats.usedQuota || 0,
          }));
        }
      }

      if (applicationsData.success) {
        setApplications(applicationsData.data || []);
      }

      if (providerQuotaRequestsData.success) {
        setProviderQuotaRequests(providerQuotaRequestsData.data || []);
      }

      console.log('[loadData] quotaData result:', JSON.stringify(quotaData));
      setQuotaApiResult(quotaData); // 保存用于调试
      if (quotaData.success && quotaData.data) {
        console.log('[loadData] 更新额度: total_quota=', quotaData.data.total_quota, 'available_quota=', quotaData.data.available_quota);
        setStats(prev => ({
          ...prev,
          total_quota: quotaData.data?.total_quota || 0,
          available_quota: quotaData.data?.available_quota || 0,
          used_quota: quotaData.data?.used_quota || 0,
        }));
      } else {
        console.error('[loadData] quotaData FAILED:', quotaData);
      }

      if (myQuotaRequestsData.success) {
        setQuotaRequests(myQuotaRequestsData.data || []);
      }

      // 加载提现审核数据
      if (withdrawReviewData.success && withdrawReviewData.data) {
        const records = withdrawReviewData.data?.records || [];
        setPendingWithdrawals(Array.isArray(records) ? records : []);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('[useEffect] authLoading:', authLoading, 'user:', user ? user.name : null);
    if (!authLoading && user) {
      console.log('[useEffect] 触发 loadData');
      loadData();
    }
  }, [authLoading, user, loadData]);

  // 调试状态
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    localStorage: { userId: '', username: '', role: '' },
    apiData: null as any,
    error: ''
  });

  // 初始化编辑资料状态
  useEffect(() => {
    if (user) {
      setEditUsername(user.username || '');
      setEditRealName(user.real_name || '');
      setEditAlipayAccount(user.alipay_account || '');
    }
  }, [user]);

  useEffect(() => {
    setDebugInfo({
      localStorage: {
        userId: localStorage.getItem('userId') || '',
        username: localStorage.getItem('userName') || '',
        role: localStorage.getItem('userRole') || ''
      },
      apiData: { stats, providers, templates },
      error: ''
    });
  }, [stats, providers, templates]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // 分配额度给服务商
  const handleAllocateQuota = async () => {
    if (!selectedProvider || !quotaAmount) {
      showMessage('error', '请选择服务商并输入额度');
      return;
    }

    const branchId = localStorage.getItem('userId');
    if (!branchId) return;

    setSubmitting(true);
    try {
      const response = await authFetch('/api/quota-allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId,
          providerId: selectedProvider,
          quotaAmount: parseFloat(quotaAmount),
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', data.message || '额度分配成功');
        setShowAllocateDialog(false);
        setSelectedProvider('');
        setQuotaAmount('50000');
        await refreshUser();
        await loadData();
        setTimeout(() => { refreshUser(); loadData(); }, 1500);
      } else {
        showMessage('error', data.error || '分配失败');
      }
    } catch (error) {
      showMessage('error', '网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // 审核服务商申请
  const handleReviewApplication = async (applicationId: string, action: 'approve' | 'reject', quotaAllocated?: number) => {
    const branchId = localStorage.getItem('userId');
    if (!branchId) return;

    setSubmitting(true);
    try {
      const response = await authFetch('/api/branch/approve-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          reviewerId: branchId,
          action,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', data.message || '审核完成');
        loadData();
      } else {
        showMessage('error', data.error || '审核失败');
      }
    } catch (error) {
      showMessage('error', '网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // 申请额度
  const handleApplyQuota = async () => {
    const branchId = localStorage.getItem('userId');
    if (!branchId) return;

    if (!applyQuotaAmount || parseFloat(applyQuotaAmount) < 10000) {
      showMessage('error', '申请额度不能少于10,000元');
      return;
    }

    setSubmitting(true);
    try {
      // 智算中心管理员ID
      const ADMIN_ID = '00000000-0000-0000-0000-000000000001';

      const response = await authFetch('/api/quota-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: branchId,
          requesterType: 'branch',
          parentId: ADMIN_ID,
          requestedAmount: parseFloat(applyQuotaAmount),
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', data.message || '额度申请已提交，请等待智算中心审核');
        setShowQuotaApplyDialog(false);
        setApplyQuotaAmount('');
        loadData();
      } else {
        showMessage('error', data.error || '申请失败');
      }
    } catch (error) {
      showMessage('error', '网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // 审批服务商额度申请
  const handleApproveProviderQuota = async (requestId: string, action: 'approve' | 'reject', approvedAmount?: number) => {
    const branchId = localStorage.getItem('userId');
    if (!branchId) return;

    setSubmitting(true);
    try {
      const response = await authFetch('/api/branch/approve-quota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          reviewer_id: branchId,
          action,
          approved_amount: action === 'approve' ? approvedAmount : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', data.message || '审核完成');
        loadProviderQuotaRequests();
        loadData();
      } else {
        showMessage('error', data.error || '审核失败');
      }
    } catch (error) {
      showMessage('error', '网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // 加载会员列表
  const loadMemberList = async (page: number = 1, overrideProviderId?: string) => {
    const branchId = localStorage.getItem('userId');
    if (!branchId) return;

    const currentProviderId = overrideProviderId !== undefined ? overrideProviderId : memberFilterProvider;
    setMemberLoading(true);
    try {
      let url = `/api/branch/members?branchId=${branchId}&page=${page}&pageSize=20`;
      if (currentProviderId !== 'all') {
        url += `&providerId=${currentProviderId}`;
      }
      const response = await authFetch(url);
      const data = await response.json();
      if (data.success) {
        setMemberList(data.data.members || []);
        setMemberTotal(data.data.stats?.totalMembers || 0);
        setMemberTotalPages(data.data.pagination?.totalPages || 1);
        setMemberPage(page);
      }
    } catch (error) {
      console.error('加载会员列表失败:', error);
    } finally {
      setMemberLoading(false);
    }
  };

  // 打开会员转移Dialog
  const openMemberTransfer = (member: any) => {
    setTransferMemberId(member.id);
    setTransferMemberInfo(member);
    setTransferTargetProvider('');
    setTransferPreview(null);
    setShowMemberTransferDialog(true);
  };

  // 预览会员转移（获取直推树和持有产品检查）
  const previewMemberTransfer = async () => {
    if (!transferMemberId || !transferTargetProvider) return;
    setTransferLoading(true);
    try {
      const branchId = localStorage.getItem('userId');
      const response = await authFetch('/api/branch/transfer-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId,
          memberId: transferMemberId,
          targetProviderId: transferTargetProvider,
          operatorId: branchId,
          preview: true
        })
      });
      const data = await response.json();
      if (data.success) {
        setTransferPreview(data.data);
      } else {
        setTransferPreview({ error: data.message });
      }
    } catch (error) {
      console.error('预览转移失败:', error);
      setTransferPreview({ error: '预览失败' });
    } finally {
      setTransferLoading(false);
    }
  };

  // 确认执行会员转移
  const confirmMemberTransfer = async () => {
    if (!transferMemberId || !transferTargetProvider) return;
    setTransferLoading(true);
    try {
      const branchId = localStorage.getItem('userId');
      const response = await authFetch('/api/branch/transfer-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId,
          memberId: transferMemberId,
          targetProviderId: transferTargetProvider,
          operatorId: branchId
        })
      });
      const data = await response.json();
      if (data.success) {
        showMessage('success', data.message);
        setShowMemberTransferDialog(false);
        setTransferPreview(null);
        loadMemberList(1);
      } else {
        showMessage('error', data.message);
      }
    } catch (error) {
      console.error('转移失败:', error);
      showMessage('error', '转移失败');
    } finally {
      setTransferLoading(false);
    }
  };

  // 保存用户名
  const handleSaveUsername = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await authFetch('/api/user/username', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username: editUsername })
      });
      const data = await response.json();
      if (data.success) {
        showMessage('success', '用户名修改成功');
        const stored = localStorage.getItem('userData');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.username = editUsername;
          localStorage.setItem('userData', JSON.stringify(parsed));
        }
        localStorage.setItem('userName', editUsername);
      } else {
        showMessage('error', data.error || '修改失败');
      }
    } catch (error) {
      showMessage('error', '修改失败');
    }
  };

  // 保存真实姓名
  const handleSaveProfile = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await authFetch('/api/user/username', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, realName: editRealName })
      });
      const data = await response.json();
      if (data.success) {
        showMessage('success', '姓名修改成功');
        const stored = localStorage.getItem('userData');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.real_name = editRealName;
          localStorage.setItem('userData', JSON.stringify(parsed));
        }
      } else {
        showMessage('error', data.message || '修改失败');
      }
    } catch (error) {
      showMessage('error', '修改失败');
    }
  };

  // 保存收款信息
  const handleSavePayment = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await authFetch('/api/member/payment-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, alipayAccount: editAlipayAccount })
      });
      const data = await response.json();
      if (data.success) {
        showMessage('success', '收款信息保存成功');
        const stored = localStorage.getItem('userData');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.alipay_account = editAlipayAccount;
          localStorage.setItem('userData', JSON.stringify(parsed));
        }
      } else {
        showMessage('error', data.message || '保存失败');
      }
    } catch (error) {
      showMessage('error', '保存失败');
    }
  };

  // 修改密码
  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      showMessage('error', '请填写完整密码信息');
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessage('error', '两次输入的新密码不一致');
      return;
    }
    if (newPassword.length < 6) {
      showMessage('error', '新密码至少6个字符');
      return;
    }
    try {
      const userId = localStorage.getItem('userId');
      const response = await authFetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, oldPassword, newPassword })
      });
      const data = await response.json();
      if (data.success) {
        showMessage('success', '密码修改成功，请重新登录');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showMessage('error', data.message || '修改失败');
      }
    } catch (error) {
      showMessage('error', '修改失败');
    }
  };

  // 加载服务商额度申请记录
  const [quotaFilterStatus, setQuotaFilterStatus] = useState<string>('pending');
  const loadProviderQuotaRequests = async () => {
    const branchId = localStorage.getItem('userId');
    if (!branchId) return;

    try {
      const statusParam = quotaFilterStatus === 'all' ? '' : `&status=${quotaFilterStatus}`;
      const response = await authFetch(`/api/branch/approve-quota?branchId=${branchId}${statusParam}&showAll=true`);
      const data = await response.json();
      if (data.success) {
        setProviderQuotaRequests(data.data || []);
      }
    } catch (error) {
      console.error('加载服务商额度申请失败:', error);
    }
  };

  // 服务网点向智算中心申请收益
  const handleBranchApplyEnergy = async () => {
    const amount = parseFloat(branchApplyAmount);
    if (!amount || amount <= 0) {
      showMessage('error', '请输入有效金额');
      return;
    }

    if (amount < 100) {
      showMessage('error', '申请金额最低为100收益');
      return;
    }

    try {
      setSubmitting(true);
      const branchId = localStorage.getItem('userId');
      if (!branchId) return;

      const response = await authFetch('/api/energy/branch-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: branchId,
          amount: amount,
          note: '服务网点申请收益'
        })
      });

      const data = await response.json();
      if (data.success) {
        showMessage('success', '申请已提交，等待智算中心审核');
        setBranchApplyAmount('');
        loadEnergyRequests(); // 刷新申请记录
      } else {
        showMessage('error', data.error || '申请失败');
      }
    } catch (error) {
      showMessage('error', '网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // 服务网点申请提现 - 统一调用 /api/withdrawals
  const handleBranchWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      showMessage('error', '请输入有效金额');
      return;
    }

    if (amount < 100) {
      showMessage('error', '最低提现金额为100元');
      return;
    }

    if (amount > branchEnergyBalance) {
      showMessage('error', '智算金余额不足');
      return;
    }

    try {
      setSubmitting(true);

      const response = await authFetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          alipayAccount: '',
          realName: '',
          note: '服务网点申请提现'
        })
      });

      const data = await response.json();
      if (data.success) {
        showMessage('success', `提现申请已提交！手续费¥${data.data?.fee || 0}，实际到账¥${data.data?.actualAmount || 0}，等待智算中心审核`);
        setWithdrawAmount('');
        setShowWithdrawDialog(false);
        loadWithdrawRequests();
        loadEnergyBalance();
      } else {
        showMessage('error', data.message || '提现申请失败');
      }
    } catch (error) {
      showMessage('error', '网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // 加载提现申请记录 - 统一调用 /api/withdrawals
  const loadWithdrawRequests = async () => {
    try {
      const response = await authFetch('/api/withdrawals?tab=mine');
      const data = await response.json();
      if (data.success) {
        setWithdrawRequests(data.data?.records || []);
      }
    } catch (error) {
      console.error('加载提现申请记录失败:', error);
    }
  };

  // 加载待审核提现列表 - 统一调用 /api/withdrawals
  const loadPendingWithdrawals = async () => {
    try {
      const response = await authFetch('/api/withdrawals?tab=review');
      const data = await response.json();
      if (data.success) {
        const records = data.data?.records || [];
        setPendingWithdrawals(records);
      }
    } catch (error) {
      console.error('加载待审核提现失败:', error);
    }
  };

  // 审核提现操作 - 统一调用 /api/withdrawals/confirm
  const handleReviewWithdrawal = async (withdrawalId: string, action: string, rejectReason?: string) => {
    try {
      setSubmitting(true);
      const response = await authFetch('/api/withdrawals/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId, action, rejectReason }),
      });
      const data = await response.json();
      if (data.success) {
        showMessage('success', data.message || '操作成功');
        loadPendingWithdrawals();
        loadBranchRevenueRecords();
        // 刷新智算金余额和资金流水
        refreshUser();
        if (activeTab === 'capitalFlow') loadCapitalFlow();
        setTimeout(() => { refreshUser(); if (activeTab === 'capitalFlow') loadCapitalFlow(); }, 1500);
        setTimeout(() => { refreshUser(); if (activeTab === 'capitalFlow') loadCapitalFlow(); }, 3000);
      } else {
        showMessage('error', data.message || '操作失败');
      }
    } catch (error) {
      showMessage('error', '网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // 加载服务网点收益记录
  const loadBranchRevenueRecords = async () => {
    const branchId = localStorage.getItem('userId');
    if (!branchId) return;
    try {
      const response = await authFetch(`/api/branch/revenue-records?branchId=${branchId}`);
      const data = await response.json();
      if (data.success) {
        setBranchRevenueRecords(data.data?.records || []);
        const s = data.data?.stats || {};
        setBranchRevenueStats({
          totalRevenue: s.total_revenue || 0,
          memberWithdraw: s.total_member_withdraw || 0,
          providerWithdraw: s.total_provider_withdraw || 0,
          marketFeeShare: s.total_market_fee_share || 0,
          providerUpstream: s.total_provider_upstream || 0,
        });
      }
    } catch (error) {
      console.error('加载收益记录失败:', error);
    }
  };

  // 服务网点提现到智算中心 - 统一调用 /api/withdrawals
  const handleBranchWithdrawToCompany = async () => {
    const amount = parseFloat(branchWithdrawAmount);
    if (!amount || amount < 100) {
      showMessage('error', '最低提现金额为100元');
      return;
    }
    if (!branchWithdrawAlipay.trim()) {
      showMessage('error', '请输入支付宝账号');
      return;
    }
    if (!branchWithdrawRealName.trim()) {
      showMessage('error', '请输入支付宝姓名');
      return;
    }
    try {
      setSubmitting(true);
      const response = await authFetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: branchWithdrawAmount,
          alipayAccount: branchWithdrawAlipay.trim(),
          realName: branchWithdrawRealName.trim(),
        }),
      });
      const data = await response.json();
      if (data.success) {
        showMessage('success', `提现申请已提交！手续费¥${data.data?.fee || 0}，实际到账¥${data.data?.actualAmount || 0}，等待智算中心审核`);
        setShowBranchWithdrawDialog(false);
        setBranchWithdrawAmount('');
        setBranchWithdrawAlipay('');
        setBranchWithdrawRealName('');
        loadBranchRevenueRecords();
        loadEnergyBalance();
      } else {
        showMessage('error', data.message || '提现失败');
      }
    } catch (error) {
      showMessage('error', '网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // 收益转收益
  const handleConvertToEnergy = async () => {
    const amount = parseFloat(convertToEnergyAmount);
    if (!amount || amount < 10) {
      showMessage('error', '最低转换金额为10元');
      return;
    }
    try {
      setSubmitting(true);
      const response = await authFetch('/api/branch/convert-to-energy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: convertToEnergyAmount }),
      });
      const data = await response.json();
      if (data.success) {
        showMessage('success', data.message || `转换成功：${data.data?.energyAdded}元→收益，${data.data?.pointsAdded}元→积分`);
        setShowConvertToEnergyDialog(false);
        setConvertToEnergyAmount('');
        // 更新本地用户数据
        const userDataStr = localStorage.getItem('userData');
        if (userDataStr && data.data) {
          const userData = JSON.parse(userDataStr);
          userData.balance = data.data.balance;
          localStorage.setItem('userData', JSON.stringify(userData));
        }
        loadBranchRevenueRecords();
      } else {
        showMessage('error', data.error || '转换失败');
      }
    } catch (error) {
      showMessage('error', '网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // 加载服务网点提现记录 - 统一调用 /api/withdrawals
  const loadBranchWithdrawRecords = async () => {
    try {
      const response = await authFetch('/api/withdrawals?tab=mine');
      const data = await response.json();
      if (data.success) {
        setBranchWithdrawRecords(data.data?.records || []);
      }
    } catch (error) {
      console.error('加载提现记录失败:', error);
    }
  };

  // 加载收益余额
  const loadEnergyBalance = async () => {
    const branchId = localStorage.getItem('userId');
    if (!branchId) return;

    try {
      const response = await authFetch(`/api/energy/account?userId=${branchId}`);
      const data = await response.json();
      if (data.success) {
        setBranchEnergyBalance(data.data?.balance || 0);
      }
    } catch (error) {
      console.error('加载收益余额失败:', error);
    }
  };

  // 加载转账对象列表
  // 加载同级服务网点列表
  const loadBranchList = async () => {
    try {
      const response = await authFetch('/api/admin/branch-management');
      const data = await response.json();
      if (data.success) {
        const branches = Array.isArray(data.data?.branches) 
          ? data.data.branches.filter((b: any) => b.id !== localStorage.getItem('userId')) // 排除自己
          : [];
        setBranchList(branches);
      } else {
        setBranchList([]);
      }
    } catch (error) {
      console.error('加载服务网点列表失败:', error);
      setBranchList([]);
    }
  };

  // 处理智算金转账
  // 加载网点下的产品信息
  const loadBranchProducts = useCallback(async () => {
    const branchId = localStorage.getItem('userId');
    if (!branchId) return;
    setBranchProductsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/branch/products?branchId=${branchId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setBranchProducts(data.data || []);
      }
    } catch (err) {
      console.error('加载产品信息失败:', err);
    } finally {
      setBranchProductsLoading(false);
    }
  }, []);

  // 加载到期未释放产品
  const loadExpiredProducts = useCallback(async () => {
    const branchId = localStorage.getItem('userId');
    if (!branchId) return;
    setExpiredProductsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/branch/expired-products?branchId=${branchId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setExpiredProducts(data.data || []);
      }
    } catch (err) {
      console.error('加载到期产品失败:', err);
    } finally {
      setExpiredProductsLoading(false);
    }
  }, []);

  // 释放单个产品收益
  const handleReleaseOne = async (upId: string, providerId?: string) => {
    const token = localStorage.getItem('token');
    setReleasingIds(prev => new Set(prev).add(upId));
    try {
      const res = await fetch('/api/branch/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userProductIds: [upId], providerId })
      });
      const data = await res.json();
      if (data.success) {
        if (providerId) loadProviderExpired(providerId);
      } else {
        alert(data.message || '解锁失败');
      }
    } catch (err) {
      alert('释放失败');
    } finally {
      setReleasingIds(prev => { const s = new Set(prev); s.delete(upId); return s; });
    }
  };

  // 一键释放所有到期产品（可按服务商筛选）
  const handleReleaseAll = async (providerId?: string) => {
    const targetList = providerId ? providerExpiredProducts : expiredProducts;
    if (!confirm(`确认解锁并释放 ${targetList.length} 个到期产品的收益？`)) return;
    setReleaseAllLoading(true);
    try {
      const token = localStorage.getItem('token');
      const ids = targetList.map((p: any) => p.id);
      const res = await fetch('/api/branch/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userProductIds: ids, providerId })
      });
      const data = await res.json();
      if (data.success) {
        alert(`成功解锁并释放 ${data.data?.releasedCount || 0} 个产品的收益`);
        loadExpiredProducts();
        if (providerId) loadProviderExpired(providerId);
      } else {
        alert(data.message || '释放失败');
      }
    } catch (err) {
      alert('释放失败');
    } finally {
      setReleaseAllLoading(false);
    }
  };

  // 加载服务商详情-产品列表
  const loadProviderDetails = async (providerId: string) => {
    setProviderDetailLoading(true);
    setProviderDetailTab('products');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/branch/products?providerId=${providerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProviderProducts(data.data || []);
      }
    } catch (err) {
      console.error('加载服务商产品失败:', err);
    } finally {
      setProviderDetailLoading(false);
    }
  };

  // 加载服务商到期未释放产品
  const loadProviderExpired = async (providerId?: string) => {
    setProviderExpiredLoading(true);
    try {
      const token = localStorage.getItem('token');
      const branchId = localStorage.getItem('userId');
      // 传 branchId 查网点下所有会员持仓，也可传 providerId 只查某个服务商
      const params = new URLSearchParams();
      if (providerId) params.set('providerId', providerId);
      if (branchId) params.set('branchId', branchId);
      const res = await fetch(`/api/branch/expired-products?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProviderExpiredProducts(data.data?.products || []);
      }
    } catch (err) {
      console.error('加载到期产品失败:', err);
    } finally {
      setProviderExpiredLoading(false);
    }
  };

  // 服务商详情内一键释放
  const handleProviderReleaseAll = (providerId: string) => {
    handleReleaseAll(providerId);
  };

  // 解锁单个产品（解锁=收益到账+可卖出）
  const handleUnlock = async (upId: string) => {
    if (!confirm('确认解锁此产品？解锁后收益将到账，会员可卖出。')) return;
    setReleasingIds(prev => new Set(prev).add(upId));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/force-release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ adminKey: 'admin-force-release-2026', userProductIds: [upId] })
      });
      const data = await res.json();
      if (data.success) {
        // 刷新到期产品列表
        if (expandedProvider) loadProviderExpired(expandedProvider);
      } else {
        alert(data.message || '解锁失败');
      }
    } catch (err) {
      alert('解锁失败');
    } finally {
      setReleasingIds(prev => { const s = new Set(prev); s.delete(upId); return s; });
    }
  };

  // 批量解锁选中产品
  const handleBatchUnlock = async (providerId: string) => {
    if (selectedExpiredIds.size === 0) { alert('请先选择要解锁的产品'); return; }
    if (!confirm(`确认解锁选中的 ${selectedExpiredIds.size} 个产品？解锁后收益将按比例分配到各账户。`)) return;
    setReleaseAllLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/branch/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userProductIds: Array.from(selectedExpiredIds), providerId })
      });
      const data = await res.json();
      if (data.success) {
        alert(`成功解锁 ${data.data?.releasedCount || 0} 个产品`);
        setSelectedExpiredIds(new Set());
        if (expandedProvider) loadProviderExpired(expandedProvider);
      } else {
        alert(data.message || '批量解锁失败');
      }
    } catch (err) {
      alert('批量解锁失败');
    } finally {
      setReleaseAllLoading(false);
    }
  };

  // 强制卖出单个产品
  const handleForceSell = async (upId: string) => {
    if (!confirm('确认强制卖出此产品？本金+收益将返还给会员。')) return;
    setSellingIds(prev => new Set(prev).add(upId));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/branch/force-sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userProductId: upId })
      });
      const data = await res.json();
      if (data.success) {
        if (expandedProvider) loadProviderExpired(expandedProvider);
      } else {
        alert(data.message || '卖出失败');
      }
    } catch (err) {
      alert('卖出失败');
    } finally {
      setSellingIds(prev => { const s = new Set(prev); s.delete(upId); return s; });
    }
  };

  // 批量卖出选中产品
  const handleBatchSell = async (providerId?: string) => {
    const unlockedSelected = providerExpiredProducts
      .filter((p: any) => selectedExpiredIds.has(p.id) && (p.revenueReleased || p.revenue_released))
      .map((p: any) => p.id);
    if (unlockedSelected.length === 0) { alert('请先选择已解锁的产品进行卖出'); return; }
    if (!confirm(`确认卖出选中的 ${unlockedSelected.length} 个已解锁产品？`)) return;
    setBatchSelling(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/branch/force-sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userProductIds: unlockedSelected })
      });
      const data = await res.json();
      if (data.success) {
        alert(`成功卖出 ${data.data?.soldCount || 0} 个产品`);
        setSelectedExpiredIds(new Set());
        if (expandedProvider) loadProviderExpired(expandedProvider);
      } else {
        alert(data.message || '批量卖出失败');
      }
    } catch (err) {
      alert('批量卖出失败');
    } finally {
      setBatchSelling(false);
    }
  };

  // 单个强制卖出
  const handleForceSellOne = async (upId: string) => {
    if (!confirm('确认强制卖出该产品？卖出后本金+收益将到账会员余额')) return;
    setSellingIds(prev => new Set(prev).add(upId));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/branch/force-sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userProductIds: [upId] })
      });
      const data = await res.json();
      if (data.success) {
        alert('卖出成功');
        if (expandedProvider) loadProviderExpired(expandedProvider);
      } else {
        alert(data.message || '卖出失败');
      }
    } catch (err) {
      alert('卖出失败');
    } finally {
      setSellingIds(prev => { const s = new Set(prev); s.delete(upId); return s; });
    }
  };

  // 切换选中
  const toggleExpiredSelect = (id: string) => {
    setSelectedExpiredIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedExpiredIds.size === providerExpiredProducts.length) {
      setSelectedExpiredIds(new Set());
    } else {
      setSelectedExpiredIds(new Set(providerExpiredProducts.map((p: any) => p.id)));
    }
  };

  const loadCapitalFlow = useCallback(async (page = 1) => {
    const branchId = localStorage.getItem('userId');
    if (!branchId) return;
    setCapitalFlowLoading(true);
    try {
      const ft = capitalFlowTab === 'all' ? '' : capitalFlowTab;
      const res = await fetch(`/api/capital-flow?userId=${branchId}&flowType=${ft}&page=${page}&pageSize=10`);
      const data = await res.json();
      if (data.success) setCapitalFlowData(data.data);
    } catch (e) { console.error('loadCapitalFlow error', e); }
    finally { setCapitalFlowLoading(false); }
  }, [capitalFlowTab]);

  useEffect(() => { if (activeTab === 'capitalFlow') loadCapitalFlow(capitalFlowPage); }, [activeTab, capitalFlowTab, capitalFlowPage, loadCapitalFlow]);
  useEffect(() => { if (activeTab === 'revenue') loadBranchRevenueRecords(); }, [activeTab]);

  // 智算金互转 - 搜索用户
  const handleTransferSearch = async () => {
    if (!transferSearchQuery.trim()) {
      showMessage('error', '请输入搜索关键词');
      return;
    }
    setTransferSearching(true);
    try {
      const response = await fetch(`/api/balance/transfer?keyword=${encodeURIComponent(transferSearchQuery.trim())}&userId=${localStorage.getItem('userId')}`);
      const data = await response.json();
      if (data.success) {
        setTransferSearchResults(data.data || []);
        if (data.data?.length === 0) {
          showMessage('error', '未找到匹配的用户');
        }
      } else {
        showMessage('error', data.error || '搜索失败');
      }
    } catch {
      showMessage('error', '搜索失败，请重试');
    } finally {
      setTransferSearching(false);
    }
  };

  // 智算金互转 - 选择用户
  const handleSelectTransferUser = (u: any) => {
    setTransferSelectedUser(u);
    setTransferUserId(u.id);
  };

  // 智算金互转 - 执行转账
  const handleTransferBalance = async () => {
    const branchId = localStorage.getItem('userId');
    if (!branchId || !transferUserId || !transferAmount) {
      showMessage('error', '请填写完整信息');
      return;
    }
    const amount = parseFloat(transferAmount);
    if (amount <= 0) {
      showMessage('error', '转账金额必须大于0');
      return;
    }
    if (amount < 50) {
      showMessage('error', '转账金额不能少于50');
      return;
    }
    setSubmitting(true);
    try {
      const response = await authFetch('/api/balance/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: branchId,
          toUserId: transferUserId,
          amount: amount,
          note: transferNote,
        }),
      });
      const data = await response.json();
      if (data.success) {
        showMessage('success', data.message);
        setShowTransferDialog(false);
        setTransferUserId('');
        setTransferAmount('');
        setTransferNote('');
        setTransferSearchQuery('');
        setTransferSearchResults([]);
        setTransferSelectedUser(null);
        loadData();
      } else {
        showMessage('error', data.error || '转账失败');
      }
    } catch (error) {
      showMessage('error', '网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // 向智算中心申请收益
  const handleApplyEnergy = async () => {
    const branchId = localStorage.getItem('userId');
    if (!branchId || !energyApplyAmount) {
      showMessage('error', '请填写申请金额');
      return;
    }

    const amount = parseFloat(energyApplyAmount);
    if (amount <= 0) {
      showMessage('error', '申请金额必须大于0');
      return;
    }

    setSubmitting(true);
    try {
      const response = await authFetch('/api/energy/grant-to-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId,
          amount,
          note: energyApplyNote,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showMessage('success', data.message);
        setShowEnergyApplyDialog(false);
        setEnergyApplyAmount('');
        setEnergyApplyNote('');
        loadData();
      } else {
        showMessage('error', data.error || '申请失败');
      }
    } catch (error) {
      showMessage('error', '网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // 加载收益申请记录
  const loadEnergyRequests = async () => {
    const branchId = localStorage.getItem('userId');
    if (!branchId) return;

    try {
      const response = await authFetch(`/api/branch/approve-energy-request?branchId=${branchId}&status=pending`);
      const data = await response.json();
      if (data.success) {
        setEnergyRequests(data.data || []);
      }
    } catch (error) {
      console.error('加载收益申请失败:', error);
    }
  };

  // 加载服务商向本服务网点申请收益的记录
  const loadProviderEnergyRequests = async () => {
    const branchId = localStorage.getItem('userId');
    if (!branchId) return;

    try {
      const response = await authFetch(`/api/branch/provider-energy-requests?branchId=${branchId}`);
      const data = await response.json();
      if (data.success) {
        setProviderEnergyRequests(data.data?.requests || []);
      }
    } catch (error) {
      console.error('加载服务商收益申请失败:', error);
    }
  };

  // 加载服务网点向智算中心申请收益的记录
  const loadMyEnergyRequests = async () => {
    const branchId = localStorage.getItem('userId');
    if (!branchId) return;

    try {
      const response = await authFetch(`/api/energy/branch-request?branchId=${branchId}`);
      const data = await response.json();
      if (data.success && data.data) {
        setMyEnergyRequests(data.data.records || []);
        setMyEnergyApplyPendingCount(data.data.stats?.pending?.count || 0);
      }
    } catch (error) {
      console.error('加载收益申请记录失败:', error);
    }
  };

  // 审核收益申请
  const handleApproveEnergyRequest = async (requestId: string, action: 'approve' | 'reject', note?: string) => {
    const branchId = localStorage.getItem('userId');
    if (!branchId) return;

    setSubmitting(true);
    try {
      const response = await authFetch('/api/branch/approve-energy-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          branchId,
          action,
          note,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showMessage('success', data.message);
        loadEnergyRequests();
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

  // 审核服务商收益申请
  const handleApproveProviderEnergyRequestRequest = async (requestId: string, action: 'approve' | 'reject', note?: string) => {
    const branchId = localStorage.getItem('userId');
    if (!branchId) return;

    // 查找该申请的金额
    const request = providerEnergyRequests.find(r => r.id === requestId);
    if (!request) {
      showMessage('error', '申请不存在');
      return;
    }

    const requestedAmount = parseFloat(String(request.amount || request.requestedAmount || 0));

    // 通过申请时检查余额
    if (action === 'approve' && requestedAmount > branchEnergyBalance) {
      showMessage('error', `余额不足，当前余额 ${branchEnergyBalance.toLocaleString()}，申请金额 ${requestedAmount.toLocaleString()}`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await authFetch('/api/branch/approve-provider-energy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          action,
          note,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showMessage('success', data.message);
        loadProviderEnergyRequests();
        loadData();
        // 更新本地余额
        if (action === 'approve') {
          setBranchEnergyBalance(prev => prev - requestedAmount);
        }
      } else {
        showMessage('error', data.error || '操作失败');
      }
    } catch (error) {
      showMessage('error', '网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // 获取收益记录
  const fetchEnergyRecords = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const response = await fetch(`/api/energy/transactions?userId=${userId}`);
      const data = await response.json();

      if (data.success) {
        setEnergyTransactions(data.data?.records || []);
      }
    } catch (error) {
      console.error('获取收益记录失败:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200">
      {/* 消息提示 */}
      {message && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg ${
          message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white shadow-lg`}>
          {message.text}
        </div>
      )}

      {/* 分配额度对话框 */}
      {showAllocateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>分配额度给服务商</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 说明 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <p className="font-medium mb-1">操作说明</p>
                <p>选择服务商并输入分配的额度金额，服务商获得额度后可直接选择智算中心设定的产品模板生成Token存储包。</p>
              </div>
              {/* 服务网点额度信息 */}
              <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-violet-600" />
                  <span className="text-sm font-medium text-violet-800">我的算力额度</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-violet-700">{(stats.total_quota || 0).toLocaleString()}</p>
                    <p className="text-xs text-violet-500">总额度</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">{(stats.available_quota || 0).toLocaleString()}</p>
                    <p className="text-xs text-violet-500">可用额度</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-orange-600">{(stats.used_quota || 0).toLocaleString()}</p>
                    <p className="text-xs text-violet-500">已分配</p>
                  </div>
                </div>
                {/* 额度进度条 */}
                <div className="mt-2">
                  <div className="w-full bg-violet-200 rounded-full h-2">
                    <div 
                      className="bg-violet-600 h-2 rounded-full transition-all" 
                      style={{ width: `${stats.total_quota ? Math.min((stats.used_quota || 0) / stats.total_quota * 100, 100) : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-violet-500 mt-1 text-right">
                    已使用 {stats.total_quota ? ((stats.used_quota || 0) / stats.total_quota * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>

              <div>
                <Label>选择服务商</Label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full border rounded px-3 py-2 mt-1"
                >
                  <option value="">请选择服务商</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.username} (可用额度: {(p.available_quota ?? p.quota ?? 0).toLocaleString()})
                    </option>
                  ))}
                </select>
                {/* 选中服务商后显示其额度 */}
                {selectedProvider && (() => {
                  const provider = providers.find(p => p.id === selectedProvider);
                  if (!provider) return null;
                  return (
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-blue-500">当前额度:</span>
                          <span className="font-medium ml-1">{(provider.quota ?? 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-blue-500">已使用:</span>
                          <span className="font-medium ml-1">{(provider.used_quota ?? 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div>
                <Label>分配额度 (元)</Label>
                <Input
                  type="number"
                  value={quotaAmount}
                  onChange={(e) => setQuotaAmount(e.target.value)}
                  placeholder="输入额度金额"
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">服务商获得额度后，可自主选择产品模板生成Token存储包</p>
                {/* 额度不足提示 */}
                {quotaAmount && parseFloat(quotaAmount) > (stats.available_quota || 0) && (
                  <div className="mt-1 flex items-center gap-1 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>额度不足！可用额度 {(stats.available_quota || 0).toLocaleString()} 元，需分配 {parseFloat(quotaAmount).toLocaleString()} 元</span>
                  </div>
                )}
                {/* 额度充足提示 */}
                {quotaAmount && parseFloat(quotaAmount) > 0 && parseFloat(quotaAmount) <= (stats.available_quota || 0) && (
                  <div className="mt-1 flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>分配后剩余: {((stats.available_quota || 0) - parseFloat(quotaAmount)).toLocaleString()} 元</span>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAllocateDialog(false)}>取消</Button>
                <Button 
                  className="bg-blue-600" 
                  onClick={handleAllocateQuota}
                  disabled={submitting || (quotaAmount ? parseFloat(quotaAmount) > (stats.available_quota || 0) : false)}
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  确认分配
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 顶部导航 - 深紫色主题 */}
      <header className="bg-gradient-to-r from-violet-900 to-purple-900 shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-3 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
                <Building2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-base md:text-xl font-bold text-white">服务网点管理后台</h1>
                <p className="text-xs text-white/70 hidden md:block">Branch Management System</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <Badge className="bg-white/20 text-white backdrop-blur text-xs">
                <Building2 className="w-3 h-3 mr-1" />服务网点
              </Badge>
              <Button variant="ghost" onClick={logout} className="text-white hover:bg-white/20 text-sm">退出</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 md:px-6 py-4 md:py-8">
        {/* 数据概览 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8">
          <Card className="mobile-compact-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500 mobile-icon" />
                <span className="text-gray-500 text-sm mobile-label">服务商数量</span>
              </div>
              <p className="text-2xl font-bold mt-2">{stats.provider_count}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500 mobile-icon" />
                <span className="text-gray-500 text-sm mobile-label">会员数量</span>
              </div>
              <p className="text-2xl font-bold mt-2">{stats.member_count}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500 mobile-icon" />
                <span className="text-gray-500 text-sm mobile-label">待处理事项</span>
              </div>
              <p className="text-2xl font-bold mt-2">{stats.pending_sell_count + stats.pending_withdrawal_count}</p>
            </CardContent>
          </Card>
        </div>

        {/* 功能标签页 - 深紫色主题 */}
        <div className="space-y-3 md:space-y-6">
          <div className="flex justify-between items-center bg-gradient-to-r from-violet-900 to-purple-900 rounded-lg px-2 py-1">
            <div className="mobile-tab-nav flex gap-2 overflow-x-auto scrollbar-hide -mx-2 px-2">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-2 rounded-md transition-all flex items-center gap-1 ${
                  activeTab === 'profile' ? 'bg-white text-purple-900 font-semibold shadow-md' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <User className="w-4 h-4" />我的资料
              </button>
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-md transition-all ${
                  activeTab === 'overview' ? 'bg-white text-purple-900 font-semibold shadow-md' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                数据总览
              </button>
              <button
                onClick={() => setActiveTab('quota-management')}
                className={`px-4 py-2 rounded-md transition-all flex items-center gap-1 ${
                  activeTab === 'quota-management' ? 'bg-white text-purple-900 font-semibold shadow-md' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Database className="w-4 h-4" />算力额度管理
                {providerQuotaRequests.length > 0 && (
                  <Badge className="ml-1 bg-red-500 text-white text-xs">{providerQuotaRequests.length}</Badge>
                )}
              </button>
              <button
                onClick={() => setActiveTab('providers')}
                className={`px-4 py-2 rounded-md transition-all flex items-center gap-1 ${
                  activeTab === 'providers' ? 'bg-white text-purple-900 font-semibold shadow-md' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Building2 className="w-4 h-4" />服务商管理
              </button>
              <button
                onClick={() => { loadMemberList(1); setActiveTab('members'); }}
                className={`px-4 py-2 rounded-md transition-all flex items-center gap-1 ${
                  activeTab === 'members' ? 'bg-white text-purple-900 font-semibold shadow-md' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <User className="w-4 h-4" />会员管理
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className={`px-4 py-2 rounded-md transition-all flex items-center gap-1 ${
                  activeTab === 'applications' ? 'bg-white text-purple-900 font-semibold shadow-md' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <FileCheck className="w-4 h-4" />审核申请
                {applications.length > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white text-xs">{applications.length}</Badge>
                )}
              </button>

              <button
                onClick={() => { loadPendingWithdrawals(); loadBranchWithdrawRecords(); setActiveTab('withdraw-review'); }}
                className={`px-4 py-2 rounded-md transition-all flex items-center gap-1 ${
                  activeTab === 'withdraw-review' ? 'bg-white text-purple-900 font-semibold shadow-md' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <ClipboardCheck className="w-4 h-4" />提现审核
              </button>
              <button
                onClick={() => { loadBranchRevenueRecords(); setActiveTab('revenue'); }}
                className={`px-4 py-2 rounded-md transition-all flex items-center gap-1 ${
                  activeTab === 'revenue' ? 'bg-white text-purple-900 font-semibold shadow-md' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Banknote className="w-4 h-4" />收益管理
              </button>
              <button
                onClick={() => { setActiveTab('capitalFlow'); }}
                className={`px-4 py-2 rounded-md transition-all flex items-center gap-1 ${
                  activeTab === 'capitalFlow' ? 'bg-white text-purple-900 font-semibold shadow-md' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />资金流水
              </button>

            </div>
          </div>

          {/* 我的资料 */}
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>我的资料</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 基本信息 */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg border-b pb-2">基本信息</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-gray-500">用户ID</span>
                        <span className="font-mono text-sm font-bold text-purple-700">{(user as any)?.unique_id || user?.id?.slice(0,8) || '-'}</span>
                      </div>
                      <div className="py-2 border-b">
                        <span className="text-gray-500 block mb-2">我的邀请码</span>
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                          <p className="text-sm text-purple-600 mb-2">分享您的邀请码给好友</p>
                          <div className="flex items-center gap-3 mb-3">
                            <p className="text-2xl font-bold text-purple-700">{(user as any)?.unique_id || (user as any)?.invite_code || 'BR00001'}</p>
                            <Button size="sm" variant="outline" onClick={() => {
                              navigator.clipboard.writeText((user as any)?.unique_id || (user as any)?.invite_code || '');
                              showMessage('success', '邀请码已复制');
                            }}>
                              复制邀请码
                            </Button>
                          </div>
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => {
                            const code = (user as any)?.unique_id || (user as any)?.invite_code || '';
                            const link = `${window.location.origin}/?invite=${code}`;
                            navigator.clipboard.writeText(link);
                            showMessage('success', '邀请链接已复制');
                          }}>
                            复制邀请链接
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-gray-500">用户名</span>
                        <span className="font-medium">{user?.username || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-gray-500">角色</span>
                        <Badge className="bg-purple-100 text-purple-700">服务网点</Badge>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-gray-500">手机号</span>
                        <span>{(user as any)?.phone || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-gray-500">真实姓名</span>
                        <span>{(user as any)?.real_name || '未填写'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 账户信息 */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg border-b pb-2">账户信息</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-gray-500">收益余额</span>
                        <span className="font-bold text-xl text-purple-600">{branchEnergyBalance.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-gray-500">服务商数量</span>
                        <span className="font-medium">{stats.provider_count}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-gray-500">会员总数</span>
                        <span className="font-medium">{stats.member_count}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-gray-500">总分配额度</span>
                        <span className="font-medium">¥{allocations.reduce((sum: number, a: any) => sum + (parseFloat(a.quota_amount) || 0), 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 修改用户名 */}
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-medium text-lg mb-4">修改用户名</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>用户名</Label>
                      <Input 
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        className="mt-1"
                        placeholder="请输入用户名（2-20个字符）"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleSaveUsername}>
                      保存用户名
                    </Button>
                  </div>
                </div>

                {/* 修改姓名 */}
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-medium text-lg mb-4">修改姓名</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>真实姓名</Label>
                      <Input 
                        value={editRealName}
                        onChange={(e) => setEditRealName(e.target.value)}
                        className="mt-1"
                        placeholder="请输入真实姓名"
                      />
                    </div>
                    <div>
                      <Label>手机号</Label>
                      <Input 
                        value={user?.phone || ''} 
                        disabled
                        className="mt-1 bg-gray-100"
                        placeholder="手机号不可修改"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleSaveProfile}>
                      保存姓名
                    </Button>
                  </div>
                </div>

                {/* 收款信息 */}
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-medium text-lg mb-4">收款信息</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>支付宝账号</Label>
                      <Input 
                        value={editAlipayAccount}
                        onChange={(e) => setEditAlipayAccount(e.target.value)}
                        className="mt-1"
                        placeholder="请输入支付宝账号（用于收款）"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">收款信息用于会员提现时向您转账，请确保账号正确</p>
                  <div className="mt-4">
                    <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleSavePayment}>
                      保存收款信息
                    </Button>
                  </div>
                </div>

                {/* 修改密码 */}
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-medium text-lg mb-4">修改密码</h3>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <Label>当前密码</Label>
                      <Input 
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="mt-1"
                        placeholder="请输入当前密码"
                      />
                    </div>
                    <div>
                      <Label>新密码</Label>
                      <Input 
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="mt-1"
                        placeholder="请输入新密码（至少6个字符）"
                      />
                    </div>
                    <div>
                      <Label>确认新密码</Label>
                      <Input 
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="mt-1"
                        placeholder="请再次输入新密码"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button className="bg-purple-600 hover:bg-purple-700" onClick={handlePasswordChange}>
                      修改密码
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 概览 */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-4">
                  <h3 className="font-medium mb-4">快捷操作</h3>
                  <div className="space-y-3">
                    <Button 
                      onClick={() => openAllocateDialog()} 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="w-4 h-4 mr-2" />分配额度给服务商
                    </Button>
                    <Button 
                      onClick={() => setActiveTab('providers')} 
                      variant="outline" 
                      className="w-full"
                    >
                      <Users className="w-4 h-4 mr-2" />查看服务商列表
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <h3 className="font-medium mb-4">系统状态</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">服务商数量</span>
                      <span className="font-medium">{stats.provider_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">会员数量</span>
                      <span className="font-medium">{stats.member_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">会员总余额</span>
                      <span className="text-green-600">¥{(stats.total_member_balance || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">已分配额度</span>
                      <span className="text-blue-600">
                        ¥{(allocations.reduce((sum: number, a: any) => sum + (parseFloat(a.quota_amount) || 0), 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 算力额度管理（统一） */}
          {activeTab === 'quota-management' && (
            <div className="space-y-3 md:space-y-6">
              {/* 子Tab导航 */}
              <div className="mobile-tab-nav flex gap-1 overflow-x-auto pb-1">
                {[
                  { key: 'overview', label: '额度总览', icon: Database },
                  { key: 'allocations', label: '额度分配', icon: Share2 },
                  { key: 'approve', label: '额度审批', icon: ClipboardList },
                ].map(sub => (
                  <button
                    key={sub.key}
                    onClick={() => setQuotaSubTab(sub.key)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      quotaSubTab === sub.key
                        ? 'bg-purple-600 text-white shadow'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <sub.icon className="w-4 h-4" />
                    {sub.label}
                  </button>
                ))}
              </div>

              {/* 子Tab: 额度总览 */}
              {quotaSubTab === 'overview' && (
                <div className="space-y-3 md:space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                    <Card className="mobile-compact-card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                      <CardContent className="pt-4">
                        <p className="text-sm opacity-80 mobile-label">总额度</p>
                        <p className="text-2xl font-bold mt-1 mobile-num">¥{stats.total_quota?.toLocaleString() || '0'}</p>
                      </CardContent>
                    </Card>
                    <Card className="mobile-compact-card bg-gradient-to-br from-green-500 to-green-600 text-white">
                      <CardContent className="pt-4">
                        <p className="text-sm opacity-80 mobile-label">可用额度</p>
                        <p className="text-2xl font-bold mt-1 mobile-num">¥{stats.available_quota?.toLocaleString() || '0'}</p>
                      </CardContent>
                    </Card>
                    <Card className="mobile-compact-card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                      <CardContent className="pt-4">
                        <p className="text-sm opacity-80 mobile-label">已分配</p>
                        <p className="text-2xl font-bold mt-1 mobile-num">¥{stats.used_quota?.toLocaleString() || '0'}</p>
                      </CardContent>
                    </Card>
                    <Card className="mobile-compact-card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                      <CardContent className="pt-4">
                        <p className="text-sm opacity-80 mobile-label">服务商数</p>
                        <p className="text-2xl font-bold mt-1 mobile-num">{providers.length}</p>
                      </CardContent>
                    </Card>
                  </div>
                  {/* 额度使用进度 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">额度使用进度</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>已分配 / 总额度</span>
                            <span>¥{(stats.used_quota || 0).toLocaleString()} / ¥{(stats.total_quota || 0).toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-purple-600 h-2.5 rounded-full transition-all"
                              style={{ width: `${stats.total_quota ? Math.min(((stats.used_quota || 0) / stats.total_quota) * 100, 100) : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {/* 服务商额度分布 */}
                  {providers.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">服务商额度分布</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {providers.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{p.username || p.name || '服务商'}</p>
                                <p className="text-sm text-gray-500">可用: ¥{(p.available_quota || p.quota || 0).toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">¥{(p.quota || 0).toLocaleString()}</p>
                                <p className="text-xs text-gray-500">已用: ¥{(p.used_quota || 0).toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {/* 申请额度 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Send className="w-5 h-5 text-purple-600" />
                          向智算中心申请额度
                        </div>
                        <Button size="sm" onClick={() => setShowQuotaApplyDialog(true)} className="bg-purple-600 hover:bg-purple-700">
                          申请额度
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="text-left py-3 px-4">申请额度</th>
                              <th className="text-left py-3 px-4">批准额度</th>
                              <th className="text-left py-3 px-4">状态</th>
                              <th className="text-left py-3 px-4">申请时间</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quotaRequests.map((request, idx) => (
                              <tr key={`quota-overview-${request.id}-${idx}`} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4">¥{(parseFloat(String((request as any).requested_amount)) || 0).toLocaleString()}</td>
                                <td className="py-3 px-4 text-green-600">¥{(parseFloat(String((request as any).approved_amount)) || 0).toLocaleString()}</td>
                                <td className="py-3 px-4">
                                  <Badge className={
                                    request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    request.status === 'approved' ? 'bg-green-100 text-green-700' :
                                    'bg-red-100 text-red-700'
                                  }>
                                    {request.status === 'pending' ? '待审核' :
                                     request.status === 'approved' ? '已通过' : '已拒绝'}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-500">
                                  {request.created_at ? new Date(request.created_at).toLocaleString() : '-'}
                                </td>
                              </tr>
                            ))}
                            {quotaRequests.length === 0 && (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-gray-500">
                                  暂无申请记录
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 我的额度申请记录 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-600" />
                          我的额度申请记录
                        </div>
                        <Button size="sm" onClick={() => setShowQuotaApplyDialog(true)}>
                          <PlusCircle className="w-4 h-4 mr-1" />申请额度
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="text-left py-3 px-4">申请额度</th>
                              <th className="text-left py-3 px-4">批准额度</th>
                              <th className="text-left py-3 px-4">奖励比例</th>
                              <th className="text-left py-3 px-4">状态</th>
                              <th className="text-left py-3 px-4">申请时间</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quotaRequests.map((request, idx) => (
                              <tr key={`quota-table-${request.id}-${idx}`} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4">¥{(parseFloat(String((request as any).requested_amount)) || 0).toLocaleString()}</td>
                                <td className="py-3 px-4 text-green-600">¥{(parseFloat(String((request as any).approved_amount)) || 0).toLocaleString()}</td>
                                <td className="py-3 px-4 text-orange-600">{(request as any).bonus_rate}%</td>
                                <td className="py-3 px-4">
                                  <Badge className={
                                    request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    request.status === 'approved' ? 'bg-green-100 text-green-700' :
                                    'bg-red-100 text-red-700'
                                  }>
                                    {request.status === 'pending' ? '待审核' :
                                     request.status === 'approved' ? '已通过' : '已拒绝'}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-500">
                                  {request.created_at ? new Date(request.created_at).toLocaleString() : '-'}
                                </td>
                              </tr>
                            ))}
                            {quotaRequests.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-gray-500">
                                  暂无申请记录
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}


              {/* 子Tab: 额度分配 */}
              {quotaSubTab === 'allocations' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>额度分配记录</CardTitle>
                  <Button onClick={() => openAllocateDialog()} className="bg-blue-600">
                    <Plus className="w-4 h-4 mr-2" />分配额度
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4">服务商</th>
                        <th className="text-left py-3 px-4">分配额度</th>
                        <th className="text-left py-3 px-4">已用额度</th>
                        <th className="text-left py-3 px-4">状态</th>
                        <th className="text-left py-3 px-4">时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocations.map(allocation => (
                        <tr key={allocation.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{(allocation as any).provider_name || '-'}</td>
                          <td className="py-3 px-4 text-green-600 font-medium">
                            ¥{(parseFloat(String(allocation.quota_amount)) || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-orange-600">
                            ¥{(parseFloat(String(allocation.used_amount)) || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={
                              allocation.status === 'active' ? 'bg-green-100 text-green-700' :
                              allocation.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }>
                              {allocation.status === 'active' ? '使用中' : 
                               allocation.status === 'completed' ? '已完成' : allocation.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {allocation.created_at?.slice(0, 10)}
                          </td>
                        </tr>
                      ))}
                      {allocations.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-500">
                            暂无分配记录
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

              {/* 子Tab: 额度审批 */}
              {quotaSubTab === 'approve' && (
            <div className="space-y-3 md:space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-orange-600" />
                      服务商额度申请审批
                    </div>
                    {/* 状态筛选 */}
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant={quotaFilterStatus === 'pending' ? 'default' : 'outline'}
                        onClick={() => { setQuotaFilterStatus('pending'); }}
                      >
                        待审核
                      </Button>
                      <Button 
                        size="sm" 
                        variant={quotaFilterStatus === 'approved' ? 'default' : 'outline'}
                        onClick={() => { setQuotaFilterStatus('approved'); }}
                      >
                        已通过
                      </Button>
                      <Button 
                        size="sm" 
                        variant={quotaFilterStatus === 'rejected' ? 'default' : 'outline'}
                        onClick={() => { setQuotaFilterStatus('rejected'); }}
                      >
                        已拒绝
                      </Button>
                      <Button 
                        size="sm" 
                        variant={quotaFilterStatus === 'all' ? 'default' : 'outline'}
                        onClick={() => { setQuotaFilterStatus('all'); }}
                      >
                        全部
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {providerQuotaRequests.length > 0 ? providerQuotaRequests.map((request, idx) => (
                      <div key={`prov-quota-${request.id}-${idx}`} className="p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {request.provider?.name || request.provider?.username || request.requester_name || '服务商'} 
                              </p>
                              {/* 状态标签 */}
                              <Badge variant={
                                request.status === 'approved' ? 'default' : 
                                request.status === 'rejected' ? 'destructive' : 
                                'secondary'
                              }>
                                {request.status === 'pending' ? '待审核' : 
                                 request.status === 'approved' ? '已通过' : 
                                 request.status === 'rejected' ? '已拒绝' : request.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              申请额度: ¥{(parseFloat(String(request.requested_amount || request.amount)) || 0).toLocaleString()}
                              {request.approved_amount && request.approved_amount > 0 && (
                                <span className="ml-2 text-green-600">
                                  → 批准: ¥{parseFloat(String(request.approved_amount)).toLocaleString()}
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              申请时间: {request.created_at ? new Date(request.created_at).toLocaleString() : '-'}
                            </p>
                            {request.reject_reason && (
                              <p className="text-xs text-red-500 mt-1">拒绝原因: {request.reject_reason}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {request.status === 'pending' && (
                              <>
                                <Button 
                                  size="sm" 
                                  className="bg-green-600"
                                  onClick={() => {
                                    const approved = prompt('请输入批准金额:', request.requested_amount?.toString());
                                    if (approved && parseFloat(approved) > 0) {
                                      handleApproveProviderQuota(request.id, 'approve', parseFloat(approved));
                                    }
                                  }}
                                  disabled={submitting}
                                >
                                  通过
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => handleApproveProviderQuota(request.id, 'reject')}
                                  disabled={submitting}
                                >
                                  拒绝
                                </Button>
                              </>
                            )}
                            {request.status !== 'pending' && (
                              <span className="text-sm text-gray-400">
                                {request.status === 'approved' ? '已发放额度' : '已拒绝'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="py-8 text-center text-gray-500">
                        暂无{quotaFilterStatus === 'all' ? '' : quotaFilterStatus === 'pending' ? '待审核' : quotaFilterStatus === 'approved' ? '已通过' : '已拒绝'}的服务商额度申请
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
            </div>
          )}

          {/* 服务商管理 */}
          {activeTab === 'providers' && (
            <Card>
              <CardHeader>
                <CardTitle>服务商列表</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4">服务商</th>
                        <th className="text-left py-3 px-4">Token值</th>
                        <th className="text-left py-3 px-4">收益</th>
                        <th className="text-left py-3 px-4">已生成产品额度</th>
                        <th className="text-left py-3 px-4">闲置额度</th>
                        <th className="text-left py-3 px-4">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {providers.map(provider => (
                        <>
                          <tr key={provider.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{provider.username}</td>
                            <td className="py-3 px-4 text-orange-600">{(provider.quota || 0).toLocaleString()}</td>
                            <td className="py-3 px-4 text-green-600">¥{(provider.balance || 0).toLocaleString()}</td>
                            <td className="py-3 px-4 text-blue-600">{(provider.used_quota || 0).toLocaleString()}</td>
                            <td className="py-3 px-4 text-purple-600">{(provider.available_quota || 0).toLocaleString()}</td>
                            <td className="py-3 px-4 flex gap-2">
                              <Button
                                size="sm"
                                className="bg-blue-600"
                                onClick={() => {
                                  setSelectedProvider(provider.id);
                                  openAllocateDialog();
                                }}
                              >
                                <Send className="w-4 h-4 mr-1" />分配额度
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (expandedProvider === provider.id) {
                                    setExpandedProvider(null);
                                  } else {
                                    setExpandedProvider(provider.id);
                                    loadProviderDetails(provider.id);
                                  }
                                }}
                              >
                                {expandedProvider === provider.id ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                                {expandedProvider === provider.id ? '收起' : '详情'}
                              </Button>
                            </td>
                          </tr>
                          {/* 展开的服务商详情 */}
                          {expandedProvider === provider.id && (
                            <tr key={`${provider.id}-detail`}>
                              <td colSpan={6} className="p-0">
                                <div className="bg-gray-50 p-4 border-b">
                                  {/* 子Tab */}
                                  <div className="flex gap-2 mb-4">
                                    <Button
                                      size="sm"
                                      variant={providerDetailTab === 'products' ? 'default' : 'outline'}
                                      onClick={() => setProviderDetailTab('products')}
                                    >
                                      <Package className="w-3 h-3 mr-1" />产品信息
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={providerDetailTab === 'release' ? 'default' : 'outline'}
                                      onClick={() => { setProviderDetailTab('release'); loadProviderExpired(provider.id); }}
                                    >
                                      <Zap className="w-3 h-3 mr-1" />到期释放
                                    </Button>
                                  </div>

                                  {/* 产品信息 */}
                                  {providerDetailTab === 'products' && (
                                    providerDetailLoading ? (
                                      <div className="text-center py-4 text-gray-400">加载中...</div>
                                    ) : providerProducts.length === 0 ? (
                                      <div className="text-center py-4 text-gray-400">暂无产品</div>
                                    ) : (
                                      <>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                          <div className="bg-white rounded-lg p-2 border text-center">
                                            <div className="text-xs text-gray-500">产品总数</div>
                                            <div className="text-lg font-bold text-purple-700">{providerProducts.length}</div>
                                          </div>
                                          <div className="bg-white rounded-lg p-2 border text-center">
                                            <div className="text-xs text-gray-500">在售</div>
                                            <div className="text-lg font-bold text-green-700">{providerProducts.filter((p: any) => p.status === 'available').length}</div>
                                          </div>
                                          <div className="bg-white rounded-lg p-2 border text-center">
                                            <div className="text-xs text-gray-500">已售</div>
                                            <div className="text-lg font-bold text-blue-700">{providerProducts.filter((p: any) => p.status === 'sold').length}</div>
                                          </div>
                                          <div className="bg-white rounded-lg p-2 border text-center">
                                            <div className="text-xs text-gray-500">产品总值</div>
                                            <div className="text-lg font-bold text-orange-700">¥{providerProducts.reduce((s: number, p: any) => s + Number(p.price || 0), 0).toLocaleString()}</div>
                                          </div>
                                        </div>
                                        <table className="w-full text-sm bg-white rounded border">
                                          <thead>
                                            <tr className="border-b bg-gray-50">
                                              <th className="text-left py-2 px-3">编号</th>
                                              <th className="text-left py-2 px-3">名称</th>
                                              <th className="text-left py-2 px-3">价格</th>
                                              <th className="text-left py-2 px-3">周期</th>
                                              <th className="text-left py-2 px-3">收益率</th>
                                              <th className="text-left py-2 px-3">状态</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {providerProducts.map((p: any) => (
                                              <tr key={p.id} className="border-b hover:bg-gray-50">
                                                <td className="py-2 px-3 font-mono text-xs">{p.code || '-'}</td>
                                                <td className="py-2 px-3">{p.name || '-'}</td>
                                                <td className="py-2 px-3 font-semibold">¥{Number(p.price || 0).toLocaleString()}</td>
                                                <td className="py-2 px-3">{p.period}天</td>
                                                <td className="py-2 px-3">{p.total_rate}%</td>
                                                <td className="py-2 px-3">
                                                  <Badge className={
                                                    p.status === 'available' ? 'bg-green-100 text-green-700' :
                                                    p.status === 'sold' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-700'
                                                  }>
                                                    {p.status === 'available' ? '在售' : p.status === 'sold' ? '已售' : p.status}
                                                  </Badge>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </>
                                    )
                                  )}

                                  {/* 到期释放 */}
                                  {providerDetailTab === 'release' && (
                                    <>
                                      {/* 释放规则说明 */}
                                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                                        <p className="text-sm text-amber-700">产品到期后，网点点击<b>解锁</b>即释放收益到账。按产品价值<b>5%</b>分配：会员2% | 服务商2% | 直推0.25% | 上级服务商0.25% | 网点0.1% | 公司0.4%。解锁后会员可卖出。</p>
                                      </div>
                                      {providerExpiredLoading ? (
                                        <div className="text-center py-4 text-gray-400">加载中...</div>
                                      ) : providerExpiredProducts.length === 0 ? (
                                        <div className="text-center py-4 text-gray-400">暂无到期产品</div>
                                      ) : (
                                        <>
                                          {/* 批量操作栏 */}
                                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                                            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={providerExpiredProducts.length > 0 && providerExpiredProducts.every((p: any) => selectedExpiredIds.has(p.id))}
                                                onChange={(e) => {
                                                  const newSet = new Set<string>();
                                                  if (e.target.checked) {
                                                    providerExpiredProducts.forEach((p: any) => newSet.add(p.id));
                                                  }
                                                  setSelectedExpiredIds(newSet);
                                                }}
                                                className="w-4 h-4"
                                              />
                                              全选
                                            </label>
                                            <span className="text-sm text-gray-500">已选 {selectedExpiredIds.size} 个</span>
                                            <Button
                                              size="sm"
                                              className="bg-amber-500 hover:bg-amber-600 text-white"
                                              onClick={() => handleBatchUnlock(provider.id)}
                                              disabled={selectedExpiredIds.size === 0 || releaseAllLoading}
                                            >
                                              {releaseAllLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
                                              批量解锁释放({selectedExpiredIds.size})
                                            </Button>
                                            <Button
                                              size="sm"
                                              className="bg-green-600 hover:bg-green-700 text-white"
                                              onClick={() => handleBatchSell(provider.id)}
                                              disabled={selectedExpiredIds.size === 0 || releaseAllLoading}
                                            >
                                              <ShoppingCart className="w-3 h-3 mr-1" />
                                              批量卖出({selectedExpiredIds.size})
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => loadProviderExpired(provider.id)}>
                                              <RefreshCw className="w-3 h-3 mr-1" />刷新
                                            </Button>
                                          </div>
                                          {/* 产品列表 */}
                                          <div className="space-y-2">
                                            {providerExpiredProducts.map((p: any) => {
                                              const price = Number(p.purchasePrice || p.productPrice || 0);
                                              const total5pct = p.revenue5pct || price * 0.05;
                                              const memberShare = p.memberShare || price * 0.02;
                                              const provShare = p.providerShare || price * 0.02;
                                              const isUnlocked = p.revenueReleased === true;
                                              const isSold = p.status === 'sold';
                                              const isSelected = selectedExpiredIds.has(p.id);
                                              return (
                                                <div key={p.id} className={`border rounded-lg p-3 ${isSelected ? 'border-amber-400 bg-amber-50' : 'bg-white'} ${isSold ? 'opacity-60' : ''}`}>
                                                  <div className="flex items-start gap-3">
                                                    {/* 选择框 */}
                                                    <input
                                                      type="checkbox"
                                                      checked={isSelected}
                                                      onChange={(e) => {
                                                        const newSet = new Set(selectedExpiredIds);
                                                        if (e.target.checked) newSet.add(p.id);
                                                        else newSet.delete(p.id);
                                                        setSelectedExpiredIds(newSet);
                                                      }}
                                                      disabled={isSold}
                                                      className="w-4 h-4 mt-1"
                                                    />
                                                    {/* 产品信息 */}
                                                    <div className="flex-1 min-w-0">
                                                      <div className="flex items-center gap-2 mb-1.5">
                                                        <span className="font-medium">{p.productName || '-'}</span>
                                                        <span className="font-mono text-xs text-gray-400">{p.productCode || '-'}</span>
                                                        {isSold ? (
                                                          <Badge className="bg-gray-100 text-gray-500 text-xs">已卖出</Badge>
                                                        ) : isUnlocked ? (
                                                          <Badge className="bg-green-100 text-green-700 text-xs">已解锁</Badge>
                                                        ) : (
                                                          <Badge className="bg-red-100 text-red-600 text-xs">待解锁</Badge>
                                                        )}
                                                      </div>
                                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-sm">
                                                        <div><span className="text-gray-400">价格：</span><span className="font-semibold">¥{price.toLocaleString()}</span></div>
                                                        <div><span className="text-gray-400">周期：</span>{p.period}天</div>
                                                        <div><span className="text-gray-400">到期：</span><span className="text-red-500 text-xs">{p.expireDate?.substring(0, 16)?.replace('T', ' ')}</span></div>
                                                        <div><span className="text-gray-400">持有人：</span>{p.holderName || '-'}{p.holderUniqueId ? ` [${p.holderUniqueId}]` : ''}</div>
                                                        <div><span className="text-gray-400">5%智算金：</span><span className="text-amber-600 font-semibold">¥{total5pct.toFixed(2)}</span></div>
                                                        <div><span className="text-gray-400">会员2%：</span><span className="text-blue-600">¥{memberShare.toFixed(2)}</span></div>
                                                        <div><span className="text-gray-400">服务商2%：</span><span className="text-purple-600">¥{provShare.toFixed(2)}</span></div>
                                                        <div><span className="text-gray-400">手机号：</span>{p.holderPhone || '-'}</div>
                                                      </div>
                                                    </div>
                                                    {/* 操作按钮 */}
                                                    <div className="flex flex-col gap-1.5 shrink-0">
                                                      {!isUnlocked && !isSold && (
                                                        <Button
                                                          size="sm"
                                                          onClick={() => handleReleaseOne(p.id, p.providerId || provider.id)}
                                                          disabled={releasingIds.has(p.id)}
                                                          className="bg-amber-500 hover:bg-amber-600 text-white text-xs"
                                                        >
                                                          {releasingIds.has(p.id) ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <LockOpen className="w-3 h-3 mr-1" />}
                                                          解锁释放
                                                        </Button>
                                                      )}
                                                      {isUnlocked && !isSold && (
                                                        <Button
                                                          size="sm"
                                                          onClick={() => handleForceSellOne(p.id)}
                                                          disabled={sellingIds.has(p.id)}
                                                          className="bg-green-600 hover:bg-green-700 text-white text-xs"
                                                        >
                                                          {sellingIds.has(p.id) ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ShoppingCart className="w-3 h-3 mr-1" />}
                                                          卖出
                                                        </Button>
                                                      )}
                                                      {isSold && (
                                                        <span className="text-xs text-gray-400 text-center">已完成</span>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                      {providers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-500">
                            暂无服务商
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 审核申请 */}
          {activeTab === 'applications' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>服务商申请审核</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700">
                      一代待审: {applications.filter(a => a.status === 'pending' && a.apply_type === 'first_gen').length}个
                    </Badge>
                    <Badge className="bg-amber-100 text-amber-700">
                      二代待终审: {applications.filter(a => a.status === 'provider_approved').length}个
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>暂无待审核的申请</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.map((app, idx) => (
                      <div key={`app-${app.id}-${idx}`} className="p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{app.applicant_name || app.real_name || '申请人'}</h4>
                              <Badge className={
                                app.apply_type === 'first_gen' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                              }>
                                {app.apply_type === 'first_gen' ? '第一代申请' : '第二代申请'}
                              </Badge>
                              {app.status === 'provider_approved' && (
                                <Badge className="bg-amber-100 text-amber-700">
                                  上级已审核-待终审
                                </Badge>
                              )}
                              {app.status === 'pending' && (
                                <Badge className="bg-gray-100 text-gray-700">
                                  待审核
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="text-gray-400">用户名：</span>
                                {app.username || '-'}
                              </div>
                              <div>
                                <span className="text-gray-400">手机号：</span>
                                {app.phone || app.user_phone || '-'}
                              </div>
                              <div>
                                <span className="text-gray-400">申请额度：</span>
                                <span className="text-green-600 font-medium">¥{(parseFloat(String(app.quota_request || app.quota_approved || 0)) || 0).toLocaleString()}</span>
                              </div>
                              {app.status === 'provider_approved' && (app.quota_approved || 0) > 0 && (
                                <div>
                                  <span className="text-gray-400">上级已批额度：</span>
                                  <span className="text-amber-600 font-medium">¥{parseFloat(String(app.quota_approved || 0)).toLocaleString()}</span>
                                </div>
                              )}
                              {app.parent_provider_name && (
                                <div>
                                  <span className="text-gray-400">上级服务商：</span>
                                  {app.parent_provider_name}
                                </div>
                              )}
                            </div>
                            <div className="mt-2 text-xs text-gray-400">
                              申请时间: {app.created_at ? new Date(app.created_at).toLocaleString() : '-'}
                            </div>
                            {app.status === 'provider_approved' && (
                              <div className="mt-1 text-xs text-amber-600">
                                上级服务商已同意拆分 {app.quota_approved || 0} 额度，请确认线下合同签署后通过
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleReviewApplication(app.id, 'approve')}
                              disabled={submitting}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />通过
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                const reason = prompt('请输入拒绝原因:');
                                if (reason) {
                                  handleReviewApplication(app.id, 'reject');
                                }
                              }}
                              disabled={submitting}
                            >
                              <XCircle className="w-4 h-4 mr-1" />拒绝
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}



          {/* 提现审核 Tab */}
          {activeTab === 'withdraw-review' && (
            <div className="space-y-3 md:space-y-6">
              {/* 待审核 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5" />
                    待审核提现
                    <Badge className="bg-orange-500 ml-2">{pendingWithdrawals.filter((w: any) => w.status === 'pending').length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingWithdrawals.filter((w: any) => w.status === 'pending').length > 0 ? (
                    <div className="space-y-4">
                      {pendingWithdrawals.filter((w: any) => w.status === 'pending').map((w: any) => (
                        <div key={w.id} className="border rounded-lg p-4 bg-orange-50">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-medium">{w.username || w.real_name || '用户'}</p>
                              <p className="text-sm text-gray-500">角色: {w.user_role === 'member' ? '会员' : w.user_role === 'provider' ? '服务商' : w.user_role}</p>
                              <p className="text-sm text-gray-500">手机: {w.phone || '-'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-orange-600">¥{Number(w.amount).toLocaleString()}</p>
                              <p className="text-xs text-gray-500">手续费: ¥{Number(w.fee).toLocaleString()} | 到账: ¥{Number(w.actual_amount).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                            <div className="text-gray-600"><span className="font-medium">支付宝:</span> {w.alipay_account || '-'}</div>
                            <div className="text-gray-600"><span className="font-medium">姓名:</span> {w.real_name || '-'}</div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setReviewingWithdraw(w)} disabled={submitting}>
                              <CheckCircle className="w-4 h-4 mr-1" /> 审核通过
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleReviewWithdrawal(w.id, 'reject')} disabled={submitting}>
                              <XCircle className="w-4 h-4 mr-1" /> 拒绝
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">暂无待审核的提现申请</p>
                  )}
                </CardContent>
              </Card>

              {/* 审核记录 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    审核记录
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingWithdrawals.filter((w: any) => w.status !== 'pending').length > 0 ? (
                    <div className="space-y-3">
                      {pendingWithdrawals.filter((w: any) => w.status !== 'pending').map((w: any) => (
                        <div key={w.id} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-sm">{w.username || w.real_name || '用户'} <span className="text-gray-400 text-xs">({w.user_role === 'member' ? '会员' : w.user_role === 'provider' ? '服务商' : w.user_role})</span></p>
                              <p className="text-xs text-gray-500">{new Date(w.reviewed_at || w.updated_at).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold">¥{Number(w.amount).toLocaleString()}</span>
                              <Badge className={w.status === 'completed' ? 'bg-green-500' : w.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'}>
                                {w.status === 'completed' ? '已完成' : w.status === 'rejected' ? '已拒绝' : w.status === 'pending' ? '待审核付款' : w.status}
                              </Badge>
                            </div>
                          </div>
                          {w.reject_reason && <p className="text-xs text-red-500 mt-1">拒绝原因: {w.reject_reason}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">暂无审核记录</p>
                  )}
                </CardContent>
              </Card>

              {/* 我的提现记录（网点向总台提现） */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    我的提现记录
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {branchWithdrawRecords.length > 0 ? (
                    <div className="space-y-3">
                      {branchWithdrawRecords.map((w: any) => (
                        <div key={w.id} className="flex items-center justify-between border rounded-lg p-3 bg-gray-50">
                          <div>
                            <p className="font-medium">¥{Number(w.amount).toLocaleString()}</p>
                            <p className="text-xs text-gray-500">手续费: ¥{Number(w.fee).toLocaleString()} | 到账: ¥{Number(w.actual_amount).toLocaleString()}</p>
                            {w.alipay_account && (
                              <p className="text-xs text-gray-400">支付宝: {w.alipay_account} | {w.real_name}</p>
                            )}
                            <p className="text-xs text-gray-400">{new Date(w.created_at).toLocaleString()}</p>
                            {w.reject_reason && <p className="text-xs text-red-500 mt-1">拒绝原因: {w.reject_reason}</p>}
                          </div>
                          <Badge className={w.status === 'completed' ? 'bg-green-500' : w.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'}>
                            {w.status === 'completed' ? '已完成' : w.status === 'rejected' ? '已拒绝' : '待审核付款'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">暂无提现记录</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* 收益管理 Tab */}
          {activeTab === 'revenue' && (
            <div className="space-y-3 md:space-y-6">
              {/* 智算金卡片 - 与会员端一致 */}
              <Card className="bg-gradient-to-br from-purple-500 to-purple-700 text-white">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-5 h-5" />
                    <span className="opacity-80 text-sm">智算金</span>
                  </div>
                  <p className="text-3xl font-bold">¥{Number(user?.energy_value || 0).toLocaleString()}</p>
                  <p className="text-xs opacity-70 mt-1">可提现/转积分</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="h-8 text-xs bg-white text-purple-700 hover:bg-purple-50 border-0 font-bold shadow-sm"
                      onClick={() => setShowConvertToEnergyDialog(true)}>
                      <Repeat className="w-3.5 h-3.5 mr-1" />转积分
                    </Button>
                    <Button size="sm" className="h-8 text-xs bg-white text-purple-700 hover:bg-purple-50 border-0 font-bold shadow-sm"
                      onClick={() => setShowTransferDialog(true)}>
                      <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />互转
                    </Button>
                    <Button size="sm" className="h-8 text-xs bg-white text-purple-700 hover:bg-purple-50 border-0 font-bold shadow-sm"
                      onClick={() => setShowBranchWithdrawDialog(true)}>
                      <Wallet className="w-3.5 h-3.5 mr-1" />提现
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 积分卡片 */}
              <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Gift className="w-5 h-5" />
                    <span className="opacity-80 text-sm">我的积分</span>
                  </div>
                  <p className="text-3xl font-bold">{Number(user?.points || 0).toLocaleString()}</p>
                  <p className="text-xs opacity-70 mt-1">积分可兑换商品</p>
                  <div className="mt-3">
                    <Button size="sm" className="h-8 text-xs bg-white text-amber-700 hover:bg-amber-50 border-0 font-bold shadow-sm"
                      onClick={async () => {
                        setShowPointsShop(true);
                        setPointsShopLoading(true);
                        try {
                          const res = await fetch('/api/points-products?status=active');
                          const data = await res.json();
                          if (data.success) setPointsShopProducts(data.data || []);
                        } catch (e) { console.error(e); }
                        setPointsShopLoading(false);
                      }}>
                      <Gift className="w-3.5 h-3.5 mr-1" />积分兑换
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 收益统计卡片 */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5" />
                      <span className="text-sm opacity-80">智算金余额</span>
                    </div>
                    <p className="text-2xl font-bold">¥{Number(user?.energy_value || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5" />
                      <span className="text-sm opacity-80">总收益</span>
                    </div>
                    <p className="text-2xl font-bold">¥{Number(branchRevenueStats.totalRevenue || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5" />
                      <span className="text-sm opacity-80">市场费分润(0.1%)</span>
                    </div>
                    <p className="text-2xl font-bold">¥{Number(branchRevenueStats.marketFeeShare || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-5 h-5" />
                      <span className="text-sm opacity-80">上级份额归网点(0.25%)</span>
                    </div>
                    <p className="text-2xl font-bold">¥{Number(branchRevenueStats.providerUpstream || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5" />
                      <span className="text-sm opacity-80">提现手续费</span>
                    </div>
                    <p className="text-2xl font-bold">¥{Number(branchRevenueStats.memberWithdraw || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>

              {/* 操作区 */}
              <Card>
                <CardHeader>
                  <CardTitle>5%市场费分配规则</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center text-sm">
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg">
                      <div className="text-xs text-muted-foreground">会员</div>
                      <div className="text-lg font-bold text-blue-600">2%</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/30 p-2 rounded-lg">
                      <div className="text-xs text-muted-foreground">服务商</div>
                      <div className="text-lg font-bold text-green-600">2%</div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/30 p-2 rounded-lg">
                      <div className="text-xs text-muted-foreground">直推</div>
                      <div className="text-lg font-bold text-orange-600">0.25%</div>
                    </div>
                    <div className="bg-pink-50 dark:bg-pink-900/30 p-2 rounded-lg">
                      <div className="text-xs text-muted-foreground">上级服务商</div>
                      <div className="text-lg font-bold text-pink-600">0.25%</div>
                    </div>
                    <div className="bg-cyan-50 dark:bg-cyan-900/30 p-2 rounded-lg">
                      <div className="text-xs text-muted-foreground">网点</div>
                      <div className="text-lg font-bold text-cyan-600">0.1%</div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/30 p-2 rounded-lg">
                      <div className="text-xs text-muted-foreground">公司运营</div>
                      <div className="text-lg font-bold text-amber-600">0.4%</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                    <p>* 网点获得市场费0.1%分成 + 无上级服务商时0.25%归网点</p>
                  </div>
                </CardContent>
              </Card>

              {/* 操作区 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="w-5 h-5" />
                    收益操作
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">可提现余额</p>
                      <p className="text-2xl font-bold text-green-600">¥{Number(user?.energy_value || 0).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      {/* 收益转收益按钮已禁用 */}
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => setShowBranchWithdrawDialog(true)}
                      >
                        <Banknote className="w-4 h-4 mr-1" /> 提现到智算中心
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 收益记录列表 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    收益记录
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {branchRevenueRecords.length > 0 ? (
                    <div className="space-y-2">
                      {branchRevenueRecords.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between border rounded-lg p-3 hover:bg-gray-50">
                          <div>
                            <p className="font-medium text-green-600">+¥{Number(r.amount).toLocaleString()}</p>
                            <p className="text-xs text-gray-500">
                              {r.type === 'member_withdraw' ? '会员提现' : 
                               r.type === 'provider_withdraw' ? '服务商提现' :
                               r.type === 'market_fee_share' ? '市场费分润' :
                               r.type === 'provider_upstream' ? '无上级服务商分成(归网点)' :
                               r.type === 'withdraw_income' ? '提现收入' : r.type}
                            </p>
                            {r.product_id && (
                              <p className="text-xs text-gray-400">产品ID: {r.product_id?.substring(0,8)}...</p>
                            )}
                            <p className="text-xs text-gray-400">{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</p>
                          </div>
                          <Badge className={r.status === 'received' ? 'bg-blue-100 text-blue-700' : r.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {r.status === 'received' ? '已入账' : r.status === 'paid' ? '已支出' : r.status === 'completed' ? '已完成' : r.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">暂无收益记录</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* 会员管理 */}
          {activeTab === 'members' && (
            <div className="space-y-3 md:space-y-6">
              {/* 统计卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5" />
                      <span className="text-sm opacity-80">会员总数</span>
                    </div>
                    <p className="text-2xl font-bold">{memberTotal}</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-5 h-5" />
                      <span className="text-sm opacity-80">持有Token额度</span>
                    </div>
                    <p className="text-2xl font-bold">¥{memberList.reduce((sum: number, m: any) => sum + (m.totalInvestment || 0), 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>

              {/* 筛选栏 */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-gray-500">按服务商筛选:</Label>
                      <select
                        className="border rounded-md px-3 py-1.5 text-sm bg-white"
                        value={memberFilterProvider}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMemberFilterProvider(val);
                          loadMemberList(1, val);
                        }}
                      >
                        <option value="all">全部服务商</option>
                        {providers.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.username}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-gray-500">搜索:</Label>
                      <Input
                        className="w-48"
                        placeholder="姓名/ID/手机号"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                      />
                    </div>
                    <Button size="sm" variant="outline" onClick={() => loadMemberList(memberPage)}>
                      <RefreshCw className="w-4 h-4 mr-1" />刷新
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 会员列表 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      会员列表 ({memberTotal})
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {memberLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                      <span className="ml-2 text-gray-500">加载中...</span>
                    </div>
                  ) : (() => {
                    const filteredMembers = memberList.filter((m: any) => {
                      if (!memberSearch) return true;
                      const s = memberSearch.toLowerCase();
                      return (
                        (m.username || '').toLowerCase().includes(s) ||
                        (m.realName || '').toLowerCase().includes(s) ||
                        (m.uniqueId || '').toLowerCase().includes(s) ||
                        (m.phone || '').includes(s)
                      );
                    });

                    return filteredMembers.length === 0 ? (
                      <div className="py-12 text-center text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>暂无会员数据</p>
                      </div>
                    ) : (
                      <>
                        {/* 表头 */}
                        <div className="hidden md:grid grid-cols-[1.5fr_1fr_1.5fr_1.5fr_1.5fr_1fr_1.5fr_1.5fr] gap-2 text-sm font-medium text-gray-500 pb-2 border-b">
                          <div>姓名</div>
                          <div>专属ID</div>
                          <div>手机号</div>
                          <div>隶属服务商</div>
                          <div>推荐人</div>
                          <div>收益</div>
                          <div>持有Token额度</div>
                          <div>操作</div>
                        </div>

                        {/* 会员行 */}
                        <div className="space-y-1">
                          {filteredMembers.map((m: any) => (
                            <div key={m.id} className={`grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1.5fr_1.5fr_1.5fr_1fr_1.5fr_1.5fr] gap-2 py-3 border-b last:border-b-0 items-center hover:bg-gray-50 rounded px-1 ${m.buyLocked ? 'bg-red-50' : ''}`}>
                              {/* 姓名 */}
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-medium">{m.realName || m.username || '-'}</p>
                                  {m.buyLocked && (
                                    <Badge className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0">已锁定</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 md:hidden">手机: {m.phone || '-'}</p>
                              </div>
                              {/* 专属ID */}
                              <div>
                                <span className="font-mono text-sm text-purple-600">{m.uniqueId || '-'}</span>
                              </div>
                              {/* 手机号 */}
                              <div className="hidden md:block">
                                <span className="text-sm">{m.phone || '-'}</span>
                              </div>
                              {/* 隶属服务商 */}
                              <div className="hidden md:block">
                                <Badge className="bg-blue-100 text-blue-700">{m.providerName || '-'}</Badge>
                              </div>
                              {/* 推荐人 */}
                              <div className="hidden md:block">
                                <span className="text-sm text-gray-700">{m.inviterName || '-'}</span>
                              </div>
                              {/* 收益 */}
                              <div className="hidden md:block">
                                <span className="text-sm font-medium text-emerald-600">{(m.balance || 0).toLocaleString()}</span>
                              </div>
                              {/* 持有Token额度 */}
                              <div className="hidden md:block">
                                <div>
                                  <span className="text-sm font-semibold text-orange-600">¥{(m.totalInvestment || 0).toLocaleString()}</span>
                                  <span className="text-xs text-gray-400 ml-1">({m.holdingProducts || 0}个产品)</span>
                                </div>
                              </div>
                              {/* 操作 */}
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 text-orange-600 border-orange-200 hover:bg-orange-50"
                                  onClick={() => openMemberTransfer(m)}
                                >
                                  <ArrowRightLeft className="w-3 h-3 mr-0.5" />转移
                                </Button>
                                <Button
                                  size="sm"
                                  variant={m.buyLocked ? "outline" : "destructive"}
                                  className="text-xs h-7"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch('/api/member/buy-lock', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userId: m.id, locked: !m.buyLocked })
                                      });
                                      const data = await res.json();
                                      if (data.success) {
                                        // 更新本地状态
                                        setMemberList((prev: any[]) => prev.map((item: any) => item.id === m.id ? { ...item, buyLocked: !item.buyLocked } : item));
                                      } else {
                                        alert(data.message || '操作失败');
                                      }
                                    } catch {
                                      alert('操作失败');
                                    }
                                  }}
                                >
                                  {m.buyLocked ? '解锁' : '锁定'}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* 分页 */}
                        {memberTotalPages > 1 && (
                          <div className="flex items-center justify-between mt-4 pt-3 border-t">
                            <span className="text-sm text-gray-500">共 {memberTotal} 个会员，第 {memberPage}/{memberTotalPages} 页</span>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={memberPage <= 1}
                                onClick={() => loadMemberList(memberPage - 1)}
                              >
                                上一页
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={memberPage >= memberTotalPages}
                                onClick={() => loadMemberList(memberPage + 1)}
                              >
                                下一页
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'capitalFlow' && (
            <div className="space-y-4">
              {/* 统计卡片 */}
              <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                  <div className="text-xs text-gray-500">充值总额</div>
                  <div className="text-lg font-bold text-blue-600">{Number(capitalFlowData?.stats?.total_recharge || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                  <div className="text-xs text-gray-500">转入总额</div>
                  <div className="text-lg font-bold text-green-600">{Number(capitalFlowData?.stats?.total_transfer_in || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                  <div className="text-xs text-gray-500">转出总额</div>
                  <div className="text-lg font-bold text-orange-600">{Number(capitalFlowData?.stats?.total_transfer_out || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                  <div className="text-xs text-gray-500">转积分总额</div>
                  <div className="text-lg font-bold text-purple-600">{Number(capitalFlowData?.stats?.total_to_points || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                  <div className="text-xs text-gray-500">提现总额</div>
                  <div className="text-lg font-bold text-red-600">{Number(capitalFlowData?.stats?.total_withdraw || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                  <div className="text-xs text-gray-500">提现收入</div>
                  <div className="text-lg font-bold text-green-600">{Number(capitalFlowData?.stats?.total_withdraw_income || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                  <div className="text-xs text-gray-500">卖出收益</div>
                  <div className="text-lg font-bold text-emerald-600">{Number(capitalFlowData?.stats?.total_sell_profit || 0).toLocaleString()}</div>
                </div>
              </div>

              {/* 筛选 */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: 'all', label: '全部' },
                  { key: 'recharge', label: '充值' },
                  { key: 'transfer_in', label: '转入' },
                  { key: 'transfer_out', label: '转出' },
                  { key: 'energy_to_points', label: '转积分' },
                  { key: 'withdraw', label: '提现' },
                  { key: 'withdraw_income', label: '提现收入' },
                  { key: 'sell_profit', label: '收益' },
                ].map(ft => (
                  <button key={ft.key}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${capitalFlowTab === ft.key ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    onClick={() => setCapitalFlowTab(ft.key)}
                  >{ft.label}</button>
                ))}
              </div>

              {/* 流水列表 */}
              {capitalFlowLoading ? (
                <div className="text-center py-8 text-gray-400">加载中...</div>
              ) : capitalFlowData?.records?.length > 0 ? (
                <div className="space-y-2">
                  {capitalFlowData.records.map((r: any) => (
                    <div key={r.id} className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          r.flowType === 'recharge' ? 'bg-blue-500' :
                          r.flowType === 'transfer_out' ? 'bg-orange-500' :
                          r.flowType === 'transfer_in' ? 'bg-green-500' :
                          r.flowType === 'energy_to_points' ? 'bg-purple-500' :
                          r.flowType === 'withdraw' ? 'bg-red-500' :
                          r.flowType === 'withdraw_income' ? 'bg-emerald-500' :
                          r.flowType === 'sell_profit' ? 'bg-teal-500' : 'bg-gray-500'
                        }`}>
                          {r.flowType === 'recharge' ? '充' : r.flowType === 'transfer_out' ? '出' : r.flowType === 'transfer_in' ? '入' : r.flowType === 'energy_to_points' ? '积' : r.flowType === 'withdraw_income' ? '收' : r.flowType === 'sell_profit' ? '益' : '提'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{r.flowTypeLabel}</div>
                          <div className="text-xs text-gray-400">
                            {r.createdAt?.substring(0, 16)?.replace('T', ' ')}
                            {r.relatedUserName && ` · ${r.relatedUserName}`}
                            {r.note && ` · ${r.note}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${
                          (r.flowType === 'transfer_in' || r.flowType === 'withdraw_income' || r.flowType === 'sell_profit' || r.flowType === 'recharge') ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {(r.flowType === 'transfer_in' || r.flowType === 'withdraw_income' || r.flowType === 'sell_profit' || r.flowType === 'recharge') ? '+' : '-'}{Number(r.amount).toLocaleString()}
                        </div>
                        {Number(r.feeAmount) > 0 && (
                          <div className="text-xs text-gray-400">手续费: {Number(r.feeAmount).toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">暂无资金流水记录</div>
              )}

              {/* 分页 */}
              {capitalFlowData?.pagination && capitalFlowData.pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <button className="px-3 py-1 rounded text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                    disabled={capitalFlowPage <= 1}
                    onClick={() => setCapitalFlowPage(p => p - 1)}>上一页</button>
                  <span className="px-3 py-1 text-sm text-gray-600">
                    {capitalFlowPage} / {capitalFlowData.pagination.totalPages}
                  </span>
                  <button className="px-3 py-1 rounded text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                    disabled={capitalFlowPage >= capitalFlowData.pagination.totalPages}
                    onClick={() => setCapitalFlowPage(p => p + 1)}>下一页</button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 智算金互转对话框 */}
      <Dialog open={showTransferDialog} onOpenChange={(open) => {
        setShowTransferDialog(open);
        if (!open) {
          setTransferSearchQuery("");
          setTransferSearchResults([]);
          setTransferSelectedUser(null);
          setTransferUserId("");
          setTransferAmount("");
          setTransferNote("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-purple-600" />
              智算金互转
            </DialogTitle>
            <DialogDescription>
              可向任意用户转账智算金，互转时5%自动转化为积分（归您），95%到账对方。最低50。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 搜索区域 */}
            <div>
              <label className="text-sm font-medium mb-2 block">搜索转账对象</label>
              <div className="flex gap-2">
                <Input
                  placeholder="输入用户名/手机号/专属ID"
                  value={transferSearchQuery}
                  onChange={(e) => setTransferSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTransferSearch()}
                />
                <Button
                  className="bg-purple-600 hover:bg-purple-700 shrink-0"
                  onClick={handleTransferSearch}
                  disabled={transferSearching}
                >
                  {transferSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* 搜索结果 */}
            {transferSearchResults.length > 0 && (
              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {transferSearchResults.map((u: any) => (
                  <div
                    key={u.id}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-purple-50 border-b last:border-b-0 ${transferSelectedUser?.id === u.id ? 'bg-purple-50 border-l-4 border-l-purple-600' : ''}`}
                    onClick={() => handleSelectTransferUser(u)}
                  >
                    <div>
                      <span className="font-medium">{u.username}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {u.uniqueId ? `[${u.uniqueId}]` : ''}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        {u.phone ? `(${u.phone})` : ''}
                      </span>
                    </div>
                    <Badge variant="outline" className={`text-xs ${
                      u.role === 'admin' ? 'border-blue-400 text-blue-600' :
                      u.role === 'branch' ? 'border-indigo-400 text-indigo-600' :
                      u.role === 'provider' ? 'border-purple-400 text-purple-600' :
                      'border-green-400 text-green-600'
                    }`}>
                      {u.role === 'admin' ? '智算中心' : u.role === 'branch' ? '服务网点' : u.role === 'provider' ? '服务商' : '会员'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* 已选对象 */}
            {transferSelectedUser && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-sm text-purple-700">
                  <strong>转账给：</strong>{transferSelectedUser.username}
                  {transferSelectedUser.uniqueId ? ` [${transferSelectedUser.uniqueId}]` : ''}
                  {transferSelectedUser.phone ? ` (${transferSelectedUser.phone})` : ''}
                </p>
              </div>
            )}

            {/* 转账金额 */}
            <div>
              <label className="text-sm font-medium mb-2 block">转账金额</label>
              <Input
                type="number"
                placeholder="请输入转账金额（最低50）"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                min="50"
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-gray-500">
                  您当前智算金: ¥{user?.energy_value?.toLocaleString() || 0}
                </p>
                {transferAmount && Number(transferAmount) >= 50 && (
                  <p className="text-xs text-purple-600">
                    对方到账: ¥{(Number(transferAmount) * 0.95).toFixed(2)} | 您获积分: {(Number(transferAmount) * 0.05).toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            {/* 备注 */}
            <div>
              <label className="text-sm font-medium mb-2 block">备注（可选）</label>
              <Input
                placeholder="如: 业务合作转账"
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
              取消
            </Button>
            <Button
              className="bg-purple-600"
              onClick={handleTransferBalance}
              disabled={submitting || !transferUserId || !transferAmount || Number(transferAmount) < 50}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
              确认转账
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 申请额度对话框 */}
      {showQuotaApplyDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[500px]">
            <CardHeader>
              <CardTitle>向智算中心申请额度</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>申请额度（元）</Label>
                <Input
                  type="number"
                  value={applyQuotaAmount}
                  onChange={(e) => setApplyQuotaAmount(e.target.value)}
                  placeholder="请输入申请额度"
                  className="mt-1"
                />
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <p className="font-medium mb-1">💡 额度说明</p>
                <p>服务网点向智算中心申请算力额度</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowQuotaApplyDialog(false)}>取消</Button>
                <Button 
                  className="bg-blue-600"
                  onClick={handleApplyQuota}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  提交申请
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}



      {/* 会员隶属关系转移对话框 */}
      {showMemberTransferDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <ArrowRightLeft className="w-5 h-5 text-orange-500" />
                会员隶属关系转移
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 被转移会员信息 */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">转移会员</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">{transferMemberInfo?.realName || transferMemberInfo?.username}</p>
                    <p className="text-xs text-gray-500">{transferMemberInfo?.uniqueId} | {transferMemberInfo?.phone}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  当前隶属: <span className="text-blue-600 font-medium">{transferMemberInfo?.providerName || '未知'}</span>
                </p>
              </div>

              {/* 目标服务商选择 */}
              <div>
                <Label className="text-gray-700">转移到服务商</Label>
                <select
                  className="w-full mt-1 p-2 border rounded-md text-sm"
                  value={transferTargetProvider}
                  onChange={(e) => {
                    setTransferTargetProvider(e.target.value);
                    setTransferPreview(null);
                  }}
                >
                  <option value="">请选择目标服务商</option>
                  {providers
                    .filter(p => p.id !== transferMemberInfo?.providerId)
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.username}</option>
                    ))
                  }
                </select>
              </div>

              {/* 转移规则说明 */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm font-medium text-amber-700 mb-1">转移规则说明</p>
                <ul className="text-xs text-amber-600 space-y-1">
                  <li>• 会员及其整条直推链将一并转移到新服务商</li>
                  <li>• 转移后会员只能购买新服务商的产品</li>
                  <li>• 推荐关系（inviter_id）不变，推荐收益仍归原推荐人</li>
                  <li>• 持有产品的会员不能被转移，必须先清空持仓</li>
                  <li>• 目标服务商必须在同一服务网点下</li>
                </ul>
              </div>

              {/* 预览结果 */}
              {transferPreview && (
                <div className={`rounded-lg p-3 ${transferPreview.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  {transferPreview.error ? (
                    <p className="text-sm text-red-600">{transferPreview.error}</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-green-700">转移预览</p>
                      <p className="text-sm text-green-600">将转移 <strong>{transferPreview.treeSize}</strong> 个会员到 <strong>{transferPreview.targetProviderName}</strong></p>
                      {transferPreview.treeUsers && transferPreview.treeUsers.length > 0 && (
                        <div className="mt-2 max-h-24 overflow-y-auto">
                          {transferPreview.treeUsers.map((u: any) => (
                            <p key={u.id} className="text-xs text-green-600">• {u.username}{u.unique_id ? ` [${u.unique_id}]` : ''}</p>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setShowMemberTransferDialog(false); setTransferPreview(null); }}>取消</Button>
                {!transferPreview ? (
                  <Button
                    className="bg-orange-500 hover:bg-orange-600"
                    onClick={previewMemberTransfer}
                    disabled={transferLoading || !transferTargetProvider}
                  >
                    {transferLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                    预览转移
                  </Button>
                ) : !transferPreview.error ? (
                  <Button
                    className="bg-red-500 hover:bg-red-600"
                    onClick={confirmMemberTransfer}
                    disabled={transferLoading}
                  >
                    {transferLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    确认转移
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 服务网点提现到智算中心对话框 */}
      {showBranchWithdrawDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-green-500" />
                智算金提现
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">当前智算金余额</p>
                <p className="text-2xl font-bold text-green-600">¥{Number(user?.energy_value || 0).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">提现金额</label>
                <Input
                  type="number"
                  placeholder="请输入提现金额（最低100）"
                  value={branchWithdrawAmount}
                  onChange={(e) => setBranchWithdrawAmount(e.target.value)}
                />
                {branchWithdrawAmount && (
                  <p className="text-sm text-gray-500 mt-1">
                    手续费5%: {(parseFloat(branchWithdrawAmount) * 0.05).toFixed(2)}元 | 实际到账: {(parseFloat(branchWithdrawAmount) * 0.95).toFixed(2)}元
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">支付宝账号</label>
                <Input
                  placeholder="请输入支付宝账号"
                  value={branchWithdrawAlipay}
                  onChange={(e) => setBranchWithdrawAlipay(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">支付宝姓名</label>
                <Input
                  placeholder="请输入支付宝实名姓名"
                  value={branchWithdrawRealName}
                  onChange={(e) => setBranchWithdrawRealName(e.target.value)}
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <p className="text-sm font-medium text-amber-800 mb-1">智算中心到账账号</p>
                <p className="text-sm text-amber-700">账号：艺元智算管理员 [HM000001]</p>
                <p className="text-xs text-amber-600 mt-1">提现审核通过后，资金将转入智算中心账号</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                <p>• 最低提现金额: ¥100</p>
                <p>• 提现手续费: 5%（沉淀到智算中心）</p>
                <p>• 提交后等待智算中心审核打款</p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowBranchWithdrawDialog(false)}>取消</Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleBranchWithdrawToCompany}
                  disabled={submitting || !branchWithdrawAmount || parseFloat(branchWithdrawAmount) < 100}
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Banknote className="w-4 h-4 mr-2" />}
                  确认提现
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 收益转积分对话框 */}
      {showConvertToEnergyDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Repeat className="w-5 h-5 text-purple-500" />
                智算金转积分
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">当前智算金余额</p>
                <p className="text-2xl font-bold text-purple-600">¥{Number(user?.energy_value || 0).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">转换金额</label>
                <Input
                  type="number"
                  placeholder="请输入转换金额（最低10）"
                  value={convertToEnergyAmount}
                  onChange={(e) => setConvertToEnergyAmount(e.target.value)}
                />
                {convertToEnergyAmount && parseFloat(convertToEnergyAmount) > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    收益: ¥{(parseFloat(convertToEnergyAmount) * 0.95).toFixed(2)} | 积分(5%): ¥{(parseFloat(convertToEnergyAmount) * 0.05).toFixed(2)}
                  </p>
                )}
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                <p>• 最低转换金额: ¥10</p>
                <p>• 转换比例: 95%转为智算金，5%转为积分</p>
                <p>• 转换后积分不可逆转回智算金</p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setShowConvertToEnergyDialog(false); setConvertToEnergyAmount(''); }}>取消</Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleConvertToEnergy}
                  disabled={submitting || !convertToEnergyAmount || parseFloat(convertToEnergyAmount) < 10}
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                  确认转换
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 审核提现确认弹窗 */}
      {reviewingWithdraw && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                审核提现确认
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-orange-700 font-medium text-sm">
                  <AlertCircle className="w-4 h-4" />
                  请先线下付款，确认到账后再通过审核
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">申请人</span>
                  <span className="font-medium">{reviewingWithdraw.username || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">角色</span>
                  <span className="font-medium">{reviewingWithdraw.user_role === 'provider' ? '服务商' : '会员'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">提现金额</span>
                  <span className="font-bold text-red-500 text-lg">¥{(reviewingWithdraw.amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">手续费(5%)</span>
                  <span className="text-muted-foreground">¥{(reviewingWithdraw.fee || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">实际到账</span>
                  <span className="font-medium text-green-600">¥{(reviewingWithdraw.actual_amount || 0).toLocaleString()}</span>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <div className="font-medium text-blue-800 text-sm">收款信息</div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-600 text-sm">支付宝账号</span>
                  <span className="font-medium text-blue-800">{reviewingWithdraw.alipay_account || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-600 text-sm">收款姓名</span>
                  <span className="font-medium text-blue-800">{reviewingWithdraw.real_name || '-'}</span>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setReviewingWithdraw(null)}>取消</Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => { handleReviewWithdrawal(reviewingWithdraw.id, 'approve'); setReviewingWithdraw(null); }}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  确认已付款，通过审核
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 积分兑换商城弹窗 */}
      <Dialog open={showPointsShop} onOpenChange={setShowPointsShop}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-500" />
              积分兑换商城
            </DialogTitle>
          </DialogHeader>
          {pointsShopLoading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : pointsShopProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>暂无可兑换商品</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pointsShopProducts.map((product: any) => (
                <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  {product.image_url && (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="pt-3">
                    <h3 className="font-semibold text-sm mb-1">{product.name}</h3>
                    {product.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-amber-600 font-bold text-sm">{product.points_price} 积分</span>
                      <Button
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                        disabled={(Number(user?.points || 0)) < product.points_price}
                        onClick={() => {
                          setExchangeProduct(product);
                          setExchangeForm({ name: '', phone: '', address: '' });
                          setShowExchangeForm(true);
                        }}
                      >
                        兑换
                      </Button>
                    </div>
                    {(Number(user?.points || 0)) < product.points_price && (
                      <p className="text-xs text-red-400 mt-1">积分不足</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 兑换表单弹窗 */}
      <Dialog open={showExchangeForm} onOpenChange={setShowExchangeForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>确认兑换 - {exchangeProduct?.name}</DialogTitle>
            <DialogDescription>
              消耗 {exchangeProduct?.points_price} 积分，当前积分：{Number(user?.points || 0).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">收货人姓名</label>
              <Input placeholder="请输入姓名" value={exchangeForm.name} onChange={e => setExchangeForm({...exchangeForm, name: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">联系电话</label>
              <Input placeholder="请输入手机号" value={exchangeForm.phone} onChange={e => setExchangeForm({...exchangeForm, phone: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">收货地址</label>
              <Input placeholder="请输入详细地址" value={exchangeForm.address} onChange={e => setExchangeForm({...exchangeForm, address: e.target.value})} />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowExchangeForm(false)}>取消</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              disabled={!exchangeForm.name || !exchangeForm.phone || !exchangeForm.address}
              onClick={async () => {
                try {
                  const res = await fetch('/api/points-exchange', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: user?.id,
                      productId: exchangeProduct.id,
                      receiverName: exchangeForm.name,
                      receiverPhone: exchangeForm.phone,
                      receiverAddress: exchangeForm.address,
                    }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    alert('兑换成功！积分已扣除');
                    setShowExchangeForm(false);
                    setShowPointsShop(false);
                  } else {
                    alert(data.message || '兑换失败');
                  }
                } catch (e: any) {
                  alert('兑换失败：' + e.message);
                }
              }}
            >
              确认兑换
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
