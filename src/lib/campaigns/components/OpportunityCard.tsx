// ============================================================================
// BuildBid: Opportunity Card Component (Enhanced with Activity Timeline)
// Displays opportunity details with expandable activity tracking
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Info, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ActivityDetailCard from '@/components/campaigns/ActivityDetailCard';
import AddActivityForm from '@/components/campaigns/AddActivityForm';
import { renderHistoryItem } from '@/components/campaigns/InteractionHistory';
import { supabase } from '@/lib/supabase/client';

export interface Opportunity {
  id: string;
  reference: string;
  current_stage_name: string;
  stage_order: number;
  engagement_level: 'cold' | 'warm' | 'hot' | 'warm' | 'engaged' | 'inactive';
  last_interaction: string | null;
  next_follow_up_date: string | null;
  estimated_value?: number | null;
  status?: 'active' | 'converted' | 'lost' | null;
  metadata?: {
    tender_title?: string | null;
    tender_description?: string | null;
    [key: string]: unknown;
  } | null;
  stakeholder: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    website?: string | null;
    size_employees?: number | null;
  };
}

interface LastActivity {
  type: string;
  date: string;
}

interface OpportunityCardProps {
  opportunity: Opportunity;
  lastActivity?: LastActivity | null;
  onScheduleAndAdvance: (params: {
    outcome: string;
    nextStageName: string;
  }) => Promise<void>;
  onMarkLost: (params: { outcome: string }) => Promise<void>;
  onMarkWon: (params: { outcome: string }) => Promise<void>;
  onActivityCompleted?: () => void;
  isProcessing?: boolean;
  appUuid: string;
  nextStageName?: string;
}

const engagementColors = {
  cold: 'bg-blue-100 text-blue-800',
  warm: 'bg-yellow-100 text-yellow-800',
  hot: 'bg-red-100 text-red-800',
  engaged: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-300 text-gray-600',
};

const engagementIcons = {
  cold: '🥶',
  warm: '🌡️',
  hot: '🔥',
  engaged: '✅',
  inactive: '😴',
};

interface InteractionDetail {
  id: string;
  planned_action_type: 'email' | 'call' | 'meeting' | 'demo';
  planned_action_date: string;
  planned_notes: string;
  actual_action_type?: 'email' | 'call' | 'meeting' | 'demo' | null;
  actual_action_date?: string | null;
  actual_notes?: string | null;
  status: 'planned' | 'completed' | 'cancelled';
}

interface CurrentInteraction {
  id: string;
  stage_name: string;
  status: string;
  opened_at: string;
}

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

const actionLabels: Record<string, string> = {
  email: 'Email',
  call: 'Call',
  meeting: 'Meeting',
  demo: 'Demo',
};

