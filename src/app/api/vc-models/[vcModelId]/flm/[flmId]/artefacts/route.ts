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

// GET: Get artefacts for FLM Model
export async function GET(req: NextRequest, { params }: { params: Promise<{ vcModelId: string; flmId: string }> }) {
  try {
    const { flmId } = await params;
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get artefacts for this FLM Model (RLS will enforce access control)
    const { data: artefacts, error } = await supabase
      .from('flm_artefacts')
      .select('*')
      .eq('flm_model_id', flmId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching FLM artefacts:', error);
      return NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 });
    }

    return NextResponse.json<ApiResponse<FLMArtefact[]>>({ data: artefacts || [] });
  } catch (e: any) {
    console.error('API error in GET /api/vc-models/[vcModelId]/flm/[flmId]/artefacts:', e);
    return NextResponse.json<ApiResponse<null>>({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
