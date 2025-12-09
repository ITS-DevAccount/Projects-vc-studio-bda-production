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

// Update stakeholder roles using role_id (Phase 1b specification)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stakeholderId } = await params;
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get app_uuid for multi-tenancy filtering
    const appUuid = await getAppUuid(accessToken);

    const body = await req.json();
    const { add = [], remove = [] } = body;

    // Add new roles
    if (add.length > 0) {
      // First, fetch role details (code) for each role_id to populate role_type
      const { data: roleDetails, error: roleLookupError } = await supabase
        .from('roles')
        .select('id, code')
        .in('id', add)
        .eq('app_uuid', appUuid);

      if (roleLookupError) {
        console.error('Error fetching role details:', roleLookupError);
        return NextResponse.json(
          { error: 'Failed to fetch role details' },
          { status: 500 }
        );
      }

      // Create a map of role_id -> role_code
      const roleCodeMap = new Map(
        (roleDetails || []).map((r: any) => [r.id, r.code])
      );

      // Build insert records with both role_id and role_type
      const rolesToAdd = add
        .map((roleId: string) => {
          const roleCode = roleCodeMap.get(roleId);
          if (!roleCode) {
            console.warn(`Role code not found for role_id: ${roleId}`);
            return null;
          }
          return {
            stakeholder_id: stakeholderId,
            role_id: roleId,
            role_type: roleCode, // Use role code as role_type
            app_uuid: appUuid,
          };
        })
        .filter((r: any) => r !== null);

      if (rolesToAdd.length === 0) {
        return NextResponse.json(
          { error: 'No valid roles to add' },
          { status: 400 }
        );
      }

      const { error: addError } = await supabase
        .from('stakeholder_roles')
        .insert(rolesToAdd);

      if (addError) {
        console.error('Error adding roles:', addError);
        return NextResponse.json(
          { error: addError.message || 'Failed to add roles' },
          { status: 500 }
        );
      }
    }

    // Remove roles
    if (remove.length > 0) {
      const { error: removeError } = await supabase
        .from('stakeholder_roles')
        .delete()
        .eq('stakeholder_id', stakeholderId)
        .in('role_id', remove)
        .eq('app_uuid', appUuid);

      if (removeError) {
        console.error('Error removing roles:', removeError);
        return NextResponse.json(
          { error: removeError.message || 'Failed to remove roles' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('API error in POST /api/stakeholders/[id]/roles/update:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

