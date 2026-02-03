// ============================================================================
// BuildBid: Campaign Analytics (Placeholder)
// Performance metrics, conversion tracking, and reports
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import { BarChart, ArrowLeft, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminMenu from '@/components/admin/AdminMenu';
import { supabase } from '@/lib/supabase/client';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';
import { useToast } from '@/hooks/use-toast';

interface CampaignListItem {
  id: string;
  name: string;
  reference: string;
  status: string;
}

export default function CampaignAnalyticsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (authLoading) return;
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      try {
        const appUuid = await getCurrentAppUuid();
        if (!appUuid) {
          throw new Error('Unable to determine application context');
        }

        const { data, error } = await supabase
          .from('campaigns')
          .select('id, name, reference, status')
          .eq('app_uuid', appUuid)
          .order('created_at', { ascending: false })
          .limit(25);

        if (error) {
          throw error;
        }

        setCampaigns(data || []);
      } catch (err: any) {
        console.error('Error loading campaigns for dashboard:', err);
        toast({
          title: 'Error',
          description: err.message || 'Failed to load campaigns',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [authLoading, user, router, toast]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminMenu />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Campaign Dashboards</h1>
            <p className="text-gray-600">Select a campaign to open its dashboard</p>
          </div>
          <Link href="/dashboard/admin/campaigns">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaigns
            </Button>
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div className="bg-white border rounded-lg p-6 text-center">
            <p className="text-gray-700 font-medium mb-2">No campaigns found</p>
            <p className="text-gray-500 mb-4">
              Create a campaign first, then open its dashboard.
            </p>
            <Link href="/dashboard/admin/campaigns/list">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Go to Campaigns
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}/dashboard`}
                className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {campaign.name}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Ref: {campaign.reference}
                    </p>
                    <p className="text-xs text-gray-500 mt-2 capitalize">
                      Status: {campaign.status}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

