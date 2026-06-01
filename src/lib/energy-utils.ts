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
 * 安全地增加用户的 energy_value
 * @param userId 用户ID
 * @param amount 增加的金额（正数）
 * @param description 描述（用于日志）
 * @returns 更新后的 energy_value 值，失败返回 null
 */
export async function addEnergyValue(userId: string, amount: number, description: string = ''): Promise<number | null> {
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
      return newVal;
    }
    
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
  
  console.log(`[addEnergyValue] 成功: ${description}, userId=${userId}, ${currentVal} → ${newVal} (+${amount})`);
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
    console.error(`[addBalance] 更新返回空: userId=${userId}, 可能静默失败`);
    const { data: recheck } = await sb
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();
    
    if (recheck && Number(recheck.balance) === newVal) {
      console.log(`[addBalance] 二次确认成功: userId=${userId}, newVal=${newVal}`);
      return newVal;
    }
    
    console.warn(`[addBalance] 尝试RPC更新: userId=${userId}`);
    const { error: rpcErr } = await sb.rpc('rpc_execute', {
      sql_query: `UPDATE users SET balance = ${newVal} WHERE id = '${userId}'`
    });
    
    if (rpcErr) {
      console.error(`[addBalance] RPC也失败: ${rpcErr.message}`);
      return null;
    }
  }
  
  console.log(`[addBalance] 成功: ${description}, userId=${userId}, ${currentVal} → ${newVal} (+${amount})`);
  return newVal;
}

/**
 * 安全地更新 user_products 的 revenue_released 标记
 */
export async function setRevenueReleased(userProductId: string, value: boolean): Promise<boolean> {
  const sb = getSupabaseClient();
  
  const { data: updated, error } = await sb
    .from('user_products')
    .update({ revenue_released: value })
    .eq('id', userProductId)
    .select('id, revenue_released');
  
  if (error) {
    console.error(`[setRevenueReleased] 更新失败: id=${userProductId}, error=${error.message}`);
    return false;
  }
  
  if (!updated || updated.length === 0) {
    console.error(`[setRevenueReleased] 更新返回空: id=${userProductId}, 可能静默失败`);
    // 二次确认
    const { data: recheck } = await sb
      .from('user_products')
      .select('revenue_released')
      .eq('id', userProductId)
      .single();
    
    if (recheck && recheck.revenue_released === value) {
      return true;
    }
    
    // 尝试RPC
    const { error: rpcErr } = await sb.rpc('rpc_execute', {
      sql_query: `UPDATE user_products SET revenue_released = ${value} WHERE id = '${userProductId}'`
    });
    
    if (rpcErr) {
      console.error(`[setRevenueReleased] RPC也失败: ${rpcErr.message}`);
      return false;
    }
  }
  
  console.log(`[setRevenueReleased] 成功: id=${userProductId}, value=${value}`);
  return true;
}

/**
 * 安全地更新 user_products 的 status 和 sold 标记
 */
export async function setUserProductStatus(
  userProductId: string, 
  status: string, 
  extraFields?: Record<string, unknown>
): Promise<boolean> {
  const sb = getSupabaseClient();
  
  const updateData: Record<string, unknown> = { status, ...extraFields };
  
  const { data: updated, error } = await sb
    .from('user_products')
    .update(updateData)
    .eq('id', userProductId)
    .select('id, status');
  
  if (error) {
    console.error(`[setUserProductStatus] 更新失败: id=${userProductId}, error=${error.message}`);
    return false;
  }
  
  if (!updated || updated.length === 0) {
    console.error(`[setUserProductStatus] 更新返回空: id=${userProductId}`);
    return false;
  }
  
  console.log(`[setUserProductStatus] 成功: id=${userProductId}, status=${status}`);
  return true;
}
