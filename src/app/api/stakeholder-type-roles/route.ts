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

// Get all stakeholder type role mappings
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

    // Use service role client to bypass RLS
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

    // Get stakeholder type role mappings with details
    const { data, error } = await adminClient
      .from('stakeholder_type_roles')
      .select(`
        id,
        stakeholder_type_id,
        role_id,
        is_default,
        created_at,
        stakeholder_type:stakeholder_types(id, code, label),
        role:roles!stakeholder_type_roles_role_id_fkey(id, code, label, scope, app_uuid)
      `)
      .order('stakeholder_type_id');

    if (error) {
      console.error('Error fetching stakeholder type roles:', error);
      throw error;
    }

    // Filter by app_uuid on the role
    const filtered = (data || []).filter((item: any) =>
      item.role?.app_uuid === appUuid
    );

    return NextResponse.json(filtered);
  } catch (e: any) {
    console.error('API error in GET /api/stakeholder-type-roles:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}

// Create a new stakeholder type role mapping
export async function POST(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);

    // Verify user is authenticated
    const supabase = await createServerClient(accessToken);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { stakeholder_type_id, role_id, is_default } = body;

    if (!stakeholder_type_id || !role_id) {
      return NextResponse.json(
        { error: 'stakeholder_type_id and role_id are required' },
        { status: 400 }
      );
    }

    // Use service role client to bypass RLS
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
      .from('stakeholder_type_roles')
      .insert([{
        stakeholder_type_id,
        role_id,
        is_default: is_default || false,
      }])
      .select(`
        id,
        stakeholder_type_id,
        role_id,
        is_default,
        created_at,
        stakeholder_type:stakeholder_types(id, code, label),
        role:roles!stakeholder_type_roles_role_id_fkey(id, code, label)
      `)
      .single();

    if (error) {
      console.error('Error creating stakeholder type role:', error);

      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This role is already assigned to this stakeholder type' },
          { status: 409 }
        );
      }

      throw error;
    }

    return NextResponse.json(data);
  } catch (e: any) {
    console.error('API error in POST /api/stakeholder-type-roles:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
