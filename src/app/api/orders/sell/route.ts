import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/supabase-client';
import { authenticateRequest } from '@/lib/auth';

// 会员出售产品 - 到期解锁后可卖出流转（收益已自动到账，卖出只是流转产品）
export async function POST(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, message: '无效token' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, userProductId } = body;

    if (!userId || !userProductId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 验证操作权限
    if (user.role !== 'admin' && user.userId !== userId) {
      return NextResponse.json({ error: '无权操作' }, { status: 403 });
    }

    // 查询用户信息
    const dbUser = await queryOne<any>(
      'SELECT id, username, provider_id, phone, real_name FROM users WHERE id = $1',
      [userId]
    );
    if (!dbUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 查询用户产品
    const userProduct = await queryOne<any>(
      'SELECT * FROM user_products WHERE id = $1',
      [userProductId]
    );
    if (!userProduct) {
      return NextResponse.json({ error: '产品不存在' }, { status: 404 });
    }

    // 验证归属
    if (userProduct.user_id !== userId) {
      return NextResponse.json({ error: '无权操作此产品' }, { status: 403 });
    }

    // 验证状态
    if (userProduct.status !== 'holding') {
      return NextResponse.json({ error: '产品状态不允许出售' }, { status: 400 });
    }

    // 查询产品信息
    const product = await queryOne<any>(
      'SELECT * FROM products WHERE id = $1',
      [userProduct.product_id]
    );

    // 持仓时间锁检查 - 直接比较当前时间与到期时间
    const expireDate = new Date(userProduct.expire_date);
    const now = new Date();

    if (now < expireDate) {
      const remainingMs = expireDate.getTime() - now.getTime();
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      const remainingDays = Math.floor(remainingHours / 24);
      const hoursLeft = remainingHours % 24;
      return NextResponse.json({
        success: false,
        error: '持仓时间不足',
        data: {
          code: 'HOLD_TIME_LOCK',
          message: `${product?.period || 7}天产品需到期后才能出售，还需等待${remainingDays > 0 ? remainingDays + '天' : ''}${hoursLeft}小时`,
          canSell: false,
          expireDate: userProduct.expire_date,
        },
      }, { status: 400 });
    }

    // 如果收益尚未释放，自动释放（兜底逻辑，正常情况到期时已自动释放）
    if (!userProduct.revenue_released) {
      const profitRate = parseFloat(product?.profit_rate || userProduct.profit_rate || 0);
      const memberProfit = parseFloat(userProduct.purchase_price) * (profitRate / 100);

      // 会员收益到账 → balance（不是energy_value）
      // 市场费在购买时已经分配给各角色（balance），这里不再重复分配
      await execute(
        `UPDATE users SET balance = COALESCE(balance, 0) + $1, updated_at = NOW() WHERE id = $2`,
        [memberProfit, userId]
      );
      await execute(
        `INSERT INTO energy_transactions (user_id, type, amount, note, created_at)
         VALUES ($1, 'profit_release', $2, $3, NOW())`,
        [userId, memberProfit,
         `产品「${product?.name || '未知产品'}」到期释放收益${profitRate}%`]
      );

      // 记录member_revenue
      const holdingHours = (now.getTime() - new Date(userProduct.purchase_date).getTime()) / (1000 * 60 * 60);
      const holdingDays = Math.max(1, Math.floor(holdingHours / 24));
      const totalRate = parseFloat(product?.total_rate || 0);
      const marketRate = parseFloat(product?.market_rate || 0);
      await execute(
        `INSERT INTO member_revenue 
         (user_id, user_product_id, principal, profit, total_amount, converted_to_energy, status, product_name, product_code, product_period, total_rate, profit_rate, market_rate, holding_days)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [userId, userProductId, parseFloat(userProduct.purchase_price), memberProfit,
         parseFloat(userProduct.purchase_price) + memberProfit, 0, 'available',
         product?.name || '未知产品', product?.code || '', product?.period || 1,
         totalRate, profitRate, marketRate, holdingDays]
      );

      // 标记收益已释放
      await execute(
        `UPDATE user_products SET revenue_released = true, updated_at = NOW() WHERE id = $1`,
        [userProductId]
      );
    }

    const purchasePrice = parseFloat(userProduct.purchase_price);
    const expectedProfit = parseFloat(userProduct.expected_profit || 0);

    // 创建卖出订单
    const orderResult = await query(
      `INSERT INTO orders 
       (user_id, user_product_id, product_id, order_type, amount, status, review_note)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, userProductId, userProduct.product_id, 'sell', purchasePrice, 'pending', 
       `出售产品: ${product?.name || '未知产品'}，Token值¥${purchasePrice}待匹配成功后由新持有人线下支付`]
    );

    // 更新用户产品状态为"售卖中"
    await execute(
      `UPDATE user_products SET status = 'pending_sell', updated_at = NOW() WHERE id = $1`,
      [userProductId]
    );

    // 产品回到服务商 - 状态改为 pending_match（待匹配）
    await execute(
      `UPDATE products SET status = 'pending_match', previous_holder_id = $1, updated_at = NOW() WHERE id = $2`,
      [userId, userProduct.product_id]
    );

    // 通知服务商
    if (dbUser.provider_id) {
      const { getSupabase } = await import('@/lib/supabase-client');
      const supabase = getSupabase();
      await supabase.from('notifications').insert({
        receiver_id: dbUser.provider_id,
        receiver_role: 'provider',
        type: 'sell_request',
        title: '会员出售产品待匹配',
        content: `${dbUser.username} 出售产品 ${product?.name}，Token值¥${purchasePrice}，请匹配给新会员`,
        is_read: false
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        order: orderResult[0],
        profitCredited: expectedProfit,
        principalPending: purchasePrice,
        message: `出售成功！收益¥${expectedProfit.toFixed(2)}已到账智算金，Token值¥${purchasePrice.toFixed(2)}待匹配成功后由新持有人线下支付`,
      },
    });
  } catch (error) {
    console.error('出售产品失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '出售产品失败' },
      { status: 500 }
    );
  }
}
