// ============================================================================
// BuildBid: Last Activities API
// GET: Fetch most recent completed activity for each opportunity
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids');
    if (!idsParam) {
      return NextResponse.json({ error: 'ids query param required (comma-separated opportunity IDs)' }, { status: 400 });
    }

    const opportunityIds = idsParam.split(',').map((id) => id.trim()).filter(Boolean);
    if (opportunityIds.length === 0) {
      return NextResponse.json({});
    }

    const accessToken = req.headers.get('authorization')?.replace('Bearer ', '');
    const supabase = await createServerClient(accessToken);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appUuid = await getCurrentAppUuid();
    if (!appUuid) {
      return NextResponse.json({ error: 'Unable to determine app context' }, { status: 500 });
    }

    // Get interactions for these opportunities
    const { data: interactions, error: intError } = await supabase
      .from('campaign_interactions')
      .select('id, opportunity_id')
      .in('opportunity_id', opportunityIds)
      .eq('app_uuid', appUuid);

    if (intError || !interactions?.length) {
      return NextResponse.json({});
    }

    const interactionIds = interactions.map((i) => i.id);
    const oppByInteraction = new Map(interactions.map((i) => [i.id, i.opportunity_id]));

    // Get completed details for those interactions, ordered by date desc
    const { data: details, error } = await supabase
      .from('campaign_interaction_details')
      .select('id, interaction_id, actual_action_type, actual_action_date')
      .in('interaction_id', interactionIds)
      .eq('status', 'completed')
      .order('actual_action_date', { ascending: false });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        return NextResponse.json({});
      }
      console.error('[LAST ACTIVITIES API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Build map: opportunity_id -> { type, date } (keep only most recent per opportunity)
    const lastByOpportunity: Record<string, { type: string; date: string }> = {};
    for (const d of details || []) {
      const oppId = oppByInteraction.get(d.interaction_id);
      if (oppId && !lastByOpportunity[oppId]) {
        lastByOpportunity[oppId] = {
          type: d.actual_action_type || 'activity',
          date: d.actual_action_date || '',
        };
      }
    }

    return NextResponse.json(lastByOpportunity);
  } catch (e: any) {
    console.error('[LAST ACTIVITIES API] Error:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
