// ============================================================================
// BuildBid: Campaign Types API
// GET: List all campaign types
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/campaign-types
export async function GET(req: NextRequest) {
  try {
    const accessToken = req.headers.get('authorization')?.replace('Bearer ', '');
    const supabase = await createServerClient(accessToken);

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query campaign types
    // Note: campaign_types table may not have app_uuid column yet
    // If it does, add filtering by app_uuid
    const { data, error } = await supabase
      .from('campaign_types')
      .select('id, code, name, description, funnel_stages, auto_advance_enabled, auto_advance_days, metadata, created_at')
      .order('name');

    if (error) {
      console.error('[CAMPAIGN TYPES API] Error fetching campaign types:', error);
      return NextResponse.json(
        { error: 'Failed to fetch campaign types', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (e: any) {
    console.error('[CAMPAIGN TYPES API] Error:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

