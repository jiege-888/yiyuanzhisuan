/**
 * 安全更新用户 energy_value 的工具函数
 * 
 * 问题：Supabase REST API 的 .update() 不支持 SQL 表达式（如 energy_value = energy_value + 50）
 * parseSetClause 会把 "energy_value + 50" 当成字符串字面值
 * 
 * 方案：先读取当前值 → 计算新值 → 用字面值更新 → 验证成功
 */

import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'Prefer': 'return=representation', 'Cache-Control': 'no-cache' } },
  });
}

/**
 * 安全地增加用户的 energy_value，同时写入energy_transactions流水记录
 * @param userId 用户ID
 * @param amount 增加的金额（正数）
 * @param description 描述（用于流水记录的note）
 * @param fromUserId 来源用户ID（可选，用于收益分配标识来源）
 * @returns 更新后的 energy_value 值，失败返回 null
 */
export async function addEnergyValue(userId: string, amount: number, description: string = '', fromUserId?: string): Promise<number | null> {
  const sb = getSupabaseClient();
  
  // 1. 读取当前值
  const { data: user, error: readErr } = await sb
    .from('users')
    .select('id, energy_value')
    .eq('id', userId)
    .single();
  
  if (readErr || !user) {
    console.error(`[addEnergyValue] 读取用户失败: userId=${userId}, error=${readErr?.message}`);
    return null;
  }
  
  const currentVal = Number(user.energy_value) || 0;
  const newVal = currentVal + amount;
  
  // 2. 用字面值更新
  const { data: updated, error: updateErr } = await sb
    .from('users')
    .update({ energy_value: newVal })
    .eq('id', userId)
    .select('id, energy_value');
  
  if (updateErr) {
    console.error(`[addEnergyValue] 更新失败: userId=${userId}, error=${updateErr?.message}`);
    return null;
  }
  
  if (!updated || updated.length === 0) {
    console.error(`[addEnergyValue] 更新返回空: userId=${userId}, 可能静默失败`);
    // 重试一次：再次读取确认
    const { data: recheck } = await sb
      .from('users')
      .select('energy_value')
      .eq('id', userId)
      .single();
    
    if (recheck && Number(recheck.energy_value) === newVal) {
      console.log(`[addEnergyValue] 二次确认成功: userId=${userId}, newVal=${newVal}`);
    } else {
      // 仍然失败，尝试直接用 RPC
      console.warn(`[addEnergyValue] 尝试RPC更新: userId=${userId}`);
      const { error: rpcErr } = await sb.rpc('rpc_execute', {
        sql_query: `UPDATE users SET energy_value = ${newVal} WHERE id = '${userId}'`
      });
      
      if (rpcErr) {
        console.error(`[addEnergyValue] RPC也失败: ${rpcErr.message}`);
        return null;
      }
    }
  }
  
  // 3. 写入energy_transactions流水记录
  try {
    const record: Record<string, unknown> = {
      type: fromUserId ? 'transfer_in' : 'revenue',
      amount: amount,
      to_user_id: userId,
      note: description || '智算金增加',
    };
    if (fromUserId) {
      record.from_user_id = fromUserId;
    }
    await sb.from('energy_transactions').insert(record);
  } catch (txErr) {
    console.error(`[addEnergyValue] 写入流水失败: ${txErr}`);
    // 流水写入失败不影响主流程
  }
  
  console.log(`[addEnergyValue] 成功: ${description}, userId=${userId}, ${currentVal} → ${newVal} (+${amount})`);
  return newVal;
}

/**
 * 安全地扣除用户的 energy_value，同时写入energy_transactions流水记录
 * @param userId 用户ID
 * @param amount 扣除的金额（正数）
 * @param description 描述
 * @param toUserId 去向用户ID（可选）
 * @returns 更新后的 energy_value 值，失败返回 null
 */
