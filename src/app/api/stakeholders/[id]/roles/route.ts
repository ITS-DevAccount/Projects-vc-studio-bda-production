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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const accessToken = getAccessToken(req);
    const supabase = await createServerClient(accessToken);
    
    const { data, error } = await supabase
      .from('stakeholder_roles')
      .select('id, role_type, assigned_at')
      .eq('stakeholder_id', params.id);
    
    if (error) {
      console.error('Error fetching roles:', error);
      throw error;
    }
    
    return NextResponse.json(data || []);
  } catch (e: any) {
    console.error('API error in GET /api/stakeholders/[id]/roles:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}

