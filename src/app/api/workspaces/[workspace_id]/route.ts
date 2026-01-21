// API Route: /api/workspaces/[workspace_id]
// Methods: GET (get workspace details), PATCH (update workspace), DELETE (archive workspace)

import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { UpdateWorkspaceRequest, WorkspaceWithDetails, ApiResponse } from '@/lib/types/workspace';

// GET /api/workspaces/[workspace_id] - Get workspace details with configurations and access list
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

    // Fetch workspace with all related data (RLS will enforce access)
    const { data: workspace, error } = await supabase
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
          dashboard_config:workspace_dashboard_configurations(
            id,
            config_name,
            description,
            dashboard_config,
            version
          ),
          file_structure_template:workspace_file_structure_templates(
            id,
            template_name,
            description,
            structure_definition
          ),
          business_services_config:workspace_business_services_configurations(
            id,
            config_name,
            description,
            services_config,
            version
          )
        ),
        workspace_access_control(
          id,
          stakeholder_id,
          access_role,
          permissions,
          invitation_status,
          invited_at,
          accepted_at,
          granted_at,
          expires_at,
          stakeholder:stakeholders(id, name, email, reference)
        )
      `)
      .eq('id', workspace_id)
      .eq('workspace_configurations.is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Workspace not found or access denied' },
          { status: 404 }
        );
      }
      console.error('Error fetching workspace:', error);
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      );
    }

    // Get current user's stakeholder ID to find their access
    const { data: currentStakeholder } = await supabase
      .from('stakeholders')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    // Find current user's access record
    const currentUserAccess = workspace.workspace_access_control?.find(
      (access: any) => access.stakeholder_id === currentStakeholder?.id
    );

    // Transform workspace data
    const workspaceDetails: WorkspaceWithDetails = {
      ...workspace,
      configuration: workspace.workspace_configurations?.[0] || undefined,
      current_user_access: currentUserAccess,
    };

    return NextResponse.json<ApiResponse<WorkspaceWithDetails>>({
      data: workspaceDetails,
    });

  } catch (error: any) {
    console.error('Unexpected error in GET /api/workspaces/[workspace_id]:', error);
    return NextResponse.json<ApiResponse<null>>(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/workspaces/[workspace_id] - Update workspace metadata
export async function PATCH(
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

    // Get stakeholder ID
    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!stakeholder) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Stakeholder not found' },
        { status: 404 }
      );
    }

    // Verify user is workspace owner (RLS will also enforce this)
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_stakeholder_id')
      .eq('id', workspace_id)
      .single();

    if (!workspace || workspace.owner_stakeholder_id !== stakeholder.id) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Only workspace owner can update workspace' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: UpdateWorkspaceRequest = await req.json();

    // Build update object (only include provided fields)
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) {
      if (body.name.length < 3 || body.name.length > 100) {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Workspace name must be between 3 and 100 characters' },
          { status: 400 }
        );
      }
      updateData.name = body.name;
    }
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) {
      if (body.status === 'archived') {
        updateData.archived_at = new Date().toISOString();
      }
      updateData.status = body.status;
    }
    if (body.tags !== undefined) updateData.tags = body.tags;

    // Update workspace
    const { data, error } = await supabase
      .from('workspaces')
      .update(updateData)
      .eq('id', workspace_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating workspace:', error);
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<typeof data>>({
      data,
      message: 'Workspace updated successfully',
    });

  } catch (error: any) {
    console.error('Unexpected error in PATCH /api/workspaces/[workspace_id]:', error);
    return NextResponse.json<ApiResponse<null>>(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces/[workspace_id] - Archive workspace (soft delete)
export async function DELETE(
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

    // Get stakeholder ID
    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!stakeholder) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Stakeholder not found' },
        { status: 404 }
      );
    }

    // Verify user is workspace owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_stakeholder_id')
      .eq('id', workspace_id)
      .single();

    if (!workspace || workspace.owner_stakeholder_id !== stakeholder.id) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Only workspace owner can delete workspace' },
        { status: 403 }
      );
    }

    // Archive workspace (soft delete)
    const { error } = await supabase
      .from('workspaces')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspace_id);

    if (error) {
      console.error('Error archiving workspace:', error);
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<null>>({
      message: 'Workspace archived successfully',
    });

  } catch (error: any) {
    console.error('Unexpected error in DELETE /api/workspaces/[workspace_id]:', error);
    return NextResponse.json<ApiResponse<null>>(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
