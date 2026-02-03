import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// Helper to get access token from request
function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

async function getStakeholderServer(id: string, accessToken?: string) {
  const supabase = await createServerClient(accessToken);
  const { data, error } = await supabase
    .from('stakeholders')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error('Error getting stakeholder:', error);
    throw error;
  }
  return data;
}

async function updateStakeholderServer(id: string, payload: Record<string, any>, accessToken?: string) {
  const supabase = await createServerClient(accessToken);
  const { data, error } = await supabase
    .from('stakeholders')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('Error updating stakeholder:', error);
    throw error;
  }
  return data;
}

async function deleteStakeholderServer(id: string, accessToken?: string) {
  const supabase = await createServerClient(accessToken);
  const { error } = await supabase
    .from('stakeholders')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Error deleting stakeholder:', error);
    throw error;
  }
  return true;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const accessToken = getAccessToken(req);
    if (id === 'me') {
      const supabase = await createServerClient(accessToken);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const { data: contextData, error: contextError } = await supabase.rpc('current_stakeholder_context');
      if (contextError || !contextData || contextData.length === 0) {
        return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
      }
      return NextResponse.json({ stakeholder: contextData[0] });
    }
    const stakeholder = await getStakeholderServer(id, accessToken);
    return NextResponse.json(stakeholder);
  } catch (e: any) {
    console.error('API error in GET /api/stakeholders/[id]:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const accessToken = getAccessToken(req);
    const body = await req.json();
    const updated = await updateStakeholderServer(id, body, accessToken);
    return NextResponse.json(updated);
  } catch (e: any) {
    console.error('API error in PATCH /api/stakeholders/[id]:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const accessToken = getAccessToken(req);
    await deleteStakeholderServer(id, accessToken);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('API error in DELETE /api/stakeholders/[id]:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