export default function OpportunityCard({
  opportunity,
  lastActivity,
  onScheduleAndAdvance,
  onMarkLost,
  onMarkWon,
  onActivityCompleted,
  isProcessing = false,
  appUuid,
  nextStageName,
}: OpportunityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDataPopup, setShowDataPopup] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [currentInteraction, setCurrentInteraction] = useState<CurrentInteraction | null>(null);
  const [activityDetails, setActivityDetails] = useState<InteractionDetail[]>([]);
  const [interactionHistory, setInteractionHistory] = useState<ClosedInteraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [processing, setProcessing] = useState(false);
  const [estimatedValue, setEstimatedValue] = useState<number | null>(
    opportunity.estimated_value || null
  );
  const [isUpdatingValue, setIsUpdatingValue] = useState(false);

  // Sync estimated_value when opportunity prop changes
  useEffect(() => {
    setEstimatedValue(opportunity.estimated_value || null);
  }, [opportunity.estimated_value]);

  // Load interaction data when expanded
  useEffect(() => {
    if (isExpanded && appUuid) {
      loadInteractionData();
    }
  }, [isExpanded, opportunity.id, appUuid]);

  const loadInteractionData = async () => {
    setLoading(true);
    try {
      // Get current interaction and details
      const response = await fetch(`/api/campaigns/interactions/opportunity/${opportunity.id}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Try to get error message from response
        let errorInfo: any = {
          status: response.status,
          statusText: response.statusText,
          opportunityId: opportunity.id,
          url: `/api/campaigns/interactions/opportunity/${opportunity.id}`,
        };

        try {
          // Check if response has content
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorInfo.error = errorData;
            if (errorData?.error) {
              errorInfo.message = errorData.error;
            }
          } else {
            // Try to get text response
            const text = await response.text();
            errorInfo.responseText = text.substring(0, 200);
            errorInfo.contentType = contentType;
          }
        } catch (parseError: any) {
          // Couldn't parse response
          errorInfo.parseError = parseError.message || String(parseError);
        }

        // Only log as warning if it's a 404 (interaction might not exist yet)
        if (response.status === 404) {
          console.debug('No interaction found (this is OK for new opportunities):', errorInfo);
        } else {
          console.warn('Error fetching interaction:', errorInfo);
        }

        // Don't throw - just set empty state (interaction might not exist yet)
        setCurrentInteraction(null);
        setActivityDetails([]);
        return;
      }

      // Parse successful response
      try {
        const data = await response.json();
        setCurrentInteraction(data.interaction);
        setActivityDetails(data.details || []);
      } catch (parseError) {
        console.error('Error parsing interaction response:', parseError);
        setCurrentInteraction(null);
        setActivityDetails([]);
      }

      // Get interaction history (closed interactions)
      // Try with new columns first
      let history: any[] = [];
      let historyData: any = null;
      let historyError: any = null;
      
      try {
        const result = await supabase
          .from('campaign_interactions')
          .select(`
            id,
            stage_name,
            status,
            opened_at,
            closed_at,
            outcome,
            notes
          `)
          .eq('opportunity_id', opportunity.id)
          .eq('status', 'closed')
          .eq('app_uuid', appUuid)
          .order('opened_at', { ascending: false });
        
        historyData = result.data;
        historyError = result.error;
      } catch (fetchError: any) {
        console.warn('Error fetching interaction history:', fetchError);
        historyError = fetchError;
      }

      if (historyError) {
        // If columns don't exist, try fallback
        if (historyError.code === '42703' || historyError.code === 'PGRST116' || historyError.message?.includes('column') || historyError.message?.includes('Could not find')) {
          console.warn('New columns not found for history, using fallback');
          // Fallback: get all interactions (no status filter, use old columns)
          const { data: fallbackHistory, error: fallbackErr } = await supabase
            .from('campaign_interactions')
            .select('id, interaction_date, notes, outcome')
            .eq('opportunity_id', opportunity.id)
            .eq('app_uuid', appUuid)
            .order('interaction_date', { ascending: false })
            .limit(10);

          if (fallbackErr) {
            console.error('Error fetching interaction history (fallback):', fallbackErr);
          } else if (fallbackHistory) {
            history = fallbackHistory.map((item: any) => ({
              id: item.id,
              stage_name: 'Unknown',
              status: 'closed',
              opened_at: item.interaction_date || new Date().toISOString(),
              closed_at: item.interaction_date || new Date().toISOString(),
              outcome: item.outcome,
              notes: item.notes,
            }));
          }
        } else {
          console.error('Error fetching interaction history:', historyError);
        }
      } else if (historyData) {
        history = historyData;
      }

      if (history.length > 0) {
        // Load details for each closed interaction
        const historyWithDetails = await Promise.all(
          history.map(async (interaction) => {
            try {
              const { data: details, error: detailsError } = await supabase
                .from('campaign_interaction_details')
                .select('id, actual_action_type, actual_action_date, actual_notes, status')
                .eq('interaction_id', interaction.id)
                .order('created_at', { ascending: false });

              if (detailsError) {
                // If table doesn't exist, that's OK - just return empty details
                if (detailsError.code === 'PGRST205' || detailsError.message?.includes('Could not find the table')) {
                  return {
                    ...interaction,
                    details: [],
                  };
                }
                throw detailsError;
              }

              return {
                ...interaction,
                details: details || [],
              };
            } catch (err: any) {
              // If details table doesn't exist or has errors, just return interaction without details
              if (err?.code === 'PGRST205' || err?.message?.includes('Could not find the table')) {
                return {
                  ...interaction,
                  details: [],
                };
              }
              console.warn('Error loading details for interaction:', err);
              return {
                ...interaction,
                details: [],
              };
            }
          })
        );
        setInteractionHistory(historyWithDetails as ClosedInteraction[]);
      } else {
        setInteractionHistory([]);
      }
    } catch (error) {
      console.error('Error loading interaction data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteActivity = async (detailId: string, params: {
    actualActionType: 'email' | 'call' | 'meeting' | 'demo';
    actualActionDate: string;
    actualNotes: string;
  }) => {
    if (!currentInteraction) return;

    try {
      const response = await fetch(`/api/campaigns/interactions/${currentInteraction.id}/details`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          detail_id: detailId,
          actual_action_type: params.actualActionType,
          actual_action_date: params.actualActionDate,
          actual_notes: params.actualNotes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Check if this is a "table not found" error (503 status)
        if (response.status === 503 && error.code === 'TABLE_NOT_FOUND') {
          alert('Activity tracking is not available. This feature requires database migrations to be run. Please contact your administrator.');
          return; // Don't throw, just show message and return
        }
        
        throw new Error(error.error || 'Failed to complete activity');
      }

      // Reload data
      await loadInteractionData();
      onActivityCompleted?.();
    } catch (error: any) {
      console.error('Error completing activity:', error);
      alert(error.message || 'Failed to complete activity');
    }
  };

  const handleActivitySaved = async () => {
    setShowAddActivity(false);
    await loadInteractionData();
  };

  const handleSaveAndAdvance = async () => {
    if (!outcome.trim()) {
      alert('Please provide an outcome summary before advancing');
      return;
    }

    if (!nextStageName) {
      alert('No next stage available');
      return;
    }

    if (!confirm(`Move to ${nextStageName}?`)) {
      return;
    }

    setProcessing(true);
    try {
      await onScheduleAndAdvance({
        outcome: outcome.trim(),
        nextStageName,
      });
      setOutcome('');
      setIsExpanded(false);
      // Parent will reload opportunities
    } catch (error) {
      console.error('Error in Save & Advance:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkLost = async () => {
    if (!outcome.trim()) {
      alert('Please provide an outcome summary');
      return;
    }

    if (!confirm('Are you sure you want to mark this opportunity as lost?')) {
      return;
    }

    setProcessing(true);
    try {
      await onMarkLost({ outcome: outcome.trim() });
      setOutcome('');
      setIsExpanded(false);
    } catch (error) {
      console.error('Error marking as lost:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkWon = async () => {
    if (!outcome.trim()) {
      alert('Please provide an outcome summary');
      return;
    }

    if (!confirm('Are you sure you want to mark this opportunity as won?')) {
      return;
    }

    setProcessing(true);
    try {
      await onMarkWon({ outcome: outcome.trim() });
      setOutcome('');
      setIsExpanded(false);
    } catch (error) {
      console.error('Error marking as won:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleEstimatedValueChange = async (newValue: number | null) => {
    if (isUpdatingValue) return;
    
    setIsUpdatingValue(true);
    try {
      const { error } = await supabase
        .from('campaign_opportunities')
        .update({ estimated_value: newValue || null })
        .eq('id', opportunity.id);

      if (error) {
        console.error('Error updating estimated value:', error);
        alert('Failed to update estimated value');
        // Revert to previous value
        setEstimatedValue(opportunity.estimated_value || null);
      } else {
        setEstimatedValue(newValue);
      }
    } catch (error) {
      console.error('Error updating estimated value:', error);
      alert('Failed to update estimated value');
      setEstimatedValue(opportunity.estimated_value || null);
    } finally {
      setIsUpdatingValue(false);
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return dateString;
    }
  };

  const formatLastInteraction = (dateString: string | null) => {
    if (!dateString) return 'None';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return dateString;
    }
  };

  const getCompanySize = () => {
    const size = opportunity.stakeholder.size_employees;
    if (!size) return '';
    if (size < 10) return 'Micro (<10 employees)';
    if (size < 50) return 'Small (10-49 employees)';
    if (size < 250) return 'Medium (50-249 employees)';
    return 'Large (250+ employees)';
  };

  const getDataPopupContent = () => {
    const lastActionText = lastActivity?.date
      ? `${actionLabels[lastActivity.type] || lastActivity.type} - ${formatLastInteraction(lastActivity.date)}`
      : formatLastInteraction(opportunity.last_interaction);
    const tenderTitle = opportunity.metadata?.tender_title;
    const tenderDescription = opportunity.metadata?.tender_description;
    return [
      `Reference: ${opportunity.reference}`,
      `Company: ${opportunity.stakeholder.name}`,
      `Contact: ${opportunity.stakeholder.email}`,
      opportunity.stakeholder.phone ? `Phone: ${opportunity.stakeholder.phone}` : null,
      getCompanySize() ? `Company Size: ${getCompanySize()}` : null,
      tenderTitle ? `Tender Title: ${tenderTitle}` : null,
      tenderDescription ? `Tender Description: ${tenderDescription}` : null,
      `Stage: ${opportunity.stage_order} - ${opportunity.current_stage_name}`,
      `Engagement: ${opportunity.engagement_level.charAt(0).toUpperCase() + opportunity.engagement_level.slice(1)}`,
      `Status: ${opportunity.status || 'active'}`,
      `Estimated Value: ${estimatedValue != null ? `£${estimatedValue}` : 'Not set'}`,
      `Last Action: ${lastActionText}`,
      `Next Follow-up: ${formatDateTime(opportunity.next_follow_up_date)}`,
    ]
      .filter(Boolean)
      .join('\n');
  };

  const handleCopyData = async () => {
    try {
      await navigator.clipboard.writeText(getDataPopupContent());
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const isDisabled = processing || isProcessing;

  return (
    <div className={`border rounded-lg p-5 mb-4 transition-all ${
      isExpanded ? 'border-[#902ed1] bg-white shadow-lg' : 'border-gray-300 bg-gray-50'
    }`}>
      {/* Collapsed Header - Clickable */}
      <div
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold mb-1 text-gray-900">
              {opportunity.stakeholder.name}
            </h3>
            <div className="text-xs text-gray-600 flex gap-3 flex-wrap">
              <span>{opportunity.reference}</span>
              {getCompanySize() && (
                <>
                  <span>•</span>
                  <span>{getCompanySize()}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Badge className="bg-[#902ed1] text-white">
              Stage {opportunity.stage_order}
            </Badge>
            <Badge className={engagementColors[opportunity.engagement_level]}>
              {engagementIcons[opportunity.engagement_level]}{' '}
              {opportunity.engagement_level.charAt(0).toUpperCase() + opportunity.engagement_level.slice(1)}
            </Badge>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDataPopup(true);
              }}
              className="p-1.5 rounded-md hover:bg-gray-200 text-gray-500 hover:text-[#902ed1] transition-colors"
              title="View opportunity data (copyable)"
              aria-label="View opportunity data"
            >
              <Info className="w-4 h-4" />
            </button>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
        </div>

        {/* Collapsed Details */}
        {!isExpanded && (
          <div className="bg-white border border-gray-200 rounded p-3">
            <div className="grid gap-1.5 text-sm">
              <div className="flex gap-2 justify-between items-center">
                <div className="flex gap-2 flex-1">
                  <span className="font-medium text-gray-600 min-w-[100px]">Contact:</span>
                  <span className="text-gray-900">{opportunity.stakeholder.email}</span>
                </div>
                <div className="flex gap-2 items-center ml-auto" onClick={(e) => e.stopPropagation()}>
                  <span className="font-medium text-gray-600">Est. Value:</span>
                  <input
                    type="number"
                    value={estimatedValue || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : parseFloat(e.target.value);
                      setEstimatedValue(val);
                    }}
                    onBlur={(e) => {
                      const val = e.target.value === '' ? null : parseFloat(e.target.value);
                      if (val !== estimatedValue) {
                        handleEstimatedValueChange(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    disabled={isUpdatingValue || isDisabled}
                    className="w-24 px-2 py-1 text-right border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-gray-600 min-w-[100px]">Last Action:</span>
                <span className="text-gray-900">
                  {lastActivity?.date
                    ? `${actionLabels[lastActivity.type] || lastActivity.type} - ${formatLastInteraction(lastActivity.date)}`
                    : formatLastInteraction(opportunity.last_interaction)}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-gray-600 min-w-[100px]">Next Follow-up:</span>
                <span className="text-gray-900">
                  {formatDateTime(opportunity.next_follow_up_date)}
                </span>
              </div>
              {/* Next Planned Activity */}
              {(() => {
                const nextPlannedActivity = activityDetails
                  .filter(detail => detail.status === 'planned')
                  .sort((a, b) => new Date(a.planned_action_date).getTime() - new Date(b.planned_action_date).getTime())[0];
                
                if (nextPlannedActivity) {
                  const actionIcons: Record<string, string> = {
                    email: '📧',
                    call: '📞',
                    meeting: '📅',
                    demo: '🎯',
                  };
                  const actionLabels: Record<string, string> = {
                    email: 'Email',
                    call: 'Call',
                    meeting: 'Meeting',
                    demo: 'Demo',
                  };
                  const actionDate = new Date(nextPlannedActivity.planned_action_date);
                  const dateStr = actionDate.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const phoneSuffix = opportunity.stakeholder.phone
                    ? ` (Tel: ${opportunity.stakeholder.phone})`
                    : ' (Tel: NT)';
                  return (
                    <div className="flex gap-2">
                      <span className="font-medium text-gray-600 min-w-[100px]">Next Action:</span>
                      <span className="text-gray-900">
                        {actionIcons[nextPlannedActivity.planned_action_type] || '📋'} {actionLabels[nextPlannedActivity.planned_action_type] || nextPlannedActivity.planned_action_type} - {dateStr}{phoneSuffix}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            
            {/* Save & Advance - Compact version in collapsed view */}
            {opportunity.status !== 'converted' && opportunity.status !== 'lost' && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex gap-2 flex-wrap items-center">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!nextStageName) {
                        setIsExpanded(true);
                        return;
                      }
                      if (!outcome.trim()) {
                        // Expand to show full form if no outcome entered
                        setIsExpanded(true);
                        return;
                      }
                      handleSaveAndAdvance();
                    }}
                    disabled={isDisabled || !nextStageName}
                    className="bg-[#902ed1] hover:bg-[#7c2d9c] text-white text-xs px-3 py-1.5 h-auto font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    size="sm"
                    title={!nextStageName ? 'No next stage available - expand to see options' : ''}
                  >
                    {nextStageName ? `Advance to ${nextStageName}` : 'No Next Stage'}
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkWon();
                    }}
                    disabled={isDisabled}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 h-auto font-medium"
                    size="sm"
                  >
                    Mark Won
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkLost();
                    }}
                    disabled={isDisabled}
                    className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 h-auto font-medium"
                    size="sm"
                  >
                    Mark Lost
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <>
              {/* Current Stage Info */}
              {currentInteraction && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Current Stage: {currentInteraction.stage_name}
                  </h4>
                  <p className="text-xs text-gray-600">
                    Opened: {new Date(currentInteraction.opened_at).toLocaleString('en-GB')}
                  </p>
                </div>
              )}

              {/* Activity Timeline */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
                  Activity Timeline
                </h4>
                {activityDetails.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No activities logged yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {activityDetails.map((detail) => (
                      <ActivityDetailCard
                        key={detail.id}
                        detail={detail}
                        onComplete={(params) => handleCompleteActivity(detail.id, params)}
                        isProcessing={isDisabled}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Add Activity - Only show for active opportunities */}
              {currentInteraction && opportunity.status !== 'converted' && opportunity.status !== 'lost' && (
                <>
                  {!showAddActivity ? (
                    <Button
                      onClick={() => setShowAddActivity(true)}
                      variant="outline"
                      className="w-full border-[#902ed1] text-[#902ed1] hover:bg-[#f9f5fc]"
                    >
                      + Add Activity
                    </Button>
                  ) : (
                    <AddActivityForm
                      interactionId={currentInteraction.id}
                      stakeholder={opportunity.stakeholder}
                      onSave={handleActivitySaved}
                      onCancel={() => setShowAddActivity(false)}
                      onStakeholderPhoneUpdated={onActivityCompleted}
                      isProcessing={isDisabled}
                    />
                  )}
                </>
              )}

              {/* Save & Advance Section - Only show for active opportunities */}
              {opportunity.status !== 'converted' && opportunity.status !== 'lost' && (
              <div className="bg-purple-50 p-5 rounded-lg border border-purple-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Save & Advance
                </h4>
                <Textarea
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="Outcome summary before advancing..."
                  rows={3}
                  disabled={isDisabled}
                  className="w-full text-sm mb-4 resize-none bg-white text-gray-900 border-gray-300"
                />
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={handleSaveAndAdvance}
                    disabled={isDisabled || !nextStageName}
                    className="bg-[#902ed1] hover:bg-[#7c2d9c] text-white flex-1 min-w-[150px] disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!nextStageName ? 'No next stage available' : ''}
                  >
                    {processing ? 'Processing...' : nextStageName ? `Save & Advance to ${nextStageName}` : 'No Next Stage'}
                  </Button>
                  <Button
                    onClick={handleMarkWon}
                    disabled={isDisabled}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Mark Won
                  </Button>
                  <Button
                    onClick={handleMarkLost}
                    disabled={isDisabled}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    Mark Lost
                  </Button>
                </div>
              </div>
              )}

              {/* Show status message for won/lost opportunities */}
              {(opportunity.status === 'converted' || opportunity.status === 'lost') && (
                <div className={`p-4 rounded-lg border-2 ${
                  opportunity.status === 'converted' 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <p className={`text-sm font-semibold ${
                    opportunity.status === 'converted' 
                      ? 'text-green-800' 
                      : 'text-red-800'
                  }`}>
                    {opportunity.status === 'converted' 
                      ? '✓ This opportunity has been marked as Won' 
                      : '✗ This opportunity has been marked as Not Interested'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    No further activities can be added to closed opportunities.
                  </p>
                </div>
              )}

              {/* Interaction History */}
              {interactionHistory.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-base font-semibold mb-3 text-gray-900 pb-2 border-b-2 border-gray-200">
                    Stage History
                  </h3>
                  {interactionHistory.map((interaction) => renderHistoryItem(interaction))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Opportunity Data Popup - Read-only, copyable */}
      <Dialog open={showDataPopup} onOpenChange={setShowDataPopup}>
        <DialogContent
          className="max-w-md bg-white border border-gray-200"
          onClose={() => setShowDataPopup(false)}
        >
          <DialogHeader>
            <DialogTitle className="text-lg">Opportunity Data</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 mb-3">
            Select and copy text below, or use Copy All.
          </p>
          <pre
            className="text-sm p-4 bg-gray-50 rounded border border-gray-200 overflow-auto max-h-64 select-text whitespace-pre-wrap font-sans"
            style={{ userSelect: 'text' }}
          >
            {getDataPopupContent()}
          </pre>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyData}
              className="flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {copiedFeedback ? 'Copied!' : 'Copy All'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDataPopup(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
