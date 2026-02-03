// ============================================================================
// BuildBid: Upcoming Actions Card Component
// Displays planned activities grouped by "Today" and "This Week"
// ============================================================================

import { Card, CardContent } from '@/components/ui/card';
import { getActionIcon, formatDateTime } from '@/lib/utils/dashboard-utils';
import type { UpcomingAction } from '@/lib/campaigns/utils/dashboardHelpers';

interface UpcomingActionsCardProps {
  actions: UpcomingAction[];
}

function ActionItem({ action }: { action: UpcomingAction }) {
  const companyName = action.interaction?.opportunity?.stakeholder?.organization_name || 'Unknown';
  const actionType = action.planned_action_type || 'activity';

  return (
    <div className="action-item flex gap-3 mb-3 pb-3 border-b last:border-0">
      <div className="action-icon flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
        {getActionIcon(actionType)}
      </div>
      <div className="action-content flex-1 min-w-0">
        <div className="action-company font-medium text-gray-900 text-sm mb-1">
          {companyName}
        </div>
        <div className="action-time text-xs text-gray-500">
          {formatDateTime(action.planned_action_date)}
        </div>
        {action.planned_notes && (
          <div className="action-notes text-xs text-gray-600 mt-1 line-clamp-1">
            {action.planned_notes}
          </div>
        )}
      </div>
    </div>
  );
}

export default function UpcomingActionsCard({ actions }: UpcomingActionsCardProps) {
  const today = new Date().toISOString().split('T')[0];
  
  const todayActions = actions.filter(a => {
    if (!a.planned_action_date) return false;
    return a.planned_action_date.split('T')[0] === today;
  });
  
  const laterActions = actions.filter(a => {
    if (!a.planned_action_date) return false;
    return a.planned_action_date.split('T')[0] > today;
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-5">Upcoming Actions</h3>
        
        {actions.length === 0 ? (
          <div className="empty-state text-center py-8 text-gray-500">
            No upcoming actions
          </div>
        ) : (
          <div className="actions-sections space-y-6">
            {todayActions.length > 0 && (
              <div className="actions-section">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Today</h4>
                {todayActions.map((action, index) => (
                  <ActionItem key={action.id || index} action={action} />
                ))}
              </div>
            )}
            
            {laterActions.length > 0 && (
              <div className="actions-section">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">This Week</h4>
                {laterActions.map((action, index) => (
                  <ActionItem key={action.id || index} action={action} />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
