// ============================================================================
// BuildBid: Campaign Admin Dashboard
// 5-card navigation dashboard for campaign management
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { getCurrentAppUuid } from '@/lib/supabase/app-helpers';
import Link from 'next/link';
import {
  Settings,
  CirclePlus,
  UserPlus,
  Activity,
  BarChart,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminMenu from '@/components/admin/AdminMenu';

interface DashboardCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  action: string;
  color: string;
  iconColor: string;
  metric?: string | number;
}

export default function CampaignDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [metrics, setMetrics] = useState<{
    activeCampaigns?: number;
    totalOpportunities?: number;
    campaignTypes?: number;
  }>({});

  useEffect(() => {
    const checkAccessAndLoadMetrics = async () => {
      if (authLoading || !user) return;

      try {
        // Check admin role via stakeholders table
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
            description: 'You do not have permission to access campaigns',
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
            description: 'You do not have permission to access campaigns',
            variant: 'destructive',
          });
          router.push('/dashboard');
          return;
        }

        setHasPermission(true);

        // Load metrics with server-side filtering
        const appUuid = await getCurrentAppUuid();
        if (appUuid) {
          // Get active campaigns count (server-side)
          const { count: activeCampaigns } = await supabase
            .from('campaigns')
            .select('*', { count: 'exact', head: true })
            .eq('app_uuid', appUuid)
            .eq('status', 'active');

          // Get total opportunities count (server-side)
          const { count: totalOpportunities } = await supabase
            .from('campaign_opportunities')
            .select('campaigns!inner(app_uuid)', { count: 'exact', head: true })
            .eq('campaigns.app_uuid', appUuid)
            .eq('status', 'active');

          // Get campaign types count (server-side)
          const { count: campaignTypes } = await supabase
            .from('campaign_types')
            .select('*', { count: 'exact', head: true });

          setMetrics({
            activeCampaigns: activeCampaigns || 0,
            totalOpportunities: totalOpportunities || 0,
            campaignTypes: campaignTypes || 0,
          });
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAccessAndLoadMetrics();
  }, [authLoading, user, router, toast]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [authLoading, user, router]);

  const cards: DashboardCard[] = [
    {
      id: 'campaign-types',
      title: 'Campaign Types',
      description: 'Define funnel stages and configure campaign templates',
      icon: Settings,
      href: '/dashboard/admin/campaigns/types/new',
      action: 'Create Campaign Type',
      color: '#2563eb',
      iconColor: '#2563eb',
      metric: metrics.campaignTypes ? `${metrics.campaignTypes} templates` : undefined,
    },
    {
      id: 'new-campaign',
      title: 'New Campaign',
      description: 'Launch a new marketing or sales campaign',
      icon: CirclePlus,
      href: '/dashboard/admin/campaigns/list',
      action: 'View Campaigns',
      color: '#2563eb',
      iconColor: '#2563eb',
      metric: metrics.activeCampaigns ? `${metrics.activeCampaigns} running` : undefined,
    },
    {
      id: 'campaign-seeder',
      title: 'Campaign Seeder',
      description: 'Add opportunities from discovery, OCDS, or manual import',
      icon: UserPlus,
      href: '/dashboard/admin/campaigns/seeder',
      action: 'Seed Opportunities',
      color: '#2563eb',
      iconColor: '#2563eb',
      metric: metrics.totalOpportunities ? `${metrics.totalOpportunities} opportunities` : undefined,
    },
    {
      id: 'campaign-monitor',
      title: 'Campaign Activity',
      description: 'Track interactions, schedule follow-ups, manage pipeline',
      icon: Activity,
      href: '/dashboard/admin/campaigns/activity',
      action: 'Monitor Campaigns',
      color: '#2563eb',
      iconColor: '#2563eb',
    },
    {
      id: 'campaign-analytics',
      title: 'Campaign Dashboard',
      description: 'View campaign-level dashboards and performance',
      icon: BarChart,
      href: '/dashboard/admin/campaigns/analytics',
      action: 'Open Dashboard',
      color: '#2563eb',
      iconColor: '#2563eb',
    },
  ];

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Campaigns</h1>
          <p className="text-gray-600">
            Manage marketing campaigns and track performance
          </p>
        </div>

        {/* Cards Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.id}
                href={card.href}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-[#3b82f6] transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Icon className="w-8 h-8 text-[#2563eb]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{card.title}</h3>
                    <p className="text-sm text-gray-600">{card.description}</p>
                    {card.metric && (
                      <p className="text-xs text-gray-500 mt-2">{card.metric}</p>
                    )}
                  </div>
                  <div className="text-gray-400 group-hover:text-[#2563eb] transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
