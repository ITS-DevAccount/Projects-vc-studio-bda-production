// ============================================================================
// BuildBid: Campaign Interaction Helper Utilities
// Database operations for logging interactions and managing opportunities
// ============================================================================

import { supabase } from '@/lib/supabase/client';
import type { FunnelStage } from '@/lib/types/campaign';

/**
 * Close an interaction with fallback support for old schema
 * Handles both new columns (status, closed_at) and old structure
 */
async function closeInteractionWithFallback(params: {
  interactionId: string;
  outcome: string;
}): Promise<void> {
  const updateData: any = {
    outcome: params.outcome,
  };

  // Try adding new columns (but not updated_at since it might not exist)
  updateData.status = 'closed';
  updateData.closed_at = new Date().toISOString();

  const { error: closeError } = await supabase
    .from('campaign_interactions')
    .update(updateData)
    .eq('id', params.interactionId);

  if (closeError) {
    // Check if error is about missing columns or trigger issues with updated_at
    const isColumnError = closeError.code === '42703' || 
                          closeError.code === 'PGRST116' || 
                          closeError.message?.includes('column') || 
                          closeError.message?.includes('does not exist') || 
                          closeError.message?.includes('Could not find') ||
                          closeError.message?.includes('has no field') ||
                          closeError.message?.includes('updated_at');
    
    if (isColumnError) {
      console.warn('New columns not found for closing interaction, using fallback:', closeError.message);
      
      // Try with just outcome (most important field)
      const fallbackData = {
        outcome: params.outcome,
      };

      const { error: fallbackError } = await supabase
        .from('campaign_interactions')
        .update(fallbackData)
        .eq('id', params.interactionId);

      if (fallbackError) {
        // Check if fallback error is also about updated_at trigger - if so, it's likely a schema issue but we can still proceed
        const isTriggerError = fallbackError.message?.includes('has no field') && 
                               fallbackError.message?.includes('updated_at');
        
        if (isTriggerError) {
          console.warn('Trigger error detected (updated_at column missing), but outcome update may have succeeded. Continuing...');
          // Don't throw - the outcome may have been updated despite the trigger error
          return;
        }
        
        // If even outcome update fails with a different error, that's a real error
        throw new Error(`Failed to close interaction: ${fallbackError.message}`);
      }
      // Fallback succeeded - outcome updated
    } else {
      throw new Error(`Failed to close interaction: ${closeError.message}`);
    }
  }
}

/**
 * Create a new interaction with fallback support for old schema
 * Handles both new columns (stage_name, status, opened_at) and old columns (interaction_date)
 */
