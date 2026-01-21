'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Settings } from 'lucide-react';
import { WorkspaceAccessManager } from '@/components/workspace/WorkspaceAccessManager';
import { WorkspaceConfigurationPanel } from '@/components/workspace/WorkspaceConfigurationPanel';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import type { WorkspaceWithDetails } from '@/lib/types/workspace';

export default function WorkspaceDetailPage() {
  const params = useParams();
  const workspaceId = params?.workspace_id as string;
  const [workspace, setWorkspace] = useState<WorkspaceWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspace();
    }
  }, [workspaceId]);

  async function fetchWorkspace() {
    try {
      setLoading(true);
      const res = await fetch(`/api/workspaces/${workspaceId}`);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to fetch workspace');
      }

      setWorkspace(result.data);
    } catch (error: any) {
      console.error('Failed to fetch workspace:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="rounded-lg bg-red-50 p-6">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error loading workspace</h3>
            <p className="text-sm text-red-700">{error || 'Workspace not found'}</p>
            <a
              href="/workspace"
              className="mt-4 inline-flex items-center text-sm font-medium text-red-800 hover:text-red-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to workspaces
            </a>
          </div>
        </div>
      </div>
    );
  }

  const canInvite =
    workspace.current_user_access?.access_role === 'owner' ||
    workspace.current_user_access?.permissions?.can_invite_users === true;

  return (
    <WorkspaceProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <a
              href="/workspace"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to workspaces
            </a>

            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{workspace.name}</h1>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      workspace.status
                    )}`}
                  >
                    {workspace.status}
                  </span>
                </div>
                <p className="text-gray-600">{workspace.reference}</p>
                {workspace.description && (
                  <p className="mt-2 text-gray-700">{workspace.description}</p>
                )}
              </div>

              <a
                href={`/workspace/${workspaceId}/settings`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </a>
            </div>

            {/* Metadata */}
            <div className="mt-4 flex items-center gap-6 text-sm text-gray-600">
              <div>
                <strong>Role:</strong>{' '}
                <span className="capitalize">{workspace.primary_role_code.replace('_', ' ')}</span>
              </div>
              <div>
                <strong>Created:</strong> {new Date(workspace.created_at).toLocaleDateString()}
              </div>
              {workspace.current_user_access && (
                <div>
                  <strong>Your access:</strong>{' '}
                  <span className="capitalize">{workspace.current_user_access.access_role}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {workspace.tags && workspace.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {workspace.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Placeholder for file explorer or other main content */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Workspace Files</h2>
                <div className="text-center py-12 text-gray-500">
                  <p>File explorer component will be integrated here</p>
                  <p className="text-sm mt-2">
                    This will show files from the workspace's root folder
                  </p>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <WorkspaceConfigurationPanel workspaceId={workspaceId} />
              <WorkspaceAccessManager workspaceId={workspaceId} canInvite={canInvite} />
            </div>
          </div>
        </div>
      </div>
    </WorkspaceProvider>
  );
}
