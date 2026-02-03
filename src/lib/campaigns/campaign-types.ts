// ============================================================================
// BuildBid: Campaign Types Utility Functions
// Shared functions for campaign type operations with server-side filtering
// ============================================================================

import { supabase } from '@/lib/supabase/client';
import type { FunnelStage, CampaignTypeMetadata } from '@/lib/types/campaign-type';

/**
 * Get campaign types with server-side filtering
 * @param appUuid - Application UUID for multi-tenancy filtering
 * @param filters - Optional filters (isActive, roleUuid, search)
 * @returns Campaign types array
 */
export async function getCampaignTypes(
  appUuid: string,
  filters?: {
    isActive?: boolean;
    roleUuid?: string;
    search?: string;
  }
) {
  // Fetch campaign types with optional joins (joins will be null if foreign keys are null)
  let query = supabase
    .from('campaign_types')
    .select(`
      *,
      role:roles!role_uuid(id, code, label, description),
      owner:stakeholders!owner_id(id, name, email)
    `)
    .eq('app_uuid', appUuid);

  // Filter by active status
  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  // Filter by role (show role-specific OR general types)
  if (filters?.roleUuid) {
    query = query.or(`role_uuid.eq.${filters.roleUuid},role_uuid.is.null`);
  }

  // Search filter (server-side using .ilike())
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,` +
      `description.ilike.%${filters.search}%,` +
      `code.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query.order('name');

  if (error) {
    // Log full error object
    console.error('Error fetching campaign types - full error:', error);
    console.error('Error message:', error?.message);
    console.error('Error code:', error?.code);
    console.error('Error details:', error?.details);
    console.error('Error hint:', error?.hint);
    
    // Try without joins to diagnose if it's a join issue
    try {
      const { data: simpleData, error: simpleError } = await supabase
        .from('campaign_types')
        .select('id, name, code, app_uuid')
        .eq('app_uuid', appUuid)
        .order('name')
        .limit(1);
      
      if (!simpleError && simpleData) {
        console.log('✓ Base query works - issue is likely with joins or RLS on related tables');
        console.log('Sample record:', simpleData[0]);
      } else {
        console.error('✗ Base query also fails:', simpleError);
      }
    } catch (diagnosticError) {
      console.error('Diagnostic query failed:', diagnosticError);
    }
    
    throw error;
  }

  return data || [];
}

/**
 * Get campaign type by ID with server-side filtering
 * @param id - Campaign type ID
 * @param appUuid - Application UUID for security
 * @returns Campaign type or null
 */
