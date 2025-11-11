import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import { getAppUuid } from '@/lib/server/getAppUuid';

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
    const { id } = await params;

    // Verify user is authenticated
    const supabase = await createServerClient(accessToken);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get app_uuid for multi-tenancy filtering
    const appUuid = await getAppUuid(accessToken);

    // Use service role client to bypass RLS for admin operations
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await adminClient
      .from('relationship_types')
      .select('*')
      .eq('id', id)
      .eq('app_uuid', appUuid) // SECURITY: Validate belongs to current app
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
    const { id } = await params;

    // Verify user is authenticated
    const supabase = await createServerClient(accessToken);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get app_uuid for multi-tenancy filtering
    const appUuid = await getAppUuid(accessToken);

    const body = await req.json();

    // Use service role client to bypass RLS for admin operations
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await adminClient
      .from('relationship_types')
      .update(body)
      .eq('id', id)
      .eq('app_uuid', appUuid) // SECURITY: Only update in current app
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
    const { id } = await params;

    // Verify user is authenticated
    const supabase = await createServerClient(accessToken);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get app_uuid for multi-tenancy filtering
    const appUuid = await getAppUuid(accessToken);

    // Use service role client to bypass RLS for admin operations
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { error } = await adminClient
      .from('relationship_types')
      .delete()
      .eq('id', id)
      .eq('app_uuid', appUuid); // SECURITY: Only delete in current app

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
