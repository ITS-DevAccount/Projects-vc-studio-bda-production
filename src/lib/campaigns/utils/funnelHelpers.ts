// ============================================================================
// BuildBid: Funnel Helper Utilities
// Utility functions for funnel stage calculations and display
// ============================================================================

import type { FunnelStage } from '@/lib/types/campaign';

export interface Opportunity {
  current_stage_name: string;
  status?: string;
}

/**
 * Calculate counts for each funnel stage from opportunities array
 */
export function calculateStageCounts(
  opportunities: Opportunity[],
  stages: FunnelStage[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  
  // Initialize all stages to 0
  stages.forEach(stage => {
    counts[stage.name] = 0;
  });
  
  // Count opportunities per stage
  opportunities.forEach(opp => {
    if (counts.hasOwnProperty(opp.current_stage_name)) {
      counts[opp.current_stage_name]++;
    }
  });
  
  return counts;
}

/**
 * Determine if a stage has been completed based on current stage
 */
export function isStageCompleted(
  stageName: string,
  currentStageName: string,
  stages: FunnelStage[]
): boolean {
  const currentStage = stages.find(s => s.name === currentStageName);
  const checkStage = stages.find(s => s.name === stageName);
  
  if (!currentStage || !checkStage) return false;
  
  return checkStage.order < currentStage.order;
}

/**
 * Get color configuration for a stage based on its type and completion status
 */
export function getStageColor(
  stage: FunnelStage,
  isCompleted: boolean
): {
  circle: string;
  badge: string;
  border: string;
  bg: string;
} {
  // Success stage (Closed Won)
  if (stage.is_success === true) {
    return {
      circle: 'bg-green-500',
      badge: 'bg-green-500',
      border: 'border-green-500',
      bg: 'bg-green-50'
    };
  }
  
  // Failed stage (Not Interested / Closed Lost)
  if (stage.is_success === false) {
    return {
      circle: 'bg-red-500',
      badge: 'bg-red-500',
      border: 'border-red-500',
      bg: 'bg-red-50'
    };
  }
  
  // Completed in-progress stage
  if (isCompleted) {
    return {
      circle: 'bg-[#902ed1]',
      badge: 'bg-[#902ed1]',
      border: 'border-[#902ed1]',
      bg: 'bg-[#f3ebf9]'
    };
  }
  
  // Not yet reached stage
  return {
    circle: 'bg-[#902ed1]',
    badge: 'bg-gray-600',
    border: 'border-gray-300',
    bg: 'bg-gray-50'
  };
}

/**
 * Calculate conversion rate from opportunities
 */
export function calculateConversionRate(
  opportunities: Opportunity[],
  stages: FunnelStage[]
): number {
  const total = opportunities.length;
  if (total === 0) return 0;
  
  const successStages = stages
    .filter(s => s.is_success === true)
    .map(s => s.name);
  
  const converted = opportunities.filter(opp => 
    successStages.includes(opp.current_stage_name)
  ).length;
  
  return Math.round((converted / total) * 100);
}

/**
 * Get total active opportunities (exclude lost/rejected)
 */
export function getTotalActiveOpportunities(
  opportunities: Opportunity[]
): number {
  return opportunities.filter(opp => 
    opp.status !== 'lost' && opp.status !== 'rejected'
  ).length;
}

/**
 * Validate stage transition is allowed
 */
export function canAdvanceToStage(
  currentStageName: string,
  targetStageName: string,
  stages: FunnelStage[]
): boolean {
  const currentStage = stages.find(s => s.name === currentStageName);
  const targetStage = stages.find(s => s.name === targetStageName);
  
  if (!currentStage || !targetStage) return false;
  
  // Can only advance forward (increasing order)
  return targetStage.order > currentStage.order;
}

/**
 * Get next stage in funnel
 */
export function getNextStage(
  currentStageName: string,
  stages: FunnelStage[]
): FunnelStage | null {
  const currentStage = stages.find(s => s.name === currentStageName);
  if (!currentStage) return null;
  
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);
  const nextStage = sortedStages.find(s => s.order > currentStage.order);
  
  return nextStage || null;
}
