// ============================================================================
// BuildBid: Campaign Header Component
// Displays campaign name, reference, status, type, owner, dates, and actions
// ============================================================================

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils/dashboard-utils';
import type { CampaignOverview } from '@/lib/campaigns/utils/dashboardHelpers';

interface CampaignHeaderProps {
  campaign: CampaignOverview | null;
}

export default function CampaignHeader({ campaign }: CampaignHeaderProps) {
  if (!campaign) return null;

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

  const ownerName = campaign.owner?.name || 'Unknown';

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="campaign-header">
          {/* Header Main */}
          <div className="header-main flex items-center gap-3 mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <span className="campaign-reference text-sm text-gray-500 font-mono">
              {campaign.reference}
            </span>
            <Badge variant={getStatusBadgeVariant(campaign.status)}>
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </Badge>
          </div>

          {/* Header Meta */}
          <div className="header-meta flex flex-wrap gap-6 mb-4 text-sm">
            <div className="meta-item flex gap-2">
              <span className="label text-gray-600 font-medium">Type:</span>
              <span className="value text-gray-900">
                {campaign.campaign_type?.name || 'Unknown'}
              </span>
            </div>
            <div className="meta-item flex gap-2">
              <span className="label text-gray-600 font-medium">Owner:</span>
              <span className="value text-gray-900">{ownerName}</span>
            </div>
            <div className="meta-item flex gap-2">
              <span className="label text-gray-600 font-medium">Launch:</span>
              <span className="value text-gray-900">
                {formatDate(campaign.launch_date)}
              </span>
            </div>
            {campaign.end_date && (
              <div className="meta-item flex gap-2">
                <span className="label text-gray-600 font-medium">End:</span>
                <span className="value text-gray-900">
                  {formatDate(campaign.end_date)}
                </span>
              </div>
            )}
          </div>

          {/* Header Actions */}
          <div className="header-actions flex gap-3">
            <Link href={`/dashboard/admin/campaigns/${campaign.id}/seed`}>
              <Button className="bg-purple-600 hover:bg-purple-700">
                + Add Opportunities
              </Button>
            </Link>
            <Link href={`/dashboard/admin/campaigns/${campaign.id}`}>
              <Button variant="outline">Campaign Settings</Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
