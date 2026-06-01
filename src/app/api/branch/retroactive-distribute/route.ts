import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { addEnergyValue, setRevenueReleased } from '@/lib/energy-utils';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // 1. 找出所有已解锁(revenue_released=true)的持仓
    const { data: releasedProducts, error: upErr } = await sb
      .from('user_products')
      .select('id, user_id, product_id, purchase_price, status, revenue_released')
      .eq('revenue_released', true);

    if (upErr) {
      return NextResponse.json({ success: false, message: '查询失败: ' + upErr.message }, { status: 500 });
    }

    if (!releasedProducts || releasedProducts.length === 0) {
      return NextResponse.json({ success: true, message: '没有需要补发的产品', data: { count: 0 } });
    }

    // 2. 检查哪些已有release_records（不需要补发）
    const { data: existingRecords } = await sb
      .from('release_records')
      .select('user_product_id');

    const alreadyDistributedIds = new Set(
      (existingRecords || []).map((r: { user_product_id: string }) => r.user_product_id)
    );

    // 3. 筛选出需要补发的
    const toDistribute = releasedProducts.filter(
      (up: { id: string }) => !alreadyDistributedIds.has(up.id)
    );

    console.log(`[补发] 已解锁: ${releasedProducts.length}, 已有记录: ${alreadyDistributedIds.size}, 需补发: ${toDistribute.length}`);

    if (toDistribute.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: '所有已解锁产品都已分配收益，无需补发', 
        data: { total: releasedProducts.length, alreadyDistributed: alreadyDistributedIds.size, toDistribute: 0 }
      });
    }

    // 4. 获取产品信息
    const productIds = toDistribute.map((up: { product_id: string }) => up.product_id);
    const { data: products } = await sb
      .from('products')
      .select('id, name, price, provider_id, period, profit_rate, market_rate, total_rate')
      .in('id', productIds);

    const productMap = new Map<string, Record<string, any>>();
    (products || []).forEach((p: Record<string, any>) => productMap.set(p.id, p));

    // 5. 获取所有相关用户
    const allUserIds = new Set<string>();
    toDistribute.forEach((up: Record<string, any>) => {
      allUserIds.add(up.user_id);
    });
    // 也需要产品关联的用户(provider, inviter, branch)
    (products || []).forEach((p: Record<string, any>) => {
      if (p.provider_id) allUserIds.add(p.provider_id);
    });

    const { data: users } = await sb
      .from('users')
      .select('id, username, role, provider_id, inviter_id, branch_id, energy_value')
      .in('id', Array.from(allUserIds));

    const userMap = new Map<string, Record<string, any>>();
    (users || []).forEach((u: Record<string, any>) => userMap.set(u.id, u));

    // 6. 逐个补发
    const results: Record<string, any>[] = [];
    const distributionLog: string[] = [];

    for (const up of toDistribute) {
      const product = productMap.get(up.product_id);
      if (!product) {
        console.log(`[补发] 跳过: 产品${up.product_id}不存在`);
        continue;
      }

      const price = Number(product.price) || Number(up.purchase_price);
      const revenue5pct = Math.round(price * 0.05 * 100) / 100;
      const memberShare = Math.round(revenue5pct * 0.4 * 100) / 100;   // 2%
      const providerShare = Math.round(revenue5pct * 0.4 * 100) / 100; // 2%
      const inviterShare = Math.round(revenue5pct * 0.05 * 100) / 100; // 0.25%
      const upstreamShare = Math.round(revenue5pct * 0.05 * 100) / 100; // 0.25%
      const branchShare = Math.round(revenue5pct * 0.02 * 100) / 100;  // 0.1%
      const companyShare = Math.round(revenue5pct * 0.08 * 100) / 100; // 0.4%

      const log: Record<string, any> = {
        userProductId: up.id,
        productName: product.name,
        price,
        revenue5pct,
        distributions: [] as Record<string, any>[]
      };

      // 会员 2%
      await addEnergyValue(up.user_id, memberShare);
      log.distributions.push({ role: '会员', userId: up.user_id, amount: memberShare });

      // 服务商 2%
      if (product.provider_id) {
        await addEnergyValue(product.provider_id, providerShare);
        log.distributions.push({ role: '服务商', userId: product.provider_id, amount: providerShare });

        // 服务商的上级服务商和直推人
        const providerUser = userMap.get(product.provider_id);
        if (providerUser) {
          // 直推人 0.25%
          if (providerUser.inviter_id) {
            const inviterUser = userMap.get(providerUser.inviter_id);
            if (inviterUser && inviterUser.role === 'member') {
              await addEnergyValue(providerUser.inviter_id, inviterShare);
              log.distributions.push({ role: '直推人', userId: providerUser.inviter_id, amount: inviterShare });
            }
          }
          // 上级服务商 0.25%
          if (providerUser.provider_id) {
            const upstreamProvider = userMap.get(providerUser.provider_id);
            if (upstreamProvider && upstreamProvider.role === 'provider') {
              await addEnergyValue(providerUser.provider_id, upstreamShare);
              log.distributions.push({ role: '上级服务商', userId: providerUser.provider_id, amount: upstreamShare });
            }
          }
          // 网点 0.1%
          if (providerUser.branch_id) {
            await addEnergyValue(providerUser.branch_id, branchShare);
            log.distributions.push({ role: '网点', userId: providerUser.branch_id, amount: branchShare });
          }
        }
      }

      // 公司 0.4%
      const { data: adminUser } = await sb
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .limit(1);
      if (adminUser && adminUser.length > 0) {
        await addEnergyValue(adminUser[0].id, companyShare);
        log.distributions.push({ role: '公司', userId: adminUser[0].id, amount: companyShare });
      }

      // 写入release_record防止重复（只记录核心字段）
      try {
        await sb.from('release_records').insert({
          user_product_id: up.id,
          user_id: up.user_id,
          product_id: up.product_id,
          created_at: new Date().toISOString()
        });
      } catch (e: any) {
        console.error('[补发] 写入release_records失败:', e?.message);
      }

      results.push(log);
      distributionLog.push(`${product.name}(¥${price}): 5%=¥${revenue5pct} → ${log.distributions.map((d: Record<string, any>) => `${d.role}¥${d.amount}`).join(', ')}`);
    }

    return NextResponse.json({
      success: true,
      message: `补发完成: ${toDistribute.length}个产品已补发收益`,
      data: {
        total: releasedProducts.length,
        alreadyDistributed: alreadyDistributedIds.size,
        retroactiveCount: toDistribute.length,
        details: distributionLog
      }
    });

  } catch (error: any) {
    console.error('[补发] 错误:', error);
    return NextResponse.json({ success: false, message: '补发失败: ' + error.message }, { status: 500 });
  }
}
