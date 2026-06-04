"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

import {
    Cpu,
    Zap,
    TrendingUp,
    TrendingDown,
    Star,
    Coins,
    Wallet,
    ArrowRight,
    Server,
    Gift,
    Users,
    Loader2,
    Bell,
    Package,
    ShoppingCart,
    Clock,
    CheckCircle,
    AlertCircle,
    Copy,
    Share2,
    Award,
    UserPlus,
    Link,
    LinkIcon,
    History,
    ArrowUpCircle,
    ArrowDownCircle,
    Filter,
    FileText,
    User,
    Upload,
    Network,
    Lock,
    Eye,
    EyeOff,
    Banknote,
    ArrowRightLeft,
    ArrowLeftRight,
    Info,
    RefreshCw,
    Phone,
    XCircle,
    Timer,
    Repeat,
    Shield,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";

interface Product {
    id: string;
    name: string;
    code: string;
    price: number;
    period: number;
    total_rate: number;
    market_rate: number;
    profit_rate: number;
    market_fee?: number;
    status: string;
    provider_id?: string;
    image_url?: string;
}

interface UserProduct {
    id: string;
    product_id: string;
    purchase_price: number;
    expected_profit: number;
    market_fee: number;
    status: string;
    purchase_date: string;
    expire_date: string;
    revenue_released?: boolean;
    products?: {
        name: string;
        code: string;
        period: number;
    };
}

interface PendingOrder {
    orderId: string;
    orderStatus: string;
    orderCreatedAt: string;
    productId: string;
    productName: string;
    productPrice: number;
    productPeriod: number;
    totalRate: number;
    profitRate: number;
}

interface Notification {
    id: string;
    type: string;
    title: string;
    content: string;
    amount: number;
    is_read?: boolean;
    created_at: string;
}

interface Stats {
    balance: number;
    points: number;
    total_holding: number;
    total_profit: number;
    available_profit: number;
    product_count: number;
}

export default function MemberPage() {
    const {
        user,
        loading: authLoading,
        logout,
        setUser,
        refreshUser,
    } = useAuth("member");

    // 统一认证 fetch
    const authFetch = async (url: string, options: RequestInit = {}) => {
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) };
        if (token) headers['Authorization'] = `Bearer ${token}`;
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
        balance: 0,
        points: 0,
        total_holding: 0,
        total_profit: 0,
        available_profit: 0,
        product_count: 0
    });

    const [products, setProducts] = useState<Product[]>([]);
    const [userProducts, setUserProducts] = useState<UserProduct[]>([]);
    const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("products");
    const [profileSubTab, setProfileSubTab] = useState<"info" | "payment" | "invite" | "chain" | "password">("info");
    const [chainData, setChainData] = useState<any>(null);
    const [currentProviderId, setCurrentProviderId] = useState<string | null>(null);
    const [chainLoading, setChainLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // 修改密码状态
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    // 用户名编辑状态
    const [editingUsername, setEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState("");
    const [savingUsername, setSavingUsername] = useState(false);

    const [message, setMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
    const [showSellDialog, setShowSellDialog] = useState(false);
    const [showApplyDialog, setShowApplyDialog] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [submittingProductIds, setSubmittingProductIds] = useState<Set<string>>(new Set());
    const [selectedUserProduct, setSelectedUserProduct] = useState<UserProduct | null>(null);
    const [applyType, setApplyType] = useState<"first_gen" | "second_gen">("first_gen");
    const [applicantName, setApplicantName] = useState("");
    const [phone, setPhone] = useState("");
    const [alipayAccount, setAlipayAccount] = useState("");
    const [wechatAccount, setWechatAccount] = useState("");
    const [paymentQRCode, setPaymentQRCode] = useState<string | null>(null);
    const [parentProviderId, setParentProviderId] = useState("");
    const [branchId, setBranchId] = useState("");
    const [quotaRequest, setQuotaRequest] = useState("50000");
    const [realtimeEnergy, setRealtimeEnergy] = useState<number>(0);
    const [applyEligibility, setApplyEligibility] = useState<{ canApply: boolean; effectiveMembers: number; requiredMembers: number; applyType: string } | null>(null);
    const [checkingEligibility, setCheckingEligibility] = useState(false);

    // 流转相关状态
    const [myTransfers, setMyTransfers] = useState<any[]>([]);
    const [transferMarket, setTransferMarket] = useState<any[]>([]);
    const [confirmingTransferId, setConfirmingTransferId] = useState<string | null>(null);
    const [buyingTransferId, setBuyingTransferId] = useState<string | null>(null);

    // 积分兑换相关状态
    const [shopProducts, setShopProducts] = useState<any[]>([]);
    const [shopLoading, setShopLoading] = useState(false);
    const [exchangeProduct, setExchangeProduct] = useState<any>(null);
    const [exchangeForm, setExchangeForm] = useState({ receiverName: '', receiverPhone: '', receiverAddress: '' });
    const [exchangeSubmitting, setExchangeSubmitting] = useState(false);

    // 加载积分商城商品
    const loadShopProducts = useCallback(async () => {
        try {
            setShopLoading(true);
            const res = await fetch('/api/points-products?status=active');
            const data = await res.json();
            if (data.success) setShopProducts(data.data || []);
        } catch (e) { console.error('加载积分商城失败:', e); }
        finally { setShopLoading(false); }
    }, []);

    // 切换到积分tab时加载商品
    useEffect(() => {
        if (activeTab === 'points') loadShopProducts();
    }, [activeTab, loadShopProducts]);

    // 兑换商品
    const handleExchange = async () => {
        if (!exchangeProduct || !exchangeForm.receiverName || !exchangeForm.receiverPhone || !exchangeForm.receiverAddress) {
            setMessage({ type: 'error', text: '请填写完整的收货信息' });
            return;
        }
        try {
            setExchangeSubmitting(true);
            const res = await fetch('/api/points-exchange', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user?.id,
                    productId: exchangeProduct.id,
                    ...exchangeForm,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setUser((prev: any) => ({ ...prev, points: data.data.remainingPoints }));
                setExchangeProduct(null);
                setExchangeForm({ receiverName: '', receiverPhone: '', receiverAddress: '' });
                setMessage({ type: 'success', text: '兑换成功！' });
                loadShopProducts();
            } else {
                setMessage({ type: 'error', text: data.error || '兑换失败' });
            }
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message });
        } finally {
            setExchangeSubmitting(false);
        }
    };

    // 邀请新用户相关状态
    const [inviteCode, setInviteCode] = useState("");
    const [referralStats, setReferralStats] = useState({
        directCount: 0,
        totalInvest: 0,
        totalReward: 0,
        members: [] as { id: string; username: string; phone: string; uniqueId: string; role: string; balance: number; createdAt: string }[],
    });

    // 保护期相关状态
    const [protectionInfo, setProtectionInfo] = useState<any>(null);

    // 资金流水相关状态
    const [capitalFlowData, setCapitalFlowData] = useState<any>(null);
    const [capitalFlowLoading, setCapitalFlowLoading] = useState(false);
    const [capitalFlowTab, setCapitalFlowTab] = useState('all');
    const [capitalFlowPage, setCapitalFlowPage] = useState(1);

const [copySuccess, setCopySuccess] = useState(false);

    // 收益记录相关状态
    const [profitRecords, setProfitRecords] = useState<any[]>([]);
    const [profitStats, setProfitStats] = useState<any>({
        totalPrincipal: 0,
        totalProfit: 0,
        converted: 0,
        available: 0,
    });
    const [showProfitConvertDialog, setShowProfitConvertDialog] = useState(false);
    const [convertAmount, setConvertAmount] = useState("");
    const [showBalanceTransferDialog, setShowBalanceTransferDialog] = useState(false);
    const [showBalanceConvertDialog, setShowBalanceConvertDialog] = useState(false);
    const [transferTargets, setTransferTargets] = useState<any[]>([]);
    const [transferSearchKeyword, setTransferSearchKeyword] = useState("");
    const [transferToUserId, setTransferToUserId] = useState("");
    const [transferToAmount, setTransferToAmount] = useState("");
    const [transferToNote, setTransferToNote] = useState("");
    const [profitConvertAmount, setProfitConvertAmount] = useState("");
    const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawAlipay, setWithdrawAlipay] = useState("");
    const [withdrawRealName, setWithdrawRealName] = useState("");
    const [withdrawRecords, setWithdrawRecords] = useState<any[]>([]);
    const [pointsRecords, setPointsRecords] = useState<any[]>([]);
    const [rechargeRequests, setRechargeRequests] = useState<any[]>([]);
    const [pendingRechargeCount, setPendingRechargeCount] = useState(0);
    const [releasingRevenue, setReleasingRevenue] = useState<string | null>(null);
    
    // 收益明细相关状态
    const [profitDetails, setProfitDetails] = useState<any[]>([]);
    const [profitDetailsStats, setProfitDetailsStats] = useState<any>({});
    const [profitDetailFilter, setProfitDetailFilter] = useState<'all' | 'principal_return' | 'principal_in' | 'profit_in' | 'convert_to_energy' | 'withdraw'>('all');

    // 购买限制相关状态
    const [purchaseLimits, setPurchaseLimits] = useState<any>(null);

    const loadData = useCallback(async () => {
        const userId = localStorage.getItem("userId");
        const userDataStr = localStorage.getItem("userData");

        if (!userId)
            return;

        // 从本地存储获取邀请码（= 唯一ID）
        if (userDataStr) {
            try {
                const userData = JSON.parse(userDataStr);
                // 优先使用 unique_id，兼容旧 invite_code
                const code = userData.unique_id || userData.invite_code || '';
                setInviteCode(code);
            } catch (e) {
                console.error("解析用户数据失败:", e);
            }
        }

        try {
            // 使用 Promise.allSettled 避免单个失败导致全部失败
            const results = await Promise.allSettled([
                authFetch(`/api/products?memberId=${userId}`),
                authFetch(`/api/member/assets?userId=${userId}`),
                authFetch(`/api/notifications?userId=${userId}`),
                authFetch(`/api/member/referral-stats?userId=${userId}`),
                authFetch(`/api/member/energy-records?userId=${userId}`),
                authFetch(`/api/member/energy-recharge?userId=${userId}`),
                authFetch(`/api/member/purchase-limits?userId=${userId}`),
                authFetch(`/api/user/chain?userId=${userId}`),
                authFetch(`/api/member/pending-orders?userId=${userId}`),
                authFetch(`/api/withdrawals?tab=mine`),
                authFetch(`/api/member/points-records?userId=${userId}`),
                authFetch(`/api/products/transfer/list?userId=${userId}`),
                authFetch(`/api/products/transfer/market?memberId=${userId}`),
                authFetch(`/api/member/protection?userId=${userId}`),
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

            const [productsData, assetsData, notificationsData, referralData, energyRecordsData, rechargeData, purchaseLimitsData, chainDataResult, pendingOrdersData, withdrawData, pointsData, transfersData, transferMarketData, protectionData] = await Promise.all(
                results.map(safeJson)
            );

            // 处理待审核订单数据
            if (pendingOrdersData.success && pendingOrdersData.data) {
                setPendingOrders(pendingOrdersData.data);
            }

            // 处理提现记录数据
            if (withdrawData.success && withdrawData.data) {
                setWithdrawRecords(withdrawData.data?.records || withdrawData.data || []);
            }

            // 处理积分记录数据
            if (pointsData.success && pointsData.data) {
                setPointsRecords(pointsData.data);
            }

            // 处理我的流转数据
            if (transfersData.success && transfersData.data) {
                setMyTransfers(transfersData.data);
            }

            // 处理流转市场数据
            if (transferMarketData.success && transferMarketData.data) {
                setTransferMarket(transferMarketData.data);
            }

            // 处理保护期数据
            if (protectionData.success && protectionData.data) {
                setProtectionInfo(protectionData.data);
            }

            // 处理关系链数据，提取服务商ID
            if (chainDataResult.success && chainDataResult.data) {
                setChainData(chainDataResult.data);
                if (chainDataResult.data.provider?.id) {
                    setCurrentProviderId(chainDataResult.data.provider.id);
                    localStorage.setItem('providerId', chainDataResult.data.provider.id);
                }
            }

            if (productsData.success) {
                // 计算 market_fee（收益释放 = 价格 × 市场利率 / 100）
                // 去重：使用Map按id去重
                const uniqueMap = new Map();
                const rawProducts = productsData.data || [];
                rawProducts.forEach((p: any) => {
                    if (!uniqueMap.has(p.id)) {
                        uniqueMap.set(p.id, {
                            ...p,
                            market_fee: Math.floor(p.price * (parseFloat(p.market_rate) || 0) / 100)
                        });
                    }
                });
                setProducts(Array.from(uniqueMap.values()));
            }

            if (assetsData.success) {
                const statsData = assetsData.data?.stats || {};
                setStats({
                    ...statsData,
                    // available_profit 已由API直接返回
                });
                // 去重
                const rawProducts = assetsData.data?.products || [];
                const uniqueProductsMap = new Map();
                rawProducts.forEach((p: any) => {
                    if (!uniqueProductsMap.has(p.id)) {
                        uniqueProductsMap.set(p.id, p);
                    }
                });
                setUserProducts(Array.from(uniqueProductsMap.values()));
            }

            if (notificationsData.success) {
                setNotifications(
                    Array.isArray(notificationsData.data?.notifications) ? notificationsData.data.notifications : []
                );
            }

            if (referralData.success && referralData.data) {
                console.log('[member] referralStats:', JSON.stringify(referralData.data));
                setReferralStats(referralData.data);
            } else {
                console.log('[member] referralStats failed:', JSON.stringify(referralData));
            }

            // 处理充值申请记录（使用已解析的数据，避免重复读取 Response）
            if (rechargeData.success && rechargeData.data) {
                setRechargeRequests(rechargeData.data || []);
                // 计算待处理数量
                const pending = (rechargeData.data || []).filter((r: any) => r.status === 'pending').length;
                setPendingRechargeCount(pending);
            }

            // 处理购买限制信息
            if (purchaseLimitsData.success && purchaseLimitsData.data) {
                setPurchaseLimits(purchaseLimitsData.data);
            }
            // 自动释放到期收益：检查所有已到期但未释放收益的产品
            // 使用 assetsData（包含 revenue_released 字段），不用 productsData
            if (assetsData.success && assetsData.data?.products) {
                const now = new Date();
                const expiredUnreleased = assetsData.data.products.filter((up: any) => {
                    if (up.status !== 'holding' || up.revenue_released) return false;
                    if (!up.expire_date) return false;
                    // 直接比较当前时间与到期时间，不做中午12点限制
                    return now >= new Date(up.expire_date);
                });

                if (expiredUnreleased.length > 0) {
                    console.log(`[member] 发现 ${expiredUnreleased.length} 个到期未释放收益的产品，自动释放`);
                    try {
                        const token = localStorage.getItem('token');
                        const releaseRes = await fetch('/api/products/release-revenue', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ userId: user?.id })
                        });
                        const releaseData = await releaseRes.json();
                        if (releaseData.success && releaseData.data?.released > 0) {
                            console.log('[member] 到期收益已自动释放:', releaseData.message);
                            // 更新用户余额
                            if (releaseData.data?.userBalance !== undefined) {
                                setUser((prev: any) => prev ? { ...prev, balance: releaseData.data.userBalance } : prev);
                            }
                            // 刷新持仓数据以反映释放状态
                            const refreshedAssets = await fetch(`/api/member/assets?userId=${user?.id}`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            const refreshedData = await refreshedAssets.json();
                            if (refreshedData.success && refreshedData.data?.products) {
                                const refreshedMap = new Map();
                                refreshedData.data.products.forEach((p: any) => {
                                    if (!refreshedMap.has(p.id)) {
                                        refreshedMap.set(p.id, p);
                                    }
                                });
                                setUserProducts(Array.from(refreshedMap.values()));
                                if (refreshedData.data.stats) {
                                    setStats((prev: any) => ({ ...prev, ...refreshedData.data.stats }));
                                }
                            }
                        }
                    } catch (e) {
                        console.error('[member] 自动释放收益失败:', e);
                    }
                }
            }
        } catch (error) {
            console.error("加载数据失败:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && user) {
            loadData();
            setNewUsername(user.username || '');
        }
    }, [authLoading, user, loadData]);

    // 加载收益记录
    const loadProfitRecords = useCallback(async () => {
        if (!user?.id) return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/member/revenue?userId=${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setProfitRecords(data.data?.records || []);
                const stats = data.data?.stats || {};
                setProfitStats({
                    totalPrincipal: stats.totalPrincipal || 0,
                    totalProfit: stats.totalProfit || 0,
                    converted: stats.converted || 0,
                    available: stats.available || 0,
                    holdingExpectedProfit: stats.holdingExpectedProfit || 0,
                    holdingPrincipal: stats.holdingPrincipal || 0,
                });
            }
            
            // 获取收益明细
            try {
                const detailsRes = await fetch(`/api/member/revenue/details?userId=${user.id}`);
                const detailsData = await detailsRes.json();
                if (detailsData.success) {
                    setProfitDetails(detailsData.data?.records || []);
                    setProfitDetailsStats(detailsData.data?.stats || {});
                }
            } catch (e) {
                console.error('获取收益明细失败:', e);
            }
        } catch (error) {
            console.error('获取收益记录失败:', error);
        }
    }, [user?.id]);

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
                // 从关系链数据中提取服务商ID
                if (data.data?.provider?.id) {
                    setCurrentProviderId(data.data.provider.id);
                    localStorage.setItem('providerId', data.data.provider.id);
                }
            }
        } catch (error) {
            console.error('获取关系链失败:', error);
        } finally {
            setChainLoading(false);
        }
    }, [user?.id]);

    // 获取我的流转记录
    const loadMyTransfers = useCallback(async () => {
        if (!user?.id) return;
        try {
            const token = localStorage.getItem('token');
            // 获取流转列表
            const response = await fetch(`/api/products/transfer/list?userId=${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setMyTransfers(data.data || []);
            }
        } catch (error) {
            console.error('获取流转记录失败:', error);
        }
    }, [user?.id]);

    // 获取流转市场
    const loadTransferMarket = useCallback(async () => {
        if (!user?.id) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/products/transfer/market?memberId=${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setTransferMarket(data.data || []);
            }
        } catch (error) {
            console.error('获取流转市场失败:', error);
        }
    }, [user?.id]);

    // 加载资金流水（必须在refreshAll之前声明）
    const loadCapitalFlow = useCallback(async () => {
        const userId = user?.id || localStorage.getItem("userId");
        if (!userId) { console.log('[资金流水] 无userId，跳过加载'); return; }
        setCapitalFlowLoading(true);
        try {
            const flowType = capitalFlowTab === 'all' ? '' : capitalFlowTab;
            const params = new URLSearchParams({ userId, page: String(capitalFlowPage), pageSize: '20' });
            if (flowType) params.set('flowType', flowType);
            console.log('[资金流水] 请求API:', `/api/capital-flow?${params}`);
            const res = await fetch(`/api/capital-flow?${params}`);
            const data = await res.json();
            console.log('[资金流水] API返回:', data.success, data.data?.stats, data.data?.records?.length);
            if (data.success) {
                setCapitalFlowData(data.data);
            } else {
                console.error('[资金流水] API返回失败:', data);
            }
        } catch (e) {
            console.error('加载资金流水失败', e);
        } finally {
            setCapitalFlowLoading(false);
        }
    }, [user?.id, capitalFlowTab, capitalFlowPage]);

    // 全量并行刷新：用户信息 + 业务数据
    const refreshAll = useCallback(async () => {
        // 短暂延迟确保数据库写入完成后再读取，避免 PostgREST 缓存返回旧数据
        await new Promise(r => setTimeout(r, 300));
        await Promise.allSettled([
            refreshUser(),
            loadData(),
            loadProfitRecords(),
            loadChainData(),
            loadMyTransfers(),
            loadTransferMarket(),
            activeTab === 'capitalFlow' ? loadCapitalFlow() : Promise.resolve(),
        ]);
    }, [refreshUser, loadData, loadProfitRecords, loadChainData, activeTab, loadCapitalFlow]);

    useEffect(() => {
        if (profileSubTab === 'chain' && !chainData) {
            loadChainData();
        }
        // 切换到收款信息 tab 时加载数据
        if (profileSubTab === 'payment') {
            loadPaymentInfo();
        }
    }, [profileSubTab, chainData, loadChainData]);

    // 轮询：当有任意待审核状态时，每5秒自动刷新
    useEffect(() => {
        const hasPendingConfirm = userProducts.some(up => up.status === 'pending_confirm');
        const hasPendingOrders = pendingOrders.length > 0;
        const hasPendingRecharge = pendingRechargeCount > 0;
        const hasPendingTransfer = false; // 收益互转已移除

        if (!hasPendingConfirm && !hasPendingOrders && !hasPendingRecharge && !hasPendingTransfer) return;

        const interval = setInterval(() => {
            loadData();
        }, 5000);

        return () => clearInterval(interval);
    }, [userProducts, pendingOrders, pendingRechargeCount, loadData]);

    // 资金流水tab/翻页切换时加载
    useEffect(() => {
        if (activeTab === "capitalFlow") {
            loadCapitalFlow();
        }
    }, [activeTab, capitalFlowTab, capitalFlowPage, loadCapitalFlow]);

    // 加载收款信息
    const loadPaymentInfo = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/member/payment-info', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success && data.data) {
                if (data.data.alipayAccount) setAlipayAccount(data.data.alipayAccount);
                if (data.data.wechatAccount) setWechatAccount(data.data.wechatAccount);
                if (data.data.paymentQRCode) setPaymentQRCode(data.data.paymentQRCode);
            }
        } catch (error) {
            console.error('加载收款信息失败:', error);
        }
    };

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
                await refreshAll();
                setTimeout(() => refreshAll(), 1500);
                setTimeout(() => refreshAll(), 3000);
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

    // 修改密码
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!oldPassword) {
            showMessage("error", "请输入当前密码");
            return;
        }
        if (!newPassword) {
            showMessage("error", "请输入新密码");
            return;
        }
        if (newPassword.length < 6) {
            showMessage("error", "新密码长度不能少于6位");
            return;
        }
        if (newPassword !== confirmPassword) {
            showMessage("error", "两次输入的新密码不一致");
            return;
        }
        if (oldPassword === newPassword) {
            showMessage("error", "新密码不能与旧密码相同");
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
            } else {
                showMessage("error", data.error || "修改失败");
            }
        } catch {
            showMessage("error", "修改失败，请稍后重试");
        } finally {
            setChangingPassword(false);
        }
    };

    // 检查产品是否处于待审核状态（pendingOrders 或 submittingProductIds）
    const isProductPending = (productId: string) => {
        const hasPendingOrder = pendingOrders.some(po => po.productId === productId);
        const isSubmitting = submittingProductIds.has(productId);
        return hasPendingOrder || isSubmitting;
    };

    const showMessage = (type: "success" | "error", text: string) => {
        setMessage({
            type,
            text
        });

        setTimeout(() => setMessage(null), 3000);
    };

    const handlePurchase = async () => {
        if (!selectedProduct)
            return;

        const userId = localStorage.getItem("userId");

        if (!userId)
            return;

        // 确认购买时才标记为提交中，防止重复点击
        setSubmittingProductIds(prev => new Set(prev).add(selectedProduct.id));
        setSubmitting(true);

        try {
            const response = await authFetch("/api/orders/buy", {
                method: "POST",
                body: JSON.stringify({
                    userId,
                    productId: selectedProduct.id
                })
            });

            const data = await response.json();

            if (data.success) {
                // 使用API返回的消息，显示订单状态
                const message = data.data?.message || "购买申请已提交，等待服务商审核确认";
                showMessage("success", message);
                setShowPurchaseDialog(false);

                // 乐观更新：立即将该产品添加到待审核列表
                if (selectedProduct) {
                    const newPendingOrder = {
                        orderId: data.data?.order?.id || `temp-pending`,
                        orderStatus: 'pending',
                        orderCreatedAt: data.data?.order?.created_at || '',
                        productId: selectedProduct.id,
                        productName: selectedProduct.name,
                        productPrice: selectedProduct.price,
                        productPeriod: selectedProduct.period,
                        totalRate: selectedProduct.total_rate,
                        profitRate: selectedProduct.profit_rate,
                    };
                    setPendingOrders(prev => [newPendingOrder, ...prev]);
                }

                setSelectedProduct(null);
                // 购买成功后从submittingProductIds移除（已加入pendingOrders）
                setSubmittingProductIds(prev => {
                    const next = new Set(prev);
                    if (selectedProduct) next.delete(selectedProduct.id);
                    return next;
                });
                refreshAll();
            } else {
                // 如果购买失败，从submittingProductIds移除
                if (selectedProduct) {
                    setSubmittingProductIds(prev => {
                        const next = new Set(prev);
                        next.delete(selectedProduct.id);
                        return next;
                    });
                }
            }
        } catch (error) {
            showMessage("error", "网络错误");
            // 网络错误时也要移除
            if (selectedProduct) {
                setSubmittingProductIds(prev => {
                    const next = new Set(prev);
                    next.delete(selectedProduct.id);
                    return next;
                });
            }
        } finally {
            setSubmitting(false);
        }
    };

    // 购买流转产品
    const handleBuyTransfer = async (transferId: string, price: number, marketFee: number) => {
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        if (!confirm(`确认购买此流转产品？\n\n流转价格：¥${price.toLocaleString()}\n\n购买后需等待卖家确认收款，服务商审核通过后正式持有。`)) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/products/transfer/buy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    transferId,
                    userId
                })
            });
            const data = await res.json();
            if (data.success) {
                showMessage("success", "购买申请已提交，请等待卖家确认收款");
                refreshAll();
            } else {
                showMessage("error", data.error || "购买流转产品失败");
            }
        } catch (e: any) {
            showMessage("error", "购买流转产品失败: " + e.message);
        }
    };

    const handleSell = async () => {
        if (!selectedUserProduct)
            return;

        const userId = localStorage.getItem("userId");

        if (!userId)
            return;

        setSubmitting(true);

        try {
            const response = await authFetch("/api/orders/sell", {
                method: "POST",
                body: JSON.stringify({
                    userId,
                    userProductId: selectedUserProduct.id
                })
            });

            const data = await response.json();

            if (data.success) {
                showMessage("success", "出售成功！收益已到账，产品已回到服务商，Token值随产品流转");
                setShowSellDialog(false);
                setSelectedUserProduct(null);
                refreshAll();
            } else {
                showMessage("error", data.error || "出售失败");
                // 如果是时间锁错误，额外提示
                if (data.data?.code === 'HOLD_TIME_LOCK') {
                    const info = data.data;
                    showMessage("error", `${info.productPeriod}天产品需持仓满${info.minHoldHours}小时，还需等待 ${info.remainingHours} 小时`);
                }
            }
        } catch (error) {
            showMessage("error", "网络错误");
        } finally {
            setSubmitting(false);
        }
    };

    const calculateProfit = (product: Product) => {
        // 预期收益使用 total_rate，因为会员已预付收益释放，到期后总收益全部归会员
        const totalRate = product.total_rate || 0;
        if (!totalRate) return 0;
        return Math.floor(product.price * totalRate / 100);
    };

    const calculateMarketFee = (product: Product) => {
        // 使用产品自身的 market_rate 计算收益释放，不使用硬编码
        const marketRate = product.market_rate || 0;
        if (!marketRate) return 0;
        return Math.floor(product.price * marketRate / 100);
    };

    const checkApplyEligibility = async () => {
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        setCheckingEligibility(true);
        try {
            const response = await authFetch(`/api/member/apply-provider?userId=${userId}&checkEligibility=true`);
            const data = await response.json();
            if (data.success) {
                setApplyEligibility(data.data);
            }
        } catch (error) {
            console.error("检查申请资格失败:", error);
        } finally {
            setCheckingEligibility(false);
        }
    };

    const handleApplyProvider = async () => {
        const userId = localStorage.getItem("userId");

        if (!userId)
            return;

        // 检查资格
        if (applyEligibility && !applyEligibility.canApply) {
            showMessage("error", `需推荐${applyEligibility.requiredMembers}个以上有效会员才能申请，当前已推荐${applyEligibility.effectiveMembers}个`);
            return;
        }

        if (!applicantName || !phone) {
            showMessage("error", "请填写真实姓名和手机号");
            return;
        }

        // 自动判断申请类型：有provider_id则是第二代，否则是第一代
        const autoApplyType = user?.providerId ? "second_gen" : "first_gen";

        if (autoApplyType === "first_gen" && !branchId) {
            showMessage("error", "请填写服务网点ID");
            return;
        }

        setSubmitting(true);

        try {
            const response = await authFetch("/api/member/apply-provider", {
                method: "POST",
                body: JSON.stringify({
                    userId,
                    realName: applicantName,
                    phone,
                    apply_type: autoApplyType,
                    parent_provider_id: autoApplyType === "second_gen" ? (user?.providerId || parentProviderId) : null,
                    branch_id: autoApplyType === "first_gen" ? branchId : null,
                    quota_request: parseFloat(quotaRequest) || 50000
                })
            });

            const data = await response.json();

            if (data.success) {
                showMessage("success", data.data?.message || data.message || "申请已提交，请等待审核");
                setShowApplyDialog(false);
                setApplicantName("");
                setPhone("");
                setAlipayAccount("");
                setQuotaRequest("50000");
            } else {
                showMessage("error", data.error || "申请失败");
            }
        } catch (error) {
            showMessage("error", "网络错误");
        } finally {
            setSubmitting(false);
        }
    };


    // 会员提现 - 统一调用 /api/withdrawals
    const handleWithdraw = async () => {
        const amount = parseFloat(withdrawAmount);
        if (!amount || amount < 100) {
            showMessage("error", "提现金额不能少于100");
            return;
        }
        if (!withdrawAlipay.trim()) {
            showMessage("error", "请填写支付宝账号");
            return;
        }
        if (!withdrawRealName.trim()) {
            showMessage("error", "请填写真实姓名");
            return;
        }

        setSubmitting(true);
        try {
            const response = await authFetch("/api/withdrawals", {
                method: "POST",
                body: JSON.stringify({
                    amount,
                    alipayAccount: withdrawAlipay.trim(),
                    realName: withdrawRealName.trim(),
                }),
            });

            const data = await response.json();
            if (data.success) {
                const w = data.data || {};
                showMessage("success", `提现申请已提交！手续费¥${w.fee || 0}，实际到账¥${w.actualAmount || 0}，等待网点审核`);
                setShowWithdrawDialog(false);
                setWithdrawAmount("");
                setWithdrawAlipay("");
                setWithdrawRealName("");
                refreshAll();
            } else {
                showMessage("error", data.message || "提现失败");
            }
        } catch (error) {
            showMessage("error", "网络错误");
        } finally {
            setSubmitting(false);
        }
    };

    // 会员确认收款 - 不再需要，审核通过即为完成
    const handleConfirmReceipt = async (withdrawalId: string) => {
        showMessage("success", "提现审核通过后自动完成，无需确认收款");
    };

    // 加载提现记录 - 统一调用 /api/withdrawals
    const loadWithdrawRecords = async () => {
        try {
            const response = await authFetch(`/api/withdrawals?tab=mine`);
            const data = await response.json();
            if (data.success) {
                setWithdrawRecords(data.data?.records || []);
            }
        } catch (error) {
            console.error("加载提现记录失败", error);
        }
    };

    // 加载积分记录
    const loadPointsRecords = async () => {
        const userId = localStorage.getItem("userId");
        if (!userId) return;
        try {
            const response = await authFetch(`/api/member/points-records?userId=${userId}`);
            const data = await response.json();
            if (data.success) {
                setPointsRecords(data.data || []);
            }
        } catch (error) {
            console.error("加载积分记录失败", error);
        }
    };

    // 复制邀请码
    const handleCopyInviteCode = async () => {
        if (!inviteCode) return;
        
        try {
            await navigator.clipboard.writeText(inviteCode);
            setCopySuccess(true);
            showMessage("success", "邀请码已复制到剪贴板");
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            showMessage("error", "复制失败，请手动复制");
        }
    };

    // 复制邀请链接
    const handleCopyInviteLink = async () => {
        if (!inviteCode) return;
        
        const inviteLink = `${window.location.origin}/?invite=${inviteCode}`;
        
        try {
            await navigator.clipboard.writeText(inviteLink);
            showMessage("success", "邀请链接已复制到剪贴板");
        } catch (err) {
            showMessage("error", "复制失败，请手动复制");
        }
    };

    // 分享到微信
    const handleShareToWechat = () => {
        const shareText = `我在艺元智算投资Token存储包，收益稳定可靠！使用我的邀请码 ${inviteCode} 注册，一起赚取更多收益！`;
        
        if (navigator.share) {
            navigator.share({
                title: '艺元智算 - Token投资平台',
                text: shareText,
                url: `${window.location.origin}/?invite=${inviteCode}`,
            }).catch(() => {});
        } else {
            handleCopyInviteLink();
            showMessage("success", "邀请信息已复制，请粘贴到微信分享");
        }
    };

    if (authLoading || loading) {
        return (
            <div
                className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-16 h-16 text-purple-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">

            {message && <div
                className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg ${message.type === "success" ? "bg-green-500" : "bg-red-500"} text-white shadow-lg`}>
                {message.text}
            </div>}
            <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>确认购买</DialogTitle>
                    </DialogHeader>
                    {selectedProduct && <div className="space-y-4 py-4">
                        <div className="p-4 bg-purple-50 rounded-lg">
                            <h4 className="font-medium text-lg">Token存储包 {selectedProduct.code}</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <Label className="text-gray-500">价格</Label>
                                <p className="text-xl font-bold text-green-600">¥{selectedProduct.price.toLocaleString()}</p>
                            </div>
                            <div>
                                <Label className="text-gray-500">周期</Label>
                                <p className="text-xl font-bold">{selectedProduct.period}天</p>
                            </div>
                            <div>
                                <Label className="text-gray-500">预期收益</Label>
                                <p className="text-lg font-bold text-blue-600">+¥{calculateProfit(selectedProduct).toLocaleString()}</p>
                            </div>
                            <div>
                                <Label className="text-gray-500">到期总额</Label>
                                <p className="text-lg font-bold text-green-600">¥{(selectedProduct.price + calculateProfit(selectedProduct)).toLocaleString()}</p>
                            </div>
                        </div>
                        {/* 收益说明 */}
                        <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                            <p>💡 购买产品只需支付Token值，到期后获得收益进智算金</p>
                        </div>
                    </div>}

                    {/* 资金流水 */}
                    {activeTab === "capitalFlow" && (
                        <div className="space-y-3 md:space-y-6">
                            <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ArrowRightLeft className="w-5 h-5" />
                                        <span className="text-sm opacity-80">资金流水</span>
                                    </div>
                                    <p className="text-xs opacity-70 mt-1">转账、转积分、提现、充值记录</p>
                                </CardContent>
                            </Card>

                            {/* 统计卡片 */}
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                                    <div className="text-xs text-gray-500">转出总额</div>
                                    <div className="text-lg font-bold text-red-600">{Number(capitalFlowData?.stats?.total_transfer_out || 0).toLocaleString()}</div>
                                </div>
                                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                                    <div className="text-xs text-gray-500">转入总额</div>
                                    <div className="text-lg font-bold text-green-600">{Number(capitalFlowData?.stats?.total_transfer_in || 0).toLocaleString()}</div>
                                </div>
                                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                                    <div className="text-xs text-gray-500">提现总额</div>
                                    <div className="text-lg font-bold text-orange-600">{Number(capitalFlowData?.stats?.total_withdraw || 0).toLocaleString()}</div>
                                </div>
                                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                                    <div className="text-xs text-gray-500">转积分</div>
                                    <div className="text-lg font-bold text-purple-600">{Number(capitalFlowData?.stats?.total_to_points || 0).toLocaleString()}</div>
                                </div>
                                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                                    <div className="text-xs text-gray-500">卖出收益</div>
                                    <div className="text-lg font-bold text-emerald-600">{Number(capitalFlowData?.stats?.total_sell_profit || 0).toLocaleString()}</div>
                                </div>
                                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                                    <div className="text-xs text-gray-500">充值总额</div>
                                    <div className="text-lg font-bold text-blue-600">{Number(capitalFlowData?.stats?.total_recharge || 0).toLocaleString()}</div>
                                </div>
                            </div>

                            {/* 类型筛选 */}
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { value: 'all', label: '全部' },
                                    { value: 'recharge', label: '充值' },
                                    { value: 'transfer_in', label: '转入' },
                                    { value: 'transfer_out', label: '转出' },
                                    { value: 'withdraw', label: '提现' },
                                    { value: 'energy_to_points', label: '转积分' },
                                    { value: 'sell_profit', label: '收益' },
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => { setCapitalFlowTab(opt.value); setCapitalFlowPage(1); }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                            capitalFlowTab === opt.value
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            {/* 流水列表 */}
                            {capitalFlowLoading ? (
                                <div className="text-center py-8 text-gray-400">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    加载中...
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {(capitalFlowData?.records || []).map((r: any) => {
                                        const flowTypeLabels: Record<string, string> = {
                                            recharge: '充值', transfer_out: '转出', transfer_in: '转入',
                                            energy_to_points: '转积分', withdraw: '提现',
                                            sell_profit: "收益",
                                        };
                                        const flowTypeColors: Record<string, string> = {
                                            transfer_out: 'bg-red-100 text-red-600',
                                            transfer_in: 'bg-green-100 text-green-600',
                                            energy_to_points: 'bg-purple-100 text-purple-600',
                                            withdraw: 'bg-orange-100 text-orange-600',
                                            recharge: 'bg-blue-100 text-blue-600',
                                            sell_profit: 'bg-emerald-100 text-emerald-600',
                                        };
                                        return (
                                            <div key={r.id} className="bg-white rounded-lg p-3 border border-gray-100 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${flowTypeColors[r.flowType] || 'bg-gray-100 text-gray-600'}`}>
                                                        {flowTypeLabels[r.flowType] || r.flowType}
                                                    </span>
                                                    <div>
                                                        <div className="text-sm font-medium">{r.note || '-'}</div>
                                                        {r.relatedUserName && <div className="text-xs text-gray-400">关联: {r.relatedUserName}</div>}
                                                        <div className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleString('zh-CN')}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`font-bold ${['transfer_out', 'withdraw', 'energy_to_points'].includes(r.flowType) ? 'text-red-600' : 'text-green-600'}`}>
                                                        {['transfer_out', 'withdraw', 'energy_to_points'].includes(r.flowType) ? '-' : '+'}{Number(r.amount).toLocaleString()}
                                                    </div>
                                                    {r.feeAmount > 0 && <div className="text-xs text-gray-400">手续费: {r.feeAmount}</div>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(!capitalFlowData?.records || capitalFlowData.records.length === 0) && (
                                        <div className="text-center py-8 text-gray-400">暂无流水记录</div>
                                    )}
                                </div>
                            )}

                            {/* 分页 */}
                            {capitalFlowData?.pagination?.totalPages > 1 && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">共 {capitalFlowData.pagination.total} 条</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCapitalFlowPage(p => Math.max(1, p - 1))}
                                            disabled={capitalFlowData.pagination.page <= 1}
                                            className="px-3 py-1 border rounded disabled:opacity-50"
                                        >上一页</button>
                                        <span className="py-1">{capitalFlowData.pagination.page}/{capitalFlowData.pagination.totalPages}</span>
                                        <button
                                            onClick={() => setCapitalFlowPage(p => Math.min(capitalFlowData.pagination.totalPages, p + 1))}
                                            disabled={capitalFlowData.pagination.page >= capitalFlowData.pagination.totalPages}
                                            className="px-3 py-1 border rounded disabled:opacity-50"
                                        >下一页</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowPurchaseDialog(false);
                        }}>取消</Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={handlePurchase}
                            disabled={submitting || !selectedProduct}>
                            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}确认购买
                                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={showSellDialog} onOpenChange={setShowSellDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>出售产品</DialogTitle>
                    </DialogHeader>
                    {selectedUserProduct && <div className="space-y-4 py-4">
                        <div className="p-4 bg-purple-50 rounded-lg">
                            <h4 className="font-medium text-lg">Token存储包 {selectedUserProduct.products?.code}</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <Label className="text-gray-500">购买价格（Token值）</Label>
                                <p className="text-lg font-bold">¥{selectedUserProduct.purchase_price.toLocaleString()}</p>
                            </div>
                            <div>
                                <Label className="text-gray-500">收益（立即到账）</Label>
                                <p className="text-lg font-bold text-green-600">+¥{selectedUserProduct.expected_profit.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                            <h4 className="font-medium text-orange-800 mb-2">出售流程说明</h4>
                            <div className="space-y-1 text-sm text-orange-700">
                                <p>1. 出售后收益立即到账</p>
                                <p>2. 产品回到服务商，等待服务商匹配新会员</p>
                                <p>3. 服务商匹配成功后，Token值回到您的账户</p>
                            </div>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                            <p>💡 收益线上即时到账，Token值在匹配成功后流转。产品在匹配完成前显示为"售卖中"。</p>
                        </div>
                    </div>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSellDialog(false)}>取消</Button>
                        <Button
                            className="bg-orange-600 hover:bg-orange-700"
                            onClick={handleSell}
                            disabled={submitting}>
                            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}确认出售
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* 卖家联系方式弹窗 */}
            <Dialog open={showApplyDialog} onOpenChange={(open) => {
                setShowApplyDialog(open);
                if (open) checkApplyEligibility();
            }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-purple-500" />申请成为服务商
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                            {user?.providerId ? "审核流程：上级服务商审核 → 服务网点最终审核" : "审核流程：服务网点直接审核"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* 资格检查提示 */}
                        {checkingEligibility ? (
                            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-500 flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />正在检查申请资格...
                            </div>
                        ) : applyEligibility ? (
                            <div className={`p-3 rounded-lg text-sm ${applyEligibility.canApply ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                <p className="font-medium mb-1">
                                    {applyEligibility.canApply ? "✓ 符合申请条件" : "✗ 暂不符合申请条件"}
                                </p>
                                <p className="text-xs">
                                    有效推荐会员：{applyEligibility.effectiveMembers} / {applyEligibility.requiredMembers}（需推荐3个以上有效会员）
                                </p>
                            </div>
                        ) : null}

                        {applyEligibility && !applyEligibility.canApply ? (
                            <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
                                <p className="font-medium">如何满足申请条件：</p>
                                <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                                    <li>分享您的邀请码给好友注册</li>
                                    <li>需要至少3个有效（已激活）推荐会员</li>
                                    <li>当前已推荐 {applyEligibility.effectiveMembers} 个，还需 {applyEligibility.requiredMembers - applyEligibility.effectiveMembers} 个</li>
                                </ul>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="applicantName">真实姓名 *</Label>
                                    <Input
                                        id="applicantName"
                                        value={applicantName}
                                        onChange={e => setApplicantName(e.target.value)}
                                        placeholder="请输入真实姓名" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">手机号 *</Label>
                                    <Input
                                        id="phone"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        placeholder="请输入手机号" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="alipay">支付宝账号</Label>
                                    <Input
                                        id="alipay"
                                        value={alipayAccount}
                                        onChange={e => setAlipayAccount(e.target.value)}
                                        placeholder="请输入支付宝账号（用于收益提现）" />
                                </div>
                                {!user?.providerId && <div className="space-y-2">
                                    <Label htmlFor="branchId">选择服务网点 *</Label>
                                    <Input
                                        id="branchId"
                                        value={branchId}
                                        onChange={e => setBranchId(e.target.value)}
                                        placeholder="请输入服务网点ID或用户名" />
                                    <p className="text-xs text-gray-500">请联系服务网点获取ID</p>
                                </div>}
                                <div className="space-y-2">
                                    <Label htmlFor="quota">申请额度（元）</Label>
                                    <Input
                                        id="quota"
                                        type="number"
                                        value={quotaRequest}
                                        onChange={e => setQuotaRequest(e.target.value)}
                                        placeholder="申请的额度" />
                                    <p className="text-xs text-gray-500">
                                        {user?.providerId 
                                            ? "上级服务商将从自己额度中拆分给您" 
                                            : "通过后由服务网点分配额度"}
                                    </p>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                                    <p className="font-medium mb-1">成为服务商的权益：</p>
                                    <ul className="list-disc list-inside space-y-1 text-xs">
                                        <li>获得Token值，生成Token存储包上架销售</li>
                                        <li>享受会员购买产品时收益分成</li>
                                        <li>可发展下级服务商，获得团队收益分成</li>
                                        <li>管理会员产品购买与流转</li>
                                    </ul>
                                </div>
                                {user?.providerId && (
                                    <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
                                        <p className="font-medium">审核流程说明：</p>
                                        <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                                            <li>第一步：上级服务商审核（拆分额度）</li>
                                            <li>第二步：服务网点最终审核（线下签合同确认）</li>
                                            <li>通过后：您所有直推会员自动迁移到您的体系</li>
                                        </ul>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowApplyDialog(false)}>取消</Button>
                        {applyEligibility?.canApply && (
                            <Button
                                className="bg-purple-600 hover:bg-purple-700"
                                onClick={handleApplyProvider}
                                disabled={submitting}>
                                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Star className="w-4 h-4 mr-2" />}提交申请
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            <header className="border-b bg-white shadow-sm sticky top-0 z-40">
                <div className="container mx-auto px-3 md:px-6 py-3 md:py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div
                                className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                                <Cpu className="w-5 h-5 md:w-6 md:h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-base md:text-xl font-bold text-gray-900">艺元智算</h1>
                                <p className="text-xs text-gray-500 hidden md:block">Token收益平台</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4">
                            {/* 会员信息 */}
                            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                            <div className="text-left">
                                <p className="text-sm font-semibold text-gray-900">
                                    {user?.name || '会员'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    ID: {user?.unique_id || 'N/A'}
                                </p>
                            </div>
                        </div>
                            {notifications.filter(n => !n.is_read).length > 0 && <Badge className="bg-red-100 text-red-700">
                                <Bell className="w-3 h-3 mr-1" />{notifications.filter(n => !n.is_read).length}条新消息
                                                </Badge>}
                            <Badge className="bg-green-100 text-green-700 text-xs">
                                <Users className="w-3 h-3 mr-1" />会员
                                              </Badge>
                            <Button variant="ghost" onClick={logout} className="text-sm">退出</Button>
                        </div>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-3 md:px-6 py-4 md:py-8">
                    {/* 资产概览 - 移除余额显示 */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 mb-4 md:mb-8">
                    <Card className="mobile-compact-card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-2">
                                <Package className="w-5 h-5 mobile-icon" />
                                <span className="opacity-80 text-sm mobile-label">持有Token</span>
                            </div>
                            <p className="text-2xl font-bold mt-2 mobile-num">¥{stats.total_holding?.toLocaleString() || 0}</p>
                        </CardContent>
                    </Card>
                    <Card className="mobile-compact-card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 mobile-icon" />
                                <span className="opacity-80 text-sm mobile-label">智算金</span>
                            </div>
                            <p className="text-2xl font-bold mt-2 mobile-num">¥{user?.energy_value?.toLocaleString() || 0}</p>
                            <div className="flex gap-2 mt-3">
                                <Button size="sm" variant="secondary" className="h-7 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
                                    onClick={() => setShowBalanceTransferDialog(true)}>
                                    <ArrowLeftRight className="w-3 h-3 mr-1" />互转
                                </Button>
                                <Button size="sm" variant="secondary" className="h-7 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
                                    onClick={() => setShowBalanceConvertDialog(true)}>
                                    <Repeat className="w-3 h-3 mr-1" />转积分
                                </Button>
                                <Button size="sm" variant="secondary" className="h-7 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
                                    onClick={() => setShowWithdrawDialog(true)}>
                                    <Wallet className="w-3 h-3 mr-1" />提现
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="mobile-compact-card bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 mobile-icon" />
                                <span className="opacity-80 text-sm mobile-label">购买产品</span>
                            </div>
                            <p className="text-2xl font-bold mt-2 mobile-num">{userProducts?.filter(up => up.status === 'holding' || up.status === 'pending_sell' || up.status === 'expired' || up.status === 'recycled').length || 0}<span className="text-sm font-normal opacity-80 ml-1">个</span></p>
                        </CardContent>
                    </Card>
                    <Card className="mobile-compact-card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 mobile-icon" />
                                <span className="opacity-80 text-sm mobile-label">直推人数</span>
                            </div>
                            <p className="text-2xl font-bold mt-2 mobile-num">{referralStats?.directCount || 0}<span className="text-sm font-normal opacity-80 ml-1">人</span></p>
                        </CardContent>
                    </Card>
                    <Card className="mobile-compact-card bg-gradient-to-br from-rose-500 to-rose-600 text-white">
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-2">
                                <Gift className="w-5 h-5 mobile-icon" />
                                <span className="opacity-80 text-sm mobile-label">直推收益</span>
                            </div>
                            <p className="text-2xl font-bold mt-2 mobile-num">¥{referralStats?.totalReward?.toLocaleString() || 0}</p>
                        </CardContent>
                    </Card>
                </div>
                    <div className="space-y-3 md:space-y-6">
                    <div className="mobile-tab-nav flex gap-4 border-b overflow-x-auto scrollbar-hide">
                        <button
                            onClick={() => setActiveTab("profile")}
                            className={`px-4 py-2 border-b-2 transition-colors flex-shrink-0 ${activeTab === "profile" ? "border-green-500 text-green-600" : "border-transparent text-gray-500"}`}>
                            <User className="w-4 h-4 inline mr-2" />我的资料
                        </button>
                        <button
                            onClick={() => setActiveTab("products")}
                            className={`px-4 py-2 border-b-2 transition-colors flex-shrink-0 ${activeTab === "products" ? "border-green-500 text-green-600" : "border-transparent text-gray-500"}`}>
                            <ShoppingCart className="w-4 h-4 inline mr-2" />购买Token
                        </button>
                        <button
                            onClick={() => setActiveTab("holdings")}
                            className={`px-4 py-2 border-b-2 transition-colors flex-shrink-0 ${activeTab === "holdings" ? "border-green-500 text-green-600" : "border-transparent text-gray-500"}`}>
                            <Package className="w-4 h-4 inline mr-2" />我的持仓
                        </button>

                        <button
                            onClick={() => {
                                setActiveTab("notifications");
                            }}
                            className={`px-4 py-2 border-b-2 transition-colors flex-shrink-0 ${activeTab === "notifications" ? "border-green-500 text-green-600" : "border-transparent text-gray-500"}`}>
                            <Bell className="w-4 h-4 inline mr-2" />消息通知
                            {notifications.filter(n => !n.is_read).length > 0 && <Badge className="ml-2 bg-red-500 text-white text-xs">
                                {notifications.filter(n => !n.is_read).length}
                            </Badge>}
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab("profit");
                                loadProfitRecords();
                            }}
                            className={`px-4 py-2 border-b-2 transition-colors flex-shrink-0 ${activeTab === "profit" ? "border-green-500 text-green-600" : "border-transparent text-gray-500"}`}>
                            <TrendingUp className="w-4 h-4 inline mr-2" />我的收益
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab("points");
                                loadPointsRecords();
                            }}
                            className={`px-4 py-2 border-b-2 transition-colors flex-shrink-0 ${activeTab === "points" ? "border-green-500 text-green-600" : "border-transparent text-gray-500"}`}>
                            <Gift className="w-4 h-4 inline mr-2" />我的积分
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab("capitalFlow");
                                loadCapitalFlow();
                            }}
                            className={`px-4 py-2 border-b-2 transition-colors flex-shrink-0 ${activeTab === "capitalFlow" ? "border-green-500 text-green-600" : "border-transparent text-gray-500"}`}>
                            <ArrowRightLeft className="w-4 h-4 inline mr-2" />资金流水
                        </button>
                        <button
                            onClick={() => setShowApplyDialog(true)}
                            className="px-4 py-2 border-b-2 border-transparent text-purple-600 hover:text-purple-700 flex-shrink-0">
                            <Star className="w-4 h-4 inline mr-2" />申请服务商
                        </button>
                    </div>
        
                    {/* 我的资料 */}
                    {activeTab === "profile" && (
                        <div className="space-y-4">
                            {/* 子Tab导航 */}
                            <div className="flex border-b bg-gray-50 rounded-t-lg overflow-hidden">
                                <button
                                    onClick={() => setProfileSubTab("info")}
                                    className={`px-6 py-3 text-sm font-medium transition-colors ${
                                        profileSubTab === "info" 
                                            ? "text-green-600 bg-white border-b-2 border-green-500" 
                                            : "text-gray-600 hover:text-green-600 hover:bg-gray-50"
                                    }`}
                                >
                                    <User className="w-4 h-4 inline mr-2" />基本资料
                                </button>
                                <button
                                    onClick={() => setProfileSubTab("payment")}
                                    className={`px-6 py-3 text-sm font-medium transition-colors ${
                                        profileSubTab === "payment" 
                                            ? "text-green-600 bg-white border-b-2 border-green-500" 
                                            : "text-gray-600 hover:text-green-600 hover:bg-gray-50"
                                    }`}
                                >
                                    <Wallet className="w-4 h-4 inline mr-2" />收款信息
                                </button>
                                <button
                                    onClick={() => setProfileSubTab("invite")}
                                    className={`px-6 py-3 text-sm font-medium transition-colors ${
                                        profileSubTab === "invite" 
                                            ? "text-green-600 bg-white border-b-2 border-green-500" 
                                            : "text-gray-600 hover:text-green-600 hover:bg-gray-50"
                                    }`}
                                >
                                    <Gift className="w-4 h-4 inline mr-2" />邀请推广
                                </button>
                                <button
                                    onClick={() => { setProfileSubTab("chain"); loadChainData(); }}
                                    className={`px-6 py-3 text-sm font-medium transition-colors ${
                                        profileSubTab === "chain" 
                                            ? "text-green-600 bg-white border-b-2 border-green-500" 
                                            : "text-gray-600 hover:text-green-600 hover:bg-gray-50"
                                    }`}
                                >
                                    <Network className="w-4 h-4 inline mr-2" />关系链
                                </button>
                                <button
                                    onClick={() => setProfileSubTab("password")}
                                    className={`px-6 py-3 text-sm font-medium transition-colors ${
                                        profileSubTab === "password" 
                                            ? "text-green-600 bg-white border-b-2 border-green-500" 
                                            : "text-gray-600 hover:text-green-600 hover:bg-gray-50"
                                    }`}
                                >
                                    <Lock className="w-4 h-4 inline mr-2" />修改密码
                                </button>
                            </div>

                            {/* 基本资料子Tab */}
                            {profileSubTab === "info" && (
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* 基本信息 */}
                                            <div className="space-y-4">
                                                <h3 className="font-medium text-lg border-b pb-2">基本信息</h3>
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between py-2 border-b">
                                                        <span className="text-gray-500">专属ID</span>
                                                        <span className="font-medium text-sm">{user?.unique_id || '-'}</span>
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
                                                        <Badge className="bg-green-100 text-green-700">会员</Badge>
                                                    </div>
                                                    <div className="flex items-center justify-between py-2 border-b">
                                                        <span className="text-gray-500">手机号</span>
                                                        <span>{user?.phone || '-'}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between py-2 border-b">
                                                        <span className="text-gray-500">真实姓名</span>
                                                        <span>{user?.real_name || '未填写'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 账户信息 */}
                                            <div className="space-y-4">
                                                <h3 className="font-medium text-lg border-b pb-2">账户信息</h3>
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between py-2 border-b">
                                                        <span className="text-gray-500">账户余额</span>
                                                        <span className="font-medium">¥{(user?.energy_value || 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between py-2 border-b">
                                                        <span className="text-gray-500">专属ID</span>
                                                        <span className="font-mono text-sm">{user?.unique_id || '-'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* 收款信息子Tab */}
                            {profileSubTab === "payment" && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Wallet className="w-5 h-5 text-green-600" />
                                            收款信息设置
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 md:space-y-6">
                                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                            <p className="text-sm text-blue-700">
                                                <strong>提示：</strong>请填写您的支付宝和微信收款信息，以便产品收益和Token值回流时进行验证。付款码用于线下转账确认。
                                            </p>
                                        </div>

                                        {/* 支付宝信息 */}
                                        <div className="space-y-4">
                                            <h3 className="font-medium text-lg flex items-center gap-2">
                                                <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm">支</span>
                                                支付宝
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label>支付宝账号</Label>
                                                    <Input 
                                                        value={alipayAccount}
                                                        onChange={(e) => setAlipayAccount(e.target.value)}
                                                        className="mt-1"
                                                        placeholder="请输入支付宝账号"
                                                    />
                                                </div>
                                                <div>
                                                    <Label>真实姓名（与支付宝一致）</Label>
                                                    <Input 
                                                        value={user?.real_name || ''}
                                                        onChange={(e) => {
                                                            const newUser = { ...user, real_name: e.target.value } as typeof user;
                                                            setUser(newUser);
                                                            localStorage.setItem('userData', JSON.stringify(newUser));
                                                        }}
                                                        className="mt-1"
                                                        placeholder="请输入真实姓名"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* 微信信息 */}
                                        <div className="space-y-4 pt-4 border-t">
                                            <h3 className="font-medium text-lg flex items-center gap-2">
                                                <span className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm">微</span>
                                                微信
                                            </h3>
                                            <div>
                                                <Label>微信账号</Label>
                                                <Input 
                                                    value={wechatAccount}
                                                    onChange={(e) => setWechatAccount(e.target.value)}
                                                    className="mt-1"
                                                    placeholder="请输入微信账号"
                                                />
                                            </div>
                                        </div>

                                        {/* 付款码上传 */}
                                        <div className="space-y-4 pt-4 border-t">
                                            <h3 className="font-medium text-lg flex items-center gap-2">
                                                <span className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm">码</span>
                                                付款码上传
                                            </h3>
                                            <p className="text-sm text-gray-500">上传您的支付宝或微信付款码图片，方便服务商扫码转账</p>
                                            
                                            <div className="flex items-start gap-6">
                                                {/* 支付宝付款码 */}
                                                <div className="flex-1">
                                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-green-500 transition-colors">
                                                        {paymentQRCode ? (
                                                            <div className="relative">
                                                                <img 
                                                                    src={paymentQRCode} 
                                                                    alt="付款码" 
                                                                    className="max-h-48 mx-auto rounded"
                                                                />
                                                                <Button
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    className="mt-2"
                                                                    onClick={() => setPaymentQRCode(null)}
                                                                >
                                                                    删除
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <label className="cursor-pointer">
                                                                <div className="py-8">
                                                                    <Upload className="w-12 h-12 mx-auto mb-2 text-gray-400" />
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
                                                    <p className="text-center text-sm text-gray-500 mt-2">支付宝付款码</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t">
                                            <Button 
                                                className="bg-green-600"
                                                onClick={async () => {
                                                    // 保存收款信息
                                                    try {
                                                        const response = await authFetch('/api/member/payment-info', {
                                                            method: 'PUT',
                                                            body: JSON.stringify({
                                                                wechatAccount,
                                                                alipayAccount,
                                                                paymentQRCode
                                                            })
                                                        });
                                                        const data = await response.json();
                                                        if (data.success) {
                                                            showMessage("success", "收款信息已保存");
                                                        } else {
                                                            showMessage("error", data.error || "保存失败");
                                                        }
                                                    } catch {
                                                        showMessage("error", "保存失败，请稍后重试");
                                                    }
                                                }}
                                            >
                                                保存收款信息
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* 邀请推广子Tab */}
                            {profileSubTab === "invite" && (
                                <div className="space-y-3 md:space-y-6">
                                    {/* 邀请码卡片 */}
                                    <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white overflow-hidden relative">
                                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cGF0aCBkPSJNMCAwaDEwMHYxMDBIMHoiIGZpbGw9Im5vbmUiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIyIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-30"></div>
                                        <CardContent className="relative z-10 py-8">
                                            <div className="text-center mb-6">
                                                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                                                    <Gift className="w-8 h-8" />
                                                </div>
                                                <h3 className="text-2xl font-bold mb-2">邀请好友</h3>
                                                <p className="text-white/80 text-sm">分享您的邀请码，好友注册后您可获得奖励</p>
                                            </div>
                                            
                                            {/* 邀请码显示 */}
                                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
                                                <div className="text-center">
                                                    <p className="text-white/70 text-sm mb-2">您的邀请码</p>
                                                    <div className="flex items-center justify-center gap-3">
                                                        <span className="text-3xl font-bold tracking-wider font-mono">
                                                            {inviteCode || "加载中..."}
                                                        </span>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-white border-white/30 hover:bg-white/20"
                                                            onClick={handleCopyInviteCode}
                                                        >
                                                            {copySuccess ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* 操作按钮 */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    variant="outline"
                                                    className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                                                    onClick={handleCopyInviteLink}
                                                >
                                                    <LinkIcon className="w-4 h-4 mr-2" />
                                                    复制链接
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                                                    onClick={handleShareToWechat}
                                                >
                                                    <Share2 className="w-4 h-4 mr-2" />
                                                    分享邀请
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* 邀请统计 */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <Card className="text-center">
                                            <CardContent className="pt-4">
                                                <Users className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                                                <p className="text-2xl font-bold text-gray-800">{referralStats.directCount}</p>
                                                <p className="text-sm text-gray-500">直推人数</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="text-center">
                                            <CardContent className="pt-4">
                                                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-500" />
                                                <p className="text-2xl font-bold text-gray-800">¥{referralStats.totalInvest.toLocaleString()}</p>
                                                <p className="text-sm text-gray-500">直推投资额</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="text-center">
                                            <CardContent className="pt-4">
                                                <Award className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                                                <p className="text-2xl font-bold text-gray-800">¥{referralStats.totalReward.toLocaleString()}</p>
                                                <p className="text-sm text-gray-500">累计奖励</p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* 直推人员列表 */}
                                    {referralStats.members.length > 0 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <Users className="w-5 h-5 text-blue-500" />
                                                    我的直推人员 ({referralStats.directCount}人)
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2">
                                                    {referralStats.members.map((member) => (
                                                        <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                                                                    <User className="w-4 h-4 text-blue-600" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-sm">{member.username} <span className="text-xs text-gray-400">[{member.uniqueId}]</span></p>
                                                                    <p className="text-xs text-gray-500">{member.phone}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <Badge variant="secondary" className="text-xs">
                                                                    {member.role === 'provider' ? '服务商' : '会员'}
                                                                </Badge>
                                                                <p className="text-xs text-gray-400 mt-1">{new Date(member.createdAt).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* 保护期 */}
                                    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Shield className="w-5 h-5 text-blue-500" />
                                                账号保护期
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {/* 保护期倒计时 */}
                                            <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">当前保护期状态</p>
                                                    <p className={`text-lg font-bold ${protectionInfo?.isProtected ? 'text-green-600' : 'text-red-500'}`}>
                                                        {protectionInfo?.isProtected ? '保护中' : '已过期'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-muted-foreground">剩余天数</p>
                                                    <p className="text-2xl font-bold text-blue-600">
                                                        {protectionInfo?.remainingDays ?? '-'}
                                                        <span className="text-sm font-normal text-muted-foreground ml-1">天</span>
                                                    </p>
                                                </div>
                                            </div>

                                            {/* 有效直推统计 */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-3 bg-white rounded-xl shadow-sm text-center">
                                                    <p className="text-sm text-muted-foreground">有效直推人数</p>
                                                    <p className="text-xl font-bold text-blue-600">{protectionInfo?.validReferrals ?? 0}</p>
                                                </div>
                                                <div className="p-3 bg-white rounded-xl shadow-sm text-center">
                                                    <p className="text-sm text-muted-foreground">累计延长天数</p>
                                                    <p className="text-xl font-bold text-green-600">{(protectionInfo?.validReferrals ?? 0) * 18}</p>
                                                </div>
                                            </div>

                                            {/* 到期时间 */}
                                            {protectionInfo?.expiresAt && (
                                                <div className="p-3 bg-white rounded-xl shadow-sm flex items-center justify-between">
                                                    <span className="text-sm text-muted-foreground">保护期到期时间</span>
                                                    <span className="text-sm font-medium">{new Date(protectionInfo.expiresAt).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                                                </div>
                                            )}

                                            {/* 保护期规则说明 */}
                                            <div className="p-3 bg-blue-100/60 rounded-lg border border-blue-200">
                                                <p className="text-sm font-medium text-blue-800 mb-2">保护期规则</p>
                                                <ul className="text-xs text-blue-700 space-y-1">
                                                    <li>• 注册即享18天保护期</li>
                                                    <li>• 每推荐1位有效直推 +18天</li>
                                                    <li>• 有效直推：被推荐人购买产品累计≥¥3,000</li>
                                                </ul>
                                            </div>

                                            {/* 延长记录 */}
                                            {protectionInfo?.extensions && protectionInfo.extensions.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-sm font-medium">延长记录</p>
                                                    {protectionInfo.extensions.map((ext: { id: string; referred_name: string; purchase_amount: number; extended_days: number; created_at: string }) => (
                                                        <div key={ext.id} className="flex items-center justify-between p-2 bg-white rounded-lg text-sm">
                                                            <span className="text-muted-foreground">
                                                                {ext.referred_name || '用户'} 购买 ¥{Number(ext.purchase_amount).toLocaleString()}
                                                            </span>
                                                            <span className="text-green-600 font-medium">+{ext.extended_days}天</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* 邀请规则 */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Star className="w-5 h-5 text-yellow-500" />
                                                邀请奖励规则
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                                <h4 className="font-medium text-yellow-800 mb-2">直推奖励</h4>
                                                <ul className="space-y-2 text-sm text-yellow-700">
                                                    <li className="flex items-start gap-2">
                                                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                        <span>好友注册时填写您的邀请码，双方自动建立绑定关系</span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                        <span>好友购买Token时，您可获得好友交易额的一定比例作为奖励</span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                        <span>奖励实时到账，可提现</span>
                                                    </li>
                                                </ul>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* 关系链子Tab */}
                            {profileSubTab === "chain" && (
                                <div className="space-y-4">
                                    {chainLoading ? (
                                        <Card>
                                            <CardContent className="py-12 text-center">
                                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600" />
                                                <p className="mt-4 text-gray-500">加载中...</p>
                                            </CardContent>
                                        </Card>
                                    ) : chainData ? (
                                        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2 text-white">
                                                    <Network className="w-5 h-5 text-emerald-400" />
                                                    我的关系链
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                {/* 关系说明 */}
                                                <div className="space-y-4">
                                                    {/* 会员关系链：智算中心 → 服务网点 → 服务商 → 会员 */}
                                                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                                        <h4 className="text-emerald-400 font-medium mb-3 flex items-center gap-2">
                                                            <Badge className="bg-emerald-600 text-white text-xs">会员</Badge>
                                                            关系链说明
                                                        </h4>
                                                        <div className="flex flex-wrap items-center gap-2 text-slate-300 text-sm">
                                                            <span>智算中心</span>
                                                            <ArrowRight className="w-4 h-4 text-slate-500" />
                                                            <span>服务网点</span>
                                                            <ArrowRight className="w-4 h-4 text-slate-500" />
                                                            <span>服务商</span>
                                                            <ArrowRight className="w-4 h-4 text-slate-500" />
                                                            <span className="text-emerald-400 font-medium">{chainData.self?.username || '我'}</span>
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
                                                                    <p className="text-blue-400 font-medium">{chainData.branch.username}</p>
                                                                    <p className="text-slate-400 text-sm">上级：智算中心</p>
                                                                </div>
                                                                <Badge className="bg-blue-600 text-white">服务网点</Badge>
                                                            </div>
                                                        )}

                                                        {/* 服务商 */}
                                                        {chainData.provider && (
                                                            <div className="flex items-center gap-3 p-3 bg-purple-900/30 rounded-lg border border-purple-800/50">
                                                                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                                                                    <Server className="w-5 h-5 text-white" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-purple-400 font-medium">{chainData.provider.username}</p>
                                                                    <p className="text-slate-400 text-sm">
                                                                        上级：{chainData.branch ? chainData.branch.username : '智算中心'}
                                                                    </p>
                                                                </div>
                                                                <Badge className="bg-purple-600 text-white">服务商</Badge>
                                                            </div>
                                                        )}

                                                        {/* 推荐人（如果没有服务商，则显示推荐人） */}
                                                        {chainData.inviter && !chainData.provider && (
                                                            <div className="flex items-center gap-3 p-3 bg-yellow-900/30 rounded-lg border border-yellow-800/50">
                                                                <div className="w-10 h-10 rounded-full bg-yellow-600 flex items-center justify-center">
                                                                    <UserPlus className="w-5 h-5 text-white" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-yellow-400 font-medium">{chainData.inviter.username}</p>
                                                                    <p className="text-slate-400 text-sm">推荐人</p>
                                                                </div>
                                                                <Badge className="bg-yellow-600 text-white">{chainData.inviter.roleName}</Badge>
                                                            </div>
                                                        )}

                                                        {/* 当前用户 */}
                                                        <div className="flex items-center gap-3 p-3 bg-emerald-900/30 rounded-lg border border-emerald-800/50">
                                                            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center">
                                                                <User className="w-5 h-5 text-white" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-emerald-400 font-bold">{chainData.self?.username}</p>
                                                                <p className="text-slate-400 text-sm">
                                                                    下级：{chainData.branch ? chainData.branch.username + ' → ' : ''}{chainData.provider ? chainData.provider.username + ' → ' : ''}我
                                                                </p>
                                                            </div>
                                                            <Badge className="bg-emerald-600 text-white">
                                                                {chainData.self?.role === 'provider' ? '服务商' : '会员'}
                                                            </Badge>
                                                        </div>
                                                    </div>

                                                    {/* 无上级提示 */}
                                                    {!chainData.branch && !chainData.provider && !chainData.inviter && (
                                                        <div className="text-center py-8 text-slate-400">
                                                            <Network className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                                            <p>您还没有关联上级</p>
                                                            <p className="text-sm mt-1">请联系服务商获取推荐码进行关联</p>
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

                            {/* 修改密码Tab */}
                            {profileSubTab === "password" && (
                                <div className="space-y-3 md:space-y-6">
                                    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 text-white">
                                                <Lock className="w-5 h-5 text-emerald-400" />
                                                修改登录密码
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                                                <div className="space-y-2">
                                                    <Label className="text-slate-300">当前密码</Label>
                                                    <div className="relative">
                                                        <Input
                                                            type={showOldPassword ? "text" : "password"}
                                                            value={oldPassword}
                                                            onChange={(e) => setOldPassword(e.target.value)}
                                                            placeholder="请输入当前密码"
                                                            className="bg-slate-800 border-slate-600 text-white pr-10"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowOldPassword(!showOldPassword)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                                                        >
                                                            {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-slate-300">新密码</Label>
                                                    <div className="relative">
                                                        <Input
                                                            type={showNewPassword ? "text" : "password"}
                                                            value={newPassword}
                                                            onChange={(e) => setNewPassword(e.target.value)}
                                                            placeholder="请输入新密码（至少6位）"
                                                            className="bg-slate-800 border-slate-600 text-white pr-10"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                                                        >
                                                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-slate-300">确认新密码</Label>
                                                    <div className="relative">
                                                        <Input
                                                            type={showConfirmPassword ? "text" : "password"}
                                                            value={confirmPassword}
                                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                                            placeholder="请再次输入新密码"
                                                            className="bg-slate-800 border-slate-600 text-white pr-10"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                                                        >
                                                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="submit"
                                                    disabled={changingPassword}
                                                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
                                                >
                                                    {changingPassword ? (
                                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    ) : (
                                                        <Lock className="w-4 h-4 mr-2" />
                                                    )}
                                                    {changingPassword ? "修改中..." : "确认修改"}
                                                </Button>
                                            </form>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "products" && <div className="space-y-3 md:space-y-6">
                                    
                        {/* 购买限制提示 */}
                        {purchaseLimits && (
                            <div className="grid grid-cols-3 gap-2">
                                {/* 持仓金额限制 */}
                                <Card className={`border ${purchaseLimits.limits?.holdingLimitReached ? 'border-red-400 bg-red-600' : 'border-amber-400 bg-amber-600'}`}>
                                    <CardContent className="p-2">
                                        <div className="flex items-center gap-1 mb-1">
                                            <Wallet className={`w-3.5 h-3.5 text-white/80`} />
                                            <span className="text-xs font-medium text-white/80">持仓限额</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-lg font-bold text-white">{Number(purchaseLimits.limits?.currentHolding || 0).toLocaleString()}</p>
                                                <p className="text-[10px] text-white/60">/ {purchaseLimits.limits?.maxHolding?.toLocaleString()} 元</p>
                                            </div>
                                            <Badge variant="outline" className={`text-[10px] ${purchaseLimits.limits?.holdingLimitReached ? 'bg-red-400/30 text-white border-red-300' : 'bg-amber-400/30 text-white border-amber-300'}`}>
                                                {purchaseLimits.limits?.holdingLimitReached ? '已达' : `余 ${Number(purchaseLimits.limits?.remainingHolding || 0).toLocaleString()}`}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* 直推会员状态 */}
                                <Card className={`border ${purchaseLimits.limits?.hasDirectReferral ? 'border-green-400 bg-green-600' : 'border-orange-400 bg-orange-600'}`}>
                                    <CardContent className="p-2">
                                        <div className="flex items-center gap-1 mb-1">
                                            <Users className={`w-3.5 h-3.5 text-white/80`} />
                                            <span className="text-xs font-medium text-white/80">直推会员</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-lg font-bold text-white">
                                                    {purchaseLimits.limits?.hasDirectReferral ? `${purchaseLimits.limits?.directReferralCount || 1}人` : '无'}
                                                </p>
                                                <p className="text-[10px] text-white/60">
                                                    {purchaseLimits.limits?.hasDirectReferral ? purchaseLimits.limits?.directReferralInfo?.username : '未推荐'}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className={`text-[10px] ${purchaseLimits.limits?.hasDirectReferral ? 'bg-green-400/30 text-white border-green-300' : 'bg-orange-400/30 text-white border-orange-300'}`}>
                                                {purchaseLimits.limits?.hasDirectReferral ? '已激活' : '待激活'}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* 保护期状态 */}
                                <Card className={`border ${purchaseLimits.limits?.isTimeLocked ? 'border-red-400 bg-red-600' : purchaseLimits.limits?.graceRemainingDays > 0 ? 'border-green-400 bg-green-600' : !purchaseLimits.limits?.firstPurchaseDate ? 'border-blue-400 bg-blue-600' : purchaseLimits.limits?.hasDirectReferral ? 'border-green-400 bg-green-600' : 'border-slate-400 bg-slate-600'}`}>
                                    <CardContent className="p-2">
                                        <div className="flex items-center gap-1 mb-1">
                                            <Clock className={`w-3.5 h-3.5 text-white/80`} />
                                            <span className="text-xs font-medium text-white/80">保护期</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                {purchaseLimits.limits?.isTimeLocked ? (
                                                    <>
                                                        <p className="text-lg font-bold text-white">已锁定</p>
                                                        <p className="text-[10px] text-white/60">需直推会员</p>
                                                    </>
                                                ) : purchaseLimits.limits?.graceRemainingDays > 0 ? (
                                                    <>
                                                        <p className="text-lg font-bold text-white">
                                                            {purchaseLimits.limits?.graceRemainingDays}
                                                            <span className="text-xs font-normal text-white/60"> 天</span>
                                                        </p>
                                                        <p className="text-[10px] text-white/60">保护中</p>
                                                    </>
                                                ) : purchaseLimits.limits?.hasDirectReferral ? (
                                                    <>
                                                        <p className="text-lg font-bold text-white">已解除</p>
                                                        <p className="text-[10px] text-white/60">有直推会员</p>
                                                    </>
                                                ) : !purchaseLimits.limits?.firstPurchaseDate ? (
                                                    <>
                                                        <p className="text-lg font-bold text-white">新用户</p>
                                                        <p className="text-[10px] text-white/60">可正常购买</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="text-lg font-bold text-white">待激活</p>
                                                        <p className="text-[10px] text-white/60">需直推会员</p>
                                                    </>
                                                )}
                                            </div>
                                            <Badge variant="outline" className={`text-[10px] text-white/80 bg-white/10`}>
                                                {purchaseLimits.limits?.isTimeLocked ? '已锁定' : purchaseLimits.limits?.graceRemainingDays > 0 ? '保护中' : !purchaseLimits.limits?.firstPurchaseDate ? '可购买' : purchaseLimits.limits?.hasDirectReferral ? '已解除' : '待激活'}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {products.length > 0 && <Card className="border-green-200 bg-gradient-to-r from-green-900 to-green-800 text-white">
                            <CardContent className="py-4">
                                <div className="flex items-center gap-3">
                                    <Zap className="w-6 h-6 text-yellow-400" />
                                    <div>
                                        <p className="font-medium text-white">服务商上架了 {products.length}个Token存储包</p>
                                        <p className="text-sm text-green-200">选择适合您的Token存储包进行购买</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>}

                        {/* GPU产品说明 */}
                        <div className="grid grid-cols-3 gap-4">
                            <Card className="bg-gradient-to-br from-blue-900/80 to-slate-900 border-blue-800/50">
                                <CardContent className="p-4 text-center">
                                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-blue-500/20 flex items-center justify-center">
                                        <Cpu className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <h4 className="font-bold text-blue-400 mb-1">蓝色系 · 入门级</h4>
                                    <p className="text-xs text-slate-400">英伟达 RTX 系列</p>
                                    <p className="text-xs text-slate-500 mt-1">¥1,000 - ¥5,000</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-green-900/80 to-slate-900 border-green-800/50">
                                <CardContent className="p-4 text-center">
                                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-500/20 flex items-center justify-center">
                                        <Server className="w-6 h-6 text-green-400" />
                                    </div>
                                    <h4 className="font-bold text-green-400 mb-1">绿色系 · 进阶级</h4>
                                    <p className="text-xs text-slate-400">华为昇腾系列</p>
                                    <p className="text-xs text-slate-500 mt-1">¥5,000 - ¥30,000</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-amber-900/80 to-slate-900 border-amber-800/50">
                                <CardContent className="p-4 text-center">
                                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-amber-500/20 flex items-center justify-center">
                                        <Zap className="w-6 h-6 text-amber-400" />
                                    </div>
                                    <h4 className="font-bold text-amber-400 mb-1">橙黄色系 · 高端级</h4>
                                    <p className="text-xs text-slate-400">思元 MLU 系列</p>
                                    <p className="text-xs text-slate-500 mt-1">¥30,000 - ¥500,000</p>
                                </CardContent>
                            </Card>
                        </div>

                            {user?.buy_locked && (
                                <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700/50 flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-red-400" />
                                    <div>
                                        <p className="text-red-400 font-medium text-sm">购买权限已被锁定</p>
                                        <p className="text-red-400/70 text-xs">您的账号购买功能已被网点锁定，请联系所属网点解锁。变现和其他功能不受影响。</p>
                                    </div>
                                </div>
                            )}
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">

                            {/* 服务商直售产品：available 状态 */}
                            {products.filter(p => p.status === 'available').map(product => {
                                // 根据价格确定产品等级和颜色 (蓝色入门级、绿色进阶级、橙黄高端级)
                                const getProductTier = (price: number) => {
                                    if (price <= 5000) return { 
                                        name: '入门级', 
                                        level: 'entry',
                                        color: 'blue', 
                                        stars: 3, 
                                        bgGradient: 'from-blue-900/90 to-slate-900', 
                                        iconBg: 'from-blue-500/40 to-cyan-500/40', 
                                        iconBorder: 'border-blue-500/60', 
                                        iconColor: 'text-blue-400',
                                        btnGradient: 'from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400',
                                        badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                                        headerBg: 'from-blue-600/90 to-blue-700/70',
                                    };
                                    if (price <= 30000) return { 
                                        name: '进阶级', 
                                        level: 'advanced',
                                        color: 'green', 
                                        stars: 4, 
                                        bgGradient: 'from-green-900/90 to-slate-900', 
                                        iconBg: 'from-green-500/40 to-emerald-500/40', 
                                        iconBorder: 'border-green-500/60', 
                                        iconColor: 'text-green-400',
                                        btnGradient: 'from-green-600 to-green-500 hover:from-green-500 hover:to-green-400',
                                        badge: 'bg-green-500/20 text-green-400 border-green-500/30',
                                        headerBg: 'from-green-600/90 to-green-700/70',
                                    };
                                    return { 
                                        name: '高端级', 
                                        level: 'premium',
                                        color: 'amber', 
                                        stars: 5, 
                                        bgGradient: 'from-amber-900/90 to-slate-900', 
                                        iconBg: 'from-amber-500/40 to-orange-500/40', 
                                        iconBorder: 'border-amber-500/60', 
                                        iconColor: 'text-amber-400',
                                        btnGradient: 'from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400',
                                        badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                                        headerBg: 'from-amber-600/90 to-amber-700/70',
                                    };
                                };

                                const tier = getProductTier(product.price);
                                const total_rate = product.total_rate || (product.period === 3 ? 5 : 10);
                                const profit_rate = product.profit_rate || (product.period === 3 ? 2 : 5);

                                return (
                                <Card 
                                    key={product.id}
                                    className={`bg-gradient-to-br ${tier.bgGradient} border-slate-700 overflow-hidden hover:shadow-xl transition-all duration-300 group`}
                                >
                                    {/* 顶部GPU展示区域 - 移动端紧凑 */}
                                    <div className="relative h-24 md:h-36 overflow-hidden">
                                        {/* 渐变背景 */}
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
                                                <span className={`text-lg md:text-2xl font-black ${tier.iconColor}`}>TK</span>
                                                <span className={`text-[8px] md:text-[10px] font-bold mt-0.5 md:mt-1 ${tier.iconColor}`}>{product.period === 3 ? '3天' : '7天'}</span>
                                            </div>
                                        </div>

                                        {/* 等级标签 */}
                                        <div className="absolute top-2 left-2 md:top-3 md:left-3">
                                            <span className={`px-1.5 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${tier.badge} border backdrop-blur-sm`}>
                                                {tier.name}
                                            </span>
                                        </div>

                                        {/* 星级评级 - 桌面端显示 */}
                                        <div className="absolute top-3 right-3 gap-0.5 hidden md:flex">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`w-3.5 h-3.5 ${i < tier.stars ? 'text-yellow-400 fill-yellow-400' : 'text-white/30'}`} />
                                            ))}
                                        </div>

                                        {/* 产品编码 */}
                                        <div className="absolute bottom-2 right-2 md:bottom-3 md:right-3">
                                            <span className="px-1.5 py-0.5 bg-slate-900/80 rounded text-[9px] md:text-xs text-slate-300 font-mono backdrop-blur-sm">
                                                {product.code || `TK-${product.id.slice(0, 6).toUpperCase()}`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 产品信息区域 - 移动端紧凑 */}
                                    <CardContent className="p-2.5 md:p-5">
                                        {/* 周期+收益标签 */}
                                        <div className="flex items-center gap-1.5 mb-2 md:mb-3">
                                            <Badge variant="outline" className={`${tier.badge} border text-[10px] md:text-xs px-1.5 md:px-2.5`}>
                                                <Clock className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                                                {product.period}天
                                            </Badge>
                                            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] md:text-xs px-1.5 md:px-2.5">
                                                收益{profit_rate}%
                                            </Badge>
                                        </div>

                                        {/* 核心参数 */}
                                        <div className="flex gap-2 mb-2 md:hidden">
                                            <div className="flex-1 p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                                <p className="text-base font-bold text-emerald-400">{profit_rate}%</p>
                                                <p className="text-[9px] text-slate-500">收益</p>
                                            </div>
                                        </div>

                                        {/* 核心参数 - 桌面端 */}
                                        <div className="hidden md:block mb-4">
                                            <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                                <p className="text-xs text-slate-400 mb-1">收益</p>
                                                <p className="text-xl font-bold text-emerald-400">{profit_rate}%</p>
                                            </div>
                                        </div>

                                        {/* 投资金额 - 移动端紧凑 */}
                                        <div className={`flex items-center justify-between p-2 md:p-3 rounded-lg mb-2 md:mb-4 border ${tier.color === 'blue' ? 'bg-blue-500/10 border-blue-500/30' : tier.color === 'green' ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                                            <span className="text-[10px] md:text-sm text-slate-400">价格</span>
                                            <span className="text-sm md:text-xl font-bold text-white">¥{product.price.toLocaleString()}</span>
                                        </div>

                                        {/* 产品状态显示 */}
                                        {product.status === 'pending_sell' && (
                                            <div className="mb-2 md:mb-4 p-2 md:p-3 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 text-center text-xs md:text-sm">
                                                <RefreshCw className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />
                                                流转中 - 请在流转市场购买
                                            </div>
                                        )}
                                        {product.status === 'available' && isProductPending(product.id) && (
                                            <div className="mb-2 md:mb-4 p-2 md:p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-center text-xs md:text-sm">
                                                <Clock className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />
                                                审核中
                                            </div>
                                        )}

                                        {/* 购买按钮 */}
                                        {product.status === 'pending_sell' ? (
                                            <Button
                                                size="sm"
                                                className="w-full font-medium shadow-lg transition-all text-xs md:text-sm h-8 md:h-10 bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600"
                                                onClick={() => {
                                                    // 切换到购买产品tab
                                                    setActiveTab("buy");
                                                }}>
                                                <ShoppingCart className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />去购买产品
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                className={`w-full font-medium shadow-lg transition-all text-xs md:text-sm h-8 md:h-10 ${
                                                    purchaseLimits?.limits?.canBuy === false || isProductPending(product.id)
                                                        ? 'bg-slate-600 hover:bg-slate-600 cursor-not-allowed opacity-50'
                                                        : `bg-gradient-to-r ${tier.btnGradient} text-white shadow-${tier.color === 'blue' ? 'blue' : tier.color === 'green' ? 'green' : 'amber'}-500/25`
                                                }`}
                                                disabled={purchaseLimits?.limits?.canBuy === false || isProductPending(product.id)}
                                                onClick={() => {
                                                    if (purchaseLimits?.limits?.canBuy === false) {
                                                        showMessage("error", purchaseLimits?.limits?.limitMessage || "当前无法购买");
                                                        return;
                                                    }
                                                    if (isProductPending(product.id)) {
                                                        showMessage("success", "该产品正在等待审核，请稍后再试");
                                                        return;
                                                    }
                                                    setSelectedProduct(product);
                                                    setShowPurchaseDialog(true);
                                                }}>
                                                {purchaseLimits?.limits?.canBuy === false ? (
                                                    <>
                                                        <Lock className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />无法购买
                                                    </>
                                                ) : isProductPending(product.id) ? (
                                                    <>
                                                        <Clock className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />审核中
                                                    </>
                                                ) : (
                                                    <>
                                                        <ShoppingCart className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />购买
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                                );
                            })}
                            {products.length === 0 && <div className="col-span-3 text-center py-12">
                                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-500">暂无可购买的Token存储包</p>
                                <p className="text-sm text-gray-400">请等待服务商上架Token存储包</p>
                            </div>}
                        </div>
                    </div>}
                            {/* 待审核订单提示 */}
                    {pendingOrders.length > 0 && (
                        <Card className="mb-4 border-yellow-400/50 bg-yellow-50/5">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 text-yellow-400 mb-3">
                                    <Clock className="w-5 h-5" />
                                    <span className="font-bold">您有 {pendingOrders.length} 个待审核的购买申请</span>
                                </div>
                                <div className="space-y-2">
                                    {pendingOrders.map((po) => (
                                        <div key={po.orderId} className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                                            <div>
                                                <p className="text-white font-medium">{po.productName}</p>
                                                <p className="text-sm text-gray-400">¥{po.productPrice?.toLocaleString()} · {po.productPeriod}天</p>
                                            </div>
                                            <Badge variant="outline" className="text-yellow-400 border-yellow-400/50">
                                                {po.orderStatus === 'processing' ? '审核中' : '待审核'}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {activeTab === "holdings" && <Card>
                        <CardHeader>
                            <CardTitle>我的持仓</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                {(() => {
                                    // 分为待确认和持有中两组
                                    const pendingProducts = userProducts.filter(up => up.status === 'pending_confirm');
                                    const activeProducts = userProducts.filter(up => up.status === 'holding' || up.status === 'pending_sell' || up.status === 'transferring' || up.status === 'repurchase_pending' || up.status === 'recycled' || up.status === 'repurchased');
                                    
                                    // 按产品周期分组
                                    const groupByPeriod = (products: typeof userProducts) => {
                                        return products.reduce((acc, up) => {
                                            const period = up.products?.period || 0;
                                            if (!acc[period]) acc[period] = [];
                                            acc[period].push(up);
                                            return acc;
                                        }, {} as Record<number, typeof userProducts>);
                                    };
                                    
                                    const renderProductTable = (products: typeof userProducts, showPendingConfirm: boolean) => {
                                        const groupedProducts = groupByPeriod(products);
                                        const sortedPeriods = Object.keys(groupedProducts).map(Number).sort((a, b) => a - b);
                                        
                                        return sortedPeriods.map(period => (
                                            <div key={period} className="mb-6">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <h3 className="font-bold text-lg">
                                                        Token存储包
                                                    </h3>
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                                                        {groupedProducts[period].length} 个
                                                    </Badge>
                                                </div>
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="border-b bg-gray-50">
                                                            <th className="text-left py-3 px-4">购买时间</th>
                                                            <th className="text-left py-3 px-4">Token</th>
                                                            <th className="text-left py-3 px-4">购买价格</th>
                                                            <th className="text-left py-3 px-4">收益</th>
                                                            <th className="text-left py-3 px-4">可卖出</th>
                                                            <th className="text-left py-3 px-4">状态</th>
                                                            <th className="text-left py-3 px-4">操作</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {groupedProducts[period].map(up => {
                                                            const purchaseDate = new Date(up.purchase_date);
                                                            const expireDate = new Date(up.expire_date);
                                                            const now = new Date();
                                                            const revenueReleased = up.revenue_released === true;
                                                            // 网点解锁后即可卖出，不再依赖到期时间
                                                            const canSell = revenueReleased || now >= expireDate;
                                                            const isExpired = now >= expireDate;
                                                            
                                                            const formatPurchaseTime = (date: Date) => {
                                                                const year = date.getFullYear();
                                                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                                                const day = String(date.getDate()).padStart(2, '0');
                                                                const hours = String(date.getHours()).padStart(2, '0');
                                                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                                                return `${year}-${month}-${day} ${hours}:${minutes}`;
                                                            };

                                                            const formatExpireDate = (date: Date) => {
                                                                const year = date.getFullYear();
                                                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                                                const day = String(date.getDate()).padStart(2, '0');
                                                                return `${month}月${day}日12:00`;
                                                            };
                                                            
                                                            return <tr key={up.id} className="border-b hover:bg-gray-50">
                                                            <td className="py-3 px-4 text-gray-600 text-sm">
                                                                {formatPurchaseTime(purchaseDate)}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <div>
                                                                    <p className="font-medium">{up.products?.name || "-"}</p>
                                                                    <p className="text-sm text-gray-500">{up.products?.code}</p>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 text-green-600 font-medium">¥{up.purchase_price.toLocaleString()}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <div className="text-blue-600">+¥{up.expected_profit.toLocaleString()}</div>
                                                                {!isExpired && !revenueReleased && (
                                                                    <div className="text-xs text-gray-400 mt-1">运算中</div>
                                                                )}
                                                                {isExpired && !revenueReleased && (
                                                                    <div className="text-xs text-orange-500 mt-1">待释放</div>
                                                                )}
                                                                {revenueReleased && (
                                                                    <div className="text-xs text-green-500 mt-1">已到账</div>
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                {up.status === "pending_confirm" ? (
                                                                    <Badge className="bg-yellow-100 text-yellow-700">
                                                                        <Clock className="w-3 h-3 mr-1" />
                                                                        待确认
                                                                    </Badge>
                                                                ) : up.status === "transferring" ? (
                                                                    <Badge className="bg-orange-100 text-orange-700">流转中</Badge>
                                                                ) : up.status === "repurchase_pending" ? (
                                                                    <Badge className="bg-purple-100 text-purple-700">待确认回购</Badge>
                                                                ) : up.status === "pending_match" ? (
                                                                    <Badge className="bg-cyan-100 text-cyan-700">待匹配</Badge>
                                                                ) : up.status === "holding" && (
                                                                    revenueReleased ? (
                                                                        <Badge className="bg-green-100 text-green-700">可卖出</Badge>
                                                                    ) : canSell ? (
                                                                        <Badge className="bg-yellow-100 text-yellow-700">待释放</Badge>
                                                                    ) : (
                                                                        <Badge className="bg-red-100 text-red-700">
                                                                            <Lock className="w-3 h-3 mr-1" />
                                                                            {formatExpireDate(expireDate)}解锁
                                                                        </Badge>
                                                                    )
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <Badge
                                                                    className={
                                                                        up.status === "pending_confirm" ? "bg-amber-100 text-amber-700" :
                                                                        up.status === "holding" && revenueReleased ? "bg-green-100 text-green-700" : 
                                                                        up.status === "holding" && !isExpired ? "bg-blue-100 text-blue-700" : 
                                                                        up.status === "holding" && isExpired && !revenueReleased ? "bg-orange-100 text-orange-700" : 
                                                                        up.status === "pending_sell" ? "bg-yellow-100 text-yellow-700" : 
                                                                        up.status === "transferring" ? "bg-orange-100 text-orange-700" :
                                                                        up.status === "repurchase_pending" ? "bg-purple-100 text-purple-700" :
                                                                        up.status === "repurchased" ? "bg-green-100 text-green-700" :
                                                                        up.status === "recycled" ? "bg-gray-200 text-gray-500" :
                                                                        up.status === "pending_match" ? "bg-cyan-100 text-cyan-700" :
                                                                        up.status === "sold" ? "bg-gray-200 text-gray-500" :
                                                                        up.status === "expired" ? "bg-orange-100 text-orange-700" :
                                                                        "bg-gray-100 text-gray-700"
                                                                    }>
                                                                    {up.status === "pending_confirm" ? "已申购待确认" : 
                                                                     up.status === "holding" && revenueReleased ? "收益已到账" : 
                                                                     up.status === "holding" && !isExpired ? "运算中" : 
                                                                     up.status === "holding" && isExpired && !revenueReleased ? "待释放" : 
                                                                     up.status === "pending_sell" ? "待审核" : 
                                                                     up.status === "transferring" ? "流转中" :
                                                                     up.status === "repurchase_pending" ? "待确认回购" :
                                                                     up.status === "repurchased" ? "已完成" :
                                                                     up.status === "recycled" ? "已回收" :
                                                                     up.status === "pending_match" ? "待匹配" :
                                                                     up.status === "sold" ? "已售出" :
                                                                     up.status === "expired" ? "已到期" :
                                                                     up.status}
                                                                </Badge>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                {up.status === "pending_confirm" && (
                                                                    <span className="text-sm text-amber-600">等待服务商确认</span>
                                                                )}
                                                                {up.status === "holding" && !revenueReleased && !isExpired && <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    disabled
                                                                    className="opacity-50"
                                                                >运算中
                                                                </Button>}
                                                                {up.status === "holding" && !revenueReleased && isExpired && (
                                                                    <Button
                                                                        size="sm"
                                                                        className="bg-orange-500 hover:bg-orange-600 text-white"
                                                                        disabled
                                                                    >
                                                                        释放中...
                                                                    </Button>
                                                                )}
                                                                {up.status === "holding" && revenueReleased && (
                                                                    <>
                                                                        <span className="text-xs text-green-600 mr-2">收益已到账</span>
                                                                        <Button
                                                                            size="sm"
                                                                            className="bg-green-500 hover:bg-green-600 text-white"
                                                                            onClick={() => {
                                                                                setSelectedUserProduct(up);
                                                                                setShowSellDialog(true);
                                                                            }}>卖出
                                                                        </Button>
                                                                    </>
                                                                )}
                                                                {up.status === "pending_sell" && <span className="text-sm text-orange-500">售卖中</span>}
                                                                {up.status === "repurchased" && <span className="text-sm text-green-600">已完成</span>}
                                                                {up.status === "transferred" && <span className="text-sm text-green-600">已转出</span>}
                                                                {up.status === "recycled" && <span className="text-sm text-gray-500">产品已回收</span>}
                                                            </td>
                                                        </tr>})}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ));
                                    };
                                    
                                    return (
                                        <>
                                            {/* 待确认区块 */}
                                            {pendingProducts.length > 0 && (
                                                <div className="mb-6">
                                                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-amber-200">
                                                        <AlertCircle className="w-5 h-5 text-amber-600" />
                                                        <h3 className="font-bold text-amber-700">已申购待确认 ({pendingProducts.length})</h3>
                                                        <span className="text-sm text-amber-500">等待服务商确认收款后正式持有</span>
                                                    </div>
                                                    {renderProductTable(pendingProducts, true)}
                                                </div>
                                            )}
                                            {/* 持有中区块 */}
                                            {activeProducts.length > 0 && renderProductTable(activeProducts, false)}
                                        </>
                                    );
                                })()}
                                {userProducts.filter(up => !['cancelled', 'sold', 'transferred', 'repurchased'].includes(up.status)).length === 0 && <div className="py-8 text-center text-gray-500">暂无持仓，请先购买Token存储包</div>}
                            </div>
                        </CardContent>
                    </Card>}

                    {/* 产品流转 Tab */}

                    {/* 消息通知 Tab */}
                    {activeTab === "notifications" && <Card>
                        <CardHeader>
                            <CardTitle>消息通知</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {notifications.map(n => <div
                                    key={n.id}
                                    className={`p-4 border rounded-lg ${n.is_read ? "bg-gray-50" : "bg-blue-50 border-blue-200"}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-medium">{n.title}</h4>
                                            <p className="text-sm text-gray-600 mt-1">{n.content}</p>
                                            {n.amount && <p className="text-sm text-green-600 mt-1">金额: ¥{n.amount.toLocaleString()}</p>}
                                        </div>
                                        <span className="text-xs text-gray-500">{n.created_at?.slice(0, 10)}</span>
                                    </div>
                                </div>)}
                                {notifications.length === 0 && <div className="text-center py-8 text-gray-500">暂无消息通知
                                                        </div>}
                            </div>
                        </CardContent>
                    </Card>}

                    {/* 我的收益 Tab */}
                    {activeTab === "profit" && (
                        <div className="space-y-3 md:space-y-6">
                            {/* 智算金统计卡片 */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                                    <CardContent className="pt-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Wallet className="w-5 h-5" />
                                            <span className="text-sm opacity-80">智算金</span>
                                        </div>
                                        <p className="text-2xl font-bold">¥{user?.energy_value?.toLocaleString() || '0'}</p>
                                        <p className="text-xs opacity-70 mt-1">可提现/互转/转积分</p>
                                        <div className="flex gap-1 mt-2">
                                            <Button
                                                size="sm"
                                                className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0 text-xs"
                                                onClick={() => setShowBalanceTransferDialog(true)}
                                            >
                                                互转
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0 text-xs"
                                                onClick={() => setShowBalanceConvertDialog(true)}
                                            >
                                                转积分
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0 text-xs"
                                                onClick={() => {
                                                    setWithdrawAmount("");
                                                    setWithdrawAlipay("");
                                                    setWithdrawRealName("");
                                                    setShowWithdrawDialog(true);
                                                }}
                                            >
                                                提现
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                                    <CardContent className="pt-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="w-5 h-5" />
                                            <span className="text-sm opacity-80">持仓Token值</span>
                                        </div>
                                        <p className="text-2xl font-bold">¥{profitStats.holdingPrincipal?.toLocaleString() || 0}</p>
                                        <p className="text-xs opacity-70 mt-1">已收回Token值: ¥{profitStats.totalPrincipal?.toLocaleString() || 0}</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                                    <CardContent className="pt-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="w-5 h-5" />
                                            <span className="text-sm opacity-80">预期收益</span>
                                        </div>
                                        <p className="text-2xl font-bold">¥{profitStats.holdingExpectedProfit?.toLocaleString() || 0}</p>
                                        <p className="text-xs opacity-70 mt-1">可用智算金: ¥{user?.energy_value?.toLocaleString() || 0}</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                                    <CardContent className="pt-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Zap className="w-5 h-5" />
                                            <span className="text-sm opacity-80">积分余额</span>
                                        </div>
                                        <p className="text-2xl font-bold">{user?.points?.toLocaleString() || '0'}</p>
                                        <button
                                            onClick={() => setActiveTab('points')}
                                            className="mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-medium hover:bg-white/30 transition-colors"
                                        >
                                            积分兑换
                                        </button>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* 卖出入账说明 */}
                            <Card className="bg-slate-800/50 border-slate-700">
                                <CardContent className="pt-4">
                                    <p className="text-sm text-gray-400 text-center">
                                        产品到期卖出后，收益将进入您的智算金账户，可提现、互转或兑换积分
                                    </p>
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
                                    {profitRecords.length > 0 ? (
                                        <div className="space-y-3">
                                            {profitRecords.map((record: any) => (
                                                <div key={record.id} className="border rounded-lg p-4 bg-slate-50">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-800">
                                                                {record.productName || record.product_name || '产品'}
                                                            </p>
                                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                                                                <span>周期: {record.productPeriod || record.product_period || '-'}天</span>
                                                                <span>Token值: ¥{Number(record.principal || 0).toLocaleString()}</span>
                                                                <span>收益: <span className="text-green-600 font-medium">¥{Number(record.profit || 0).toLocaleString()}</span></span>
                                                            </div>
                                                            {/* 接收方信息 */}
                                                            {(record.seller_name || record.buyer_name) && (
                                                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm">
                                                                    {record.seller_name && (
                                                                        <span className="text-orange-600">
                                                                            转出方: {record.seller_name}{record.seller_unique_id ? ` [${record.seller_unique_id}]` : ''}
                                                                        </span>
                                                                    )}
                                                                    {record.buyer_name && (
                                                                        <span className="text-blue-600">
                                                                            接收方: {record.buyer_name}{record.buyer_unique_id ? ` [${record.buyer_unique_id}]` : ''}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-400">
                                                                <span>{new Date(record.createdAt || record.created_at).toLocaleString('zh-CN')}</span>
                                                            </div>
                                                        </div>
                                                        <Badge variant={record.status === 'converted' ? 'outline' : record.status === 'available' ? 'secondary' : 'default'}>
                                                            {record.status === 'pending' ? '待处理' : record.status === 'converted' ? '已转入' : record.status === 'withdrawn' ? '已提现' : record.status === 'available' ? '已到账' : record.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                            <p>暂无收益记录</p>
                                            <p className="text-sm mt-1">产品到期后收益自动到账，记录将在此显示</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            {/* 提现功能 */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <Banknote className="w-5 h-5 text-rose-500" />
                                            收益提现
                                        </CardTitle>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-muted-foreground">
                                                可提现: ¥{Number(user?.energy_value || 0).toLocaleString()}
                                            </span>
                                            <Button
                                                size="sm"
                                                className="bg-rose-500 hover:bg-rose-600 text-white"
                                                onClick={() => {
                                                    setWithdrawAmount("");
                                                    setWithdrawAlipay("");
                                                    setWithdrawRealName("");
                                                    setShowWithdrawDialog(true);
                                                }}
                                            >
                                                <Banknote className="w-4 h-4 mr-1" />
                                                申请提现
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {/* 提现记录 */}
                                    {withdrawRecords.length > 0 ? (
                                        <div className="space-y-3">
                                            {withdrawRecords.map((record: any) => (
                                                <div key={record.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <Banknote className="w-4 h-4 text-rose-500" />
                                                            <span className="font-medium">¥{Number(record.amount).toLocaleString()}</span>
                                                            <Badge variant={
                                                                record.status === 'completed' ? 'default' :
                                                                record.status === 'rejected' ? 'destructive' :
                                                                'outline'
                                                            }>
                                                                {record.status === 'pending' ? '待审核付款' :
                                                                 record.status === 'completed' ? '已完成' :
                                                                 record.status === 'rejected' ? '已拒绝' : record.status}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            实际到账: ¥{Number(record.actual_amount).toLocaleString()} | 手续费: ¥{Number(record.fee).toLocaleString()}
                                                        </p>
                                                        {record.alipay_account && (
                                                            <p className="text-xs text-muted-foreground">
                                                                支付宝: {record.alipay_account} | {record.real_name}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(record.created_at).toLocaleString('zh-CN')}
                                                        </p>
                                                        {record.reject_reason && (
                                                            <p className="text-xs text-red-500 mt-1">拒绝原因: {record.reject_reason}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <Banknote className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                            <p>暂无提现记录</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* 提现对话框 */}
                    {showWithdrawDialog && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <Card className="w-full max-w-md mx-4">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Banknote className="w-5 h-5 text-rose-500" />
                                        智算金提现
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="bg-rose-50 p-3 rounded-lg">
                                        <p className="text-sm text-rose-700">
                                            <strong>说明：</strong>提现手续费5%，最低提现金额100元，提交后等待网点审核打款。
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-muted-foreground mb-1 block">可提现智算金</label>
                                        <p className="text-xl font-bold text-green-600">¥{Number(user?.energy_value || 0).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-muted-foreground mb-1 block">提现金额</label>
                                        <Input
                                            type="number"
                                            placeholder="请输入提现金额（最低100元）"
                                            value={withdrawAmount}
                                            onChange={e => setWithdrawAmount(e.target.value)}
                                            min="100"
                                            max={user?.energy_value || 0}
                                        />
                                        {Number(withdrawAmount) > 0 && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                手续费(5%): ¥{(Number(withdrawAmount) * 0.05).toFixed(2)}
                                                ，实际到账: ¥{(Number(withdrawAmount) * 0.95).toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-sm text-muted-foreground mb-1 block">支付宝账号</label>
                                        <Input
                                            placeholder="请输入支付宝账号"
                                            value={withdrawAlipay}
                                            onChange={e => setWithdrawAlipay(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-muted-foreground mb-1 block">真实姓名</label>
                                        <Input
                                            placeholder="请输入真实姓名（需与支付宝一致）"
                                            value={withdrawRealName}
                                            onChange={e => setWithdrawRealName(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <Button variant="outline" className="flex-1" onClick={() => setShowWithdrawDialog(false)}>
                                            取消
                                        </Button>
                                        <Button
                                            className="flex-1 bg-rose-500 hover:bg-rose-600"
                                            disabled={!withdrawAmount || Number(withdrawAmount) < 100 || !withdrawAlipay || !withdrawRealName}
                                            onClick={handleWithdraw}
                                        >
                                            确认提现
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                    {activeTab === "points" && <div className="space-y-3 md:space-y-6">
                        {/* 积分余额卡片 */}
                        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                            <CardContent className="pt-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Gift className="w-5 h-5" />
                                            <span className="text-sm opacity-80">我的积分</span>
                                        </div>
                                        <p className="text-3xl font-bold">{Number(user?.points || 0).toLocaleString()}</p>
                                        <span className="text-xs opacity-70 mt-1">收益转入收益时，5%自动转为积分，积分可兑换产品</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 积分商城 */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Gift className="w-5 h-5 text-amber-500" />
                                    积分商城
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {shopProducts.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {shopProducts.map((product: any) => {
                                            const stock = product.stock || 0;
                                            const exchanged = product.exchanged_count || 0;
                                            const remaining = stock - exchanged;
                                            const canAfford = (user?.points || 0) >= (product.points_price || product.points_cost || 0);
                                            const isSoldOut = remaining <= 0;
                                            return (
                                                <div key={product.id} className="border rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow">
                                                    {product.image_url && (
                                                        <div className="aspect-[2/1] overflow-hidden bg-gray-100">
                                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                    <div className="p-4">
                                                        <h4 className="font-semibold text-sm mb-1">{product.name}</h4>
                                                        {product.description && (
                                                            <p className="text-xs text-gray-500 mb-2 line-clamp-2">{product.description}</p>
                                                        )}
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <span className="text-amber-600 font-bold">{product.points_price || product.points_cost} 积分</span>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <Badge className={isSoldOut ? 'bg-red-100 text-red-700' : remaining <= 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}>
                                                                        {isSoldOut ? '已售罄' : `库存 ${remaining}`}
                                                                    </Badge>
                                                                    {stock > 0 && (
                                                                        <span className="text-xs text-gray-400">已兑 {exchanged}/{stock}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                disabled={!canAfford || isSoldOut || exchangeSubmitting}
                                                                onClick={() => setExchangeProduct(product)}
                                                                className={
                                                                    isSoldOut ? 'bg-gray-300 text-gray-500' :
                                                                    !canAfford ? 'bg-gray-300 text-gray-500' :
                                                                    'bg-amber-500 hover:bg-amber-600 text-white'
                                                                }
                                                            >
                                                                {exchangeSubmitting && exchangeProduct?.id === product.id ? '兑换中...' : isSoldOut ? '已售罄' : !canAfford ? '积分不足' : '立即兑换'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>暂无可兑换商品</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 积分记录 */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <History className="w-4 h-4" />
                                    积分记录
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {pointsRecords.length > 0 ? (
                                    <div className="space-y-3">
                                        {pointsRecords.map((record: any) => (
                                            <div key={record.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <Gift className="w-4 h-4 text-amber-500" />
                                                    <div>
                                                        <span className="font-medium text-amber-600">
                                                            +{Number(record.amount).toLocaleString()}
                                                        </span>
                                                        <p className="text-xs text-muted-foreground">{record.note || '收益转入收益产生'}</p>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(record.createdAt || record.created_at).toLocaleString('zh-CN')}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>暂无积分记录</p>
                                        <p className="text-sm mt-1">收益转入收益时自动产生积分</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>}

                    {/* 充值申请 Tab */}
                    {activeTab === "recharge" && <div className="space-y-3 md:space-y-6">
                        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="w-5 h-5" />
                                    <span className="text-sm opacity-80">充值申请记录</span>
                                </div>
                                <p className="text-xs opacity-70 mt-1">线下向服务商付款后，等待服务商确认充值</p>
                            </CardContent>
                        </Card>

                        {/* 充值申请列表 */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <History className="w-5 h-5" />
                                    申请记录
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {rechargeRequests.length > 0 ? (
                                        rechargeRequests.map((request) => (
                                            <div 
                                                key={request.id}
                                                className={`p-4 border rounded-lg ${
                                                    request.status === 'pending' ? 'bg-yellow-50 border-yellow-200' :
                                                    request.status === 'approved' ? 'bg-green-50 border-green-200' :
                                                    'bg-red-50 border-red-200'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                                                            request.status === 'approved' ? 'bg-green-100 text-green-600' :
                                                            'bg-red-100 text-red-600'
                                                        }`}>
                                                            {request.status === 'pending' ? (
                                                                <Clock className="w-6 h-6" />
                                                            ) : request.status === 'approved' ? (
                                                                <CheckCircle className="w-6 h-6" />
                                                            ) : (
                                                                <AlertCircle className="w-6 h-6" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900">
                                                                充值申请
                                                            </p>
                                                            <p className="text-sm text-gray-500">
                                                                {request.provider?.username || '服务商'} · {request.provider?.phone || ''}
                                                            </p>
                                                            <p className="text-xs text-gray-400 mt-1">
                                                                {request.createdAt || request.created_at ? new Date(request.createdAt || request.created_at).toLocaleString('zh-CN') : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-2xl font-bold text-orange-600">
                                                            +{request.amount?.toLocaleString() || 0}
                                                        </p>
                                                        <Badge className={
                                                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                            request.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                            'bg-red-100 text-red-700'
                                                        }>
                                                            {request.status === 'pending' ? '待确认' :
                                                             request.status === 'approved' ? '已通过' : '已拒绝'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                {request.status === 'pending' && (
                                                    <div className="mt-3 pt-3 border-t border-yellow-200">
                                                        <div className="flex items-center gap-2 text-sm text-yellow-700">
                                                            <AlertCircle className="w-4 h-4" />
                                                            <span>请线下向服务商付款，付款后联系服务商确认充值</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {request.note && (
                                                    <div className="mt-2 text-sm text-gray-500">
                                                        备注：{request.note}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12">
                                            <Zap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                            <p className="text-gray-500">暂无充值申请记录</p>
                                            <p className="text-sm text-gray-400 mt-1">点击上方"充值"按钮发起充值申请</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* 充值流程说明 */}
                        <Card className="bg-blue-50 border-blue-200">
                            <CardContent className="py-4">
                                <h4 className="font-medium text-blue-900 mb-2">充值流程</h4>
                                <ol className="text-sm text-blue-700 space-y-1">
                                    <li>1. 点击上方"充值"按钮，填写充值金额</li>
                                    <li>2. 系统生成充值申请，等待服务商审核</li>
                                    <li>3. <strong>线下</strong>向服务商付款（支付宝/微信/银行转账）</li>
                                    <li>4. 服务商确认收款后，收益自动到账</li>
                                </ol>
                            </CardContent>
                        </Card>
                    </div>}
                </div>

            </main>

            {/* 智算金互转对话框 */}
            <Dialog open={showBalanceTransferDialog} onOpenChange={(open) => {
                setShowBalanceTransferDialog(open);
                if (!open) {
                    setTransferTargets([]);
                    setTransferToUserId("");
                    setTransferToAmount("");
                    setTransferToNote("");
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                            智算金互转
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-700">
                                <strong>说明：</strong>互转时5%自动转化为积分（归您），95%到账对方智算金。最低转账金额为100。
                            </p>
                        </div>
                        <div className="bg-slate-100 rounded-lg p-3">
                            <p className="text-xs text-gray-500">您的智算金余额</p>
                            <p className="text-xl font-bold text-green-600">¥{user?.energy_value?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">搜索转账对象</label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="输入用户名/手机号/专属ID"
                                    value={transferSearchKeyword}
                                    onChange={(e) => setTransferSearchKeyword(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') {
                                        const userId = localStorage.getItem("userId");
                                        if (userId && transferSearchKeyword.trim()) {
                                            authFetch(`/api/balance/transfer?userId=${userId}&keyword=${encodeURIComponent(transferSearchKeyword.trim())}`)
                                                .then(r => r.json())
                                                .then(data => {
                                                    if (data.success) setTransferTargets(data.data || []);
                                                    else { setTransferTargets([]); showMessage("error", data.error || "搜索失败"); }
                                                })
                                                .catch(() => { setTransferTargets([]); showMessage("error", "搜索失败"); });
                                        }
                                    }}}
                                />
                                <Button variant="outline" onClick={() => {
                                    const userId = localStorage.getItem("userId");
                                    if (userId && transferSearchKeyword.trim()) {
                                        authFetch(`/api/balance/transfer?userId=${userId}&keyword=${encodeURIComponent(transferSearchKeyword.trim())}`)
                                            .then(r => r.json())
                                            .then(data => {
                                                if (data.success) {
                                                    const targets = data.data || [];
                                                    setTransferTargets(targets);
                                                    // 只有一个结果时自动选中
                                                    if (targets.length === 1) {
                                                        setTransferToUserId(targets[0].id);
                                                    } else {
                                                        setTransferToUserId('');
                                                    }
                                                }
                                                else { setTransferTargets([]); showMessage("error", data.error || "搜索失败"); }
                                            })
                                            .catch(() => { setTransferTargets([]); showMessage("error", "搜索失败"); });
                                    } else {
                                        showMessage("error", "请输入搜索关键词");
                                    }
                                }}>搜索</Button>
                            </div>
                        </div>
                        {transferTargets.length === 1 && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 cursor-pointer hover:bg-green-100 transition-colors" onClick={() => setTransferToUserId(transferTargets[0].id)}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-green-800">{transferTargets[0].username} {transferTargets[0].uniqueId ? `[${transferTargets[0].uniqueId}]` : ''}</p>
                                        <p className="text-xs text-green-600">{transferTargets[0].phone || ''} · {transferTargets[0].roleLabel || transferTargets[0].role}</p>
                                    </div>
                                    {transferToUserId === transferTargets[0].id ? (
                                        <Badge className="bg-green-600 text-white">已选择</Badge>
                                    ) : (
                                        <span className="text-xs text-green-500">点击选择</span>
                                    )}
                                </div>
                            </div>
                        )}
                        {transferTargets.length > 1 && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium mb-1 block">搜索到多个用户，请选择</label>
                                {transferTargets.map((t: any) => (
                                    <div key={t.id} className={`rounded-lg p-3 cursor-pointer transition-colors border ${transferToUserId === t.id ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`} onClick={() => setTransferToUserId(t.id)}>
                                        <p className="font-medium text-sm">{t.username} {t.uniqueId ? `[${t.uniqueId}]` : ''}</p>
                                        <p className="text-xs text-gray-500">{t.phone || ''} · {t.roleLabel || t.role}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {transferToUserId && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <p className="text-sm text-green-700">
                                    已选择：{transferTargets.find((t: any) => t.id === transferToUserId)?.username}
                                    {transferTargets.find((t: any) => t.id === transferToUserId)?.uniqueId ? ` [${transferTargets.find((t: any) => t.id === transferToUserId)?.uniqueId}]` : ''}
                                </p>
                            </div>
                        )}
                        <div>
                            <label className="text-sm font-medium mb-2 block">转账金额</label>
                            <Input
                                type="number"
                                placeholder="请输入转账金额（最低100）"
                                value={transferToAmount}
                                onChange={(e) => setTransferToAmount(e.target.value)}
                                min="50"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {transferToAmount && parseFloat(transferToAmount) > 0 
                                    ? `到账: ${(parseFloat(transferToAmount) * 0.95).toFixed(2)} | 积分: ${(parseFloat(transferToAmount) * 0.05).toFixed(2)}`
                                    : '互转时5%转化为积分，95%到账对方'}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">备注（可选）</label>
                            <Input
                                placeholder="如: 业务转账"
                                value={transferToNote}
                                onChange={(e) => setTransferToNote(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBalanceTransferDialog(false)}>取消</Button>
                        <Button
                            className="bg-blue-600"
                            disabled={submitting || !transferToUserId || !transferToAmount || parseFloat(transferToAmount) < 100}
                            onClick={async () => {
                                const userId = localStorage.getItem("userId");
                                if (!userId || !transferToUserId || !transferToAmount) return;
                                setSubmitting(true);
                                try {
                                    const res = await authFetch("/api/balance/transfer", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            fromUserId: userId,
                                            toUserId: transferToUserId,
                                            amount: parseFloat(transferToAmount),
                                            note: transferToNote,
                                        }),
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                        showMessage("success", data.message);
                                        setShowBalanceTransferDialog(false);
                                        setTransferToUserId("");
                                        setTransferToAmount("");
                                        setTransferToNote("");
                                        await refreshAll();
                                        setTimeout(() => refreshAll(), 1000);
                                        setTimeout(() => refreshAll(), 3000);
                                    } else {
                                        showMessage("error", data.error || "转账失败");
                                    }
                                } catch (err) {
                                    showMessage("error", "网络错误");
                                } finally {
                                    setSubmitting(false);
                                }
                            }}
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowLeftRight className="w-4 h-4 mr-2" />}
                            确认转账
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 智算金转积分对话框 */}
            <Dialog open={showBalanceConvertDialog} onOpenChange={setShowBalanceConvertDialog}>
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
                                <p className="text-xl font-bold text-green-600">¥{user?.energy_value?.toLocaleString() || 0}</p>
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
                                placeholder="请输入转换金额（最低10）"
                                value={convertAmount}
                                onChange={(e) => setConvertAmount(e.target.value)}
                                min="10"
                            />
                            <p className="text-xs text-gray-500 mt-1">转换比例: 1智算金 = 1积分 | 不可逆转</p>
                        </div>
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700"
                            disabled={submitting || !convertAmount || parseFloat(convertAmount) < 10}
                            onClick={async () => {
                                const userId = localStorage.getItem("userId");
                                if (!userId || !convertAmount) return;
                                setSubmitting(true);
                                try {
                                    const res = await authFetch("/api/balance/convert-to-points", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ userId, amount: convertAmount }),
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                        showMessage("success", data.message);
                                        setShowBalanceConvertDialog(false);
                                        setConvertAmount("");
                                        await refreshAll();
                                        setTimeout(() => { refreshAll(); loadCapitalFlow(); }, 1500);
                                        setTimeout(() => { refreshAll(); loadCapitalFlow(); }, 3000);
                                    } else {
                                        showMessage("error", data.error || "转换失败");
                                    }
                                } catch (err) {
                                    showMessage("error", "网络错误");
                                } finally {
                                    setSubmitting(false);
                                }
                            }}
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                            确认转换
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* 兑换收货信息弹窗 */}
            {exchangeProduct && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 space-y-4">
                        <h3 className="text-lg font-bold">确认兑换</h3>
                        <div className="bg-purple-50 rounded-lg p-3">
                            <p className="font-semibold text-purple-800">{exchangeProduct.name}</p>
                            <p className="text-sm text-purple-600 mt-1">消耗积分: {exchangeProduct.points_price}</p>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">收货人姓名 *</label>
                                <input
                                    type="text"
                                    value={exchangeForm.receiverName}
                                    onChange={(e) => setExchangeForm({ ...exchangeForm, receiverName: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
                                    placeholder="请输入收货人姓名"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">联系电话 *</label>
                                <input
                                    type="tel"
                                    value={exchangeForm.receiverPhone}
                                    onChange={(e) => setExchangeForm({ ...exchangeForm, receiverPhone: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
                                    placeholder="请输入联系电话"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">收货地址 *</label>
                                <textarea
                                    value={exchangeForm.receiverAddress}
                                    onChange={(e) => setExchangeForm({ ...exchangeForm, receiverAddress: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
                                    placeholder="请输入详细收货地址"
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => { setExchangeProduct(null); setExchangeForm({ receiverName: '', receiverPhone: '', receiverAddress: '' }); }}
                                className="flex-1 py-2.5 border rounded-lg text-gray-600 hover:bg-gray-50 font-medium"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleExchange}
                                disabled={exchangeSubmitting || !exchangeForm.receiverName || !exchangeForm.receiverPhone || !exchangeForm.receiverAddress}
                                className="flex-1 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium disabled:opacity-50"
                            >
                                {exchangeSubmitting ? '兑换中...' : `确认兑换 (${exchangeProduct.points_price}积分)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}