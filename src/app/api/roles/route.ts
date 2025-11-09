import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getAppUuid } from '@/lib/server/getAppUuid';

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

    // Get app_uuid for multi-tenancy filtering
    const appUuid = await getAppUuid(accessToken);

    // Check if we should filter by active status
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active_only') === 'true';

    let query = supabase
      .from('roles')
      .select('*')
      .eq('app_uuid', appUuid); // SECURITY: Filter by app_uuid

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

    // Get app_uuid for multi-tenancy filtering
    const appUuid = await getAppUuid(accessToken);

    const body = await req.json();

    // Ensure app_uuid is set in the role data
    const roleData = {
      ...body,
      app_uuid: appUuid, // Always set app_uuid for new roles
    };

    const { data, error } = await supabase
      .from('roles')
      .insert([roleData])
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


