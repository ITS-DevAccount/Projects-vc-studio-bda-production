'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { WorkspaceAccessControl, GrantAccessRequest } from '@/lib/types/workspace';

interface WorkspaceAccessManagerProps {
  workspaceId: string;
  canInvite?: boolean;
}

export function WorkspaceAccessManager({ workspaceId, canInvite = false }: WorkspaceAccessManagerProps) {
  const [accessList, setAccessList] = useState<WorkspaceAccessControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('viewer');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAccessList();
  }, [workspaceId]);

  async function fetchAccessList() {
    try {
      setLoading(true);
      const res = await fetch(`/api/workspaces/${workspaceId}/access`);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to fetch access list');
      }

      setAccessList(result.data || []);
    } catch (error: any) {
      console.error('Failed to fetch access list:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // First, find stakeholder by email
      const stakeholderRes = await fetch(`/api/stakeholders?email=${encodeURIComponent(inviteEmail)}`);
      const stakeholderResult = await stakeholderRes.json();

      if (!stakeholderRes.ok || !stakeholderResult.data || stakeholderResult.data.length === 0) {
        throw new Error('No stakeholder found with that email');
      }

      const stakeholderId = stakeholderResult.data[0].id;

      // Grant access
      const grantRequest: GrantAccessRequest = {
        stakeholder_id: stakeholderId,
        access_role: inviteRole as any,
      };

      const res = await fetch(`/api/workspaces/${workspaceId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(grantRequest),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to grant access');
      }

      // Reset form and refresh list
      setInviteEmail('');
      setInviteRole('viewer');
      await fetchAccessList();
    } catch (error: any) {
      console.error('Failed to grant access:', error);
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevokeAccess(accessId: string, stakeholderName: string) {
    if (!confirm(`Are you sure you want to revoke access for ${stakeholderName}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/access/${accessId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to revoke access');
      }

      await fetchAccessList();
    } catch (error: any) {
      console.error('Failed to revoke access:', error);
      setError(error.message);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-600" />;
      case 'declined':
      case 'revoked':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Access Control</h3>
        <p className="text-sm text-gray-600 mt-1">
          Manage who can access this workspace
        </p>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Invite Form */}
        {canInvite && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Invite User</h4>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="email"
                  placeholder="Enter email to invite"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="viewer">Viewer</option>
                <option value="consultant">Consultant</option>
                <option value="collaborator">Collaborator</option>
              </select>
              <button
                onClick={handleInvite}
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  'Inviting...'
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Enter the email address of an existing user to grant them access to this workspace
            </p>
          </div>
        )}

        {/* Access List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Current Access</h4>
          {accessList.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              No access grants yet
            </p>
          ) : (
            <div className="space-y-2">
              {accessList.map((access) => (
                <div
                  key={access.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">
                        {access.stakeholder?.name || 'Unknown User'}
                      </p>
                      {getStatusIcon(access.invitation_status)}
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {access.stakeholder?.email || 'No email'}
                    </p>
                    {access.invited_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        Invited {new Date(access.invited_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(
                        access.access_role
                      )}`}
                    >
                      {access.access_role}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        access.invitation_status === 'accepted'
                          ? 'bg-green-100 text-green-800'
                          : access.invitation_status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {access.invitation_status}
                    </span>
                    {access.access_role !== 'owner' && canInvite && (
                      <button
                        onClick={() =>
                          handleRevokeAccess(access.id, access.stakeholder?.name || 'this user')
                        }
                        className="p-2 text-gray-400 hover:text-red-600 focus:outline-none"
                        title="Revoke access"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Permissions Info */}
        <div className="rounded-lg bg-gray-50 p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Role Permissions</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <p><strong>Owner:</strong> Full control, can delete workspace</p>
            <p><strong>Collaborator:</strong> Can edit and manage files</p>
            <p><strong>Consultant:</strong> Can view and suggest changes</p>
            <p><strong>Viewer:</strong> Read-only access</p>
          </div>
        </div>
      </div>
    </div>
  );
}
