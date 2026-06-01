import { NextResponse } from 'next/server';

/**
 * 一次性修正API：
 * 1. 将所有因重复补发而翻倍的energy_value重置为正确值
 * 2. 按新规则：无直推归服务商，无上级服务商归网点
 * 3. 写入release_records防止重复分配
 * 4. 验证总和=1500
 */
export async function POST() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

  const headers: Record<string, string> = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  const log: string[] = [];

  try {
    // ==========================================
    // Step 1: 获取所有已解锁的user_products
    // ==========================================
    const upRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_products?select=id,user_id,product_id,purchase_price,status,revenue_released&revenue_released=eq.true`,
      { headers }
    );
    const userProducts = await upRes.json();
    log.push(`已解锁user_products: ${userProducts.length}个`);

    if (userProducts.length === 0) {
      return NextResponse.json({ success: true, message: '没有需要修正的数据', log });
    }

    // ==========================================
    // Step 2: 获取产品信息
    // ==========================================
    const productIds = [...new Set(userProducts.map((up: any) => up.product_id))];
    const prodRes = await fetch(
      `${SUPABASE_URL}/rest/v1/products?select=id,name,price,period,provider_id,total_rate,market_rate,profit_rate&id=in.(${productIds.join(',')})`,
      { headers }
    );
    const products = await prodRes.json();
    const productMap = new Map<string, any>();
    products.forEach((p: any) => productMap.set(p.id, p));

    // ==========================================
    // Step 3: 获取所有相关用户
    // ==========================================
    const allUserIds = new Set<string>();
    userProducts.forEach((up: any) => allUserIds.add(up.user_id));
    products.forEach((p: any) => {
      if (p.provider_id) allUserIds.add(p.provider_id);
    });
    allUserIds.add('00000000-0000-0000-0000-000000000001'); // admin

    const usersRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?select=id,username,role,provider_id,inviter_id,branch_id,energy_value&id=in.(${[...allUserIds].join(',')})`,
      { headers }
    );
    const users = await usersRes.json();
    const userMap = new Map<string, any>();
    users.forEach((u: any) => userMap.set(u.id, u));

    // 还需要获取推荐人（可能是不在上面的用户）
    const inviterIds = users
      .filter((u: any) => u.inviter_id && !userMap.has(u.inviter_id))
      .map((u: any) => u.inviter_id);
    if (inviterIds.length > 0) {
      const invRes = await fetch(
        `${SUPABASE_URL}/rest/v1/users?select=id,username,role,provider_id,inviter_id,branch_id,energy_value&id=in.(${inviterIds.join(',')})`,
        { headers }
      );
      const inviters = await invRes.json();
      inviters.forEach((u: any) => userMap.set(u.id, u));
    }

    // 获取服务商的上级服务商信息
    const providerIds: string[] = [...new Set(products.map((p: any) => p.provider_id).filter(Boolean))] as string[];
    const provUserIds = providerIds.filter((id) => !userMap.has(id));
    if (provUserIds.length > 0) {
      const puRes = await fetch(
        `${SUPABASE_URL}/rest/v1/users?select=id,username,role,provider_id,inviter_id,branch_id,energy_value&id=in.(${provUserIds.join(',')})`,
        { headers }
      );
      const provUsers = await puRes.json();
      provUsers.forEach((u: any) => userMap.set(u.id, u));
    }

    // ==========================================
    // Step 4: 逐产品计算正确分配
    // ==========================================
    const allocation = new Map<string, number>(); // userId → 总增量

    for (const up of userProducts) {
      const product = productMap.get(up.product_id);
      if (!product) {
        log.push(`⚠️ 产品 ${up.product_id} 未找到，跳过`);
        continue;
      }

      const price = up.purchase_price;
      const holder = userMap.get(up.user_id);
      const providerUser = product.provider_id ? userMap.get(product.provider_id) : null;

      // 分配比例
      const memberShare = Math.round(price * 0.02 * 100) / 100;     // 2%
      const providerShare = Math.round(price * 0.02 * 100) / 100;   // 2%
      const inviterShare = Math.round(price * 0.0025 * 100) / 100;  // 0.25%
      const upstreamShare = Math.round(price * 0.0025 * 100) / 100; // 0.25%
      const branchShare = Math.round(price * 0.001 * 100) / 100;    // 0.1%
      const companyShare = Math.round(price * 0.004 * 100) / 100;   // 0.4%

      // 会员 2%
      allocation.set(up.user_id, (allocation.get(up.user_id) || 0) + memberShare);

      // 服务商 2%
      if (product.provider_id) {
        allocation.set(product.provider_id, (allocation.get(product.provider_id) || 0) + providerShare);
      }

      // 直推 0.25%
      // 规则：直推人不是服务商 → 给直推人；无直推或直推人是服务商 → 归服务商
      const inviterId = holder?.inviter_id;
      const inviterUser = inviterId ? userMap.get(inviterId) : null;
      if (inviterUser && inviterUser.role !== 'provider') {
        allocation.set(inviterId, (allocation.get(inviterId) || 0) + inviterShare);
        log.push(`  产品${product.name}: 直推0.25%(${inviterShare}) → ${inviterUser.username}`);
      } else {
        if (product.provider_id) {
          allocation.set(product.provider_id, (allocation.get(product.provider_id) || 0) + inviterShare);
          log.push(`  产品${product.name}: 直推0.25%(${inviterShare}) → 服务商(无直推或直推是服务商)`);
        }
      }

      // 上级服务商 0.25%
      // 规则：服务商有上级服务商 → 给上级；无上级 → 归网点
      const hasUpstreamProvider = !!(providerUser?.provider_id && providerUser.provider_id !== product.provider_id);
      if (hasUpstreamProvider && providerUser.provider_id) {
        const upstreamId = providerUser.provider_id;
        allocation.set(upstreamId, (allocation.get(upstreamId) || 0) + upstreamShare);
        log.push(`  产品${product.name}: 上级0.25%(${upstreamShare}) → ${userMap.get(upstreamId)?.username || upstreamId}`);
      } else {
        const branchId = holder?.branch_id || providerUser?.branch_id;
        if (branchId) {
          allocation.set(branchId, (allocation.get(branchId) || 0) + upstreamShare);
          log.push(`  产品${product.name}: 上级0.25%(${upstreamShare}) → 网点(无上级服务商)`);
        }
      }

      // 网点 0.1%
      const branchId = holder?.branch_id || providerUser?.branch_id;
      if (branchId) {
        allocation.set(branchId, (allocation.get(branchId) || 0) + branchShare);
      }

      // 公司 0.4%
      allocation.set('00000000-0000-0000-0000-000000000001', (allocation.get('00000000-0000-0000-0000-000000000001') || 0) + companyShare);
    }

    // ==========================================
    // Step 5: 验证总和
    // ==========================================
    let totalAllocation = 0;
    allocation.forEach((amount) => { totalAllocation += amount; });
    totalAllocation = Math.round(totalAllocation * 100) / 100;
    log.push(`\n分配总和: ${totalAllocation} (应为1500)`);

    if (Math.abs(totalAllocation - 1500) > 1) {
      return NextResponse.json({
        success: false,
        error: `分配总和 ${totalAllocation} ≠ 1500，中止修正`,
        allocation: Object.fromEntries([...allocation].map(([k, v]) => [userMap.get(k)?.username || k, v])),
        log,
      }, { status: 500 });
    }

    // ==========================================
    // Step 6: 读取当前energy_value，设置正确值
    // ==========================================
    const results: any[] = [];
    for (const [userId, correctAmount] of allocation) {
      const user = userMap.get(userId);
      if (!user) continue;

      // 重新读取最新energy_value
      const curRes = await fetch(
        `${SUPABASE_URL}/rest/v1/users?select=energy_value&id=eq.${userId}`,
        { headers }
      );
      const curData = await curRes.json();
      const currentEV = parseFloat(curData[0]?.energy_value || '0');

      // 这些用户的energy_value之前全部来自补发API，直接设为正确值
      const newEV = correctAmount;

      const updateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=representation' },
          body: JSON.stringify({ energy_value: newEV }),
        }
      );
      const updateData = await updateRes.json();

      const name = user?.username || userId;
      log.push(`✅ ${name}: ${currentEV} → ${newEV} (差=${(newEV - currentEV).toFixed(1)})`);
      results.push({ userId, username: name, from: currentEV, to: newEV, delta: newEV - currentEV });
    }

    // ==========================================
    // Step 7: 删除旧的release_records（如果有），重新写入
    // ==========================================
    // 先删
    const upIds = userProducts.map((up: any) => up.id);
    const delRes = await fetch(
      `${SUPABASE_URL}/rest/v1/release_records?user_product_id=in.(${upIds.join(',')})`,
      { method: 'DELETE', headers: { ...headers, Prefer: 'return=minimal' } }
    );
    log.push(`删除旧release_records: ${delRes.ok ? '成功' : '失败'}`);

    // 再写
    const records: any[] = [];
    for (const up of userProducts) {
      records.push({
        user_product_id: up.id,
        user_id: up.user_id,
        product_id: up.product_id,
        revenue_amount: Math.round(up.purchase_price * 0.02 * 100) / 100,
      });
    }

    if (records.length > 0) {
      const rrRes = await fetch(`${SUPABASE_URL}/rest/v1/release_records`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify(records),
      });
      if (rrRes.ok) {
        log.push(`✅ 写入 ${records.length} 条release_records`);
      } else {
        const rrErr = await rrRes.text();
        log.push(`⚠️ release_records写入失败: ${rrErr}`);
      }
    }

    // ==========================================
    // Step 8: 最终验证 - 重新读取所有用户energy_value
    // ==========================================
    let finalTotal = 0;
    const finalCheck: any[] = [];
    for (const [userId] of allocation) {
      const vRes = await fetch(
        `${SUPABASE_URL}/rest/v1/users?select=energy_value&id=eq.${userId}`,
        { headers }
      );
      const vData = await vRes.json();
      const ev = parseFloat(vData[0]?.energy_value || '0');
      finalTotal += ev;
      const name = userMap.get(userId)?.username || userId;
      finalCheck.push({ username: name, energy_value: ev });
    }
    finalTotal = Math.round(finalTotal * 100) / 100;

    log.push(`\n=== 最终验证 ===`);
    finalCheck.forEach(fc => log.push(`  ${fc.username}: ${fc.energy_value}`));
    log.push(`最终总和: ${finalTotal} (应为1500)`);

    return NextResponse.json({
      success: Math.abs(finalTotal - 1500) < 1,
      message: `修正完成，最终总和=${finalTotal}`,
      results,
      finalCheck,
      finalTotal,
      log,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      log,
    }, { status: 500 });
  }
}
