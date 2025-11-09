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

// Get roles available for a specific stakeholder type
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);

    const { data, error } = await supabase
      .from('stakeholder_type_roles')
      .select(`
        role:role_id(id, code, label, description),
        is_default
      `)
      .eq('stakeholder_type_id', id)
      .order('is_default', { ascending: false });
    
    if (error) {
      console.error('Error fetching roles for stakeholder type:', error);
      throw error;
    }
    
    // Transform the data to flatten the role object
    const roles = (data || []).map((item: any) => ({
      id: item.role.id,
      code: item.role.code,
      label: item.role.label,
      description: item.role.description,
      is_default: item.is_default,
    }));
    
    return NextResponse.json(roles);
  } catch (e: any) {
    console.error('API error in GET /api/stakeholder-types/[id]/roles:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}






