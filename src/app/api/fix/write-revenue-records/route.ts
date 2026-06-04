import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) throw new Error('Missing Supabase config');
  return createClient(url, key);
}

export async function POST() {
  const sb = getAdminSupabase();

  // ====== 查询所有已解锁产品 ======
  const { data: ups } = await sb
    .from('user_products')
    .select('id, user_id, product_id, purchase_price, revenue_released')
    .eq('revenue_released', true);

  if (!ups || ups.length === 0) {
    return NextResponse.json({ success: true, message: '没有已解锁产品' });
  }

  // ====== 查询所有用户关系 ======
  const { data: users } = await sb.from('users').select('id, username, role, provider_id, inviter_id, branch_id, phone');
  const userMap = new Map<string, { id: string; username: string; role: string; provider_id: string | null; inviter_id: string | null; branch_id: string | null; phone: string | null }>();
  for (const u of users || []) {
    userMap.set(u.id, u);
  }

  // ====== 查询服务商关系 ======
  const { data: providers } = await sb.from('providers').select('user_id, parent_provider_id, branch_id');
  const providerMap = new Map<string, { parent_provider_id: string | null; branch_id: string | null }>();
  for (const p of providers || []) {
    providerMap.set(p.user_id, { parent_provider_id: p.parent_provider_id, branch_id: p.branch_id });
  }

  // ====== 查询产品信息 ======
  const productIds = [...new Set(ups.map(up => up.product_id))];
  const { data: products } = await sb.from('products').select('id, name, code, price, period, total_rate, market_rate, profit_rate, provider_id').in('id', productIds);
  const productMap = new Map<string, { name: string; code: string; price: number; period: number; total_rate: number; market_rate: number; profit_rate: number; provider_id: string }>();
  for (const p of products || []) {
    productMap.set(p.id, p);
  }

  // ====== 常量 ======
  const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

  // ====== 先清空所有收益记录表（delete需要filter，用lt/gt覆盖所有id） ======
  console.log('[write-revenue-records] 清空旧记录...');
  // Supabase delete需要至少一个filter，使用 always-true filter
  await sb.from('provider_revenue_distribution').delete().gte('created_at', '2000-01-01');
  await sb.from('branch_revenue_records').delete().gte('created_at', '2000-01-01');
  await sb.from('member_revenue').delete().gte('created_at', '2000-01-01');
  await sb.from('revenue_details').delete().gte('created_at', '2000-01-01');
  await sb.from('energy_transactions').delete().gte('created_at', '2000-01-01');
  console.log('[write-revenue-records] 旧记录已清空');

  // ====== 逐产品生成记录 ======
  const providerRecords: Record<string, unknown>[] = [];
  const branchRecords: Record<string, unknown>[] = [];
  const memberRevenueRecords: Record<string, unknown>[] = [];
  const revenueDetailRecords: Record<string, unknown>[] = [];
  const energyTransactionRecords: Record<string, unknown>[] = [];

  const results: Record<string, unknown>[] = [];

  for (const up of ups) {
    const product = productMap.get(up.product_id);
    if (!product) {
      console.log(`[write-revenue-records] 跳过: 产品未找到 product_id=${up.product_id}`);
      continue;
    }

    const member = userMap.get(up.user_id);
    if (!member) continue;

    const price = up.purchase_price;
    const releaseFee = price * 0.05; // 总释放收益5%

    // 服务商
    const providerInfo = providerMap.get(product.provider_id);
    const hasUpstreamProvider = !!(providerInfo?.parent_provider_id);

    // 会员收益 2%
    const memberShare = price * 0.02;

    // 服务商分成 2%
    let providerShare = price * 0.02;

    // 直推奖励 0.25%
    const inviter = member.inviter_id ? userMap.get(member.inviter_id) : null;
    const inviterIsProvider = inviter?.role === 'provider';
    let directReward = 0;
    let directRewardTo: string | null = null;

    if (inviter && !inviterIsProvider) {
      // 直推人是会员 → 给直推人
      directReward = price * 0.0025;
      directRewardTo = member.inviter_id;
    } else {
      // 无直推或直推是服务商 → 归服务商
      providerShare += price * 0.0025;
    }

    // 上级服务商 0.25%
    let upstreamShare = 0;
    let upstreamProviderId: string | null = null;
    if (hasUpstreamProvider && providerInfo!.parent_provider_id) {
      upstreamShare = price * 0.0025;
      upstreamProviderId = providerInfo!.parent_provider_id;
    }
    // 无上级 → 上级0.25%归网点

    // 网点 0.1% + (无上级时额外0.25%)
    let branchShare = price * 0.001;
    if (!hasUpstreamProvider) {
      branchShare += price * 0.0025;
    }

    // 公司 0.4%
    const companyShare = price * 0.004;

    const branchId = member.branch_id || providerInfo?.branch_id;

    // 验证总和
    const total = memberShare + providerShare + directReward + upstreamShare + branchShare + companyShare;
    if (Math.abs(total - releaseFee) > 0.01) {
      console.log(`[write-revenue-records] 警告: 总和不等于5% price=${price} total=${total} releaseFee=${releaseFee}`);
    }

    // ====== 1. provider_revenue_distribution ======
    providerRecords.push({
      product_id: up.product_id,
      provider_id: product.provider_id,
      member_id: up.user_id,
      member_inviter_id: member.inviter_id || null,
      product_price: price,
      release_fee: releaseFee,
      provider_share: providerShare,
      direct_reward: directReward,
      direct_reward_to: directRewardTo,
      parent_provider_share: upstreamShare,
      parent_provider_id: upstreamProviderId,
      branch_share: branchShare,
      branch_id: branchId,
      company_share: companyShare,
      status: 'completed',
    });

    // ====== 2. branch_revenue_records ======
    if (branchId) {
      const baseBranchShare = price * 0.001;
      branchRecords.push({
        branch_id: branchId,
        type: 'market_fee_share',
        amount: baseBranchShare,
        related_user_id: up.user_id,
        status: 'completed',
        note: `会员${member.username}购买产品(${product.name})网点分成0.1%`,
      });

      if (!hasUpstreamProvider) {
        const upstreamToBranch = price * 0.0025;
        branchRecords.push({
          branch_id: branchId,
          type: 'provider_upstream',
          amount: upstreamToBranch,
          related_user_id: up.user_id,
          status: 'completed',
          note: `会员${member.username}购买产品(${product.name})上级服务商份额归网点0.25%`,
        });
      }
    }

    // ====== 3. member_revenue ======
    memberRevenueRecords.push({
      user_id: up.user_id,
      user_product_id: up.id,
      principal: price,
      profit: memberShare,
      total_amount: price + memberShare,
      converted_to_energy: memberShare,
      status: 'completed',
      product_name: product.name,
      product_code: product.code,
      product_period: product.period,
      total_rate: product.total_rate,
      profit_rate: product.profit_rate,
      market_rate: product.market_rate,
      holding_days: product.period,
    });

    // ====== 4. revenue_details (各角色) ======
    // 会员
    revenueDetailRecords.push({
      user_id: up.user_id,
      type: 'member_profit',
      amount: memberShare,
      description: `产品${product.name}收益分成2%`,
    });

    // 服务商
    revenueDetailRecords.push({
      user_id: product.provider_id,
      type: 'provider_share',
      amount: providerShare,
      description: `会员${member.username}购买产品分成`,
    });

    // 直推人
    if (directRewardTo && directReward > 0) {
      revenueDetailRecords.push({
        user_id: directRewardTo,
        type: 'direct_reward',
        amount: directReward,
        description: `直推会员${member.username}购买产品奖励0.25%`,
      });
    }

    // 网点
    if (branchId) {
      revenueDetailRecords.push({
        user_id: branchId,
        type: 'branch_share',
        amount: branchShare,
        description: `会员${member.username}购买产品网点分成`,
      });
    }

    // 公司
    revenueDetailRecords.push({
      user_id: COMPANY_ID,
      type: 'company_share',
      amount: companyShare,
      description: `会员${member.username}购买产品公司分成0.4%`,
    });

    // ====== 5. energy_transactions (各角色) ======
    energyTransactionRecords.push({
      user_id: up.user_id,
      type: 'market_fee_share',
      amount: memberShare,
      description: `产品${product.name}收益到账`,
      status: 'completed',
    });

    energyTransactionRecords.push({
      user_id: product.provider_id,
      type: 'market_fee_share',
      amount: providerShare,
      description: `会员${member.username}购买产品分成`,
      status: 'completed',
    });

    if (directRewardTo && directReward > 0) {
      energyTransactionRecords.push({
        user_id: directRewardTo,
        type: 'direct_reward',
        amount: directReward,
        description: `直推${member.username}奖励`,
        status: 'completed',
      });
    }

    if (branchId) {
      energyTransactionRecords.push({
        user_id: branchId,
        type: 'market_fee_share',
        amount: branchShare,
        description: `网点分成`,
        status: 'completed',
      });
    }

    energyTransactionRecords.push({
      user_id: COMPANY_ID,
      type: 'company_share',
      amount: companyShare,
      description: `公司分成`,
      status: 'completed',
    });

    results.push({
      product_name: product.name,
      price,
      member: member.username,
      inviter: inviter?.username || '无',
      inviterIsProvider,
      memberShare,
      providerShare,
      directReward,
      directRewardTo: directRewardTo ? userMap.get(directRewardTo)?.username : '归服务商',
      upstreamShare: hasUpstreamProvider ? upstreamShare : '归网点',
      branchShare,
      companyShare,
      total,
    });
  }

  // ====== 写入数据库 ======
  let providerInserted = 0;
  let branchInserted = 0;
  let memberRevenueInserted = 0;
  let revenueDetailInserted = 0;
  let energyTransactionInserted = 0;

  if (providerRecords.length > 0) {
    const { error } = await sb.from('provider_revenue_distribution').insert(providerRecords);
    if (error) console.error('[write-revenue-records] provider_revenue_distribution error:', error.message);
    else { providerInserted = providerRecords.length; }
  }

  if (branchRecords.length > 0) {
    const { error } = await sb.from('branch_revenue_records').insert(branchRecords);
    if (error) console.error('[write-revenue-records] branch_revenue_records error:', error.message);
    else { branchInserted = branchRecords.length; }
  }

  if (memberRevenueRecords.length > 0) {
    const { error } = await sb.from('member_revenue').insert(memberRevenueRecords);
    if (error) console.error('[write-revenue-records] member_revenue error:', error.message);
    else { memberRevenueInserted = memberRevenueRecords.length; }
  }

  if (revenueDetailRecords.length > 0) {
    const { error } = await sb.from('revenue_details').insert(revenueDetailRecords);
    if (error) console.error('[write-revenue-records] revenue_details error:', error.message);
    else { revenueDetailInserted = revenueDetailRecords.length; }
  }

  if (energyTransactionRecords.length > 0) {
    const { error } = await sb.from('energy_transactions').insert(energyTransactionRecords);
    if (error) console.error('[write-revenue-records] energy_transactions error:', error.message);
    else { energyTransactionInserted = energyTransactionRecords.length; }
  }

  // ====== 汇总验证 ======
  let totalRevenue = 0;
  for (const r of revenueDetailRecords) {
    totalRevenue += Number(r.amount);
  }

  return NextResponse.json({
    success: true,
    data: {
      productsProcessed: results.length,
      totalRevenue,
      recordsInserted: {
        provider_revenue_distribution: providerInserted,
        branch_revenue_records: branchInserted,
        member_revenue: memberRevenueInserted,
        revenue_details: revenueDetailInserted,
        energy_transactions: energyTransactionInserted,
      },
      details: results,
    },
  });
}
