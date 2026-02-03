import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(_request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase.rpc('current_stakeholder_context');
    if (error || !data || data.length === 0) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }

    return NextResponse.json({ stakeholder: data[0] });
  } catch (error: any) {
    console.error('API error in GET /api/stakeholders/me:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
