import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/supabase-client';
import { authenticateRequest } from '@/lib/auth';

// 释放到期产品收益 - 产品到期后自动释放
// 会员获得：profit_rate% 收益 + 延迟的2%购买分成（购买时未发放）
// 其他角色（服务商、直推、上级、分公司、总公司）在购买确认时已到账
export async function POST(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, message: '无效token' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, userProductId } = body;

    // 支持两种模式：
    // 1. 传 userProductId → 释放单个产品
    // 2. 传 userId → 批量释放该用户所有到期未释放的产品
    if (!userId && !userProductId) {
      return NextResponse.json({ success: false, message: '缺少必要参数' }, { status: 400 });
    }

    // 验证操作权限
    if (userId && user.role !== 'admin' && user.userId !== userId) {
      return NextResponse.json({ success: false, message: '无权操作' }, { status: 403 });
    }

    const now = new Date();

    // 获取待释放的产品列表
    let productsToRelease: any[] = [];

    if (userProductId) {
      const userProduct = await queryOne<any>(
        `SELECT up.*, p.name as product_name, p.code as product_code, p.period, 
                p.total_rate, p.profit_rate, p.market_rate, p.provider_id as product_provider_id, p.price as product_price
         FROM user_products up
         JOIN products p ON up.product_id = p.id
         WHERE up.id = $1`,
        [userProductId]
      );
      if (userProduct) {
        productsToRelease = [userProduct];
      }
    } else {
      productsToRelease = await query(
        `SELECT up.*, p.name as product_name, p.code as product_code, p.period,
                p.total_rate, p.profit_rate, p.market_rate, p.provider_id as product_provider_id, p.price as product_price
         FROM user_products up
         JOIN products p ON up.product_id = p.id
         WHERE up.user_id = $1 AND up.revenue_released = false AND up.status = 'holding'`,
        [userId]
      );
    }

    if (productsToRelease.length === 0) {
      return NextResponse.json({ success: true, message: '没有待释放的产品', data: { released: 0 } });
    }

    // 过滤出真正到期的产品
    const expiredProducts = productsToRelease.filter((up: any) => {
      if (!up.expire_date) return false;
      return now >= new Date(up.expire_date);
    });

    if (expiredProducts.length === 0) {
      return NextResponse.json({
        success: true,
        message: '暂无到期产品需要释放收益',
        data: { released: 0 }
      });
    }

    let totalMemberProfit = 0;
    let totalDelayedShare = 0;
    const releasedProducts: string[] = [];
    const distributionDetails: any[] = [];

    for (const userProduct of expiredProducts) {
      if (userProduct.revenue_released) continue;

      const purchasePrice = parseFloat(userProduct.purchase_price);
      const profitRate = parseFloat(userProduct.profit_rate || 0);
      const totalRate = parseFloat(userProduct.total_rate || 0);
      const marketRate = parseFloat(userProduct.market_rate || 0);

      // 1. 会员到期收益 = purchase_price * profit_rate / 100
      const memberProfit = Math.round(purchasePrice * (profitRate / 100) * 100) / 100;

      // 2. 会员延迟的2%购买分成（购买时未发放，延迟到到期时到账）
      const delayedShare = Math.round(purchasePrice * 0.02 * 100) / 100;

      // 会员总到账 = 收益 + 延迟分成
      const memberTotal = memberProfit + delayedShare;

      console.log('[RELEASE REVENUE] 释放收益:', {
        userProductId: userProduct.id,
        productName: userProduct.product_name,
        purchasePrice,
        profitRate,
        memberProfit,
        delayedShare,
        memberTotal,
      });

      // 1. 会员收益 + 延迟分成到账 → balance
      await execute(
        `UPDATE users SET balance = COALESCE(balance, 0) + $1, updated_at = NOW() WHERE id = $2`,
        [memberTotal, userProduct.user_id]
      );

      // 2. 写入energy_transactions明细 - 收益释放
      await execute(
        `INSERT INTO energy_transactions (user_id, type, amount, note, created_at)
         VALUES ($1, 'profit_release', $2, $3, NOW())`,
        [userProduct.user_id, memberTotal,
         `产品「${userProduct.product_name}」到期释放：收益${profitRate}%¥${memberProfit}+延迟分成¥${delayedShare}`]
      );

      // 3. 记录会员收益到 member_revenue 表
      const holdingHours = (now.getTime() - new Date(userProduct.purchase_date).getTime()) / (1000 * 60 * 60);
      const holdingDays = Math.max(1, Math.floor(holdingHours / 24));
      await execute(
        `INSERT INTO member_revenue 
         (user_id, user_product_id, principal, profit, total_amount, converted_to_energy, status, product_name, product_code, product_period, total_rate, profit_rate, market_rate, holding_days)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [userProduct.user_id, userProduct.id, purchasePrice, memberProfit, purchasePrice + memberProfit,
         0, 'available', userProduct.product_name, userProduct.product_code, userProduct.period,
         totalRate, profitRate, marketRate, holdingDays]
      );

      // 4. 标记收益已释放
      await execute(
        `UPDATE user_products SET revenue_released = true, updated_at = NOW() WHERE id = $1`,
        [userProduct.id]
      );

      // 5. 更新 release_records 中该产品的 member_share 为已发放
      try {
        await execute(
          `UPDATE release_records SET member_share = $1 WHERE product_id = $2`,
          [delayedShare, userProduct.product_id]
        );
      } catch (e) {
        console.error('[RELEASE REVENUE] 更新release_records失败:', e);
      }

      // 6. 通知会员
      try {
        const supabaseModule = await import('@/lib/supabase-client');
        const { getSupabase } = supabaseModule;
        const supabase = getSupabase();
        await supabase.from('notifications').insert({
          receiver_id: userProduct.user_id,
          receiver_role: 'member',
          type: 'revenue_released',
          title: '收益已释放',
          content: `产品「${userProduct.product_name}」已到期，收益¥${memberProfit.toFixed(2)}+延迟分成¥${delayedShare.toFixed(2)}=¥${memberTotal.toFixed(2)}已到账`,
          is_read: false
        });
      } catch (e) {
        console.error('[RELEASE REVENUE] 通知发送失败:', e);
      }

      totalMemberProfit += memberProfit;
      totalDelayedShare += delayedShare;
      releasedProducts.push(userProduct.id);

      distributionDetails.push({
        productId: userProduct.product_id,
        productName: userProduct.product_name,
        purchasePrice,
        memberProfit,
        delayedShare,
        memberTotal,
        note: '其他角色（服务商/直推/上级/分公司/总公司）已在购买确认时到账'
      });
    }

    // 获取会员最新余额
    const memberId = userId || expiredProducts[0]?.user_id;
    const memberAfter = await queryOne<any>('SELECT balance FROM users WHERE id = $1', [memberId]);

    return NextResponse.json({
      success: true,
      message: `已释放${releasedProducts.length}个产品的收益，会员收益合计¥${totalMemberProfit.toFixed(2)}+延迟分成¥${totalDelayedShare.toFixed(2)}=¥${(totalMemberProfit + totalDelayedShare).toFixed(2)}已到账`,
      data: {
        released: releasedProducts.length,
        totalMemberProfit,
        totalDelayedShare,
        totalToMember: totalMemberProfit + totalDelayedShare,
        revenueReleased: true,
        userBalance: parseFloat(memberAfter?.balance || 0),
        details: distributionDetails,
        note: '其他角色（服务商70%/直推10%/上级服务商10%/分公司5%/总公司5%）已在购买确认时按比例到账balance'
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[RELEASE REVENUE] 异常:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
