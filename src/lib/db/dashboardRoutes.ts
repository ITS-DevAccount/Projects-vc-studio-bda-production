import { supabase } from '@/lib/supabase/client';

export interface DashboardRoute {
  id: string;
  stakeholder_type_id: string;
  role_id: string | null;
  route_path: string;
  description: string | null;
  priority: number;
  is_active: boolean;
}

/**
 * Fetches the best matching dashboard route for a stakeholder based on their type and role assignments.
 * Preference order:
 *   1. Active route matching stakeholder type AND one of the stakeholder's role_ids (lowest priority value wins)
 *   2. Active route matching stakeholder type with no role (default for the type)
 *   3. null (caller should fallback to a generic route)
 */
export async function getDashboardRouteForStakeholder(
  stakeholderId: string,
  stakeholderTypeId: string | null,
  primaryRoleId?: string | null
): Promise<string | null> {
  if (!stakeholderId || !stakeholderTypeId) {
    return null;
  }

  try {
    let roleIds: string[] = [];

    if (primaryRoleId) {
      roleIds.push(primaryRoleId);
    }

    // Load stakeholder role assignments (both role_id and legacy role_type)
    const { data: roleAssignments, error: rolesError } = await supabase
      .from('stakeholder_roles')
      .select('role_id, role_type')
      .eq('stakeholder_id', stakeholderId);

    if (rolesError) {
      console.warn('Unable to load stakeholder roles for dashboard routing:', rolesError);
    }

    roleIds = roleIds.concat(
      (roleAssignments || [])
        .map((assignment) => assignment.role_id)
        .filter((value): value is string => Boolean(value))
    );

    // Deduplicate role IDs
    roleIds = Array.from(new Set(roleIds));

    // If legacy role_type values exist without role_id, resolve them to the new roles table
    if (roleIds.length === 0) {
      const roleCodes = (roleAssignments || [])
        .map((assignment) => assignment.role_type)
        .filter((value): value is string => Boolean(value));

      if (roleCodes.length > 0) {
        const { data: roleRecords, error: roleLookupError } = await supabase
          .from('roles')
          .select('id, code')
          .in('code', roleCodes);

        if (roleLookupError) {
          console.warn('Unable to resolve role codes for dashboard routing:', roleLookupError);
        } else {
          roleIds = (roleRecords || []).map((role) => role.id);
        }
      }
    }

    // Attempt to find a role-specific route first
    if (roleIds.length > 0) {
      const { data: roleRoutes, error: roleRouteError } = await supabase
        .from('dashboard_routes')
        .select('route_path, priority')
        .eq('stakeholder_type_id', stakeholderTypeId)
        .in('role_id', roleIds)
        .eq('is_active', true)
        .order('priority', { ascending: true })
        .order('updated_at', { ascending: true })
        .limit(1);

      if (roleRouteError) {
        console.warn('Unable to load role-specific dashboard route:', roleRouteError);
      }

      if (roleRoutes && roleRoutes.length > 0) {
        return roleRoutes[0].route_path;
      }
    }

    // Fallback: route defined for the stakeholder type (no role)
    const { data: typeRoutes, error: typeRouteError } = await supabase
      .from('dashboard_routes')
      .select('route_path, priority')
      .eq('stakeholder_type_id', stakeholderTypeId)
      .is('role_id', null)
      .eq('is_active', true)
      .order('priority', { ascending: true })
      .order('updated_at', { ascending: true })
      .limit(1);

    if (typeRouteError) {
      console.warn('Unable to load stakeholder-type dashboard route:', typeRouteError);
      return null;
    }

    if (typeRoutes && typeRoutes.length > 0) {
      return typeRoutes[0].route_path;
    }

    return null;
  } catch (error) {
    console.error('Failed to determine dashboard route for stakeholder:', error);
    return null;
  }
}


