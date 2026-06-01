import { NextRequest, NextResponse } from 'next/server';

// 不需要认证的路径白名单
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/send-verify-code',
  '/api/auth/forgot-password/send-code',
  '/api/auth/forgot-password/reset',
  '/api/invite-codes/available',
  '/api/reset-password-direct',
  '/api/energy/account',
  '/api/energy/branch-stats',
  '/api/energy/transactions',
  '/api/energy/transfer-targets',
  '/api/energy/transfer',
  '/api/energy/withdraw-request',
  '/api/energy/withdraw-requests',
  '/api/energy/branch-request',
  '/api/branch/provider-energy-requests',
  '/api/branch/approve-provider-energy',
  '/api/branch/energy-records',
  '/api/branch/providers',
  '/api/branch/members',
  '/api/branch/quota-requests',
  '/api/quota-requests',
  '/api/quota-requests/review',
  '/api/member/products',
  '/api/member/assets',
  '/api/member/energy-records',
  '/api/member/energy-recharge',
  '/api/member/recharge-request',
  '/api/member/revenue',
  '/api/admin/member-detail',
  '/api/member/revenue/convert',
  '/api/member/revenue/details',
  '/api/member/purchase-limits',
  '/api/member/referral-stats',
  '/api/member/pending-orders',
  '/api/member/withdraw',
  '/api/member/points-records',
  '/api/orders/buy',
  '/api/orders/sell',
  '/api/orders/review',
  '/api/orders',
  '/api/products',
  '/api/provider/members',
  '/api/provider/quota-requests',
  '/api/provider/pending-orders',
  '/api/provider/confirm-payment',
  '/api/provider/reject-order',
  '/api/provider/review-sell',
  '/api/provider/sales-stats',
  '/api/provider/products',
  '/api/provider/applications',
  '/api/provider/recharge-request',
  '/api/provider/recharge-energy',
  '/api/provider/withdraw-request',
  '/api/provider/generate-products',
  '/api/provider/revenue',
  '/api/provider/energy',
  '/api/provider/energy-withdraw',
  '/api/admin/stats',
  '/api/admin/three-types-stats',
  '/api/admin/orders',
  '/api/admin/provider-management',
  '/api/admin/members-stats',
  '/api/admin/branch-management',
  '/api/notifications',
  '/api/notifications/mark-read',
  '/api/admin/platform-stats',
  '/api/member/protection',
  '/api/admin/energy-stats',
  '/api/admin/energy-branch-stats',
  '/api/admin/reconcile-energy',
  '/api/energy/review-transfer',
  '/api/energy/member-stats',
  '/api/energy/approve-withdraw',
  '/api/energy/recharge',
  '/api/member/convert-to-energy',
  '/api/member/energy-to-provider',
  '/api/member/points-to-energy',
  '/api/provider/convert-to-energy',
  '/api/provider/transfer-energy',
  '/api/branch/convert-to-energy',
  '/api/branch/transfer-energy',
  '/api/admin/overview',
  '/api/admin/income-stats',
  '/api/admin/revenue-stats',
  '/api/admin/fee-records',
  '/api/admin/fee-stats',
  '/api/admin/withdraw-review',
  '/api/admin/transfer-balance',
  '/api/admin/migrate-unique-ids',
  '/api/quota-accounts',
  '/api/products/transfer/publish',
  '/api/products/transfer/buy',
  '/api/products/transfer/list',
  '/api/products/transfer/market',
  '/api/products/transfer/confirm-payment',
  '/api/products/transfer/review',
  '/api/products/transfer/pending-repurchase',
  '/api/products/transfer/repurchase',
  '/api/products/transfer/confirm-repurchase',
  '/api/provider/transfer-records',
  '/api/products/match/list',
  '/api/products/match/assign',
  '/api/admin/accounts',
  '/api/admin/financial-report',
  '/api/products/match/confirm',
  '/api/products/match/recycle',
  '/api/products/match/cancel',
  '/api/member/confirm-sell',
  '/api/member/energy-recharge-requests',
  '/api/provider/withdraw',
  '/api/member/withdraw',
  '/api/admin/release-records',
  '/api/admin/withdraw-review',
  '/api/admin/transfer-balance',
  '/api/balance/transfer',
  '/api/balance/convert',
  '/api/balance/convert-to-points',
  '/api/admin/dashboard',
  '/api/branch/withdraw',
  '/api/branch/withdraw-review',
  '/api/provider/withdrawals',
  '/api/provider/withdraw-request',
  '/api/users/search',
  '/api/admin/clear-user-data',
  '/api/branch/revenue-records',
  '/api/branch/overview',
  '/api/member/balance',
  '/api/provider/recharge-request/approve',
  '/api/products/release-revenue',
  '/api/admin/migrate-unique-id',
  '/api/withdrawals',
  '/api/withdrawals/confirm',
  '/api/points-products',
  '/api/points-exchange',
  '/api/admin/force-release',
  '/api/branch/products',
  '/api/branch/expired-products',
  '/api/points-exchange/orders',
  '/api/products/repurchase',
  '/api/product-templates',
  '/api/admin/users',
  '/api/admin/all-users',
  '/api/admin/system-config',
  '/api/admin/reset-password',
  '/api/admin/assign-role',
  '/api/admin/allocate-branch',
  '/api/admin/branch-templates',
  '/api/admin/clear-data',
  '/api/admin/delete-member',
  '/api/admin/member-detail',
  '/api/provider-applications',
  '/api/provider-applications/review',
  '/api/member/payment-info',
  '/api/member/apply-provider',
  '/api/energy-accounts',
  '/api/energy-transactions',
  '/api/invite-codes/generate',
  '/api/profile',
  '/api/profile/password',
  '/api/branch/approve-quota',
  '/api/branch/approve-provider',
  '/api/branch/transfer-member',
  '/api/branch/quota-allocations',
  '/api/branch/provider-energy-requests',
  '/api/branch/approve-provider-energy',
  '/api/provider/convert-records',
  '/api/capital-flow',
  '/api/provider/points-records',
  '/api/admin/points-products',
  '/api/admin/points-exchange-orders',
  '/api/upload',
];

// 静态资源和页面路径不走 API 认证
const SKIP_PREFIXES = [
  '/_next',
  '/favicon.ico',
  '/api/member/buy-lock',
  '/public',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 跳过静态资源
  if (SKIP_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // 只拦截 API 路由
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 公开接口放行
  if (PUBLIC_PATHS.some(path => pathname === path)) {
    return NextResponse.next();
  }

  // 检查 Authorization 头
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: '未登录，请先登录' },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);
  if (!token) {
    return NextResponse.json(
      { error: '令牌无效' },
      { status: 401 }
    );
  }

  // JWT 签名验证在 middleware 中用 jsonwebtoken 的同步方式不太方便，
  // 因此这里只检查令牌格式（3段 Base64），具体的签名验证在各 API 路由中完成。
  // 这是第一道防线，防止完全无令牌的请求进入。
  const parts = token.split('.');
  if (parts.length !== 3) {
    return NextResponse.json(
      { error: '令牌格式无效' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
