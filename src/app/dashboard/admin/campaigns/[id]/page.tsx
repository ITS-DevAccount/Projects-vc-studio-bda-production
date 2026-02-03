// ============================================================================
// BuildBid: Campaign Detail Page
// Admin view of individual campaign with details and management options
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';
import Link from 'next/link';
import { ArrowLeft, Loader2, Edit, Calendar, User, Users, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminMenu from '@/components/admin/AdminMenu';
import FunnelStageDisplay from '@/lib/campaigns/components/FunnelStageDisplay';
import { calculateStageCounts, calculateConversionRate } from '@/lib/campaigns/utils/funnelHelpers';
import type { Campaign, CampaignType } from '@/lib/types/campaign';

interface CampaignDetail extends Campaign {
  campaign_type?: CampaignType;
  owner?: {
    id: string;
    name: string;
    email: string | null;
    reference: string;
  };
  team_members_details?: Array<{
    id: string;
    name: string;
    email: string | null;
  }>;
}

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [totalOpportunities, setTotalOpportunities] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);

  const campaignId = params?.id as string;

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
      return;
    }
    if (campaignId) {
      loadCampaign();
    }
  }, [campaignId, user, authLoading, router]);

  const loadCampaign = async () => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);

    try {
      // Get app_uuid for filtering
      const currentAppUuid = await getCurrentAppUuid();
      if (!currentAppUuid) {
        setError('Unable to determine app context');
        setLoading(false);
        return;
      }

      // Load campaign with related data using server-side filtering
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
        .eq('app_uuid', currentAppUuid)
        .single();

      if (campaignError) {
        console.error('Error loading campaign:', campaignError);
        setError(campaignError.message || 'Failed to load campaign');
        setLoading(false);
        return;
      }

      if (!campaignData) {
        setError('Campaign not found');
        setLoading(false);
        return;
      }

      // Load team members details if team_members array exists
      let teamMembersDetails: any[] = [];
      if (campaignData.team_members && campaignData.team_members.length > 0) {
        const { data: teamData, error: teamError } = await supabase
          .from('stakeholders')
          .select('id, name, email')
          .in('id', campaignData.team_members);

        if (!teamError && teamData) {
          teamMembersDetails = teamData;
        }
      }

      setCampaign({
        ...campaignData,
        team_members_details: teamMembersDetails,
      } as CampaignDetail);

      // Fetch opportunities and calculate stage counts
      if (campaignData.campaign_type?.funnel_stages?.stages) {
        const { data: opportunitiesData, error: oppsError } = await supabase
          .from('campaign_opportunities')
          .select('current_stage_name, status')
          .eq('campaign_id', campaignId)
          .eq('status', 'active');

        if (!oppsError && opportunitiesData) {
          const counts = calculateStageCounts(
            opportunitiesData,
            campaignData.campaign_type.funnel_stages.stages
          );
          setStageCounts(counts);
          setTotalOpportunities(opportunitiesData.length);
          
          const rate = calculateConversionRate(
            opportunitiesData,
            campaignData.campaign_type.funnel_stages.stages
          );
          setConversionRate(rate);
        } else if (oppsError) {
          console.error('Error loading opportunities:', oppsError);
          // Don't fail the page if opportunities fail to load
          setStageCounts({});
        }
      }
    } catch (err: any) {
      console.error('Error loading campaign:', err);
      setError(err.message || 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'planning':
        return 'secondary';
      case 'active':
        return 'default';
      case 'paused':
        return 'outline';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const calculateProgress = () => {
    if (!campaign?.target_count || campaign.target_count === 0) return 0;
    return Math.min(100, Math.round((campaign.actual_count / campaign.target_count) * 100));
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <AdminMenu />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-red-600 mb-4">{error || 'Campaign not found'}</p>
                <Link href="/dashboard/admin/campaigns">
                  <Button variant="outline">Back to Campaigns</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminMenu />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/admin/campaigns">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
              <p className="text-gray-600 text-sm mt-1">
                Reference: {campaign.reference}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(campaign.status)}>
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </Badge>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Details */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {campaign.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Description</h3>
                    <p className="text-gray-600">{campaign.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Campaign Type</h3>
                    <p className="text-gray-600">
                      {campaign.campaign_type?.name || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Created</h3>
                    <p className="text-gray-600">
                      {formatDate(campaign.created_at)}
                    </p>
                  </div>
                </div>

                {/* Funnel Stages Display */}
                {campaign.campaign_type && (
                  <FunnelStageDisplay
                    stages={campaign.campaign_type.funnel_stages?.stages || []}
                    mode="overview"
                    stageCounts={stageCounts}
                    autoAdvanceEnabled={campaign.campaign_type.auto_advance_enabled}
                    autoAdvanceDays={campaign.campaign_type.auto_advance_days}
                    totalOpportunities={totalOpportunities}
                    conversionRate={conversionRate}
                  />
                )}
              </CardContent>
            </Card>

            {/* Opportunities Section - Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">
                    No opportunities yet. Upload OCDS files to add leads.
                  </p>
                  <Link href={`/dashboard/admin/campaigns/${campaign.id}/seed`}>
                    <Button>
                      <Target className="h-4 w-4 mr-2" />
                      Upload OCDS Files
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Campaign Owner */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Owner
                </CardTitle>
              </CardHeader>
              <CardContent>
                {campaign.owner ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm text-primary">
                        {campaign.owner.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">
                        {campaign.owner.name}
                      </p>
                      {campaign.owner.email && (
                        <p className="text-sm text-gray-500">{campaign.owner.email}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No owner assigned</p>
                )}
              </CardContent>
            </Card>

            {/* Team Members */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                {campaign.team_members_details && campaign.team_members_details.length > 0 ? (
                  <div className="space-y-3">
                    {campaign.team_members_details.map((member) => (
                      <div key={member.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs text-primary">
                            {member.name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {member.name}
                          </p>
                          {member.email && (
                            <p className="text-xs text-gray-500">{member.email}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No team members assigned</p>
                )}
              </CardContent>
            </Card>

            {/* Campaign Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Target Count</span>
                    <span className="text-sm font-semibold">
                      {campaign.target_count || 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Actual Count</span>
                    <span className="text-sm font-semibold">{campaign.actual_count}</span>
                  </div>
                  {campaign.target_count && campaign.target_count > 0 && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${calculateProgress()}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {calculateProgress()}% complete
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Success Rate</span>
                    <span className="text-sm font-semibold">
                      {campaign.success_rate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500">Launch Date</p>
                  <p className="text-sm font-medium">{formatDate(campaign.launch_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">End Date</p>
                  <p className="text-sm font-medium">{formatDate(campaign.end_date)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

