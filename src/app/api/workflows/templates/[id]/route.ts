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

// PATCH /api/workflows/templates/[id] - Update template
export async function PATCH(
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

    const { id } = params;

    // Verify template exists and belongs to this app
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('workflow_templates')
      .select('id, app_uuid')
      .eq('id', id)
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

    // Build update object (only allow specific fields)
    const updateData: any = {};
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.maturity_gate !== undefined) updateData.maturity_gate = body.maturity_gate;
    if (body.workflow_type !== undefined) updateData.workflow_type = body.workflow_type;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update template
    const { data: updatedTemplate, error: updateError } = await supabase
      .from('workflow_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating template:', updateError);
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedTemplate);

  } catch (error) {
    console.error('Error in PATCH /api/workflows/templates/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/workflows/templates/[id] - Delete template
export async function DELETE(
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

    const { id } = params;

    // Verify template exists and belongs to this app
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('workflow_templates')
      .select('id, app_uuid')
      .eq('id', id)
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

    // Delete template (CASCADE will delete activities)
    const { error: deleteError } = await supabase
      .from('workflow_templates')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting template:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in DELETE /api/workflows/templates/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
