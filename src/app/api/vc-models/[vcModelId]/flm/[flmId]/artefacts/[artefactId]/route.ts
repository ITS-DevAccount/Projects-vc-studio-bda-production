import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { ApiResponse, FLMArtefact } from '@/lib/types/vc-model';

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

// GET: Get artefact by ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ vcModelId: string; flmId: string; artefactId: string }> }) {
  try {
    const { artefactId } = await params;
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get artefact (RLS will enforce access control)
    const { data: artefact, error } = await supabase
      .from('flm_artefacts')
      .select('*')
      .eq('id', artefactId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>({ error: 'Artefact not found' }, { status: 404 });
      }
      console.error('Error fetching artefact:', error);
      return NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 });
    }

    return NextResponse.json<ApiResponse<FLMArtefact>>({ data: artefact });
  } catch (e: any) {
    console.error('API error in GET /api/vc-models/[vcModelId]/flm/[flmId]/artefacts/[artefactId]:', e);
    return NextResponse.json<ApiResponse<null>>({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT: Update artefact
export async function PUT(req: NextRequest, { params }: { params: Promise<{ vcModelId: string; flmId: string; artefactId: string }> }) {
  try {
    const { artefactId } = await params;
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await req.json();
    const { artefact_json, status } = body;

    // Build update object
    const updates: any = {};
    if (artefact_json !== undefined) updates.artefact_json = artefact_json;
    if (status !== undefined) updates.status = status;
    updates.updated_at = new Date().toISOString();

    // Update artefact (RLS will enforce access control)
    const { data: artefact, error } = await supabase
      .from('flm_artefacts')
      .update(updates)
      .eq('id', artefactId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>({ error: 'Artefact not found' }, { status: 404 });
      }
      console.error('Error updating artefact:', error);
      return NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 });
    }

    return NextResponse.json<ApiResponse<FLMArtefact>>({ data: artefact });
  } catch (e: any) {
    console.error('API error in PUT /api/vc-models/[vcModelId]/flm/[flmId]/artefacts/[artefactId]:', e);
    return NextResponse.json<ApiResponse<null>>({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
