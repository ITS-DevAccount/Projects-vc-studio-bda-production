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

// Get all roles (optionally filter by active status)
export async function GET(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);

    // Check if we should filter by active status
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active_only') === 'true';

    let query = supabase
      .from('roles')
      .select('*');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    query = query.order('label');

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching roles:', error);
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (e: any) {
    console.error('API error in GET /api/roles:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);
    const body = await req.json();

    const { data, error } = await supabase
      .from('roles')
      .insert([body])
      .select()
      .single();

    if (error) {
      console.error('Error creating role:', error);
      throw error;
    }

    return NextResponse.json(data);
  } catch (e: any) {
    console.error('API error in POST /api/roles:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}


