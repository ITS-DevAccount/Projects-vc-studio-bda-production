'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Loader, Save, Shield } from 'lucide-react';

const BDA_ROLES = [
  { value: 'individual', label: 'Individual' },
  { value: 'investor', label: 'Investor' },
  { value: 'producer', label: 'Producer/Service Provider' },
  { value: 'administrator', label: 'Administrator' },
];

interface StakeholderRole {
  id: string;
  role_type: string;
  assigned_at: string;
}

export default function ManageRolesPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [error, setError] = useState('');
  const [stakeholderName, setStakeholderName] = useState('');
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

      // Load stakeholder name
      const stakeholderRes = await fetch(`/api/stakeholders/${stakeholderId}`, {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });
      if (stakeholderRes.ok) {
        const stakeholderData = await stakeholderRes.json();
        setStakeholderName(stakeholderData.name || 'Unknown');
      }

      // Load current roles
      const rolesRes = await fetch(`/api/stakeholders/${stakeholderId}/roles`, {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setCurrentRoles(rolesData || []);
        setSelectedRoles(rolesData.map((r: StakeholderRole) => r.role_type));
      } else {
        const data = await rolesRes.json();
        throw new Error(data.error || 'Failed to load roles');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading roles');
    } finally {
      setLoadingRoles(false);
    }
  }

  const handleRoleToggle = (roleValue: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleValue)
        ? prev.filter((r) => r !== roleValue)
        : [...prev, roleValue]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      // Determine which roles to add and remove
      const currentRoleTypes = currentRoles.map((r) => r.role_type);
      const toAdd = selectedRoles.filter((r) => !currentRoleTypes.includes(r));
      const toRemove = currentRoleTypes.filter((r) => !selectedRoles.includes(r));

      if (toAdd.length > 0 || toRemove.length > 0) {
        const res = await fetch('/api/roles/assign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          },
          body: JSON.stringify({
            stakeholderId,
            add: toAdd,
            remove: toRemove,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update roles');
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
            <div className="grid md:grid-cols-2 gap-3 p-4 bg-section-subtle rounded-lg border border-section-border">
              {BDA_ROLES.map((role) => (
                <label key={role.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.value)}
                    onChange={() => handleRoleToggle(role.value)}
                    className="w-5 h-5 bg-section-light border border-section-border rounded cursor-pointer accent-accent-primary"
                  />
                  <span className="text-brand-text">{role.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Current Roles Display */}
          {currentRoles.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2 text-brand-text">Current Roles</label>
              <div className="flex flex-wrap gap-2">
                {currentRoles.map((role) => (
                  <span
                    key={role.id}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    {BDA_ROLES.find((r) => r.value === role.role_type)?.label || role.role_type}
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
