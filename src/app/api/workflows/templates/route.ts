import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getAppUuid } from '@/lib/server/getAppUuid';

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

// GET /api/workflows/templates - List all templates for the app
export async function GET(request: NextRequest) {
  try {
    const accessToken = getAccessToken(request);
    const supabase = await createServerClient(accessToken);

    // Get app_uuid for multi-tenancy filtering
    const appUuid = await getAppUuid(accessToken);

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch templates with activity count
    const { data: templates, error: templatesError } = await supabase
      .from('workflow_templates')
      .select(`
        id,
        template_code,
        workflow_type,
        name,
        description,
        maturity_gate,
        is_active,
        created_at,
        updated_at,
        activity_templates (count)
      `)
      .eq('app_uuid', appUuid)
      .order('created_at', { ascending: false });

    if (templatesError) {
      console.error('Error fetching templates:', templatesError);
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    // Transform the response to include activity_count
    const templatesWithCount = templates?.map((template: any) => ({
      id: template.id,
      template_code: template.template_code,
      workflow_type: template.workflow_type,
      name: template.name,
      description: template.description,
      maturity_gate: template.maturity_gate,
      is_active: template.is_active,
      created_at: template.created_at,
      updated_at: template.updated_at,
      activity_count: template.activity_templates?.[0]?.count || 0,
    })) || [];

    return NextResponse.json(templatesWithCount);

  } catch (error) {
    console.error('Error in GET /api/workflows/templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/workflows/templates - Create new template
export async function POST(request: NextRequest) {
  try {
    const accessToken = getAccessToken(request);
    const supabase = await createServerClient(accessToken);

    // Get app_uuid for multi-tenancy filtering
    const appUuid = await getAppUuid(accessToken);

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.template_code || !body.workflow_type || !body.name) {
      return NextResponse.json(
        { error: 'template_code, workflow_type, and name are required' },
        { status: 400 }
      );
    }

    // Create template
    const { data: template, error: createError } = await supabase
      .from('workflow_templates')
      .insert({
        template_code: body.template_code,
        workflow_type: body.workflow_type,
        name: body.name,
        description: body.description || null,
        maturity_gate: body.maturity_gate || 'FLM',
        is_active: true,
        app_uuid: appUuid,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating template:', createError);

      // Check for unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'A template with this code already exists' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      );
    }

    // If activities provided, create them
    if (body.activities && Array.isArray(body.activities) && body.activities.length > 0) {
      const activitiesToInsert = body.activities.map((activity: any, index: number) => ({
        workflow_template_id: template.id,
        activity_code: activity.activity_code,
        activity_name: activity.activity_name,
        owner: activity.owner || 'admin',
        sequence_order: activity.sequence_order ?? index,
        prerequisite_activity_codes: activity.prerequisite_activity_codes || null,
        estimated_days: activity.estimated_days || null,
      }));

      const { error: activitiesError } = await supabase
        .from('activity_templates')
        .insert(activitiesToInsert);

      if (activitiesError) {
        console.error('Error creating activities:', activitiesError);
        // Don't fail the whole request if activities fail
        // The template was created successfully
      }
    }

    return NextResponse.json(template, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/workflows/templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
