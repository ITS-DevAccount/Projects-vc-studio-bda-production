// ============================================================================
// BuildBid: Funnel Stages Preview Component
// Displays funnel stages from selected campaign type
// ============================================================================

'use client';

import React from 'react';
import type { CampaignType } from '@/lib/types/campaign';

interface FunnelStagesPreviewProps {
  campaignType: CampaignType | null;
}

export function FunnelStagesPreview({ campaignType }: FunnelStagesPreviewProps) {
  if (!campaignType?.funnel_stages) {
    return (
      <div className="text-sm text-muted-foreground mt-2">
        No funnel stages defined for this campaign type.
      </div>
    );
  }

  const funnelStages = campaignType.funnel_stages;
  const stages = funnelStages.stages || [];

  if (stages.length === 0) {
    return (
      <div className="text-sm text-muted-foreground mt-2">
        No funnel stages configured.
      </div>
    );
  }

  // Sort stages by order
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  return (
    <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
      <h4 className="text-sm font-semibold mb-3 text-foreground">Sales Funnel Stages</h4>
      
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {sortedStages.map((stage, index) => (
          <React.Fragment key={index}>
            <div
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                stage.is_success === true
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : stage.is_success === false
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-primary/10 text-primary border border-primary/20'
              }`}
            >
              {stage.order}. {stage.name}
            </div>
            {index < sortedStages.length - 1 && (
              <span className="text-muted-foreground text-xs">→</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {campaignType.auto_advance_enabled && campaignType.auto_advance_days && (
        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
          <span>🤖</span>
          <span>Auto-advance: Enabled ({campaignType.auto_advance_days} days per stage)</span>
        </div>
      )}
    </div>
  );
}

