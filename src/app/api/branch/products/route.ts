import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/env';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const providerId = searchParams.get('providerId');

    const url = getSupabaseUrl();
    const key = getSupabaseServiceRoleKey();
    const supabase = createClient(url, key);

    if (providerId) {
      // 按单个服务商查询产品
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

      if (prodError) {
        return NextResponse.json({ success: false, message: '查询产品失败' }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: products || [] });
    }

    if (!branchId) {
      return NextResponse.json({ success: false, message: '缺少branchId或providerId' }, { status: 400 });
    }

    // 按网点查询所有服务商的产品
    const { data: providers, error: provError } = await supabase
      .from('providers')
      .select('user_id')
      .eq('branch_id', branchId);
    
    if (provError) {
      return NextResponse.json({ success: false, message: '查询服务商失败' }, { status: 500 });
    }

    const providerIds = (providers || []).map((p: any) => p.user_id);
    if (providerIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('*')
      .in('provider_id', providerIds)
      .order('created_at', { ascending: false });

    if (prodError) {
      return NextResponse.json({ success: false, message: '查询产品失败' }, { status: 500 });
    }

    // 批量查询服务商名称
    const { data: providerUsers } = await supabase
      .from('users')
      .select('id, username')
      .in('id', providerIds);

    const providerNameMap: Record<string, string> = {};
    (providerUsers || []).forEach((u: any) => {
      providerNameMap[u.id] = u.username;
    });

    const result = (products || []).map((p: any) => ({
      ...p,
      provider_name: providerNameMap[p.provider_id] || '-'
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error('查询网点产品失败:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
