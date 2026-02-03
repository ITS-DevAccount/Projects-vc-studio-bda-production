// ============================================================================
// BuildBid: Campaigns Utility Functions
// Shared functions for campaign operations with server-side filtering
// ============================================================================

import { supabase } from '@/lib/supabase/client';

/**
 * Check if campaign has active opportunities (server-side)
 * Active opportunities are those with status='active' (not converted, rejected, dormant, or lost)
 * @param campaignId - Campaign ID
 * @param appUuid - Application UUID for filtering
 * @returns Count of active opportunities
 */
export async function getCampaignActiveOpportunitiesCount(
  campaignId: string,
  appUuid: string
): Promise<number> {
  // First get the campaign to verify app_uuid match, then count opportunities
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .eq('app_uuid', appUuid)
    .single();

  if (!campaign) {
    return 0;
  }

  const { count, error } = await supabase
    .from('campaign_opportunities')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'active');

  if (error) {
    console.error('Error counting active opportunities:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Check if campaign can be cancelled or completed
 * Campaign cannot be terminated if it has active opportunities
 * @param campaignId - Campaign ID
 * @param appUuid - Application UUID for filtering
 * @returns Object with canTerminate flag and activeOpportunitiesCount
 */
export async function canTerminateCampaign(
  campaignId: string,
  appUuid: string
): Promise<{ canTerminate: boolean; activeOpportunitiesCount: number }> {
  const activeOpportunitiesCount = await getCampaignActiveOpportunitiesCount(campaignId, appUuid);
  
  return {
    canTerminate: activeOpportunitiesCount === 0,
    activeOpportunitiesCount,
  };
}

