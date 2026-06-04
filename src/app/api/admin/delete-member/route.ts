import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

// 删除会员账号（前提：无持仓）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json({ error: '缺少会员ID' }, { status: 400 });
    }

    const supabase = getSupabase();

    // 1. 检查用户是否存在且是会员角色
    const { data: member, error: memberError } = await supabase
      .from('users')
      .select('id, role, username, energy_value, balance')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: '用户不存在' }, { status: 400 });
    }

    if (member.role !== 'member') {
      return NextResponse.json({ error: '只能删除会员账号' }, { status: 400 });
    }

    // 2. 检查会员是否有持仓（holding状态的user_products）
    const { count: holdingCount, error: holdingError } = await supabase
      .from('user_products')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', memberId)
      .eq('status', 'holding');

    if (holdingCount && holdingCount > 0) {
      return NextResponse.json({
        error: `该会员有 ${holdingCount} 个持仓中的产品，无法删除账号`
      }, { status: 400 });
    }

    // 3. 清除相关数据并删除账号

    // 3.1 删除资金流水记录
    await supabase.from('capital_flow_records').delete().eq('user_id', memberId);

    // 3.2 删除智算金流水
    await supabase.from('energy_transactions')
      .delete()
      .or(`from_user_id.eq.${memberId},to_user_id.eq.${memberId}`);

    // 3.3 删除智算金账户
    await supabase.from('energy_accounts').delete().eq('user_id', memberId);

    // 3.4 删除通知
    await supabase.from('notifications').delete().eq('user_id', memberId);

    // 3.5 删除已完成的用户产品记录（非holding状态）
    await supabase.from('user_products')
      .delete()
      .eq('user_id', memberId)
      .neq('status', 'holding');

    // 3.6 删除订单
    await supabase.from('orders').delete().eq('user_id', memberId);

    // 3.7 删除提现记录
    await supabase.from('withdrawals').delete().eq('user_id', memberId);

    // 3.8 删除充值申请
    await supabase.from('energy_recharge_requests').delete().eq('user_id', memberId);

    // 3.9 删除积分兑换记录
    await supabase.from('points_exchanges').delete().eq('user_id', memberId);

    // 3.10 清除下级会员的inviter_id引用
    await supabase.from('users')
      .update({ inviter_id: null })
      .eq('inviter_id', memberId);

    // 3.11 清除下级会员的provider_id引用
    await supabase.from('users')
      .update({ provider_id: null })
      .eq('provider_id', memberId);

    // 3.12 删除用户账号
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', memberId)
      .eq('role', 'member');

    if (deleteError) {
      console.error('[admin/delete-member] Delete user error:', deleteError);
      return NextResponse.json({ error: '删除用户账号失败: ' + deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `会员 ${member.username} 的账号已删除，相关收益和数据已清除`
    });

  } catch (error: any) {
    console.error('[admin/delete-member] Error:', error);
    return NextResponse.json(
      { error: error.message || '删除会员账号失败' },
      { status: 500 }
    );
  }
}
