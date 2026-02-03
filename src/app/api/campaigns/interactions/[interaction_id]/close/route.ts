// ============================================================================
// BuildBid: Close Campaign Interaction API
// POST: Close current interaction and create new one for next stage
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';

export const dynamic = 'force-dynamic';

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

    // Parse request body
    const body = await req.json();
    const { outcome, next_stage_name, opportunity_id } = body;

    if (!outcome || !next_stage_name || !opportunity_id) {
      return NextResponse.json(
        { error: 'Missing required fields: outcome, next_stage_name, opportunity_id' },
        { status: 400 }
      );
    }

    // Verify interaction exists, is open, and belongs to app
    // Try to get status, but handle case where column doesn't exist
    let interaction: any = null;
    const { data: interactionData, error: interactionError } = await supabase
      .from('campaign_interactions')
      .select('id, status, app_uuid, opportunity_id')
      .eq('id', interactionId)
      .single();

    if (interactionError || !interactionData) {
      // If error is about missing column, try without status
      if (interactionError?.code === '42703' || interactionError?.code === 'PGRST116' || interactionError?.message?.includes('column') || interactionError?.message?.includes('Could not find')) {
        const { data: fallbackInteraction, error: fallbackError } = await supabase
          .from('campaign_interactions')
          .select('id, app_uuid, opportunity_id')
          .eq('id', interactionId)
          .single();

        if (fallbackError || !fallbackInteraction) {
          return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
        }

        if (fallbackInteraction.app_uuid !== appUuid) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        interaction = fallbackInteraction;
        // Status check skipped - continue
      } else {
        return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
      }
    } else {
      interaction = interactionData;
      if (interaction.app_uuid !== appUuid) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Only check status if it exists
      if (interaction.status && interaction.status !== 'open') {
        return NextResponse.json(
          { error: 'Interaction is already closed' },
          { status: 400 }
        );
      }
    }

    if (interaction.opportunity_id !== opportunity_id) {
      return NextResponse.json(
        { error: 'Interaction does not belong to specified opportunity' },
        { status: 400 }
      );
    }

    // Close current interaction
    // Try with new columns first, fallback to old structure if migration hasn't run
    const updateData: any = {
      outcome: outcome,
      updated_at: new Date().toISOString(),
    };

    // Try adding new columns
    updateData.status = 'closed';
    updateData.closed_at = new Date().toISOString();

    const { error: closeError } = await supabase
      .from('campaign_interactions')
      .update(updateData)
      .eq('id', interactionId);

    if (closeError) {
      // If columns don't exist, try fallback (just update outcome and updated_at)
      if (closeError.code === '42703' || closeError.code === 'PGRST116' || closeError.message?.includes('column') || closeError.message?.includes('does not exist') || closeError.message?.includes('Could not find')) {
        console.warn('[CLOSE INTERACTION API] New columns not found, using fallback');
        const fallbackData = {
          outcome: outcome,
          updated_at: new Date().toISOString(),
        };

        const { error: fallbackError } = await supabase
          .from('campaign_interactions')
          .update(fallbackData)
          .eq('id', interactionId);

        if (fallbackError) {
          console.error('[CLOSE INTERACTION API] Error closing interaction (fallback):', fallbackError);
          return NextResponse.json(
            { error: 'Failed to close interaction', details: fallbackError.message },
            { status: 500 }
          );
        }
        // Fallback succeeded, continue
      } else {
        console.error('[CLOSE INTERACTION API] Error closing interaction:', closeError);
        return NextResponse.json(
          { error: 'Failed to close interaction', details: closeError.message },
          { status: 500 }
        );
      }
    }

    // Create new interaction for next stage
    // Try with new columns first, fallback to old structure if migration hasn't run
    let newInteraction: any = null;
    let createError: any = null;

    const insertData: any = {
      opportunity_id: opportunity_id,
      interaction_type: 'other',
      notes: `Stage opened: ${next_stage_name}`,
      app_uuid: appUuid,
      initiated_by_id: stakeholder.id,
    };

    // Try adding new columns
    insertData.stage_name = next_stage_name;
    insertData.status = 'open';
    insertData.opened_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('campaign_interactions')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      // If columns don't exist, try fallback
      if (error.code === '42703' || error.code === 'PGRST116' || error.message?.includes('column') || error.message?.includes('does not exist') || error.message?.includes('Could not find')) {
        console.warn('[CLOSE INTERACTION API] New columns not found, using fallback structure');
        // Fallback to old structure
        const fallbackData = {
          opportunity_id: opportunity_id,
          interaction_type: 'other',
          notes: `Stage opened: ${next_stage_name}`,
          app_uuid: appUuid,
          initiated_by_id: stakeholder.id,
          interaction_date: new Date().toISOString(),
        };

        const { data: fallbackResult, error: fallbackErr } = await supabase
          .from('campaign_interactions')
          .insert(fallbackData)
          .select()
          .single();

        if (fallbackErr || !fallbackResult) {
          createError = fallbackErr || new Error('Failed to create interaction');
        } else {
          // Convert to new format
          newInteraction = {
            ...fallbackResult,
            stage_name: next_stage_name,
            status: 'open',
            opened_at: fallbackResult.interaction_date || new Date().toISOString(),
          };
        }
      } else {
        createError = error;
      }
    } else {
      newInteraction = data;
    }

    if (createError || !newInteraction) {
      console.error('[CLOSE INTERACTION API] Error creating new interaction:', createError);
      return NextResponse.json(
        { error: 'Failed to create new interaction', details: createError?.message || 'Unknown error' },
        { status: 500 }
      );
    }

    return NextResponse.json({ new_interaction: newInteraction }, { status: 201 });
  } catch (e: any) {
    console.error('[CLOSE INTERACTION API] Error:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
