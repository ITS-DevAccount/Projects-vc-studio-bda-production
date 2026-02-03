// ============================================================================
// BuildBid: Campaign Interactions API
// GET: Fetch current interaction and details for an opportunity
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ opportunity_id: string }> }
) {
  try {
    const { opportunity_id: opportunityId } = await params;
    
    if (!opportunityId) {
      return NextResponse.json({ error: 'Opportunity ID is required' }, { status: 400 });
    }

    const accessToken = req.headers.get('authorization')?.replace('Bearer ', '');
    const supabase = await createServerClient(accessToken);

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[INTERACTIONS API] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get app_uuid for multi-tenancy filtering
    let appUuid: string | null = null;
    try {
      appUuid = await getCurrentAppUuid();
    } catch (appUuidError: any) {
      console.error('[INTERACTIONS API] Error getting app UUID:', appUuidError);
    }
    
    if (!appUuid) {
      return NextResponse.json({ error: 'Unable to determine app context' }, { status: 500 });
    }

    // Verify opportunity exists and belongs to app (through campaign)
    const { data: opportunity, error: oppError } = await supabase
      .from('campaign_opportunities')
      .select(`
        id,
        campaign_id,
        campaign:campaigns!campaign_id(app_uuid)
      `)
      .eq('id', opportunityId)
      .single();

    if (oppError || !opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    // Verify campaign belongs to app
    if (opportunity.campaign?.app_uuid !== appUuid) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get current open interaction
    // Try with new columns first (stage_name, status)
    let currentInteraction: any = null;
    let interactionError: any = null;

    const { data, error } = await supabase
      .from('campaign_interactions')
      .select('id, stage_name, status, opened_at, notes')
      .eq('opportunity_id', opportunityId)
      .eq('status', 'open')
      .eq('app_uuid', appUuid)
      .maybeSingle();

    if (error) {
      // If columns don't exist, try fallback query
      if (error.code === '42703' || error.code === 'PGRST116' || error.message?.includes('column') || error.message?.includes('does not exist') || error.message?.includes('Could not find')) {
        console.warn('[INTERACTIONS API] New columns not found, using fallback query');
        // Fallback: get most recent interaction without status filter
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('campaign_interactions')
          .select('id, interaction_date, notes')
          .eq('opportunity_id', opportunityId)
          .eq('app_uuid', appUuid)
          .order('interaction_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fallbackError) {
          console.error('[INTERACTIONS API] Fallback query error:', fallbackError);
          interactionError = fallbackError;
        } else if (fallbackData) {
          // Convert to new format
          currentInteraction = {
            id: fallbackData.id,
            stage_name: 'Unknown',
            status: 'open',
            opened_at: fallbackData.interaction_date || new Date().toISOString(),
            notes: fallbackData.notes,
          };
        }
      } else {
        interactionError = error;
      }
    } else {
      currentInteraction = data;
    }

    if (interactionError && !currentInteraction) {
      console.warn('[INTERACTIONS API] No interaction found (this is OK for new opportunities):', {
        opportunityId,
        error: interactionError.message || interactionError,
      });
      // Don't return error - just return null interaction
      // This allows the UI to handle missing interactions gracefully
    }

    // Get interaction details if interaction exists
    let details: any[] = [];
    if (currentInteraction) {
      const { data: interactionDetails, error: detailsError } = await supabase
        .from('campaign_interaction_details')
        .select('*')
        .eq('interaction_id', currentInteraction.id)
        .order('created_at', { ascending: false });

      if (detailsError) {
        // If table doesn't exist, that's OK - just return empty array
        if (detailsError.code === 'PGRST205' || detailsError.message?.includes('Could not find the table')) {
          console.warn('[INTERACTIONS API] campaign_interaction_details table not found, returning empty details');
          details = [];
        } else {
          console.error('[INTERACTIONS API] Error fetching details:', detailsError);
          details = [];
        }
      } else {
        details = interactionDetails || [];
      }
    }

    return NextResponse.json({
      interaction: currentInteraction,
      details: details,
    });
  } catch (e: any) {
    console.error('[INTERACTIONS API] Error:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
