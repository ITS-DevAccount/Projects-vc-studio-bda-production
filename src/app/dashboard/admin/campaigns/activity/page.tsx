// ============================================================================
// BuildBid: Campaign Activity Monitor List Page
// Lists active campaigns with "Monitor Activity" buttons to manage opportunities
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';
import Link from 'next/link';
import { ArrowLeft, Loader2, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminMenu from '@/components/admin/AdminMenu';
import type { Campaign } from '@/lib/types/campaign';

export default function CampaignActivityListPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAccessAndLoadData = async () => {
      if (authLoading || !user) return;

      try {
        const currentAppUuid = await getCurrentAppUuid();
        if (!currentAppUuid) {
          setLoading(false);
          return;
        }

        // Check user role and get stakeholder ID
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

        // Check if user is admin/campaign_admin
        const hasAdminRole = stakeholder.stakeholder_roles?.some(
          (sr: any) => {
            const roleCode = sr.roles?.code?.toLowerCase();
            return roleCode === 'administrator' || roleCode === 'admin' || roleCode === 'campaign_admin';
          }
        );

        setIsAdmin(hasAdminRole);

        // External consultants also have access, but see only their campaigns
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

        // Load campaigns
        await loadCampaigns(currentAppUuid, hasAdminRole ? null : stakeholder.id);
      } catch (err: any) {
        console.error('Error loading data:', err);
        toast({
          title: 'Error',
          description: 'Failed to load campaigns',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    checkAccessAndLoadData();
  }, [authLoading, user, router, toast]);

  const loadCampaigns = async (appUuid: string, ownerId: string | null) => {
    try {
      let query = supabase
        .from('campaigns')
        .select(`
          *,
          campaign_type:campaign_types!campaign_type_id(id, code, name, description, funnel_stages),
          owner:stakeholders!owner_id(id, name, email)
        `)
        .eq('app_uuid', appUuid)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // Filter by owner_id for non-admin users
      if (ownerId) {
        query = query.eq('owner_id', ownerId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Calculate actual_count for each campaign
      if (data && data.length > 0) {
        const campaignIds = data.map((c: any) => c.id);
        const { data: opportunityCounts, error: countError } = await supabase
          .from('campaign_opportunities')
          .select('campaign_id')
          .in('campaign_id', campaignIds);

        if (countError) {
          console.error('[ACTIVITY] Error counting opportunities:', countError);
        }

        // Count opportunities per campaign
        const countsByCampaign = new Map<string, number>();
        (opportunityCounts || []).forEach((opp: any) => {
          const current = countsByCampaign.get(opp.campaign_id) || 0;
          countsByCampaign.set(opp.campaign_id, current + 1);
        });

        // Add opportunity count to each campaign
        const campaignsWithCounts = data.map((campaign: any) => ({
          ...campaign,
          actual_count: countsByCampaign.get(campaign.id) || 0,
        }));

        setCampaigns(campaignsWithCounts);
      } else {
        setCampaigns([]);
      }
    } catch (err: any) {
      console.error('Error loading campaigns:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to load campaigns',
        variant: 'destructive',
      });
    }
  };

  const handleMonitorClick = (campaignId: string) => {
    router.push(`/dashboard/admin/campaigns/activity/${campaignId}`);
  };

  if (authLoading || loading || hasPermission === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasPermission === false) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminMenu />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/admin/campaigns"
              className="hover:text-[#2563eb] transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2563eb]/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#2563eb]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Campaign Activity Monitor</h1>
                <p className="text-gray-600 text-sm mt-1">
                  Track interactions, schedule follow-ups, manage pipeline
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Campaigns List */}
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  {isAdmin
                    ? 'No active campaigns found. Create a campaign to get started.'
                    : 'No active campaigns found that you own.'}
                </p>
                <Link href="/dashboard/admin/campaigns/create">
                  <Button className="bg-[#2563eb] hover:bg-[#1d4ed8]">
                    <Activity className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between flex-col sm:flex-row gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-xl font-semibold text-gray-900">{campaign.name}</h3>
                        <span className="text-sm text-gray-500">{campaign.reference}</span>
                      </div>

                      {campaign.description && (
                        <p className="text-gray-600 mb-4 line-clamp-2">{campaign.description}</p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        {campaign.campaign_type && (
                          <div>
                            <span className="font-medium">Type: </span>
                            {campaign.campaign_type.name}
                          </div>
                        )}
                        {campaign.owner && (
                          <div>
                            <span className="font-medium">Owner: </span>
                            {campaign.owner.name}
                          </div>
                        )}
                        {campaign.target_count && (
                          <div>
                            <span className="font-medium">Target: </span>
                            {campaign.target_count} opportunities
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Progress: </span>
                          {campaign.actual_count} / {campaign.target_count || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <Button
                        onClick={() => handleMonitorClick(campaign.id)}
                        className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
                      >
                        <Activity className="h-4 w-4 mr-2" />
                        Monitor Activity
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
