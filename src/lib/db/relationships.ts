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
  appUuid: string; // Required - filter relationships by app
}

/**
 * List relationships with app-level filtering
 * @param params - Filter parameters including required appUuid
 */
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
    appUuid,
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
      app_uuid,
      from_stakeholder:from_stakeholder_id(name),
      to_stakeholder:to_stakeholder_id(name),
      relationship_type:relationship_type_id(label, code)
    `, { count: 'exact' })
    .eq('app_uuid', appUuid); // SECURITY: Always filter by app_uuid

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

/**
 * Get a single relationship by ID with app_uuid validation
 * @param id - Relationship ID
 * @param appUuid - Application UUID for security validation
 */
export async function getRelationship(id: string, appUuid: string) {
  const { data, error } = await supabase
    .from('relationships')
    .select(`
      *,
      from_stakeholder:from_stakeholder_id(id, name, reference),
      to_stakeholder:to_stakeholder_id(id, name, reference),
      relationship_type:relationship_type_id(*)
    `)
    .eq('id', id)
    .eq('app_uuid', appUuid) // SECURITY: Validate belongs to current app
    .single();

  if (error) {
    console.error('Error getting relationship:', error);
    throw error;
  }
  return data;
}

/**
 * Create a new relationship in a specific app
 * @param payload - Relationship data
 * @param appUuid - Application UUID
 */
export async function createRelationship(payload: Record<string, any>, appUuid: string) {
  const relationshipData = {
    ...payload,
    app_uuid: appUuid, // Always set app_uuid for new relationships
  };

  const { data, error } = await supabase
    .from('relationships')
    .insert([relationshipData])
    .select()
    .single();
  if (error) {
    console.error('Error creating relationship:', error);
    throw error;
  }
  return data;
}

/**
 * Update a relationship in a specific app
 * @param id - Relationship ID
 * @param payload - Updated relationship data
 * @param appUuid - Application UUID for security validation
 */
export async function updateRelationship(id: string, payload: Record<string, any>, appUuid: string) {
  const { data, error } = await supabase
    .from('relationships')
    .update(payload)
    .eq('id', id)
    .eq('app_uuid', appUuid) // SECURITY: Only update relationships in current app
    .select()
    .single();
  if (error) {
    console.error('Error updating relationship:', error);
    throw error;
  }
  return data;
}

/**
 * Delete a relationship from a specific app
 * @param id - Relationship ID
 * @param appUuid - Application UUID for security validation
 */
export async function deleteRelationship(id: string, appUuid: string) {
  const { error } = await supabase
    .from('relationships')
    .delete()
    .eq('id', id)
    .eq('app_uuid', appUuid); // SECURITY: Only delete relationships in current app
  if (error) {
    console.error('Error deleting relationship:', error);
    throw error;
  }
  return true;
}






