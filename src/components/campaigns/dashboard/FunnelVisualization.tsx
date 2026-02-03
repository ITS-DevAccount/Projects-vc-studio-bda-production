// ============================================================================
// BuildBid: Funnel Visualization Component
// Vertical funnel chart showing stage distribution with percentages
// ============================================================================

import { Card, CardContent } from '@/components/ui/card';
import type { FunnelStageData } from '@/lib/campaigns/utils/dashboardHelpers';

interface FunnelVisualizationProps {
  data: FunnelStageData[];
}

export default function FunnelVisualization({ data }: FunnelVisualizationProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-5">Pipeline Funnel</h3>
          <div className="text-center py-8 text-gray-500">
            No funnel data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...data.map(stage => stage.count), 1);
  const sortedData = [...data].sort((a, b) => a.order - b.order);

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-5">Pipeline Funnel</h3>
        
        <div className="funnel-stages space-y-4">
          {sortedData.map((stage, index) => {
            const widthPercentage = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
            const barColor = stage.isSuccess === true
              ? '#10b981' // green for success
              : stage.isSuccess === false
              ? '#ef4444' // red for lost
              : '#902ed1'; // purple for in-progress

            return (
              <div key={index} className="funnel-stage">
                <div className="stage-info flex justify-between items-center mb-2 text-sm">
                  <span className="stage-name font-medium text-gray-700">
                    {stage.name}
                  </span>
                  <span className="stage-count font-semibold text-gray-900">
                    {stage.count} ({Math.round(stage.percentage)}%)
                  </span>
                </div>
                
                <div className="stage-bar h-8 bg-gray-100 rounded overflow-hidden">
                  <div
                    className="stage-bar-fill h-full transition-all duration-300 rounded"
                    style={{
                      width: `${widthPercentage}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
