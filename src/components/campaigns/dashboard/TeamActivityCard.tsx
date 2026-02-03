// ============================================================================
// BuildBid: Team Activity Card Component
// Displays team members with activity counts, ranked by interaction count
// ============================================================================

import { Card, CardContent } from '@/components/ui/card';
import type { TeamMemberActivity } from '@/lib/campaigns/utils/dashboardHelpers';

interface TeamActivityCardProps {
  teamActivity: TeamMemberActivity[];
}

export default function TeamActivityCard({ teamActivity }: TeamActivityCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-5">Team Activity</h3>
        
        {teamActivity.length === 0 ? (
          <div className="empty-state text-center py-8 text-gray-500">
            No team activity yet
          </div>
        ) : (
          <div className="team-list space-y-4">
            {teamActivity.map((member) => {
              const initials = `${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}`.toUpperCase();
              
              return (
                <div key={member.id} className="team-member flex gap-3 items-center">
                  <div className="member-avatar flex-shrink-0">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={`${member.first_name} ${member.last_name}`}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="avatar-placeholder w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-sm">
                        {initials}
                      </div>
                    )}
                  </div>
                  
                  <div className="member-info flex-1 min-w-0">
                    <div className="member-name font-medium text-gray-900 text-sm">
                      {member.first_name} {member.last_name}
                    </div>
                    <div className="member-activity text-xs text-gray-500">
                      {member.activityCount} interaction{member.activityCount !== 1 ? 's' : ''}
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
