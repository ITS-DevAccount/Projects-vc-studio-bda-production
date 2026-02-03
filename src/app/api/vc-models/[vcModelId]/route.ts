import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getAppUuid } from '@/lib/server/getAppUuid';
import type { ApiResponse, VCModel } from '@/lib/types/vc-model';

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

// GET: Get VC Model by ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ vcModelId: string }> }) {
  try {
    const { vcModelId } = await params;
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appUuid = await getAppUuid(accessToken);

    // Get VC Model (RLS will enforce access control)
    const { data: vcModel, error } = await supabase
      .from('vc_models')
      .select(`
        *,
        owner:stakeholders!stakeholder_id(id, name, email),
        flm:flm_models(
          id,
          status,
          current_step,
          flm_version,
          artefacts:flm_artefacts(
            id,
            artefact_type,
            status,
            version,
            created_at
          )
        )
      `)
      .eq('id', vcModelId)
      .eq('app_uuid', appUuid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>({ error: 'VC Model not found' }, { status: 404 });
      }
      console.error('Error fetching VC Model:', error);
      return NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 });
    }

    return NextResponse.json<ApiResponse<VCModel>>({ data: vcModel });
  } catch (e: any) {
    console.error('API error in GET /api/vc-models/[vcModelId]:', e);
    return NextResponse.json<ApiResponse<null>>({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT: Update VC Model
export async function PUT(req: NextRequest, { params }: { params: Promise<{ vcModelId: string }> }) {
  try {
    const { vcModelId } = await params;
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appUuid = await getAppUuid(accessToken);

    // Get request body
    const body = await req.json();
    const { model_name, description, status } = body;

    // Build update object
    const updates: any = {};
    if (model_name !== undefined) updates.model_name = model_name;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    updates.updated_at = new Date().toISOString();

    // Update VC Model (RLS will enforce access control)
    const { data: vcModel, error } = await supabase
      .from('vc_models')
      .update(updates)
      .eq('id', vcModelId)
      .eq('app_uuid', appUuid)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>({ error: 'VC Model not found' }, { status: 404 });
      }
      console.error('Error updating VC Model:', error);
      return NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 });
    }

    return NextResponse.json<ApiResponse<VCModel>>({ data: vcModel });
  } catch (e: any) {
    console.error('API error in PUT /api/vc-models/[vcModelId]:', e);
    return NextResponse.json<ApiResponse<null>>({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete VC Model
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ vcModelId: string }> }) {
  try {
    const { vcModelId } = await params;
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appUuid = await getAppUuid(accessToken);

    // Delete VC Model (RLS will enforce access control, CASCADE will delete related records)
    const { error } = await supabase
      .from('vc_models')
      .delete()
      .eq('id', vcModelId)
      .eq('app_uuid', appUuid);

    if (error) {
      console.error('Error deleting VC Model:', error);
      return NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 });
    }

    return NextResponse.json<ApiResponse<null>>({ message: 'VC Model deleted successfully' });
  } catch (e: any) {
    console.error('API error in DELETE /api/vc-models/[vcModelId]:', e);
    return NextResponse.json<ApiResponse<null>>({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
