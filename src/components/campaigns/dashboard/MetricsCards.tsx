// ============================================================================
// BuildBid: Metrics Cards Component
// Displays four key metrics: Total Opportunities, In Progress, Converted, Lost
// ============================================================================

import { Card, CardContent } from '@/components/ui/card';
import type { OpportunityMetrics } from '@/lib/campaigns/utils/dashboardHelpers';

interface MetricsCardsProps {
  metrics: OpportunityMetrics | null;
}

interface MetricCardProps {
  title: string;
  value: number;
  subtitle?: string;
  color: 'purple' | 'blue' | 'green' | 'red';
}

function MetricCard({ title, value, subtitle, color }: MetricCardProps) {
  const borderColors = {
    purple: 'border-l-purple-600',
    blue: 'border-l-blue-600',
    green: 'border-l-green-600',
    red: 'border-l-red-600',
  };

  return (
    <Card className={`border-l-4 ${borderColors[color]}`}>
      <CardContent className="pt-6">
        <div className="metric-card">
          <div className="metric-title text-xs font-semibold text-gray-600 uppercase mb-2">
            {title}
          </div>
          <div className="metric-value text-3xl font-bold text-gray-900">
            {value}
          </div>
          {subtitle && (
            <div className="metric-subtitle text-sm text-gray-600 mt-1">
              {subtitle}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MetricsCards({ metrics }: MetricsCardsProps) {
  if (!metrics) return null;

  const inProgressPercentage = metrics.total > 0
    ? Math.round((metrics.inProgress / metrics.total) * 100)
    : 0;

  return (
    <div className="metrics-cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <MetricCard
        title="Total Opportunities"
        value={metrics.total}
        color="purple"
      />
      <MetricCard
        title="In Progress"
        value={metrics.inProgress}
        subtitle={`${inProgressPercentage}%`}
        color="blue"
      />
      <MetricCard
        title="Converted"
        value={metrics.converted}
        subtitle={`${Math.round(metrics.conversionRate)}%`}
        color="green"
      />
      <MetricCard
        title="Lost"
        value={metrics.lost}
        subtitle={`${Math.round(metrics.lossRate)}%`}
        color="red"
      />
    </div>
  );
}
