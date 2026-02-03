import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { ApiResponse, FLMModel } from '@/lib/types/vc-model';

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

// GET: Get FLM for VC Model
export async function GET(req: NextRequest, { params }: { params: Promise<{ vcModelId: string }> }) {
  try {
    const { vcModelId } = await params;
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get FLM Model for this VC Model (RLS will enforce access control)
    const { data: flmModel, error } = await supabase
      .from('flm_models')
      .select('*')
      .eq('vc_model_id', vcModelId)
      .order('flm_version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching FLM Model:', error);
      return NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 });
    }

    return NextResponse.json<ApiResponse<FLMModel | null>>({ data: flmModel || null });
  } catch (e: any) {
    console.error('API error in GET /api/vc-models/[vcModelId]/flm:', e);
    return NextResponse.json<ApiResponse<null>>({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: Create FLM for VC Model
export async function POST(req: NextRequest, { params }: { params: Promise<{ vcModelId: string }> }) {
  try {
    const { vcModelId } = await params;
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await req.json();
    const { description } = body;

    // Use database function to create FLM Model
    const { data: flmId, error } = await supabase.rpc('create_flm_model', {
      p_vc_model_id: vcModelId,
      p_description: description || null
    });

    if (error) {
      console.error('Error creating FLM Model:', error);
      return NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 });
    }

    // Fetch the created FLM Model
    const { data: flmModel, error: fetchError } = await supabase
      .from('flm_models')
      .select('*')
      .eq('id', flmId)
      .single();

    if (fetchError) {
      console.error('Error fetching created FLM Model:', fetchError);
      return NextResponse.json<ApiResponse<null>>({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json<ApiResponse<FLMModel>>({ data: flmModel }, { status: 201 });
  } catch (e: any) {
    console.error('API error in POST /api/vc-models/[vcModelId]/flm:', e);
    return NextResponse.json<ApiResponse<null>>({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
