import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

// 管理员一键释放所有到期产品收益（调用5%智算金分配逻辑）
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { providerId } = body;
    
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    
    // 查询到期未释放的产品
    let query = supabase
      .from('user_products')
      .select('id, user_id, product_id, purchase_price, expire_date, revenue_released, status, unlock_time')
      .eq('status', 'holding')
      .lt('expire_date', now)
      .eq('revenue_released', false);
    
    if (providerId) {
      // 通过产品关联筛选服务商
      const { data: providerProducts } = await supabase
        .from('products')
        .select('id')
        .eq('provider_id', providerId);
      
      if (providerProducts && providerProducts.length > 0) {
        const productIds = providerProducts.map(p => p.id);
        query = query.in('product_id', productIds);
      } else {
        return NextResponse.json({ success: true, message: '该服务商没有到期产品', data: { releasedCount: 0, details: [] } });
      }
    }
    
    const { data: expiredProducts, error } = await query;
    if (error) throw error;
    
    if (!expiredProducts || expiredProducts.length === 0) {
      return NextResponse.json({ success: true, message: '没有需要释放的到期产品', data: { releasedCount: 0, details: [] } });
    }
    
    let releasedCount = 0;
    const details: { userName: string; productName: string; amount: number }[] = [];
    
    for (const up of expiredProducts) {
      // 获取产品信息
      const { data: product } = await supabase.from('products').select('id, name, price, profit_rate, market_rate, period, provider_id').eq('id', up.product_id).single();
      if (!product) continue;
      
      // 获取会员信息
      const { data: member } = await supabase.from('users').select('id, username, real_name, inviter_id, provider_id').eq('id', up.user_id).single();
      if (!member) continue;
      
      const totalReleaseRate = 5; // 总释放5%
      const releaseAmount = Number(up.purchase_price) * totalReleaseRate / 100;
      
      // 分配5%智算金
      const memberShare = Number(up.purchase_price) * 2 / 100;
      const providerShare = Number(up.purchase_price) * 2 / 100;
      const inviterShare = Number(up.purchase_price) * 0.25 / 100;
      const upstreamShare = Number(up.purchase_price) * 0.25 / 100;
      const branchShare = Number(up.purchase_price) * 0.1 / 100;
      const companyShare = Number(up.purchase_price) * 0.4 / 100;
      
      // 1. 会员 +2%
      await supabase.rpc('rpc_query', {
        sql_query: `UPDATE users SET balance = COALESCE(balance, 0) + ${memberShare} WHERE id = '${member.id}'`
      });
      
      // 2. 服务商 +2%
      if (product.provider_id) {
        await supabase.rpc('rpc_query', {
          sql_query: `UPDATE users SET balance = COALESCE(balance, 0) + ${providerShare} WHERE id = '${product.provider_id}'`
        });
      }
      
      // 3. 直推人 +0.25%
      if (member.inviter_id) {
        await supabase.rpc('rpc_query', {
          sql_query: `UPDATE users SET balance = COALESCE(balance, 0) + ${inviterShare} WHERE id = '${member.inviter_id}'`
        });
      }
      
      // 4. 上级服务商 +0.25%
      if (member.provider_id && member.provider_id !== product.provider_id) {
        await supabase.rpc('rpc_query', {
          sql_query: `UPDATE users SET balance = COALESCE(balance, 0) + ${upstreamShare} WHERE id = '${member.provider_id}'`
        });
      }
      
      // 5. 网点 +0.1%
      const { data: providerUser } = await supabase.from('providers').select('branch_id').eq('user_id', product.provider_id).single();
      if (providerUser?.branch_id) {
        await supabase.rpc('rpc_query', {
          sql_query: `UPDATE users SET balance = COALESCE(balance, 0) + ${branchShare} WHERE id = '${providerUser.branch_id}'`
        });
      }
      
      // 6. 公司运营 +0.4%
      const { data: adminUser } = await supabase.from('users').select('id').eq('role', 'admin').limit(1).single();
      if (adminUser) {
        await supabase.rpc('rpc_query', {
          sql_query: `UPDATE users SET balance = COALESCE(balance, 0) + ${companyShare} WHERE id = '${adminUser.id}'`
        });
      }
      
      // 标记已释放+已解锁
      await supabase.from('user_products').update({
        revenue_released: true,
        unlock_time: new Date().toISOString()
      }).eq('id', up.id);
      
      // 写入通知
      await supabase.from('notifications').insert({
        user_id: member.id,
        type: 'revenue',
        title: '产品收益已到账',
        content: `您的产品${product.name}已到期，收益¥${memberShare.toFixed(2)}已到账，可以卖出提现`
      });
      
      details.push({
        userName: member.real_name || member.username,
        productName: product.name,
        amount: memberShare
      });
      releasedCount++;
    }
    
    return NextResponse.json({
      success: true,
      message: `成功释放${releasedCount}个到期产品收益`,
      data: { releasedCount, totalAmount: details.reduce((s, d) => s + d.amount, 0), details }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
