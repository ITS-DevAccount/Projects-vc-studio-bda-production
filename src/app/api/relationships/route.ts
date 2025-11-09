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

async function listRelationshipsServer(params: any, accessToken?: string) {
  const supabase = await createServerClient(accessToken);
  const {
    stakeholderId,
    direction = 'both',
    type,
    status,
    sort = 'created_at',
    order = 'desc',
    page = 1,
    pageSize = 50,
  } = params;

  let query = supabase
    .from('relationships')
    .select(`
      id,
      reference,
      from_stakeholder_id,
      to_stakeholder_id,
      relationship_type_id,
      strength,
      duration_months,
      status,
      start_date,
      end_date,
      last_interaction,
      interaction_count,
      created_at,
      from_stakeholder:from_stakeholder_id(name),
      to_stakeholder:to_stakeholder_id(name),
      relationship_type:relationship_type_id(label, code)
    `, { count: 'exact' });

  if (stakeholderId) {
    if (direction === 'from') {
      query = query.eq('from_stakeholder_id', stakeholderId);
    } else if (direction === 'to') {
      query = query.eq('to_stakeholder_id', stakeholderId);
    } else {
      query = query.or(`from_stakeholder_id.eq.${stakeholderId},to_stakeholder_id.eq.${stakeholderId}`);
    }
  }

  if (type) query = query.eq('relationship_type_id', type);
  if (status) query = query.eq('status', status);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.order(sort, { ascending: order === 'asc' }).range(from, to);
  if (error) {
    console.error('Error listing relationships:', error);
    throw error;
  }
  return { data: data || [], count: count || 0 };
}

async function createRelationshipServer(payload: Record<string, any>, accessToken?: string) {
  const supabase = await createServerClient(accessToken);
  const { data, error } = await supabase
    .from('relationships')
    .insert([payload])
    .select()
    .single();
  if (error) {
    console.error('Error creating relationship:', error);
    throw error;
  }
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);
    const { searchParams } = new URL(req.url);
    
    const stakeholderId = searchParams.get('stakeholderId') || undefined;
    const direction = searchParams.get('direction') || 'both';
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const sort = searchParams.get('sort') || 'created_at';
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    const result = await listRelationshipsServer(
      { stakeholderId, direction, type, status, sort, order, page, pageSize },
      accessToken
    );
    return NextResponse.json(result);
  } catch (e: any) {
    console.error('API error in GET /api/relationships:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);
    const body = await req.json();
    const created = await createRelationshipServer(body, accessToken);
    return NextResponse.json(created);
  } catch (e: any) {
    console.error('API error in POST /api/relationships:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}






