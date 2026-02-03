// ============================================================================
// BuildBid: Campaign Interaction Details API
// POST: Create interaction detail (planned activity)
// PATCH: Update interaction detail (complete activity)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';

export const dynamic = 'force-dynamic';

// POST: Create interaction detail
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ interaction_id: string }> }
) {
  try {
    const { interaction_id: interactionId } = await params;
    
    const accessToken = req.headers.get('authorization')?.replace('Bearer ', '');
    const supabase = await createServerClient(accessToken);

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current stakeholder
    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!stakeholder) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }

    // Get app_uuid for multi-tenancy filtering
    const appUuid = await getCurrentAppUuid();
    if (!appUuid) {
      return NextResponse.json({ error: 'Unable to determine app context' }, { status: 500 });
    }

    // Verify interaction exists, is open, and belongs to app
    // Try to get status, but handle case where column doesn't exist
    const { data: interaction, error: interactionError } = await supabase
      .from('campaign_interactions')
      .select('id, status, app_uuid')
      .eq('id', interactionId)
      .single();

    if (interactionError || !interaction) {
      // If error is about missing column, try without status
      if (interactionError?.code === '42703' || interactionError?.code === 'PGRST116' || interactionError?.message?.includes('column') || interactionError?.message?.includes('Could not find')) {
        const { data: fallbackInteraction, error: fallbackError } = await supabase
          .from('campaign_interactions')
          .select('id, app_uuid')
          .eq('id', interactionId)
          .single();

        if (fallbackError || !fallbackInteraction) {
          return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
        }

        if (fallbackInteraction.app_uuid !== appUuid) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        // Status check skipped - continue
      } else {
        return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
      }
    } else {
      if (interaction.app_uuid !== appUuid) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Only check status if it exists
      if (interaction.status && interaction.status !== 'open') {
        return NextResponse.json(
          { error: 'Cannot add activity to closed interaction' },
          { status: 400 }
        );
      }
    }

    // Parse request body
    const body = await req.json();
    const { planned_action_type, planned_action_date, planned_notes } = body;

    // Validate required fields
    if (!planned_action_type || !planned_action_date || !planned_notes) {
      return NextResponse.json(
        { error: 'Missing required fields: planned_action_type, planned_action_date, planned_notes' },
        { status: 400 }
      );
    }

    // Validate date is in future (allow small buffer for timezone/clock differences)
    const plannedDate = new Date(planned_action_date);
    const now = new Date();
    const bufferMinutes = 2; // Allow 2 minutes buffer for timezone/clock differences
    const minAllowedDate = new Date(now.getTime() - bufferMinutes * 60 * 1000);
    
    if (plannedDate < minAllowedDate) {
      return NextResponse.json(
        { error: 'Planned activity date must be in the future (or very recent)' },
        { status: 400 }
      );
    }

    // Create interaction detail
    const { data: detail, error: createError } = await supabase
      .from('campaign_interaction_details')
      .insert({
        interaction_id: interactionId,
        planned_action_type,
        planned_action_date,
        planned_notes,
        status: 'planned',
        created_by: stakeholder.id,
      })
      .select()
      .single();

    if (createError) {
      // If table doesn't exist, return a helpful error
      if (createError.code === 'PGRST205' || createError.message?.includes('Could not find the table')) {
        console.warn('[INTERACTION DETAILS API] campaign_interaction_details table not found');
        return NextResponse.json(
          { 
            error: 'Activity tracking feature is not available. Please run database migrations to enable this feature.',
            code: 'TABLE_NOT_FOUND'
          },
          { status: 503 }
        );
      }
      console.error('[INTERACTION DETAILS API] Error creating detail:', createError);
      return NextResponse.json(
        { error: 'Failed to create interaction detail', details: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(detail, { status: 201 });
  } catch (e: any) {
    console.error('[INTERACTION DETAILS API] Error:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Update interaction detail (complete activity)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ interaction_id: string }> }
) {
  try {
    const { interaction_id: interactionId } = await params;
    
    const accessToken = req.headers.get('authorization')?.replace('Bearer ', '');
    const supabase = await createServerClient(accessToken);

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get app_uuid for multi-tenancy filtering
    const appUuid = await getCurrentAppUuid();
    if (!appUuid) {
      return NextResponse.json({ error: 'Unable to determine app context' }, { status: 500 });
    }

    // Parse request body - should include detail_id
    const body = await req.json();
    const { detail_id, actual_action_type, actual_action_date, actual_notes } = body;

    if (!detail_id) {
      return NextResponse.json({ error: 'detail_id is required' }, { status: 400 });
    }

    // Verify interaction exists and belongs to app (need opportunity_id for last_interaction update)
    const { data: interaction, error: interactionError } = await supabase
      .from('campaign_interactions')
      .select('id, app_uuid, opportunity_id')
      .eq('id', interactionId)
      .single();

    if (interactionError || !interaction) {
      return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
    }

    // Verify interaction belongs to app
    if (interaction.app_uuid !== appUuid) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify detail exists and belongs to this interaction
    const { data: detail, error: detailError } = await supabase
      .from('campaign_interaction_details')
      .select('id, interaction_id')
      .eq('id', detail_id)
      .eq('interaction_id', interactionId)
      .single();

    if (detailError) {
      // If table doesn't exist, return a helpful error
      if (detailError.code === 'PGRST205' || detailError.message?.includes('Could not find the table')) {
        return NextResponse.json(
          { 
            error: 'Activity tracking feature is not available. Please run database migrations to enable this feature.',
            code: 'TABLE_NOT_FOUND'
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: 'Interaction detail not found' }, { status: 404 });
    }

    if (!detail) {
      return NextResponse.json({ error: 'Interaction detail not found' }, { status: 404 });
    }

    // Update detail with actual data
    const { data: updatedDetail, error: updateError } = await supabase
      .from('campaign_interaction_details')
      .update({
        actual_action_type,
        actual_action_date,
        actual_notes,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', detail_id)
      .select()
      .single();

    if (updateError) {
      // If table doesn't exist, return a helpful error
      if (updateError.code === 'PGRST205' || updateError.message?.includes('Could not find the table')) {
        return NextResponse.json(
          { 
            error: 'Activity tracking feature is not available. Please run database migrations to enable this feature.',
            code: 'TABLE_NOT_FOUND'
          },
          { status: 503 }
        );
      }
      console.error('[INTERACTION DETAILS API] Error updating detail:', updateError);
      return NextResponse.json(
        { error: 'Failed to update interaction detail', details: updateError.message },
        { status: 500 }
      );
    }

    // Update campaign_opportunities.last_interaction so "Last Action" displays on the card
    const lastActionDate = actual_action_date || new Date().toISOString();
    if (interaction.opportunity_id) {
      const { error: oppUpdateError } = await supabase
        .from('campaign_opportunities')
        .update({
          last_interaction: lastActionDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', interaction.opportunity_id);

      if (oppUpdateError) {
        console.warn('[INTERACTION DETAILS API] Failed to update opportunity last_interaction:', oppUpdateError);
        // Don't fail the request - the detail was updated successfully
      }
    }

    return NextResponse.json(updatedDetail);
  } catch (e: any) {
    console.error('[INTERACTION DETAILS API] Error:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
