// ============================================================================
// BuildBid: Campaign Monitor (Placeholder)
// Track interactions, schedule follow-ups, manage pipeline
// ============================================================================

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import { Activity, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminMenu from '@/components/admin/AdminMenu';

export default function CampaignMonitorPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminMenu />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
              <Activity className="w-12 h-12 text-gray-400" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Campaign Activity</h1>

          {/* Coming Soon Message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 inline-block">
            <p className="text-yellow-800 font-medium">Coming Soon</p>
          </div>

          {/* Description */}
          <div className="max-w-2xl mx-auto mb-8">
            <p className="text-gray-600 mb-4">
              This component is under development.
            </p>
            <p className="text-gray-600">
              The Campaign Monitor will provide a comprehensive view of campaign activity including scheduled interactions 
              (due today, overdue, upcoming), ability to log new interactions, update opportunity stages, 
              assign tasks to team members, and manage follow-up planning.
            </p>
          </div>

          {/* Back Button */}
          <Link href="/dashboard/admin/campaigns">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaigns
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}


