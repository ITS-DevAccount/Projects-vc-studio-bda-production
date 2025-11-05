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

// Server-side versions of stakeholder functions that use authenticated client
async function listStakeholdersServer(params: {
  q?: string;
  type?: string;
  status?: string;
  verified?: 'true' | 'false';
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}, accessToken?: string) {
  const supabase = await createServerClient(accessToken);
  const {
    q,
    type,
    status,
    verified,
    sort = 'created_at',
    order = 'desc',
    page = 1,
    pageSize = 50,
  } = params;

  let query = supabase
    .from('stakeholders')
    .select('id, reference, name, stakeholder_type_id, email, status, is_verified, created_at', { count: 'exact' });

  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
  if (type) query = query.eq('stakeholder_type_id', type);
  if (status) query = query.eq('status', status);
  if (verified === 'true' || verified === 'false') query = query.eq('is_verified', verified === 'true');

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.order(sort, { ascending: order === 'asc' }).range(from, to);
  if (error) {
    console.error('Error listing stakeholders:', error);
    throw error;
  }
  return { data: data || [], count: count || 0 };
}

async function createStakeholderServer(payload: Record<string, any>, accessToken?: string) {
  const supabase = await createServerClient(accessToken);
  
  // Debug: Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log('Auth check:', { 
    hasUser: !!user, 
    userId: user?.id, 
    authError: authError?.message 
  });
  
  // Debug: Check if user exists in users table
  if (user) {
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('auth_user_id', user.id)
      .single();
    console.log('User record check:', { 
      hasRecord: !!userRecord, 
      role: userRecord?.role,
      userError: userError?.message 
    });
  }
  
  const { data, error } = await supabase
    .from('stakeholders')
    .insert([payload])
    .select()
    .single();
  if (error) {
    console.error('Error creating stakeholder:', error);
    console.error('Payload:', payload);
    throw error;
  }
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || undefined;
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const verified = (searchParams.get('verified') as 'true' | 'false') || undefined;
    const sort = searchParams.get('sort') || undefined;
    const order = (searchParams.get('order') as 'asc' | 'desc') || undefined;
    const page = Number(searchParams.get('page') || '1');
    const pageSize = Number(searchParams.get('pageSize') || '50');

    // Stakeholders work across apps, no app_uuid filter needed
    const result = await listStakeholdersServer({
      q, type, status, verified, sort, order, page, pageSize
    }, accessToken);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error('API error in GET /api/stakeholders:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);
    // Stakeholders work across apps, no app_uuid needed
    const body = await req.json();
    const created = await createStakeholderServer(body, accessToken);
    return NextResponse.json(created);
  } catch (e: any) {
    console.error('API error in POST /api/stakeholders:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}


