// ============================================================================
// BuildBid: Stage Visualizer Component
// Visual representation of funnel flow with color-coding and statistics
// ============================================================================

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FunnelStage } from '@/lib/types/campaign-type';

interface StageVisualizerProps {
  stages: FunnelStage[];
}

export function StageVisualizer({ stages }: StageVisualizerProps) {
  if (stages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funnel Flow Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Add stages to see the funnel flow</p>
        </CardContent>
      </Card>
    );
  }

  // Sort stages by order
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);
  
  // Separate stages by type
  const inProgressStages = sortedStages.filter((s) => s.is_success === null);
  const successStage = sortedStages.find((s) => s.is_success === true);
  const failStage = sortedStages.find((s) => s.is_success === false);

  // Calculate average duration
  const calculateAverageDuration = () => {
    const stagesWithDuration = inProgressStages.filter(
      (s) => s.expected_duration_days
    );
    if (stagesWithDuration.length === 0) return 0;
    const total = stagesWithDuration.reduce(
      (sum, s) => sum + (s.expected_duration_days || 0),
      0
    );
    return Math.round(total / stagesWithDuration.length);
  };

  const getStageColor = (stage: FunnelStage) => {
    if (stage.is_success === true) return '#28a745'; // Green
    if (stage.is_success === false) return '#dc3545'; // Red
    return stage.color || '#902ed1'; // Purple
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funnel Flow Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Funnel Flow Visualization */}
        <div className="space-y-3">
          {/* In-progress stages */}
          {inProgressStages.map((stage, index) => (
            <React.Fragment key={stage.id || index}>
              <div
                className="px-4 py-3 rounded-lg text-sm font-medium text-white flex items-center justify-between"
                style={{ backgroundColor: getStageColor(stage) }}
              >
                <div>
                  <span className="font-bold">{stage.order}.</span> {stage.name}
                </div>
                {stage.expected_duration_days && (
                  <span className="text-xs opacity-90">
                    ~{stage.expected_duration_days}d
                  </span>
                )}
              </div>
              {index < inProgressStages.length - 1 && (
                <div className="flex justify-center">
                  <div className="w-0.5 h-6 bg-gray-300" />
                </div>
              )}
            </React.Fragment>
          ))}

          {/* Split to success/fail */}
          {(successStage || failStage) && inProgressStages.length > 0 && (
            <div className="flex justify-center">
              <div className="w-0.5 h-6 bg-gray-300" />
            </div>
          )}

          {/* Success and Fail stages side by side */}
          {(successStage || failStage) && (
            <div className="grid grid-cols-2 gap-4">
              {successStage && (
                <div
                  className="px-4 py-3 rounded-lg text-sm font-medium text-white flex items-center justify-between"
                  style={{ backgroundColor: getStageColor(successStage) }}
                >
                  <div>
                    <span className="font-bold">{successStage.order}.</span>{' '}
                    {successStage.name} ✓
                  </div>
                </div>
              )}
              {failStage && (
                <div
                  className="px-4 py-3 rounded-lg text-sm font-medium text-white flex items-center justify-between"
                  style={{ backgroundColor: getStageColor(failStage) }}
                >
                  <div>
                    <span className="font-bold">{failStage.order}.</span>{' '}
                    {failStage.name} ✗
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stage Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-gray-500">Total Stages</p>
            <p className="text-lg font-bold">{stages.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Avg. Duration</p>
            <p className="text-lg font-bold">
              {calculateAverageDuration() > 0
                ? `${calculateAverageDuration()}d`
                : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Success Exits</p>
            <p className="text-lg font-bold text-green-600">
              {successStage ? '1' : '0'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Fail Exits</p>
            <p className="text-lg font-bold text-red-600">
              {failStage ? '1' : '0'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


