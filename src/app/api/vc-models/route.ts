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

    // Get stakeholder ID
    const { data: stakeholder, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (stakeholderError || !stakeholder) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }

    // Get VC Models where user is owner or collaborator (RLS will enforce access control)
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
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing VC Models:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: vcModels || [] });
  } catch (e: any) {
    console.error('API error in GET /api/vc-models:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
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
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }

    // Get request body
    const body = await req.json();
    const { model_name, description } = body;

    if (!model_name) {
      return NextResponse.json({ error: 'model_name is required' }, { status: 400 });
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch the created VC Model
    const { data: vcModel, error: fetchError } = await supabase
      .from('vc_models')
      .select('*')
      .eq('id', result)
      .single();

    if (fetchError) {
      console.error('Error fetching created VC Model:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json(vcModel, { status: 201 });
  } catch (e: any) {
    console.error('API error in POST /api/vc-models:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
