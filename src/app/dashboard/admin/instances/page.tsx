/**
 * Sprint 1d.4 Fix: Workflow Instances List Page
 * Location: /dashboard/admin/instances
 * Shows all workflow instances with their status
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, PlayCircle, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';

interface WorkflowInstance {
  id: string;
  workflow_code: string;
  status: string;
  current_node_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export default function WorkflowInstancesListPage() {
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInstances();
  }, []);

  const fetchInstances = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/workflows/instances');
      if (!response.ok) throw new Error('Failed to fetch instances');

      const data = await response.json();
      setInstances(data.instances || data || []);
    } catch (err: any) {
      console.error('Error fetching instances:', err);
      setError(err.message || 'Failed to load instances');
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
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      case 'SUSPENDED':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-4">
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin Dashboard
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Instances</h1>
          <p className="text-gray-600 mt-2">Monitor running and completed workflow instances</p>
        </div>

        <button
          onClick={fetchInstances}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">Loading instances...</p>
        </div>
      ) : instances.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">No workflow instances found</p>
          <Link
            href="/dashboard/admin/workflow-instances"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition inline-block"
          >
            Create Workflow Instance
          </Link>
        </div>
      ) : (
        /* Instances Table */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Workflow
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Node
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {instances.map((instance) => (
                <tr key={instance.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {instance.workflow_code}
                    </div>
                    <div className="text-sm text-gray-500">ID: {instance.id.slice(0, 8)}...</div>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {instance.current_node_id || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(instance.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/dashboard/admin/instances/${instance.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </Link>
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
