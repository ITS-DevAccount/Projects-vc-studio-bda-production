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

export async function GET(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);

    const { data, error } = await supabase
      .from('relationship_types')
      .select('*')
      .order('label');

    if (error) {
      console.error('Error fetching relationship types:', error);
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (e: any) {
    console.error('API error in GET /api/relationship-types:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);
    const body = await req.json();

    const { data, error } = await supabase
      .from('relationship_types')
      .insert([body])
      .select()
      .single();

    if (error) {
      console.error('Error creating relationship type:', error);
      throw error;
    }

    return NextResponse.json(data);
  } catch (e: any) {
    console.error('API error in POST /api/relationship-types:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}






