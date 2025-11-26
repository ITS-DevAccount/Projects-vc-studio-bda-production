/**
 * Sprint 1d.6: Active Instances Tab
 * Shows list of running/completed workflow instances with filtering
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import type { MonitoringInstancesResponse } from '@/lib/types/monitoring';

export default function ActiveInstancesTab() {
  const router = useRouter();
  const [data, setData] = useState<MonitoringInstancesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchInstances = async () => {
    try {
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter.length > 0) {
        params.set('status', statusFilter.join(','));
      }
      if (search) {
        params.set('search', search);
      }

      const response = await fetch(`/api/monitoring/instances?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch instances');

      const result = await response.json();
      setData(result);
      setLastRefresh(new Date());
    } catch (err: any) {
      console.error('Error fetching instances:', err);
      setError(err.message || 'Failed to load instances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstances();
  }, [statusFilter, search]);

  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      fetchInstances();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(intervalId);
  }, [autoRefresh, statusFilter, search]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <PlayCircle className="w-5 h-5 text-blue-600" />;
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'SUSPENDED':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <PlayCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'SUSPENDED':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading instances...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchInstances}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Running</p>
              <p className="text-2xl font-bold text-blue-900">{data?.stats.running || 0}</p>
            </div>
            <PlayCircle className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Completed</p>
              <p className="text-2xl font-bold text-green-900">{data?.stats.completed || 0}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Failed</p>
              <p className="text-2xl font-bold text-red-900">{data?.stats.failed || 0}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">Suspended</p>
              <p className="text-2xl font-bold text-yellow-900">{data?.stats.suspended || 0}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by instance name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            {['RUNNING', 'COMPLETED', 'FAILED', 'SUSPENDED'].map((status) => (
              <button
                key={status}
                onClick={() => toggleStatusFilter(status)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  statusFilter.includes(status)
                    ? getStatusBadgeClass(status)
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Auto-refresh
          </label>

          <button
            onClick={fetchInstances}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Last updated: {lastRefresh.toLocaleTimeString()}
        {autoRefresh && ' (auto-refresh: 10s)'}
      </p>

      {/* Instances Table */}
      {!data?.instances || data.instances.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-600">No workflow instances found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Workflow
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Current Node
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.instances.map((instance) => (
                <tr key={instance.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {instance.instance_name || instance.workflow_name}
                    </div>
                    <div className="text-xs text-gray-500">{instance.workflow_type}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {instance.id.slice(0, 8)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(instance.status)}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                          instance.status
                        )}`}
                      >
                        {instance.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 font-medium mb-1">
                      {instance.completed_tasks} / {instance.total_tasks} tasks
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${instance.progress_percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {instance.progress_percentage}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDuration(instance.elapsed_seconds)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {instance.current_node_name || 'N/A'}
                    </div>
                    {instance.next_assigned_to_name && (
                      <div className="text-xs text-gray-500 mt-1">
                        Assigned: {instance.next_assigned_to_name}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => router.push(`/dashboard/admin/instances/${instance.id}`)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