export async function getCampaignTypeById(id: string, appUuid: string) {
  const { data, error } = await supabase
    .from('campaign_types')
    .select(`
      *,
      role:roles!role_uuid(id, code, label, description),
      owner:stakeholders!owner_id(id, name, email)
    `)
    .eq('id', id)
    .eq('app_uuid', appUuid)
    .single();

  if (error) {
    console.error('Error fetching campaign type:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw error;
  }

  return data;
}

/**
 * Get usage count for a campaign type (server-side)
 * @param campaignTypeId - Campaign type ID
 * @param appUuid - Application UUID for filtering
 * @returns Count of campaigns using this type
 */
export async function getCampaignTypeUsageCount(
  campaignTypeId: string,
  appUuid: string
): Promise<number> {
  const { count, error } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_type_id', campaignTypeId)
    .eq('app_uuid', appUuid)
    .in('status', ['planning', 'active', 'paused']);

  if (error) {
    console.error('Error counting campaign usage:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Validate funnel stages
 * @param stages - Array of funnel stages
 * @returns Array of error messages (empty if valid)
 */
export function validateFunnelStages(stages: FunnelStage[]): string[] {
  const errors: string[] = [];

  // Minimum 2 stages
  if (stages.length < 2) {
    errors.push('At least 2 stages required');
  }

  // Must have exactly 1 success stage
  const successCount = stages.filter(s => s.is_success === true).length;
  if (successCount === 0) {
    errors.push('Must have at least one success stage (Closed Won)');
  } else if (successCount > 1) {
    errors.push('Can only have one success stage');
  }

  // Must have exactly 1 fail stage
  const failCount = stages.filter(s => s.is_success === false).length;
  if (failCount === 0) {
    errors.push('Must have at least one fail stage (Closed Lost)');
  } else if (failCount > 1) {
    errors.push('Can only have one fail stage');
  }

  // All stages must have names
  if (stages.some(s => !s.name || s.name.trim() === '')) {
    errors.push('All stages must have names');
  }

  // Validate order sequence
  // All stages must have sequential, unique order numbers (including won/lost)
  // Won and lost stages should have sequential order numbers after in-progress stages
  const inProgressStages = stages.filter(s => s.is_success === null || s.is_success === undefined);
  const successStages = stages.filter(s => s.is_success === true);
  const failStages = stages.filter(s => s.is_success === false);
  const endStages = [...successStages, ...failStages];
  
  // Validate in-progress stages have sequential, unique order numbers starting from 1
  if (inProgressStages.length > 0) {
    const inProgressOrders = inProgressStages.map(s => s.order).sort((a, b) => a - b);
    const expectedInProgressOrders = Array.from({ length: inProgressStages.length }, (_, i) => i + 1);
    if (JSON.stringify(inProgressOrders) !== JSON.stringify(expectedInProgressOrders)) {
      errors.push('In-progress stage order numbers must be sequential (1, 2, 3, ...)');
    }
  }
  
  // Validate end stages have sequential order numbers after in-progress stages
  if (endStages.length > 0) {
    const maxInProgressOrder = inProgressStages.length > 0 
      ? Math.max(...inProgressStages.map(s => s.order))
      : 0;
    
    // End stages should come after all in-progress stages
    const endStageOrders = endStages.map(s => s.order).sort((a, b) => a - b);
    const minEndOrder = Math.min(...endStageOrders);
    
    if (minEndOrder <= maxInProgressOrder && inProgressStages.length > 0) {
      errors.push('End stages (won/lost) must come after all in-progress stages');
    }
    
    // End stages should have sequential order numbers
    // Expected: maxInProgressOrder + 1, maxInProgressOrder + 2, etc.
    const expectedEndOrders = Array.from(
      { length: endStages.length }, 
      (_, i) => maxInProgressOrder + i + 1
    );
    
    if (JSON.stringify(endStageOrders) !== JSON.stringify(expectedEndOrders)) {
      errors.push('End stages (won/lost) must have sequential order numbers after in-progress stages');
    }
  }
  
  // Validate all stages have unique order numbers
  const allOrders = stages.map(s => s.order);
  const uniqueOrders = new Set(allOrders);
  if (allOrders.length !== uniqueOrders.size) {
    errors.push('All stages must have unique order numbers');
  }

  // Validate unique stage names
  const stageNames = stages.map(s => s.name.toLowerCase());
  const uniqueNames = new Set(stageNames);
  if (stageNames.length !== uniqueNames.size) {
    errors.push('Stage names must be unique');
  }

  return errors;
}

/**
 * Calculate total of scoring factors
 * @param factors - Scoring factors object
 * @returns Total (should be 1.0)
 */
export function calculateFactorTotal(factors: {
  contract_value_weight: number;
  response_speed_weight: number;
  engagement_weight: number;
}): number {
  return (
    (factors.contract_value_weight || 0) +
    (factors.response_speed_weight || 0) +
    (factors.engagement_weight || 0)
  );
}

/**
 * Get default metadata structure
 * @returns Default metadata object
 */
export function getDefaultMetadata(): CampaignTypeMetadata {
  return {
    automation: {
      auto_advance_enabled: false,
      auto_advance_days: 14,
      notify_before_advance: false,
      advance_to_stage: '',
    },
    notifications: {
      on_new_opportunity: true,
      on_stage_change: true,
      on_closed_won: true,
      on_closed_lost: false,
      recipients: [],
      email_template_id: null,
    },
    defaults: {
      engagement_level: 'warm',
      initial_interaction: 'email',
      target_response_hours: 48,
      default_owner_role: '',
    },
    custom_fields: [],
    integrations: {
      webhook_url: null,
      crm_sync_url: null,
      sync_enabled: false,
      sync_fields: [],
    },
    scoring: {
      warm_multiplier: 1.5,
      hot_multiplier: 2.0,
      min_qualification_score: 50,
      auto_qualify_enabled: false,
      factors: {
        contract_value_weight: 0.4,
        response_speed_weight: 0.3,
        engagement_weight: 0.3,
      },
    },
    validation: {
      require_notes_on_stage_change: false,
      require_interaction_before_advance: false,
      min_interactions_before_close: 0,
    },
    ui: {
      show_value_in_list: true,
      show_duration_in_list: true,
      default_sort: 'created_at',
      default_sort_order: 'desc',
    },
  };
}

/**
 * Check if stage has active opportunities (server-side)
 * @param campaignTypeId - Campaign type ID
 * @param stageName - Stage name to check
 * @param appUuid - Application UUID for filtering
 * @returns True if stage has active opportunities
 */
export async function stageHasActiveOpportunities(
  campaignTypeId: string,
  stageName: string,
  appUuid: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from('campaign_opportunities')
    .select('campaigns!inner(campaign_type_id, app_uuid)', { count: 'exact', head: true })
    .eq('campaigns.campaign_type_id', campaignTypeId)
    .eq('campaigns.app_uuid', appUuid)
    .eq('current_stage_name', stageName)
    .in('status', ['active', 'warm', 'hot', 'engaged']);

  if (error) {
    console.error('Error checking stage opportunities:', error);
    return false;
  }

  return (count || 0) > 0;
}

