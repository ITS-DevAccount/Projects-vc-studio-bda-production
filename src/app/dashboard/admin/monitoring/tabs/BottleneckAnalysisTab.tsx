/**
 * Sprint 1d.6: Bottleneck Analysis Tab
 * Identifies slow tasks and performance bottlenecks
 */

'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import type { BottleneckAnalysisResponse } from '@/lib/types/monitoring';

export default function BottleneckAnalysisTab() {
  const [data, setData] = useState<BottleneckAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysBack, setDaysBack] = useState(30);

  const fetchBottlenecks = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/monitoring/bottlenecks?days_back=${daysBack}`);
      if (!response.ok) throw new Error('Failed to fetch bottleneck analysis');

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      console.error('Error fetching bottlenecks:', err);
      setError(err.message || 'Failed to load bottleneck analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBottlenecks();
  }, [daysBack]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Analyzing performance...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchBottlenecks}
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
          onClick={fetchBottlenecks}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Workflows Analyzed</p>
          <p className="text-2xl font-bold text-gray-900">
            {data?.overall_stats.total_workflows || 0}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Tasks Analyzed</p>
          <p className="text-2xl font-bold text-gray-900">
            {data?.overall_stats.total_tasks || 0}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Avg Task Duration</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatDuration(data?.overall_stats.average_workflow_duration || 0)}
          </p>
        </div>
      </div>

      {/* Bottlenecks Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Slowest Tasks</h3>
          <p className="text-sm text-gray-600 mt-1">Tasks sorted by average duration (slowest first)</p>
        </div>

        {!data?.bottlenecks || data.bottlenecks.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            No bottleneck data available for the selected period
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Task / Node
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Workflow Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Avg Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  P95 Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Executions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Failure Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.bottlenecks.slice(0, 20).map((bottleneck, index) => {
                const isSlow = bottleneck.average_duration > 300; // > 5 minutes
                const hasHighFailureRate = bottleneck.failure_rate > 10;

                return (
                  <tr key={`${bottleneck.node_id}-${bottleneck.workflow_type}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">#{index + 1}</span>
                        {(isSlow || hasHighFailureRate) && (
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {bottleneck.node_name}
                      </div>
                      <div className="text-xs text-gray-500">{bottleneck.function_code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {bottleneck.workflow_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatDuration(bottleneck.average_duration)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Min: {formatDuration(bottleneck.min_duration)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDuration(bottleneck.p95_duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div>{bottleneck.total_executions}</div>
                      <div className="text-xs text-green-600">
                        {bottleneck.completed_count} completed
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          hasHighFailureRate
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {bottleneck.failure_rate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Recommendations */}
      {data && data.bottlenecks.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900">Performance Recommendations</h4>
              <ul className="mt-2 space-y-1 text-sm text-blue-800">
                {data.bottlenecks[0] && (
                  <li>
                    • Focus on optimizing "{data.bottlenecks[0].node_name}" which has the highest
                    average duration of {formatDuration(data.bottlenecks[0].average_duration)}
                  </li>
                )}
                {data.bottlenecks.filter((b) => b.failure_rate > 10).length > 0 && (
                  <li>
                    • {data.bottlenecks.filter((b) => b.failure_rate > 10).length} task(s) have
                    failure rates above 10% - investigate error handling
                  </li>
                )}
                <li>
                  • Consider adding service tasks for long-running operations to improve user
                  experience
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
