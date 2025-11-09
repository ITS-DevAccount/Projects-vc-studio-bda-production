import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);
    const { id } = await params;

    const { data, error } = await supabase
      .from('relationship_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching relationship type:', error);
      throw error;
    }

    return NextResponse.json(data);
  } catch (e: any) {
    console.error('API error in GET /api/relationship-types/[id]:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);
    const { id } = await params;
    const body = await req.json();

    const { data, error } = await supabase
      .from('relationship_types')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating relationship type:', error);
      throw error;
    }

    return NextResponse.json(data);
  } catch (e: any) {
    console.error('API error in PATCH /api/relationship-types/[id]:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);
    const { id } = await params;

    const { error } = await supabase
      .from('relationship_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting relationship type:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('API error in DELETE /api/relationship-types/[id]:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
