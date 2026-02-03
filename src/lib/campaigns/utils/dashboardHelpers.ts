// ============================================================================
// BuildBid: Campaign Dashboard Data Helpers
// Server-side data loading functions for campaign dashboard
// All queries filter by campaign_id and app_uuid for security
// ============================================================================

import { supabase } from '@/lib/supabase/client';
import type { Campaign, CampaignType, FunnelStage } from '@/lib/types/campaign';

export interface CampaignOverview extends Campaign {
  campaign_type?: CampaignType & {
    funnel_stages?: {
      stages: FunnelStage[];
    };
  };
  owner?: {
    id: string;
    name: string;
    email: string | null;
  };
}

export interface OpportunityMetrics {
  total: number;
  inProgress: number;
  converted: number;
  lost: number;
  conversionRate: number;
  lossRate: number;
}

export interface FunnelStageData {
  name: string;
  order: number;
  count: number;
  percentage: number;
  isSuccess?: boolean;
  color?: string;
}

export interface PipelineValue {
  totalValue: number;
  avgDealSize: number;
  stageBreakdown: Array<{
    name: string;
    value: number;
    count: number;
  }>;
}

export interface RecentActivity {
  id: string;
  reference: string | null;
  interaction_date: string;
  interaction_type: string | null;
  stage_name: string | null;
  outcome: string | null;
  initiated_by?: {
    name: string;
  };
  opportunity?: {
    id: string;
    reference: string;
    stakeholder?: {
      name?: string | null;
      organization_name?: string | null;
    };
  };
}

export interface UpcomingAction {
  id: string;
  planned_action_type: string | null;
  planned_action_date: string | null;
  planned_notes: string | null;
  status: string;
  interaction?: {
    stage_name: string | null;
    opportunity?: {
      id: string;
      reference: string;
      stakeholder?: {
        organization_name: string | null;
      };
    };
  };
}

export interface TeamMemberActivity {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  activityCount: number;
}

/**
 * Load campaign overview with type and owner details
 */
export async function loadCampaignOverview(
  campaignId: string,
  appUuid: string
): Promise<CampaignOverview | null> {
  try {
    // Use explicit foreign key column names (not constraint names)
    const baseSelect = `
      *,
      campaign_type:campaign_types!campaign_type_id (
        id,
        code,
        name,
        description,
        funnel_stages
      ),
      owner:stakeholders!owner_id (
        id,
        name,
        email
      )
    `;

    const { data, error } = await supabase
      .from('campaigns')
      .select(baseSelect)
      .eq('id', campaignId)
      .eq('app_uuid', appUuid)
      .maybeSingle();

    if (error) {
      console.error('Error loading campaign overview:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        campaignId,
        appUuid,
      });
      
      // If not found, try without app_uuid filter for backward compatibility
      if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
        console.warn('Campaign not found with app_uuid filter; retrying without app_uuid for compatibility');
        const retry = await supabase
          .from('campaigns')
          .select(baseSelect)
          .eq('id', campaignId)
          .maybeSingle();

        if (retry.error) {
          console.error('Retry error loading campaign overview:', {
            message: retry.error.message,
            code: retry.error.code,
            details: retry.error.details,
            hint: retry.error.hint,
            campaignId,
          });
          throw retry.error;
        }
        
        if (retry.data) {
          return retry.data as CampaignOverview;
        }
      } else {
        throw error;
      }
    }

    if (!data) {
      console.warn('Campaign not found or not accessible', {
        campaignId,
        appUuid,
      });
      return null;
    }

    return data as CampaignOverview;
  } catch (error: any) {
    console.error('Error in loadCampaignOverview:', error);
    throw error;
  }
}

/**
 * Load opportunity metrics (total, in progress, converted, lost)
 */
