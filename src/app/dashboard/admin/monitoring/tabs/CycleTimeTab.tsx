/**
 * Sprint 1d.6: Cycle Time Reporting Tab
 * Shows end-to-end workflow duration metrics and trends
 */

'use client';

import { useState, useEffect } from 'react';
import { Clock, TrendingUp, RefreshCw } from 'lucide-react';
import type { CycleTimeResponse } from '@/lib/types/monitoring';

export default function CycleTimeTab() {
  const [data, setData] = useState<CycleTimeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysBack, setDaysBack] = useState(30);

  const fetchCycleTime = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/monitoring/cycle-time?days_back=${daysBack}`);
      if (!response.ok) throw new Error('Failed to fetch cycle time data');

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      console.error('Error fetching cycle time:', err);
      setError(err.message || 'Failed to load cycle time data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCycleTime();
  }, [daysBack]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Calculating cycle time metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchCycleTime}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Date Range:</label>
          <select
            value={daysBack}
            onChange={(e) => setDaysBack(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        <button
          onClick={fetchCycleTime}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-600">Average Cycle Time</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatDuration(data?.overall_stats.average_duration || 0)}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-600">Median Cycle Time</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatDuration(data?.overall_stats.median_duration || 0)}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Workflows</p>
          <p className="text-2xl font-bold text-gray-900">
            {data?.overall_stats.total_workflows || 0}
          </p>
        </div>
      </div>

      {/* Cycle Time by Workflow Type */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Cycle Time by Workflow Type</h3>
        </div>

        {!data?.metrics || data.metrics.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            No cycle time data available for the selected period
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Workflow Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Instances
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Average
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Median
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  P95
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Min / Max
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.metrics.map((metric) => (
                <tr key={metric.workflow_type} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{metric.workflow_type}</div>
                    <div className="text-xs text-gray-500">{metric.workflow_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {metric.total_instances}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatDuration(metric.average_duration)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDuration(metric.median_duration)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDuration(metric.p95_duration)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                    <div>{formatDuration(metric.min_duration)}</div>
                    <div>{formatDuration(metric.max_duration)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs space-y-1">
                      <div className="text-green-600">{metric.completed_count} completed</div>
                      {metric.failed_count > 0 && (
                        <div className="text-red-600">{metric.failed_count} failed</div>
                      )}
                      {metric.running_count > 0 && (
                        <div className="text-blue-600">{metric.running_count} running</div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Duration Distribution */}
      {data && data.distribution.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Duration Distribution</h3>
          <div className="space-y-3">
            {data.distribution.map((bucket) => (
              <div key={bucket.duration_bucket}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {bucket.duration_bucket}
                  </span>
                  <span className="text-sm text-gray-600">
                    {bucket.instance_count} workflows ({bucket.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${bucket.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
