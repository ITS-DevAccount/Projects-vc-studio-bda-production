// ============================================================================
// BuildBid: Dashboard Skeleton Component
// Loading skeleton for campaign dashboard
// ============================================================================

import { Card, CardContent } from '@/components/ui/card';

export default function DashboardSkeleton() {
  return (
    <div className="campaign-dashboard max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Campaign Header Skeleton */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="flex gap-4">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-Column Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Funnel Visualization Skeleton */}
          <Card>
            <CardContent className="pt-6">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-32 mb-6"></div>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="mb-4">
                    <div className="flex justify-between mb-2">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Skeleton */}
          <Card>
            <CardContent className="pt-6">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-32 mb-6"></div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 mb-4">
                    <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Pipeline Value Skeleton */}
          <Card>
            <CardContent className="pt-6">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-32 mb-6"></div>
                <div className="h-8 bg-gray-200 rounded w-24 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-32 mb-6"></div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between mb-2">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Actions Skeleton */}
          <Card>
            <CardContent className="pt-6">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-32 mb-6"></div>
                {[1, 2].map((i) => (
                  <div key={i} className="mb-4">
                    <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Team Activity Skeleton */}
          <Card>
            <CardContent className="pt-6">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-32 mb-6"></div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 mb-4">
                    <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