export async function loadOpportunityMetrics(
  campaignId: string,
  appUuid: string
): Promise<OpportunityMetrics> {
  try {
    // campaign_opportunities doesn't have app_uuid - filter through campaign_id
    // (campaign_id already ensures app_uuid security since campaign has app_uuid)
    const { data: opportunities, error } = await supabase
      .from('campaign_opportunities')
      .select('id, status, current_stage_name')
      .eq('campaign_id', campaignId);

    if (error) {
      console.error('Error loading opportunity metrics:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        campaignId,
        appUuid,
      });
      return {
        total: 0,
        inProgress: 0,
        converted: 0,
        lost: 0,
        conversionRate: 0,
        lossRate: 0,
      };
    }

    const total = opportunities?.length || 0;
    const converted = opportunities?.filter(o => o.status === 'converted').length || 0;
    const lost = opportunities?.filter(o => o.status === 'lost').length || 0;
    const inProgress = opportunities?.filter(o => 
      o.status === 'active' || o.status === 'dormant'
    ).length || 0;

    return {
      total,
      inProgress,
      converted,
      lost,
      conversionRate: total > 0 ? (converted / total) * 100 : 0,
      lossRate: total > 0 ? (lost / total) * 100 : 0,
    };
  } catch (err: any) {
    console.error('Unexpected error loading opportunity metrics:', {
      message: err?.message,
      stack: err?.stack,
      campaignId,
      appUuid,
    });
    return {
      total: 0,
      inProgress: 0,
      converted: 0,
      lost: 0,
      conversionRate: 0,
      lossRate: 0,
    };
  }
}

/**
 * Load funnel stage distribution
 */
export async function loadFunnelDistribution(
  campaignId: string,
  funnelStages: { stages: FunnelStage[] },
  appUuid: string
): Promise<FunnelStageData[]> {
  try {
    // campaign_opportunities doesn't have app_uuid - filter through campaign_id
    const { data: opportunities, error } = await supabase
      .from('campaign_opportunities')
      .select('current_stage_name, status')
      .eq('campaign_id', campaignId);

    if (error) {
      console.error('Error loading funnel distribution:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        campaignId,
        appUuid,
      });
      return [];
    }

  // Count opportunities per stage
  const stageCounts: Record<string, number> = {};
  opportunities?.forEach(opp => {
    const stage = opp.current_stage_name;
    if (stage) {
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    }
  });

  // Build funnel data
  const funnelData: FunnelStageData[] = funnelStages.stages.map(stage => ({
    name: stage.name,
    order: stage.order,
    count: stageCounts[stage.name] || 0,
    percentage: 0, // Will calculate below
    isSuccess: stage.is_success,
    color: '#6b7280', // Default gray
  }));

  // Calculate percentages based on first stage
  const firstStageCount = funnelData[0]?.count || 1;
  funnelData.forEach(stage => {
    stage.percentage = (stage.count / firstStageCount) * 100;
  });

  return funnelData;
  } catch (err: any) {
    console.error('Unexpected error loading funnel distribution:', {
      message: err?.message,
      stack: err?.stack,
      campaignId,
      appUuid,
    });
    return [];
  }
}

/**
 * Load pipeline value metrics
 */
export async function loadPipelineValue(
  campaignId: string,
  funnelStages: { stages: FunnelStage[] },
  appUuid: string
): Promise<PipelineValue> {
  // campaign_opportunities doesn't have app_uuid - filter through campaign_id
  const { data: opportunities, error } = await supabase
    .from('campaign_opportunities')
    .select('current_stage_name, estimated_value, status')
    .eq('campaign_id', campaignId);

  if (error) {
    console.error('Error loading pipeline value:', error);
    throw error;
  }

  // Total pipeline value (active opportunities only)
  const activeOpps = opportunities?.filter(o => o.status === 'active') || [];
  const totalValue = activeOpps.reduce((sum, opp) => sum + (Number(opp.estimated_value) || 0), 0);

  // Value by stage
  const valueByStage: Record<string, number> = {};
  activeOpps.forEach(opp => {
    if (opp.estimated_value && opp.current_stage_name) {
      const stage = opp.current_stage_name;
      valueByStage[stage] = (valueByStage[stage] || 0) + Number(opp.estimated_value);
    }
  });

  // Average deal size
  const avgDealSize = activeOpps.length > 0 ? totalValue / activeOpps.length : 0;

  // Build stage breakdown
  const stageBreakdown = funnelStages.stages.map(stage => ({
    name: stage.name,
    value: valueByStage[stage.name] || 0,
    count: activeOpps.filter(o => o.current_stage_name === stage.name).length,
  }));

  return {
    totalValue,
    avgDealSize,
    stageBreakdown,
  };
}

/**
 * Load recent activity (last 10 interactions)
 */
