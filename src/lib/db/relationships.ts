import { supabase } from '@/lib/supabase/client';

export interface ListParams {
  stakeholderId?: string;
  direction?: 'from' | 'to' | 'both';
  type?: string;
  status?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export async function listRelationships(params: ListParams) {
  const {
    stakeholderId,
    direction = 'both',
    type,
    status,
    sort = 'created_at',
    order = 'desc',
    page = 1,
    pageSize = 50,
  } = params;

  let query = supabase
    .from('relationships')
    .select(`
      id,
      reference,
      from_stakeholder_id,
      to_stakeholder_id,
      relationship_type_id,
      strength,
      duration_months,
      status,
      start_date,
      end_date,
      last_interaction,
      interaction_count,
      created_at,
      from_stakeholder:from_stakeholder_id(name),
      to_stakeholder:to_stakeholder_id(name),
      relationship_type:relationship_type_id(label, code)
    `, { count: 'exact' });

  // Filter by stakeholder
  if (stakeholderId) {
    if (direction === 'from') {
      query = query.eq('from_stakeholder_id', stakeholderId);
    } else if (direction === 'to') {
      query = query.eq('to_stakeholder_id', stakeholderId);
    } else {
      // both directions
      query = query.or(`from_stakeholder_id.eq.${stakeholderId},to_stakeholder_id.eq.${stakeholderId}`);
    }
  }

  if (type) query = query.eq('relationship_type_id', type);
  if (status) query = query.eq('status', status);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.order(sort, { ascending: order === 'asc' }).range(from, to);
  if (error) {
    console.error('Error listing relationships:', error);
    throw error;
  }
  return { data: data || [], count: count || 0 };
}

export async function getRelationship(id: string) {
  const { data, error } = await supabase
    .from('relationships')
    .select(`
      *,
      from_stakeholder:from_stakeholder_id(id, name, reference),
      to_stakeholder:to_stakeholder_id(id, name, reference),
      relationship_type:relationship_type_id(*)
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error getting relationship:', error);
    throw error;
  }
  return data;
}

export async function createRelationship(payload: Record<string, any>) {
  const { data, error } = await supabase
    .from('relationships')
    .insert([payload])
    .select()
    .single();
  if (error) {
    console.error('Error creating relationship:', error);
    throw error;
  }
  return data;
}

export async function updateRelationship(id: string, payload: Record<string, any>) {
  const { data, error } = await supabase
    .from('relationships')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('Error updating relationship:', error);
    throw error;
  }
  return data;
}

export async function deleteRelationship(id: string) {
  const { error } = await supabase
    .from('relationships')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Error deleting relationship:', error);
    throw error;
  }
  return true;
}






