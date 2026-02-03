// ============================================================================
// BuildBid: Pipeline Value Card Component
// Displays total pipeline value, average deal size, and stage breakdown
// ============================================================================

import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/dashboard-utils';
import type { PipelineValue } from '@/lib/campaigns/utils/dashboardHelpers';

interface PipelineValueCardProps {
  pipelineValue: PipelineValue | null;
}

export default function PipelineValueCard({ pipelineValue }: PipelineValueCardProps) {
  if (!pipelineValue) {
    return (
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-5">Pipeline Value</h3>
          <div className="text-center py-8 text-gray-500">
            No pipeline data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-5">Pipeline Value</h3>
        
        {/* Total Value */}
        <div className="total-value mb-6 pb-6 border-b">
          <div className="value-label text-xs font-semibold text-gray-600 uppercase mb-2">
            Total Active Value
          </div>
          <div className="value-amount text-3xl font-bold text-gray-900">
            {formatCurrency(pipelineValue.totalValue)}
          </div>
        </div>
        
        {/* Average Deal Size */}
        <div className="avg-deal mb-6 pb-6 border-b">
          <div className="value-label text-xs font-semibold text-gray-600 uppercase mb-2">
            Average Deal Size
          </div>
          <div className="value-amount-small text-xl font-semibold text-gray-900">
            {formatCurrency(pipelineValue.avgDealSize)}
          </div>
        </div>
        
        {/* Stage Breakdown */}
        <div className="stage-breakdown">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">By Stage</h4>
          <div className="space-y-3">
            {pipelineValue.stageBreakdown.map((stage, index) => (
              <div key={index} className="stage-value-item flex justify-between items-center text-sm">
                <span className="stage-name text-gray-700">{stage.name}</span>
                <span className="stage-value text-gray-900 font-medium">
                  {formatCurrency(stage.value)}
                  <span className="stage-count text-gray-500 ml-2">({stage.count})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
