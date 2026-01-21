// Workspace Helper Utilities
// Common functions for workspace operations

import { createServerClient } from '@/lib/supabase/server';
import type { WorkspaceWithDetails, WorkspaceAccessControl } from '@/lib/types/workspace';

/**
 * Get workspace by ID with full details
 */
export async function getWorkspaceById(workspaceId: string): Promise<WorkspaceWithDetails | null> {
  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('workspaces')
      .select(`
        *,
        owner:stakeholders!owner_stakeholder_id(id, name, email, reference),
        workspace_configurations!inner(
          id,
          dashboard_config_id,
          file_structure_template_id,
          business_services_config_id,
          applied_at,
          is_active,
          dashboard_config:workspace_dashboard_configurations(*),
          file_structure_template:workspace_file_structure_templates(*),
          business_services_config:workspace_business_services_configurations(*)
        ),
        workspace_access_control(
          id,
          stakeholder_id,
          access_role,
          permissions,
          invitation_status,
          accepted_at,
          stakeholder:stakeholders(id, name, email, reference)
        )
      `)
      .eq('id', workspaceId)
      .eq('workspace_configurations.is_active', true)
      .single();

    if (error) {
      console.error('Error fetching workspace:', error);
      return null;
    }

    return data as WorkspaceWithDetails;
  } catch (error) {
    console.error('Failed to get workspace:', error);
    return null;
  }
}

/**
 * Check if user has specific permission in workspace
 */
export async function checkWorkspacePermission(
  workspaceId: string,
  stakeholderId: string,
  permission: keyof WorkspaceAccessControl['permissions']
): Promise<boolean> {
  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('workspace_access_control')
      .select('access_role, permissions')
      .eq('workspace_id', workspaceId)
      .eq('stakeholder_id', stakeholderId)
      .eq('invitation_status', 'accepted')
      .single();

    if (error || !data) {
      return false;
    }

    // Owner has all permissions
    if (data.access_role === 'owner') {
      return true;
    }

    // Check specific permission
    return data.permissions[permission] === true;
  } catch (error) {
    console.error('Failed to check permission:', error);
    return false;
  }
}

/**
 * Get user's role in workspace
 */
export async function getUserWorkspaceRole(
  workspaceId: string,
  stakeholderId: string
): Promise<string | null> {
  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('workspace_access_control')
      .select('access_role')
      .eq('workspace_id', workspaceId)
      .eq('stakeholder_id', stakeholderId)
      .eq('invitation_status', 'accepted')
      .single();

    if (error || !data) {
      return null;
    }

    return data.access_role;
  } catch (error) {
    console.error('Failed to get user role:', error);
    return null;
  }
}

/**
 * Get current stakeholder ID from auth
 */
export async function getCurrentStakeholderId(): Promise<string | null> {
  try {
    const supabase = await createServerClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return null;
    }

    const { data: stakeholder, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (stakeholderError || !stakeholder) {
      return null;
    }

    return stakeholder.id;
  } catch (error) {
    console.error('Failed to get current stakeholder:', error);
    return null;
  }
}

/**
 * Check if user can access workspace
 */
export async function canAccessWorkspace(
  workspaceId: string,
  stakeholderId: string
): Promise<boolean> {
  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('workspace_access_control')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('stakeholder_id', stakeholderId)
      .eq('invitation_status', 'accepted')
      .single();

    return !error && !!data;
  } catch (error) {
    return false;
  }
}

/**
 * Format workspace reference
 */
export function formatWorkspaceReference(reference: string): string {
  return reference.toUpperCase();
}

/**
 * Get workspace status badge color
 */
export function getWorkspaceStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'green';
    case 'archived':
      return 'gray';
    case 'suspended':
      return 'red';
    default:
      return 'gray';
  }
}

/**
 * Get access role badge color
 */
export function getAccessRoleBadgeColor(role: string): string {
  switch (role) {
    case 'owner':
      return 'blue';
    case 'collaborator':
      return 'purple';
    case 'consultant':
      return 'amber';
    case 'viewer':
      return 'gray';
    default:
      return 'gray';
  }
}
