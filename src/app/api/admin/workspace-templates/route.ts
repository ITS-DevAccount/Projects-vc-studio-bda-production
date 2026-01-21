// Admin API for managing workspace templates
// Simplifies creation by handling all configurations in one request

import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';

// GET - List all workspace templates for admin management
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const appUuid = await getCurrentAppUuid();

    if (!appUuid) {
      return NextResponse.json({ error: 'App context not found' }, { status: 500 });
    }

    // Verify admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all templates with their configurations
    const { data: templates, error } = await supabase
      .from('workspace_templates')
      .select(`
        *,
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
          structure_definition,
          usage_count
        ),
        business_services_config:workspace_business_services_configurations(
          id,
          config_name,
          description,
          services_config,
          version
        )
      `)
      .eq('app_uuid', appUuid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: templates || [] });

  } catch (error: any) {
    console.error('Error in GET /api/admin/workspace-templates:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a complete workspace template with all configurations
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const appUuid = await getCurrentAppUuid();

    if (!appUuid) {
      return NextResponse.json({ error: 'App context not found' }, { status: 500 });
    }

    // Verify admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get stakeholder
    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!stakeholder) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      template_code,
      template_name,
      description,
      role_code,
      category,
      icon_name,
      is_featured,
      dashboard_config,
      file_structure,
      business_services_config,
    } = body;

    // Validate required fields
    if (!template_code || !template_name || !role_code) {
      return NextResponse.json(
        { error: 'Missing required fields: template_code, template_name, role_code' },
        { status: 400 }
      );
    }

    // Validate template_code format
    if (!/^[A-Z0-9_]+$/.test(template_code)) {
      return NextResponse.json(
        { error: 'Template code must contain only uppercase letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    // Check for duplicate template_code
    const { data: existing } = await supabase
      .from('workspace_templates')
      .select('id')
      .eq('template_code', template_code)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Template code already exists' }, { status: 409 });
    }

    let dashboardConfigId = null;
    let fileStructureId = null;
    let businessServicesId = null;

    // Create dashboard configuration if provided
    if (dashboard_config) {
      const { data: dashConfig, error: dashError } = await supabase
        .from('workspace_dashboard_configurations')
        .insert({
          config_name: `${template_name} Dashboard`,
          description: `Dashboard configuration for ${template_name}`,
          dashboard_config: dashboard_config,
          app_uuid: appUuid,
          created_by: stakeholder.id,
          is_default: false,
          version: '1.0',
          is_active: true,
        })
        .select()
        .single();

      if (dashError) {
        console.error('Error creating dashboard config:', dashError);
        return NextResponse.json(
          { error: 'Failed to create dashboard configuration' },
          { status: 500 }
        );
      }

      dashboardConfigId = dashConfig.id;
    }

    // Create file structure template if provided
    if (file_structure) {
      const { data: fileStruct, error: fileError } = await supabase
        .from('workspace_file_structure_templates')
        .insert({
          template_name: `${template_name} Files`,
          description: `File structure for ${template_name}`,
          structure_definition: file_structure,
          app_uuid: appUuid,
          applicable_roles: [role_code],
          usage_count: 0,
          is_default: false,
          is_active: true,
        })
        .select()
        .single();

      if (fileError) {
        console.error('Error creating file structure:', fileError);
        return NextResponse.json(
          { error: 'Failed to create file structure template' },
          { status: 500 }
        );
      }

      fileStructureId = fileStruct.id;
    }

    // Create business services configuration if provided
    if (business_services_config) {
      const { data: bizServices, error: bizError } = await supabase
        .from('workspace_business_services_configurations')
        .insert({
          config_name: `${template_name} Services`,
          description: `Business services for ${template_name}`,
          services_config: business_services_config,
          app_uuid: appUuid,
          created_by: stakeholder.id,
          is_active: true,
          version: '1.0',
        })
        .select()
        .single();

      if (bizError) {
        console.error('Error creating business services config:', bizError);
        return NextResponse.json(
          { error: 'Failed to create business services configuration' },
          { status: 500 }
        );
      }

      businessServicesId = bizServices.id;
    }

    // Create the workspace template
    const { data: template, error: templateError } = await supabase
      .from('workspace_templates')
      .insert({
        template_code,
        template_name,
        description: description || null,
        dashboard_config_id: dashboardConfigId,
        file_structure_template_id: fileStructureId,
        business_services_config_id: businessServicesId,
        app_uuid: appUuid,
        applicable_roles: [role_code],
        category: category || 'Custom',
        icon_name: icon_name || 'folder',
        is_featured: is_featured || false,
        is_system_template: false,
        is_active: true,
        usage_count: 0,
        created_by: stakeholder.id,
      })
      .select()
      .single();

    if (templateError) {
      console.error('Error creating template:', templateError);
      return NextResponse.json(
        { error: 'Failed to create workspace template' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: template, message: 'Template created successfully' },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Error in POST /api/admin/workspace-templates:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
