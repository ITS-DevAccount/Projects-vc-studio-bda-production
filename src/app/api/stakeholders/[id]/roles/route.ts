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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);

    // Get app_uuid for multi-tenancy filtering
    const appUuid = await getAppUuid(accessToken);

    // Query stakeholder_roles with role details (Phase 1b specification - using role_id)
    // First get stakeholder_roles records
    const { data: stakeholderRoles, error: rolesError } = await supabase
      .from('stakeholder_roles')
      .select('id, role_id, assigned_at, app_uuid')
      .eq('stakeholder_id', id)
      .eq('app_uuid', appUuid); // SECURITY: Only get roles for current app

    if (rolesError) {
      console.error('Error fetching stakeholder roles:', rolesError);
      throw rolesError;
    }

    // Then fetch role details for each role_id
    const roleIds = (stakeholderRoles || []).map((sr: any) => sr.role_id).filter(Boolean);
    let rolesData: any[] = [];
    
    if (roleIds.length > 0) {
      const { data: roles, error: rolesLookupError } = await supabase
        .from('roles')
        .select('id, code, label, description')
        .in('id', roleIds)
        .eq('app_uuid', appUuid);

      if (rolesLookupError) {
        console.error('Error fetching role details:', rolesLookupError);
        throw rolesLookupError;
      }

      rolesData = roles || [];
    }

    // Combine stakeholder_roles with role details
    const roles = (stakeholderRoles || []).map((sr: any) => {
      const role = rolesData.find((r: any) => r.id === sr.role_id);
      return {
        id: sr.id,
        role_id: sr.role_id,
        role: role ? {
          id: role.id,
          code: role.code,
          label: role.label,
          description: role.description,
        } : null,
        assigned_at: sr.assigned_at,
        app_uuid: sr.app_uuid,
      };
    });

    return NextResponse.json(roles);
  } catch (e: any) {
    console.error('API error in GET /api/stakeholders/[id]/roles:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}

