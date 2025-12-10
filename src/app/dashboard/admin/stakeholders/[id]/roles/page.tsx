'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Loader, Shield } from 'lucide-react';

interface StakeholderRole {
  id: string;
  role_id: string;
  role?: {
    id: string;
    code: string;
    label: string;
    description?: string | null;
  };
  assigned_at: string;
}

interface AvailableRole {
  id: string;
  code: string;
  label: string;
  description?: string | null;
  is_active: boolean;
}

export default function ManageRolesPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [error, setError] = useState('');
  const [stakeholderName, setStakeholderName] = useState('');
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [primaryRoleId, setPrimaryRoleId] = useState<string>('');
  const [initialPrimaryRoleId, setInitialPrimaryRoleId] = useState<string>('');
  const [currentRoles, setCurrentRoles] = useState<StakeholderRole[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const stakeholderId = params?.id as string;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (stakeholderId) {
      loadStakeholderAndRoles();
    }
  }, [stakeholderId, user, authLoading]);

  async function loadStakeholderAndRoles() {
    if (!stakeholderId) return;
    setLoadingRoles(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      // Load stakeholder details
      const stakeholderRes = await fetch(`/api/stakeholders/${stakeholderId}`, {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });
      if (!stakeholderRes.ok) {
        const errorPayload = await stakeholderRes.json();
        throw new Error(errorPayload.error || 'Failed to load stakeholder');
      }

      const stakeholderData = await stakeholderRes.json();
      setStakeholderName(stakeholderData.name || 'Unknown');
      setPrimaryRoleId(stakeholderData.primary_role_id || '');
      setInitialPrimaryRoleId(stakeholderData.primary_role_id || '');

      // Load current roles
      const rolesRes = await fetch(`/api/stakeholders/${stakeholderId}/roles`, {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });
      if (!rolesRes.ok) {
        const data = await rolesRes.json();
        throw new Error(data.error || 'Failed to load roles');
      }

      const rolesData: StakeholderRole[] = await rolesRes.json();
      setCurrentRoles(rolesData || []);
      const assignedRoleIds = (rolesData || []).map((r) => r.role_id).filter(Boolean);
      setSelectedRoles(assignedRoleIds);

      // Fetch all active roles from database (not filtered by stakeholder type)
      await fetchAllActiveRoles(accessToken, stakeholderData.primary_role_id || '', assignedRoleIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading roles');
    } finally {
      setLoadingRoles(false);
    }
  }

  async function fetchAllActiveRoles(
    accessToken?: string,
    stakeholderPrimaryRoleId?: string,
    initiallySelectedRoleIds: string[] = []
  ) {
    try {
      // Fetch all active roles from the roles table (not filtered by stakeholder type)
      const res = await fetch('/api/roles?active_only=true', {
        headers: {
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load available roles');
      }

      const roles: AvailableRole[] = await res.json();
      setAvailableRoles(roles || []);

      // Set selected roles based on current assignments
      setSelectedRoles((prevSelected) => {
        const baseSelected = prevSelected.length ? prevSelected : initiallySelectedRoleIds;
        // Filter to only include role IDs that exist in available roles
        return baseSelected.filter((roleId) => roles.some((role) => role.id === roleId));
      });

      // Set primary role ID if it exists in available roles
      setPrimaryRoleId((prevPrimary) => {
        if (prevPrimary && roles.some((role) => role.id === prevPrimary)) {
          return prevPrimary;
        }
        if (stakeholderPrimaryRoleId && roles.some((role) => role.id === stakeholderPrimaryRoleId)) {
          return stakeholderPrimaryRoleId;
        }
        // If no primary role set and we have selected roles, use the first one
        if (initiallySelectedRoleIds.length > 0) {
          const firstSelected = initiallySelectedRoleIds[0];
          if (roles.some((role) => role.id === firstSelected)) {
            return firstSelected;
          }
        }
        return '';
      });
    } catch (err) {
      console.error('Error fetching available roles:', err);
      setAvailableRoles([]);
    }
  }

  const handleRoleToggle = (role: AvailableRole) => {
    setSelectedRoles((prev) => {
      const isSelected = prev.includes(role.id);
      const updated = isSelected ? prev.filter((r) => r !== role.id) : [...prev, role.id];

      // If removing the primary role, clear primary role selection
      if (isSelected && primaryRoleId === role.id) {
        // Set to first remaining selected role, or empty if none
        const remaining = updated.filter((id) => id !== role.id);
        setPrimaryRoleId(remaining.length > 0 ? remaining[0] : '');
      }

      // If adding first role and no primary role set, make it primary
      if (!isSelected && !primaryRoleId) {
        setPrimaryRoleId(role.id);
      }

      return updated;
    });
  };

  const handlePrimaryRoleChange = (roleId: string) => {
    if (!roleId) {
      setPrimaryRoleId('');
      return;
    }

    const role = availableRoles.find((r) => r.id === roleId);
    if (!role) {
      return;
    }

    setPrimaryRoleId(roleId);
    // Ensure the role is in selected roles
    setSelectedRoles((prev) => {
      if (prev.includes(role.id)) return prev;
      return [...prev, role.id];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      // Determine which roles to add and remove (using role_id, not role_type)
      const currentRoleIds = currentRoles.map((r) => r.role_id).filter(Boolean);
      const toAdd = selectedRoles.filter((roleId) => !currentRoleIds.includes(roleId));
      const toRemove = currentRoleIds.filter((roleId) => !selectedRoles.includes(roleId));

      if (selectedRoles.length > 0 && !primaryRoleId) {
        throw new Error('Please select a primary role for this stakeholder.');
      }

      // Update stakeholder_roles table using role_id (Phase 1b specification)
      if (toAdd.length > 0 || toRemove.length > 0) {
        const res = await fetch(`/api/stakeholders/${stakeholderId}/roles/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          },
          body: JSON.stringify({
            add: toAdd,
            remove: toRemove,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update roles');
        }
      }

      if (primaryRoleId !== initialPrimaryRoleId) {
        const res = await fetch(`/api/stakeholders/${stakeholderId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          },
          body: JSON.stringify({
            primary_role_id: primaryRoleId || null,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update primary role');
        }
      }

      router.push(`/dashboard/admin/stakeholders/${stakeholderId}/view`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating roles');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loadingRoles) {
    return (
      <div className="min-h-screen bg-brand-background flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-brand-text" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-background text-brand-text p-6">
      <div className="max-w-4xl mx-auto">
        <Link href={`/dashboard/admin/stakeholders/${stakeholderId}/view`} className="inline-flex items-center gap-2 text-brand-text hover:text-accent-primary transition mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to View
        </Link>

        <h1 className="text-2xl font-bold text-brand-text mb-2 flex items-center gap-2">
          <Shield className="w-6 h-6" /> Manage Roles
        </h1>
        <p className="text-sm text-brand-text-muted mb-6">Stakeholder: {stakeholderName}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-section-light border border-section-border rounded-lg p-6">
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-4 text-brand-text">Select Roles</label>
            {availableRoles.length === 0 ? (
              <p className="text-sm text-brand-text-muted">No roles are configured for this stakeholder type.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-3 p-4 bg-section-subtle rounded-lg border border-section-border">
                {availableRoles.map((role) => (
                  <label key={role.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role.id)}
                      onChange={() => handleRoleToggle(role)}
                      className="w-5 h-5 bg-section-light border border-section-border rounded cursor-pointer accent-accent-primary"
                    />
                    <span className="text-brand-text">
                      {role.label}
                      {role.id === primaryRoleId && (
                        <span className="ml-2 text-xs font-semibold text-accent-primary">(Primary)</span>
                      )}
                      <span className="block text-xs text-brand-text-muted">{role.description || ''}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {availableRoles.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2 text-brand-text">Primary Role</label>
              <select
                className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none text-brand-text"
                value={primaryRoleId}
                onChange={(e) => handlePrimaryRoleChange(e.target.value)}
              >
                <option value="">Select primary role</option>
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-brand-text-muted">
                The primary role determines the default dashboard a stakeholder sees after signing in.
              </p>
            </div>
          )}

          {/* Current Roles Display */}
          {currentRoles.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2 text-brand-text">Current Roles</label>
              <div className="flex flex-wrap gap-2">
                {currentRoles.map((role) => (
                  <span
                    key={role.id}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      role.role_id === primaryRoleId
                        ? 'bg-accent-primary text-white'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {role.role?.label || availableRoles.find((r) => r.id === role.role_id)?.label || 'Unknown Role'}
                    {role.role_id === primaryRoleId && ' (Primary)'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-accent-primary hover:bg-accent-primary-hover disabled:bg-neutral-400 text-white px-6 py-3 rounded-lg font-semibold transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {loading && <Loader className="w-5 h-5 animate-spin" />}
              {loading ? 'Saving...' : 'Save Roles'}
            </button>
            <Link
              href={`/dashboard/admin/stakeholders/${stakeholderId}/view`}
              className="flex-1 bg-section-subtle hover:bg-section-emphasis text-brand-text px-6 py-3 rounded-lg font-semibold transition text-center border border-section-border"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
