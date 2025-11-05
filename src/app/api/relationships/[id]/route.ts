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

async function getRelationshipServer(id: string, accessToken?: string) {
  const supabase = await createServerClient(accessToken);
  const { data, error } = await supabase
    .from('relationships')
    .select(`
      *,
      from_stakeholder:from_stakeholder_id(id, name, reference),
      to_stakeholder:to_stakeholder_id(id, name, reference),
      relationship_type:relationship_type_id(*)
    `)
    .eq('id', id)
    .single();
  if (error) {
    console.error('Error getting relationship:', error);
    throw error;
  }
  return data;
}

async function updateRelationshipServer(id: string, payload: Record<string, any>, accessToken?: string) {
  const supabase = await createServerClient(accessToken);
  const { data, error } = await supabase
    .from('relationships')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('Error updating relationship:', error);
    throw error;
  }
  return data;
}

async function deleteRelationshipServer(id: string, accessToken?: string) {
  const supabase = await createServerClient(accessToken);
  const { error } = await supabase
    .from('relationships')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Error deleting relationship:', error);
    throw error;
  }
  return true;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const accessToken = getAccessToken(req);
    const item = await getRelationshipServer(params.id, accessToken);
    return NextResponse.json(item);
  } catch (e: any) {
    console.error('API error in GET /api/relationships/[id]:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 404 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const accessToken = getAccessToken(req);
    const body = await req.json();
    const updated = await updateRelationshipServer(params.id, body, accessToken);
    return NextResponse.json(updated);
  } catch (e: any) {
    console.error('API error in PATCH /api/relationships/[id]:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const accessToken = getAccessToken(req);
    await deleteRelationshipServer(params.id, accessToken);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('API error in DELETE /api/relationships/[id]:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 400 });
  }
}