export async function loadRecentActivity(
  campaignId: string,
  appUuid: string
): Promise<RecentActivity[]> {
  // First, get all opportunity IDs for this campaign
  // campaign_opportunities doesn't have app_uuid - filter through campaign_id
  const { data: opportunities, error: oppsError } = await supabase
    .from('campaign_opportunities')
    .select('id')
    .eq('campaign_id', campaignId);

  if (oppsError || !opportunities || opportunities.length === 0) {
    return [];
  }

  const opportunityIds = opportunities.map(o => o.id);

  // Get recent interactions for these opportunities
  // Try with new columns first (stage_name, etc.)
  let activities: any[] = [];
  let error: any = null;

  const { data, error: queryError } = await supabase
    .from('campaign_interactions')
    .select(`
      id,
      reference,
      interaction_date,
      interaction_type,
      stage_name,
      outcome,
      initiated_by:stakeholders!initiated_by_id (
        name
      ),
      opportunity:campaign_opportunities!opportunity_id (
        id,
        reference,
        stakeholder:stakeholders!stakeholder_id (
          name
        )
      )
    `)
    .eq('app_uuid', appUuid)
    .in('opportunity_id', opportunityIds)
    .order('interaction_date', { ascending: false })
    .limit(10);

  if (queryError) {
    // If columns don't exist, try fallback query
    if (queryError.code === '42703' || queryError.code === 'PGRST116' || queryError.message?.includes('column') || queryError.message?.includes('Could not find')) {
      console.warn('New columns not found in recent activity query, using fallback');
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('campaign_interactions')
        .select(`
          id,
          reference,
          interaction_date,
          interaction_type,
          outcome,
          initiated_by:stakeholders!initiated_by_id (
            name
          ),
          opportunity:campaign_opportunities!opportunity_id (
            id,
            reference,
            stakeholder:stakeholders!stakeholder_id (
              name
            )
          )
        `)
        .eq('app_uuid', appUuid)
        .in('opportunity_id', opportunityIds)
        .order('interaction_date', { ascending: false })
        .limit(10);

      if (fallbackError) {
        // Try even simpler fallback without nested relationships
        console.warn('Fallback query failed, trying minimal query');
        const { data: minimalData, error: minimalError } = await supabase
          .from('campaign_interactions')
          .select(`
            id,
            reference,
            interaction_date,
            interaction_type,
            outcome,
            opportunity_id
          `)
          .eq('app_uuid', appUuid)
          .in('opportunity_id', opportunityIds)
          .order('interaction_date', { ascending: false })
          .limit(10);

        if (minimalError) {
          console.error('Error loading recent activity (minimal fallback):', {
            message: minimalError.message,
            code: minimalError.code,
            details: minimalError.details,
            hint: minimalError.hint,
            campaignId,
            appUuid,
            opportunityIdsCount: opportunityIds.length,
          });
          return [];
        }
        // Return minimal data with placeholder values
        activities = (minimalData || []).map((item: any) => ({
          ...item,
          initiated_by: { name: 'Unknown' },
          opportunity: {
            id: item.opportunity_id,
            reference: 'N/A',
            stakeholder: { name: 'Unknown' },
          },
        }));
      } else {
        activities = fallbackData || [];
      }
    } else {
      console.error('Error loading recent activity:', {
        message: queryError.message,
        code: queryError.code,
        details: queryError.details,
        hint: queryError.hint,
        campaignId,
        appUuid,
        opportunityIdsCount: opportunityIds.length,
      });
      return [];
    }
  } else {
    activities = data || [];
  }

  return activities as RecentActivity[];
}

/**
 * Load upcoming actions (planned activities for next 7 days)
 */
