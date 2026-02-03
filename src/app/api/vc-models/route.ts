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

// GET: List VC Models for current stakeholder
export async function GET(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appUuid = await getAppUuid(accessToken);

    // Get VC Models available to the current user (RLS will enforce access control)
    const { data: vcModels, error } = await supabase
      .from('vc_models')
      .select(`
        id,
        model_code,
        model_name,
        description,
        status,
        version_number,
        is_current_version,
        stakeholder_id,
        created_at,
        updated_at,
        flm:flm_models(
          id,
          status,
          current_step
        )
      `)
      .eq('app_uuid', appUuid)
      .eq('is_current_version', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing VC Models:', error);
      return NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 });
    }

    return NextResponse.json<ApiResponse<VCModel[]>>({ data: vcModels || [] });
  } catch (e: any) {
    console.error('API error in GET /api/vc-models:', e);
    return NextResponse.json<ApiResponse<null>>({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: Create new VC Model
export async function POST(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get stakeholder ID
    const { data: stakeholder, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (stakeholderError || !stakeholder) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Stakeholder not found' }, { status: 404 });
    }

    // Get request body
    const body = await req.json();
    const { model_name, description } = body;

    if (!model_name) {
      return NextResponse.json<ApiResponse<null>>({ error: 'model_name is required' }, { status: 400 });
    }

    // Get app_uuid
    const appUuid = await getAppUuid(accessToken);

    // Use database function to create VC Model
    const { data: result, error } = await supabase.rpc('create_vc_model', {
      p_stakeholder_id: stakeholder.id,
      p_model_name: model_name,
      p_description: description || null,
      p_app_uuid: appUuid
    });

    if (error) {
      console.error('Error creating VC Model:', error);
      return NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 });
    }

    const createdId = typeof result === 'string' ? result : (result as any)?.id || result;
    if (!createdId) {
      return NextResponse.json<ApiResponse<null>>({ error: 'VC Model creation failed' }, { status: 500 });
    }

    // Fetch the created VC Model
    const { data: vcModel, error: fetchError } = await supabase
      .from('vc_models')
      .select('*')
      .eq('id', createdId)
      .single();

    if (fetchError) {
      console.error('Error fetching created VC Model:', fetchError);
      return NextResponse.json<ApiResponse<null>>({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json<ApiResponse<VCModel>>({ data: vcModel }, { status: 201 });
  } catch (e: any) {
    console.error('API error in POST /api/vc-models:', e);
    return NextResponse.json<ApiResponse<null>>({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
