// API Route: /api/workspaces/[workspace_id]/access/[access_id]
// Methods: PATCH (update access), DELETE (revoke access)

import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { UpdateAccessRequest, WorkspaceAccessControl, ApiResponse } from '@/lib/types/workspace';

type RouteContext = { params: Promise<{ workspace_id: string; access_id: string }> };

// PATCH /api/workspaces/[workspace_id]/access/[access_id] - Update access role or permissions
export async function PATCH(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    const supabase = await createServerClient();
    const { workspace_id, access_id } = await params;

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current stakeholder
    const { data: currentStakeholder } = await supabase
      .from('stakeholders')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!currentStakeholder) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Stakeholder not found' },
        { status: 404 }
      );
    }

    // Get the access record to update
    const { data: targetAccess } = await supabase
      .from('workspace_access_control')
      .select('*, workspace:workspaces!inner(owner_stakeholder_id)')
      .eq('id', access_id)
      .eq('workspace_id', workspace_id)
      .single();

    if (!targetAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Access record not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body: UpdateAccessRequest = await req.json();

    // Check authorization
    const isWorkspaceOwner = targetAccess.workspace.owner_stakeholder_id === currentStakeholder.id;
    const isUpdatingSelf = targetAccess.stakeholder_id === currentStakeholder.id;

    // Users can accept/decline their own pending invitations
    if (isUpdatingSelf && targetAccess.invitation_status === 'pending') {
      if (body.invitation_status === 'accepted' || body.invitation_status === 'declined') {
        const { data, error } = await supabase
          .from('workspace_access_control')
          .update({
            invitation_status: body.invitation_status,
            accepted_at: body.invitation_status === 'accepted' ? new Date().toISOString() : null,
            last_accessed_at: body.invitation_status === 'accepted' ? new Date().toISOString() : null,
          })
          .eq('id', access_id)
          .select()
          .single();

        if (error) {
          console.error('Error updating invitation status:', error);
          return NextResponse.json<ApiResponse<null>>(
            { error: error.message },
            { status: 500 }
          );
        }

        return NextResponse.json<ApiResponse<WorkspaceAccessControl>>({
          data,
          message: `Invitation ${body.invitation_status}`,
        });
      }
    }

    // Only workspace owner can update other users' access
    if (!isWorkspaceOwner) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Only workspace owner can update access permissions' },
        { status: 403 }
      );
    }

    // Prevent modifying owner access
    if (targetAccess.access_role === 'owner') {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Cannot modify owner access' },
        { status: 403 }
      );
    }

    // Build update object
    const updateData: any = {};

    if (body.access_role !== undefined) {
      if (body.access_role === 'owner') {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Cannot change role to owner. Use ownership transfer instead.' },
          { status: 400 }
        );
      }
      updateData.access_role = body.access_role;
    }

    if (body.permissions !== undefined) {
      updateData.permissions = body.permissions;
    }

    if (body.invitation_status !== undefined) {
      updateData.invitation_status = body.invitation_status;
      if (body.invitation_status === 'accepted') {
        updateData.accepted_at = new Date().toISOString();
      }
    }

    if (body.expires_at !== undefined) {
      updateData.expires_at = body.expires_at;
    }

    // Update access record
    const { data, error } = await supabase
      .from('workspace_access_control')
      .update(updateData)
      .eq('id', access_id)
      .select(`
        *,
        stakeholder:stakeholders!stakeholder_id(id, name, email, reference)
      `)
      .single();

    if (error) {
      console.error('Error updating access:', error);
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<WorkspaceAccessControl>>({
      data,
      message: 'Access updated successfully',
    });

  } catch (error: any) {
    console.error('Unexpected error in PATCH /api/workspaces/[workspace_id]/access/[access_id]:', error);
    return NextResponse.json<ApiResponse<null>>(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces/[workspace_id]/access/[access_id] - Revoke access
export async function DELETE(
  _req: NextRequest,
  { params }: RouteContext
) {
  try {
    const supabase = await createServerClient();
    const { workspace_id, access_id } = await params;

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current stakeholder
    const { data: currentStakeholder } = await supabase
      .from('stakeholders')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!currentStakeholder) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Stakeholder not found' },
        { status: 404 }
      );
    }

    // Get the access record to delete
    const { data: targetAccess } = await supabase
      .from('workspace_access_control')
      .select('*, workspace:workspaces!inner(owner_stakeholder_id)')
      .eq('id', access_id)
      .eq('workspace_id', workspace_id)
      .single();

    if (!targetAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Access record not found' },
        { status: 404 }
      );
    }

    // Only workspace owner can revoke access
    const isWorkspaceOwner = targetAccess.workspace.owner_stakeholder_id === currentStakeholder.id;

    if (!isWorkspaceOwner) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Only workspace owner can revoke access' },
        { status: 403 }
      );
    }

    // Prevent revoking owner access
    if (targetAccess.access_role === 'owner') {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Cannot revoke owner access' },
        { status: 403 }
      );
    }

    // Revoke access (soft delete by updating status)
    const { error } = await supabase
      .from('workspace_access_control')
      .update({
        invitation_status: 'revoked',
      })
      .eq('id', access_id);

    if (error) {
      console.error('Error revoking access:', error);
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<null>>({
      message: 'Access revoked successfully',
    });

  } catch (error: any) {
    console.error('Unexpected error in DELETE /api/workspaces/[workspace_id]/access/[access_id]:', error);
    return NextResponse.json<ApiResponse<null>>(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
