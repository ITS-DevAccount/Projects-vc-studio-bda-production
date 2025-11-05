// Note: This file is used by both client and server components
// For API routes, use the server client from @/lib/supabase/server
// For client components, use the client from @/lib/supabase/client
import { supabase } from '@/lib/supabase/client';

export interface ListParams {
  q?: string;
  type?: string;
  status?: string;
  verified?: 'true' | 'false';
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export async function listStakeholders(params: ListParams) {
  const {
    q,
    type,
    status,
    verified,
    sort = 'created_at',
    order = 'desc',
    page = 1,
    pageSize = 50,
  } = params;

  let query = supabase
    .from('stakeholders')
    .select('id, reference, name, stakeholder_type_id, email, status, is_verified, created_at', { count: 'exact' });

  // Note: Stakeholders work across apps, so no app_uuid filter

  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
  if (type) query = query.eq('stakeholder_type_id', type);
  if (status) query = query.eq('status', status);
  if (verified === 'true' || verified === 'false') query = query.eq('is_verified', verified === 'true');

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.order(sort, { ascending: order === 'asc' }).range(from, to);
  if (error) {
    console.error('Error listing stakeholders:', error);
    throw error;
  }
  return { data: data || [], count: count || 0 };
}

export async function getStakeholder(id: string) {
  const { data, error } = await supabase
    .from('stakeholders')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error getting stakeholder:', error);
    throw error;
  }
  return data;
}

export async function createStakeholder(payload: Record<string, any>) {
  // Stakeholders work across apps, no app_uuid needed
  const { data, error } = await supabase
    .from('stakeholders')
    .insert([payload])
    .select()
    .single();
  if (error) {
    console.error('Error creating stakeholder:', error);
    throw error;
  }
  return data;
}

export async function updateStakeholder(id: string, payload: Record<string, any>) {
  // Stakeholders work across apps, no app_uuid filter needed
  const { data, error } = await supabase
    .from('stakeholders')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('Error updating stakeholder:', error);
    throw error;
  }
  return data;
}

export async function deleteStakeholder(id: string) {
  // Stakeholders work across apps, no app_uuid filter needed
  const { error } = await supabase
    .from('stakeholders')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Error deleting stakeholder:', error);
    throw error;
  }
  return true;
}


