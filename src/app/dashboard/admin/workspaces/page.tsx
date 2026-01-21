'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Plus, Loader, Briefcase } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminMenu from '@/components/admin/AdminMenu';
import { WorkspaceCreationWizard } from '@/components/workspace/WorkspaceCreationWizard';

interface Workspace {
  id: string;
  name: string;
  status: string;
  created_at: string;
  owner: {
    name: string;
    reference: string;
  };
  current_user_access: {
    access_role: string;
  };
}

export default function AdminWorkspacesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user) {
      loadWorkspaces();
    }
  }, [user, authLoading]);

  async function loadWorkspaces() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch('/api/workspaces', {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });

      if (!res.ok) throw new Error('Failed to load workspaces');
      const data = await res.json();
      setWorkspaces(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleWorkspaceCreated = (_workspaceId: string) => {
    loadWorkspaces();
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminMenu />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Workspaces</h1>
              <p className="text-brand-text-muted text-sm mt-1">
                Create and manage workspaces for stakeholders
              </p>
            </div>
            {!loading && workspaces.length > 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-accent-primary hover:bg-accent-primary-hover text-white px-4 py-2 rounded-lg transition"
              >
                <Plus className="w-5 h-5" />
                Create Workspace
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-semantic-error-bg border border-red-500 text-semantic-error rounded-lg p-4">
            {error}
          </div>
        )}

        <div className="bg-section-light border border-section-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-brand-text-muted">
              <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
              Loading...
            </div>
          ) : workspaces.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No workspaces yet</h3>
              <p className="text-gray-600 mb-6">
                Get started by creating a workspace for a stakeholder
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 bg-accent-primary hover:bg-accent-primary-hover text-white px-4 py-2 rounded-lg transition"
              >
                <Plus className="w-5 h-5" />
                Create Your First Workspace
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-section-subtle">
                <tr>
                  <th className="text-left p-3 border-b border-section-border">Name</th>
                  <th className="text-left p-3 border-b border-section-border">Owner</th>
                  <th className="text-left p-3 border-b border-section-border">Role</th>
                  <th className="text-left p-3 border-b border-section-border">Status</th>
                  <th className="text-left p-3 border-b border-section-border">Created</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.map((workspace) => (
                  <tr key={workspace.id} className="hover:bg-section-subtle/50">
                    <td className="p-3 border-b border-section-border font-medium">
                      {workspace.name}
                    </td>
                    <td className="p-3 border-b border-section-border">
                      {workspace.owner?.name || 'Unknown'}
                      {workspace.owner?.reference && (
                        <span className="text-brand-text-muted ml-1">({workspace.owner.reference})</span>
                      )}
                    </td>
                    <td className="p-3 border-b border-section-border">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {workspace.current_user_access?.access_role || 'N/A'}
                      </span>
                    </td>
                    <td className="p-3 border-b border-section-border">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          workspace.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {workspace.status}
                      </span>
                    </td>
                    <td className="p-3 border-b border-section-border text-brand-text-muted text-xs">
                      {new Date(workspace.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      <WorkspaceCreationWizard
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleWorkspaceCreated}
      />
    </div>
  );
}
