// ============================================================================
// BuildBid: Campaigns List Page
// Admin view of all campaigns with filtering, sorting, and create button
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';
import Link from 'next/link';
import { 
  Plus, 
  Loader2, 
  Search,
  ArrowLeft,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminMenu from '@/components/admin/AdminMenu';
import { canTerminateCampaign } from '@/lib/campaigns/campaigns';
import type { Campaign } from '@/lib/types/campaign';

export default function CampaignsListPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [appUuid, setAppUuid] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const checkAccessAndLoadData = async () => {
      if (authLoading || !user) return;

      try {
        const currentAppUuid = await getCurrentAppUuid();
        if (!currentAppUuid) {
          setLoading(false);
          return;
        }
        setAppUuid(currentAppUuid);

        // Check admin permission
        const { data: stakeholder } = await supabase
          .from('stakeholders')
          .select(`
            id,
            stakeholder_roles!inner(
              roles:role_id(code)
            )
          `)
          .eq('auth_user_id', user.id)
          .single();

        if (!stakeholder) {
          setHasPermission(false);
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to view campaigns',
            variant: 'destructive',
          });
          router.push('/dashboard');
          return;
        }

        const hasAdminRole = stakeholder.stakeholder_roles?.some(
          (sr: any) => {
            const roleCode = sr.roles?.code?.toLowerCase();
            return roleCode === 'administrator' || roleCode === 'admin' || roleCode === 'campaign_admin';
          }
        );

        if (!hasAdminRole) {
          setHasPermission(false);
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to view campaigns',
            variant: 'destructive',
          });
          router.push('/dashboard');
          return;
        }

        setHasPermission(true);

        // Load campaigns
        await loadCampaigns(currentAppUuid);
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

  const loadCampaigns = async (appUuid: string) => {
    try {
      let query = supabase
        .from('campaigns')
        .select(`
          *,
          campaign_type:campaign_types!campaign_type_id(id, code, name, description),
          owner:stakeholders!owner_id(id, name, email)
        `)
        .eq('app_uuid', appUuid)
        .order('created_at', { ascending: false });

      // Search filter
      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,` +
          `reference.ilike.%${searchTerm}%,` +
          `description.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setCampaigns(data || []);
    } catch (err: any) {
      console.error('Error loading campaigns:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to load campaigns',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (appUuid && hasPermission) {
      loadCampaigns(appUuid);
    }
  }, [searchTerm, appUuid, hasPermission]);

  const handleStatusChange = async (campaignId: string, newStatus: string) => {
    if (!appUuid) return;

    // If trying to cancel or complete, check for active opportunities
    if (newStatus === 'cancelled' || newStatus === 'completed') {
      const { canTerminate, activeOpportunitiesCount } = await canTerminateCampaign(campaignId, appUuid);
      
      if (!canTerminate) {
        toast({
          title: 'Cannot Terminate Campaign',
          description: `This campaign has ${activeOpportunitiesCount} active opportunity/opportunities. Please resolve them before cancelling or completing the campaign.`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Update status
    const { error } = await supabase
      .from('campaigns')
      .update({ status: newStatus as any })
      .eq('id', campaignId)
      .eq('app_uuid', appUuid);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Status Updated',
        description: 'Campaign status has been updated successfully',
      });
      loadCampaigns(appUuid);
    }
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
              className="hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
              <p className="text-gray-600 text-sm mt-1">
                Manage and track your marketing campaigns
              </p>
            </div>
          </div>
          <Link href="/dashboard/admin/campaigns/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </Link>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Campaigns List */}
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">
                  {searchTerm
                    ? 'No campaigns match your search.'
                    : 'No campaigns found. Create your first campaign to get started.'}
                </p>
                {!searchTerm && (
                  <Link href="/dashboard/admin/campaigns/create">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Campaign
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{campaign.name}</h3>
                        <Select
                          value={campaign.status}
                          onValueChange={(value) => handleStatusChange(campaign.id, value)}
                        >
                          <SelectTrigger className="w-[140px] h-7">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planning">Planning</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="paused">Paused</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-gray-500">{campaign.reference}</span>
                      </div>

                      {campaign.description && (
                        <p className="text-gray-600 mb-4">{campaign.description}</p>
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

                    <div className="ml-4 flex flex-col gap-2">
                      <Link href={`/dashboard/admin/campaigns/${campaign.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </Link>
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

