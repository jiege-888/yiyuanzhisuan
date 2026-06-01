import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest, authorizeRole } from '@/lib/auth';
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/env';
import { execute, queryOne } from '@/lib/pg-client';

function getAdminSupabase() {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) throw new Error('Missing Supabase configuration');
  return createClient(url, key);
}

// 服务商确认收款（确认线下收到Token值后执行）
// 新流程：确认后产品进入持有状态，总台释放5%收益按7项分配
export async function POST(request: NextRequest) {
  try {
    const authUser = authenticateRequest(request);
    if (!authUser || !authorizeRole(authUser, ['provider'])) {
      return NextResponse.json({ error: '无权操作' }, { status: 403 });
    }

    const providerId = authUser.userId;
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });

    const client = getAdminSupabase();

    // 查询订单
    const { data: order, error: orderError } = await client
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) throw new Error(`查询订单失败: ${orderError.message}`);
    if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    if (order.status !== 'pending') {
      return NextResponse.json({ error: `订单状态为 ${order.status}，无法审核` }, { status: 400 });
    }

    // 先更新订单状态为已支付，防止重复点击
    const { error: updateOrderStatusError, data: updateData } = await client
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', orderId)
      .eq('status', 'pending')
      .select();

    if (updateOrderStatusError || !updateData || updateData.length === 0) {
      return NextResponse.json({ error: '订单已被处理，请刷新页面' }, { status: 400 });
    }

    let userProduct = null;
    let price = 0;
    let productName = '';

    if (order.product_id) {
      const { data: product, error: productError } = await client
        .from('products')
        .select('*')
        .eq('id', order.product_id)
        .maybeSingle();

      if (productError) throw new Error(`查询产品失败: ${productError.message}`);
      if (!product) return NextResponse.json({ error: '产品不存在' }, { status: 404 });
      if (product.provider_id !== providerId) {
        return NextResponse.json({ error: '无权操作此订单' }, { status: 403 });
      }

      price = parseFloat(product.price);
      productName = product.name;

      // 更新已有的 user_products 记录（pending_confirm → holding）
      if (order.user_product_id) {
        const { data: updatedUP, error: updateUPError } = await client
          .from('user_products')
          .update({
            status: 'holding',
            purchase_date: new Date().toISOString(),
            expire_date: new Date(Date.now() + product.period * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.user_product_id)
          .eq('status', 'pending_confirm')
          .select()
          .single();

        if (updateUPError) throw new Error(`更新持仓记录失败: ${updateUPError.message}`);
        userProduct = updatedUP;
      } else {
        const purchaseDate = new Date();
        const expireDate = new Date(purchaseDate);
        expireDate.setDate(expireDate.getDate() + product.period);

        const totalRate = parseFloat(product.total_rate) / 100;
        const marketRate = parseFloat(product.market_rate) / 100;
        const expectedProfit = price * totalRate;
        const marketFee = Math.ceil(price * marketRate);

        const { data: newUserProduct, error: createUserProductError } = await client
          .from('user_products')
          .insert({
            user_id: order.user_id,
            product_id: order.product_id,
            purchase_price: product.price,
            purchase_date: purchaseDate.toISOString(),
            expire_date: expireDate.toISOString(),
            expected_profit: expectedProfit.toFixed(2),
            market_fee: marketFee,
            status: 'holding',
            seller_id: providerId,
            transfer_type: 'provider_match',
          })
          .select()
          .single();

        if (createUserProductError) {
          await client.from('orders').update({ status: 'pending' }).eq('id', orderId);
          throw new Error(`创建用户产品记录失败: ${createUserProductError.message}`);
        }
        userProduct = newUserProduct;
      }

      // 更新产品状态为已售
      await client.from('products').update({
        status: 'sold',
        updated_at: new Date().toISOString(),
      }).eq('id', order.product_id);

      // 收益分配已移至到期释放时统一分配（5%智算金按比例释放给各角色）

      // 获取会员信息（流转记录和保护期需要）
      const member = await queryOne('SELECT id, inviter_id, provider_id, username, unique_id, phone FROM users WHERE id = $1', [order.user_id]);

      // 首次购买也写入流转记录（服务商→会员）
      try {
        const providerUser = await queryOne(
          `SELECT username, unique_id, phone FROM users WHERE id = $1`,
          [providerId]
        );
        const flowExpectedProfit = Number(price) * (Number(product.profit_rate) || 5) / 100;
        await client.from('product_flow_records').insert({
          product_id: product.id,
          product_code: product.code,
          product_name: productName,
          product_price: price,
          period: product.period,
          profit_rate: product.profit_rate,
          expected_profit: flowExpectedProfit,
          flow_type: 'provider_match',
          seller_id: providerId,
          seller_name: providerUser?.username || '服务商',
          seller_unique_id: providerUser?.unique_id || '',
          seller_phone: providerUser?.phone || '',
          buyer_id: order.user_id,
          buyer_name: member?.username || order.user_id,
          buyer_unique_id: member?.unique_id || '',
          buyer_phone: member?.phone || '',
          seller_profit: 0,
          provider_id: providerId,
        });
      } catch (e) {
        console.error('记录首次流转失败:', e);
      }

      // 发送通知给会员
      await client.from('notifications').insert({
        receiver_id: order.user_id, receiver_role: 'member', sender_id: providerId,
        sender_name: '系统通知', type: 'buy_confirmed', title: '购买申请已确认',
        content: `您购买的产品 ${productName} 已分配成功`, amount: price, related_id: userProduct?.id,
      });

      // 保护期延长逻辑：被推荐人购买>=3000时，推荐人保护期+18天
      try {
        if (member?.inviter_id && price >= 3000) {
          // 计算该被推荐人的累计购买金额
          const referredTotalResult = await queryOne(
            `SELECT COALESCE(SUM(purchase_price), 0) as total FROM user_products WHERE user_id = $1 AND status IN ('holding', 'sold')`,
            [order.user_id]
          );
          const referredTotal = parseFloat(referredTotalResult?.total || '0');
          
          // 判断是否刚好达到3000门槛（避免重复延长）
          if (referredTotal >= 3000) {
            // 检查是否已经为这个被推荐人延长过保护期
            const alreadyExtended = await queryOne(
              `SELECT id FROM protection_extensions WHERE inviter_id = $1 AND referred_id = $2 LIMIT 1`,
              [member.inviter_id, order.user_id]
            );
            
            if (!alreadyExtended) {
              // 延长推荐人保护期18天
              await execute(
                `UPDATE users SET 
                  protection_expires_at = CASE 
                    WHEN protection_expires_at IS NULL OR protection_expires_at < NOW() THEN NOW() + INTERVAL '18 days'
                    ELSE protection_expires_at + INTERVAL '18 days'
                  END,
                  valid_referrals_count = COALESCE(valid_referrals_count, 0) + 1,
                  updated_at = NOW()
                WHERE id = $1`,
                [member.inviter_id]
              );
              
              // 记录延长记录
              await execute(
                `INSERT INTO protection_extensions (inviter_id, referred_id, order_id, purchase_amount, extended_days, created_at)
                 VALUES ($1, $2, $3, $4, 18, NOW())`,
                [member.inviter_id, order.user_id, orderId, price]
              );
              
              console.log(`[protection] 用户${member.inviter_id}保护期延长18天，因推荐${order.user_id}购买${price}元`);
            }
          }
        }
      } catch (e) {
        console.error('保护期延长失败:', e);
      }
    }

    // 最后更新订单状态为已完成
    await client.from('orders').update({ 
      status: 'completed', user_product_id: userProduct?.id || order.user_product_id || null,
      payment_confirmed: true, payment_confirmed_at: new Date().toISOString(),
      payment_confirmed_by: providerId, updated_at: new Date().toISOString(),
    }).eq('id', orderId);

    return NextResponse.json({
      success: true,
      data: { order, userProduct, message: '收款已确认，产品分配成功，收益已释放' },
    });
  } catch (error) {
    console.error('确认收款失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '确认收款失败' },
      { status: 500 }
    );
  }
}
