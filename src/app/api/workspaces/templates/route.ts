// API Route: /api/workspaces/templates
// Methods: GET (list templates), POST (create template - admin only)

import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';
import type { WorkspaceTemplate, CreateTemplateRequest, ApiResponse } from '@/lib/types/workspace';

// GET /api/workspaces/templates - List available workspace templates
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const appUuid = await getCurrentAppUuid();

    if (!appUuid) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'App context not found' },
        { status: 500 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const roleCode = searchParams.get('role');
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');

    // Build query
    let query = supabase
      .from('workspace_templates')
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
          description,
          structure_definition,
          usage_count
        ),
        business_services_config:workspace_business_services_configurations(
          id,
          config_name,
          description,
          version
        )
      `)
      .eq('app_uuid', appUuid)
      .eq('is_active', true);

    // Apply filters
    if (roleCode) {
      query = query.contains('applicable_roles', [roleCode]);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }

    // Order by featured first, then usage count
    query = query.order('is_featured', { ascending: false })
                 .order('usage_count', { ascending: false });

    const { data: templates, error } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<WorkspaceTemplate[]>>({
      data: templates || [],
    });

  } catch (error: any) {
    console.error('Unexpected error in GET /api/workspaces/templates:', error);
    return NextResponse.json<ApiResponse<null>>(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/templates - Create new workspace template (admin only)
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

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get stakeholder ID and verify admin role
    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select(`
        id,
        stakeholder_roles!inner(role_type)
      `)
      .eq('auth_user_id', user.id)
      .eq('stakeholder_roles.app_uuid', appUuid)
      .single();

    if (!stakeholder) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Stakeholder not found' },
        { status: 404 }
      );
    }

    // Check if user has administrator role
    const isAdmin = stakeholder.stakeholder_roles?.some(
      (role: any) => role.role_type === 'administrator'
    );

    if (!isAdmin) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Only administrators can create templates' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: CreateTemplateRequest = await req.json();

    // Validate required fields
    const {
      template_code,
      template_name,
      applicable_roles,
      description,
      dashboard_config_id,
      file_structure_template_id,
      business_services_config_id,
      category,
      icon_name,
      preview_image_url,
      is_featured,
    } = body;

    if (!template_code || !template_name || !applicable_roles || applicable_roles.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Missing required fields: template_code, template_name, applicable_roles' },
        { status: 400 }
      );
    }

    // Validate template_code format (uppercase, underscores only)
    if (!/^[A-Z0-9_]+$/.test(template_code)) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Template code must contain only uppercase letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    // Check for duplicate template_code
    const { data: existing } = await supabase
      .from('workspace_templates')
      .select('id')
      .eq('template_code', template_code)
      .single();

    if (existing) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Template code already exists' },
        { status: 409 }
      );
    }

    // Create template
    const { data, error } = await supabase
      .from('workspace_templates')
      .insert({
        template_code,
        template_name,
        description: description || null,
        dashboard_config_id: dashboard_config_id || null,
        file_structure_template_id: file_structure_template_id || null,
        business_services_config_id: business_services_config_id || null,
        app_uuid: appUuid,
        applicable_roles,
        category: category || null,
        icon_name: icon_name || null,
        preview_image_url: preview_image_url || null,
        is_featured: is_featured || false,
        is_system_template: false,
        is_active: true,
        usage_count: 0,
        created_by: stakeholder.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<WorkspaceTemplate>>(
      { data, message: 'Template created successfully' },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Unexpected error in POST /api/workspaces/templates:', error);
    return NextResponse.json<ApiResponse<null>>(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
