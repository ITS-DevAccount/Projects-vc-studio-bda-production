'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Check, FolderOpen } from 'lucide-react';
import type { Workspace } from '@/lib/types/workspace';

interface WorkspaceSwitcherProps {
  currentWorkspaceId?: string;
  onWorkspaceChange?: (workspaceId: string) => void;
}

export function WorkspaceSwitcher({ currentWorkspaceId, onWorkspaceChange }: WorkspaceSwitcherProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<string | null>(currentWorkspaceId || null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (currentWorkspaceId) {
      setActiveWorkspace(currentWorkspaceId);
    }
  }, [currentWorkspaceId]);

  async function fetchWorkspaces() {
    try {
      const res = await fetch('/api/workspaces');
      const result = await res.json();

      if (res.ok && result.data) {
        setWorkspaces(result.data);
        if (result.data.length > 0 && !activeWorkspace) {
          setActiveWorkspace(result.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleWorkspaceChange(workspaceId: string) {
    setActiveWorkspace(workspaceId);
    setIsOpen(false);

    if (onWorkspaceChange) {
      onWorkspaceChange(workspaceId);
    } else {
      // Navigate to workspace
      window.location.href = `/workspace/${workspaceId}`;
    }
  }

  const currentWorkspace = workspaces.find((w) => w.id === activeWorkspace);

  if (loading) {
    return (
      <div className="px-4 py-2 bg-gray-100 rounded-lg animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-32"></div>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-500">
        No workspaces
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <div className="flex items-center gap-2 min-w-0">
          <FolderOpen className="h-4 w-4 text-gray-600 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-900 truncate">
            {currentWorkspace?.name || 'Select workspace'}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-600 flex-shrink-0 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => handleWorkspaceChange(workspace.id)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 flex items-center justify-between ${
                  workspace.id === activeWorkspace ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {workspace.name}
                    </p>
                    {workspace.status !== 'active' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {workspace.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{workspace.reference}</p>
                </div>
                {workspace.id === activeWorkspace && (
                  <Check className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />
                )}
              </button>
            ))}

            {/* Create New Option */}
            <div className="border-t border-gray-200">
              <a
                href="/workspace"
                className="block px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
              >
                <p className="text-sm font-medium text-blue-600">+ Create New Workspace</p>
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
