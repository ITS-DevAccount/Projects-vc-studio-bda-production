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

// Server-side role assignment functions
async function assignRolesServer(stakeholderId: string, roleTypes: string[], accessToken?: string) {
  if (!roleTypes?.length) return [];
  const supabase = await createServerClient(accessToken);
  const rows = roleTypes.map((role) => ({ 
    stakeholder_id: stakeholderId, 
    role_type: role 
  }));
  const { data, error } = await supabase
    .from('stakeholder_roles')
    .upsert(rows, { onConflict: 'stakeholder_id,role_type' })
    .select();
  if (error) {
    console.error('Error assigning roles:', error);
    throw error;
  }
  return data || [];
}

async function removeRolesServer(stakeholderId: string, roleTypes: string[], accessToken?: string) {
  if (!roleTypes?.length) return true;
  const supabase = await createServerClient(accessToken);
  const { error } = await supabase
    .from('stakeholder_roles')
    .delete()
    .eq('stakeholder_id', stakeholderId)
    .in('role_type', roleTypes);
  if (error) {
    console.error('Error removing roles:', error);
    throw error;
  }
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);
    const { stakeholderId, add = [], remove = [] } = await req.json();
    if (!stakeholderId) return NextResponse.json({ error: 'Missing stakeholderId' }, { status: 400 });

    if (add.length) await assignRolesServer(stakeholderId, add, accessToken);
    if (remove.length) await removeRolesServer(stakeholderId, remove, accessToken);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('API error in POST /api/roles/assign:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}


