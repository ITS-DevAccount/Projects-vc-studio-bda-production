// API Route: /api/workspaces/[workspace_id]/access
// Methods: GET (list access grants), POST (grant access/invite user)

import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { WorkspaceAccessControl, GrantAccessRequest, WorkspacePermissions, ApiResponse } from '@/lib/types/workspace';

// Helper function to get default permissions for each role
function getDefaultPermissions(role: string): WorkspacePermissions {
  switch (role) {
    case 'owner':
      return {
        can_edit_dashboard: true,
        can_manage_files: true,
        can_invite_users: true,
        can_configure_services: true,
        can_view_audit_logs: true,
        can_delete_workspace: true,
      };
    case 'collaborator':
      return {
        can_edit_dashboard: false,
        can_manage_files: true,
        can_invite_users: false,
        can_configure_services: false,
        can_view_audit_logs: false,
        can_delete_workspace: false,
      };
    case 'consultant':
      return {
        can_edit_dashboard: false,
        can_manage_files: true,
        can_invite_users: false,
        can_configure_services: false,
        can_view_audit_logs: false,
        can_delete_workspace: false,
      };
    case 'viewer':
      return {
        can_edit_dashboard: false,
        can_manage_files: false,
        can_invite_users: false,
        can_configure_services: false,
        can_view_audit_logs: false,
        can_delete_workspace: false,
      };
    default:
      return {};
  }
}

// GET /api/workspaces/[workspace_id]/access - List access grants for workspace
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspace_id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { workspace_id } = await params;

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch access control records (RLS will enforce visibility)
    const { data: accessList, error } = await supabase
      .from('workspace_access_control')
      .select(`
        *,
        stakeholder:stakeholders!stakeholder_id(id, name, email, reference),
        invited_by_stakeholder:stakeholders!invited_by(id, name, email)
      `)
      .eq('workspace_id', workspace_id)
      .order('granted_at', { ascending: false });

    if (error) {
      console.error('Error fetching access list:', error);
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<WorkspaceAccessControl[]>>({
      data: accessList || [],
    });

  } catch (error: any) {
    console.error('Unexpected error in GET /api/workspaces/[workspace_id]/access:', error);
    return NextResponse.json<ApiResponse<null>>(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[workspace_id]/access - Grant access to workspace (invite user)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspace_id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { workspace_id } = await params;

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current stakeholder
    const { data: inviter } = await supabase
      .from('stakeholders')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!inviter) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Stakeholder not found' },
        { status: 404 }
      );
    }

    // Verify user has permission to invite (must be owner or have can_invite_users permission)
    const { data: currentAccess } = await supabase
      .from('workspace_access_control')
      .select('access_role, permissions')
      .eq('workspace_id', workspace_id)
      .eq('stakeholder_id', inviter.id)
      .eq('invitation_status', 'accepted')
      .single();

    if (!currentAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const canInvite = currentAccess.access_role === 'owner' ||
                     (currentAccess.permissions as WorkspacePermissions)?.can_invite_users === true;

    if (!canInvite) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Only workspace owner or users with invite permission can grant access' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: GrantAccessRequest = await req.json();
    const { stakeholder_id, access_role, permissions, expires_at } = body;

    // Validate required fields
    if (!stakeholder_id || !access_role) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Missing required fields: stakeholder_id, access_role' },
        { status: 400 }
      );
    }

    // Validate access_role
    const validRoles = ['owner', 'collaborator', 'consultant', 'viewer'];
    if (!validRoles.includes(access_role)) {
      return NextResponse.json<ApiResponse<null>>(
        { error: `Invalid access_role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Prevent granting owner role (only one owner per workspace)
    if (access_role === 'owner') {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Cannot grant owner role. Transfer ownership instead.' },
        { status: 400 }
      );
    }

    // Verify stakeholder exists
    const { data: targetStakeholder, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select('id, name, email')
      .eq('id', stakeholder_id)
      .single();

    if (stakeholderError || !targetStakeholder) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Target stakeholder not found' },
        { status: 404 }
      );
    }

    // Check if access already exists
    const { data: existingAccess } = await supabase
      .from('workspace_access_control')
      .select('id, invitation_status')
      .eq('workspace_id', workspace_id)
      .eq('stakeholder_id', stakeholder_id)
      .single();

    if (existingAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { error: `User already has ${existingAccess.invitation_status} access to this workspace` },
        { status: 409 }
      );
    }

    // Get default permissions for role or use provided permissions
    const finalPermissions = permissions || getDefaultPermissions(access_role);

    // Grant access
    const { data, error } = await supabase
      .from('workspace_access_control')
      .insert({
        workspace_id,
        stakeholder_id,
        access_role,
        permissions: finalPermissions,
        invited_by: inviter.id,
        invitation_status: 'pending',
        invited_at: new Date().toISOString(),
        granted_at: new Date().toISOString(),
        expires_at: expires_at || null,
      })
      .select(`
        *,
        stakeholder:stakeholders!stakeholder_id(id, name, email, reference)
      `)
      .single();

    if (error) {
      console.error('Error granting access:', error);
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      );
    }

    // TODO: Send email notification to invited user

    return NextResponse.json<ApiResponse<WorkspaceAccessControl>>(
      {
        data,
        message: `Access granted to ${targetStakeholder.name || targetStakeholder.email}`,
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Unexpected error in POST /api/workspaces/[workspace_id]/access:', error);
    return NextResponse.json<ApiResponse<null>>(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
