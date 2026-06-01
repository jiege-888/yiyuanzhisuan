import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/supabase-client';
import { authenticateRequest } from '@/lib/auth';

// 会员卖出产品
export async function POST(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const body = await request.json();
    const { userId, userProductId } = body;

    if (!userId || !userProductId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const dbUser = await queryOne<any>('SELECT * FROM users WHERE id = $1', [userId]);
    if (!dbUser) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

    const userProduct = await queryOne<any>(
      'SELECT * FROM user_products WHERE id = $1 AND user_id = $2',
      [userProductId, userId]
    );
    if (!userProduct) return NextResponse.json({ error: '持仓不存在' }, { status: 404 });
    if (userProduct.status !== 'holding') {
      return NextResponse.json({ error: '产品状态不允许出售' }, { status: 400 });
    }

    // 查询产品信息
    const product = await queryOne<any>(
      'SELECT * FROM products WHERE id = $1',
      [userProduct.product_id]
    );

    // 持仓时间锁检查 - 如果收益已释放（网点已解锁），则跳过时间锁
    // 网点随时可以解锁，解锁后即可卖出
    const expireDate = new Date(userProduct.expire_date);
    const now = new Date();

    if (!userProduct.revenue_released && now < expireDate) {
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

    // 如果收益尚未释放，自动释放5%智算金给所有角色（兜底逻辑）
    if (!userProduct.revenue_released) {
      const purchasePrice = parseFloat(userProduct.purchase_price);

      // 5%智算金分配
      const memberShare = Math.round(purchasePrice * 0.02 * 100) / 100;
      const providerShare = Math.round(purchasePrice * 0.02 * 100) / 100;
      const directReward = Math.round(purchasePrice * 0.0025 * 100) / 100;
      const parentShare = Math.round(purchasePrice * 0.0025 * 100) / 100;
      const branchShare = Math.round(purchasePrice * 0.001 * 100) / 100;
      const companyShare = Math.round(purchasePrice * 0.004 * 100) / 100;

      // 1. 会员 2% → balance
      await execute(
        `UPDATE users SET balance = COALESCE(balance, 0) + $1, updated_at = NOW() WHERE id = $2`,
        [memberShare, userId]
      );

      // 2. 直推人 0.25%
      const member = await queryOne('SELECT inviter_id FROM users WHERE id = $1', [userId]);
      if (directReward > 0 && member?.inviter_id) {
        await execute('UPDATE users SET balance = COALESCE(balance, 0) + $1, updated_at = NOW() WHERE id = $2', [directReward, member.inviter_id]);
      }

      // 3. 服务商 2%
      const providerId = product?.provider_id || userProduct.seller_id;
      if (providerShare > 0 && providerId) {
        await execute('UPDATE users SET balance = COALESCE(balance, 0) + $1, updated_at = NOW() WHERE id = $2', [providerShare, providerId]);
      }

      // 4. 上级服务商 0.25%（无上级时归网点）
      const providerInfo = await queryOne('SELECT branch_id, parent_provider_id FROM providers WHERE user_id = $1', [providerId]);
      let actualParentProviderId: string | null = null;
      if (providerInfo?.parent_provider_id && parentShare > 0) {
        const parentProvider = await queryOne('SELECT user_id FROM providers WHERE id = $1', [providerInfo.parent_provider_id]);
        if (parentProvider?.user_id) {
          actualParentProviderId = providerInfo.parent_provider_id;
          await execute('UPDATE users SET balance = COALESCE(balance, 0) + $1, updated_at = NOW() WHERE id = $2', [parentShare, parentProvider.user_id]);
        }
      }

      // 5. 服务网点 0.1%（+无上级时0.25%）
      const noParentExtra = actualParentProviderId ? 0 : parentShare;
      const branchTotalShare = branchShare + noParentExtra;
      if (providerInfo?.branch_id && branchTotalShare > 0) {
        await execute('UPDATE users SET balance = COALESCE(balance, 0) + $1, updated_at = NOW() WHERE id = $2', [branchTotalShare, providerInfo.branch_id]);
      }

      // 6. 公司运营 0.4%
      if (companyShare > 0) {
        const adminUser = await queryOne("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (adminUser) {
          await execute('UPDATE users SET balance = COALESCE(balance, 0) + $1, updated_at = NOW() WHERE id = $2', [companyShare, adminUser.id]);
        }
      }

      // 写入energy_transactions
      await execute(
        `INSERT INTO energy_transactions (user_id, type, amount, note, created_at)
         VALUES ($1, 'profit_release', $2, $3, NOW())`,
        [userId, memberShare, `产品「${product?.name || '未知产品'}」到期释放智算金：会员2%¥${memberShare}`]
      );

      // 记录member_revenue
      const holdingHours = (now.getTime() - new Date(userProduct.purchase_date).getTime()) / (1000 * 60 * 60);
      const holdingDays = Math.max(1, Math.floor(holdingHours / 24));
      const totalRate = parseFloat(product?.total_rate || 0);
      const profitRate = parseFloat(product?.profit_rate || 0);
      const marketRate = parseFloat(product?.market_rate || 0);
      await execute(
        `INSERT INTO member_revenue 
         (user_id, user_product_id, principal, profit, total_amount, converted_to_energy, status, product_name, product_code, product_period, total_rate, profit_rate, market_rate, holding_days)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [userId, userProductId, purchasePrice, memberShare, purchasePrice + memberShare,
         0, 'available', product?.name || '未知产品', product?.code || '', product?.period || 1,
         totalRate, profitRate, marketRate, holdingDays]
      );

      // 标记收益已释放
      await execute(
        `UPDATE user_products SET revenue_released = true, updated_at = NOW() WHERE id = $1`,
        [userProductId]
      );
    }

    const purchasePrice = parseFloat(userProduct.purchase_price);

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
        title: '会员卖出申请',
        content: `会员 ${dbUser.username} 申请卖出产品 ${product?.name || '未知产品'}，Token值¥${purchasePrice}`,
        is_read: false
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        order: orderResult?.[0] || null,
        message: '卖出申请已提交，5%智算金已释放到各角色账户',
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[SELL] 卖出失败:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
