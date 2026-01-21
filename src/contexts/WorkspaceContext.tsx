'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { WorkspaceWithDetails } from '@/lib/types/workspace';

interface WorkspaceContextType {
  currentWorkspace: WorkspaceWithDetails | null;
  setCurrentWorkspace: (workspace: WorkspaceWithDetails | null) => void;
  workspaces: WorkspaceWithDetails[];
  loading: boolean;
  error: string | null;
  refreshWorkspaces: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceWithDetails | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshWorkspaces();
  }, []);

  async function refreshWorkspaces() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/workspaces');
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to fetch workspaces');
      }

      const fetchedWorkspaces = result.data || [];
      setWorkspaces(fetchedWorkspaces);

      // Set first workspace as current if none is set
      if (!currentWorkspace && fetchedWorkspaces.length > 0) {
        setCurrentWorkspace(fetchedWorkspaces[0]);
      }
    } catch (error: any) {
      console.error('Failed to fetch workspaces:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function switchWorkspace(workspaceId: string) {
    try {
      setLoading(true);
      setError(null);

      // Fetch detailed workspace information
      const res = await fetch(`/api/workspaces/${workspaceId}`);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to fetch workspace');
      }

      setCurrentWorkspace(result.data);
    } catch (error: any) {
      console.error('Failed to switch workspace:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  const value: WorkspaceContextType = {
    currentWorkspace,
    setCurrentWorkspace,
    workspaces,
    loading,
    error,
    refreshWorkspaces,
    switchWorkspace,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
