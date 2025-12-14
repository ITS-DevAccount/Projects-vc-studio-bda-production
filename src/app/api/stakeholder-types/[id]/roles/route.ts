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

// Get roles available for a specific stakeholder type
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const accessToken = getAccessToken(req);

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

    // Get roles from stakeholder_type_roles table (legacy approach)
    // But we also need to filter by app_uuid and scope
    const { data: stakeholderTypeRoles, error: strError } = await adminClient
      .from('stakeholder_type_roles')
      .select(`
        role:role_id(id, code, label, description, scope, specific_stakeholder_type_id, app_uuid),
        is_default
      `)
      .eq('stakeholder_type_id', id)
      .order('is_default', { ascending: false });

    if (strError) {
      console.error('Error fetching stakeholder type roles:', strError);
      throw strError;
    }

    // Also get all general roles and specific roles for this stakeholder type
    // This ensures we get roles even if they're not in stakeholder_type_roles table
    const { data: allRoles, error: rolesError } = await adminClient
      .from('roles')
      .select('id, code, label, description, scope, specific_stakeholder_type_id, app_uuid')
      .eq('app_uuid', appUuid)
      .eq('is_active', true);

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      throw rolesError;
    }

    // Filter roles by scope and stakeholder type
    // Include: general roles OR specific roles for this stakeholder type
    const filteredRoles = (allRoles || []).filter((role: any) => {
      // Must belong to current app
      if (role.app_uuid !== appUuid) return false;
      
      // Include general roles
      if (role.scope === 'general') return true;
      
      // Include specific roles that match this stakeholder type
      if (role.scope === 'specific' && role.specific_stakeholder_type_id === id) return true;
      
      return false;
    });

    // Merge with stakeholder_type_roles to get is_default flag
    // Create a map of role IDs to is_default from stakeholder_type_roles
    const defaultRoleMap = new Map(
      (stakeholderTypeRoles || [])
        .filter((item: any) => item.role && item.role.app_uuid === appUuid)
        .map((item: any) => [item.role.id, item.is_default])
    );

    // Transform the filtered roles
    const roles = filteredRoles.map((role: any) => ({
      id: role.id,
      code: role.code,
      label: role.label,
      description: role.description,
      is_default: defaultRoleMap.get(role.id) || false,
    }));

    // Sort by is_default (default roles first)
    roles.sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));

    return NextResponse.json(roles);
  } catch (e: any) {
    console.error('API error in GET /api/stakeholder-types/[id]/roles:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}






