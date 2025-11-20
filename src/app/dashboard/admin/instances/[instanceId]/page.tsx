/**
 * Sprint 1d.4 Fix: Workflow Instance Status Detail Page
 * Location: /dashboard/admin/instances/[instanceId]
 * Shows detailed status of a single workflow instance
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, Clock, PlayCircle } from 'lucide-react';

interface TaskStatus {
  task_id: string | null;
  node_id: string;
  function_code: string;
  task_name: string;
  task_type: string;
  status: string;
  assigned_to_name: string;
  assigned_to_email: string;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

interface InstanceStatus {
  instance_id: string;
  workflow_code: string;
  workflow_name: string;
  instance_name: string | null;
  workflow_type: string;
  status: string;
  current_node_id: string | null;
  current_node_name: string;
  progress_percentage: number;
  completed_tasks: number;
  total_tasks: number;
  tasks: TaskStatus[];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export default function InstanceStatusPage({
  params,
}: {
  params: Promise<{ instanceId: string }>;
}) {
  const resolvedParams = use(params);
  const [instance, setInstance] = useState<InstanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInstanceStatus();
  }, [resolvedParams.instanceId]);

  const fetchInstanceStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/workflows/instances/${resolvedParams.instanceId}/status`);
      if (!response.ok) throw new Error('Failed to fetch instance status');

      const data = await response.json();
      setInstance(data);
    } catch (err: any) {
      console.error('Error fetching instance status:', err);
      setError(err.message || 'Failed to load instance status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <PlayCircle className="w-5 h-5 text-blue-600" />;
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'FAILED':
      case 'ERROR':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'NOT_STARTED':
        return <Clock className="w-5 h-5 text-gray-400" />;
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
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'NOT_STARTED':
        return 'bg-gray-100 text-gray-500';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">Loading instance status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <Link
            href="/dashboard/admin/instances"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Instances
          </Link>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <Link
            href="/dashboard/admin/instances"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Instances
          </Link>
        </div>
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-800">Instance not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-4">
        <Link
          href="/dashboard/admin/instances"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Instances
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {instance.instance_name || instance.workflow_name}
          </h1>
          {instance.instance_name && (
            <p className="text-sm text-gray-600 mt-1">
              Template: {instance.workflow_name}
            </p>
          )}
          <p className="text-gray-500 mt-1 text-sm">{instance.workflow_code}</p>
        </div>

        <button
          onClick={fetchInstanceStatus}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Overall Status Card */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Overall Status</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <div className="flex items-center gap-2 mt-1">
              {getStatusIcon(instance.status)}
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                  instance.status
                )}`}
              >
                {instance.status}
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600">Current Node</p>
            <p className="font-medium mt-1">{instance.current_node_name}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Progress</p>
            <p className="font-medium mt-1">
              {instance.completed_tasks} / {instance.total_tasks} tasks completed
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${instance.progress_percentage}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2 text-center">{instance.progress_percentage}% complete</p>

        {/* Timestamps */}
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Created</p>
            <p className="font-medium">{new Date(instance.created_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-600">Last Updated</p>
            <p className="font-medium">{new Date(instance.updated_at).toLocaleString()}</p>
          </div>
          {instance.completed_at && (
            <div>
              <p className="text-gray-600">Completed</p>
              <p className="font-medium">{new Date(instance.completed_at).toLocaleString()}</p>
            </div>
          )}
        </div>

        {instance.error_message && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm font-medium text-red-800">Error:</p>
            <p className="text-sm text-red-700">{instance.error_message}</p>
          </div>
        )}
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Tasks</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {instance.tasks.map((task, index) => (
                <tr
                  key={task.task_id || `not-started-${task.node_id}`}
                  className={`hover:bg-gray-50 ${task.status === 'NOT_STARTED' ? 'opacity-60' : ''}`}
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{task.task_name}</div>
                    <div className="text-sm text-gray-500">{task.function_code}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {task.task_type}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{task.assigned_to_name}</div>
                    <div className="text-sm text-gray-500">{task.assigned_to_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                          task.status
                        )}`}
                      >
                        {task.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {task.created_at ? new Date(task.created_at).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {task.completed_at ? new Date(task.completed_at).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
