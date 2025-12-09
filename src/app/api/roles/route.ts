import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

    // Verify user is authenticated
    const supabase = await createServerClient(accessToken);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get app_uuid for multi-tenancy filtering
    const appUuid = await getAppUuid(accessToken);
    console.log('[ROLES API DEBUG] app_uuid from getAppUuid:', appUuid);

    // Check if we should filter by active status
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active_only') === 'true';

    // Try to use service role client to bypass RLS for admin operations
    // Fall back to authenticated client if service role key is not available
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    let queryClient: any;

    if (serviceRoleKey && supabaseUrl) {
      // Use service role client if available
      queryClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } else {
      // Fall back to authenticated client
      // Note: This requires proper RLS policies to allow access
      // To get the service role key: Supabase Dashboard → Settings → API → service_role key
      console.warn('SUPABASE_SERVICE_ROLE_KEY not found in environment variables. Using authenticated client. Ensure RLS policies allow access to roles table.');
      queryClient = supabase;
    }

    // Build query to fetch ALL roles
    // For admin roles page, we want to show all roles regardless of app_uuid
    // Note: This is appropriate for admin interfaces where full visibility is needed
    let query = queryClient
      .from('roles')
      .select('id, code, label, description, scope, is_active, created_at, app_uuid, specific_stakeholder_id')
      .order('label', { ascending: true });

    // Optional: Filter by active status if requested
    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    // Note: Removed app_uuid filter to show all roles in admin interface
    // If multi-tenancy filtering is needed, uncomment the line below:
    // query = query.eq('app_uuid', appUuid);

    const { data, error } = await query;

    console.log('[ROLES API DEBUG] Query result - data count:', data?.length ?? 0);
    console.log('[ROLES API DEBUG] Query result - error:', error);
    console.log('[ROLES API DEBUG] Using service role?', serviceRoleKey ? 'YES' : 'NO');
    console.log('[ROLES API DEBUG] Filter - app_uuid:', appUuid, 'activeOnly:', activeOnly);

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

    // Verify user is authenticated
    const supabase = await createServerClient(accessToken);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get app_uuid for multi-tenancy filtering
    const appUuid = await getAppUuid(accessToken);

    const body = await req.json();

    // Ensure app_uuid is set in the role data
    const roleData = {
      ...body,
      app_uuid: appUuid, // Always set app_uuid for new roles
    };

    // Try to use service role client to bypass RLS for admin operations
    // Fall back to authenticated client if service role key is not available
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    let queryClient: any;

    if (serviceRoleKey && supabaseUrl) {
      // Use service role client if available
      queryClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } else {
      // Fall back to authenticated client
      // Note: This requires proper RLS policies to allow access
      // To get the service role key: Supabase Dashboard → Settings → API → service_role key
      console.warn('SUPABASE_SERVICE_ROLE_KEY not found in environment variables. Using authenticated client. Ensure RLS policies allow access to roles table.');
      queryClient = supabase;
    }

    const { data, error } = await queryClient
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


