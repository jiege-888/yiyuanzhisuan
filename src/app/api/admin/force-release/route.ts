import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { execute as pgExecute } from '@/lib/supabase-client';
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/env';

// 管理员一键释放所有到期产品收益（调用5%智算金分配逻辑）
// 智算金写入 energy_value（前端"智算金"显示的就是energy_value）
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { providerId } = body;

    const url = getSupabaseUrl();
    const key = getSupabaseServiceRoleKey();
    const supabase = createClient(url, key);
    const now = new Date().toISOString();

    // 查询到期未释放的产品
    let query = supabase
      .from('user_products')
      .select('id, user_id, product_id, purchase_price, expire_date, revenue_released, status')
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
    const errors: string[] = [];

    for (const up of expiredProducts) {
      // 获取产品信息
      const { data: product } = await supabase.from('products').select('id, name, price, profit_rate, market_rate, period, provider_id').eq('id', up.product_id).single();
      if (!product) continue;

      // 获取会员信息
      const { data: member } = await supabase.from('users').select('id, username, real_name, inviter_id, provider_id').eq('id', up.user_id).single();
      if (!member) continue;

      const purchasePrice = Number(up.purchase_price);
      const totalReleaseRate = 5; // 总释放5%
      const releaseAmount = purchasePrice * totalReleaseRate / 100;

      // 分配5%智算金 → 全部写入 energy_value
      const memberShare = purchasePrice * 2 / 100;
      const providerShare = purchasePrice * 2 / 100;
      const inviterShare = purchasePrice * 0.25 / 100;
      const upstreamShare = purchasePrice * 0.25 / 100;
      const branchShare = purchasePrice * 0.1 / 100;
      const companyShare = purchasePrice * 0.4 / 100;

      // 1. 会员 +2% → energy_value
      try {
        await pgExecute(`UPDATE users SET energy_value = COALESCE(energy_value, 0) + ${memberShare} WHERE id = '${member.id}'`);
      } catch (e) {
        console.error('[force-release] 更新会员energy_value失败:', e);
        errors.push(`会员${member.username}智算金更新失败`);
      }

      // 2. 服务商 +2% → energy_value
      if (product.provider_id) {
        try {
          await pgExecute(`UPDATE users SET energy_value = COALESCE(energy_value, 0) + ${providerShare} WHERE id = '${product.provider_id}'`);
        } catch (e) {
          console.error('[force-release] 更新服务商energy_value失败:', e);
          errors.push('服务商智算金更新失败');
        }
      }

      // 3. 直推人 +0.25% → energy_value
      if (member.inviter_id) {
        try {
          await pgExecute(`UPDATE users SET energy_value = COALESCE(energy_value, 0) + ${inviterShare} WHERE id = '${member.inviter_id}'`);
        } catch (e) {
          console.error('[force-release] 更新直推人energy_value失败:', e);
        }
      }

      // 4. 上级服务商 +0.25% → energy_value
      if (member.provider_id && member.provider_id !== product.provider_id) {
        try {
          await pgExecute(`UPDATE users SET energy_value = COALESCE(energy_value, 0) + ${upstreamShare} WHERE id = '${member.provider_id}'`);
        } catch (e) {
          console.error('[force-release] 更新上级服务商energy_value失败:', e);
        }
      }

      // 5. 网点 +0.1% → energy_value
      const { data: providerUser } = await supabase.from('providers').select('branch_id').eq('user_id', product.provider_id).maybeSingle();
      if (providerUser?.branch_id) {
        try {
          await pgExecute(`UPDATE users SET energy_value = COALESCE(energy_value, 0) + ${branchShare} WHERE id = '${providerUser.branch_id}'`);
        } catch (e) {
          console.error('[force-release] 更新网点energy_value失败:', e);
        }
      }

      // 6. 公司运营 +0.4% → energy_value
      const { data: adminUser } = await supabase.from('users').select('id').eq('role', 'admin').limit(1).maybeSingle();
      if (adminUser) {
        try {
          await pgExecute(`UPDATE users SET energy_value = COALESCE(energy_value, 0) + ${companyShare} WHERE id = '${adminUser.id}'`);
        } catch (e) {
          console.error('[force-release] 更新公司energy_value失败:', e);
        }
      }

      // 标记已释放（用pgExecute确保写入）
      try {
        await pgExecute(`UPDATE user_products SET revenue_released = true, updated_at = NOW() WHERE id = '${up.id}'`);
      } catch (e) {
        console.error('[force-release] 更新revenue_released失败:', e);
        errors.push(`产品状态更新失败`);
      }

      // 写入通知
      try {
        await supabase.from('notifications').insert({
          user_id: member.id,
          type: 'revenue',
          title: '产品收益已到账',
          content: `您的产品${product.name}已到期，收益¥${memberShare.toFixed(2)}已到账智算金，可以卖出提现`
        });
      } catch (_e) { /* 忽略 */ }

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
      data: { releasedCount, totalAmount: details.reduce((s, d) => s + d.amount, 0), details },
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('[force-release] 释放失败:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
