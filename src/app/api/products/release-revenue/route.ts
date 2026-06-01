import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/supabase-client';
import { authenticateRequest } from '@/lib/auth';

// 释放到期产品收益 - 产品到期后释放5%智算金
// 分配比例：会员2%、服务商2%、直推0.25%、上级服务商0.25%、服务网点0.1%、公司运营0.4%
export async function POST(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, message: '无效token' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, userProductId } = body;

    if (!userId && !userProductId) {
      return NextResponse.json({ success: false, message: '缺少必要参数' }, { status: 400 });
    }

    if (userId && user.role !== 'admin' && user.role !== 'branch' && user.userId !== userId) {
      return NextResponse.json({ success: false, message: '无权操作' }, { status: 403 });
    }

    const now = new Date();

    // 获取待释放的产品列表
    let productsToRelease: any[] = [];

    if (userProductId) {
      const userProduct = await queryOne<any>(
        `SELECT up.*, p.name as product_name, p.code as product_code, p.period, 
                p.total_rate, p.profit_rate, p.market_rate, p.provider_id as product_provider_id, p.price as product_price
         FROM user_products up
         JOIN products p ON up.product_id = p.id
         WHERE up.id = $1`,
        [userProductId]
      );
      if (userProduct) {
        productsToRelease = [userProduct];
      }
    } else {
      productsToRelease = await query(
        `SELECT up.*, p.name as product_name, p.code as product_code, p.period,
                p.total_rate, p.profit_rate, p.market_rate, p.provider_id as product_provider_id, p.price as product_price
         FROM user_products up
         JOIN products p ON up.product_id = p.id
         WHERE up.user_id = $1 AND up.revenue_released = false AND up.status = 'holding'`,
        [userId]
      );
    }

    if (productsToRelease.length === 0) {
      return NextResponse.json({ success: true, message: '没有待释放的产品', data: { released: 0 } });
    }

    // 过滤出真正到期的产品
    const expiredProducts = productsToRelease.filter((up: any) => {
      if (!up.expire_date) return false;
      return now >= new Date(up.expire_date);
    });

    if (expiredProducts.length === 0) {
      return NextResponse.json({
        success: true,
        message: '暂无到期产品需要释放收益',
        data: { released: 0 }
      });
    }

    let totalMemberProfit = 0;
    let totalProviderShare = 0;
    let totalDirectShare = 0;
    let totalParentShare = 0;
    let totalBranchShare = 0;
    let totalCompanyShare = 0;
    const releasedProducts: string[] = [];
    const distributionDetails: any[] = [];

    for (const userProduct of expiredProducts) {
      if (userProduct.revenue_released) continue;

      const purchasePrice = parseFloat(userProduct.purchase_price);
      const profitRate = parseFloat(userProduct.profit_rate || 0);
      const totalRate = parseFloat(userProduct.total_rate || 0);
      const marketRate = parseFloat(userProduct.market_rate || 0);

      // 5%智算金分配
      const releaseAmount = Math.round(purchasePrice * 0.05 * 100) / 100;
      const memberShare = Math.round(purchasePrice * 0.02 * 100) / 100;      // 会员 2%
      const providerShare = Math.round(purchasePrice * 0.02 * 100) / 100;     // 服务商 2%
      const directReward = Math.round(purchasePrice * 0.0025 * 100) / 100;    // 直推 0.25%
      const parentShare = Math.round(purchasePrice * 0.0025 * 100) / 100;     // 上级服务商 0.25%
      const branchShare = Math.round(purchasePrice * 0.001 * 100) / 100;      // 服务网点 0.1%
      const companyShare = Math.round(purchasePrice * 0.004 * 100) / 100;     // 公司运营 0.4%

      console.log('[RELEASE REVENUE] 释放智算金:', {
        userProductId: userProduct.id,
        productName: userProduct.product_name,
        purchasePrice,
        releaseAmount,
        memberShare, providerShare, directReward, parentShare, branchShare, companyShare,
      });

      // 获取会员信息
      const member = await queryOne('SELECT id, inviter_id, provider_id, username FROM users WHERE id = $1', [userProduct.user_id]);

      // 1. 会员 2% → balance
      await execute(
        `UPDATE users SET balance = COALESCE(balance, 0) + $1, updated_at = NOW() WHERE id = $2`,
        [memberShare, userProduct.user_id]
      );

      // 2. 直推人 0.25% → balance
      let directRewardTo: string | null = null;
      if (directReward > 0 && member?.inviter_id) {
        const inviter = await queryOne('SELECT id FROM users WHERE id = $1', [member.inviter_id]);
        if (inviter) {
          directRewardTo = inviter.id;
          await execute('UPDATE users SET balance = COALESCE(balance, 0) + $1, updated_at = NOW() WHERE id = $2', [directReward, inviter.id]);
        }
      }

      // 3. 服务商 2% → balance
      const providerId = userProduct.product_provider_id || userProduct.seller_id;
      if (providerShare > 0 && providerId) {
        await execute('UPDATE users SET balance = COALESCE(balance, 0) + $1, updated_at = NOW() WHERE id = $2', [providerShare, providerId]);
      }

      // 4. 上级服务商 0.25% → balance（无上级时归服务网点）
      const providerInfo = await queryOne('SELECT branch_id, parent_provider_id FROM providers WHERE user_id = $1', [providerId]);
      let actualParentProviderId: string | null = null;
      if (providerInfo?.parent_provider_id && parentShare > 0) {
        const parentProvider = await queryOne('SELECT user_id FROM providers WHERE id = $1', [providerInfo.parent_provider_id]);
        if (parentProvider?.user_id) {
          actualParentProviderId = providerInfo.parent_provider_id;
          await execute('UPDATE users SET balance = COALESCE(balance, 0) + $1, updated_at = NOW() WHERE id = $2', [parentShare, parentProvider.user_id]);
        }
      }

      // 5. 服务网点 0.1%（+无上级时0.25%归网点）→ balance
      const distributionBranchId: string | null = providerInfo?.branch_id || null;
      const noParentExtra = actualParentProviderId ? 0 : parentShare;
      const branchTotalShare = branchShare + noParentExtra;
      if (providerInfo?.branch_id && branchTotalShare > 0) {
        await execute('UPDATE users SET balance = COALESCE(balance, 0) + $1, updated_at = NOW() WHERE id = $2', [branchTotalShare, providerInfo.branch_id]);
      }

      // 6. 公司运营 0.4% → balance
      if (companyShare > 0) {
        const adminUser = await queryOne("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (adminUser) {
          await execute('UPDATE users SET balance = COALESCE(balance, 0) + $1, updated_at = NOW() WHERE id = $2', [companyShare, adminUser.id]);
        }
      }

      // 写入energy_transactions明细
      await execute(
        `INSERT INTO energy_transactions (user_id, type, amount, note, created_at)
         VALUES ($1, 'profit_release', $2, $3, NOW())`,
        [userProduct.user_id, memberShare,
         `产品「${userProduct.product_name}」到期释放智算金：会员2%¥${memberShare}`]
      );

      // 记录会员收益到 member_revenue 表
      const holdingHours = (now.getTime() - new Date(userProduct.purchase_date).getTime()) / (1000 * 60 * 60);
      const holdingDays = Math.max(1, Math.floor(holdingHours / 24));
      await execute(
        `INSERT INTO member_revenue 
         (user_id, user_product_id, principal, profit, total_amount, converted_to_energy, status, product_name, product_code, product_period, total_rate, profit_rate, market_rate, holding_days)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [userProduct.user_id, userProduct.id, purchasePrice, memberShare, purchasePrice + memberShare,
         0, 'available', userProduct.product_name, userProduct.product_code, userProduct.period,
         totalRate, profitRate, marketRate, holdingDays]
      );

      // 记录释放收益到 release_records
      try {
        await execute(
          `INSERT INTO release_records 
           (product_id, product_name, product_price, release_amount, release_rate,
            member_id, member_name, member_share,
            direct_referral_id, direct_referral_share,
            provider_id, provider_share,
            parent_provider_id, parent_provider_share,
            senior_provider_id, senior_provider_share,
            branch_id, branch_share, company_share)
           VALUES ($1, $2, $3, $4, 0.05, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
          [
            userProduct.product_id, userProduct.product_name, purchasePrice, releaseAmount,
            userProduct.user_id, member?.username || userProduct.user_id, memberShare,
            directRewardTo, directReward,
            providerId, providerShare,
            actualParentProviderId, actualParentProviderId ? parentShare : 0,
            null, 0,
            distributionBranchId, branchShare, companyShare
          ]
        );
      } catch (e) {
        console.error('[RELEASE REVENUE] 记录release_records失败:', e);
      }

      // 标记收益已释放
      await execute(
        `UPDATE user_products SET revenue_released = true, updated_at = NOW() WHERE id = $1`,
        [userProduct.id]
      );

      // 通知会员
      try {
        const supabaseModule = await import('@/lib/supabase-client');
        const { getSupabase } = supabaseModule;
        const supabase = getSupabase();
        await supabase.from('notifications').insert({
          receiver_id: userProduct.user_id,
          receiver_role: 'member',
          type: 'revenue_released',
          title: '智算金已释放',
          content: `产品「${userProduct.product_name}」已到期，5%智算金已释放：会员2%¥${memberShare.toFixed(2)}已到账`,
          is_read: false
        });
      } catch (e) {
        console.error('[RELEASE REVENUE] 通知发送失败:', e);
      }

      totalMemberProfit += memberShare;
      totalProviderShare += providerShare;
      totalDirectShare += directReward;
      totalParentShare += parentShare;
      totalBranchShare += branchShare;
      totalCompanyShare += companyShare;
      releasedProducts.push(userProduct.id);

      distributionDetails.push({
        productId: userProduct.product_id,
        productName: userProduct.product_name,
        purchasePrice,
        releaseAmount,
        memberShare, providerShare, directReward, parentShare, branchShare, companyShare,
      });
    }

    return NextResponse.json({
      success: true,
      message: `已释放${releasedProducts.length}个产品的5%智算金，会员¥${totalMemberProfit.toFixed(2)}+服务商¥${totalProviderShare.toFixed(2)}+直推¥${totalDirectShare.toFixed(2)}+上级¥${totalParentShare.toFixed(2)}+网点¥${totalBranchShare.toFixed(2)}+公司¥${totalCompanyShare.toFixed(2)}均已到账`,
      data: {
        released: releasedProducts.length,
        totalReleaseAmount: totalMemberProfit + totalProviderShare + totalDirectShare + totalParentShare + totalBranchShare + totalCompanyShare,
        totalMemberProfit,
        totalProviderShare,
        totalDirectShare,
        totalParentShare,
        totalBranchShare,
        totalCompanyShare,
        details: distributionDetails,
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[RELEASE REVENUE] 异常:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
