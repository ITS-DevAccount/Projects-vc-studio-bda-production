'use client';

import { useEffect, useState } from 'react';
import { Plus, FolderOpen, Users, Calendar } from 'lucide-react';
import type { WorkspaceWithDetails } from '@/lib/types/workspace';

interface WorkspaceListProps {
  onCreateClick?: () => void;
  onWorkspaceClick?: (workspaceId: string) => void;
}

export function WorkspaceList({ onCreateClick, onWorkspaceClick }: WorkspaceListProps) {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  async function fetchWorkspaces() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/workspaces');
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to fetch workspaces');
      }

      setWorkspaces(result.data || []);
    } catch (error: any) {
      console.error('Failed to fetch workspaces:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function handleWorkspaceClick(workspaceId: string) {
    if (onWorkspaceClick) {
      onWorkspaceClick(workspaceId);
    } else {
      window.location.href = `/workspace/${workspaceId}`;
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

  function getRoleBadgeColor(role: string) {
    switch (role) {
      case 'owner':
        return 'bg-blue-100 text-blue-800';
      case 'collaborator':
        return 'bg-purple-100 text-purple-800';
      case 'consultant':
        return 'bg-amber-100 text-amber-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading workspaces...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading workspaces</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={fetchWorkspaces}
                className="text-sm font-medium text-red-800 hover:text-red-900"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Workspaces</h2>
          <p className="mt-1 text-sm text-gray-600">
            {workspaces.length} {workspaces.length === 1 ? 'workspace' : 'workspaces'}
          </p>
        </div>
        <button
          onClick={onCreateClick}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Workspace
        </button>
      </div>

      {/* Workspace Grid */}
      {workspaces.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No workspaces</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new workspace.</p>
          <div className="mt-6">
            <button
              onClick={onCreateClick}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Workspace
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <div
              key={workspace.id}
              onClick={() => handleWorkspaceClick(workspace.id)}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 overflow-hidden"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {workspace.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{workspace.reference}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      workspace.status
                    )}`}
                  >
                    {workspace.status}
                  </span>
                </div>

                {/* Description */}
                {workspace.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                    {workspace.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="mr-2 h-4 w-4" />
                    <span className="capitalize">
                      {workspace.current_user_access?.access_role || 'N/A'}
                    </span>
                    <span
                      className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(
                        workspace.current_user_access?.access_role || ''
                      )}`}
                    >
                      {workspace.current_user_access?.access_role || 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>
                      Created {new Date(workspace.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {workspace.access_control && workspace.access_control.length > 1 && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Users className="mr-2 h-4 w-4" />
                      <span>{workspace.access_control.length} collaborators</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {workspace.tags && workspace.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1">
                    {workspace.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                    {workspace.tags.length > 3 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        +{workspace.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                <div className="text-sm text-gray-600 capitalize">
                  {workspace.primary_role_code.replace('_', ' ')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