export async function deductEnergyValue(userId: string, amount: number, description: string = '', toUserId?: string): Promise<number | null> {
  const sb = getSupabaseClient();
  
  const { data: user, error: readErr } = await sb
    .from('users')
    .select('id, energy_value')
    .eq('id', userId)
    .single();
  
  if (readErr || !user) {
    console.error(`[deductEnergyValue] 读取用户失败: userId=${userId}, error=${readErr?.message}`);
    return null;
  }
  
  const currentVal = Number(user.energy_value) || 0;
  if (currentVal < amount) {
    console.error(`[deductEnergyValue] 余额不足: userId=${userId}, 当前=${currentVal}, 需扣=${amount}`);
    return null;
  }
  
  const newVal = currentVal - amount;
  
  const { data: updated, error: updateErr } = await sb
    .from('users')
    .update({ energy_value: newVal })
    .eq('id', userId)
    .select('id, energy_value');
  
  if (updateErr) {
    console.error(`[deductEnergyValue] 更新失败: userId=${userId}, error=${updateErr?.message}`);
    return null;
  }
  
  if (!updated || updated.length === 0) {
    const { data: recheck } = await sb
      .from('users')
      .select('energy_value')
      .eq('id', userId)
      .single();
    
    if (recheck && Number(recheck.energy_value) === newVal) {
      console.log(`[deductEnergyValue] 二次确认成功`);
    } else {
      const { error: rpcErr } = await sb.rpc('rpc_execute', {
        sql_query: `UPDATE users SET energy_value = ${newVal} WHERE id = '${userId}'`
      });
      if (rpcErr) {
        console.error(`[deductEnergyValue] RPC也失败: ${rpcErr.message}`);
        return null;
      }
    }
  }
  
  // 写入energy_transactions流水记录
  try {
    const record: Record<string, unknown> = {
      type: toUserId ? 'transfer_out' : 'deduction',
      amount: amount,
      from_user_id: userId,
      note: description || '智算金扣除',
    };
    if (toUserId) {
      record.to_user_id = toUserId;
    }
    await sb.from('energy_transactions').insert(record);
  } catch (txErr) {
    console.error(`[deductEnergyValue] 写入流水失败: ${txErr}`);
  }
  
  console.log(`[deductEnergyValue] 成功: ${description}, userId=${userId}, ${currentVal} → ${newVal} (-${amount})`);
  return newVal;
}

/**
 * 安全地增加用户的 balance
 * @param userId 用户ID
 * @param amount 增加的金额（正数）
 * @param description 描述（用于日志）
 * @returns 更新后的 balance 值，失败返回 null
 */
export async function addBalance(userId: string, amount: number, description: string = ''): Promise<number | null> {
  const sb = getSupabaseClient();
  
  const { data: user, error: readErr } = await sb
    .from('users')
    .select('id, balance')
    .eq('id', userId)
    .single();
  
  if (readErr || !user) {
    console.error(`[addBalance] 读取用户失败: userId=${userId}, error=${readErr?.message}`);
    return null;
  }
  
  const currentVal = Number(user.balance) || 0;
  const newVal = currentVal + amount;
  
  const { data: updated, error: updateErr } = await sb
    .from('users')
    .update({ balance: newVal })
    .eq('id', userId)
    .select('id, balance');
  
  if (updateErr) {
    console.error(`[addBalance] 更新失败: userId=${userId}, error=${updateErr?.message}`);
    return null;
  }
  
  if (!updated || updated.length === 0) {
    const { data: recheck } = await sb
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();
    
    if (recheck && Number(recheck.balance) === newVal) {
      console.log(`[addBalance] 二次确认成功`);
    } else {
      const { error: rpcErr } = await sb.rpc('rpc_execute', {
        sql_query: `UPDATE users SET balance = ${newVal} WHERE id = '${userId}'`
      });
      if (rpcErr) {
        console.error(`[addBalance] RPC也失败: ${rpcErr.message}`);
        return null;
      }
    }
  }
  
  console.log(`[addBalance] 成功: ${description}, userId=${userId}, ${currentVal} → ${newVal} (+${amount})`);
  return newVal;
}

/**
 * 设置 user_products 记录的 revenue_released 标记
 * @param userProductId 用户产品ID
 * @param released 是否已释放
 * @returns 是否成功
 */
export async function setRevenueReleased(userProductId: string, released: boolean): Promise<boolean> {
  const sb = getSupabaseClient();
  const { error } = await sb
    .from('user_products')
    .update({ revenue_released: released })
    .eq('id', userProductId);
  
  if (error) {
    console.error(`[setRevenueReleased] 失败: id=${userProductId}, error=${error.message}`);
    return false;
  }
  return true;
}

/**
 * 设置 user_products 记录的状态
 * @param userProductId 用户产品ID
 * @param status 新状态
 * @param extraFields 额外更新字段
 * @returns 是否成功
 */
export async function setUserProductStatus(userProductId: string, status: string, extraFields?: Record<string, unknown>): Promise<boolean> {
  const sb = getSupabaseClient();
  const updateData: Record<string, unknown> = { status, ...extraFields };
  const { error } = await sb
    .from('user_products')
    .update(updateData)
    .eq('id', userProductId);
  
  if (error) {
    console.error(`[setUserProductStatus] 失败: id=${userProductId}, error=${error.message}`);
    return false;
  }
  return true;
}
