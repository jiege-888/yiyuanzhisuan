import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { setUserProductStatus } from '@/lib/energy-utils';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'Prefer': 'return=representation', 'Cache-Control': 'no-cache' } },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userProductIds } = body;

    if (!userProductIds || !Array.isArray(userProductIds) || userProductIds.length === 0) {
      return NextResponse.json({ success: false, message: '请选择要卖出的产品' }, { status: 400 });
    }

    const sb = getSupabaseClient();

    // 获取持仓记录
    const { data: userProducts, error: upErr } = await sb
      .from('user_products')
      .select('id, user_id, product_id, purchase_price, revenue_released, status')
      .in('id', userProductIds);

    if (upErr || !userProducts || userProducts.length === 0) {
      return NextResponse.json({ success: false, message: '未找到产品' }, { status: 404 });
    }

    let successCount = 0;
    const sellLog: string[] = [];

    for (const up of userProducts) {
      // 如果还没解锁，先解锁
      if (!up.revenue_released) {
        // 调用unlock逻辑（解锁+分配收益）
        try {
          const unlockRes = await fetch(new URL('/api/branch/unlock', request.url).toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userProductIds: [up.id] }),
          });
          const unlockData = await unlockRes.json();
          if (!unlockData.success) {
            sellLog.push(`产品${up.product_id}: 解锁失败 - ${unlockData.message}`);
            continue;
          }
        } catch (e) {
          sellLog.push(`产品${up.product_id}: 解锁异常`);
          continue;
        }
      }

      // 本金线下交易，不在系统内处理
      // 只更新产品状态为已售出
      const statusOk = await setUserProductStatus(up.id, 'sold', { sold: true });

      if (statusOk) {
        successCount++;
        sellLog.push(`产品${up.product_id}: 已卖出(本金线下退还)`);
      } else {
        sellLog.push(`产品${up.product_id}: 状态更新失败`);
      }
    }

    console.log(`[force-sell] 完成: 成功${successCount}/${userProducts.length}`);
    sellLog.forEach(l => console.log(`  ${l}`));

    return NextResponse.json({
      success: true,
      message: `成功卖出 ${successCount} 个产品`,
      data: { total: userProducts.length, success: successCount, log: sellLog },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[force-sell] Error:', msg);
    return NextResponse.json({ success: false, message: '卖出失败: ' + msg }, { status: 500 });
  }
}