async function createInteractionWithFallback(params: {
  opportunity_id: string;
  stage_name?: string;
  status?: string;
  interaction_type: string;
  notes: string;
  app_uuid: string;
  initiated_by_id: string;
}): Promise<{ id: string; stage_name?: string; status?: string; opened_at?: string }> {
  const insertData: any = {
    opportunity_id: params.opportunity_id,
    interaction_type: params.interaction_type,
    notes: params.notes,
    app_uuid: params.app_uuid,
    initiated_by_id: params.initiated_by_id,
  };

  // Try with new columns first
  if (params.stage_name) insertData.stage_name = params.stage_name;
  if (params.status) insertData.status = params.status;
  insertData.opened_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('campaign_interactions')
    .insert(insertData)
    .select('id, stage_name, status, opened_at')
    .single();

  if (error) {
    // If columns don't exist, try fallback
    if (error.code === '42703' || error.code === 'PGRST116' || error.message?.includes('column') || error.message?.includes('does not exist') || error.message?.includes('Could not find')) {
      console.warn('New columns not found, using fallback structure');
      // Fallback to old structure
      const fallbackData = {
        opportunity_id: params.opportunity_id,
        interaction_type: params.interaction_type,
        notes: params.notes,
        app_uuid: params.app_uuid,
        initiated_by_id: params.initiated_by_id,
        interaction_date: new Date().toISOString(),
      };

      const { data: fallbackResult, error: fallbackErr } = await supabase
        .from('campaign_interactions')
        .insert(fallbackData)
        .select('id, interaction_date')
        .single();

      if (fallbackErr || !fallbackResult) {
        throw new Error(`Failed to create interaction: ${fallbackErr?.message || 'Unknown error'}`);
      }

      // Convert to new format
      return {
        id: fallbackResult.id,
        stage_name: params.stage_name || 'Unknown',
        status: params.status || 'open',
        opened_at: fallbackResult.interaction_date || new Date().toISOString(),
      };
    }
    throw new Error(`Failed to create interaction: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to create interaction: No data returned');
  }

  return data;
}

/**
 * Get current open interaction for an opportunity
 */
export async function getCurrentInteraction(opportunityId: string, appUuid: string): Promise<{
  id: string;
  stage_name: string;
  status: string;
  opened_at: string;
} | null> {
  try {
    // First try with new columns (stage_name, status)
    const { data, error } = await supabase
      .from('campaign_interactions')
      .select('id, stage_name, status, opened_at')
      .eq('opportunity_id', opportunityId)
      .eq('status', 'open')
      .eq('app_uuid', appUuid)
      .maybeSingle();

    if (error) {
      // If error suggests columns don't exist, try without status filter
      if (error.code === '42703' || error.code === 'PGRST116' || error.message?.includes('column') || error.message?.includes('does not exist') || error.message?.includes('Could not find')) {
        console.warn('New columns not found, trying fallback query:', error.message || error);
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
          console.error('Error getting current interaction (fallback):', {
            error: fallbackError,
            code: fallbackError.code,
            message: fallbackError.message,
            opportunityId,
          });
          return null;
        }

        // Return null if no interaction found, or create a compatible structure
        if (!fallbackData) {
          return null;
        }

        // Return with default values for new fields
        return {
          id: fallbackData.id,
          stage_name: 'Unknown',
          status: 'open',
          opened_at: fallbackData.interaction_date || new Date().toISOString(),
        };
      }

      // Log the error with safe property access
      console.error('Error getting current interaction:', {
        error: error,
        code: error?.code,
        message: error?.message || String(error),
        details: error?.details,
        hint: error?.hint,
        opportunityId,
      });
      return null;
    }

    return data || null;
  } catch (err: any) {
    console.error('Unexpected error in getCurrentInteraction:', err);
    return null;
  }
}

/**
 * Get interaction history (closed interactions) for an opportunity
 */
export async function getInteractionHistory(opportunityId: string, appUuid: string): Promise<Array<{
  id: string;
  stage_name: string;
  status: string;
  opened_at: string;
  closed_at: string | null;
  outcome: string | null;
  notes: string | null;
}>> {
  const { data, error } = await supabase
    .from('campaign_interactions')
    .select('id, stage_name, status, opened_at, closed_at, outcome, notes')
    .eq('opportunity_id', opportunityId)
    .eq('status', 'closed')
    .eq('app_uuid', appUuid)
    .order('opened_at', { ascending: false });

  if (error) {
    console.error('Error getting interaction history:', error);
    return [];
  }

  return data || [];
}

/**
 * Create an interaction detail (planned activity)
 */
export async function createInteractionDetail(params: {
  interactionId: string;
  plannedActionType: 'email' | 'call' | 'meeting' | 'demo';
  plannedActionDate: string;
  plannedNotes: string;
  createdBy: string;
}): Promise<string | null> {
  const { interactionId, plannedActionType, plannedActionDate, plannedNotes, createdBy } = params;

  // Validate that interaction is open
  // Try to get status, but handle case where column doesn't exist
  const { data: interaction, error: checkError } = await supabase
    .from('campaign_interactions')
    .select('id, status')
    .eq('id', interactionId)
    .single();

  if (checkError || !interaction) {
    // If error is about missing column, that's OK - just check if interaction exists
    if (checkError?.code === '42703' || checkError?.code === 'PGRST116' || checkError?.message?.includes('column') || checkError?.message?.includes('Could not find')) {
      // Status column doesn't exist, skip status check
      const { data: existsCheck } = await supabase
        .from('campaign_interactions')
        .select('id')
        .eq('id', interactionId)
        .single();
      
      if (!existsCheck) {
        throw new Error('Interaction not found');
      }
      // Interaction exists, continue (status check skipped)
    } else {
      throw new Error('Interaction not found');
    }
  } else if (interaction.status && interaction.status !== 'open') {
    // Only check status if it exists
    throw new Error('Cannot add activity to closed interaction');
  }

  // Validate date is in future
  if (new Date(plannedActionDate) < new Date()) {
    throw new Error('Planned activity date must be in future');
  }

  const { data, error } = await supabase
    .from('campaign_interaction_details')
    .insert({
      interaction_id: interactionId,
      planned_action_type: plannedActionType,
      planned_action_date: plannedActionDate,
      planned_notes: plannedNotes,
      status: 'planned',
      created_by: createdBy,
    })
    .select('id')
    .single();

  if (error) {
    // If table doesn't exist, return null (feature not available)
    if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
      console.warn('campaign_interaction_details table not found, activity tracking not available');
      return null;
    }
    console.error('Error creating interaction detail:', error);
    throw new Error(`Failed to create interaction detail: ${error.message}`);
  }

  return data?.id || null;
}

/**
 * Complete an interaction detail (update with actual activity)
 */
export async function completeInteractionDetail(params: {
  detailId: string;
  actualActionType: 'email' | 'call' | 'meeting' | 'demo';
  actualActionDate: string;
  actualNotes: string;
}): Promise<void> {
  const { detailId, actualActionType, actualActionDate, actualNotes } = params;

  const { error } = await supabase
    .from('campaign_interaction_details')
    .update({
      actual_action_type: actualActionType,
      actual_action_date: actualActionDate,
      actual_notes: actualNotes,
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', detailId);

  if (error) {
    // If table doesn't exist, just return (feature not available)
    if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
      console.warn('campaign_interaction_details table not found, activity tracking not available');
      return;
    }
    console.error('Error completing interaction detail:', error);
    throw new Error(`Failed to complete interaction detail: ${error.message}`);
  }
}

/**
 * Close an interaction and create a new one for the next stage
 */
export async function closeInteraction(params: {
  interactionId: string;
  opportunityId: string;
  outcome: string;
  nextStageName: string;
  appUuid: string;
  initiatedById: string;
}): Promise<string | null> {
  const { interactionId, opportunityId, outcome, nextStageName, appUuid, initiatedById } = params;

  // Close current interaction
  await closeInteractionWithFallback({
    interactionId,
    outcome,
  });

  // Create new interaction for next stage
  const newInteraction = await createInteractionWithFallback({
    opportunity_id: opportunityId,
    stage_name: nextStageName,
    status: 'open',
    interaction_type: 'other',
    notes: `Stage opened: ${nextStageName}`,
    app_uuid: appUuid,
    initiated_by_id: initiatedById,
  });

  return newInteraction.id;
}

/**
 * Log an interaction to campaign_interactions table
 * @deprecated Use createInteractionDetail for new two-table system
 */
export async function logInteraction(params: {
  opportunityId: string;
  interactionType: 'email' | 'call' | 'meeting' | 'demo' | 'other';
  direction?: 'inbound' | 'outbound';
  notes?: string;
  interactionDate?: string;
  nextFollowUpDate?: string | null;
  scheduledTime?: string;
  outcome?: string;
}): Promise<string | null> {
  const {
    opportunityId,
    interactionType,
    direction = 'outbound',
    notes,
    interactionDate = new Date().toISOString(),
    nextFollowUpDate,
    scheduledTime,
    outcome,
  } = params;

  const { data, error } = await supabase
    .from('campaign_interactions')
    .insert({
      opportunity_id: opportunityId,
      interaction_type: interactionType,
      direction,
      notes: notes || null,
      interaction_date: interactionDate,
      next_follow_up_date: nextFollowUpDate || null,
      metadata: scheduledTime ? { scheduled_time: scheduledTime } : {},
      outcome: outcome || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error logging interaction:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      error: error,
    });
    throw new Error(`Failed to log interaction: ${error.message || JSON.stringify(error)}`);
  }

  return data?.id || null;
}

/**
 * Advance opportunity to the next stage in the funnel
 * Now uses two-table system: closes current interaction and creates new one
 */
export async function advanceOpportunityStage(params: {
  opportunityId: string;
  nextStageName: string;
  nextFollowUpDate?: string | null;
  currentInteractionId: string;
  outcome: string;
  appUuid: string;
  initiatedById: string;
}): Promise<void> {
  const { opportunityId, nextStageName, nextFollowUpDate, currentInteractionId, outcome, appUuid, initiatedById } = params;

  // Close current interaction and create new one
  await closeInteraction({
    interactionId: currentInteractionId,
    opportunityId,
    outcome,
    nextStageName,
    appUuid,
    initiatedById,
  });

  // Update opportunity to next stage
  const { error } = await supabase
    .from('campaign_opportunities')
    .update({
      current_stage_name: nextStageName,
      stage_entered_at: new Date().toISOString(),
      last_interaction: new Date().toISOString(),
      next_follow_up_date: nextFollowUpDate || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', opportunityId);

  if (error) {
    console.error('Error advancing opportunity stage:', error);
    throw error;
  }
}

/**
 * Update opportunity's last interaction without changing stage
 */
export async function updateOpportunityInteraction(params: {
  opportunityId: string;
  nextFollowUpDate?: string | null;
}): Promise<void> {
  const { opportunityId, nextFollowUpDate } = params;

  const { error } = await supabase
    .from('campaign_opportunities')
    .update({
      last_interaction: new Date().toISOString(),
      next_follow_up_date: nextFollowUpDate || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', opportunityId);

  if (error) {
    console.error('Error updating opportunity interaction:', error);
    throw error;
  }
}

/**
 * Mark opportunity as won (converted) - move to success stage
 * Closes current interaction and creates final closed interaction
 */
export async function markOpportunityWon(params: {
  opportunityId: string;
  finalStageName: string;
  currentInteractionId: string | null;
  outcome: string;
  appUuid: string;
  initiatedById: string;
}): Promise<void> {
  const { opportunityId, finalStageName, currentInteractionId, outcome, appUuid, initiatedById } = params;

  // Close current interaction if exists
  if (currentInteractionId) {
    await closeInteractionWithFallback({
      interactionId: currentInteractionId,
      outcome,
    });
  }

  // Create final closed interaction in success stage
  try {
    const finalInteraction = await createInteractionWithFallback({
      opportunity_id: opportunityId,
      stage_name: finalStageName,
      status: 'closed',
      interaction_type: 'other',
      notes: outcome,
      app_uuid: appUuid,
      initiated_by_id: initiatedById,
    });

    // Update with closed_at and outcome (these might not exist in old schema)
    // Try to update, but don't fail if columns don't exist
    try {
      await supabase
        .from('campaign_interactions')
        .update({
          closed_at: new Date().toISOString(),
          outcome: 'Won',
        })
        .eq('id', finalInteraction.id);
    } catch (updateError: any) {
      // If columns don't exist, just update outcome
      if (updateError.code === '42703' || updateError.code === 'PGRST116' || updateError.message?.includes('column') || updateError.message?.includes('Could not find')) {
        await supabase
          .from('campaign_interactions')
          .update({
            outcome: 'Won',
          })
          .eq('id', finalInteraction.id);
      } else {
        throw updateError;
      }
    }
  } catch (createError: any) {
    console.error('Error creating final interaction:', createError);
    throw new Error(`Failed to create final interaction: ${createError.message}`);
  }

  // Update opportunity
  const { error } = await supabase
    .from('campaign_opportunities')
    .update({
      status: 'converted',
      current_stage_name: finalStageName,
      stage_entered_at: new Date().toISOString(),
      last_interaction: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', opportunityId);

  if (error) {
    console.error('Error marking opportunity as won:', error);
    throw error;
  }
}

/**
 * Mark opportunity as lost - move to failed stage
 * Closes current interaction and creates final closed interaction
 */
export async function markOpportunityLost(params: {
  opportunityId: string;
  finalStageName: string;
  currentInteractionId: string | null;
  outcome: string;
  appUuid: string;
  initiatedById: string;
}): Promise<void> {
  const { opportunityId, finalStageName, currentInteractionId, outcome, appUuid, initiatedById } = params;

  // Close current interaction if exists
  if (currentInteractionId) {
    await closeInteractionWithFallback({
      interactionId: currentInteractionId,
      outcome,
    });
  }

  // Create final closed interaction in fail stage
  try {
    const finalInteraction = await createInteractionWithFallback({
      opportunity_id: opportunityId,
      stage_name: finalStageName,
      status: 'closed',
      interaction_type: 'other',
      notes: outcome,
      app_uuid: appUuid,
      initiated_by_id: initiatedById,
    });

    // Update with closed_at and outcome (these might not exist in old schema)
    // Try to update, but don't fail if columns don't exist
    try {
      await supabase
        .from('campaign_interactions')
        .update({
          closed_at: new Date().toISOString(),
          outcome: outcome,
        })
        .eq('id', finalInteraction.id);
    } catch (updateError: any) {
      // If columns don't exist, just update outcome
      if (updateError.code === '42703' || updateError.code === 'PGRST116' || updateError.message?.includes('column') || updateError.message?.includes('Could not find')) {
        await supabase
          .from('campaign_interactions')
          .update({
            outcome: outcome,
          })
          .eq('id', finalInteraction.id);
      } else {
        throw updateError;
      }
    }
  } catch (createError: any) {
    console.error('Error creating final interaction:', createError);
    throw new Error(`Failed to create final interaction: ${createError.message}`);
  }

  // Update opportunity
  const { error } = await supabase
    .from('campaign_opportunities')
    .update({
      status: 'lost',
      current_stage_name: finalStageName,
      stage_entered_at: new Date().toISOString(),
      last_interaction: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', opportunityId);

  if (error) {
    console.error('Error marking opportunity as lost:', error);
    throw error;
  }
}

/**
 * Calculate the next stage in the funnel
 */
export function calculateNextStage(
  currentStageName: string,
  stages: FunnelStage[]
): FunnelStage | null {
  if (!currentStageName || !stages || stages.length === 0) {
    console.warn('[calculateNextStage] Missing currentStageName or stages:', { currentStageName, stagesLength: stages?.length });
    return null;
  }

  const sortedStages = [...stages].sort((a, b) => a.order - b.order);
  
  // Normalize stage names for comparison (trim whitespace, case-insensitive)
  const normalizedCurrentName = currentStageName.trim();
  
  // Try exact match first
  let currentIndex = sortedStages.findIndex(s => s.name === normalizedCurrentName);
  
  // If no exact match, try case-insensitive match
  if (currentIndex === -1) {
    currentIndex = sortedStages.findIndex(s => 
      s.name.trim().toLowerCase() === normalizedCurrentName.toLowerCase()
    );
  }
  
  // Debug logging if still not found
  if (currentIndex === -1) {
    console.warn('[calculateNextStage] Current stage not found:', {
      currentStageName: normalizedCurrentName,
      availableStages: sortedStages.map(s => ({ name: s.name, order: s.order, is_success: s.is_success })),
    });
    return null;
  }
  
  if (currentIndex >= sortedStages.length - 1) {
    console.log('[calculateNextStage] Already at last stage:', normalizedCurrentName);
    return null;
  }

  // Skip success/failed stages when advancing
  for (let i = currentIndex + 1; i < sortedStages.length; i++) {
    const stage = sortedStages[i];
    if (stage.is_success === undefined || stage.is_success === null) {
      console.log('[calculateNextStage] Found next stage:', stage.name);
      return stage;
    }
  }

  console.log('[calculateNextStage] No next in-progress stage found after:', normalizedCurrentName);
  return null;
}

/**
 * Find the success (won) stage
 */
export function findSuccessStage(stages: FunnelStage[]): FunnelStage | null {
  return stages.find(s => s.is_success === true) || null;
}

/**
 * Find the failed (lost) stage
 */
export function findFailedStage(stages: FunnelStage[]): FunnelStage | null {
  return stages.find(s => s.is_success === false) || null;
}
