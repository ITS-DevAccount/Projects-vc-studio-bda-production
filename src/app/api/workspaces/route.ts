// API Route: /api/workspaces
// Methods: GET (list workspaces), POST (create workspace)

import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';
import type { CreateWorkspaceRequest, CreateWorkspaceResponse, ApiResponse } from '@/lib/types/workspace';

// GET /api/workspaces - List workspaces for current user
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const appUuid = await getCurrentAppUuid();

    if (!appUuid) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'App context not found' },
        { status: 500 }
      );
    }

    // Get current user's stakeholder ID
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: stakeholder, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select('id, name, reference')
      .eq('auth_user_id', user.id)
      .single();

    if (stakeholderError || !stakeholder) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Stakeholder not found' },
        { status: 404 }
      );
    }

    // Get workspaces (owned + collaborator access)
    // This query leverages RLS policies for security
    const { data: workspaces, error } = await supabase
      .from('workspaces')
      .select(`
        *,
        owner:stakeholders!owner_stakeholder_id(id, name, email, reference),
        workspace_access_control!inner(
          id,
          access_role,
          permissions,
          invitation_status,
          accepted_at
        )
      `)
      .eq('app_uuid', appUuid)
      .eq('workspace_access_control.stakeholder_id', stakeholder.id)
      .eq('workspace_access_control.invitation_status', 'accepted')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workspaces:', error);
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      );
    }

    // Transform data to include user's role
    const workspacesWithRole = workspaces?.map((workspace: any) => ({
      ...workspace,
      current_user_access: workspace.workspace_access_control?.[0] || null,
    }));

    return NextResponse.json<ApiResponse<typeof workspacesWithRole>>({
      data: workspacesWithRole || [],
    });

  } catch (error: any) {
    console.error('Unexpected error in GET /api/workspaces:', error);
    return NextResponse.json<ApiResponse<null>>(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/workspaces - Create new workspace
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const appUuid = await getCurrentAppUuid();

    if (!appUuid) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'App context not found' },
        { status: 500 }
      );
    }

    // Get current user's stakeholder ID
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: CreateWorkspaceRequest = await req.json();

    // Validate required fields
    const { name, primary_role_code, template_id, description, owner_stakeholder_id } = body;
    if (!name || !primary_role_code) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Missing required fields: name, primary_role_code' },
        { status: 400 }
      );
    }

    // Determine owner stakeholder ID
    // If provided in request (admin creating for another user), use that
    // Otherwise, use current user's stakeholder ID
    let ownerStakeholderId = owner_stakeholder_id || null;

    if (!ownerStakeholderId) {
      // If no owner specified, use current user's stakeholder ID
      const { data: stakeholder, error: stakeholderError } = await supabase
        .from('stakeholders')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (stakeholderError || !stakeholder) {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Stakeholder not found' },
          { status: 404 }
        );
      }

      ownerStakeholderId = stakeholder.id;
    }

    // Validate name length
    if (name.length < 3 || name.length > 100) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Workspace name must be between 3 and 100 characters' },
        { status: 400 }
      );
    }

    // Call provision_workspace RPC function
    const { data, error } = await supabase.rpc('provision_workspace', {
      p_workspace_name: name,
      p_owner_stakeholder_id: ownerStakeholderId,
      p_app_uuid: appUuid,
      p_primary_role_code: primary_role_code,
      p_template_id: template_id || null,
      p_description: description || null,
    });

    if (error) {
      console.error('Error calling provision_workspace:', error);
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      );
    }

    // Check if RPC function returned success
    if (!data || !data.success) {
      return NextResponse.json<ApiResponse<null>>(
        { error: data?.message || 'Failed to provision workspace' },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse<CreateWorkspaceResponse>>(
      { data: data as CreateWorkspaceResponse },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Unexpected error in POST /api/workspaces:', error);
    return NextResponse.json<ApiResponse<null>>(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
