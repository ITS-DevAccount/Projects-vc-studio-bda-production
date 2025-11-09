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

async function getRelationshipServer(id: string, appUuid: string, accessToken?: string) {
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
    .eq('app_uuid', appUuid) // SECURITY: Validate belongs to current app
    .single();
  if (error) {
    console.error('Error getting relationship:', error);
    throw error;
  }
  return data;
}

async function updateRelationshipServer(id: string, payload: Record<string, any>, appUuid: string, accessToken?: string) {
  const supabase = await createServerClient(accessToken);
  const { data, error } = await supabase
    .from('relationships')
    .update(payload)
    .eq('id', id)
    .eq('app_uuid', appUuid) // SECURITY: Only update relationships in current app
    .select()
    .single();
  if (error) {
    console.error('Error updating relationship:', error);
    throw error;
  }
  return data;
}

async function deleteRelationshipServer(id: string, appUuid: string, accessToken?: string) {
  const supabase = await createServerClient(accessToken);
  const { error } = await supabase
    .from('relationships')
    .delete()
    .eq('id', id)
    .eq('app_uuid', appUuid); // SECURITY: Only delete relationships in current app
  if (error) {
    console.error('Error deleting relationship:', error);
    throw error;
  }
  return true;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const accessToken = getAccessToken(req);

    // Get app_uuid for multi-tenancy filtering
    const appUuid = await getAppUuid(accessToken);

    const item = await getRelationshipServer(id, appUuid, accessToken);
    return NextResponse.json(item);
  } catch (e: any) {
    console.error('API error in GET /api/relationships/[id]:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 404 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const accessToken = getAccessToken(req);

    // Get app_uuid for multi-tenancy filtering
    const appUuid = await getAppUuid(accessToken);

    const body = await req.json();
    const updated = await updateRelationshipServer(id, body, appUuid, accessToken);
    return NextResponse.json(updated);
  } catch (e: any) {
    console.error('API error in PATCH /api/relationships/[id]:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const accessToken = getAccessToken(req);

    // Get app_uuid for multi-tenancy filtering
    const appUuid = await getAppUuid(accessToken);

    await deleteRelationshipServer(id, appUuid, accessToken);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('API error in DELETE /api/relationships/[id]:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 400 });
  }
}

