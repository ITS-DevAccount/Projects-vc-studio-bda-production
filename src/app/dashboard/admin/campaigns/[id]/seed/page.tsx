// ============================================================================
// BuildBid: Campaign Seeder Page
// Upload and process OCDS files to create campaign opportunities
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { OCDSUploader } from '@/components/admin/campaigns/OCDSUploader';
import AdminHeader from '@/components/admin/AdminHeader';

export default function CampaignSeedPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const campaignId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [campaign, setCampaign] = useState<{ id: string; name: string } | null>(null);

  // Check admin access
  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading || !user) return;

      try {
        const currentAppUuid = await getCurrentAppUuid();
        if (!currentAppUuid) {
          setHasPermission(false);
          setLoading(false);
          return;
        }

        // Check admin role via stakeholders table (matching create page pattern)
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
          setLoading(false);
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
          setLoading(false);
          return;
        }

        // Load campaign details
        const { data: campaignData, error: campaignError } = await supabase
          .from('campaigns')
          .select('id, name')
          .eq('id', campaignId)
          .eq('app_uuid', currentAppUuid)
          .single();

        if (campaignError || !campaignData) {
          toast({
            title: 'Error',
            description: 'Campaign not found',
            variant: 'destructive',
          });
          router.push('/dashboard/admin/campaigns');
          return;
        }

        setCampaign(campaignData);
        setHasPermission(true);
      } catch (error: any) {
        console.error('Error checking access:', error);
        setHasPermission(false);
        toast({
          title: 'Error',
          description: 'Failed to check permissions',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user, authLoading, campaignId, router, toast]);

  if (authLoading || loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access this page. Admin access required.
            </p>
            <Link href="/dashboard/admin/campaigns">
              <Button variant="outline">Back to Campaigns</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <AdminHeader />
      
      <div className="mb-6">
        <Link href={`/dashboard/admin/campaigns/${campaignId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaign
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Upload OCDS Files
          {campaign && <span className="text-xl font-normal text-muted-foreground ml-2">- {campaign.name}</span>}
        </h1>
        <p className="text-muted-foreground mt-2">
          Upload OCDS JSON files to extract supplier/award data and create campaign opportunities.
        </p>
      </div>

      <OCDSUploader
        campaignId={campaignId}
        onClose={() => router.push(`/dashboard/admin/campaigns/${campaignId}`)}
      />
    </div>
  );
}

