// ============================================================================
// BuildBid: Campaign Activity Monitor
// Manage opportunities through funnel stages, schedule actions, log interactions
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';
import Link from 'next/link';
import { ArrowLeft, Loader2, ArrowUpDown, ChevronRight, List, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminMenu from '@/components/admin/AdminMenu';
import OpportunityCard, { type Opportunity } from '@/lib/campaigns/components/OpportunityCard';
import {
  advanceOpportunityStage,
  markOpportunityWon,
  markOpportunityLost,
  calculateNextStage,
  findSuccessStage,
  findFailedStage,
  getCurrentInteraction,
} from '@/lib/campaigns/utils/interactionHelpers';
import { calculateStageCounts } from '@/lib/campaigns/utils/funnelHelpers';
import type { Campaign, CampaignType, FunnelStage } from '@/lib/types/campaign';

interface CampaignDetail extends Campaign {
  campaign_type?: CampaignType;
  owner?: {
    id: string;
    name: string;
    email: string | null;
    reference: string;
  };
}

export default function CampaignActivityPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const campaignId = params?.campaign_id as string;
  
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'overdue' | 'today' | 'week'>('all');
  const [sortBy, setSortBy] = useState<'last_interaction' | 'next_follow_up_date' | 'estimated_value' | 'stakeholder_name' | 'engagement_level'>('last_interaction');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'simple' | 'extended'>('extended');
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [appUuid, setAppUuid] = useState<string | null>(null);
  const [processingOpportunityId, setProcessingOpportunityId] = useState<string | null>(null);
  const [actualOpportunityCount, setActualOpportunityCount] = useState<number>(0);
  const [lastActivities, setLastActivities] = useState<Record<string, { type: string; date: string }>>({});

  useEffect(() => {
    const checkAccessAndLoadData = async () => {
      if (authLoading || !user || !campaignId) return;

      try {
        const currentAppUuid = await getCurrentAppUuid();
        if (!currentAppUuid) {
          setLoading(false);
          return;
        }
        setAppUuid(currentAppUuid);

        // Check user role
        const { data: stakeholder, error: stakeholderError } = await supabase
          .from('stakeholders')
          .select(`
            id,
            stakeholder_roles!inner(
              roles:role_id(code)
            )
          `)
          .eq('auth_user_id', user.id)
          .single();

        if (stakeholderError || !stakeholder) {
          setHasPermission(false);
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to access this page',
            variant: 'destructive',
          });
          router.push('/dashboard');
          return;
        }

        // Check if user has required role
        const hasRequiredRole = stakeholder.stakeholder_roles?.some(
          (sr: any) => {
            const roleCode = sr.roles?.code?.toLowerCase();
            return roleCode === 'administrator' || roleCode === 'admin' || 
                   roleCode === 'campaign_admin' || roleCode === 'external_consultant';
          }
        );

        if (!hasRequiredRole) {
          setHasPermission(false);
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to access this page',
            variant: 'destructive',
          });
          router.push('/dashboard');
          return;
        }

        setHasPermission(true);
        await loadCampaign(currentAppUuid);
      } catch (err: any) {
        console.error('Error checking access:', err);
        toast({
          title: 'Error',
          description: 'Failed to load campaign data',
          variant: 'destructive',
        });
        setLoading(false);
      }
    };

    checkAccessAndLoadData();
  }, [authLoading, user, campaignId, router, toast]);

  useEffect(() => {
    if (campaign?.campaign_type?.funnel_stages?.stages && selectedStage) {
      loadOpportunities();
      calculateStageCountsData();
    }
  }, [selectedStage, filter, sortBy, sortOrder, campaign]);

  // Set initial selected stage when campaign loads
  useEffect(() => {
    if (campaign?.campaign_type?.funnel_stages?.stages && !selectedStage) {
      const stages = campaign.campaign_type.funnel_stages.stages;
      const sortedStages = [...stages].sort((a, b) => a.order - b.order);
      const firstInProgressStage = sortedStages.find(s => s.is_success === undefined);
      if (firstInProgressStage) {
        setSelectedStage(firstInProgressStage.name);
      }
    }
  }, [campaign, selectedStage]);

  // Calculate opportunity count when campaign loads
  useEffect(() => {
    if (campaign && campaignId && appUuid) {
      calculateStageCountsData();
    }
  }, [campaign, campaignId, appUuid]);

  const loadCampaign = async (appUuid: string) => {
    try {
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select(`
          *,
          campaign_type:campaign_types!campaign_type_id(
            id,
            code,
            name,
            description,
            funnel_stages,
            auto_advance_enabled,
            auto_advance_days,
            metadata
          ),
          owner:stakeholders!owner_id(
            id,
            name,
            email
          )
        `)
        .eq('id', campaignId)
        .eq('app_uuid', appUuid)
        .single();

      if (campaignError) {
        console.error('Error loading campaign:', campaignError);
        toast({
          title: 'Error',
          description: campaignError.message || 'Failed to load campaign',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (!campaignData) {
        toast({
          title: 'Error',
          description: 'Campaign not found',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      setCampaign(campaignData as CampaignDetail);
    } catch (err: any) {
      console.error('Error loading campaign:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to load campaign',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStageCountsData = async () => {
    if (!campaign || !campaignId) return;

    try {
      // Include 'active', 'converted' (won), and 'lost' opportunities in the counts
      const { data: opportunitiesData, error: oppsError } = await supabase
        .from('campaign_opportunities')
        .select('current_stage_name, status')
        .eq('campaign_id', campaignId)
        .in('status', ['active', 'converted', 'lost']);

      if (!oppsError && opportunitiesData) {
        // Update actual opportunity count
        setActualOpportunityCount(opportunitiesData.length);

        if (campaign.campaign_type?.funnel_stages?.stages) {
          const counts = calculateStageCounts(
            opportunitiesData,
            campaign.campaign_type.funnel_stages.stages
          );
          setStageCounts(counts);
        }
      }
    } catch (err) {
      console.error('Error calculating stage counts:', err);
    }
  };

  const loadOpportunities = async () => {
    if (!campaign || !campaignId || !selectedStage || !appUuid) return;

    try {
      // Determine which statuses to include based on the selected stage
      const stages = campaign.campaign_type?.funnel_stages?.stages || [];
      const selectedStageData = stages.find((s: FunnelStage) => s.name === selectedStage);
      const isSuccessStage = selectedStageData?.is_success === true;
      const isFailedStage = selectedStageData?.is_success === false;
      
      // For success/failed stages, include converted/lost opportunities; otherwise only active
      const statusFilter = isSuccessStage 
        ? ['converted'] 
        : isFailedStage 
        ? ['lost'] 
        : ['active'];

      let query = supabase
        .from('campaign_opportunities')
        .select(`
          id,
          reference,
          current_stage_name,
          engagement_level,
          last_interaction,
          next_follow_up_date,
          status,
          estimated_value,
          metadata,
          stakeholder:stakeholders!stakeholder_id(
            id,
            name,
            email,
            phone,
            website,
            size_employees
          )
        `)
        .eq('campaign_id', campaignId)
        .eq('current_stage_name', selectedStage)
        .in('status', statusFilter);

      // Apply date filters (only for active opportunities, not for won/lost)
      if (!isSuccessStage && !isFailedStage) {
        const today = new Date().toISOString().split('T')[0];
        if (filter === 'overdue') {
          query = query.lt('next_follow_up_date', today);
        } else if (filter === 'today') {
          query = query.eq('next_follow_up_date', today);
        } else if (filter === 'week') {
          const weekEnd = new Date();
          weekEnd.setDate(weekEnd.getDate() + 7);
          const weekEndStr = weekEnd.toISOString().split('T')[0];
          query = query.gte('next_follow_up_date', today).lte('next_follow_up_date', weekEndStr);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading opportunities:', error);
        toast({
          title: 'Error',
          description: 'Failed to load opportunities',
          variant: 'destructive',
        });
        return;
      }

      if (data && campaign.campaign_type?.funnel_stages?.stages) {
        // Add stage order number to each opportunity
        const withStageOrder = data.map((opp: any) => {
          const stage = campaign.campaign_type!.funnel_stages!.stages.find(
            (s: FunnelStage) => s.name === opp.current_stage_name
          );
          return {
            ...opp,
            stage_order: stage?.order || 0,
          };
        });

        // Sort opportunities based on selected sort option
        let sortedOpportunities = withStageOrder.sort((a: any, b: any) => {
          let aValue: any;
          let bValue: any;

          switch (sortBy) {
            case 'last_interaction':
              aValue = a.last_interaction ? new Date(a.last_interaction).getTime() : 0;
              bValue = b.last_interaction ? new Date(b.last_interaction).getTime() : 0;
              break;
            case 'next_follow_up_date':
              aValue = a.next_follow_up_date ? new Date(a.next_follow_up_date).getTime() : 0;
              bValue = b.next_follow_up_date ? new Date(b.next_follow_up_date).getTime() : 0;
              break;
            case 'estimated_value':
              aValue = a.estimated_value || 0;
              bValue = b.estimated_value || 0;
              break;
            case 'stakeholder_name':
              aValue = (a.stakeholder?.name || '').toLowerCase();
              bValue = (b.stakeholder?.name || '').toLowerCase();
              break;
            case 'engagement_level':
              const engagementOrder = { cold: 1, warm: 2, hot: 3, engaged: 4, inactive: 5 };
              aValue = engagementOrder[a.engagement_level as keyof typeof engagementOrder] || 0;
              bValue = engagementOrder[b.engagement_level as keyof typeof engagementOrder] || 0;
              break;
            default:
              return 0;
          }

          // Handle string comparison
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortOrder === 'asc' 
              ? aValue.localeCompare(bValue)
              : bValue.localeCompare(aValue);
          }

          // Handle numeric/date comparison
          return sortOrder === 'asc' 
            ? (aValue > bValue ? 1 : aValue < bValue ? -1 : 0)
            : (aValue < bValue ? 1 : aValue > bValue ? -1 : 0);
        });

        setOpportunities(sortedOpportunities as Opportunity[]);

        // Fetch last activities for display on cards (handles existing data where last_interaction may be null)
        if (withStageOrder.length > 0) {
          try {
            const ids = withStageOrder.map((o: any) => o.id).join(',');
            const res = await fetch(`/api/campaigns/opportunities/last-activities?ids=${encodeURIComponent(ids)}`);
            if (res.ok) {
              const activities = await res.json();
              setLastActivities(activities);
            }
          } catch (err) {
            console.warn('Failed to fetch last activities:', err);
          }
        } else {
          setLastActivities({});
        }
      } else {
        setOpportunities([]);
        setLastActivities({});
      }
    } catch (err: any) {
      console.error('Error loading opportunities:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to load opportunities',
        variant: 'destructive',
      });
    }
  };

  const handleScheduleAndAdvance = async (
    opportunityId: string,
    params: {
      outcome: string;
      nextStageName: string;
    }
  ) => {
    if (!campaign?.campaign_type?.funnel_stages?.stages || !appUuid) return;

    setProcessingOpportunityId(opportunityId);
    try {
      // Get current stakeholder ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: stakeholder } = await supabase
        .from('stakeholders')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!stakeholder) {
        throw new Error('Stakeholder not found');
      }

      // Get current interaction
      let currentInteraction = await getCurrentInteraction(opportunityId, appUuid);
      
      // If no interaction exists, this might be an old opportunity - create one
      if (!currentInteraction) {
        // Get current stage from opportunity
        const { data: opp } = await supabase
          .from('campaign_opportunities')
          .select('current_stage_name')
          .eq('id', opportunityId)
          .single();

        if (!opp?.current_stage_name) {
          throw new Error('Cannot determine current stage');
        }

        // Create interaction for current stage
        // Try with new columns first, fallback to old structure if migration hasn't run
        let newInteraction: any = null;
        let createError: any = null;

        // Try with new columns (stage_name, status, opened_at)
        const insertData: any = {
          opportunity_id: opportunityId,
          interaction_type: 'other',
          notes: `Stage opened: ${opp.current_stage_name}`,
          app_uuid: appUuid,
          initiated_by_id: stakeholder.id,
        };

        // Try adding new columns
        try {
          insertData.stage_name = opp.current_stage_name;
          insertData.status = 'open';
          insertData.opened_at = new Date().toISOString();

          const { data, error } = await supabase
            .from('campaign_interactions')
            .insert(insertData)
            .select('id, stage_name, status, opened_at')
            .single();

          if (error) {
            // If columns don't exist, try fallback
            if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
              throw error; // Will be caught by fallback below
            }
            createError = error;
          } else {
            newInteraction = data;
          }
        } catch (err: any) {
          // Fallback to old structure (interaction_date instead of opened_at)
          console.warn('New columns not found, using fallback structure');
          const fallbackData = {
            opportunity_id: opportunityId,
            interaction_type: 'other',
            notes: `Stage opened: ${opp.current_stage_name}`,
            app_uuid: appUuid,
            initiated_by_id: stakeholder.id,
            interaction_date: new Date().toISOString(),
          };

          const { data: fallbackResult, error: fallbackErr } = await supabase
            .from('campaign_interactions')
            .insert(fallbackData)
            .select('id, interaction_date')
            .single();

          if (fallbackErr || !fallbackResult) {
            createError = fallbackErr || new Error('Failed to create interaction');
          } else {
            // Convert to new format
            newInteraction = {
              id: fallbackResult.id,
              stage_name: opp.current_stage_name,
              status: 'open',
              opened_at: fallbackResult.interaction_date || new Date().toISOString(),
            };
          }
        }

        if (createError || !newInteraction) {
          throw new Error('Failed to create interaction: ' + (createError?.message || 'Unknown error'));
        }

        currentInteraction = newInteraction;
      }

      // Advance to next stage using new two-table system
      await advanceOpportunityStage({
        opportunityId,
        nextStageName: params.nextStageName,
        currentInteractionId: currentInteraction.id,
        outcome: params.outcome,
        appUuid,
        initiatedById: stakeholder.id,
      });

      // Advance to next stage using new two-table system
      await advanceOpportunityStage({
        opportunityId,
        nextStageName: params.nextStageName,
        currentInteractionId: currentInteraction.id,
        outcome: params.outcome,
        appUuid,
        initiatedById: stakeholder.id,
      });

      toast({
        title: 'Success',
        description: `Stage advanced to ${params.nextStageName}`,
      });

      // Reload opportunities and counts
      await loadOpportunities();
      await calculateStageCountsData();
    } catch (err: any) {
      console.error('Error in Save & Advance:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to advance stage',
        variant: 'destructive',
      });
    } finally {
      setProcessingOpportunityId(null);
    }
  };

  const handleMarkLost = async (
    opportunityId: string,
    params: { outcome: string }
  ) => {
    if (!campaign?.campaign_type?.funnel_stages?.stages || !appUuid) return;

    setProcessingOpportunityId(opportunityId);
    try {
      // Get current stakeholder ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: stakeholder } = await supabase
        .from('stakeholders')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!stakeholder) {
        throw new Error('Stakeholder not found');
      }

      const stages = campaign.campaign_type.funnel_stages.stages;
      const failedStage = findFailedStage(stages);
      
      if (!failedStage) {
        toast({
          title: 'Error',
          description: 'Failed stage not found in funnel',
          variant: 'destructive',
        });
        return;
      }

      // Get current interaction (may be null)
      const currentInteraction = await getCurrentInteraction(opportunityId, appUuid);

      await markOpportunityLost({
        opportunityId,
        finalStageName: failedStage.name,
        currentInteractionId: currentInteraction?.id || null,
        outcome: params.outcome,
        appUuid,
        initiatedById: stakeholder.id,
      });

      toast({
        title: 'Success',
        description: 'Opportunity marked as lost',
      });

      // Reload opportunities and counts
      await loadOpportunities();
      await calculateStageCountsData();
    } catch (err: any) {
      console.error('Error marking as lost:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to mark as lost',
        variant: 'destructive',
      });
    } finally {
      setProcessingOpportunityId(null);
    }
  };

  const handleMarkWon = async (
    opportunityId: string,
    params: { outcome: string }
  ) => {
    if (!campaign?.campaign_type?.funnel_stages?.stages || !appUuid) return;

    setProcessingOpportunityId(opportunityId);
    try {
      // Get current stakeholder ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: stakeholder } = await supabase
        .from('stakeholders')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!stakeholder) {
        throw new Error('Stakeholder not found');
      }

      const stages = campaign.campaign_type.funnel_stages.stages;
      const successStage = findSuccessStage(stages);
      
      if (!successStage) {
        toast({
          title: 'Error',
          description: 'Success stage not found in funnel',
          variant: 'destructive',
        });
        return;
      }

      // Get current interaction (may be null)
      const currentInteraction = await getCurrentInteraction(opportunityId, appUuid);

      await markOpportunityWon({
        opportunityId,
        finalStageName: successStage.name,
        currentInteractionId: currentInteraction?.id || null,
        outcome: params.outcome,
        appUuid,
        initiatedById: stakeholder.id,
      });

      toast({
        title: 'Success',
        description: 'Opportunity marked as won',
      });

      // Reload opportunities and counts
      await loadOpportunities();
      await calculateStageCountsData();
    } catch (err: any) {
      console.error('Error marking as won:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to mark as won',
        variant: 'destructive',
      });
    } finally {
      setProcessingOpportunityId(null);
    }
  };

  if (authLoading || loading || hasPermission === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasPermission === false || !campaign) {
    return null; // Will redirect
  }

  const stages = campaign.campaign_type?.funnel_stages?.stages || [];
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  const formatNextAction = (opp: Opportunity, lastActivity: { type: string; date: string } | undefined) => {
    if (lastActivity?.date) {
      const actionLabels: Record<string, string> = {
        email: 'Email',
        call: 'Call',
        meeting: 'Meeting',
        demo: 'Demo',
      };
      const date = new Date(lastActivity.date);
      const dateStr = date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${actionLabels[lastActivity.type] || lastActivity.type} - ${dateStr}`;
    }
    if (opp.next_follow_up_date) {
      const date = new Date(opp.next_follow_up_date);
      return `Follow-up: ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    }
    return 'No action scheduled';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminMenu />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white p-6 rounded-lg mb-5">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard/admin/campaigns">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold mb-2 text-gray-900">{campaign.name}</h1>
              <div className="flex gap-6 text-sm text-gray-600 flex-wrap">
                <span>📋 {campaign.reference}</span>
                {campaign.campaign_type && (
                  <span>🎯 {campaign.campaign_type.name}</span>
                )}
                {campaign.owner && (
                  <span>👤 {campaign.owner.name}</span>
                )}
                <span>
                  📊 {actualOpportunityCount} / {campaign.target_count || 'N/A'} opportunities
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid md:grid-cols-[320px_1fr] gap-5 items-start">
          {/* Funnel Sidebar */}
          <Card className="md:sticky md:top-5">
            <CardContent className="pt-6">
              <h2 className="text-base font-semibold mb-4">Pipeline Stages</h2>
              
              {sortedStages.map((stage, index) => {
                const isSelected = selectedStage === stage.name;
                const isSuccess = stage.is_success === true;
                const isFailed = stage.is_success === false;
                const count = stageCounts[stage.name] || 0;
                const showConnector = index < sortedStages.length - 1;

                return (
                  <div key={stage.name}>
                    <div
                      className={`
                        flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all mb-2
                        ${isSelected
                          ? 'border-[#902ed1] bg-[#f3ebf9]'
                          : isSuccess
                          ? 'border-green-500 bg-green-50'
                          : isFailed
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300 bg-gray-50 hover:border-purple-600 hover:bg-[#f9f5fc]'
                        }
                        ${!isSuccess && !isFailed ? 'hover:border-purple-600' : ''}
                      `}
                      onClick={() => {
                        // Allow clicking on all stages to view their opportunities
                        setSelectedStage(stage.name);
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0
                          ${isSuccess ? 'bg-green-500' : isFailed ? 'bg-red-500' : 'bg-[#902ed1]'}
                        `}>
                          {isSuccess ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : isFailed ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          ) : (
                            stage.order
                          )}
                        </div>
                        <div className="text-sm font-medium truncate">{stage.name}</div>
                      </div>
                      <div className={`
                        min-w-[32px] h-7 rounded-full flex items-center justify-center px-2 text-white text-xs font-semibold flex-shrink-0
                        ${isSuccess ? 'bg-green-500' : isFailed ? 'bg-red-500' : 'bg-[#902ed1]'}
                      `}>
                        {count}
                      </div>
                    </div>
                    {showConnector && (
                      <div className="h-4 w-0.5 bg-gray-300 ml-[31px] mb-2" />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Opportunities List */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-5 flex-wrap gap-4">
                <h2 className="text-lg font-semibold">
                  {selectedStage} ({stageCounts[selectedStage] || 0})
                </h2>
                <div className="flex gap-2 items-center flex-wrap">
                  {/* View Toggle */}
                  <div className="flex items-center gap-1 border rounded-md p-1">
                    <Button
                      onClick={() => setViewMode('simple')}
                      variant={viewMode === 'simple' ? 'default' : 'ghost'}
                      size="sm"
                      className={`h-8 px-2 ${viewMode === 'simple' ? 'bg-[#902ed1] hover:bg-[#7c2d9c] text-white' : ''}`}
                      title="Simple list view"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => setViewMode('extended')}
                      variant={viewMode === 'extended' ? 'default' : 'ghost'}
                      size="sm"
                      className={`h-8 px-2 ${viewMode === 'extended' ? 'bg-[#902ed1] hover:bg-[#7c2d9c] text-white' : ''}`}
                      title="Extended card view"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* Sort Controls */}
                  <div className="flex items-center gap-2">
                    <Select
                      value={sortBy}
                      onValueChange={(value: any) => setSortBy(value)}
                    >
                      <SelectTrigger className="w-[180px] h-9">
                        <div className="flex items-center gap-2">
                          <ArrowUpDown className="h-4 w-4" />
                          <SelectValue placeholder="Sort by" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last_interaction">Last Interaction</SelectItem>
                        <SelectItem value="next_follow_up_date">Next Follow-up</SelectItem>
                        <SelectItem value="estimated_value">Estimated Value</SelectItem>
                        <SelectItem value="stakeholder_name">Stakeholder Name</SelectItem>
                        <SelectItem value="engagement_level">Engagement Level</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      variant="outline"
                      size="sm"
                      className="h-9 px-3"
                      title={sortOrder === 'asc' ? 'Ascending - Click for Descending' : 'Descending - Click for Ascending'}
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </Button>
                  </div>
                  {/* Filter Buttons */}
                  <div className="flex gap-2">
                    {(['all', 'overdue', 'today', 'week'] as const).map(f => (
                      <Button
                        key={f}
                        onClick={() => setFilter(f)}
                        variant={filter === f ? 'default' : 'outline'}
                        size="sm"
                        className={filter === f ? 'bg-[#902ed1] hover:bg-[#7c2d9c]' : ''}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Opportunity Cards */}
              {opportunities.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <p>No opportunities at this stage</p>
                </div>
              ) : viewMode === 'simple' ? (
                // Simple List View - Mobile-friendly (max 300px width)
                <div className="max-w-[300px] mx-auto space-y-2">
                  {opportunities.map(opp => {
                    const lastActivity = lastActivities[opp.id];
                    const nextAction = formatNextAction(opp, lastActivity);
                    
                    return (
                      <div
                        key={opp.id}
                        onClick={() => {
                          // Switch to extended view when clicking a simple list item
                          setViewMode('extended');
                        }}
                        className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-[#902ed1] hover:bg-purple-50 transition-all flex items-center justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-900 truncate">
                            {opp.stakeholder.name}
                          </div>
                          <div className="text-xs text-gray-600 truncate mt-1">
                            {nextAction}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Extended Card View
                opportunities.map(opp => {
                  // Calculate next stage for this opportunity
                  const stages = campaign.campaign_type?.funnel_stages?.stages || [];
                  const nextStage = calculateNextStage(opp.current_stage_name, stages);
                  
                  // Debug logging
                  if (!nextStage && stages.length > 0) {
                    console.log('[Activity Page] No next stage found for opportunity:', {
                      opportunityId: opp.id,
                      currentStageName: opp.current_stage_name,
                      stagesCount: stages.length,
                      stages: stages.map(s => ({ name: s.name, order: s.order, is_success: s.is_success })),
                    });
                  }
                  
                  const lastActivity = lastActivities[opp.id];
                  
                  return (
                    <OpportunityCard
                      key={opp.id}
                      opportunity={opp}
                      lastActivity={lastActivity}
                      onScheduleAndAdvance={(params) => handleScheduleAndAdvance(opp.id, params)}
                      onMarkLost={(params) => handleMarkLost(opp.id, params)}
                      onMarkWon={(params) => handleMarkWon(opp.id, params)}
                      onActivityCompleted={() => {
                        // Reload last activities when activity is completed
                        loadOpportunities();
                      }}
                      isProcessing={processingOpportunityId === opp.id}
                      appUuid={appUuid || ''}
                      nextStageName={nextStage?.name}
                    />
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
