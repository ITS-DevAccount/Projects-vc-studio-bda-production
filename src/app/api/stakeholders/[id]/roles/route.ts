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

    const { data, error } = await supabase
      .from('stakeholder_roles')
      .select('id, role_type, role_id, assigned_at, app_uuid, role:role_id(code, label)')
      .eq('stakeholder_id', id)
      .eq('app_uuid', appUuid); // SECURITY: Only get roles for current app

    if (error) {
      console.error('Error fetching roles:', error);
      throw error;
    }

    const roles = (data || []).map((item: any) => ({
      id: item.id,
      role_type: item.role_type,
      role_id: item.role_id,
      label: item.role?.label || item.role_type,
      assigned_at: item.assigned_at,
      app_uuid: item.app_uuid,
    }));

    return NextResponse.json(roles);
  } catch (e: any) {
    console.error('API error in GET /api/stakeholders/[id]/roles:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}

