// ============================================================================
// BuildBid: Recent Activity Feed Component
// Displays last 10 interactions with initiator, action type, company, stage, time
// ============================================================================

import { Card, CardContent } from '@/components/ui/card';
import { getActivityIcon, formatTimeAgo } from '@/lib/utils/dashboard-utils';
import type { RecentActivity } from '@/lib/campaigns/utils/dashboardHelpers';

interface RecentActivityFeedProps {
  activities: RecentActivity[];
}

export default function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-5">Recent Activity</h3>
        
        {activities.length === 0 ? (
          <div className="empty-state text-center py-8 text-gray-500">
            No recent activity
          </div>
        ) : (
          <div className="activity-list space-y-4">
            {activities.map((activity, index) => {
              const initiatorName = activity.initiated_by?.name || 'Unknown';
              const companyName = activity.opportunity?.stakeholder?.organization_name || 
                                  activity.opportunity?.stakeholder?.name || 
                                  'Unknown';
              const interactionType = activity.interaction_type || 'other';

              return (
                <div key={activity.id || index} className="activity-item flex gap-4">
                  <div className="activity-icon flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                    {getActivityIcon(interactionType)}
                  </div>
                  
                  <div className="activity-content flex-1 min-w-0">
                    <div className="activity-header flex flex-wrap items-center gap-2 mb-1">
                      <span className="activity-person font-medium text-gray-900">
                        {initiatorName}
                      </span>
                      <span className="activity-action text-gray-600 capitalize">
                        {interactionType}
                      </span>
                      <span className="activity-company text-gray-600">
                        {companyName}
                      </span>
                    </div>
                    
                    <div className="activity-meta flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      {activity.stage_name && (
                        <span className="activity-stage">{activity.stage_name}</span>
                      )}
                      <span className="activity-time">
                        {formatTimeAgo(activity.interaction_date)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