export async function loadUpcomingActions(
  campaignId: string,
  appUuid: string
): Promise<UpcomingAction[]> {
  try {
    // First, get all opportunity IDs for this campaign
    const { data: opportunities, error: oppsError } = await supabase
      .from('campaign_opportunities')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('app_uuid', appUuid);

    if (oppsError || !opportunities || opportunities.length === 0) {
      return [];
    }

    const opportunityIds = opportunities.map(o => o.id);

    // Get interaction IDs for these opportunities
    const { data: interactions, error: interactionsError } = await supabase
      .from('campaign_interactions')
      .select('id')
      .eq('app_uuid', appUuid)
      .in('opportunity_id', opportunityIds);

    if (interactionsError || !interactions || interactions.length === 0) {
      return [];
    }

    const interactionIds = interactions.map(i => i.id);

    // Calculate date range (today to +7 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Get interaction details with upcoming planned dates
    const { data: actions, error } = await supabase
      .from('campaign_interaction_details')
      .select(`
        id,
        planned_action_type,
        planned_action_date,
        planned_notes,
        status,
        interaction:campaign_interactions!campaign_interaction_details_interaction_id_fkey (
          stage_name,
          opportunity:campaign_opportunities!campaign_interactions_opportunity_id_fkey (
            id,
            reference,
            stakeholder:stakeholders!campaign_opportunities_stakeholder_id_fkey (
              organization_name
            )
          )
        )
      `)
      .eq('status', 'planned')
      .in('interaction_id', interactionIds)
      .gte('planned_action_date', today.toISOString())
      .lte('planned_action_date', nextWeek.toISOString())
      .order('planned_action_date', { ascending: true });

    if (error) {
      // Table might not exist - return empty array
      if (error.code === 'PGRST116' || error.message?.includes('does not exist') || error.message?.includes('Could not find')) {
        console.warn('campaign_interaction_details table not found, returning empty actions');
        return [];
      }
      console.error('Error loading upcoming actions:', error);
      return [];
    }

    // Filter by campaign (via opportunity relationship)
    const filteredActions = (actions || []).filter(action => {
      return action.interaction?.opportunity?.id && opportunityIds.includes(action.interaction.opportunity.id);
    });

    return filteredActions as UpcomingAction[];
  } catch (err: any) {
    console.error('Error in loadUpcomingActions:', err);
    return [];
  }
}

/**
 * Load team activity (interaction counts per team member)
 */
export async function loadTeamActivity(
  campaignId: string,
  appUuid: string
): Promise<TeamMemberActivity[]> {
  // Get campaign with team members
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('owner_id, team_members')
    .eq('id', campaignId)
    .eq('app_uuid', appUuid)
    .single();

  if (campaignError || !campaign) {
    console.error('Error loading campaign for team activity:', campaignError);
    return [];
  }

  const teamMemberIds = [
    campaign.owner_id,
    ...(campaign.team_members || []),
  ].filter((id): id is string => Boolean(id));

  if (teamMemberIds.length === 0) {
    return [];
  }

  // Get all opportunity IDs for this campaign
  const { data: opportunities, error: oppsError } = await supabase
    .from('campaign_opportunities')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('app_uuid', appUuid);

  if (oppsError || !opportunities || opportunities.length === 0) {
    // Return team members with 0 activity
    const { data: members } = await supabase
      .from('stakeholders')
      .select('id, first_name, last_name, avatar_url')
      .in('id', teamMemberIds);

    return (members || []).map(member => ({
      id: member.id,
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      avatar_url: member.avatar_url,
      activityCount: 0,
    }));
  }

  const opportunityIds = opportunities.map(o => o.id);

  // Get activity counts per team member
  const { data: activities, error: activitiesError } = await supabase
    .from('campaign_interactions')
    .select('initiated_by_id')
    .eq('app_uuid', appUuid)
    .in('opportunity_id', opportunityIds)
    .in('initiated_by_id', teamMemberIds);

  if (activitiesError) {
    console.error('Error loading team activities:', activitiesError);
    // Still return team members with 0 activity
  }

  // Count activities per member
  const activityCounts: Record<string, number> = {};
  activities?.forEach(activity => {
    const memberId = activity.initiated_by_id;
    if (memberId) {
      activityCounts[memberId] = (activityCounts[memberId] || 0) + 1;
    }
  });

  // Get stakeholder details
  const { data: members, error: membersError } = await supabase
    .from('stakeholders')
    .select('id, first_name, last_name, avatar_url')
    .in('id', teamMemberIds);

  if (membersError) {
    console.error('Error loading team members:', membersError);
    return [];
  }

  // Combine data
  const teamActivity = (members || []).map(member => ({
    id: member.id,
    first_name: member.first_name || '',
    last_name: member.last_name || '',
    avatar_url: member.avatar_url,
    activityCount: activityCounts[member.id] || 0,
  }));

  return teamActivity.sort((a, b) => b.activityCount - a.activityCount);
}
