import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/env';

// 强制卖出产品（网点端操作）
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userProductIds } = body; // 支持批量

    if (!userProductIds || !Array.isArray(userProductIds) || userProductIds.length === 0) {
      return NextResponse.json({ success: false, message: '缺少userProductIds' }, { status: 400 });
    }

    const url = getSupabaseUrl();
    const key = getSupabaseServiceRoleKey();
    const supabase = createClient(url, key);

    // 查询要卖出的产品
    const { data: userProducts, error: queryError } = await supabase
      .from('user_products')
      .select('id, user_id, product_id, purchase_price, revenue_released, status')
      .in('id', userProductIds)
      .eq('status', 'holding');

    if (queryError) {
      return NextResponse.json({ success: false, message: '查询产品失败' }, { status: 500 });
    }

    if (!userProducts || userProducts.length === 0) {
      return NextResponse.json({ success: false, message: '未找到可卖出的产品' }, { status: 404 });
    }

    // 检查是否已释放收益（必须先解锁释放收益才能卖出）
    const unreleased = userProducts.filter((up: any) => !up.revenue_released);
    if (unreleased.length > 0) {
      return NextResponse.json({ success: false, message: `有 ${unreleased.length} 个产品尚未解锁释放收益，请先解锁再卖出` }, { status: 400 });
    }

    let soldCount = 0;

    for (const up of userProducts) {
      const purchasePrice = Number(up.purchase_price);

      // 1. 更新产品状态为已卖出
      await supabase
        .from('products')
        .update({ status: 'sold' })
        .eq('id', up.product_id);

      // 2. 更新用户产品状态为已卖出
      await supabase
        .from('user_products')
        .update({ status: 'sold' })
        .eq('id', up.id);

      // 3. 创建卖出订单
      await supabase
        .from('orders')
        .insert({
          user_id: up.user_id,
          user_product_id: up.id,
          order_type: 'sell',
          amount: purchasePrice,
          status: 'completed'
        });

      // 4. 返还本金到会员余额
      const { data: userData } = await supabase
        .from('users')
        .select('balance')
        .eq('id', up.user_id)
        .single();

      if (userData) {
        const newBalance = (Number(userData.balance) || 0) + purchasePrice;
        await supabase.from('users').update({ balance: newBalance }).eq('id', up.user_id);
      }

      // 5. 写入流转记录
      const { data: productInfo } = await supabase
        .from('products')
        .select('id, name, code, price, period, profit_rate, provider_id')
        .eq('id', up.product_id)
        .single();

      const { data: memberInfo } = await supabase
        .from('users')
        .select('id, username, unique_id, phone')
        .eq('id', up.user_id)
        .single();

      if (productInfo && memberInfo) {
        const { data: providerInfo } = await supabase
          .from('users')
          .select('id, username, unique_id, phone')
          .eq('id', productInfo.provider_id)
          .single();

        await supabase.from('product_flow_records').insert({
          product_id: productInfo.id,
          product_code: productInfo.code,
          product_name: productInfo.name,
          product_price: productInfo.price,
          period: productInfo.period,
          profit_rate: productInfo.profit_rate,
          seller_id: up.user_id,
          seller_name: memberInfo.username,
          seller_unique_id: memberInfo.unique_id,
          seller_phone: memberInfo.phone,
          buyer_id: productInfo.provider_id,
          buyer_name: providerInfo?.username || '-',
          buyer_unique_id: providerInfo?.unique_id || '-',
          buyer_phone: providerInfo?.phone || '-',
          provider_id: productInfo.provider_id,
          flow_type: 'branch_force_sell',
          user_product_id: up.id
        });
      }

      // 6. 通知会员
      await supabase.from('notifications').insert({
        user_id: up.user_id,
        type: 'system',
        title: '产品已卖出',
        content: `您持有的产品已被网点端卖出，本金 ¥${purchasePrice.toLocaleString()} 已返还至余额`
      });

      soldCount++;
    }

    return NextResponse.json({
      success: true,
      message: `成功卖出 ${soldCount} 个产品，本金已返还会员余额`,
      soldCount
    });
  } catch (err: any) {
    console.error('强制卖出失败:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
