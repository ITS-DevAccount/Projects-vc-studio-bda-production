// ============================================================================
// BuildBid: Interaction History Component
// Shows closed interactions (historical stages)
// ============================================================================

'use client';

interface ClosedInteraction {
  id: string;
  stage_name: string;
  status: string;
  opened_at: string;
  closed_at: string | null;
  outcome: string | null;
  notes: string | null;
  details?: Array<{
    id: string;
    actual_action_type: 'email' | 'call' | 'meeting' | 'demo' | null;
    actual_action_date: string | null;
    actual_notes: string | null;
    status: string;
  }>;
}

interface InteractionHistoryProps {
  opportunityId: string;
  appUuid: string;
}

const actionIcons = {
  email: '📧',
  call: '📞',
  meeting: '📅',
  demo: '🎯',
};

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

function calculateDuration(openedAt: string, closedAt: string | null): string {
  if (!closedAt) return 'N/A';
  try {
    const opened = new Date(openedAt);
    const closed = new Date(closedAt);
    const diffMs = closed.getTime() - opened.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}${diffHours > 0 ? ` ${diffHours} hour${diffHours > 1 ? 's' : ''}` : ''}`;
    }
    return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  } catch {
    return 'N/A';
  }
}

export default function InteractionHistory({ opportunityId, appUuid }: InteractionHistoryProps) {
  // This component will be used in the expanded opportunity card
  // The parent will fetch and pass the history data
  // For now, this is a placeholder that will be populated by the parent
  return (
    <div className="mt-6">
      <h3 className="text-base font-semibold mb-3 text-gray-900 pb-2 border-b-2 border-gray-200">
        Stage History
      </h3>
      <p className="text-sm text-gray-500 text-center py-4">
        History will be displayed here when available
      </p>
    </div>
  );
}

// Export helper function for rendering history items
export function renderHistoryItem(interaction: ClosedInteraction) {
  return (
    <div key={interaction.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
      <div className="inline-block bg-gray-600 text-white px-3 py-1 rounded-full text-xs font-semibold mb-3">
        {interaction.stage_name}
      </div>

      <div className="flex gap-4 text-xs text-gray-600 mb-3 flex-wrap">
        <span>Opened: {formatDate(interaction.opened_at)}</span>
        <span>Closed: {formatDate(interaction.closed_at)}</span>
        <span>Duration: {calculateDuration(interaction.opened_at, interaction.closed_at)}</span>
      </div>

      {interaction.outcome && (
        <div className="bg-white p-3 rounded mb-3">
          <strong className="text-xs text-gray-900 block mb-1">Outcome:</strong>
          <p className="text-xs text-gray-700 leading-relaxed">{interaction.outcome}</p>
        </div>
      )}

      {interaction.details && interaction.details.length > 0 && (
        <div className="bg-white p-3 rounded">
          <strong className="text-xs text-gray-900 block mb-2">
            Activities ({interaction.details.length}):
          </strong>
          {interaction.details
            .filter((d) => d.status === 'completed' && d.actual_action_type)
            .map((detail) => (
              <div
                key={detail.id}
                className="flex gap-2 items-center py-1 text-xs text-gray-700 border-b border-gray-100 last:border-0"
              >
                <span className="text-sm">
                  {detail.actual_action_type ? actionIcons[detail.actual_action_type] : '•'}
                </span>
                <span>{formatDate(detail.actual_action_date)}</span>
                {detail.actual_notes && (
                  <span className="text-gray-500 truncate flex-1">- {detail.actual_notes}</span>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
