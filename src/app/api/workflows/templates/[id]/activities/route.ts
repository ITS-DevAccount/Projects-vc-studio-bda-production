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

// POST /api/workflows/templates/[id]/activities - Add activity to template
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id: templateId } = params;

    // Verify template exists and belongs to this app
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('workflow_templates')
      .select('id, app_uuid')
      .eq('id', templateId)
      .single();

    if (fetchError || !existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    if (existingTemplate.app_uuid !== appUuid) {
      return NextResponse.json(
        { error: 'Template does not belong to this application' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.activity_code || !body.activity_name) {
      return NextResponse.json(
        { error: 'activity_code and activity_name are required' },
        { status: 400 }
      );
    }

    // Create activity
    const { data: activity, error: createError } = await supabase
      .from('activity_templates')
      .insert({
        workflow_template_id: templateId,
        activity_code: body.activity_code,
        activity_name: body.activity_name,
        owner: body.owner || 'admin',
        sequence_order: body.sequence_order || null,
        prerequisite_activity_codes: body.prerequisite_activity_codes || null,
        estimated_days: body.estimated_days || null,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating activity:', createError);

      // Check for unique constraint violation (if activity_code is unique per template)
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'An activity with this code already exists in this template' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create activity' },
        { status: 500 }
      );
    }

    return NextResponse.json(activity, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/workflows/templates/[id]/activities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
