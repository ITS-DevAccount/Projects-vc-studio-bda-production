'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, Save, X, Loader } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminMenu from '@/components/admin/AdminMenu';

interface Role {
  id: string;
  code: string;
  label: string;
  description: string;
  is_active: boolean;
  scope: 'general' | 'specific';
  specific_stakeholder_id: string | null;
  created_at: string;
}

interface Stakeholder {
  id: string;
  name: string;
  reference: string;
}

export default function RolesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    code: '',
    label: '',
    description: '',
    is_active: true,
    scope: 'general' as 'general' | 'specific',
    specific_stakeholder_id: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user) {
      loadData();
    }
  }, [user, authLoading]);

  async function loadData() {
    setLoading(true);
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      // Fetch roles
      const res = await fetch('/api/roles', {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });
      if (!res.ok) throw new Error('Failed to load roles');
      const data = await res.json();
      setRoles(data || []);

      // Fetch stakeholders for the specific stakeholder dropdown
      const stakeholdersRes = await fetch('/api/stakeholders?pageSize=1000', {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });
      if (stakeholdersRes.ok) {
        const stakeholdersData = await stakeholdersRes.json();
        setStakeholders(stakeholdersData.data || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (role: Role) => {
    setEditingId(role.id);
    setFormData({
      code: role.code,
      label: role.label,
      description: role.description || '',
      is_active: role.is_active,
      scope: role.scope || 'general',
      specific_stakeholder_id: role.specific_stakeholder_id || '',
    });
    setShowCreateForm(false);
  };

  const handleCreate = () => {
    setShowCreateForm(true);
    setEditingId(null);
    setFormData({
      code: '',
      label: '',
      description: '',
      is_active: true,
      scope: 'general',
      specific_stakeholder_id: '',
    });
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingId(null);
    setFormData({
      code: '',
      label: '',
      description: '',
      is_active: true,
      scope: 'general',
      specific_stakeholder_id: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const url = editingId ? `/api/roles/${editingId}` : '/api/roles';
      const method = editingId ? 'PATCH' : 'POST';

      // Prepare data: convert empty string to null for UUID fields
      // If scope is 'general', set specific_stakeholder_id to null
      // If scope is 'specific' but no stakeholder selected, keep empty string (validation will catch it)
      const submitData: any = {
        ...formData,
        // Convert empty string to null for UUID field
        specific_stakeholder_id: formData.scope === 'general' || !formData.specific_stakeholder_id 
          ? null 
          : formData.specific_stakeholder_id,
        // Ensure description is null if empty
        description: formData.description || null,
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify(submitData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      handleCancel();
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role? This may affect existing stakeholder role assignments.')) return;

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch(`/api/roles/${id}`, {
        method: 'DELETE',
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });

      if (!res.ok) throw new Error('Failed to delete');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
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
            <h1 className="text-2xl font-bold">Roles</h1>
            <p className="text-brand-text-muted text-sm mt-1">
              Define the roles that can be assigned to stakeholders
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 bg-accent-primary hover:bg-accent-primary-hover text-white px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            Create Role
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-semantic-error-bg border border-red-500 text-semantic-error rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Create/Edit Form */}
      {(showCreateForm || editingId) && (
        <div className="mb-6 bg-section-light border border-section-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Role' : 'Create Role'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Code * <span className="text-brand-text-muted font-normal">(e.g., investor, administrator)</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                  placeholder="investor"
                  required
                  disabled={!!editingId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Label *</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                  placeholder="Investor"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                rows={2}
                placeholder="Describe this role..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Scope *</label>
                <select
                  value={formData.scope}
                  onChange={(e) => setFormData({
                    ...formData,
                    scope: e.target.value as 'general' | 'specific',
                    specific_stakeholder_id: e.target.value === 'general' ? '' : formData.specific_stakeholder_id
                  })}
                  className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                >
                  <option value="general">General (App-wide)</option>
                  <option value="specific">Specific (Single Stakeholder)</option>
                </select>
                <p className="text-xs text-brand-text-muted mt-1">
                  General roles are available to all. Specific roles are limited to one stakeholder.
                </p>
              </div>

              {formData.scope === 'specific' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Specific Stakeholder *</label>
                  <select
                    value={formData.specific_stakeholder_id}
                    onChange={(e) => setFormData({ ...formData, specific_stakeholder_id: e.target.value })}
                    className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                    required={formData.scope === 'specific'}
                  >
                    <option value="">Select stakeholder...</option>
                    {stakeholders.map(stakeholder => (
                      <option key={stakeholder.id} value={stakeholder.id}>
                        {stakeholder.name} ({stakeholder.reference})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-brand-text-muted mt-1">
                    This role will only be available for this stakeholder
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Is Active?</span>
              </label>
              <p className="text-xs text-brand-text-muted mt-1 ml-6">
                Inactive roles won't appear in dropdowns
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-accent-primary hover:bg-accent-primary-hover text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {editingId ? 'Update' : 'Create'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-2 bg-section-subtle hover:bg-section-emphasis px-4 py-2 rounded-lg transition"
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="bg-section-light border border-section-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-brand-text-muted">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
            Loading...
          </div>
        ) : roles.length === 0 ? (
          <div className="p-8 text-center text-brand-text-muted">
            No roles found. Create one to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-section-subtle">
              <tr>
                <th className="text-left p-3 border-b border-section-border">Code</th>
                <th className="text-left p-3 border-b border-section-border">Label</th>
                <th className="text-left p-3 border-b border-section-border">Description</th>
                <th className="text-left p-3 border-b border-section-border">Scope</th>
                <th className="text-left p-3 border-b border-section-border">Active</th>
                <th className="text-left p-3 border-b border-section-border">Created</th>
                <th className="text-left p-3 border-b border-section-border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-section-subtle/50">
                  <td className="p-3 border-b border-section-border">
                    <code className="text-xs bg-section-subtle px-2 py-1 rounded">{role.code}</code>
                  </td>
                  <td className="p-3 border-b border-section-border font-medium">{role.label}</td>
                  <td className="p-3 border-b border-section-border text-brand-text-muted">
                    {role.description || '-'}
                  </td>
                  <td className="p-3 border-b border-section-border">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        role.scope === 'general'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {role.scope === 'general' ? 'General' : 'Specific'}
                    </span>
                  </td>
                  <td className="p-3 border-b border-section-border">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        role.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {role.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3 border-b border-section-border text-brand-text-muted text-xs">
                    {new Date(role.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 border-b border-section-border">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(role)}
                        className="p-2 bg-section-subtle hover:bg-section-emphasis rounded transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(role.id)}
                        className="p-2 bg-semantic-error-bg hover:bg-red-900/40 text-semantic-error rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </main>
    </div>
  );
}
