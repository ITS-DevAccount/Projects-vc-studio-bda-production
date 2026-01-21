import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

// POST: Confirm artefact (mark as CONFIRMED)
export async function POST(req: NextRequest, { params }: { params: Promise<{ vcModelId: string; flmId: string; artefactId: string }> }) {
  try {
    const { artefactId } = await params;
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update artefact status to CONFIRMED (RLS will enforce access control)
    const { data: artefact, error } = await supabase
      .from('flm_artefacts')
      .update({
        status: 'CONFIRMED',
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', artefactId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Artefact not found' }, { status: 404 });
      }
      console.error('Error confirming artefact:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(artefact);
  } catch (e: any) {
    console.error('API error in POST /api/vc-models/[vcModelId]/flm/[flmId]/artefacts/[artefactId]/confirm:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
