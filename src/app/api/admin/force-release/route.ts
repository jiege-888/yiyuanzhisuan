import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/supabase-client';
import { authenticateRequest } from '@/lib/auth';

// 管理员强制释放所有到期未释放的产品收益
// 支持两种认证方式：1) Bearer token（管理员登录token）2) admin密钥
export async function POST(request: NextRequest) {
  try {
    // 认证：尝试JWT token或admin密钥
    const authHeader = request.headers.get('authorization');
    let isAdmin = false;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const user = authenticateRequest(request);
        if (user && user.role === 'admin') {
          isAdmin = true;
        }
      } catch {
        // JWT验证失败，检查是否是admin密钥
        if (token === 'admin-force-release-2026') {
          isAdmin = true;
        }
      }
    }

    // 也支持通过body传入密钥
    if (!isAdmin) {
      try {
        const body = await request.clone().json();
        if (body.adminKey === 'admin-force-release-2026') {
          isAdmin = true;
        }
      } catch {
        // body解析失败
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ success: false, message: '无权限操作，需要管理员身份' }, { status: 403 });
    }

    const now = new Date();

    // 查找所有到期未释放的holding产品
    const expiredProducts = await query(
      `SELECT up.*, p.name as product_name, p.code as product_code, p.period, 
              p.total_rate, p.profit_rate, p.market_rate, p.provider_id as product_provider_id
       FROM user_products up
       JOIN products p ON up.product_id = p.id
       WHERE up.revenue_released = false AND up.status = 'holding' AND up.expire_date <= NOW()
       ORDER BY up.expire_date ASC`
    );

    if (expiredProducts.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: '没有到期未释放的产品', 
        data: { released: 0, details: [] } 
      });
    }

    const details: any[] = [];
    let totalReleased = 0;

    for (const userProduct of expiredProducts) {
      const purchasePrice = parseFloat(userProduct.purchase_price);
      const profitRate = parseFloat(userProduct.profit_rate || 0);
      const memberProfit = purchasePrice * (profitRate / 100);

      console.log('[FORCE RELEASE] 释放收益:', {
        userProductId: userProduct.id,
        productName: userProduct.product_name,
        userId: userProduct.user_id,
        purchasePrice,
        profitRate,
        memberProfit,
      });

      // 1. 会员收益到账 → balance
      await execute(
        `UPDATE users SET balance = COALESCE(balance, 0) + $1, updated_at = NOW() WHERE id = $2`,
        [memberProfit, userProduct.user_id]
      );

      // 2. 写入energy_transactions明细
      await execute(
        `INSERT INTO energy_transactions (user_id, type, amount, note, created_at)
         VALUES ($1, 'profit_release', $2, $3, NOW())`,
        [userProduct.user_id, memberProfit,
         `产品「${userProduct.product_name}」到期释放收益${profitRate}%`]
      );

      // 3. 记录member_revenue
      const holdingHours = (now.getTime() - new Date(userProduct.purchase_date).getTime()) / (1000 * 60 * 60);
      const holdingDays = Math.max(1, Math.floor(holdingHours / 24));
      const totalRate = parseFloat(userProduct.total_rate || 0);
      const marketRate = parseFloat(userProduct.market_rate || 0);
      try {
        await execute(
          `INSERT INTO member_revenue 
           (user_id, user_product_id, principal, profit, total_amount, converted_to_energy, status, product_name, product_code, product_period, total_rate, profit_rate, market_rate, holding_days)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [userProduct.user_id, userProduct.id, purchasePrice, memberProfit, purchasePrice + memberProfit,
           0, 'available', userProduct.product_name, userProduct.product_code, userProduct.period,
           totalRate, profitRate, marketRate, holdingDays]
        );
      } catch (e) {
        console.error('[FORCE RELEASE] member_revenue写入失败(可能已存在):', e);
      }

      // 4. 标记收益已释放
      await execute(
        `UPDATE user_products SET revenue_released = true, updated_at = NOW() WHERE id = $1`,
        [userProduct.id]
      );

      // 5. 通知会员
      try {
        const supabaseModule = await import('@/lib/supabase-client');
        const { getSupabase } = supabaseModule;
        const supabase = getSupabase();
        await supabase.from('notifications').insert({
          receiver_id: userProduct.user_id,
          receiver_role: 'member',
          type: 'revenue_released',
          title: '收益已释放',
          content: `产品「${userProduct.product_name}」已到期，收益¥${memberProfit.toFixed(2)}已到账`,
          is_read: false
        });
      } catch (e) {
        console.error('[FORCE RELEASE] 通知发送失败:', e);
      }

      // 查询会员用户名
      const memberUser = await queryOne<any>('SELECT username, unique_id FROM users WHERE id = $1', [userProduct.user_id]);

      details.push({
        userProductId: userProduct.id,
        productName: userProduct.product_name,
        memberName: memberUser?.username || userProduct.user_id,
        memberId: memberUser?.unique_id || '',
        purchasePrice,
        memberProfit,
        profitRate,
        expireDate: userProduct.expire_date,
      });

      totalReleased++;
    }

    return NextResponse.json({
      success: true,
      message: `已强制释放${totalReleased}个到期产品的收益`,
      data: {
        released: totalReleased,
        details,
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[FORCE RELEASE] 异常:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
