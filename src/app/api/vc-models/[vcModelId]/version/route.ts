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

// POST: Create new version of VC Model
export async function POST(req: NextRequest, { params }: { params: Promise<{ vcModelId: string }> }) {
  try {
    const { vcModelId } = await params;
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { description } = body as { description?: string };

    const { data: newId, error } = await supabase.rpc('create_vc_model_version', {
      p_parent_vc_model_id: vcModelId,
      p_description: description || null,
    });

    if (error) {
      console.error('Error creating VC Model version:', error);
      return NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 });
    }

    const appUuid = await getAppUuid(accessToken);
    const { data: vcModel, error: fetchError } = await supabase
      .from('vc_models')
      .select('*')
      .eq('id', newId)
      .eq('app_uuid', appUuid)
      .single();

    if (fetchError) {
      console.error('Error fetching new VC Model version:', fetchError);
      return NextResponse.json<ApiResponse<null>>({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json<ApiResponse<VCModel>>({ data: vcModel }, { status: 201 });
  } catch (e: any) {
    console.error('API error in POST /api/vc-models/[vcModelId]/version:', e);
    return NextResponse.json<ApiResponse<null>>({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
