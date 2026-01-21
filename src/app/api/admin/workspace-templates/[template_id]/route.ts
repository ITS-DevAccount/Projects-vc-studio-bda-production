// Admin API for individual workspace template operations
// GET - Get template details
// PATCH - Update template
// DELETE - Delete template

import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';

// GET - Get template details with all configurations
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ template_id: string }> }
) {
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

    const { template_id } = await params;

    // Get template with all configuration details
    const { data: template, error } = await supabase
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
      .eq('id', template_id)
      .eq('app_uuid', appUuid)
      .single();

    if (error || !template) {
      console.error('Error fetching template:', error);
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ data: template });

  } catch (error: any) {
    console.error('Error in GET template:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update template
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ template_id: string }> }
) {
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

    const { template_id } = await params;
    const body = await req.json();

    const {
      template_name,
      description,
      is_featured,
      is_active,
    } = body;

    // Update template metadata only (not configurations)
    const { data: template, error } = await supabase
      .from('workspace_templates')
      .update({
        template_name: template_name,
        description: description || null,
        is_featured: is_featured || false,
        is_active: is_active !== undefined ? is_active : true,
      })
      .eq('id', template_id)
      .eq('app_uuid', appUuid)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: template,
      message: 'Template updated successfully'
    });

  } catch (error: any) {
    console.error('Error in PATCH template:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete template and its configurations
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ template_id: string }> }
) {
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

    const { template_id } = await params;

    // Check if template is linked to any roles
    const { data: linkedRoles, error: rolesError } = await supabase
      .from('roles')
      .select('id, code, label')
      .eq('workspace_template_id', template_id)
      .eq('app_uuid', appUuid);

    if (rolesError) {
      console.error('Error checking linked roles:', rolesError);
      return NextResponse.json({ error: 'Failed to check template usage' }, { status: 500 });
    }

    if (linkedRoles && linkedRoles.length > 0) {
      return NextResponse.json({
        error: 'Cannot delete template',
        message: `This template is linked to ${linkedRoles.length} role(s): ${linkedRoles.map(r => r.label).join(', ')}. Please unlink it from all roles first.`
      }, { status: 400 });
    }

    // Get template to find linked configurations
    const { data: template } = await supabase
      .from('workspace_templates')
      .select('dashboard_config_id, file_structure_template_id, business_services_config_id')
      .eq('id', template_id)
      .eq('app_uuid', appUuid)
      .single();

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Delete the template (configurations can remain for potential reuse)
    const { error: deleteError } = await supabase
      .from('workspace_templates')
      .delete()
      .eq('id', template_id)
      .eq('app_uuid', appUuid);

    if (deleteError) {
      console.error('Error deleting template:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Template deleted successfully'
    });

  } catch (error: any) {
    console.error('Error in DELETE template:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
