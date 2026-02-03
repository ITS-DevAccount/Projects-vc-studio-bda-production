// ============================================================================
// BuildBid: Funnel Stage Display Component
// Vertical display of campaign funnel stages with counts and statistics
// ============================================================================

'use client';

import React from 'react';
import type { FunnelStage } from '@/lib/types/campaign';

export interface FunnelStageDisplayProps {
  stages: FunnelStage[];
  mode: 'overview' | 'individual';
  stageCounts?: Record<string, number>;
  currentStage?: string;
  onStageAction?: (stageName: string) => void;
  autoAdvanceEnabled?: boolean;
  autoAdvanceDays?: number | null;
  totalOpportunities?: number;
  conversionRate?: number;
}

export default function FunnelStageDisplay({
  stages,
  mode,
  stageCounts = {},
  currentStage,
  onStageAction,
  autoAdvanceEnabled = false,
  autoAdvanceDays,
  totalOpportunities = 0,
  conversionRate = 0
}: FunnelStageDisplayProps) {
  
  const getStageColor = (stage: FunnelStage, isCompleted: boolean) => {
    if (stage.is_success === true) {
      return {
        circle: 'bg-green-500',
        badge: 'bg-green-500',
        border: 'border-green-500',
        bg: 'bg-green-50'
      };
    }
    if (stage.is_success === false) {
      return {
        circle: 'bg-red-500',
        badge: 'bg-red-500',
        border: 'border-red-500',
        bg: 'bg-red-50'
      };
    }
    if (isCompleted) {
      return {
        circle: 'bg-[#902ed1]',
        badge: 'bg-[#902ed1]',
        border: 'border-[#902ed1]',
        bg: 'bg-[#f3ebf9]'
      };
    }
    return {
      circle: 'bg-[#902ed1]',
      badge: 'bg-gray-600',
      border: 'border-gray-300',
      bg: 'bg-gray-50'
    };
  };

  const isStageCompleted = (stageName: string): boolean => {
    if (!currentStage || mode !== 'individual') return false;
    
    const currentStageObj = stages.find(s => s.name === currentStage);
    const checkStageObj = stages.find(s => s.name === stageName);
    
    if (!currentStageObj || !checkStageObj) return false;
    
    return checkStageObj.order < currentStageObj.order;
  };

  const isCurrentStage = (stageName: string): boolean => {
    return mode === 'individual' && currentStage === stageName;
  };

  const getStageCount = (stageName: string): number => {
    return stageCounts[stageName] || 0;
  };

  // Handle empty stages
  if (!stages || stages.length === 0) {
    return (
      <div className="text-sm text-muted-foreground mt-2 p-4 bg-muted/50 rounded-lg border border-border">
        No funnel stages configured.
      </div>
    );
  }

  // Sort stages by order
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="space-y-2">
        {sortedStages.map((stage, index) => {
          const completed = isStageCompleted(stage.name);
          const current = isCurrentStage(stage.name);
          const colors = getStageColor(stage, completed);
          const count = getStageCount(stage.name);
          const showConnector = index < sortedStages.length - 1;

          return (
            <React.Fragment key={stage.name}>
              {/* Stage Card */}
              <div
                className={`
                  flex items-center justify-between
                  px-4 py-3 rounded-lg border-2 transition-all
                  ${colors.border} ${colors.bg}
                  ${current ? 'ring-2 ring-[#902ed1] ring-opacity-50' : ''}
                  ${mode === 'individual' && !stage.is_success && !completed ? 'hover:border-[#902ed1] hover:bg-[#f9f5fc] cursor-pointer' : ''}
                `}
                onClick={() => {
                  if (mode === 'individual' && onStageAction && !stage.is_success && !completed) {
                    onStageAction(stage.name);
                  }
                }}
              >
                {/* Left: Number + Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Stage Number Circle */}
                  <div className={`
                    flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full
                    ${colors.circle}
                    flex items-center justify-center
                  `}>
                    {stage.is_success === true ? (
                      // Checkmark for Closed Won
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : stage.is_success === false ? (
                      // X for Closed Lost / Not Interested
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      // Stage number
                      <span className="text-white text-xs md:text-sm font-semibold">
                        {stage.order}
                      </span>
                    )}
                  </div>

                  {/* Stage Name */}
                  <span className="text-sm md:text-base font-medium text-gray-900 truncate">
                    {stage.name}
                  </span>
                </div>

                {/* Right: Count Badge OR Arrow */}
                {mode === 'overview' ? (
                  // Count Badge - Always light gray in overview mode
                  <div className="flex-shrink-0 min-w-[40px] h-7 px-3 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-700 text-xs md:text-sm font-semibold">
                      {count}
                    </span>
                  </div>
                ) : (
                  // Arrow Icon (Individual Mode)
                  !stage.is_success && !completed && (
                    <svg 
                      className="flex-shrink-0 w-5 h-5 text-[#902ed1]" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )
                )}
              </div>

              {/* Connector Line */}
              {showConnector && (
                <div className="h-5 w-0.5 bg-gray-300 ml-[13px] md:ml-[15px]" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Auto-Advance Notice */}
      {autoAdvanceEnabled && (
        <div className="mt-5 p-3 bg-[#ebddf9] border-l-4 border-[#902ed1] rounded flex items-start gap-2">
          <svg 
            className="flex-shrink-0 w-4 h-4 text-[#902ed1] mt-0.5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          <span className="text-xs md:text-sm text-gray-700">
            Auto-advance: Enabled ({autoAdvanceDays} day{autoAdvanceDays !== 1 ? 's' : ''} per stage)
          </span>
        </div>
      )}

      {/* Stats Summary (Overview Mode Only) */}
      {mode === 'overview' && (totalOpportunities > 0 || conversionRate > 0) && (
        <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-gray-900">
              {totalOpportunities}
            </div>
            <div className="text-xs md:text-sm text-gray-600 mt-1 uppercase tracking-wide">
              Total Opps
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-gray-900">
              {conversionRate}%
            </div>
            <div className="text-xs md:text-sm text-gray-600 mt-1 uppercase tracking-wide">
              Conversion
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
