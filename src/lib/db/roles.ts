import { supabase } from '@/lib/supabase/client';

export async function listRolesForStakeholder(stakeholderId: string) {
  const { data, error } = await supabase
    .from('stakeholder_roles')
    .select('id, stakeholder_id, role_type, assigned_by, assigned_at')
    .eq('stakeholder_id', stakeholderId);
  if (error) throw error;
  return data || [];
}

export async function assignRoles(stakeholderId: string, roleTypes: string[]) {
  if (!roleTypes?.length) return [];
  const rows = roleTypes.map((role) => ({ stakeholder_id: stakeholderId, role_type: role }));
  const { data, error } = await supabase.from('stakeholder_roles').upsert(rows, { onConflict: 'stakeholder_id,role_type' }).select();
  if (error) throw error;
  return data || [];
}

export async function removeRoles(stakeholderId: string, roleTypes: string[]) {
  if (!roleTypes?.length) return true;
  const { error } = await supabase.from('stakeholder_roles')
    .delete()
    .eq('stakeholder_id', stakeholderId)
    .in('role_type', roleTypes);
  if (error) throw error;
  return true;
}


