// API Route: /api/workspaces/[workspace_id]/configurations
// Methods: GET (get workspace configuration), PATCH (update configuration)

import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { WorkspaceConfiguration, UpdateWorkspaceConfigurationRequest, ApiResponse } from '@/lib/types/workspace';

// GET /api/workspaces/[workspace_id]/configurations - Get current workspace configuration
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

    // Fetch active configuration with full details (RLS will enforce access)
    const { data: configuration, error } = await supabase
      .from('workspace_configurations')
      .select(`
        *,
        dashboard_config:workspace_dashboard_configurations(
          id,
          config_name,
          description,
          dashboard_config,
          version,
          is_default,
          created_at,
          updated_at
        ),
        file_structure_template:workspace_file_structure_templates(
          id,
          template_name,
          description,
          structure_definition,
          applicable_roles,
          usage_count,
          created_at,
          updated_at
        ),
        business_services_config:workspace_business_services_configurations(
          id,
          config_name,
          description,
          services_config,
          version,
          created_at,
          updated_at
        )
      `)
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Configuration not found or access denied' },
          { status: 404 }
        );
      }
      console.error('Error fetching configuration:', error);
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<WorkspaceConfiguration>>({
      data: configuration,
    });

  } catch (error: any) {
    console.error('Unexpected error in GET /api/workspaces/[workspace_id]/configurations:', error);
    return NextResponse.json<ApiResponse<null>>(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/workspaces/[workspace_id]/configurations - Update workspace configuration
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

    // Get current stakeholder
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

    // Verify user has permission to configure (must be owner or have can_configure_services permission)
    const { data: access } = await supabase
      .from('workspace_access_control')
      .select('access_role, permissions')
      .eq('workspace_id', workspace_id)
      .eq('stakeholder_id', stakeholder.id)
      .eq('invitation_status', 'accepted')
      .single();

    if (!access) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const canConfigure = access.access_role === 'owner' ||
                        (access.permissions as any)?.can_configure_services === true;

    if (!canConfigure) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Only workspace owner or users with configuration permission can update configuration' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: UpdateWorkspaceConfigurationRequest = await req.json();

    // Validate at least one configuration is provided
    const {
      dashboard_config_id,
      file_structure_template_id,
      business_services_config_id,
    } = body;

    if (
      dashboard_config_id === undefined &&
      file_structure_template_id === undefined &&
      business_services_config_id === undefined
    ) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'At least one configuration must be provided' },
        { status: 400 }
      );
    }

    // Get current active configuration
    const { data: currentConfig } = await supabase
      .from('workspace_configurations')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)
      .single();

    if (!currentConfig) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Active configuration not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {
      applied_at: new Date().toISOString(),
      applied_by: stakeholder.id,
    };

    if (dashboard_config_id !== undefined) {
      updateData.dashboard_config_id = dashboard_config_id;
    }
    if (file_structure_template_id !== undefined) {
      updateData.file_structure_template_id = file_structure_template_id;
    }
    if (business_services_config_id !== undefined) {
      updateData.business_services_config_id = business_services_config_id;
    }

    // Update configuration
    const { data, error } = await supabase
      .from('workspace_configurations')
      .update(updateData)
      .eq('id', currentConfig.id)
      .select(`
        *,
        dashboard_config:workspace_dashboard_configurations(
          id,
          config_name,
          description,
          version
        ),
        file_structure_template:workspace_file_structure_templates(
          id,
          template_name,
          description
        ),
        business_services_config:workspace_business_services_configurations(
          id,
          config_name,
          description,
          version
        )
      `)
      .single();

    if (error) {
      console.error('Error updating configuration:', error);
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<WorkspaceConfiguration>>({
      data,
      message: 'Configuration updated successfully',
    });

  } catch (error: any) {
    console.error('Unexpected error in PATCH /api/workspaces/[workspace_id]/configurations:', error);
    return NextResponse.json<ApiResponse<null>>(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
