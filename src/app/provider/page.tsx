"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

import {
    Users,
    Zap,
    Package,
    Loader2,
    RefreshCw,
    Plus,
    Send,
    ShoppingCart,
    ShoppingBag,
    TrendingUp,
    TrendingDown,
    CheckCircle,
    XCircle,
    Eye,
    EyeOff,
    DollarSign,
    Clock,
    AlertCircle,
    ClipboardList,
    Database,
    Trash2,
    FileText,
    ArrowLeftRight,
    User,
    Star,
    LogOut,
    Network,
    ArrowRight,
    ArrowRightLeft,
    Server,
    Award,
    Lock,
    Key,
    Info,
    Gift,
    History,
    Wallet,
    ArrowUpDown,
    Cpu,
    ArrowUpRight,
    ArrowDownLeft,
    ArrowDownToLine,
    ArrowUpFromLine,
    Upload,
    UserPlus,
    Search,
    X,
    Check,
    Download,
    Calendar,
    RotateCcw,
    AlertTriangle,
    Share2,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";

interface QuotaAllocation {
    id: string;
    template_id: string;
    quota_amount: number;
    used_amount: number;
    status: string;
    created_at: string;
    product_templates?: {
        id: string;
        name: string;
        code: string;
        period: number;
        total_rate: number;
        market_rate: number;
        profit_rate: number;
    };
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
    is_listed: boolean;
    created_at: string;
    holder?: {
        user_id: string;
        username: string;
        phone: string;
        unique_id?: string;
    } | null;
}

interface Stats {
    pending_count: number;
    available_count: number;
    sold_count: number;
    total_value: number;
    pending_quota: number;
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
    note?: string;
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
    users?: {
        id: string;
        username: string;
        real_name: string;
    };
}

// 服务商提现记录子组件
function ProviderWithdrawRecords({ userId, authFetch }: { userId: string; authFetch: (url: string, options?: RequestInit) => Promise<Response> }) {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        const fetchRecords = async () => {
            try {
                const res = await authFetch(`/api/provider/withdraw?userId=${userId}`);
                const data = await res.json();
                if (data.success) {
                    setRecords(data.data || []);
                }
            } catch (err) {
                console.error("加载提现记录失败", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRecords();
    }, [userId, authFetch]);

    const handleConfirmReceipt = async (withdrawalId: string) => {
        try {
            const res = await authFetch("/api/provider/withdraw", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ withdrawalId, action: "confirm_receipt" }),
            });
            const data = await res.json();
            if (data.success) {
                setRecords(prev => prev.map(r => r.id === withdrawalId ? { ...r, status: 'completed' } : r));
            }
        } catch (err) {
            console.error("确认收款失败", err);
        }
    };

    const statusMap: Record<string, { label: string; color: string }> = {
        pending: { label: '待审核付款', color: 'bg-yellow-100 text-yellow-700' },
        approved: { label: '已完成', color: 'bg-green-100 text-green-700' },
        transferred: { label: '已完成', color: 'bg-green-100 text-green-700' },
        completed: { label: '已完成', color: 'bg-green-100 text-green-700' },
        rejected: { label: '已拒绝', color: 'bg-red-100 text-red-700' },
    };

    if (loading) return <p className="text-gray-500 text-center py-4">加载中...</p>;

    if (records.length === 0) return <p className="text-gray-500 text-center py-4">暂无提现记录</p>;

    return (
        <div className="space-y-2">
            {records.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between border rounded-lg p-3 hover:bg-gray-50">
                    <div>
                        <p className="font-medium">¥{Number(r.amount).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${statusMap[r.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                            {statusMap[r.status]?.label || r.status}
                        </span>
                        {r.status === 'transferred' && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleConfirmReceipt(r.id)}>
                                确认收款
                            </Button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function ProviderPage() {
    const {
        user,
        setUser,
        loading: authLoading,
        logout,
        refreshUser
    } = useAuth("provider");

    const [allocations, setAllocations] = useState<QuotaAllocation[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [applications, setApplications] = useState<ProviderApplication[]>([]);
    const [quotaRequests, setQuotaRequests] = useState<QuotaRequest[]>([]);
    const [showQuotaApplyDialog, setShowQuotaApplyDialog] = useState(false);
    const [applyQuotaAmount, setApplyQuotaAmount] = useState("");

    const [stats, setStats] = useState<Stats>({
        pending_count: 0,
        available_count: 0,
        sold_count: 0,
        total_value: 0,
        pending_quota: 0
    });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // 修改密码状态
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    // 回购确认弹窗
    const [repurchaseConfirm, setRepurchaseConfirm] = useState<{ show: boolean; productId: string; productName: string; price: number }>({ show: false, productId: '', productName: '', price: 0 });

    const [message, setMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    const [activeTab, setActiveTab] = useState<string>("overview");
    const [powerSubTab, setPowerSubTab] = useState<string>("quota");
    const [productListTab, setProductListTab] = useState<string>("available");
    const [showcaseFilter, setShowcaseFilter] = useState<string>("all");
    const [salesRecords, setSalesRecords] = useState<any[]>([]);
    const [salesStats, setSalesStats] = useState<any>({ total: 0, available: 0, sold: 0, pending: 0, totalAmount: 0 });
    const [salesFilter, setSalesFilter] = useState<string>("all");
    const [selectedAllocation, setSelectedAllocation] = useState<string>("");
    const [transferRecords, setTransferRecords] = useState<any[]>([]);
    const [transferStartDate, setTransferStartDate] = useState<string>("");
    const [transferEndDate, setTransferEndDate] = useState<string>("");

    // 用户名编辑状态
    const [editingUsername, setEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState("");
    const [savingUsername, setSavingUsername] = useState(false);

    // 收款信息状态
    const [alipayAccount, setAlipayAccount] = useState("");
    const [wechatAccount, setWechatAccount] = useState("");
    const [paymentQRCode, setPaymentQRCode] = useState<string | null>(null);

    // 收益充值相关状态
    const [energyMembers, setEnergyMembers] = useState<any[]>([]);
    const [showRechargeDialog, setShowRechargeDialog] = useState(false);
    const [rechargeMemberId, setRechargeMemberId] = useState("");
    const [rechargeAmount, setRechargeAmount] = useState("");

    // 收益管理子Tab
    const [energyFilter, setEnergyFilter] = useState<string>("all");
    // 收益管理子Tab

    // 资金流水状态
    const [capitalFlowData, setCapitalFlowData] = useState<any>(null);
    const [capitalFlowLoading, setCapitalFlowLoading] = useState(false);
    const [capitalFlowTab, setCapitalFlowTab] = useState<string>("all");
    const [capitalFlowPage, setCapitalFlowPage] = useState(1);
    const [revenueSubTab, setRevenueSubTab] = useState<string>("records");

    // 关系链状态
    const [chainData, setChainData] = useState<any>(null);
    const [chainLoading, setChainLoading] = useState(false);
    const [rechargeNote, setRechargeNote] = useState("");

    // 收益互转相关状态
    const [showTransferDialog, setShowTransferDialog] = useState(false);
    const [transferSearchQuery, setTransferSearchQuery] = useState("");
    const [transferSearchResults, setTransferSearchResults] = useState<any[]>([]);
    const [transferSearching, setTransferSearching] = useState(false);
    const [transferSelectedUser, setTransferSelectedUser] = useState<any>(null);
    const [transferUserId, setTransferUserId] = useState("");
    const [transferAmount, setTransferAmount] = useState("");
    const [transferNote, setTransferNote] = useState("");

    // 积分相关状态
    const [pointsRecords, setPointsRecords] = useState<any[]>([]);
    const [pointsStats, setPointsStats] = useState({ total_convert: 0, total_exchange: 0, available_points: 0 });
    const [showPointsToEnergyDialog, setShowPointsToEnergyDialog] = useState(false);
    const [pointsConvertAmount, setPointsConvertAmount] = useState("");
    const [showPointsShop, setShowPointsShop] = useState(false);
    const [pointsShopProducts, setPointsShopProducts] = useState<any[]>([]);
    const [pointsShopLoading, setPointsShopLoading] = useState(false);
    const [showExchangeForm, setShowExchangeForm] = useState(false);
    const [exchangeProduct, setExchangeProduct] = useState<any>(null);
    const [exchangeForm, setExchangeForm] = useState({ name: '', phone: '', address: '' });


    // 收益记录相关状态
    const [revenueRecords, setRevenueRecords] = useState<any[]>([]);
    const [withdrawalRecords, setWithdrawalRecords] = useState<any[]>([]);
    const [revenueStats, setRevenueStats] = useState<any>({
        totalRevenue: 0,
        energyRevenue: 0,
        withdrawRevenue: 0,
        rechargeRevenue: 0,
        subordinateRevenue: 0,
        balance: 0,
        
        orderCount: 0,
    });


    // 收益转入收益记录
    const [convertRecords, setConvertRecords] = useState<any[]>([]);
    const [convertStats, setConvertStats] = useState<any>({ totalConverted: 0, totalEnergy: 0, totalPoints: 0, count: 0 });

    // 额度申请相关状态
    const [showQuotaRequestDialog, setShowQuotaRequestDialog] = useState(false);
    const [quotaRequestAmount, setQuotaRequestAmount] = useState("");
    const [quotaRequestNote, setQuotaRequestNote] = useState("");

    // 额度生成相关状态
    const [showQuotaGenerateDialog, setShowQuotaGenerateDialog] = useState(false);
    const [generateQuotaAmount, setGenerateQuotaAmount] = useState("");
    const [generatePreview, setGeneratePreview] = useState<any>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
    const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

    // 购买审核相关状态
    const [pendingBuyOrders, setPendingBuyOrders] = useState<any[]>([]);
    const [completedBuyOrders, setCompletedBuyOrders] = useState<any[]>([]);
    const [showBuyOrderDialog, setShowBuyOrderDialog] = useState(false);
    const [selectedBuyOrder, setSelectedBuyOrder] = useState<any>(null);
    const [buyOrderAction, setBuyOrderAction] = useState<"confirm" | "reject">("confirm");
    const [rejectReason, setRejectReason] = useState("");

    // 匹配管理相关状态
    const [matchProducts, setMatchProducts] = useState<any[]>([]);
    const [matchTargetProduct, setMatchTargetProduct] = useState<any>(null);
    const [matchTargetUserId, setMatchTargetUserId] = useState("");
    const [assigningMatch, setAssigningMatch] = useState(false);
    const [matchConfirming, setMatchConfirming] = useState(false);
    const [matchSubTab, setMatchSubTab] = useState<"pending" | "review">("pending");
    const [batchConfirming, setBatchConfirming] = useState(false);
    const [chainMembers, setChainMembers] = useState<any[]>([]);
    const [showMatchDialog, setShowMatchDialog] = useState(false);
    const [matchSearchText, setMatchSearchText] = useState("");
    const [matchDropdownOpen, setMatchDropdownOpen] = useState(false);

    // 收益申请相关状态
    const [showEnergyRequestDialog, setShowEnergyRequestDialog] = useState(false);
    const [energyRequestAmount, setEnergyRequestAmount] = useState("");
    const [energyRequestNote, setEnergyRequestNote] = useState("");
    const [energyRequests, setEnergyRequests] = useState<any[]>([]);
    const [showEnergyRequestListDialog, setShowEnergyRequestListDialog] = useState(false);

    // 会员充值申请相关状态
    const [memberRechargeRequests, setMemberRechargeRequests] = useState<any[]>([]);
    const [showMemberRechargeDialog, setShowMemberRechargeDialog] = useState(false);
    const [selectedRechargeRequest, setSelectedRechargeRequest] = useState<any>(null);

    // 提现管理相关状态
    const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);

    // 转账审核相关状态
    const [pendingTransferRequests, setPendingTransferRequests] = useState<any[]>([]);
    const [showTransferReviewDialog, setShowTransferReviewDialog] = useState(false);
    const [selectedTransferRequest, setSelectedTransferRequest] = useState<any>(null);

    // 提现相关状态
    const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
    const [showConvertDialog, setShowConvertDialog] = useState(false);
    const [showEnergyActionDialog, setShowEnergyActionDialog] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawAlipay, setWithdrawAlipay] = useState("");
    const [withdrawAlipayName, setWithdrawAlipayName] = useState("");
    const [withdrawRecords, setWithdrawRecords] = useState<any[]>([]);

    // 转账记录相关状态（收益转账）
    const [energyTransferRecords, setEnergyTransferRecords] = useState<any[]>([]);
    const [transferStats, setTransferStats] = useState<any>({});
    const [transferFilter, setTransferFilter] = useState<string>("all");

    // 加载服务商收益记录
    const loadRevenueRecords = async () => {
        try {
            const response = await authFetch(`/api/provider/revenue`);
            const data = await response.json();
            if (data.success) {
                setRevenueRecords(data.data?.records || []);
                setRevenueStats(data.data?.stats || {
                    totalRevenue: 0,
                    distSelfRevenue: 0,
                    distDirectReward: 0,
                    distParentShare: 0,
                    subordinateRevenue: 0,
                    balance: 0,
                    
                    totalWithdrawn: 0,
                    totalConverted: 0,
                    availableRevenue: 0,
                    orderCount: 0,
                });
            }
        } catch (error) {
            console.error('加载收益记录失败:', error);
        }
    };

    // 加载服务商提现记录
    const loadWithdrawalRecords = async () => {
        try {
            const response = await authFetch(`/api/provider/withdraw`);
            const data = await response.json();
            if (data.success) {
                setWithdrawalRecords(data.data || []);
            }
        } catch (error) {
            console.error('加载提现记录失败:', error);
        }
    };

    // 统一的 API 请求方法（带认证）
    const authFetch = async (url: string, options: RequestInit = {}) => {
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {
            ...(options.headers as Record<string, string>),
        };
        // 只在没设置 Content-Type 时默认加 application/json
        if (!headers['Content-Type'] && !headers['content-type']) {
            headers['Content-Type'] = 'application/json';
        }
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(url, { ...options, headers, cache: 'no-store' });
        // 401 时自动清理并跳转登录页
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userData');
            window.location.href = '/';
        }
        return response;
    };

    // 加载会员充值申请列表
    const loadMemberRechargeRequests = async () => {
        const providerId = localStorage.getItem("userId");
        if (!providerId) return;

        try {
            const response = await authFetch(`/api/provider/recharge-request?providerId=${providerId}&status=pending`);
            const data = await response.json();
            if (data.success) {
                setMemberRechargeRequests(data.data || []);
            }
        } catch (error) {
            console.error('加载会员充值申请失败:', error);
        }
    };

    // 加载待审核购买订单
    const loadPendingBuyOrders = async () => {
        const providerId = localStorage.getItem("userId");
        if (!providerId) return;
        
        try {
            // 获取待审核订单
            const pendingRes = await authFetch(`/api/provider/pending-orders?providerId=${providerId}&status=pending`);
            const pendingData = await pendingRes.json();
            if (pendingData.success) {
                setPendingBuyOrders(pendingData.data?.orders || []);
            }

            // 获取已完成订单
            const completedRes = await authFetch(`/api/provider/pending-orders?providerId=${providerId}&status=completed`);
            const completedData = await completedRes.json();
            if (completedData.success) {
                setCompletedBuyOrders(completedData.data?.orders || []);
            }
        } catch (error) {
            console.error('加载待审核订单失败:', error);
        }
    };

    // 加载产品销售记录（包含持有人信息）
    const loadCapitalFlow = async () => {
        if (!user?.id) return;
        setCapitalFlowLoading(true);
        try {
            const response = await fetch(`/api/capital-flow?userId=${user.id}&flowType=${capitalFlowTab}&page=${capitalFlowPage}&pageSize=20`);
            const data = await response.json();
            if (data.success) setCapitalFlowData(data.data);
        } catch (e) { console.error("loadCapitalFlow error:", e); }
        finally { setCapitalFlowLoading(false); }
    };

    const loadSalesRecords = async (status?: string) => {
        try {
            const filterStatus = status ?? salesFilter;
            const response = await authFetch(`/api/provider/products/sales-records?status=${filterStatus}`);
            const data = await response.json();
            if (data.success) {
                setSalesRecords(data.data?.records || []);
                setSalesStats(data.data?.stats || { total: 0, available: 0, sold: 0, pending: 0, totalAmount: 0 });
            }
        } catch (error) {
            console.error('加载销售记录失败:', error);
        }
    };

    const loadTransferRecords = async (startDate?: string, endDate?: string) => {
        try {
            const providerId = localStorage.getItem("userId");
            const params = new URLSearchParams();
            if (providerId) params.append('providerId', providerId);
            if (startDate && endDate) {
                params.append('startDate', startDate);
                params.append('endDate', endDate);
            }
            // 不传日期则API默认2天
            const response = await authFetch(`/api/provider/transfer-records?${params.toString()}`);
            const data = await response.json();
            if (data.success) {
                setTransferRecords(data.data || []);
            } else {
                console.error('流转记录API错误:', data.error);
                setTransferRecords([]);
            }
        } catch (error) {
            console.error('加载流转记录失败:', error);
            setTransferRecords([]);
        }
    };

    const exportTransferExcel = () => {
        if (transferRecords.length === 0) {
            showMessage("error", "没有可导出的记录");
            return;
        }
        const XLSX = require('xlsx');
        const exportData = transferRecords.map((r: any) => ({
            '产品编号': r.productCode || '',
            '产品名称': r.productName || '',
            '产品金额(¥)': r.productPrice || 0,
            '周期(天)': r.period || 0,
            '到期收益率(%)': r.profitRate || 0,
            '到期收益金额(¥)': r.expectedProfit || 0,
            '流转类型': r.flowType || '',
            '卖方用户名': r.sellerName || '',
            '卖方专属ID': r.sellerUniqueId || '',
            '卖方手机号': r.sellerPhone || '',
            '买方用户名': r.buyerName || '',
            '买方专属ID': r.buyerUniqueId || '',
            '买方手机号': r.buyerPhone || '',
            '卖方收益(¥)': r.sellerProfit || 0,
            '流转时间': r.transferTime || ''
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '产品流转记录');
        const dateRange = transferStartDate && transferEndDate ? `_${transferStartDate}_${transferEndDate}` : `_近2天`;
        XLSX.writeFile(wb, `产品流转记录${dateRange}.xlsx`);
    };

    // 处理购买订单（确认/拒绝）
    const handleBuyOrderAction = async () => {
        if (!selectedBuyOrder) return;

        setSubmitting(true);
        try {
            if (buyOrderAction === 'confirm') {
                const response = await authFetch('/api/provider/confirm-payment', {
                    method: 'POST',
                    body: JSON.stringify({ orderId: selectedBuyOrder.order_id || selectedBuyOrder.id })
                });
                const data = await response.json();
                if (data.success) {
                    showMessage("success", "已确认收款，产品分配成功");
                    await loadPendingBuyOrders();
                    setActiveTab('overview');
                    refreshAll();
                } else {
                    showMessage("error", data.error || "操作失败");
                }
            } else {
                const response = await authFetch('/api/provider/reject-order', {
                    method: 'POST',
                    body: JSON.stringify({ orderId: selectedBuyOrder.order_id || selectedBuyOrder.id, reason: rejectReason })
                });
                const data = await response.json();
                if (data.success) {
                    showMessage("success", "已拒绝订单");
                    await loadPendingBuyOrders();
                } else {
                    showMessage("error", data.error || "操作失败");
                }
            }
        } catch {
            showMessage("error", "操作失败，请稍后重试");
        } finally {
            setSubmitting(false);
            setShowBuyOrderDialog(false);
            setSelectedBuyOrder(null);
            setRejectReason("");
        }
    };

    // 打开购买订单确认对话框
    const openBuyOrderConfirmDialog = (order: any) => {
        setSelectedBuyOrder(order);
        setBuyOrderAction("confirm");
        setShowBuyOrderDialog(true);
    };

    // 打开购买订单拒绝对话框
    const openBuyOrderRejectDialog = (order: any) => {
        setSelectedBuyOrder(order);
        setBuyOrderAction("reject");
        setRejectReason("");
        setShowBuyOrderDialog(true);
    };

    // 处理会员充值申请
    const handleMemberRechargeAction = async (requestId: string, action: 'approve' | 'reject', note?: string) => {
        const providerId = localStorage.getItem("userId");
        if (!providerId) return;

        setSubmitting(true);
        try {
            const response = await authFetch('/api/provider/recharge-request', {
                method: 'POST',
                body: JSON.stringify({ requestId, providerId, action, note })
            });
            const data = await response.json();
            if (data.success) {
                showMessage("success", action === 'approve' ? "已批准充值申请" : "已拒绝充值申请");
                await loadMemberRechargeRequests();
                refreshAll();
            } else {
                showMessage("error", data.error || "操作失败");
            }
        } catch {
            showMessage("error", "操作失败，请稍后重试");
        } finally {
            setSubmitting(false);
            setShowMemberRechargeDialog(false);
            setSelectedRechargeRequest(null);
        }
    };

    const loadData = useCallback(async () => {
        const providerId = localStorage.getItem("userId");

        if (!providerId)
            return;

        try {
            // 使用 Promise.allSettled 避免单个失败导致全部失败
            const results = await Promise.allSettled([
                authFetch(`/api/quota-allocations?providerId=${providerId}`),
                authFetch(`/api/provider/products?providerId=${providerId}&status=all`),
                authFetch(`/api/provider-applications/review?providerId=${providerId}&status=pending`),
                authFetch(`/api/quota?userId=${providerId}`),
                authFetch(`/api/provider/pending-orders?status=pending`),
                authFetch(`/api/provider/pending-orders?status=completed`)
            ]);

            // 安全解析 JSON
            const safeJson = async (result: PromiseSettledResult<Response>): Promise<any> => {
                if (result.status === 'rejected') {
                    return { success: false, data: null };
                }
                try {
                    const data = await result.value.json();
                    return data;
                } catch {
                    return { success: false, data: null };
                }
            };

            const [allocationsData, productsData, applicationsData, quotaData, pendingOrdersData, completedOrdersData] = await Promise.all(
                results.map(safeJson)
            );

            if (allocationsData.success) {
                setAllocations(allocationsData.data || []);

                const pendingQuota = (allocationsData.data || []).filter((a: QuotaAllocation) => a.status === "active").reduce(
                    (sum: number, a: QuotaAllocation) => sum + (a.quota_amount - a.used_amount),
                    0
                );

                setStats(prev => ({
                    ...prev,
                    pending_quota: pendingQuota
                }));
            }

            if (productsData.success) {
                setProducts(productsData.data?.products || []);
                const productStats = productsData.data?.stats || {};

                setStats(prev => ({
                    ...prev,
                    pending_count: productStats.pending || 0,
                    available_count: productStats.available || 0,
                    sold_count: productStats.sold || 0,
                    total_value: productStats.totalValue || productStats.total_value || 0
                }));
            }

            if (applicationsData.success) {
                setApplications(applicationsData.data || []);
            }

            if (quotaData.success) {
                setStats(prev => ({
                    ...prev,
                    total_quota: quotaData.data?.total_quota || 0,
                    available_quota: quotaData.data?.available_quota || 0,
                    used_quota: quotaData.data?.used_quota || 0
                }));

                setQuotaRequests(quotaData.data?.requests || []);
                // 更新额度分配记录
                if (quotaData.data?.allocations) {
                    setAllocations(quotaData.data.allocations);
                }
            }

            // 处理待审核购买订单
            if (pendingOrdersData.success) {
                setPendingBuyOrders(pendingOrdersData.data?.orders || []);
            }

            // 处理已完成购买订单
            if (completedOrdersData.success) {
                setCompletedBuyOrders(completedOrdersData.data?.orders || []);
            }

            // 加载会员充值申请
            await loadMemberRechargeRequests();
        } catch (error) {
            console.error("加载数据失败:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // 获取关系链数据
    const loadChainData = useCallback(async () => {
        if (!user?.id) return;

        setChainLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/user/chain?userId=${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setChainData(data.data);
            }
        } catch (error) {
            console.error('获取关系链失败:', error);
        } finally {
            setChainLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (!authLoading && user) {
            loadData();
            setNewUsername(user.username || '');
        }
    }, [authLoading, user, loadData]);

    // 保存用户名
    const handleSaveUsername = async () => {
        if (!newUsername.trim() || newUsername.trim().length < 2) {
            showMessage("error", "用户名长度需在2-20个字符之间");
            return;
        }

        if (newUsername.trim() === user?.username) {
            setEditingUsername(false);
            return;
        }

        setSavingUsername(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/user/username', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username: newUsername.trim() })
            });

            const data = await response.json();
            if (data.success) {
                // 更新本地用户数据
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                userData.username = newUsername.trim();
                localStorage.setItem('userData', JSON.stringify(userData));
                localStorage.setItem('userName', newUsername.trim());

                // 刷新页面数据
                refreshAll();
                setEditingUsername(false);
                showMessage("success", "用户名修改成功");
            } else {
                showMessage("error", data.error || "修改失败");
            }
        } catch {
            showMessage("error", "修改失败，请稍后重试");
        } finally {
            setSavingUsername(false);
        }
    };

    // 加载收款信息
    const loadPaymentInfo = async () => {
        try {
            const response = await authFetch('/api/member/payment-info');
            const data = await response.json();
            if (data.success) {
                if (data.data.alipayAccount) setAlipayAccount(data.data.alipayAccount);
                if (data.data.wechatAccount) setWechatAccount(data.data.wechatAccount);
                if (data.data.paymentQRCode) setPaymentQRCode(data.data.paymentQRCode);
            }
        } catch (error) {
            console.error('加载收款信息失败:', error);
        }
    };

    // 保存收款信息
    const handleSavePaymentInfo = async () => {
        try {
            const response = await authFetch('/api/member/payment-info', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wechatAccount,
                    alipayAccount,
                    paymentQRCode,
                    realName: user?.real_name || ''
                })
            });
            const data = await response.json();
            if (data.success) {
                // 同步更新本地user数据
                const userDataStr = localStorage.getItem('userData');
                if (userDataStr) {
                    const userData = JSON.parse(userDataStr);
                    userData.alipay_account = alipayAccount;
                    userData.wechat_account = wechatAccount;
                    userData.real_name = user?.real_name || '';
                    localStorage.setItem('userData', JSON.stringify(userData));
                }
                refreshUser();
                showMessage('success', '收款信息已保存');
            } else {
                showMessage('error', data.error || '保存失败');
            }
        } catch {
            showMessage('error', '保存失败，请稍后重试');
        }
    };

    // 修改登录密码
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!oldPassword) {
            showMessage("error", "请输入当前密码");
            return;
        }
        if (!newPassword || newPassword.length < 6) {
            showMessage("error", "新密码至少需要6位");
            return;
        }
        if (newPassword !== confirmPassword) {
            showMessage("error", "两次输入的新密码不一致");
            return;
        }

        setChangingPassword(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/user/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    oldPassword,
                    newPassword,
                    confirmPassword
                })
            });

            const data = await response.json();
            if (data.success) {
                showMessage("success", "密码修改成功");
                setOldPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setActiveTab("profile");
            } else {
                showMessage("error", data.error || "修改失败");
            }
        } catch {
            showMessage("error", "修改失败，请稍后重试");
        } finally {
            setChangingPassword(false);
        }
    };

    const showMessage = (type: "success" | "error", text: string) => {
        setMessage({
            type,
            text
        });

        setTimeout(() => setMessage(null), 3000);
    };

    // 打开额度生成对话框（已由openGenerateDialog替代）

    // 打开生成产品对话框时加载模板
    const openGenerateDialog = async () => {
        setGenerateQuotaAmount("");
        setGeneratePreview(null);
        setSelectedTemplateId("");
        setShowQuotaGenerateDialog(true);
        
        // 加载可用模板
        try {
            const response = await authFetch("/api/product-templates?status=active");
            const data = await response.json();
            if (data.success) {
                // 只显示3天周期的模板
                setAvailableTemplates((data.data || []).filter((t: any) => t.status === 'active'));
            }
        } catch {
            // 静默失败
        }
    };

    // 获取产品生成预览
    const fetchGeneratePreview = async () => {
        if (!selectedTemplateId) {
            showMessage("error", "请先选择产品模板");
            return;
        }
        if (!generateQuotaAmount || parseInt(generateQuotaAmount) < 1000) {
            showMessage("error", "最低总额为100元");
            return;
        }

        const template = availableTemplates.find((t: any) => t.id === selectedTemplateId);
        if (!template) return;

        setLoadingPreview(true);
        try {
            const response = await authFetch(`/api/provider/generate-products?totalAmount=${generateQuotaAmount}&period=${template.period}&templateId=${selectedTemplateId}`);
            const data = await response.json();
            if (data.success) {
                setGeneratePreview(data.data);
            } else {
                showMessage("error", data.error || "获取预览失败");
                setGeneratePreview(null);
            }
        } catch {
            showMessage("error", "网络错误");
            setGeneratePreview(null);
        } finally {
            setLoadingPreview(false);
        }
    };

    // 生成产品
    const handleGenerateWithQuota = async () => {
        const providerId = localStorage.getItem("userId");
        if (!providerId || !generateQuotaAmount || !selectedTemplateId) return;

        const amount = parseInt(generateQuotaAmount);
        if (amount < 1000) {
            showMessage("error", "最低额度为100元");
            return;
        }
        if (amount > (stats.available_quota || 0)) {
            showMessage("error", `生成总额不能超过可用额度 ¥${(stats.available_quota || 0).toLocaleString()}`);
            return;
        }

        setSubmitting(true);
        try {
            const requestBody = {
                providerId,
                templateId: selectedTemplateId,
                totalAmount: amount
            };
            console.log('[generate] 发送请求:', JSON.stringify(requestBody));
            const response = await authFetch("/api/provider/generate-products", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            });

            console.log('[generate] HTTP状态:', response.status, response.statusText);

            // 检查 HTTP 状态码
            if (!response.ok) {
                const text = await response.text();
                console.error('[generate] 响应内容:', text);
                let errorMsg = `HTTP ${response.status}`;
                try {
                    const errData = JSON.parse(text);
                    errorMsg = errData.error || errorMsg;
                } catch {
                    errorMsg = text.substring(0, 200) || errorMsg;
                }
                showMessage("error", `生成失败: ${errorMsg}`);
                return;
            }

            const data = await response.json();
            console.log('[generate] 响应数据:', JSON.stringify(data).substring(0, 500));

            if (data.success) {
                showMessage("success", data.message || `成功生成 ${data.data?.stats?.total} 个Token`);
                setShowQuotaGenerateDialog(false);
                refreshAll();
            } else {
                showMessage("error", data.error || "生成失败");
            }
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : "网络错误";
            showMessage("error", `生成产品异常: ${errMsg}`);
        } finally {
            setSubmitting(false);
        }
    };

    // 原有的一键生成功能（使用全部额度）
    const handleGenerateProducts = async (allocationId: string) => {
        const providerId = localStorage.getItem("userId");

        if (!providerId)
            return;

        // 从allocations中找到对应的allocation
        const allocation = allocations.find(a => a.id === allocationId);
        if (!allocation) {
            showMessage("error", "未找到额度分配记录");
            return;
        }

        const quotaAmount = allocation.quota_amount;

        setSubmitting(true);

        try {
            const response = await authFetch("/api/provider/generate-products", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    providerId,
                    allocationId,
                    quotaAmount
                })
            });

            const data = await response.json();

            if (data.success) {
                showMessage("success", data.message || `成功生成 ${data.data?.stats?.total} 个Token`);
                refreshAll();
            } else {
                showMessage("error", data.error || "生成失败");
            }
        } catch (error) {
            showMessage("error", "网络错误");
        } finally {
            setSubmitting(false);
        }
    };

    // 删除单个未上架产品
    const handleDeleteProduct = async (productId: string, productName: string) => {
        if (!confirm(`确定删除产品"${productName}"？删除后额度将退回到您的账户。`)) return;

        const providerId = localStorage.getItem("userId");
        if (!providerId) return;

        try {
            const response = await authFetch(`/api/products/${productId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            });
            const data = await response.json();
            if (data.success) {
                showMessage("success", data.message || "产品已删除");
                refreshAll();
            } else {
                showMessage("error", data.error || "删除失败");
            }
        } catch {
            showMessage("error", "网络错误");
        }
    };

    // 下架已上架产品
    const handleUnlistProduct = async (productId: string, productName: string) => {
        if (!confirm(`确定下架产品"${productName}"？下架后产品将回到待上架列表。`)) return;

        const providerId = localStorage.getItem("userId");
        if (!providerId) return;

        try {
            const response = await authFetch("/api/provider/products/batch-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    providerId,
                    productIds: [productId],
                    action: "unlist",
                }),
            });
            const data = await response.json();
            if (data.success) {
                showMessage("success", data.message || "产品已下架，正在刷新...");
                await refreshAll(500);
                setTimeout(() => refreshAll(300), 1500);
            } else {
                showMessage("error", data.error || "下架失败");
            }
        } catch {
            showMessage("error", "网络错误");
        }
    };

    // 单个上架产品
    const handleListProduct = async (productId: string, productName: string) => {
        const providerId = localStorage.getItem("userId");
        if (!providerId) return;

        try {
            const response = await authFetch("/api/provider/products/batch-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    providerId,
                    productIds: [productId],
                    status: "available",
                }),
            });
            const data = await response.json();
            if (data.success) {
                showMessage("success", `产品"${productName}"已上架，正在刷新...`);
                await refreshAll(500);
                setTimeout(() => refreshAll(300), 1500);
            } else {
                showMessage("error", data.error || "上架失败");
            }
        } catch {
            showMessage("error", "网络错误");
        }
    };

    // 批量删除未上架产品
    const handleBatchDeleteProducts = async () => {
        const providerId = localStorage.getItem("userId");
        if (!providerId) return;

        // 获取选中的未上架产品（含draft）
        const deletableProducts = products.filter((p: any) => 
            (p.status === 'unlisted' || p.status === 'draft') && selectedProductIds.includes(p.id)
        );
        if (deletableProducts.length === 0) {
            showMessage("error", "请选择要删除的未上架产品");
            return;
        }

        if (!confirm(`确定删除${deletableProducts.length}个产品？删除后额度将退回。`)) return;

        try {
            const response = await authFetch("/api/provider/products/batch-status", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    providerId,
                    productIds: deletableProducts.map((p: any) => p.id),
                }),
            });
            const data = await response.json();
            if (data.success) {
                showMessage("success", data.message + "，正在刷新...");
                setSelectedProductIds([]);
                await refreshAll(500);
                setTimeout(() => refreshAll(300), 1500);
            } else {
                showMessage("error", data.error || "删除失败");
            }
        } catch {
            showMessage("error", "网络错误");
        }
    };

    const handleBatchListProducts = async () => {
        const providerId = localStorage.getItem("userId");
        if (!providerId) return;

        const unlistedIds = selectedProductIds.filter(id => {
            const p = products.find((pp: any) => pp.id === id);
            return p && (p.status === 'draft' || p.status === 'unlisted');
        });
        if (unlistedIds.length === 0) {
            showMessage("error", "请选择要上架的未上架产品");
            return;
        }

        if (!confirm(`确定上架${unlistedIds.length}个产品？`)) return;

        try {
            const response = await authFetch("/api/provider/products/batch-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    providerId,
                    productIds: unlistedIds,
                    action: "list",
                }),
            });
            const data = await response.json();
            if (data.success) {
                setSelectedProductIds([]);
                showMessage("success", `已上架${unlistedIds.length}个产品，正在刷新...`);
                await refreshAll(500);
                setTimeout(() => refreshAll(300), 1500);
            } else {
                showMessage("error", data.error || "上架失败");
            }
        } catch {
            showMessage("error", "网络错误");
        }
    };

    const handleBatchUnlistProducts = async () => {
        const providerId = localStorage.getItem("userId");
        if (!providerId) return;

        const availableIds = selectedProductIds.filter(id => {
            const p = products.find((pp: any) => pp.id === id);
            return p && p.status === 'available';
        });
        if (availableIds.length === 0) {
            showMessage("error", "请选择要下架的已上架产品");
            return;
        }

        if (!confirm(`确定下架${availableIds.length}个产品？下架后回到待上架列表。`)) return;

        try {
            const response = await authFetch("/api/provider/products/batch-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    providerId,
                    productIds: availableIds,
                    action: "unlist",
                }),
            });
            const data = await response.json();
            if (data.success) {
                setSelectedProductIds([]);
                showMessage("success", `已下架${availableIds.length}个产品，正在刷新...`);
                await refreshAll(500);
                // 二次刷新确保状态同步
                setTimeout(() => refreshAll(300), 1500);
            } else {
                showMessage("error", data.error || "下架失败");
            }
        } catch {
            showMessage("error", "网络错误");
        }
    };

    const handleListAllProducts = async () => {
        const providerId = localStorage.getItem("userId");

        if (!providerId)
            return;

        setSubmitting(true);

        try {
            // 使用 PUT 方法一键上架所有未上架产品
            const response = await authFetch("/api/provider/products/batch-status", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ providerId })
            });

            const data = await response.json();

            if (data.success) {
                showMessage("success", (data.message || "上架成功") + "，正在刷新...");
                await refreshAll(500);
                setTimeout(() => refreshAll(300), 1500);
            } else {
                showMessage("error", data.error || "上架失败");
            }
        } catch (error) {
            showMessage("error", "网络错误");
        } finally {
            setSubmitting(false);
        }
    };

    // 加载会员列表
    const loadEnergyMembers = async () => {
        const providerId = localStorage.getItem("userId");
        if (!providerId) return;

        try {
            const response = await authFetch(`/api/provider/recharge-energy?providerId=${providerId}`);
            const data = await response.json();
            if (data.success) {
                setEnergyMembers(data.data || []);
            }
        } catch (error) {
            console.error("加载会员列表失败:", error);
        }
    };

    // 搜索转账对象（使用新的搜索API，支持所有角色互转）
    const handleTransferSearch = async () => {
        if (!transferSearchQuery.trim()) {
            showMessage("error", "请输入搜索关键词");
            return;
        }
        setTransferSearching(true);
        try {
            const response = await fetch(`/api/users/search?keyword=${encodeURIComponent(transferSearchQuery.trim())}`);
            const data = await response.json();
            if (data.success) {
                setTransferSearchResults(data.data || []);
                if (data.data?.length === 0) {
                    showMessage("error", "未找到匹配的用户");
                }
            } else {
                showMessage("error", data.error || "搜索失败");
            }
        } catch {
            showMessage("error", "搜索失败，请重试");
        } finally {
            setTransferSearching(false);
        }
    };

    // 选择转账对象
    const handleSelectTransferUser = (user: any) => {
        setTransferSelectedUser(user);
        setTransferUserId(user.id);
    };

    const handleTransferBalance = async () => {
        const providerId = localStorage.getItem("userId");
        if (!providerId || !transferUserId || !transferAmount) {
            showMessage("error", "请填写完整信息");
            return;
        }

        const amount = parseFloat(transferAmount);
        if (amount <= 0) {
            showMessage("error", "转账金额必须大于0");
            return;
        }

        if (amount < 100) {
            showMessage("error", "转账金额不能少于100");
            return;
        }

        setSubmitting(true);
        try {
            const response = await authFetch("/api/balance/transfer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fromUserId: providerId,
                    toUserId: transferUserId,
                    amount: amount,
                    note: transferNote,
                }),
            });
            const data = await response.json();
            if (data.success) {
                showMessage("success", data.message);
                setShowTransferDialog(false);
                setTransferUserId("");
                setTransferAmount("");
                setTransferNote("");
                await refreshAll(500);
                setTimeout(() => refreshAll(300), 1500);
            } else {
                showMessage("error", data.error || "转账失败");
            }
        } catch (error) {
            showMessage("error", "网络错误");
        } finally {
            setSubmitting(false);
        }
    };

    // 处理额度申请
    const handleQuotaRequest = async () => {
        const providerId = localStorage.getItem("userId");
        if (!providerId || !quotaRequestAmount) {
            showMessage("error", "请填写申请金额");
            return;
        }

        const amount = parseFloat(quotaRequestAmount);
        if (amount <= 0) {
            showMessage("error", "申请金额必须大于0");
            return;
        }

        setSubmitting(true);
        try {
            const response = await authFetch("/api/provider/request-quota", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider_id: providerId,
                    amount: amount,
                    note: quotaRequestNote,
                }),
            });
            const data = await response.json();
            if (data.success) {
                showMessage("success", data.message);
                setShowQuotaRequestDialog(false);
                setQuotaRequestAmount("");
                setQuotaRequestNote("");
                loadQuotaRequests();
            } else {
                showMessage("error", data.error || "申请失败");
            }
        } catch (error) {
            showMessage("error", "网络错误");
        } finally {
            setSubmitting(false);
        }
    };

    // 加载额度申请记录
    const loadQuotaRequests = async () => {
        const providerId = localStorage.getItem("userId");
        if (!providerId) return;

        try {
            const response = await authFetch(`/api/provider/request-quota?providerId=${providerId}`);
            const data = await response.json();
            if (data.success) {
                setQuotaRequests(data.data || []);
            }
        } catch (error) {
            console.error("加载额度申请记录失败:", error);
        }
    };

    // 处理收益充值
    const handleRechargeEnergy = async () => {
        const providerId = localStorage.getItem("userId");
        if (!providerId || !rechargeMemberId || !rechargeAmount) {
            showMessage("error", "请填写完整信息");
            return;
        }

        const amount = parseFloat(rechargeAmount);
        if (amount <= 0) {
            showMessage("error", "充值金额必须大于0");
            return;
        }

        setSubmitting(true);
        try {
            const response = await authFetch("/api/provider/recharge-energy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    providerId,
                    memberId: rechargeMemberId,
                    amount: amount,
                    note: rechargeNote,
                }),
            });
            const data = await response.json();
            if (data.success) {
                showMessage("success", data.message);
                setShowRechargeDialog(false);
                setRechargeMemberId("");
                setRechargeAmount("");
                setRechargeNote("");
                refreshAll();
            } else {
                showMessage("error", data.error || "充值失败");
            }
        } catch (error) {
            showMessage("error", "网络错误");
        } finally {
            setSubmitting(false);
        }
    };

    // 加载提现记录（收益提现）
    const loadWithdrawRecords = async () => {
        const providerId = localStorage.getItem("userId");
        if (!providerId) return;

        try {
            const response = await authFetch(`/api/provider/withdraw?userId=${providerId}`);
            const data = await response.json();
            if (data.success) {
                setWithdrawRecords(data.data || []);
            }
        } catch (error) {
            console.error("加载提现记录失败:", error);
        }
    };

    // 加载收益申请记录
    const loadEnergyRequests = async () => {
        const providerId = localStorage.getItem("userId");
        if (!providerId) return;

        try {
            const response = await authFetch(`/api/energy/request?userId=${providerId}`);
            const data = await response.json();
            if (data.success) {
                setEnergyRequests(data.data || []);
            }
        } catch (error) {
            console.error("加载收益申请记录失败:", error);
        }
    };

    // 提交收益申请
    const handleEnergyRequest = async () => {
        const providerId = localStorage.getItem("userId");
        if (!providerId || !energyRequestAmount || parseFloat(energyRequestAmount) <= 0) {
            alert("请输入有效的申请金额");
            return;
        }

        const authFetch = async (url: string, options: RequestInit = {}) => {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(url, { ...options, headers });
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('userId');
                localStorage.removeItem('userRole');
                localStorage.removeItem('userData');
                window.location.href = '/';
            }
            return response;
        };

        try {
            setSubmitting(true);
            const response = await authFetch('/api/energy/request', {
                method: 'POST',
                body: JSON.stringify({
                    userId: providerId,
                    requestedAmount: parseFloat(energyRequestAmount),
                    note: energyRequestNote || '服务商申请收益'
                })
            });
            const data = await response.json();
            if (data.success) {
                alert('收益申请已提交，等待服务网点审核');
                setShowEnergyRequestDialog(false);
                setEnergyRequestAmount("");
                setEnergyRequestNote("");
                refreshAll();
            } else {
                alert(data.error || '申请失败');
            }
        } catch (error) {
            console.error("申请收益失败:", error);
            alert('申请失败，请重试');
        } finally {
            setSubmitting(false);
        }
    };

    // 加载转账记录（收益转账）
    const loadEnergyTransferRecords = async () => {
        const providerId = localStorage.getItem("userId");
        if (!providerId) return;

        try {
            const response = await authFetch(`/api/energy/transactions?userId=${providerId}&limit=20`);
            const data = await response.json();
            if (data.success) {
                setEnergyTransferRecords(data.data || []);
                setTransferStats(data.stats || {});
            }
        } catch (error) {
            console.error("加载转账记录失败:", error);
        }
    };

    // 加载流转审核数据
    const loadTransferData = useCallback(async () => {
        const providerId = localStorage.getItem("userId");
        if (!providerId) return;

        try {
            // 加载待匹配产品
            const res = await authFetch(`/api/products/match/list?providerId=${providerId}`);
            const data = await res.json();
            if (data.success) {
                setMatchProducts(data.data || []);
            }
        } catch (error) {
            console.error("加载匹配数据失败:", error);
        }
    }, []);

    // 加载链属会员
    const fetchChainMembers = useCallback(async () => {
        const providerId = localStorage.getItem("userId");
        if (!providerId) return;
        try {
            const res = await authFetch(`/api/user/chain?userId=${providerId}`);
            const data = await res.json();
            if (data.success) {
                const members = (data.data?.members || []).map((m: any) => ({
                        value: m.id,
                        label: `${m.username} [${m.uniqueId || ''}] (收益: ${m.balance || 0})`,
                        phone: m.phone || '',
                        uniqueId: m.uniqueId || '',
                        username: m.username || '',
                    }));
                setChainMembers(members);
            }
        } catch (error) {
            console.error("加载会员列表失败:", error);
        }
    }, []);

    // 匹配 - 指定会员
    const handleOpenMatchDialog = useCallback((product: any) => {
        setMatchTargetProduct(product);
        setMatchTargetUserId("");
        setMatchSearchText("");
        setMatchDropdownOpen(false);
        setShowMatchDialog(true);
        fetchChainMembers();
    }, [fetchChainMembers]);

    // 执行匹配分配
    const handleMatchAssign = useCallback(async () => {
        if (!matchTargetProduct || !matchTargetUserId) {
            showMessage("error", "请选择目标会员");
            return;
        }
        setAssigningMatch(true);
        try {
            const res = await authFetch("/api/products/match/assign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: matchTargetProduct.id, targetUserId: matchTargetUserId }),
            });
            const data = await res.json();
            if (data.success) {
                showMessage("success", "已指定匹配，等待确认");
                setShowMatchDialog(false);
                setMatchTargetProduct(null);
                setMatchTargetUserId("");
                loadTransferData();
                // 延迟刷新产品列表，确保数据库状态更新
                setTimeout(() => loadData(), 500);
            } else {
                showMessage("error", data.message || "匹配失败");
            }
        } catch (error) {
            showMessage("error", "操作失败");
        } finally {
            setAssigningMatch(false);
        }
    }, [matchTargetProduct, matchTargetUserId, loadTransferData, loadData, showMessage]);

    // 确认单个匹配
    const handleMatchConfirm = useCallback(async (productId: string) => {
        setMatchConfirming(true);
        try {
            const res = await authFetch("/api/products/match/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productIds: [productId] }),
            });
            const data = await res.json();
            if (data.success) {
                const result = data.data?.results?.[0];
                if (result?.success) {
                    showMessage("success", "匹配成功: 产品已成功匹配给会员");
                } else {
                    showMessage("error", "匹配失败: " + (result?.error || "操作失败，请稍后重试"));
                }
                loadTransferData();
                loadTransferRecords();
            } else {
                showMessage("error", "操作失败: " + data.error);
            }
        } catch (error) {
            showMessage("error", "操作失败");
        } finally {
            setMatchConfirming(false);
        }
    }, [loadTransferData, loadTransferRecords, showMessage]);

    // 取消匹配（将 pending_match_user_id 清空）
    const handleCancelAssign = useCallback(async (productId: string) => {
        if (!confirm("确定要取消此匹配吗？取消后产品将回到待匹配列表。")) return;
        setAssigningMatch(true);
        try {
            const res = await authFetch("/api/products/match/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId }),
            });
            const data = await res.json();
            if (data.success) {
                showMessage("success", "已取消匹配，产品回到待匹配列表");
                loadTransferData();
            } else {
                showMessage("error", "取消失败: " + (data.message || data.error || "未知错误"));
            }
        } catch (error) {
            showMessage("error", "取消匹配失败");
        } finally {
            setAssigningMatch(false);
        }
    }, [loadTransferData, showMessage]);

    // 服务商回购产品
    const handleRepurchase = useCallback(async (productId: string) => {
        setAssigningMatch(true);
        try {
            const res = await authFetch("/api/products/repurchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId }),
            });
            const data = await res.json();
            if (data.success) {
                showMessage("success", "回购成功，产品已回到在售列表");
                setRepurchaseConfirm({ show: false, productId: '', productName: '', price: 0 });
                loadTransferData();
            } else {
                showMessage("error", "回购失败: " + (data.message || data.error || "未知错误"));
            }
        } catch (error) {
            showMessage("error", "回购操作失败");
        } finally {
            setAssigningMatch(false);
        }
    }, [loadTransferData, showMessage]);

    // 批量一键匹配
    const handleBatchConfirm = useCallback(async () => {
        const assignedProducts = matchProducts.filter((p: any) => p.pending_match_user_id);
        if (assignedProducts.length === 0) {
            showMessage("error", "没有待确认的匹配");
            return;
        }
        setBatchConfirming(true);
        try {
            const res = await authFetch("/api/products/match/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productIds: assignedProducts.map((p: any) => p.id) }),
            });
            const data = await res.json();
            if (data.success) {
                const results = data.data?.results || [];
                const successCount = results.filter((r: any) => r.success).length;
                const failCount = results.filter((r: any) => !r.success).length;
                showMessage("success", `批量匹配完成: 成功 ${successCount} 个${failCount > 0 ? `，失败 ${failCount} 个（余额不足）` : ""}`);
                loadTransferData();
            } else {
                showMessage("error", "操作失败: " + data.error);
            }
        } catch (error) {
            showMessage("error", "操作失败");
        } finally {
            setBatchConfirming(false);
        }
    }, [matchProducts, loadTransferData, showMessage]);

    // 加载提现数据
    const loadWithdrawalData = useCallback(async () => {
        const providerId = localStorage.getItem("userId");
        if (!providerId) return;

        try {
            const res = await authFetch(`/api/provider/withdrawals?providerId=${providerId}`);
            const data = await res.json();
            if (data.success) {
                setPendingWithdrawals(data.data || []);
            }
        } catch (error) {
            console.error("加载提现数据失败:", error);
        }

        // 同时加载待审核转账
        try {
            const res = await authFetch(`/api/energy/review-transfer?providerId=${providerId}&status=pending`);
            const data = await res.json();
            if (data.success) {
                setPendingTransferRequests(data.data || []);
            }
        } catch (error) {
            console.error("加载转账审核数据失败:", error);
        }
    }, []);

    // 初始加载待审核转账和提现数据
    useEffect(() => {
        if (user) {
            loadWithdrawalData();
        }
    }, [user, loadWithdrawalData]);

    // 轮询：当有任意待审核状态时，每5秒自动刷新
    useEffect(() => {
        const hasPendingBuy = pendingBuyOrders.length > 0;
        const hasPendingMatch = matchProducts.filter((p: any) => !p.pending_match_user_id).length > 0;
        const hasPendingWithdrawal = pendingWithdrawals.length > 0;

        if (!hasPendingBuy && !hasPendingMatch && !hasPendingWithdrawal) return;

        const interval = setInterval(() => {
            loadPendingBuyOrders();
            loadWithdrawalData();
        }, 5000);

        return () => clearInterval(interval);
    }, [pendingBuyOrders, matchProducts, pendingWithdrawals, loadPendingBuyOrders, loadWithdrawalData]);

    // 资金流水tab/翻页切换时加载
    useEffect(() => {
        if (activeTab === "capitalFlow") {
            loadCapitalFlow();
        }
    }, [activeTab, capitalFlowTab, capitalFlowPage]);

    // 加载积分记录
    const loadPointsRecords = useCallback(async () => {
        try {
            const response = await authFetch(`/api/provider/points-records`);
            const data = await response.json();
            if (data.success && data.data) {
                setPointsRecords(data.data.records || []);
                setPointsStats(data.data.stats || { total_convert: 0, total_exchange: 0, available_points: 0 });
            }
        } catch (error) {
            console.error("加载积分记录失败:", error);
        }
    }, []);

    const loadConvertRecords = useCallback(async () => {
        try {
            const response = await authFetch(`/api/provider/convert-records`);
            const data = await response.json();
            if (data.success && data.data) {
                setConvertRecords(data.data.records || []);
                setConvertStats(data.data.stats || { totalConverted: 0, totalEnergy: 0, totalPoints: 0, count: 0 });
            }
        } catch (error) {
            console.error("加载转换记录失败:", error);
        }
    }, []);

    // 全局刷新：并行加载所有数据，确保操作后实时更新
    const refreshAll = useCallback(async (delay = 500) => {
        // 延迟确保数据库写入完成后再读取，避免 PostgREST 缓存返回旧数据
        await new Promise(r => setTimeout(r, delay));
        await Promise.allSettled([
            refreshUser(),
            loadData(),
            loadRevenueRecords(),
            loadTransferRecords(),
            loadWithdrawRecords(),
            loadWithdrawalData(),
            loadEnergyRequests(),
            loadPointsRecords(),
            loadConvertRecords(),
            loadWithdrawalRecords(),
            activeTab === 'capitalFlow' ? loadCapitalFlow() : Promise.resolve(),
        ]);
    }, [refreshUser, loadData, loadRevenueRecords, loadTransferRecords, loadWithdrawRecords, loadWithdrawalData, loadEnergyRequests, loadPointsRecords, loadConvertRecords, loadWithdrawalRecords, activeTab, loadCapitalFlow]);

    // 积分转入收益
    const handlePointsToEnergy = async () => {
        const amount = parseFloat(pointsConvertAmount);
        if (isNaN(amount) || amount <= 0) {
            showMessage("error", "请输入有效的积分数量");
            return;
        }
        if (amount > (Number(user?.points) || 0)) {
            showMessage("error", "积分不足");
            return;
        }

        setSubmitting(true);
        try {
            const userId = localStorage.getItem("userId");
            const response = await authFetch("/api/member/points-to-energy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, points: amount }),
            });
            const data = await response.json();
            if (data.success) {
                showMessage("success", `转换成功！${amount}积分 → ${amount}收益`);
                setShowPointsToEnergyDialog(false);
                setPointsConvertAmount("");
                refreshAll();
            } else {
                showMessage("error", data.error || "转换失败");
            }
        } catch (error) {
            showMessage("error", "转换失败");
        } finally {
            setSubmitting(false);
        }
    };

    // 流转审核处理
    const handleTransferReview = async (transferId: string, action: 'approve' | 'reject') => {
        const providerId = localStorage.getItem("userId");
        if (!providerId) return;

        setSubmitting(true);
        try {
            const response = await authFetch("/api/products/transfer/review", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    transferId,
                    action,
                }),
            });
            const data = await response.json();
            if (data.success) {
                showMessage("success", data.message);
                loadTransferData();
            } else {
                showMessage("error", data.error || "审核失败");
            }
        } catch (error) {
            showMessage("error", "网络错误");
        } finally {
            setSubmitting(false);
        }
    };

    // 回购处理（旧版，保留兼容）
    // 提现确认处理
    const handleWithdrawalConfirm = async (withdrawalId: string, action: 'approve' | 'reject') => {
        const providerId = localStorage.getItem("userId");
        if (!providerId) return;

        setSubmitting(true);
        try {
            const response = await authFetch("/api/withdrawals/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    withdrawalId,
                    providerId,
                    action,
                }),
            });
            const data = await response.json();
            if (data.success) {
                showMessage("success", data.message);
                loadWithdrawalData();
            } else {
                showMessage("error", data.error || "操作失败");
            }
        } catch (error) {
            showMessage("error", "网络错误");
        } finally {
            setSubmitting(false);
        }
    };

    // 审核收益转账申请
    const handleEnergyTransferReview = async (requestId: string, action: 'approve' | 'reject') => {
        const providerId = localStorage.getItem("userId");
        if (!providerId) return;

        setSubmitting(true);
        try {
            const response = await authFetch("/api/energy/review-transfer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requestId,
                    providerId,
                    action,
                }),
            });
            const data = await response.json();
            if (data.success) {
                showMessage("success", data.message);
                setShowTransferReviewDialog(false);
                setSelectedTransferRequest(null);
                loadWithdrawalData();
                refreshAll();
            } else {
                showMessage("error", data.error || "操作失败");
            }
        } catch (error) {
            showMessage("error", "网络错误");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReviewApplication = async (
        applicationId: string,
        action: "approve" | "reject",
        quotaAllocated?: number
    ) => {
        const providerId = localStorage.getItem("userId");

        if (!providerId)
            return;

        setSubmitting(true);

        try {
            const response = await authFetch("/api/provider-applications/review", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    applicationId,
                    reviewerId: providerId,
                    action,
                    quotaAllocated: action === "approve" ? (quotaAllocated || 50000) : undefined
                })
            });

            const data = await response.json();

            if (data.success) {
                showMessage("success", data.message || "审核完成");
                refreshAll();
            } else {
                showMessage("error", data.error || "审核失败");
            }
        } catch (error) {
            showMessage("error", "网络错误");
        } finally {
            setSubmitting(false);
        }
    };

    const handleApplyQuota = async () => {
        const providerId = localStorage.getItem("userId");
        const storedUserData = localStorage.getItem("userData");
        const userData = storedUserData ? JSON.parse(storedUserData) : null;

        if (!providerId)
            return;

        if (!applyQuotaAmount || parseFloat(applyQuotaAmount) < 5000) {
            showMessage("error", "申请额度不能少于5,000元");
            return;
        }

        const branchId = userData?.branch_id;

        if (!branchId) {
            showMessage("error", "您还未绑定服务网点，无法申请额度");
            return;
        }

        setSubmitting(true);

        try {
            const response = await authFetch("/api/quota-requests", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    requesterId: providerId,
                    requesterType: "provider",
                    parentId: branchId,
                    requestedAmount: parseFloat(applyQuotaAmount),
                    bonusRate: 100
                })
            });

            const data = await response.json();

            if (data.success) {
                showMessage("success", data.message || "额度申请已提交，请等待服务网点审核");
                setShowQuotaApplyDialog(false);
                setApplyQuotaAmount("");
                refreshAll();
            } else {
                showMessage("error", data.error || "申请失败");
            }
        } catch (error) {
            showMessage("error", "网络错误");
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-16 h-16 text-purple-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100">
            {}
            {message && <div
                className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl ${message.type === "success" ? "bg-gradient-to-r from-green-500 to-emerald-500" : "bg-gradient-to-r from-red-500 to-rose-500"} text-white shadow-xl animate-pulse`}>
                {message.text}
            </div>}
            {}
            {/* 顶部装饰条 */}
            <div className="h-1.5 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500"></div>
            
            <header className="bg-gradient-to-r from-purple-900 via-purple-800 to-fuchsia-800 shadow-xl sticky top-0 z-40">
                <div className="container mx-auto px-3 md:px-6 py-3 md:py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 md:gap-4">
                            <div
                                className="w-9 h-9 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                                <Users className="w-5 h-5 md:w-7 md:h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-base md:text-2xl font-bold text-white tracking-wide">服务商管理后台</h1>
                                <p className="text-xs text-purple-200 hidden md:block">Provider Management System</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4">
                            <div className="hidden md:flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-purple-100 text-sm">在线</span>
                            </div>
                            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 shadow-lg text-xs">
                                <Star className="w-3 h-3 mr-1" />服务商
                                              </Badge>
                            <Button 
                                variant="ghost" 
                                onClick={logout}
                                className="text-white hover:bg-white/20 hover:text-white text-sm">
                                <LogOut className="w-4 h-4 mr-1" />退出
                            </Button>
                        </div>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-3 md:px-6 py-4 md:py-8">
                {}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 mb-4 md:mb-8">
                    <Card className="mobile-compact-card bg-gradient-to-br from-white to-orange-50 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                        <CardContent className="p-3 md:pt-5">
                            <div className="flex items-center justify-between mb-1.5 md:mb-3">
                                <div className="p-1.5 md:p-2.5 bg-gradient-to-br from-orange-400 to-orange-500 rounded-lg md:rounded-xl shadow-lg">
                                    <Zap className="w-4 h-4 md:w-5 md:h-5 text-white" />
                                </div>
                                <span className="text-[10px] md:text-xs font-medium text-orange-600 bg-orange-100 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">额度</span>
                            </div>
                            <p className="text-lg md:text-2xl font-bold mt-1 md:mt-2 text-gradient bg-gradient-to-r from-orange-600 to-orange-700">¥{(stats.available_quota || 0).toLocaleString()}
                            </p>
                            <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">可用额度</p>
                        </CardContent>
                    </Card>
                    <Card className="mobile-compact-card bg-gradient-to-br from-white to-yellow-50 border-yellow-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                        <CardContent className="p-3 md:pt-5">
                            <div className="flex items-center justify-between mb-1.5 md:mb-3">
                                <div className="p-1.5 md:p-2.5 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg md:rounded-xl shadow-lg">
                                    <Package className="w-4 h-4 md:w-5 md:h-5 text-white" />
                                </div>
                                <span className="text-[10px] md:text-xs font-medium text-yellow-600 bg-yellow-100 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">待上架</span>
                            </div>
                            <p className="text-lg md:text-2xl font-bold mt-1 md:mt-2 text-gradient bg-gradient-to-r from-yellow-600 to-amber-600">{stats.pending_count}</p>
                            <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">待上架Token</p>
                        </CardContent>
                    </Card>
                    <Card className="mobile-compact-card bg-gradient-to-br from-white to-green-50 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                        <CardContent className="p-3 md:pt-5">
                            <div className="flex items-center justify-between mb-1.5 md:mb-3">
                                <div className="p-1.5 md:p-2.5 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg md:rounded-xl shadow-lg">
                                    <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-white" />
                                </div>
                                <span className="text-[10px] md:text-xs font-medium text-green-600 bg-green-100 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">已上架</span>
                            </div>
                            <p className="text-lg md:text-2xl font-bold mt-1 md:mt-2 text-gradient bg-gradient-to-r from-green-600 to-emerald-600">{stats.available_count}</p>
                            <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">可售Token</p>
                        </CardContent>
                    </Card>
                    <Card className="mobile-compact-card bg-gradient-to-br from-white to-blue-50 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                        <CardContent className="p-3 md:pt-5">
                            <div className="flex items-center justify-between mb-1.5 md:mb-3">
                                <div className="p-1.5 md:p-2.5 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg md:rounded-xl shadow-lg">
                                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-white" />
                                </div>
                                <span className="text-[10px] md:text-xs font-medium text-blue-600 bg-blue-100 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">总额</span>
                            </div>
                            <p className="text-lg md:text-2xl font-bold mt-1 md:mt-2 text-gradient bg-gradient-to-r from-blue-600 to-indigo-600">¥{(stats.total_value || 0).toLocaleString()}
                            </p>
                            <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">Token总值</p>
                        </CardContent>
                    </Card>
                    {/* 收益卡片 */}
                    <Card className="mobile-compact-card col-span-2 md:col-span-1 bg-gradient-to-br from-purple-600 via-fuchsia-600 to-purple-700 border-0 shadow-xl">
                        <CardContent className="p-3 md:pt-5">
                            <div className="flex items-center justify-between mb-1.5 md:mb-3">
                                <div className="p-1.5 md:p-2.5 bg-white/20 backdrop-blur rounded-lg md:rounded-xl">
                                    <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-white" />
                                </div>
                                <span className="text-[10px] md:text-xs font-medium text-purple-200 bg-white/10 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full backdrop-blur">收益</span>
                            </div>
                            <p className="text-lg md:text-2xl font-bold mt-1 md:mt-2 text-white">¥{(user?.energy_value || 0).toLocaleString()}</p>
                            <p className="text-[10px] md:text-xs text-purple-200 mt-0.5 md:mt-1">累计智算金</p>
                        </CardContent>
                    </Card>

                </div>
                {}
                {stats.pending_count > 0 && <Card className="mb-6 border-0 bg-gradient-to-r from-yellow-100 via-amber-100 to-orange-100 shadow-xl">
                    <CardContent className="py-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-lg">
                                    <AlertCircle className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="font-bold text-lg text-yellow-800">您有 {stats.pending_count}个待上架Token</p>
                                    <p className="text-sm text-yellow-600">点击一键上架，让会员可以购买您的Token</p>
                                </div>
                            </div>
                            <Button
                                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg px-6"
                                onClick={handleListAllProducts}
                                disabled={submitting}>
                                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}一键上架
                                                </Button>
                        </div>
                    </CardContent>
                </Card>}
                {}
                <div className="space-y-3 md:space-y-6">
                    {/* Tab导航 - 紫色主题胶囊式 - 移动端横向滚动 */}
                    <div className="bg-white rounded-2xl shadow-lg p-1.5 md:p-2">
                        <div className="mobile-tab-nav flex flex-nowrap gap-1 overflow-x-auto scrollbar-hide -mx-2 px-2">
                            <button
                                onClick={() => { setActiveTab("profile"); loadPaymentInfo(); }}
                                className={`px-4 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 font-medium text-sm whitespace-nowrap ${activeTab === "profile" || activeTab === "password" ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-200" : "text-gray-600 hover:bg-purple-50"}`}>
                                <User className="w-4 h-4" />我的资料
                            </button>
                            <button
                                onClick={() => { setActiveTab("chain"); loadChainData(); }}
                                className={`px-4 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 font-medium text-sm whitespace-nowrap ${activeTab === "chain" ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-200" : "text-gray-600 hover:bg-purple-50"}`}>
                                <Network className="w-4 h-4" />关系链
                            </button>
                            <button
                                onClick={() => setActiveTab("overview")}
                                className={`px-4 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 font-medium text-sm whitespace-nowrap ${activeTab === "overview" ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-200" : "text-gray-600 hover:bg-purple-50"}`}>
                                <TrendingUp className="w-4 h-4" />概览
                            </button>
                            <button
                                onClick={() => setActiveTab("power")}
                                className={`px-4 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 font-medium text-sm whitespace-nowrap ${activeTab === "power" ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-200" : "text-gray-600 hover:bg-purple-50"}`}>
                                <Cpu className="w-4 h-4" />Token值管理
                            </button>
                            <button
                                onClick={() => setActiveTab("applications")}
                                className={`px-4 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 font-medium text-sm whitespace-nowrap ${activeTab === "applications" ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-200" : "text-gray-600 hover:bg-purple-50"}`}>
                                <ClipboardList className="w-4 h-4" />审核申请
                                          {applications.length > 0 && <Badge className="ml-1 bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs shadow-lg animate-pulse">{applications.length}</Badge>}
                            </button>
                            <button
                                onClick={() => { setActiveTab("revenue"); loadRevenueRecords(); }}
                                className={`px-4 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 font-medium text-sm whitespace-nowrap ${activeTab === "revenue" ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-200" : "text-gray-600 hover:bg-green-50"}`}>
                                <Wallet className="w-4 h-4" />收益管理
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab("points");
                                    loadPointsRecords();
                                }}
                                className={`px-4 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 font-medium text-sm whitespace-nowrap ${activeTab === "points" ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-200" : "text-gray-600 hover:bg-amber-50"}`}>
                                <Gift className="w-4 h-4" />我的积分
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab("pointsShop");
                                    if (pointsShopProducts.length === 0) {
                                        setPointsShopLoading(true);
                                        authFetch('/api/points-products?status=active').then(r => r.json()).then(data => { if (data.success) setPointsShopProducts(data.data || []); }).catch(console.error).finally(() => setPointsShopLoading(false));
                                    }
                                }}
                                className={`px-4 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 font-medium text-sm whitespace-nowrap ${activeTab === "pointsShop" ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-200" : "text-gray-600 hover:bg-amber-50"}`}>
                                <ShoppingBag className="w-4 h-4" />积分商城
                            </button>
                            <button
                                onClick={() => { setActiveTab("capitalFlow"); loadCapitalFlow(); }}
                                className={`px-4 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 font-medium text-sm whitespace-nowrap ${activeTab === "capitalFlow" ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-200" : "text-gray-600 hover:bg-teal-50"}`}>
                                <ArrowRightLeft className="w-4 h-4" />资金流水
                            </button>
                            <button
                                onClick={() => setActiveTab("product-showcase")}
                                className={`px-4 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 font-medium text-sm whitespace-nowrap ${activeTab === "product-showcase" ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-blue-200" : "text-gray-600 hover:bg-blue-50"}`}>
                                <Package className="w-4 h-4" />产品展示
                            </button>
                        </div>
                    </div>

                    {/* 我的资料 */}
                    {activeTab === "profile" && (
                        <Card className="mobile-compact-card bg-gradient-to-br from-white to-purple-50 border-purple-200 shadow-xl">
                            <CardHeader className="bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-t-lg">
                                <CardTitle className="text-white flex items-center gap-2">
                                    <User className="w-5 h-5" />我的资料
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* 基本信息 */}
                                    <div className="space-y-4">
                                        <h3 className="font-medium text-lg border-b pb-2">基本信息</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between py-2 border-b">
                                                <span className="text-gray-500">用户ID</span>
                                                <span className="font-mono text-sm font-bold text-purple-700">{(user as any)?.unique_id || user?.id?.slice(0,8) || '-'}</span>
                                            </div>
                                            <div className="flex items-center justify-between py-2 border-b">
                                                <span className="text-gray-500">用户名</span>
                                                {editingUsername ? (
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            value={newUsername}
                                                            onChange={(e) => setNewUsername(e.target.value)}
                                                            className="w-32 h-8 text-sm"
                                                            maxLength={20}
                                                        />
                                                        <Button size="sm" onClick={handleSaveUsername} disabled={savingUsername}>
                                                            {savingUsername ? <Loader2 className="w-4 h-4 animate-spin" /> : '保存'}
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => { setEditingUsername(false); setNewUsername(user?.username || ''); }}>
                                                            取消
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{user?.username || '-'}</span>
                                                        <Button size="sm" variant="ghost" onClick={() => setEditingUsername(true)}>
                                                            <span className="text-blue-500 text-xs">修改</span>
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between py-2 border-b">
                                                <span className="text-gray-500">角色</span>
                                                <Badge className="bg-purple-100 text-purple-700">服务商</Badge>
                                            </div>
                                            <div className="flex items-center justify-between py-2 border-b">
                                                <span className="text-gray-500">手机号</span>
                                                <span>{user?.phone || '-'}</span>
                                            </div>
                                            <div className="flex items-center justify-between py-2 border-b">
                                                <span className="text-gray-500">登录密码</span>
                                                <Button size="sm" variant="outline" onClick={() => setActiveTab("password")}>
                                                    <Lock className="w-4 h-4 mr-1" />修改密码
                                                </Button>
                                            </div>
                                            <div className="flex items-center justify-between py-2 border-b">
                                                <span className="text-gray-500">邀请码</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm font-bold text-purple-700">{user?.invite_code || (user as any)?.unique_id || '-'}</span>
                                                    {user?.invite_code && (
                                                        <Button size="sm" variant="ghost" onClick={() => {
                                                            navigator.clipboard.writeText(user.invite_code || '');
                                                            showMessage('success', '邀请码已复制到剪贴板');
                                                        }}>
                                                            <span className="text-blue-500 text-xs">复制</span>
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 收款信息 */}
                                    <div className="space-y-4">
                                        <h3 className="font-medium text-lg border-b pb-2 flex items-center gap-2">
                                            <Wallet className="w-5 h-5 text-green-600" />收款信息
                                        </h3>
                                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                            <p className="text-sm text-blue-700">
                                                <strong>提示：</strong>请填写您的收款信息，方便会员线下转账确认。
                                            </p>
                                        </div>

                                        {/* 支付宝信息 */}
                                        <div className="space-y-3">
                                            <h4 className="font-medium flex items-center gap-2">
                                                <span className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">支</span>
                                                支付宝
                                            </h4>
                                            <div>
                                                <Label className="text-sm text-gray-600">支付宝账号</Label>
                                                <Input
                                                    value={alipayAccount}
                                                    onChange={(e) => setAlipayAccount(e.target.value)}
                                                    className="mt-1"
                                                    placeholder="请输入支付宝账号"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm text-gray-600">真实姓名（与支付宝一致）</Label>
                                                <Input
                                                    value={user?.real_name || ''}
                                                    onChange={(e) => {
                                                        const newUser = { ...user, real_name: e.target.value } as typeof user;
                                                        setUser(newUser);
                                                        const userDataStr = localStorage.getItem('userData');
                                                        if (userDataStr) {
                                                            const userData = JSON.parse(userDataStr);
                                                            userData.real_name = e.target.value;
                                                            localStorage.setItem('userData', JSON.stringify(userData));
                                                        }
                                                    }}
                                                    className="mt-1"
                                                    placeholder="请输入真实姓名"
                                                />
                                            </div>
                                        </div>

                                        {/* 微信信息 */}
                                        <div className="space-y-3 pt-3 border-t">
                                            <h4 className="font-medium flex items-center gap-2">
                                                <span className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">微</span>
                                                微信
                                            </h4>
                                            <div>
                                                <Label className="text-sm text-gray-600">微信账号</Label>
                                                <Input
                                                    value={wechatAccount}
                                                    onChange={(e) => setWechatAccount(e.target.value)}
                                                    className="mt-1"
                                                    placeholder="请输入微信账号"
                                                />
                                            </div>
                                        </div>

                                        {/* 付款码上传 */}
                                        <div className="space-y-3 pt-3 border-t">
                                            <h4 className="font-medium flex items-center gap-2">
                                                <span className="w-7 h-7 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs">码</span>
                                                付款码上传
                                            </h4>
                                            <p className="text-xs text-gray-500">上传您的支付宝或微信付款码图片，方便会员扫码转账</p>
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-purple-500 transition-colors">
                                                {paymentQRCode ? (
                                                    <div className="relative">
                                                        <img src={paymentQRCode} alt="付款码" className="max-h-36 mx-auto rounded" />
                                                        <Button variant="destructive" size="sm" className="mt-2" onClick={() => setPaymentQRCode(null)}>删除</Button>
                                                    </div>
                                                ) : (
                                                    <label className="cursor-pointer">
                                                        <div className="py-6">
                                                            <Upload className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                                                            <p className="text-sm text-gray-500">点击上传付款码</p>
                                                            <p className="text-xs text-gray-400 mt-1">支持 JPG、PNG 格式</p>
                                                        </div>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    const reader = new FileReader();
                                                                    reader.onload = (event) => {
                                                                        setPaymentQRCode(event.target?.result as string);
                                                                    };
                                                                    reader.readAsDataURL(file);
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        </div>

                                        <Button className="w-full bg-purple-600 hover:bg-purple-700 mt-2" onClick={handleSavePaymentInfo}>
                                            保存收款信息
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 修改密码 */}
                    {activeTab === "password" && (
                        <Card className="mobile-compact-card bg-gradient-to-br from-white to-purple-50 border-purple-200 shadow-xl">
                            <CardHeader className="bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-t-lg">
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Lock className="w-5 h-5" />修改登录密码
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                                    <div className="space-y-2">
                                        <Label>当前密码</Label>
                                        <div className="relative">
                                            <Input
                                                type={showOldPassword ? "text" : "password"}
                                                value={oldPassword}
                                                onChange={(e) => setOldPassword(e.target.value)}
                                                placeholder="请输入当前密码"
                                                className="pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowOldPassword(!showOldPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>新密码</Label>
                                        <div className="relative">
                                            <Input
                                                type={showNewPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="请输入新密码（至少6位）"
                                                className="pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>确认新密码</Label>
                                        <div className="relative">
                                            <Input
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="请再次输入新密码"
                                                className="pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <Button
                                            type="submit"
                                            disabled={changingPassword}
                                            className="flex-1 bg-gradient-to-r from-purple-600 to-fuchsia-600"
                                        >
                                            {changingPassword ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : (
                                                <Lock className="w-4 h-4 mr-2" />
                                            )}
                                            {changingPassword ? "修改中..." : "确认修改"}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setActiveTab("profile")}
                                        >
                                            返回
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    )}

                    {/* 关系链Tab */}
                    {activeTab === "chain" && (
                        <div className="space-y-4">
                            {chainLoading ? (
                                <Card>
                                    <CardContent className="py-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
                                        <p className="mt-4 text-gray-500">加载中...</p>
                                    </CardContent>
                                </Card>
                            ) : chainData ? (
                                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-white">
                                            <Network className="w-5 h-5 text-purple-400" />
                                            我的关系链
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {/* 关系说明 */}
                                        <div className="space-y-4">
                                            {/* 服务商关系链：智算中心 → 服务网点 → 服务商 */}
                                            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                                <h4 className="text-purple-400 font-medium mb-3 flex items-center gap-2">
                                                    <Badge className="bg-purple-600 text-white text-xs">服务商</Badge>
                                                    关系链说明
                                                </h4>
                                                <div className="flex flex-wrap items-center gap-2 text-slate-300 text-sm">
                                                    <span>智算中心</span>
                                                    <ArrowRight className="w-4 h-4 text-slate-500" />
                                                    <span>{chainData.branch?.username ? chainData.branch.username.replace('服务网点', '服务网点') : '服务网点'}</span>
                                                    <ArrowRight className="w-4 h-4 text-slate-500" />
                                                    <span className="text-purple-400 font-medium">{chainData.self?.username || '我'}</span>
                                                    <ArrowRight className="w-4 h-4 text-slate-500" />
                                                    <span className="text-green-400">我的会员</span>
                                                </div>
                                            </div>

                                            {/* 专属邀请码 & 分享链接 */}
                                            <div className="p-4 bg-gradient-to-r from-purple-900/60 to-fuchsia-900/60 rounded-xl border border-purple-700/50">
                                                <h4 className="text-purple-300 font-medium mb-3 flex items-center gap-2">
                                                    <Share2 className="w-4 h-4" />
                                                    专属邀请码 & 分享链接
                                                </h4>
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-slate-400 text-sm">邀请码</span>
                                                        <span className="font-mono text-lg font-bold text-white bg-purple-700/50 px-3 py-1 rounded-lg">{user?.invite_code || (user as any)?.unique_id || '-'}</span>
                                                        <Button size="sm" variant="outline" className="border-purple-600 text-purple-300 hover:bg-purple-800" onClick={() => {
                                                            const code = user?.invite_code || (user as any)?.unique_id || '';
                                                            navigator.clipboard.writeText(code);
                                                            showMessage('success', '邀请码已复制');
                                                        }}>
                                                            复制邀请码
                                                        </Button>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-slate-400 text-sm">分享链接</span>
                                                        <span className="text-xs text-purple-200 truncate max-w-[200px]">{typeof window !== 'undefined' ? `${window.location.origin}/?invite=${user?.invite_code || (user as any)?.unique_id || ''}` : ''}</span>
                                                        <Button size="sm" variant="outline" className="border-fuchsia-600 text-fuchsia-300 hover:bg-fuchsia-800" onClick={() => {
                                                            const code = user?.invite_code || (user as any)?.unique_id || '';
                                                            const link = `${window.location.origin}/?invite=${code}`;
                                                            navigator.clipboard.writeText(link);
                                                            showMessage('success', '分享链接已复制，发给好友即可自动填充邀请码');
                                                        }}>
                                                            复制链接
                                                        </Button>
                                                    </div>
                                                    <p className="text-slate-500 text-xs">好友通过分享链接注册，邀请码将自动填充</p>
                                                </div>
                                            </div>

                                            {/* 关系详情列表 */}
                                            <div className="space-y-3">
                                                {/* 服务网点 */}
                                                {chainData.branch && (
                                                    <div className="flex items-center gap-3 p-3 bg-blue-900/30 rounded-lg border border-blue-800/50">
                                                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                                                            <Award className="w-5 h-5 text-white" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-blue-400 font-medium">{chainData.branch.username?.replace('服务网点', '服务网点') || '服务网点'}</p>
                                                            <p className="text-slate-400 text-sm">上级：智算中心</p>
                                                        </div>
                                                        <Badge className="bg-blue-600 text-white">服务网点</Badge>
                                                    </div>
                                                )}

                                                {/* 当前服务商 */}
                                                <div className="flex items-center gap-3 p-3 bg-purple-900/30 rounded-lg border border-purple-800/50">
                                                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                                                        <Server className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-purple-400 font-bold">{chainData.self?.username}</p>
                                                        <p className="text-slate-400 text-sm">
                                                            下级：{chainData.members?.length || 0} 个会员
                                                        </p>
                                                    </div>
                                                    <Badge className="bg-purple-600 text-white">服务商</Badge>
                                                </div>

                                                {/* 下级会员管理 */}
                                                {chainData.members && chainData.members.length > 0 && (
                                                    <div className="p-4 bg-green-900/20 rounded-lg border border-green-800/50">
                                                        <p className="text-green-400 font-medium mb-4 flex items-center gap-2">
                                                            <Users className="w-4 h-4" />
                                                            我的会员 ({chainData.members.length})
                                                        </p>
                                                        {/* 统计卡片 */}
                                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                                            <div className="p-3 bg-slate-800/60 rounded-lg text-center">
                                                                <p className="text-slate-400 text-xs mb-1">会员总数</p>
                                                                <p className="text-white text-lg font-bold">{chainData.members.length}</p>
                                                            </div>
                                                            <div className="p-3 bg-slate-800/60 rounded-lg text-center">
                                                                <p className="text-slate-400 text-xs mb-1">总智算金</p>
                                                                <p className="text-amber-400 text-lg font-bold">{chainData.members.reduce((sum: number, m: any) => sum + (m.energyValue || 0), 0).toLocaleString()}</p>
                                                            </div>
                                                            <div className="p-3 bg-slate-800/60 rounded-lg text-center">
                                                                <p className="text-slate-400 text-xs mb-1">总持有额度</p>
                                                                <p className="text-green-400 text-lg font-bold">¥{chainData.members.reduce((sum: number, m: any) => sum + (m.totalAmount || 0), 0).toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                        {/* 会员明细卡片 */}
                                                        <div className="space-y-3">
                                                            {chainData.members.map((member: any) => (
                                                                <div key={member.id} className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/50">
                                                                    {/* 会员身份信息 */}
                                                                    <div className="flex items-center gap-3 mb-3">
                                                                        <div className="w-10 h-10 rounded-full bg-green-600/30 flex items-center justify-center shrink-0">
                                                                            <User className="w-5 h-5 text-green-400" />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-white font-medium">{member.username}</p>
                                                                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                                                                {member.uniqueId && <span className="text-purple-400">{member.uniqueId}</span>}
                                                                                {member.phone && <span>{member.phone}</span>}
                                                                            </div>
                                                                            {member.inviterName && member.inviterName !== '-' && (
                                                                                <div className="text-xs text-slate-500 mt-0.5">推荐人: {member.inviterName}</div>
                                                                            )}
                                                                        </div>
                                                                        <span className="px-2 py-0.5 bg-green-600/20 text-green-400 text-xs rounded-full">会员</span>
                                                                    </div>
                                                                    {/* 会员数据 */}
                                                                    <div className="grid grid-cols-3 gap-3">
                                                                        <div className="bg-slate-900/50 rounded-md p-2.5 text-center">
                                                                            <p className="text-slate-500 text-xs mb-1">智算金</p>
                                                                            <p className="text-amber-400 text-base font-bold">{(member.energyValue || 0).toLocaleString()}</p>
                                                                        </div>
                                                                        <div className="bg-slate-900/50 rounded-md p-2.5 text-center">
                                                                            <p className="text-slate-500 text-xs mb-1">持有产品</p>
                                                                            <p className="text-purple-400 text-base font-bold">{member.productCount || 0}<span className="text-xs font-normal ml-0.5">个</span></p>
                                                                        </div>
                                                                        <div className="bg-slate-900/50 rounded-md p-2.5 text-center">
                                                                            <p className="text-slate-500 text-xs mb-1">持有额度</p>
                                                                            <p className="text-green-400 text-base font-bold">¥{(member.totalAmount || 0).toLocaleString()}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 无下级会员提示 */}
                                                {(!chainData.members || chainData.members.length === 0) && (
                                                    <div className="text-center py-6 text-slate-500">
                                                        <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                                        <p>暂无下级会员</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 无上级提示 */}
                                            {!chainData.branch && !chainData.inviter && (
                                                <div className="text-center py-6 text-slate-500">
                                                    <Network className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                                    <p>您还没有关联上级</p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card>
                                    <CardContent className="py-12 text-center">
                                        <Network className="w-12 h-12 mx-auto text-gray-300" />
                                        <p className="mt-4 text-gray-500">暂无关系链数据</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {activeTab === "overview" && <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="mobile-compact-card bg-gradient-to-br from-white to-blue-50 border-blue-200 shadow-lg">
                            <CardHeader className="pb-2">
                                <h3 className="font-bold text-lg flex items-center gap-2 text-blue-700">
                                    <Zap className="w-5 h-5" />快捷操作
                                </h3>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <div className="space-y-3">
                                    {(stats.available_quota || 0) >= 100 && <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                                        <p className="text-sm text-blue-700 font-medium mb-2">您有可用的额度: ¥{(stats.available_quota || 0).toLocaleString()}</p>
                                        <p className="text-xs text-blue-500">前往额度管理，一键生成Token</p>
                                    </div>}
                                    {stats.pending_count > 0 && <Button
                                        onClick={handleListAllProducts}
                                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg"
                                        disabled={submitting}>
                                        <CheckCircle className="w-4 h-4 mr-2" />一键上架 {stats.pending_count}个Token
                                                              </Button>}
                                    <Button
                                        onClick={() => { setActiveTab("power"); setPowerSubTab("quota"); }}
                                        variant="outline"
                                        className="w-full border-purple-300 text-purple-600 hover:bg-purple-50">
                                        <Database className="w-4 h-4 mr-2" />查看额度分配
                                                            </Button>
                                    <Button
                                        onClick={() => { setActiveTab("power"); setPowerSubTab("products"); }}
                                        variant="outline"
                                        className="w-full border-fuchsia-300 text-fuchsia-600 hover:bg-fuchsia-50">
                                        <Package className="w-4 h-4 mr-2" />管理Token
                                                            </Button>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="mobile-compact-card bg-gradient-to-br from-white to-purple-50 border-purple-200 shadow-lg">
                            <CardHeader className="pb-2">
                                <h3 className="font-bold text-lg flex items-center gap-2 text-purple-700">
                                    <TrendingUp className="w-5 h-5" />Token流转说明
                                </h3>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <div className="space-y-4 text-sm">
                                    <div className="flex items-start gap-3">
                                        <div
                                            className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center flex-shrink-0">1</div>
                                        <div>
                                            <p className="font-medium">收到额度分配</p>
                                            <p className="text-gray-500">服务网点为您分配Token额度</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div
                                            className="w-6 h-6 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center flex-shrink-0">2</div>
                                        <div>
                                            <p className="font-medium">生成Token</p>
                                            <p className="text-gray-500">5万额度生成15个价格不等的Token</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div
                                            className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center flex-shrink-0">3</div>
                                        <div>
                                            <p className="font-medium">一键上架</p>
                                            <p className="text-gray-500">Token上架后会员即可购买</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div
                                            className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center flex-shrink-0">4</div>
                                        <div>
                                            <p className="font-medium">会员购买</p>
                                            <p className="text-gray-500">会员购买后您获得收益</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>}
                    {}
                    {activeTab === "power" && <div className="space-y-3 md:space-y-6">
                        {/* Token管理子Tab导航 */}
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setPowerSubTab('quota')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${powerSubTab === 'quota' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-purple-50'}`}>
                                <Database className="w-3.5 h-3.5 inline mr-1" />Token值概览
                            </button>
                            <button onClick={() => { setPowerSubTab('products'); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${powerSubTab === 'products' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-purple-50'}`}>
                                <Package className="w-3.5 h-3.5 inline mr-1" />Token列表
                            </button>
                            <button onClick={() => { setPowerSubTab('sales'); loadSalesRecords(); loadTransferRecords(transferStartDate, transferEndDate); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${powerSubTab === 'sales' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-purple-50'}`}>
                                <TrendingUp className="w-3.5 h-3.5 inline mr-1" />销售记录
                            </button>
                            <button onClick={() => { setPowerSubTab('buyorders'); loadPendingBuyOrders(); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${powerSubTab === 'buyorders' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-purple-50'}`}>
                                <ShoppingCart className="w-3.5 h-3.5 inline mr-1" />购买审核
                                {pendingBuyOrders.length > 0 && <Badge className="ml-1 bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs shadow-lg animate-pulse">{pendingBuyOrders.length}</Badge>}
                            </button>
                            <button onClick={() => { setPowerSubTab('transfers'); loadTransferData(); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${powerSubTab === 'transfers' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-purple-50'}`}>
                                <ArrowLeftRight className="w-3.5 h-3.5 inline mr-1" />流转审核
                            </button>
                        </div>

                        {/* 额度概览 */}
                        {powerSubTab === "quota" && <div className="space-y-3 md:space-y-6">
                        {}
                        {/* 额度统计卡片 */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                            <Card className="bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white">
                                <CardContent className="p-3 md:py-4">
                                    <p className="text-purple-100 text-xs md:text-sm">Token总值</p>
                                    <p className="text-lg md:text-2xl font-bold mt-0.5 md:mt-1">¥{(stats.total_quota || 0).toLocaleString()}</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
                                <CardContent className="p-3 md:py-4">
                                    <p className="text-blue-100 text-xs md:text-sm">已使用Token值</p>
                                    <p className="text-lg md:text-2xl font-bold mt-0.5 md:mt-1">¥{(stats.used_quota || 0).toLocaleString()}</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                                <CardContent className="p-3 md:py-4">
                                    <p className="text-green-100 text-xs md:text-sm">闲置Token值</p>
                                    <p className="text-lg md:text-2xl font-bold mt-0.5 md:mt-1">¥{(stats.available_quota || 0).toLocaleString()}</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white">
                                <CardContent className="p-3 md:py-4">
                                    <p className="text-orange-100 text-xs md:text-sm">可生成Token存储包</p>
                                    <p className="text-lg md:text-2xl font-bold mt-0.5 md:mt-1">¥{(stats.available_quota || 0).toLocaleString()}</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* 快速生成产品卡片 */}
                        {(stats.available_quota || 0) >= 100 ? (
                            <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-fuchsia-50">
                                <CardContent className="py-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-2xl shadow-lg">
                                                <Zap className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-lg text-purple-800">可用额度 ¥{(stats.available_quota || 0).toLocaleString()}</p>
                                                <p className="text-sm text-purple-600">选择模板和金额生成Token产品</p>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={openGenerateDialog}
                                            className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 shadow-lg px-6"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />生成Token
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="border-gray-200 bg-gray-50">
                                <CardContent className="py-6 text-center">
                                    <AlertCircle className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                                    <p className="text-gray-500">可用额度不足，需达到100元才能生成产品</p>
                                    <p className="text-sm text-gray-400 mt-1">当前可用：¥{(stats.available_quota || 0).toLocaleString()}</p>
                                </CardContent>
                            </Card>
                        )}


                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>收到的额度分配</CardTitle>
                                    <Button 
                                        onClick={() => { loadQuotaRequests(); setShowQuotaRequestDialog(true); }} 
                                        className="bg-orange-600"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />申请额度
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b bg-gray-50">
                                                <th className="text-left py-3 px-4">分配额度</th>
                                                <th className="text-left py-3 px-4">已用额度</th>
                                                <th className="text-left py-3 px-4">剩余额度</th>
                                                <th className="text-left py-3 px-4">状态</th>
                                                <th className="text-left py-3 px-4">时间</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allocations.map(allocation => {
                                                const remaining = allocation.quota_amount - allocation.used_amount;

                                                return (
                                                    <tr key={allocation.id} className="border-b hover:bg-gray-50">
                                                        <td className="py-3 px-4 text-green-600 font-medium">¥{(allocation.quota_amount || 0).toLocaleString()}
                                                        </td>
                                                        <td className="py-3 px-4 text-orange-600">¥{(allocation.used_amount || 0).toLocaleString()}
                                                        </td>
                                                        <td className="py-3 px-4 text-blue-600 font-medium">¥{remaining.toLocaleString()}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <Badge
                                                                className={allocation.status === "active" ? "bg-green-100 text-green-700" : allocation.status === "completed" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}>
                                                                {allocation.status === "active" ? "可使用" : allocation.status === "completed" ? "已完成" : allocation.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-gray-500">
                                                            {allocation.created_at ? new Date(allocation.created_at).toLocaleDateString() : '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {allocations.length === 0 && <tr>
                                                <td colSpan={5} className="py-8 text-center text-gray-500">暂无额度分配，请点击右上角按钮申请额度</td>
                                            </tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 额度申请记录 */}
                        <Card>
                            <CardHeader>
                                <CardTitle>我的额度申请记录</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b bg-gray-50">
                                                <th className="text-left py-3 px-4">申请金额</th>
                                                <th className="text-left py-3 px-4">批准金额</th>
                                                <th className="text-left py-3 px-4">申请时间</th>
                                                <th className="text-left py-3 px-4">状态</th>
                                                <th className="text-left py-3 px-4">备注</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {quotaRequests.map(request => (
                                                <tr key={request.id} className="border-b hover:bg-gray-50">
                                                    <td className="py-3 px-4 text-orange-600 font-medium">
                                                        ¥{(request.requested_amount || 0).toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-green-600 font-medium">
                                                        {request.status === 'approved' ? `¥${(request.approved_amount || 0).toLocaleString()}` : '-'}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-600">
                                                        {new Date(request.created_at).toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <Badge className={
                                                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                            request.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                            'bg-red-100 text-red-700'
                                                        }>
                                                            {request.status === 'pending' ? '待审批' : request.status === 'approved' ? '已通过' : '已拒绝'}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-500 text-sm">
                                                        {request.note || '-'}
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
                    </div>}
                    {powerSubTab === "products" && <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <CardTitle>我的Token</CardTitle>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-gray-500">产品总数：<span className="text-purple-600 font-bold">{products.length}</span></span>
                                        <span className="text-gray-500">产品总额：<span className="text-green-600 font-bold">¥{products.reduce((sum, p) => sum + (p.price || 0), 0).toLocaleString()}</span></span>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={loadData}>
                                        <RefreshCw className="w-4 h-4 mr-1" />刷新
                                    </Button>
                                </div>
                            </div>
                            {/* 产品分区Tab */}
                            <div className="flex items-center gap-2 mt-3 border-b pb-2">
                                {[
                                    { key: 'available', label: '已上架', count: products.filter((p: any) => p.status === 'available').length, color: 'green' },
                                    { key: 'unlisted', label: '未上架', count: products.filter((p: any) => p.status === 'draft' || p.status === 'unlisted').length, color: 'orange' },
                                    { key: 'pending_match', label: '待匹配', count: products.filter((p: any) => p.status === 'pending_match').length, color: 'purple' },
                                    { key: 'sold', label: '已出售', count: products.filter((p: any) => p.status === 'sold' || p.status === 'pending_sell' || p.status === 'pending_confirm').length, color: 'blue' },
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => { setProductListTab(tab.key); setSelectedProductIds([]); }}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                            productListTab === tab.key
                                                ? tab.color === 'green' ? 'bg-green-600 text-white shadow-md'
                                                  : tab.color === 'orange' ? 'bg-orange-500 text-white shadow-md'
                                                  : tab.color === 'purple' ? 'bg-purple-600 text-white shadow-md'
                                                  : 'bg-blue-600 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {tab.label}
                                        <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                                            productListTab === tab.key ? 'bg-white/30' : 'bg-gray-200'
                                        }`}>{tab.count}</span>
                                    </button>
                                ))}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* 已上架产品 */}
                            {productListTab === 'available' && (() => {
                                const availableProducts = products.filter((p: any) => p.status === 'available');
                                return (
                                    <div className="overflow-x-auto">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={availableProducts.length > 0 && availableProducts.every((p: any) => selectedProductIds.includes(p.id))}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedProductIds(availableProducts.map((p: any) => p.id));
                                                        } else {
                                                            setSelectedProductIds([]);
                                                        }
                                                    }}
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-sm text-gray-500">全选</span>
                                                {availableProducts.length > 0 && <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleListAllProducts} disabled={submitting}><CheckCircle className="w-4 h-4 mr-1" />一键上架全部</Button>}
                                            </div>
                                            <span className="text-sm text-gray-500">共 {availableProducts.length} 件，总额 ¥{availableProducts.reduce((s: number, p: any) => s + (p.price || 0), 0).toLocaleString()}</span>
                                        </div>
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b bg-gray-50">
                                                    <th className="text-left py-3 px-4 w-10"></th>
                                                    <th className="text-left py-3 px-4">Token名称</th>
                                                    <th className="text-left py-3 px-4">价格</th>
                                                    <th className="text-left py-3 px-4">周期</th>
                                                    <th className="text-left py-3 px-4">收益率</th>
                                                    <th className="text-left py-3 px-4">创建时间</th>
                                                    <th className="text-left py-3 px-4">操作</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {availableProducts.map((product: any) => (
                                                    <tr key={product.id} className="border-b hover:bg-gray-50">
                                                        <td className="py-3 px-4">
                                                            <input type="checkbox" checked={selectedProductIds.includes(product.id)} onChange={(e) => {
                                                                if (e.target.checked) setSelectedProductIds([...selectedProductIds, product.id]);
                                                                else setSelectedProductIds(selectedProductIds.filter(id => id !== product.id));
                                                            }} className="w-4 h-4" />
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div><p className="font-medium">Token存储包 {product.code}</p></div>
                                                        </td>
                                                        <td className="py-3 px-4 text-green-600 font-medium">¥{(product.price || 0).toLocaleString()}</td>
                                                        <td className="py-3 px-4">{product.period}天</td>
                                                        <td className="py-3 px-4">
                                                            <div className="text-sm">
                                                                <span className="text-green-600">收益{product.profit_rate}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-gray-500">{product.created_at?.slice(0, 10)}</td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-1">
                                                                <Button size="sm" variant="ghost" className="text-purple-600 hover:text-purple-800" onClick={() => handleOpenMatchDialog(product)}>
                                                                    <UserPlus className="w-4 h-4 mr-1" />匹配
                                                                </Button>
                                                                <Button size="sm" variant="ghost" className="text-orange-600 hover:text-orange-800" onClick={() => handleUnlistProduct(product.id, product.name)}>
                                                                    <ArrowDownToLine className="w-4 h-4 mr-1" />下架
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {availableProducts.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-gray-500">暂无已上架产品</td></tr>}
                                            </tbody>
                                        </table>
                                        {selectedProductIds.length > 0 && availableProducts.some((p: any) => selectedProductIds.includes(p.id)) && (
                                            <div className="flex items-center gap-3 p-3 bg-blue-50 border-t mt-2">
                                                <span className="text-sm text-blue-700">已选 {selectedProductIds.filter(id => availableProducts.some((p: any) => p.id === id)).length} 个产品</span>
                                                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleBatchUnlistProducts}>
                                                    <ArrowDownToLine className="w-4 h-4 mr-1" />批量下架
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => setSelectedProductIds([])}>取消选择</Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* 未上架产品 */}
                            {productListTab === 'unlisted' && (() => {
                                const unlistedProducts = products.filter((p: any) => p.status === 'draft' || p.status === 'unlisted');
                                return (
                                    <div className="overflow-x-auto">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={unlistedProducts.length > 0 && unlistedProducts.every((p: any) => selectedProductIds.includes(p.id))}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedProductIds(unlistedProducts.map((p: any) => p.id));
                                                        } else {
                                                            setSelectedProductIds([]);
                                                        }
                                                    }}
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-sm text-gray-500">全选</span>
                                            </div>
                                            <span className="text-sm text-gray-500">共 {unlistedProducts.length} 件，总额 ¥{unlistedProducts.reduce((s: number, p: any) => s + (p.price || 0), 0).toLocaleString()}</span>
                                        </div>
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b bg-gray-50">
                                                    <th className="text-left py-3 px-4 w-10"></th>
                                                    <th className="text-left py-3 px-4">Token名称</th>
                                                    <th className="text-left py-3 px-4">价格</th>
                                                    <th className="text-left py-3 px-4">周期</th>
                                                    <th className="text-left py-3 px-4">收益率</th>
                                                    <th className="text-left py-3 px-4">创建时间</th>
                                                    <th className="text-left py-3 px-4">操作</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {unlistedProducts.map((product: any) => (
                                                    <tr key={product.id} className="border-b hover:bg-gray-50">
                                                        <td className="py-3 px-4">
                                                            <input type="checkbox" checked={selectedProductIds.includes(product.id)} onChange={(e) => {
                                                                if (e.target.checked) setSelectedProductIds([...selectedProductIds, product.id]);
                                                                else setSelectedProductIds(selectedProductIds.filter(id => id !== product.id));
                                                            }} className="w-4 h-4" />
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div><p className="font-medium">Token存储包 {product.code}</p></div>
                                                        </td>
                                                        <td className="py-3 px-4 text-green-600 font-medium">¥{(product.price || 0).toLocaleString()}</td>
                                                        <td className="py-3 px-4">{product.period}天</td>
                                                        <td className="py-3 px-4">
                                                            <div className="text-sm">
                                                                <span className="text-green-600">收益{product.profit_rate}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-gray-500">{product.created_at?.slice(0, 10)}</td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-1">
                                                                <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-800" onClick={() => handleListProduct(product.id, product.name)}>
                                                                    <ArrowUpFromLine className="w-4 h-4 mr-1" />上架
                                                                </Button>
                                                                <Button size="sm" variant="ghost" className="text-purple-600 hover:text-purple-800" onClick={() => handleOpenMatchDialog(product)}>
                                                                    <UserPlus className="w-4 h-4 mr-1" />匹配
                                                                </Button>
                                                                <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-800" onClick={() => handleDeleteProduct(product.id, product.name)}>
                                                                    <Trash2 className="w-4 h-4 mr-1" />删除
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {unlistedProducts.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-gray-500">暂无未上架产品</td></tr>}
                                            </tbody>
                                        </table>
                                        {selectedProductIds.length > 0 && unlistedProducts.some((p: any) => selectedProductIds.includes(p.id)) && (
                                            <div className="flex items-center gap-3 p-3 bg-blue-50 border-t mt-2">
                                                <span className="text-sm text-blue-700">已选 {selectedProductIds.filter(id => unlistedProducts.some((p: any) => p.id === id)).length} 个产品</span>
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleBatchListProducts}>
                                                    <ArrowUpFromLine className="w-4 h-4 mr-1" />批量上架
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={handleBatchDeleteProducts}>
                                                    <Trash2 className="w-4 h-4 mr-1" />批量删除
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => setSelectedProductIds([])}>取消选择</Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* 待匹配产品 */}
                            {productListTab === 'pending_match' && (() => {
                                const pendingMatchProducts = products.filter((p: any) => p.status === 'pending_match');
                                return (
                                    <div className="overflow-x-auto">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm text-gray-500">共 {pendingMatchProducts.length} 件，总额 ¥{pendingMatchProducts.reduce((s: number, p: any) => s + (p.price || 0), 0).toLocaleString()}</span>
                                        </div>
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b bg-gray-50">
                                                    <th className="text-left py-3 px-4">Token名称</th>
                                                    <th className="text-left py-3 px-4">价格</th>
                                                    <th className="text-left py-3 px-4">周期</th>
                                                    <th className="text-left py-3 px-4">收益率</th>
                                                    <th className="text-left py-3 px-4">匹配会员</th>
                                                    <th className="text-left py-3 px-4">创建时间</th>
                                                    <th className="text-left py-3 px-4">操作</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pendingMatchProducts.map((product: any) => (
                                                    <tr key={product.id} className="border-b hover:bg-gray-50">
                                                        <td className="py-3 px-4">
                                                            <div><p className="font-medium">Token存储包 {product.code}</p></div>
                                                        </td>
                                                        <td className="py-3 px-4 text-green-600 font-medium">¥{(product.price || 0).toLocaleString()}</td>
                                                        <td className="py-3 px-4">{product.period}天</td>
                                                        <td className="py-3 px-4">
                                                            <span className="text-green-600">收益{product.profit_rate}%</span>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            {product.pending_match_user_id ? (
                                                                <span className="text-purple-600 font-medium">已指定</span>
                                                            ) : (
                                                                <span className="text-gray-400">未指定</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-gray-500">{product.created_at?.slice(0, 10)}</td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-1">
                                                                <Button size="sm" variant="ghost" className="text-purple-600 hover:text-purple-800" onClick={() => handleOpenMatchDialog(product)}>
                                                                    <UserPlus className="w-4 h-4 mr-1" />匹配
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {pendingMatchProducts.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-gray-500">暂无待匹配产品</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })()}

                            {/* 已出售产品 */}
                            {productListTab === 'sold' && (() => {
                                const soldProducts = products.filter((p: any) => p.status === 'sold' || p.status === 'pending_sell' || p.status === 'pending_confirm');
                                return (
                                    <div className="overflow-x-auto">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm text-gray-500">共 {soldProducts.length} 件，总额 ¥{soldProducts.reduce((s: number, p: any) => s + (p.price || 0), 0).toLocaleString()}</span>
                                        </div>
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b bg-gray-50">
                                                    <th className="text-left py-3 px-4">Token名称</th>
                                                    <th className="text-left py-3 px-4">价格</th>
                                                    <th className="text-left py-3 px-4">周期</th>
                                                    <th className="text-left py-3 px-4">收益率</th>
                                                    <th className="text-left py-3 px-4">状态</th>
                                                    <th className="text-left py-3 px-4">持有人</th>
                                                    <th className="text-left py-3 px-4">创建时间</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {soldProducts.map((product: any) => (
                                                    <tr key={product.id} className="border-b hover:bg-gray-50">
                                                        <td className="py-3 px-4">
                                                            <div><p className="font-medium">Token存储包 {product.code}</p></div>
                                                        </td>
                                                        <td className="py-3 px-4 text-green-600 font-medium">¥{(product.price || 0).toLocaleString()}</td>
                                                        <td className="py-3 px-4">{product.period}天</td>
                                                        <td className="py-3 px-4">
                                                            <div className="text-sm">
                                                                <span className="text-green-600">收益{product.profit_rate}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <Badge className={
                                                                product.status === "sold" ? "bg-blue-100 text-blue-700" :
                                                                product.status === "pending_sell" ? "bg-purple-100 text-purple-700" :
                                                                product.status === "pending_confirm" ? "bg-yellow-100 text-yellow-700" :
                                                                "bg-gray-100 text-gray-700"
                                                            }>
                                                                {product.status === "sold" ? "已出售" :
                                                                 product.status === "pending_sell" ? "待流转" :
                                                                 product.status === "pending_confirm" ? "待确认" : "已出售"}
                                                            </Badge>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            {product.holder ? (
                                                                <div className="text-sm">
                                                                    <p className="font-medium">{product.holder.username}</p>
                                                                    {product.holder.unique_id && <p className="text-xs text-gray-400">[{product.holder.unique_id}]</p>}
                                                                    {product.holder.phone && <p className="text-xs text-gray-400">{product.holder.phone.slice(0,3)}****{product.holder.phone.slice(-4)}</p>}
                                                                </div>
                                                            ) : <span className="text-gray-400">-</span>}
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-gray-500">{product.created_at?.slice(0, 10)}</td>
                                                    </tr>
                                                ))}
                                                {soldProducts.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-gray-500">暂无已出售产品</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>}

                    {/* 销售记录 */}
                    {powerSubTab === "sales" && <div className="space-y-3 md:space-y-6">
                        {/* 统计卡片 */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <Card className="bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white">
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Package className="w-5 h-5" />
                                        <span className="text-sm opacity-80">总产品数</span>
                                    </div>
                                    <p className="text-2xl font-bold">{salesStats.total || 0}</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShoppingBag className="w-5 h-5" />
                                        <span className="text-sm opacity-80">已售出</span>
                                    </div>
                                    <p className="text-2xl font-bold">{salesStats.sold || 0}</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-5 h-5" />
                                        <span className="text-sm opacity-80">待确认</span>
                                    </div>
                                    <p className="text-2xl font-bold">{salesStats.pending || 0}</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-5 h-5" />
                                        <span className="text-sm opacity-80">在售</span>
                                    </div>
                                    <p className="text-2xl font-bold">{salesStats.available || 0}</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-rose-500 to-pink-600 text-white">
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-5 h-5" />
                                        <span className="text-sm opacity-80">销售总额</span>
                                    </div>
                                    <p className="text-2xl font-bold">¥{(salesStats.totalAmount || 0).toLocaleString()}</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* 筛选和列表 */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>产品销售记录</CardTitle>
                                    <div className="flex gap-2">
                                        <select
                                            className="px-3 py-2 border rounded-lg text-sm"
                                            value={salesFilter}
                                            onChange={e => {
                                                const newFilter = e.target.value;
                                                setSalesFilter(newFilter);
                                                loadSalesRecords(newFilter);
                                            }}>
                                            <option value="all">全部状态</option>
                                            <option value="available">在售</option>
                                            <option value="sold">已售出</option>
                                            <option value="pending">待确认</option>
                                        </select>
                                        <Button variant="outline" onClick={() => loadSalesRecords()}>
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
                                                <th className="text-left py-3 px-4">Token存储包</th>
                                                <th className="text-left py-3 px-4">价格</th>
                                                <th className="text-left py-3 px-4">周期</th>
                                                <th className="text-left py-3 px-4">状态</th>
                                                <th className="text-left py-3 px-4">持有人</th>
                                                <th className="text-left py-3 px-4">购买日期</th>
                                                <th className="text-left py-3 px-4">到期日期</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {salesRecords.map(record => (
                                                <tr key={record.productId} className="border-b hover:bg-gray-50">
                                                    <td className="py-3 px-4">
                                                        <div>
                                                            <p className="font-medium">{record.name}</p>
                                                            <p className="text-sm text-gray-500">{record.code}</p>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-green-600 font-medium">
                                                        ¥{(record.price || 0).toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4">{record.period}天</td>
                                                    <td className="py-3 px-4">
                                                        <Badge className={
                                                            record.productStatus === "available" ? "bg-green-100 text-green-700" :
                                                            record.productStatus === "sold" ? "bg-blue-100 text-blue-700" :
                                                            record.productStatus === "pending_sell" ? "bg-amber-100 text-amber-700" :
                                                            record.productStatus === "pending_confirm" ? "bg-yellow-100 text-yellow-700" :
                                                            "bg-gray-100 text-gray-700"
                                                        }>
                                                            {record.productStatus === "available" ? "在售" :
                                                             record.productStatus === "sold" ? "已售出" :
                                                             record.productStatus === "pending_sell" ? "流转中" :
                                                             record.productStatus === "pending_confirm" ? "待确认" :
                                                             record.productStatus}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {record.holder ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                                                    <User className="w-4 h-4 text-purple-600" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-sm">{record.holder.name}</p>
                                                                    <p className="text-xs text-gray-500">{record.holder.phone}</p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 text-sm">-</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-gray-500">
                                                        {record.holder?.purchaseDate?.slice(0, 10) || '-'}
                                                    </td>
                                                    <td className="py-3 px-4 text-sm">
                                                        {record.holder?.expireDate ? (
                                                            <span className={
                                                                new Date(record.holder.expireDate) < new Date() ? 'text-red-600' : 'text-gray-600'
                                                            }>
                                                                {record.holder.expireDate.slice(0, 10)}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                            {salesRecords.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="py-8 text-center text-gray-500">
                                                        暂无销售记录
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                        {/* 产品流转记录 */}
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base">产品流转记录</CardTitle>
                                    <Button size="sm" variant="outline" className="gap-1" onClick={exportTransferExcel}>
                                        <Download className="w-4 h-4" />
                                        导出Excel
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* 时间筛选栏 */}
                                <div className="flex flex-wrap items-end gap-3 mb-4 p-3 bg-muted/50 rounded-lg">
                                    <div>
                                        <label className="text-xs text-muted-foreground block mb-1">开始日期</label>
                                        <Input type="date" className="w-40 h-8 text-sm" value={transferStartDate} onChange={e => setTransferStartDate(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground block mb-1">结束日期</label>
                                        <Input type="date" className="w-40 h-8 text-sm" value={transferEndDate} onChange={e => setTransferEndDate(e.target.value)} />
                                    </div>
                                    <Button size="sm" className="h-8" onClick={() => loadTransferRecords(transferStartDate, transferEndDate)}>查询</Button>
                                    <Button size="sm" variant="outline" className="h-8" onClick={() => {
                                        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
                                        setTransferStartDate(twoDaysAgo);
                                        setTransferEndDate(new Date().toISOString().slice(0, 10));
                                        setTimeout(() => loadTransferRecords(), 100);
                                    }}>近2天</Button>
                                    <span className="text-xs text-muted-foreground ml-auto">
                                        {transferRecords.length > 0 && `共 ${transferRecords.length} 条记录`}
                                    </span>
                                </div>
                                {/* 流转记录表格 */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="text-left py-2 px-3">产品编号</th>
                                                <th className="text-left py-2 px-3">产品名称</th>
                                                <th className="text-left py-2 px-3">产品金额</th>
                                                <th className="text-left py-2 px-3">周期</th>
                                                <th className="text-left py-2 px-3">到期收益率</th>
                                                <th className="text-left py-2 px-3">到期收益</th>
                                                <th className="text-left py-2 px-3">卖方(A)</th>
                                                <th className="text-left py-2 px-3">买方(B)</th>
                                                <th className="text-left py-2 px-3">A的收益</th>
                                                <th className="text-left py-2 px-3">流转类型</th>
                                                <th className="text-left py-2 px-3">流转时间</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transferRecords.map((record, idx) => (
                                                <tr key={idx} className="border-b hover:bg-muted/30">
                                                    <td className="py-2 px-3 font-mono text-xs">{record.productCode}</td>
                                                    <td className="py-2 px-3 text-xs">{record.productName || '-'}</td>
                                                    <td className="py-2 px-3 text-green-600 font-medium">¥{(record.productPrice || 0).toLocaleString()}</td>
                                                    <td className="py-2 px-3 text-xs">{record.period}天</td>
                                                    <td className="py-2 px-3 text-xs">{record.profitRate}%</td>
                                                    <td className="py-2 px-3 text-xs">¥{(record.expectedProfit || 0).toLocaleString()}</td>
                                                    <td className="py-2 px-3">
                                                        <div>
                                                            <p className="font-medium text-xs">{record.sellerName || '-'}</p>
                                                            <p className="text-xs text-muted-foreground">{record.sellerUniqueId || ''} {record.sellerPhone ? `(${record.sellerPhone?.slice(0, 3)}****${record.sellerPhone?.slice(-4)})` : ''}</p>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <div>
                                                            <p className="font-medium text-xs">{record.buyerName || '-'}</p>
                                                            <p className="text-xs text-muted-foreground">{record.buyerUniqueId || ''} {record.buyerPhone ? `(${record.buyerPhone?.slice(0, 3)}****${record.buyerPhone?.slice(-4)})` : ''}</p>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-3 text-orange-600 font-medium">¥{(record.sellerProfit || 0).toLocaleString()}</td>
                                                    <td className="py-2 px-3">
                                                        <Badge className={
                                                            record.flowType === 'provider_match' ? 'bg-green-100 text-green-700' :
                                                            record.flowType === '抢购' ? 'bg-blue-100 text-blue-700' :
                                                            record.flowType === '回流' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        }>
                                                            {record.flowType === 'provider_match' ? '首轮匹配' :
                                                             record.flowType === '抢购' ? '会员抢购' :
                                                             record.flowType === '回流' ? '服务商回购' :
                                                             record.flowType || '-'}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-2 px-3 text-xs">{record.transferTime?.slice(0, 16)?.replace('T', ' ') || '-'}</td>
                                                </tr>
                                            ))}
                                            {transferRecords.length === 0 && (
                                                <tr>
                                                    <td colSpan={11} className="py-8 text-center text-muted-foreground">
                                                        暂无流转记录
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>}
                    {/* 购买审核 */}
                    {powerSubTab === "buyorders" && <div className="space-y-3 md:space-y-6">
                        {}
                        {/* 统计卡片 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                <CardContent className="py-4">
                                    <p className="text-blue-100 text-sm">待审核订单</p>
                                    <p className="text-2xl font-bold mt-1">{pendingBuyOrders.length} 单</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                                <CardContent className="py-4">
                                    <p className="text-green-100 text-sm">已完成订单</p>
                                    <p className="text-2xl font-bold mt-1">{completedBuyOrders.length} 单</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white">
                                <CardContent className="py-4">
                                    <p className="text-orange-100 text-sm">待审核总额</p>
                                    <p className="text-2xl font-bold mt-1">¥{pendingBuyOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0).toLocaleString()}</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* 待审核订单列表 */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShoppingCart className="w-5 h-5 text-purple-600" />
                                    待审核购买订单
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {pendingBuyOrders.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                        <p>暂无待审核订单</p>
                                        <p className="text-sm text-gray-400 mt-1">会员购买产品后将在此显示</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {pendingBuyOrders.map((order) => (
                                            <div key={order.order_id} className="border border-purple-200 rounded-xl p-4 bg-gradient-to-r from-purple-50 to-fuchsia-50">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-purple-100 rounded-lg">
                                                            <ShoppingCart className="w-5 h-5 text-purple-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-800">{order.username || "未知用户"} {order.unique_id ? `(${order.unique_id})` : ''}</p>
                                                            <p className="text-sm text-gray-500">手机号: {order.phone || "未提供"}</p>
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                                        待审核
                                                    </Badge>
                                                </div>

                                                <div className="bg-white rounded-lg p-3 mb-3">
                                                    <p className="text-sm text-gray-500 mb-1">购买产品</p>
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-medium text-gray-800">{order.product_name || "未知产品"}</p>
                                                            <p className="text-xs text-gray-400">编号: {order.product_code || "无"}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-lg font-bold text-purple-600">¥{order.product_price?.toLocaleString() || order.amount?.toLocaleString() || 0}</p>
                                                            <p className="text-xs text-gray-400">{order.product_period || 0}天 · 收益{order.profit_rate || order.total_rate || 0}%</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                                                    <span>申请时间: {order.created_at ? new Date(order.created_at).toLocaleString() : "未知"}</span>
                                                    <span>订单号: {order.order_id?.slice(0, 8) || "未知"}...</span>
                                                </div>

                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={() => openBuyOrderConfirmDialog(order)}
                                                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-2" />确认收款
                                                    </Button>
                                                    <Button
                                                        onClick={() => openBuyOrderRejectDialog(order)}
                                                        variant="outline"
                                                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                                                    >
                                                        <XCircle className="w-4 h-4 mr-2" />拒绝
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 已完成订单列表 */}
                        {completedBuyOrders.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        已完成订单
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {completedBuyOrders.slice(0, 5).map((order) => (
                                            <div key={order.order_id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                                    <div>
                                                        <p className="font-medium text-gray-800">{order.username || "未知用户"} {order.unique_id ? `(${order.unique_id})` : ''}</p>
                                                        <p className="text-xs text-gray-400">{order.product_name || "未知产品"} · {order.product_period || 0}天</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold text-green-600">¥{order.product_price?.toLocaleString() || order.amount?.toLocaleString() || 0}</p>
                                                    <p className="text-xs text-gray-400">{order.updated_at ? new Date(order.updated_at).toLocaleString() : ""}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>}
                    {/* 流转审核 */}
                    {powerSubTab === "transfers" && (
                        <div className="space-y-3 md:space-y-6">
                            {/* 流转记录 - 双TAB */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <UserPlus className="w-5 h-5" />
                                            流转记录
                                        </CardTitle>
                                    </div>
                                    {/* 子TAB */}
                                    <div className="flex gap-1 mt-2 border-b pb-0">
                                        <button
                                            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${matchSubTab === 'pending' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                                            onClick={() => setMatchSubTab('pending')}
                                        >
                                            待匹配 ({matchProducts.filter((p: any) => !p.pending_match_user_id).length})
                                        </button>
                                        <button
                                            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${matchSubTab === 'review' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                                            onClick={() => setMatchSubTab('review')}
                                        >
                                            审核匹配 ({matchProducts.filter((p: any) => p.pending_match_user_id).length})
                                        </button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {/* 待匹配 TAB */}
                                    {matchSubTab === 'pending' && (
                                        <>
                                            {matchProducts.filter((p: any) => !p.pending_match_user_id).length === 0 ? (
                                                <p className="text-gray-500 text-center py-4">暂无待匹配产品</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {matchProducts.filter((p: any) => !p.pending_match_user_id).map((product: any) => (
                                                        <div key={product.id} className="border rounded-lg p-4 bg-blue-50">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <p className="font-medium">Token存储包 #{product.code || product.id?.slice(0,8)}</p>
                                                                    <p className="text-sm text-gray-500">价格: ¥{product.price?.toLocaleString()} | 周期: {product.period}天</p>
                                                                    {product.previous_holder && (
                                                                        <p className="text-sm text-orange-600">出售会员: {product.previous_holder.username} [{product.previous_holder.unique_id}]</p>
                                                                    )}
                                                                </div>
                                                                <Badge className="bg-blue-500">待匹配</Badge>
                                                            </div>
                                                            <div className="flex gap-2 mt-2">
                                                                <Button
                                                                    size="sm"
                                                                    className="bg-purple-600 hover:bg-purple-700"
                                                                    onClick={() => handleOpenMatchDialog(product)}
                                                                    disabled={assigningMatch}
                                                                >
                                                                    <UserPlus className="w-4 h-4 mr-1" /> 匹配
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    className="bg-amber-600 hover:bg-amber-700"
                                                                    onClick={() => setRepurchaseConfirm({ show: true, productId: product.id, productName: product.name || product.code, price: product.price })}
                                                                    disabled={assigningMatch}
                                                                >
                                                                    <RotateCcw className="w-4 h-4 mr-1" /> 回购
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* 审核匹配 TAB */}
                                    {matchSubTab === 'review' && (
                                        <>
                                            <div className="flex justify-end mb-3">
                                                {matchProducts.filter((p: any) => p.pending_match_user_id).length > 0 && (
                                                    <Button
                                                        size="sm"
                                                        onClick={handleBatchConfirm}
                                                        disabled={batchConfirming}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        {batchConfirming ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                                                        一键匹配成功
                                                    </Button>
                                                )}
                                            </div>
                                            {matchProducts.filter((p: any) => p.pending_match_user_id).length === 0 ? (
                                                <p className="text-gray-500 text-center py-4">暂无待审核的匹配</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {matchProducts.filter((p: any) => p.pending_match_user_id).map((product: any) => (
                                                        <div key={product.id} className="border rounded-lg p-4 bg-orange-50">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <p className="font-medium">{product.name}</p>
                                                                    <p className="text-sm text-gray-500">价格: ¥{product.price?.toLocaleString()} | 周期: {product.period}天</p>
                                                                    {product.previous_holder && (
                                                                        <p className="text-sm text-orange-600">出售会员: {product.previous_holder.username} [{product.previous_holder.unique_id}]</p>
                                                                    )}
                                                                </div>
                                                                <Badge className="bg-orange-500">待确认</Badge>
                                                            </div>
                                                            {product.pending_match_user && (
                                                                <div className="text-sm text-green-700 mb-2 bg-green-100 rounded p-2">
                                                                    已指定匹配给: {product.pending_match_user.username} [{product.pending_match_user.unique_id}] (收益: {product.pending_match_user.balance ?? 0})
                                                                </div>
                                                            )}
                                                            <div className="flex gap-2 mt-2">
                                                                <Button
                                                                    size="sm"
                                                                    className="bg-green-600 hover:bg-green-700"
                                                                    onClick={() => handleMatchConfirm(product.id)}
                                                                    disabled={matchConfirming}
                                                                >
                                                                    {matchConfirming ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                                                                    确认匹配
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleCancelAssign(product.id)}
                                                                    disabled={assigningMatch}
                                                                >
                                                                    取消匹配
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                    </div>}

                    {activeTab === "applications" && <div className="space-y-3 md:space-y-6">
                        {}
                        <Card className="border-purple-200 bg-purple-50">
                            <CardContent className="py-4">
                                <h4 className="font-medium text-purple-800 mb-2">下级服务商审核说明</h4>
                                <ul className="text-sm text-purple-600 space-y-1">
                                    <li>• 通过审核后，将从您的空闲额度中拆分给下级服务商</li>
                                    <li>• 建议分配额度为5万元的倍数</li>
                                    <li>• 您审核通过后，还需服务网点最终审核，新服务商才能正式生效</li>
                                    <li>• 服务网点审核通过后，该会员所有直推会员自动迁移到新服务商体系</li>
                                </ul>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>下级服务商申请</CardTitle>
                                    <Badge className="bg-purple-100 text-purple-700">待审核: {applications.length}个
                                                            </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {applications.length === 0 ? <div className="py-12 text-center text-gray-500">
                                    <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p>暂无待审核的申请</p>
                                </div> : <div className="space-y-4">
                                    {applications.map(
                                        app => <div key={app.id} className="p-4 border rounded-lg hover:bg-gray-50">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h4 className="font-medium">{app.applicant_name || app.real_name || "申请人"}</h4>
                                                        <Badge className="bg-blue-100 text-blue-700">第二代申请
                                                                                            </Badge>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                                        <div>
                                                            <span className="text-gray-400">用户名：</span>
                                                            {app.username || "-"}
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400">手机号：</span>
                                                            {app.phone || app.user_phone || "-"}
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400">申请额度：</span>
                                                            <span className="text-green-600 font-medium">¥{(app.quota_request || 50000).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 text-xs text-gray-400">申请时间: {new Date(app.created_at).toLocaleString()}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 ml-4">
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700"
                                                        onClick={() => {
                                                            const quota = prompt("请输入要拆分给该服务商的额度:", String(app.quota_request || 50000));
                                                            if (quota) {
                                                                handleReviewApplication(app.id, "approve", parseFloat(quota));
                                                            }
                                                        }}
                                                        disabled={submitting}>
                                                        <CheckCircle className="w-4 h-4 mr-1" />同意拆分
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => {
                                                            const reason = prompt("请输入拒绝原因:");
                                                            if (reason) {
                                                                handleReviewApplication(app.id, "reject");
                                                            }
                                                        }}
                                                        disabled={submitting}>
                                                        <XCircle className="w-4 h-4 mr-1" />拒绝
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>}
                            </CardContent>
                        </Card>
                    </div>}

                    {/* 收益管理 Tab */}
                    {activeTab === "revenue" && (
                        <div className="space-y-3 md:space-y-6">
                            {/* 收益概览卡片 - 点击弹窗选择操作 */}
                            <div 
                                className="bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow p-4"
                                onClick={() => setShowEnergyActionDialog(true)}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Wallet className="w-5 h-5" />
                                    <span className="text-sm opacity-80">智算金</span>
                                    <span className="text-xs opacity-60 ml-auto">点击操作 ›</span>
                                </div>
                                <p className="text-3xl font-bold">¥{user?.energy_value?.toLocaleString() || 0}</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                                    <div className="bg-white/10 rounded-lg p-2">
                                        <p className="text-xs opacity-70">业务奖励</p>
                                        <p className="text-sm font-bold">¥{revenueStats.totalRevenue?.toLocaleString() || 0}</p>
                                    </div>
                                    <div className="bg-white/10 rounded-lg p-2">
                                        <p className="text-xs opacity-70">直推奖励</p>
                                        <p className="text-sm font-bold">¥{revenueStats.distDirectReward?.toLocaleString() || 0}</p>
                                    </div>
                                    <div className="bg-white/10 rounded-lg p-2">
                                        <p className="text-xs opacity-70">培育奖励</p>
                                        <p className="text-sm font-bold">¥{revenueStats.distParentShare?.toLocaleString() || 0}</p>
                                    </div>
                                </div>
                            </div>

                            {/* 子Tab */}
                            <div className="flex items-center gap-2">
                                <button onClick={() => setRevenueSubTab('records')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${revenueSubTab === 'records' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-green-50'}`}>
                                    收益记录
                                </button>
                                <button onClick={() => setRevenueSubTab('withdraw')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${revenueSubTab === 'withdraw' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-green-50'}`}>
                                    收益提现
                                </button>
                            </div>

                            {/* 收益记录 Tab */}
                            {revenueSubTab === 'records' && (
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="flex items-center gap-2">
                                                <DollarSign className="w-5 h-5" />
                                                收益记录
                                            </CardTitle>
                                            <Button size="sm" variant="outline" onClick={() => { loadRevenueRecords(); }}>
                                                <RefreshCw className="w-4 h-4 mr-1" />刷新
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {revenueRecords.length === 0 ? (
                                            <p className="text-gray-500 text-center py-8">暂无收益记录</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {revenueRecords.map((record: any, index: number) => (
                                                    <div key={index} className="flex items-center justify-between border rounded-lg p-3 hover:bg-gray-50">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${record.amount > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                                                                <DollarSign className={`w-4 h-4 ${record.amount > 0 ? 'text-green-600' : 'text-red-600'}`} />
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-sm">{record.description || record.type}</p>
                                                                <p className="text-xs text-gray-500">{record.created_at?.slice(0, 16)}</p>
                                                            </div>
                                                        </div>
                                                        <span className={`font-bold ${record.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {record.amount > 0 ? '+' : ''}¥{Number(record.amount || 0).toLocaleString()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* 收益提现 Tab */}
                            {revenueSubTab === 'withdraw' && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <DollarSign className="w-5 h-5" />
                                            收益提现
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium mb-2 block">我的智算金</label>
                                            <p className="text-2xl font-bold text-green-600">¥{user?.energy_value?.toLocaleString() || 0}</p>
                                        </div>
                                        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                                            <strong>说明：</strong>提现手续费5%，提现申请后等到平台审核通过，最低提现金额100元。
                                        </div>
                                        <Button
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            onClick={() => {
                                                setWithdrawAmount("");
                                                setShowWithdrawDialog(true);
                                            }}
                                        >
                                            <DollarSign className="w-4 h-4 mr-1" />
                                            申请提现
                                        </Button>
                                        {/* 提现记录列表 */}
                                        <div className="mt-6">
                                            <h4 className="font-medium mb-3 flex items-center gap-2">
                                                <FileText className="w-4 h-4" />
                                                提现记录
                                            </h4>
                                            {withdrawalRecords.length === 0 ? (
                                                <div className="text-center text-gray-400 py-6 text-sm">暂无提现记录</div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {withdrawalRecords.map((record: any) => (
                                                        <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-red-600">-¥{Number(record.amount || 0).toLocaleString()}</span>
                                                                    <Badge className={
                                                                        record.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                                        record.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                                        record.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                                        'bg-gray-100 text-gray-700'
                                                                    }>
                                                                        {record.status === 'completed' ? '已完成' :
                                                                         record.status === 'pending' ? '待审核付款' :
                                                                         record.status === 'rejected' ? '已拒绝' : record.status}
                                                                    </Badge>
                                                                </div>
                                                                <div className="text-xs text-gray-400 mt-1">
                                                                    {record.created_at ? new Date(record.created_at).toLocaleString('zh-CN') : '-'}
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-sm text-gray-500">到账</div>
                                                                <div className="font-medium text-green-600">¥{Number(record.actual_amount || 0).toLocaleString()}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* 分配规则 Tab */}
                        </div>
                    )}

                    {/* 积分 Tab */}
                    {activeTab === "points" && (
                        <div className="space-y-3 md:space-y-6">
                            <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Gift className="w-5 h-5" />
                                        <span className="text-sm opacity-80">我的积分</span>
                                    </div>
                                    <p className="text-3xl font-bold">{Number(user?.points || 0).toLocaleString()}</p>
                                    <span className="text-xs opacity-70 mt-1">互转时5%自动转为积分，积分可用于兑换产品</span>
                                    <div className="mt-3 flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => setActiveTab("pointsShop")}
                                        >
                                            <Gift className="w-4 h-4 mr-1" />
                                            积分兑换
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 积分统计 */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card>
                                    <CardContent className="pt-4 text-center">
                                        <Gift className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                                        <p className="text-sm text-muted-foreground">累计获得积分</p>
                                        <p className="text-xl font-bold text-amber-600">{Number(pointsStats.total_convert || 0).toLocaleString()}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-4 text-center">
                                        <ArrowUpDown className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                                        <p className="text-sm text-muted-foreground">已兑换/转出</p>
                                        <p className="text-xl font-bold text-blue-600">{Number(pointsStats.total_exchange || 0).toLocaleString()}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-4 text-center">
                                        <Wallet className="w-6 h-6 mx-auto mb-2 text-green-500" />
                                        <p className="text-sm text-muted-foreground">可用积分</p>
                                        <p className="text-xl font-bold text-green-600">{Number(pointsStats.available_points || user?.points || 0).toLocaleString()}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* 积分记录 */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <History className="w-5 h-5" />
                                        积分记录
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {pointsRecords.length > 0 ? (
                                        <div className="space-y-3">
                                            {pointsRecords.map((record: any) => (
                                                <div key={record.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-full ${record.type === 'convert' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                                                            <Gift className={`w-4 h-4 ${record.type === 'convert' ? 'text-amber-500' : 'text-blue-500'}`} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`font-medium ${record.type === 'convert' ? 'text-amber-600' : 'text-blue-600'}`}>
                                                                    {record.type === 'convert' ? '+' : '-'}{Number(record.amount).toLocaleString()}
                                                                </span>
                                                                <Badge variant={record.type === 'convert' ? 'default' : 'secondary'} className="text-xs">
                                                                    {record.type === 'convert' ? '收益转化' : record.type === 'exchange' ? '兑换使用' : record.type}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">{record.note || '收益转入收益产生'}</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(record.created_at).toLocaleString('zh-CN')}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                            <p>暂无积分记录</p>
                                            <p className="text-sm mt-1">收益转入收益时自动产生积分（5%）</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* 积分商城 Tab */}
                    {activeTab === "pointsShop" && (
                        <Card className="mobile-compact-card bg-gradient-to-br from-white to-amber-50 border-amber-200 shadow-xl">
                            <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-lg">
                                <CardTitle className="text-white flex items-center gap-2">
                                    <ShoppingBag className="w-5 h-5" />积分兑换商城
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="mb-4 flex items-center justify-between bg-amber-50 rounded-lg p-3 border border-amber-200">
                                    <div className="flex items-center gap-2">
                                        <Gift className="w-5 h-5 text-amber-500" />
                                        <span className="text-sm text-amber-700">当前积分：</span>
                                        <span className="text-xl font-bold text-amber-600">{Number(user?.points || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                                {pointsShopLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                                    </div>
                                ) : pointsShopProducts.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p>暂无可兑换商品</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {pointsShopProducts.map((product: any) => {
                                            const stock = product.stock ?? 0;
                                            const exchanged = product.exchanged_count ?? 0;
                                            const remaining = stock - exchanged;
                                            const canAfford = (Number(user?.points || 0)) >= product.points_price;
                                            const hasStock = remaining > 0;
                                            return (
                                                <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow border-amber-100">
                                                    {product.image_url && (
                                                        <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                    <CardContent className="pt-3 space-y-2">
                                                        <h3 className="font-semibold text-base">{product.name}</h3>
                                                        {product.description && (
                                                            <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                                                        )}
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-amber-600 font-bold">{product.points_price} 积分</span>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${hasStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                                库存：{remaining}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center text-xs text-muted-foreground">
                                                            <span>已兑：{exchanged} / {stock}</span>
                                                            <div className="flex-1 ml-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${stock > 0 ? Math.min((exchanged / stock) * 100, 100) : 0}%` }} />
                                                            </div>
                                                        </div>
                                                        <Button
                                                            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                                                            disabled={!canAfford || !hasStock}
                                                            onClick={() => {
                                                                setExchangeProduct(product);
                                                                setExchangeForm({ name: '', phone: '', address: '' });
                                                                setShowExchangeForm(true);
                                                            }}
                                                        >
                                                            {!hasStock ? '已售罄' : !canAfford ? '积分不足' : '立即兑换'}
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* 资金流水 Tab */}
                    {activeTab === "capitalFlow" && (
                        <Card className="mobile-compact-card border-teal-200 shadow-xl">
                            <CardHeader className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-t-lg">
                                <CardTitle className="text-white flex items-center gap-2"><ArrowRightLeft className="w-5 h-5" />资金流水</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 md:p-6 space-y-4">
                                {capitalFlowLoading && <div className="text-center py-8 text-gray-500">加载中...</div>}
                                {!capitalFlowLoading && capitalFlowData && (
                                    <>
                                        {/* 统计卡片 */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="bg-blue-50 rounded-lg p-3 text-center">
                                                <p className="text-xs text-blue-600">充值总额</p>
                                                <p className="text-lg font-bold text-blue-700">{Number(capitalFlowData.stats?.total_recharge || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="bg-green-50 rounded-lg p-3 text-center">
                                                <p className="text-xs text-green-600">转入总额</p>
                                                <p className="text-lg font-bold text-green-700">{Number(capitalFlowData.stats?.total_transfer_in || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="bg-orange-50 rounded-lg p-3 text-center">
                                                <p className="text-xs text-orange-600">转出总额</p>
                                                <p className="text-lg font-bold text-orange-700">{Number(capitalFlowData.stats?.total_transfer_out || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="bg-amber-50 rounded-lg p-3 text-center">
                                                <p className="text-xs text-amber-600">转积分</p>
                                                <p className="text-lg font-bold text-amber-700">{Number(capitalFlowData.stats?.total_to_points || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="bg-red-50 rounded-lg p-3 text-center">
                                                <p className="text-xs text-red-600">提现总额</p>
                                                <p className="text-lg font-bold text-red-700">{Number(capitalFlowData.stats?.total_withdraw || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="bg-emerald-50 rounded-lg p-3 text-center">
                                                <p className="text-xs text-emerald-600">提现收入</p>
                                                <p className="text-lg font-bold text-emerald-700">{Number(capitalFlowData.stats?.total_withdraw_income || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="bg-teal-50 rounded-lg p-3 text-center">
                                                <p className="text-xs text-teal-600">卖出收益</p>
                                                <p className="text-lg font-bold text-teal-700">{Number(capitalFlowData.stats?.total_sell_profit || 0).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        {/* 类型筛选 */}
                                        <div className="flex gap-2 flex-wrap">
                                            {[
                                                { key: "all", label: "全部" },
                                                { key: "recharge", label: "充值" },
                                                { key: "transfer_out", label: "转出" },
                                                { key: "transfer_in", label: "转入" },
                                                { key: "energy_to_points", label: "转积分" },
                                                { key: "withdraw", label: "提现" },
                                                { key: "withdraw_income", label: "提现收入" },
                                                { key: "sell_profit", label: "收益" },
                                            ].map(ft => (
                                                <button key={ft.key} onClick={() => { setCapitalFlowTab(ft.key); setCapitalFlowPage(1); }}
                                                    className={`px-3 py-1 rounded-full text-xs ${capitalFlowTab === ft.key ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{ft.label}</button>
                                            ))}
                                        </div>
                                        {/* 记录列表 */}
                                        <div className="space-y-2">
                                            {(capitalFlowData.records || []).length === 0 && <div className="text-center py-8 text-gray-400">暂无记录</div>}
                                            {(capitalFlowData.records || []).map((r: any) => {
                                                const isIncoming = ['transfer_in', 'withdraw_income', 'sell_profit', 'recharge'].includes(r.flowType);
                                                return (
                                                <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
                                                            <p className="text-sm font-medium text-gray-900">{r.flowTypeLabel || r.note || r.flowType}</p>
                                                            {r.relatedUserName && <p className="text-xs text-gray-400">关联: {r.relatedUserName}</p>}
                                                            <p className="text-xs text-gray-400">{r.createdAt?.substring(0, 16)?.replace('T', ' ')}{r.note && ` · ${r.note}`}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-sm font-bold ${isIncoming ? 'text-green-600' : 'text-red-500'}`}>
                                                            {isIncoming ? '+' : '-'}{Number(r.amount).toLocaleString()}
                                                        </p>
                                                        {Number(r.feeAmount) > 0 && <p className="text-xs text-gray-400">手续费: {Number(r.feeAmount).toLocaleString()}</p>}
                                                    </div>
                                                </div>
                                                );
                                            })}
                                        </div>
                                        {/* 分页 */}
                                        {capitalFlowData.pagination && capitalFlowData.pagination.totalPages > 1 && (
                                            <div className="flex justify-center gap-2 mt-4">
                                                <button onClick={() => setCapitalFlowPage(p => Math.max(1, p - 1))} disabled={capitalFlowPage <= 1} className="px-3 py-1 rounded bg-gray-100 text-sm disabled:opacity-50">上一页</button>
                                                <span className="text-sm text-gray-500 py-1">{capitalFlowPage} / {capitalFlowData.pagination.totalPages}</span>
                                                <button onClick={() => setCapitalFlowPage(p => Math.min(capitalFlowData.pagination.totalPages, p + 1))} disabled={capitalFlowPage >= capitalFlowData.pagination.totalPages} className="px-3 py-1 rounded bg-gray-100 text-sm disabled:opacity-50">下一页</button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* 产品展示 Tab - 卡片样式 */}
                    {activeTab === "product-showcase" && (
                        <div className="space-y-3 md:space-y-6">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <h2 className="text-lg font-bold text-gray-800">产品展示</h2>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {[
                                        { key: 'all', label: '全部' },
                                        { key: 'available', label: '在售' },
                                        { key: 'sold', label: '已售' },
                                        { key: 'pending_sell', label: '流转中' },
                                        { key: 'draft', label: '未上架' },
                                    ].map(f => (
                                        <Button
                                            key={f.key}
                                            size="sm"
                                            variant="outline"
                                            className={showcaseFilter === f.key ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' : ''}
                                            onClick={() => setShowcaseFilter(f.key)}
                                        >
                                            {f.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* 统计卡片 */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
                                <Card className="bg-gradient-to-br from-slate-600 to-slate-700 text-white">
                                    <CardContent className="p-3">
                                        <p className="text-slate-200 text-xs">产品总数</p>
                                        <p className="text-xl font-bold mt-0.5">{products.length}</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                                    <CardContent className="p-3">
                                        <p className="text-green-100 text-xs">在售</p>
                                        <p className="text-xl font-bold mt-0.5">{products.filter((p: any) => p.status === 'available').length}</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                                    <CardContent className="p-3">
                                        <p className="text-blue-100 text-xs">已售出</p>
                                        <p className="text-xl font-bold mt-0.5">{products.filter((p: any) => p.status === 'sold' || p.status === 'pending_sell' || p.status === 'pending_confirm').length}</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white">
                                    <CardContent className="p-3">
                                        <p className="text-orange-100 text-xs">流转中</p>
                                        <p className="text-xl font-bold mt-0.5">{products.filter((p: any) => p.status === 'pending_sell').length}</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-gray-400 to-gray-500 text-white">
                                    <CardContent className="p-3">
                                        <p className="text-gray-100 text-xs">未上架</p>
                                        <p className="text-xl font-bold mt-0.5">{products.filter((p: any) => p.status === 'draft' || p.status === 'unlisted').length}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* 产品卡片网格 */}
                            {(() => {
                                const filtered = showcaseFilter === 'all'
                                    ? products
                                    : showcaseFilter === 'sold'
                                        ? products.filter((p: any) => p.status === 'sold' || p.status === 'pending_confirm')
                                        : products.filter((p: any) => p.status === showcaseFilter);

                                if (filtered.length === 0) {
                                    return (
                                        <div className="text-center py-12 text-gray-500">
                                            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                            <p>暂无产品数据</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                                        {filtered.map((product: any) => {
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
                                            const tier = getProductTier(product.price);
                                            const total_rate = product.total_rate || 0;
                                            const profit_rate = product.profit_rate || 0;
                                            const market_rate = product.market_rate || (total_rate - profit_rate);

                                            const getStatusInfo = (status: string) => {
                                                switch (status) {
                                                    case 'available': return { text: '在售', cls: 'bg-green-500/20 text-green-400 border-green-500/30', bottomCls: 'bg-green-500/20 border-green-500/30 text-green-400', icon: <Package className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />, desc: '在售 · 等待会员购买' };
                                                    case 'sold': return { text: '已售', cls: 'bg-slate-500/20 text-slate-400 border-slate-500/30', bottomCls: 'bg-slate-500/20 border-slate-500/30 text-slate-400', icon: <CheckCircle className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />, desc: '已售出 · 会员持有中' };
                                                    case 'pending_sell': return { text: '流转中', cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30', bottomCls: 'bg-orange-500/20 border-orange-500/30 text-orange-300', icon: <ArrowLeftRight className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />, desc: '流转中 · 等待买家购买' };
                                                    case 'pending_confirm': return { text: '待确认', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', bottomCls: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300', icon: <Clock className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />, desc: '待确认 · 等待审核' };
                                                    case 'draft': case 'unlisted': return { text: '未上架', cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30', bottomCls: 'bg-gray-500/20 border-gray-500/30 text-gray-400', icon: <Lock className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />, desc: '未上架' };
                                                    default: return { text: status, cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30', bottomCls: 'bg-gray-500/20 border-gray-500/30 text-gray-400', icon: null, desc: status };
                                                }
                                            };
                                            const st = getStatusInfo(product.status);

                                            return (
                                                <Card
                                                    key={product.id}
                                                    className={`bg-gradient-to-br ${tier.bgGradient} border-slate-700 overflow-hidden transition-all duration-300 hover:shadow-xl`}
                                                >
                                                    {/* 顶部GPU展示区域 */}
                                                    <div className="relative h-24 md:h-32 overflow-hidden">
                                                        <div className={`absolute inset-0 bg-gradient-to-br ${tier.headerBg}`}>
                                                            <div className="absolute inset-0 opacity-10" style={{
                                                                backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
                                                                backgroundSize: '20px 20px'
                                                            }} />
                                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                                        </div>

                                                        {/* GPU芯片图标 */}
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <div className={`w-12 h-12 md:w-18 md:h-18 rounded-xl md:rounded-2xl bg-gradient-to-br ${tier.iconBg} border-2 ${tier.iconBorder} flex flex-col items-center justify-center backdrop-blur-sm shadow-2xl`}>
                                                                <span className={`text-base md:text-xl font-black ${tier.iconColor}`}>GPU</span>
                                                                <span className={`text-[7px] md:text-[9px] font-bold mt-0.5 ${tier.iconColor}`}>{product.period}天</span>
                                                            </div>
                                                        </div>

                                                        {/* 等级标签 */}
                                                        <div className="absolute top-2 left-2">
                                                            <span className={`px-1.5 py-0.5 md:px-2.5 md:py-1 rounded-full text-[9px] md:text-xs font-bold ${tier.badge} border backdrop-blur-sm`}>
                                                                {tier.name}
                                                            </span>
                                                        </div>

                                                        {/* 状态标签 */}
                                                        <div className="absolute top-2 right-2">
                                                            <span className={`px-1.5 py-0.5 md:px-2.5 md:py-1 rounded-full text-[9px] md:text-xs font-bold border ${st.cls}`}>
                                                                {st.text}
                                                            </span>
                                                        </div>

                                                        {/* 产品编码 */}
                                                        <div className="absolute bottom-1.5 right-2">
                                                            <span className="px-1 py-0.5 bg-slate-900/80 rounded text-[8px] md:text-[10px] text-slate-300 font-mono backdrop-blur-sm">
                                                                {product.code || `GPU-${product.id.slice(0, 6).toUpperCase()}`}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* 产品信息区域 */}
                                                    <CardContent className="p-2.5 md:p-4">
                                                        {/* 周期+收益标签 */}
                                                        <div className="flex items-center gap-1.5 mb-2">
                                                            <Badge variant="outline" className={`${tier.badge} border text-[9px] md:text-xs px-1.5 md:px-2`}>
                                                                {product.period}天周期
                                                            </Badge>
                                                            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] md:text-xs px-1.5 md:px-2">
                                                                收益{profit_rate}%
                                                            </Badge>
                                                        </div>

                                                        {/* 核心参数 - 桌面端 */}
                                                        <div className="hidden md:grid grid-cols-1 gap-2 mb-3">
                                                            <div className={`p-2.5 rounded-lg border ${tier.color === 'blue' ? 'bg-blue-500/10 border-blue-500/30' : tier.color === 'green' ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                                                                <p className="text-[10px] text-slate-400 mb-0.5">收益</p>
                                                                <p className={`text-lg font-bold ${tier.color === 'blue' ? 'text-blue-400' : tier.color === 'green' ? 'text-green-400' : 'text-amber-400'}`}>{profit_rate}%</p>
                                                            </div>
                                                        </div>

                                                        {/* 核心参数 - 移动端 */}
                                                        <div className="flex gap-2 mb-2 md:hidden">
                                                            <div className={`flex-1 p-1.5 rounded-lg border ${tier.color === 'blue' ? 'bg-blue-500/10 border-blue-500/30' : tier.color === 'green' ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                                                                <p className={`text-sm font-bold ${tier.color === 'blue' ? 'text-blue-400' : tier.color === 'green' ? 'text-green-400' : 'text-amber-400'}`}>{profit_rate}%</p>
                                                                <p className="text-[8px] text-slate-500">收益</p>
                                                            </div>
                                                        </div>

                                                        {/* 价格 */}
                                                        <div className={`flex items-center justify-between p-2 md:p-2.5 rounded-lg mb-2 border ${tier.color === 'blue' ? 'bg-blue-500/10 border-blue-500/30' : tier.color === 'green' ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                                                            <span className="text-[9px] md:text-sm text-slate-400">价格</span>
                                                            <span className="text-sm md:text-lg font-bold text-white">¥{product.price.toLocaleString()}</span>
                                                        </div>

                                                        {/* 状态指示 */}
                                                        <div className={`p-1.5 md:p-2.5 rounded-lg border text-center text-[9px] md:text-xs ${st.bottomCls}`}>
                                                            {st.icon}{st.desc}
                                                        </div>

                                                        {/* 已售产品显示持有人 */}
                                                        {(product.status === 'sold' || product.status === 'pending_confirm') && product.holder && (
                                                            <div className="mt-2 p-1.5 md:p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[9px] md:text-xs">
                                                                <User className="w-3 h-3 inline mr-0.5" />
                                                                持有人: {product.holder.username} {product.holder.unique_id ? `[${product.holder.unique_id}]` : ''}
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* 收益充值对话框 */}
                    <Dialog open={false && showRechargeDialog} onOpenChange={setShowRechargeDialog}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>给会员充值收益</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">选择会员</label>
                                    <select
                                        className="w-full p-2 border rounded-md bg-white"
                                        value={rechargeMemberId}
                                        onChange={(e) => setRechargeMemberId(e.target.value)}
                                    >
                                        <option value="">请选择会员</option>
                                        {energyMembers.map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.username}（当前收益: {m.balance || 0}）
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">充值金额</label>
                                    <Input
                                        type="number"
                                        placeholder="请输入充值收益"
                                        value={rechargeAmount}
                                        onChange={(e) => setRechargeAmount(e.target.value)}
                                        min="1"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        您当前智算金: {user?.energy_value?.toLocaleString() || 0} | 转出后5%转化为积分，95%到账对方
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">备注（可选）</label>
                                    <Input
                                        placeholder="如: 线下收款500元"
                                        value={rechargeNote}
                                        onChange={(e) => setRechargeNote(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowRechargeDialog(false)}>
                                    取消
                                </Button>
                                <Button
                                    className="bg-purple-600"
                                    onClick={handleRechargeEnergy}
                                    disabled={submitting || !rechargeMemberId || !rechargeAmount}
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                                    确认充值
                                </Button>
                            </DialogFooter>
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
                                            const res = await authFetch('/api/points-exchange', {
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
                                                showMessage('success', '兑换成功！积分已扣除');
                                                setShowExchangeForm(false);
                                                setShowPointsShop(false);
                                                // 刷新用户数据
                                                refreshUser();
                                            } else {
                                                showMessage('error', data.message || '兑换失败');
                                            }
                                        } catch (e: any) {
                                            showMessage('error', '兑换失败：' + e.message);
                                        }
                                    }}
                                >
                                    确认兑换
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* 处理会员充值申请对话框 */}
                    <Dialog open={false && showMemberRechargeDialog} onOpenChange={(open) => {
                        setShowMemberRechargeDialog(open);
                        if (!open) setSelectedRechargeRequest(null);
                    }}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-green-600" />
                                    处理会员充值申请
                                </DialogTitle>
                            </DialogHeader>
                            {selectedRechargeRequest && (
                                <div className="space-y-4 py-4">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-gray-500">会员名称</p>
                                                <p className="font-medium">{selectedRechargeRequest.memberName || '未知'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">会员手机</p>
                                                <p className="font-medium">{selectedRechargeRequest.memberPhone || '未知'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">充值金额</p>
                                                <p className="font-medium text-green-600">+{selectedRechargeRequest.amount} 收益</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">申请时间</p>
                                                <p className="font-medium">{selectedRechargeRequest.createdAt ? new Date(selectedRechargeRequest.createdAt).toLocaleString() : '未知'}</p>
                                            </div>
                                        </div>
                                        {selectedRechargeRequest.note && (
                                            <div className="mt-3 pt-3 border-t border-green-200">
                                                <p className="text-sm text-gray-500">备注</p>
                                                <p className="font-medium">{selectedRechargeRequest.note}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                        <p className="text-sm text-yellow-700">
                                            <strong>提示：</strong>请确认已收到会员线下付款后再点击"确认充值"。确认后，收益将直接充入会员账户。
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">您的当前收益</label>
                                        <p className="text-lg font-bold text-purple-600">{user?.energy_value?.toLocaleString() || 0} 收益</p>
                                        {user && user.balance < selectedRechargeRequest.amount && (
                                            <p className="text-sm text-red-500 mt-1">余额不足，无法完成充值</p>
                                        )}
                                    </div>
                                </div>
                            )}
                            <DialogFooter>
                                <Button 
                                    variant="destructive"
                                    onClick={() => handleMemberRechargeAction(selectedRechargeRequest?.id, 'reject')}
                                    disabled={submitting}
                                >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    拒绝
                                </Button>
                                <Button 
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleMemberRechargeAction(selectedRechargeRequest?.id, 'approve')}
                                    disabled={submitting || !!(user && user.balance < selectedRechargeRequest?.amount)}
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                    确认充值
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* 智算金操作弹窗 */}
                    <Dialog open={showEnergyActionDialog} onOpenChange={setShowEnergyActionDialog}>
                        <DialogContent className="max-w-sm">
                            <DialogHeader>
                                <DialogTitle className="text-center text-xl">智算金操作</DialogTitle>
                                <DialogDescription className="text-center">当前余额：¥{user?.energy_value?.toLocaleString() || 0}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 py-2">
                                <Button
                                    className="w-full h-14 text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white"
                                    onClick={() => { setShowEnergyActionDialog(false); setShowTransferDialog(true); }}
                                >
                                    <ArrowLeftRight className="w-5 h-5 mr-2" /> 智算金互转
                                </Button>
                                <Button
                                    className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() => { setShowEnergyActionDialog(false); setShowConvertDialog(true); }}
                                >
                                    <RefreshCw className="w-5 h-5 mr-2" /> 转积分
                                </Button>
                                <Button
                                    className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => { setShowEnergyActionDialog(false); setWithdrawAmount(''); setShowWithdrawDialog(true); }}
                                >
                                    <Wallet className="w-5 h-5 mr-2" /> 提现
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

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
                                    <ArrowLeftRight className="w-5 h-5 text-purple-600" />
                                    智算金互转
                                </DialogTitle>
                                <DialogDescription>
                                    可向任意用户转账智算金，互转时5%自动转化为积分（归您），95%到账对方。最低100。
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
                                                        {u.unique_id ? `[${u.unique_id}]` : ''}
                                                    </span>
                                                    <span className="text-xs text-gray-400 ml-2">
                                                        {u.phone ? `(${u.phone})` : ''}
                                                    </span>
                                                </div>
                                                <Badge variant="outline" className={`text-xs ${
                                                    u.role === 'branch' ? 'border-blue-400 text-blue-600' :
                                                    u.role === 'provider' ? 'border-purple-400 text-purple-600' :
                                                    'border-green-400 text-green-600'
                                                }`}>
                                                    {u.role === 'branch' ? '服务网点' : u.role === 'provider' ? '服务商' : u.role === 'admin' ? '智算中心' : '会员'}
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
                                            {transferSelectedUser.unique_id ? ` [${transferSelectedUser.unique_id}]` : ''}
                                            {transferSelectedUser.phone ? ` (${transferSelectedUser.phone})` : ''}
                                        </p>
                                    </div>
                                )}

                                {/* 转账金额 */}
                                <div>
                                    <label className="text-sm font-medium mb-2 block">转账金额</label>
                                    <Input
                                        type="number"
                                        placeholder="请输入转账金额（最低100）"
                                        value={transferAmount}
                                        onChange={(e) => setTransferAmount(e.target.value)}
                                        min="100"
                                    />
                                    <div className="flex justify-between mt-1">
                                        <p className="text-xs text-gray-500">
                                            您当前智算金: ¥{user?.energy_value?.toLocaleString() || 0}
                                        </p>
                                        {transferAmount && Number(transferAmount) >= 100 && (
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
                                    disabled={submitting || !transferUserId || !transferAmount || Number(transferAmount) < 100}
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowLeftRight className="w-4 h-4 mr-2" />}
                                    确认转账
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* 智算金转积分对话框 */}
                    <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-green-600" />
                                    智算金转积分
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <p className="text-sm text-green-700">
                                        <strong>说明：</strong>将智算金按1:1转换为积分。积分未来可用于购买产品，但不可转回智算金。
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-100 rounded-lg p-3">
                                        <p className="text-xs text-gray-500">智算金余额</p>
                                        <p className="text-xl font-bold text-green-600">{user?.energy_value?.toLocaleString() || 0}</p>
                                    </div>
                                    <div className="bg-slate-100 rounded-lg p-3">
                                        <p className="text-xs text-gray-500">当前积分</p>
                                        <p className="text-xl font-bold text-purple-600">{user?.points?.toLocaleString() || 0}</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">转换金额</label>
                                    <Input
                                        type="number"
                                        placeholder="请输入要转换的智算金金额（最低10）"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        min="10"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        转换比例: 1智算金 = 1积分 | 不可逆转
                                    </p>
                                </div>
                                <Button 
                                    className="w-full bg-green-600 hover:bg-green-700" 
                                    onClick={async () => {
                                        if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
                                        
                                        const userId = localStorage.getItem("userId");
                                        setSubmitting(true);
                                        try {
                                            const res = await authFetch("/api/balance/convert-to-points", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ userId, amount: withdrawAmount }),
                                            });
                                            const data = await res.json();
                                            if (data.success) {
                                                showMessage("success", data.message);
                                                setShowConvertDialog(false);
                                                setWithdrawAmount("");
                                                // 立即刷新用户数据确保页面显示最新
                                                await refreshUser();
                                                // 延迟刷新确保数据库写入完成
                                                setTimeout(() => { refreshAll(); loadCapitalFlow(); }, 1500);
                                                setTimeout(() => { refreshAll(); loadCapitalFlow(); }, 3000);
                                            } else {
                                                showMessage("error", data.error || "转换失败");
                                            }
                                        } catch (err) {
                                            showMessage("error", "转换失败");
                                        } finally {
                                            setSubmitting(false);
                                        }
                                    }}
                                    disabled={submitting || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) < 10}
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                                    确认转换
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* 收益提现对话框 */}
                    <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-yellow-600" />
                                    收益提现
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <p className="text-sm text-yellow-700">
                                        <strong>说明：</strong>提现手续费5%，提现申请后等到平台审核通过，最低提现金额100元。
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">我的智算金</label>
                                    <p className="text-2xl font-bold text-green-600">¥{user?.energy_value?.toLocaleString() || 0}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">提现金额</label>
                                    <Input
                                        type="number"
                                        placeholder="请输入提现金额（最低100）"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        min="50"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        手续费5%: {withdrawAmount ? (parseFloat(withdrawAmount) * 0.05).toFixed(2) : "0.00"} 元 | 实际到账: {withdrawAmount ? (parseFloat(withdrawAmount) * 0.95).toFixed(2) : "0.00"} 元
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">支付宝账号</label>
                                    <Input
                                        placeholder="请输入支付宝账号"
                                        value={withdrawAlipay}
                                        onChange={(e) => setWithdrawAlipay(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">支付宝姓名</label>
                                    <Input
                                        placeholder="请输入支付宝实名姓名"
                                        value={withdrawAlipayName}
                                        onChange={(e) => setWithdrawAlipayName(e.target.value)}
                                    />
                                </div>
                                <Button 
                                    className="w-full bg-yellow-500 hover:bg-yellow-600" 
                                    onClick={async () => {
                                        const amount = parseFloat(withdrawAmount);
                                        if (!amount || amount < 100) {
                                            showMessage("error", "最低提现金额为100元");
                                            return;
                                        }
                                        if (!withdrawAlipay.trim()) {
                                            showMessage("error", "请输入支付宝账号");
                                            return;
                                        }
                                        if (!withdrawAlipayName.trim()) {
                                            showMessage("error", "请输入支付宝姓名");
                                            return;
                                        }
                                        setSubmitting(true);
                                        try {
                                            const res = await authFetch("/api/provider/withdraw", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                    userId: user?.id,
                                                    amount: withdrawAmount,
                                                    alipayAccount: withdrawAlipay?.trim() || '',
                                                    realName: withdrawAlipayName?.trim() || '',
                                                }),
                                            });
                                            const data = await res.json();
                                            if (data.success) {
                                                showMessage("success", "提现申请已提交，等待服务网点审核");
                                                setShowWithdrawDialog(false);
                                                setWithdrawAmount("");
                                                setWithdrawAlipay("");
                                                setWithdrawAlipayName("");
                                                loadData();
                                                loadWithdrawalRecords();
                                            } else {
                                                showMessage("error", data.error || "提现失败");
                                            }
                                        } catch (err) {
                                            showMessage("error", "提现失败");
                                        } finally {
                                            setSubmitting(false);
                                        }
                                    }}
                                    disabled={submitting || !withdrawAmount || parseFloat(withdrawAmount) < 100}
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
                                    确认提现
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* 收益申请对话框 */}
                    <Dialog open={false && showEnergyRequestDialog} onOpenChange={setShowEnergyRequestDialog}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-orange-600" />
                                    申请收益
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                    <p className="text-sm text-orange-700">
                                        <strong>说明：</strong>服务商需要向服务网点申请收益，用于给会员充值。
                                        申请提交后需等待服务网点审核通过。
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">申请数量</label>
                                    <Input
                                        type="number"
                                        placeholder="请输入申请的收益数量"
                                        value={energyRequestAmount}
                                        onChange={(e) => setEnergyRequestAmount(e.target.value)}
                                        min="100"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">备注（可选）</label>
                                    <Input
                                        placeholder="如: 会员充值需要"
                                        value={energyRequestNote}
                                        onChange={(e) => setEnergyRequestNote(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowEnergyRequestDialog(false)}>
                                    取消
                                </Button>
                                <Button 
                                    className="bg-orange-500 hover:bg-orange-600" 
                                    onClick={handleEnergyRequest}
                                    disabled={submitting || !energyRequestAmount || parseFloat(energyRequestAmount) < 100}
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                                    提交申请
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* 收益申请记录完整列表对话框 */}
                    <Dialog open={false && showEnergyRequestListDialog} onOpenChange={setShowEnergyRequestListDialog}>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-orange-600" />
                                    收益申请记录
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 py-4">
                                {energyRequests.length > 0 ? (
                                    <div className="space-y-3">
                                        {energyRequests.map((record: any) => {
                                            const desc = typeof record.description === 'string' 
                                                ? JSON.parse(record.description) 
                                                : record;
                                            return (
                                                <div key={record.id} className="border rounded-lg p-4 bg-orange-50">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Badge variant="outline" className={`${
                                                                    desc.status === 'pending' ? 'text-yellow-600 border-yellow-300' :
                                                                    desc.status === 'completed' ? 'text-green-600 border-green-300' :
                                                                    'text-red-600 border-red-300'
                                                                }`}>
                                                                    {desc.status === 'pending' ? '待审核' : desc.status === 'completed' ? '已通过' : '已拒绝'}
                                                                </Badge>
                                                                <p className="font-medium text-lg">
                                                                    申请 {desc.requestedAmount?.toLocaleString() || 0} 收益
                                                                </p>
                                                            </div>
                                                            <div className="text-sm text-gray-600 space-y-1">
                                                                <p>申请时间: {record.created_at ? new Date(record.created_at).toLocaleString() : '-'}</p>
                                                                {desc.note && (
                                                                    <p>申请备注: {desc.note}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            {desc.status === 'completed' && (
                                                                <div className="text-green-600">
                                                                    <CheckCircle className="w-6 h-6" />
                                                                    <p className="text-sm mt-1">已发放</p>
                                                                </div>
                                                            )}
                                                            {desc.status === 'pending' && (
                                                                <div className="text-yellow-600">
                                                                    <Clock className="w-6 h-6" />
                                                                    <p className="text-sm mt-1">审核中</p>
                                                                </div>
                                                            )}
                                                            {desc.status === 'rejected' && (
                                                                <div className="text-red-600">
                                                                    <XCircle className="w-6 h-6" />
                                                                    <p className="text-sm mt-1">已拒绝</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {desc.reviewedAt && (
                                                        <div className="border-t pt-3 mt-3 text-sm text-gray-600">
                                                            <p>审核时间: {new Date(desc.reviewedAt).toLocaleString()}</p>
                                                            {desc.reviewerNote && (
                                                                <p>审核备注: {desc.reviewerNote}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>暂无申请记录</p>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowEnergyRequestListDialog(false)}>
                                    关闭
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* 额度申请对话框 */}
                    <Dialog open={showQuotaRequestDialog} onOpenChange={setShowQuotaRequestDialog}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Database className="w-5 h-5 text-purple-600" />
                                    申请额度
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                    <p className="text-sm text-orange-700">
                                        <strong>说明：</strong>服务商初始额度为0，需要向服务网点申请额度后才能生成Token产品。
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">申请金额</label>
                                    <Input
                                        type="number"
                                        placeholder="请输入申请额度（最低5,000元）"
                                        value={quotaRequestAmount}
                                        onChange={(e) => setQuotaRequestAmount(e.target.value)}
                                        min="5000"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">备注（可选）</label>
                                    <Input
                                        placeholder="如: 业务扩展需要"
                                        value={quotaRequestNote}
                                        onChange={(e) => setQuotaRequestNote(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowQuotaRequestDialog(false)}>
                                    取消
                                </Button>
                                <Button 
                                    className="bg-purple-600" 
                                    onClick={handleQuotaRequest}
                                    disabled={submitting || !quotaRequestAmount}
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Database className="w-4 h-4 mr-2" />}
                                    提交申请
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* 生成产品对话框 */}
                    <Dialog open={showQuotaGenerateDialog} onOpenChange={setShowQuotaGenerateDialog}>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-purple-600" />
                                    生成Token存储包
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6 py-4">
                                {/* 第一步：选择模板 */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                                        <label className="text-sm font-medium text-foreground">选择产品模板</label>
                                    </div>
                                    {availableTemplates.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-2">
                                            {availableTemplates.map((template: any) => (
                                                <div
                                                    key={template.id}
                                                    onClick={() => {
                                                        setSelectedTemplateId(template.id);
                                                        setGeneratePreview(null);
                                                    }}
                                                    className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${
                                                        selectedTemplateId === template.id
                                                            ? "border-purple-600 bg-purple-50"
                                                            : "border-border hover:border-purple-300"
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-medium text-foreground">{template.name}</p>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                {template.period}天周期 | 收益{template.profit_rate}%
                                                            </p>
                                                        </div>
                                                        {selectedTemplateId === template.id && (
                                                            <Badge className="bg-purple-600 text-white">已选</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 text-muted-foreground">
                                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p>暂无可用模板，请联系智算中心创建</p>
                                        </div>
                                    )}
                                </div>

                                {/* 第二步：输入总额 */}
                                {selectedTemplateId && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                                            <label className="text-sm font-medium text-foreground">输入生成总额（元）</label>
                                        </div>
                                        {/* 可用额度信息 */}
                                        <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-xl p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-gray-500">当前可用额度</p>
                                                    <p className="text-2xl font-bold text-purple-600">¥{(stats.available_quota || 0).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <Input
                                                type="number"
                                                placeholder="请输入总额，最低100元"
                                                value={generateQuotaAmount}
                                                onChange={(e) => {
                                                    setGenerateQuotaAmount(e.target.value);
                                                    setGeneratePreview(null);
                                                }}
                                                min={1000}
                                                max={stats.available_quota || 0}
                                                className="text-lg"
                                            />
                                            <Button
                                                onClick={fetchGeneratePreview}
                                                disabled={loadingPreview || !generateQuotaAmount || parseInt(generateQuotaAmount) < 1000}
                                                className="bg-purple-600"
                                            >
                                                {loadingPreview ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    "预览"
                                                )}
                                            </Button>
                                        </div>
                                        <p className="text-xs text-gray-400">单个产品不超过1万元，金额为百元到几千元的整数</p>
                                    </div>
                                )}

                                {/* 预览结果 */}
                                {generatePreview && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                                            <label className="text-sm font-medium text-foreground">确认生成</label>
                                        </div>
                                        
                                        {/* 统计卡片 */}
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            <div className="bg-blue-50 rounded-lg p-3 text-center">
                                                <p className="text-sm text-blue-600">生成总额</p>
                                                <p className="text-xl font-bold text-blue-700">¥{generatePreview.stats?.totalValue?.toLocaleString()}</p>
                                            </div>
                                            <div className="bg-green-50 rounded-lg p-3 text-center">
                                                <p className="text-sm text-green-600">产品数量</p>
                                                <p className="text-xl font-bold text-green-700">{generatePreview.stats?.total} 个</p>
                                            </div>
                                            <div className="bg-orange-50 rounded-lg p-3 text-center">
                                                <p className="text-sm text-orange-600">价格区间</p>
                                                <p className="text-lg font-bold text-orange-700">¥{generatePreview.stats?.minPrice?.toLocaleString()}-{generatePreview.stats?.maxPrice?.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        {/* 产品列表 */}
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            <p className="text-sm font-medium text-gray-700">产品明细：</p>
                                            {generatePreview.products?.map((product: any, index: number) => (
                                                <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant="outline" className="text-purple-600 border-purple-300">
                                                            {product.period}天
                                                        </Badge>
                                                        <span className="text-sm text-gray-600">
                                                            收益{product.profitRate}%
                                                        </span>
                                                    </div>
                                                    <span className="font-semibold text-gray-800">¥{product.price.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* 说明 */}
                                        <div className="mt-4 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
                                            <p className="font-medium mb-1">生成说明：</p>
                                            <ul className="list-disc list-inside space-y-1 text-amber-700">
                                                <li>产品生成后为未上架状态，需手动上架</li>
                                                <li>未上架产品可删除，额度将退回</li>
                                                <li>已上架未售出的产品可下架，下架后回到待上架列表</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowQuotaGenerateDialog(false)}>
                                    取消
                                </Button>
                                <Button
                                    className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700"
                                    onClick={handleGenerateWithQuota}
                                    disabled={submitting || !generatePreview || !selectedTemplateId}
                                >
                                    {submitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <Zap className="w-4 h-4 mr-2" />
                                    )}
                                    确认生成 {generatePreview?.stats?.total || 0} 个产品
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* 购买订单确认/拒绝对话框 */}
                    <Dialog open={showBuyOrderDialog} onOpenChange={setShowBuyOrderDialog}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    {buyOrderAction === "confirm" ? (
                                        <>
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                            确认收款
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="w-5 h-5 text-red-600" />
                                            拒绝订单
                                        </>
                                    )}
                                </DialogTitle>
                            </DialogHeader>
                            
                            {selectedBuyOrder && (
                                <div className="space-y-4 py-4">
                                    {/* 订单信息 */}
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-gray-500">会员</span>
                                            <span className="font-medium">{selectedBuyOrder.username || "未知用户"} {selectedBuyOrder.unique_id ? `(${selectedBuyOrder.unique_id})` : ''}</span>
                                        </div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-gray-500">手机号</span>
                                            <span className="font-medium">{selectedBuyOrder.phone || "未提供"}</span>
                                        </div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-gray-500">产品</span>
                                            <span className="font-medium">{selectedBuyOrder.product_name || "未知产品"}</span>
                                        </div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-gray-500">编号</span>
                                            <span className="font-medium text-gray-600">{selectedBuyOrder.product_code || "无"}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-500">金额</span>
                                            <span className="text-lg font-bold text-purple-600">¥{selectedBuyOrder.product_price?.toLocaleString() || selectedBuyOrder.amount?.toLocaleString() || 0}</span>
                                        </div>
                                    </div>

                                    {buyOrderAction === "confirm" ? (
                                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                            <p className="text-sm text-green-800">
                                                <strong>确认后请确保：</strong>
                                            </p>
                                            <ul className="text-xs text-green-700 mt-2 space-y-1 list-disc list-inside">
                                                <li>会员已线下完成付款</li>
                                                <li>确认后产品将分配给该会员</li>
                                                <li>系统将自动扣除额度并创建持仓记录</li>
                                            </ul>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">拒绝原因（选填）</label>
                                            <Textarea
                                                value={rejectReason}
                                                onChange={(e) => setRejectReason(e.target.value)}
                                                placeholder="请输入拒绝原因..."
                                                rows={3}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowBuyOrderDialog(false)}>
                                    取消
                                </Button>
                                {buyOrderAction === "confirm" ? (
                                    <Button
                                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                        onClick={handleBuyOrderAction}
                                        disabled={submitting}
                                    >
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                        确认收款
                                    </Button>
                                ) : (
                                    <Button
                                        variant="destructive"
                                        onClick={handleBuyOrderAction}
                                        disabled={submitting}
                                    >
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                                        确认拒绝
                                    </Button>
                                )}
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* 积分兑换对话框 */}
                    <Dialog open={false && showPointsToEnergyDialog} onOpenChange={setShowPointsToEnergyDialog}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Gift className="w-5 h-5 text-amber-500" />
                                    积分兑换
                                </DialogTitle>
                                <DialogDescription>
                                    使用积分兑换产品，1积分 = 1元等值产品
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-amber-700">当前积分</span>
                                        <span className="text-lg font-bold text-amber-600">{Number(user?.points || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm text-blue-700">
                                        积分兑换功能即将上线，敬请期待！您当前可使用积分兑换平台产品。
                                    </p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowPointsToEnergyDialog(false)}>
                                    关闭
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* 转账审核弹窗 */}
                    <Dialog open={showTransferReviewDialog} onOpenChange={(open) => {
                        setShowTransferReviewDialog(open);
                        if (!open) setSelectedTransferRequest(null);
                    }}>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <ArrowRightLeft className="w-5 h-5 text-blue-500" />转账审核详情
                                </DialogTitle>
                            </DialogHeader>
                            {selectedTransferRequest && (
                                <div className="space-y-4 py-4">
                                    {/* 会员信息 */}
                                    <div className="p-4 bg-gray-50 rounded-lg border">
                                        <h4 className="font-medium text-sm text-gray-500 mb-2">会员信息</h4>
                                        <div className="space-y-1.5">
                                            <p className="text-sm"><span className="font-medium">用户名：</span>{selectedTransferRequest.username || '未知'}</p>
                                            <p className="text-sm"><span className="font-medium">手机号：</span>{selectedTransferRequest.phone || '未填写'}</p>
                                            {selectedTransferRequest.unique_id && (
                                                <p className="text-sm"><span className="font-medium">专属ID：</span>{selectedTransferRequest.unique_id}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* 转账信息 */}
                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <h4 className="font-medium text-sm text-blue-700 mb-2">转账信息</h4>
                                        <div className="space-y-1.5">
                                            <p className="text-lg font-bold text-blue-800">转账金额：{selectedTransferRequest.amount} 收益</p>
                                            <p className="text-xs text-gray-400">申请时间：{new Date(selectedTransferRequest.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {/* 收款信息 - 核心展示 */}
                                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-300">
                                        <h4 className="font-medium text-sm text-amber-700 mb-3">收款信息（请线下打款至此账户）</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                                                <span className="text-sm text-gray-500 w-20 shrink-0">收款方式</span>
                                                <span className="font-bold text-lg">
                                                    {selectedTransferRequest.payment_method === 'alipay' ? '支付宝' : 
                                                     selectedTransferRequest.payment_method === 'wechat' ? '微信' : '未选择'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                                                <span className="text-sm text-gray-500 w-20 shrink-0">收款账号</span>
                                                <span className="font-medium text-base break-all">{selectedTransferRequest.alipay_account || '未填写'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                                                <span className="text-sm text-gray-500 w-20 shrink-0">真实姓名</span>
                                                <span className="font-medium text-base">{selectedTransferRequest.real_name || '未填写'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 操作提示 */}
                                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                        <p className="text-sm text-red-700">
                                            <strong>重要提示：</strong>请先通过以上收款信息线下打款给会员，确认打款完成后再点击"审核通过"。
                                            审核通过后，收益将转入您的账户。
                                        </p>
                                    </div>
                                </div>
                            )}
                            <DialogFooter className="gap-2">
                                <Button variant="outline" onClick={() => {
                                    setShowTransferReviewDialog(false);
                                    setSelectedTransferRequest(null);
                                }}>取消</Button>
                                <Button
                                    variant="destructive"
                                    disabled={submitting}
                                    onClick={() => {
                                        if (selectedTransferRequest) {
                                            handleEnergyTransferReview(selectedTransferRequest.id, 'reject');
                                        }
                                    }}>
                                    {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                                    拒绝
                                </Button>
                                <Button
                                    className="bg-blue-600 hover:bg-blue-700"
                                    disabled={submitting}
                                    onClick={() => {
                                        if (selectedTransferRequest) {
                                            handleEnergyTransferReview(selectedTransferRequest.id, 'approve');
                                        }
                                    }}>
                                    {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                                    审核通过（已线下打款）
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* 匹配会员Dialog */}
                    <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <UserPlus className="w-5 h-5" />
                                    匹配产品给会员
                                </DialogTitle>
                                <DialogDescription>
                                    {matchTargetProduct && (
                                        <span>Token存储包 {matchTargetProduct.code} | 价格: ¥{matchTargetProduct.price?.toLocaleString()}</span>
                                    )}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">选择目标会员</label>
                                    <div className="relative">
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                                    placeholder="输入手机号/名字/ID搜索..."
                                                    value={matchSearchText}
                                                    onChange={(e) => {
                                                        setMatchSearchText(e.target.value);
                                                        setMatchDropdownOpen(true);
                                                        if (!e.target.value) setMatchTargetUserId("");
                                                    }}
                                                    onFocus={() => setMatchDropdownOpen(true)}
                                                />
                                                {matchSearchText && (
                                                    <button
                                                        className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground"
                                                        onClick={() => { setMatchSearchText(""); setMatchTargetUserId(""); setMatchDropdownOpen(false); }}
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {/* 已选中显示 */}
                                        {matchTargetUserId && !matchDropdownOpen && (() => {
                                            const selected = chainMembers.find((m: any) => m.value === matchTargetUserId);
                                            return selected ? (
                                                <div className="mt-1.5 flex items-center gap-1.5 rounded-md bg-purple-50 dark:bg-purple-900/20 px-2.5 py-1.5 text-sm border border-purple-200 dark:border-purple-800">
                                                    <Check className="h-3.5 w-3.5 text-purple-600" />
                                                    <span className="text-purple-700 dark:text-purple-300 font-medium">{selected.label}</span>
                                                    <button className="ml-auto" onClick={() => { setMatchTargetUserId(""); setMatchSearchText(""); }}>
                                                        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                                    </button>
                                                </div>
                                            ) : null;
                                        })()}
                                        {/* 下拉搜索结果 */}
                                        {matchDropdownOpen && (() => {
                                            const keyword = matchSearchText.toLowerCase().trim();
                                            const filtered = keyword
                                                ? chainMembers.filter((m: any) => {
                                                    const label = (m.label || "").toLowerCase();
                                                    const phone = (m.phone || "").toLowerCase();
                                                    const uid = (m.uniqueId || "").toLowerCase();
                                                    const username = (m.username || "").toLowerCase();
                                                    return label.includes(keyword) || phone.includes(keyword) || uid.includes(keyword) || username.includes(keyword);
                                                })
                                                : chainMembers;
                                            return filtered.length > 0 ? (
                                                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover shadow-lg">
                                                    {filtered.map((m: any) => (
                                                        <button
                                                            key={m.value}
                                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between ${matchTargetUserId === m.value ? "bg-accent" : ""}`}
                                                            onClick={() => {
                                                                setMatchTargetUserId(m.value);
                                                                setMatchSearchText(m.label);
                                                                setMatchDropdownOpen(false);
                                                            }}
                                                        >
                                                            <span>{m.label}</span>
                                                            {matchTargetUserId === m.value && <Check className="h-4 w-4 text-purple-600" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg px-3 py-4 text-sm text-muted-foreground text-center">
                                                    未找到匹配的会员
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                                {matchTargetUserId && matchTargetProduct && (
                                    <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">产品价格</span>
                                            <span>¥{matchTargetProduct.price?.toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <DialogFooter className="gap-2">
                                <Button variant="outline" onClick={() => setShowMatchDialog(false)}>取消</Button>
                                <Button
                                    className="bg-purple-600 hover:bg-purple-700"
                                    disabled={!matchTargetUserId || assigningMatch}
                                    onClick={handleMatchAssign}
                                >
                                    {assigningMatch ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1" />}
                                    确认匹配
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* 回购确认弹窗 */}
                    <Dialog open={repurchaseConfirm.show} onOpenChange={(open) => { if (!open) setRepurchaseConfirm({ show: false, productId: '', productName: '', price: 0 }); }}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-amber-600">
                                    <AlertTriangle className="w-5 h-5" />
                                    确认回购
                                </DialogTitle>
                                <DialogDescription>
                                    此操作不可撤销，请确认后再操作
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-3">
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">产品名称</span>
                                        <span className="font-medium">{repurchaseConfirm.productName}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">回购金额</span>
                                        <span className="font-bold text-amber-600">¥{repurchaseConfirm.price?.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                    <p className="text-sm text-red-700">
                                        回购后该产品将回到您的在售列表，会员端显示已完成。请确认是否执行回购操作？
                                    </p>
                                </div>
                            </div>
                            <DialogFooter className="gap-2">
                                <Button variant="outline" onClick={() => setRepurchaseConfirm({ show: false, productId: '', productName: '', price: 0 })}>
                                    取消
                                </Button>
                                <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => handleRepurchase(repurchaseConfirm.productId)} disabled={assigningMatch}>
                                    {assigningMatch ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-1" />}
                                    确认回购
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </main>
        </div>
    );
}