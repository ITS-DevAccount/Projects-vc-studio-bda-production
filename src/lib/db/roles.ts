import { supabase } from '@/lib/supabase/client';

/**
 * List all roles assigned to a stakeholder in a specific app
 * @param stakeholderId - The stakeholder ID
 * @param appUuid - The application UUID to filter by
 */
export async function listRolesForStakeholder(stakeholderId: string, appUuid: string) {
  const { data, error } = await supabase
    .from('stakeholder_roles')
    .select('id, stakeholder_id, role_type, role_id, assigned_by, assigned_at, app_uuid')
    .eq('stakeholder_id', stakeholderId)
    .eq('app_uuid', appUuid);
  if (error) throw error;
  return data || [];
}

/**
 * Assign roles to a stakeholder in a specific app
 * @param stakeholderId - The stakeholder ID
 * @param roleTypes - Array of role codes to assign
 * @param appUuid - The application UUID
 */
export async function assignRoles(stakeholderId: string, roleTypes: string[], appUuid: string) {
  if (!roleTypes?.length) return [];

  // Get role IDs for this app
  const { data: roleRecords, error: roleLookupError } = await supabase
    .from('roles')
    .select('id, code')
    .in('code', roleTypes)
    .eq('app_uuid', appUuid);

  if (roleLookupError) throw roleLookupError;

  const rows = roleTypes.map((role) => ({
    stakeholder_id: stakeholderId,
    role_type: role,
    role_id: roleRecords?.find((record) => record.code === role)?.id || null,
    app_uuid: appUuid, // Include app_uuid in the insert
  }));

  const { data, error} = await supabase
    .from('stakeholder_roles')
    .upsert(rows, { onConflict: 'stakeholder_id,role_type,app_uuid' })
    .select();
  if (error) throw error;
  return data || [];
}

/**
 * Remove roles from a stakeholder in a specific app
 * @param stakeholderId - The stakeholder ID
 * @param roleTypes - Array of role codes to remove
 * @param appUuid - The application UUID
 */
export async function removeRoles(stakeholderId: string, roleTypes: string[], appUuid: string) {
  if (!roleTypes?.length) return true;
  const { error } = await supabase
    .from('stakeholder_roles')
    .delete()
    .eq('stakeholder_id', stakeholderId)
    .in('role_type', roleTypes)
    .eq('app_uuid', appUuid); // Filter by app_uuid for security
  if (error) throw error;
  return true;
}


