'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Loader, Star, Edit, X, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminMenu from '@/components/admin/AdminMenu';

interface StakeholderType {
  id: string;
  code: string;
  label: string;
  description: string | null;
  is_individual?: boolean;
  is_organization?: boolean;
  is_active?: boolean;
}

interface Role {
  id: string;
  code: string;
  label: string;
  description: string | null;
  scope: 'general' | 'specific';
}

interface StakeholderTypeRoleMapping {
  id: string;
  stakeholder_type_id: string;
  role_id: string;
  is_default: boolean;
  stakeholder_type: StakeholderType;
  role: Role;
}

export default function StakeholderTypeRolesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stakeholderTypes, setStakeholderTypes] = useState<StakeholderType[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [mappings, setMappings] = useState<StakeholderTypeRoleMapping[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<StakeholderType>>({});

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
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      // Fetch stakeholder types
      const typesRes = await fetch('/api/stakeholder-types', {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });
      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setStakeholderTypes(typesData || []);
      }

      // Fetch roles
      const rolesRes = await fetch('/api/roles', {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData || []);
      }

      // Fetch stakeholder type role mappings
      const mappingsRes = await fetch('/api/stakeholder-type-roles', {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });
      if (mappingsRes.ok) {
        const mappingsData = await mappingsRes.json();
        setMappings(mappingsData || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMapping() {
    if (!selectedType || !selectedRole) {
      setError('Please select both a stakeholder type and a role');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch('/api/stakeholder-type-roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({
          stakeholder_type_id: selectedType,
          role_id: selectedRole,
          is_default: false,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add mapping');
      }

      setSelectedType('');
      setSelectedRole('');
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to remove this role mapping?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch(`/api/stakeholder-type-roles/${id}`, {
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
  }

  async function handleToggleDefault(mapping: StakeholderTypeRoleMapping) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch(`/api/stakeholder-type-roles/${mapping.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({
          is_default: !mapping.is_default,
        }),
      });

      if (!res.ok) throw new Error('Failed to update');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleEditType(type: StakeholderType) {
    setEditingTypeId(type.id);
    setEditFormData({
      label: type.label,
      description: type.description || '',
      is_individual: type.is_individual || false,
      is_organization: type.is_organization || false,
      is_active: type.is_active !== undefined ? type.is_active : true,
    });
  }

  function handleCancelEdit() {
    setEditingTypeId(null);
    setEditFormData({});
  }

  async function handleSaveType() {
    if (!editingTypeId) return;

    setSaving(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch(`/api/stakeholder-types/${editingTypeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify(editFormData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }

      handleCancelEdit();
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteType(id: string, code: string) {
    if (!confirm(`Are you sure you want to delete the stakeholder type "${code}"? This action cannot be undone.`)) return;

    setSaving(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch(`/api/stakeholder-types/${id}`, {
        method: 'DELETE',
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }

      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Group mappings by stakeholder type
  const mappingsByType = stakeholderTypes.map(type => ({
    type,
    roles: mappings.filter(m => m.stakeholder_type_id === type.id),
  }));

  // Get available roles for the selected type (roles not yet assigned)
  const availableRolesForType = selectedType
    ? roles.filter(role =>
        !mappings.some(m =>
          m.stakeholder_type_id === selectedType && m.role_id === role.id
        )
      )
    : [];

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminMenu />
      
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-6">
          <div>
            <h1 className="text-2xl font-bold">Stakeholder Types</h1>
            <p className="text-brand-text-muted text-sm mt-1">
              Manage stakeholder types and configure which roles are available for each type
            </p>
          </div>
        </div>

      {error && (
        <div className="mb-4 bg-semantic-error-bg border border-red-500 text-semantic-error rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Stakeholder Types List */}
      <div className="mb-6 bg-section-light border border-section-border rounded-lg overflow-hidden">
        <div className="bg-section-subtle px-4 py-3 border-b border-section-border">
          <h2 className="text-lg font-semibold">Stakeholder Types</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-brand-text-muted">Loading...</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-section-subtle">
              <tr>
                <th className="text-left p-3 border-b border-section-border">Code</th>
                <th className="text-left p-3 border-b border-section-border">Label</th>
                <th className="text-left p-3 border-b border-section-border">Description</th>
                <th className="text-left p-3 border-b border-section-border">Type</th>
                <th className="text-left p-3 border-b border-section-border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stakeholderTypes.map((type) => (
                <tr key={type.id} className="hover:bg-section-subtle/50">
                  {editingTypeId === type.id ? (
                    <>
                      <td className="p-3 border-b border-section-border">
                        <code className="text-xs bg-section-subtle px-2 py-1 rounded">{type.code}</code>
                      </td>
                      <td className="p-3 border-b border-section-border">
                        <input
                          type="text"
                          value={editFormData.label || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, label: e.target.value })}
                          className="w-full px-2 py-1 bg-section-subtle border border-section-border rounded"
                          required
                        />
                      </td>
                      <td className="p-3 border-b border-section-border">
                        <input
                          type="text"
                          value={editFormData.description || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                          className="w-full px-2 py-1 bg-section-subtle border border-section-border rounded"
                        />
                      </td>
                      <td className="p-3 border-b border-section-border">
                        <div className="flex gap-2 text-xs">
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={editFormData.is_individual || false}
                              onChange={(e) => setEditFormData({ ...editFormData, is_individual: e.target.checked })}
                              className="w-3 h-3"
                            />
                            Individual
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={editFormData.is_organization || false}
                              onChange={(e) => setEditFormData({ ...editFormData, is_organization: e.target.checked })}
                              className="w-3 h-3"
                            />
                            Organization
                          </label>
                        </div>
                      </td>
                      <td className="p-3 border-b border-section-border">
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveType}
                            disabled={saving || !editFormData.label}
                            className="p-2 bg-accent-primary hover:bg-accent-primary-hover text-white rounded transition disabled:opacity-50"
                            title="Save"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={saving}
                            className="p-2 bg-section-subtle hover:bg-section-emphasis rounded transition"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-3 border-b border-section-border">
                        <code className="text-xs bg-section-subtle px-2 py-1 rounded">{type.code}</code>
                      </td>
                      <td className="p-3 border-b border-section-border font-medium">{type.label}</td>
                      <td className="p-3 border-b border-section-border text-brand-text-muted">
                        {type.description || '-'}
                      </td>
                      <td className="p-3 border-b border-section-border">
                        <div className="flex gap-2 text-xs">
                          {type.is_individual && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Individual</span>
                          )}
                          {type.is_organization && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">Organization</span>
                          )}
                          {!type.is_individual && !type.is_organization && (
                            <span className="text-brand-text-muted">-</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 border-b border-section-border">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditType(type)}
                            className="p-2 bg-section-subtle hover:bg-section-emphasis rounded transition"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteType(type.id, type.code)}
                            className="p-2 bg-semantic-error-bg hover:bg-red-900/40 text-semantic-error rounded transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Mapping Form */}
      <div className="mb-6 bg-section-light border border-section-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Add Role to Stakeholder Type</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-2">Stakeholder Type *</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
            >
              <option value="">Select type...</option>
              {stakeholderTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Role *</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
              disabled={!selectedType}
            >
              <option value="">Select role...</option>
              {availableRolesForType.map(role => (
                <option key={role.id} value={role.id}>
                  {role.label} {role.scope === 'specific' ? '(Specific)' : ''}
                </option>
              ))}
            </select>
            {selectedType && availableRolesForType.length === 0 && (
              <p className="text-xs text-brand-text-muted mt-1">
                All roles are already assigned to this stakeholder type
              </p>
            )}
          </div>

          <div className="flex items-end">
            <button
              onClick={handleAddMapping}
              disabled={saving || !selectedType || !selectedRole}
              className="flex items-center gap-2 bg-accent-primary hover:bg-accent-primary-hover text-white px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Add
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mappings by Stakeholder Type */}
      {loading ? (
        <div className="bg-section-light border border-section-border rounded-lg p-8 text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-brand-text-muted">Loading...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mappingsByType.map(({ type, roles: typeRoles }) => (
            <div
              key={type.id}
              className="bg-section-light border border-section-border rounded-lg overflow-hidden"
            >
              <div className="bg-section-subtle px-4 py-3 border-b border-section-border">
                <h3 className="font-semibold">{type.label}</h3>
                {type.description && (
                  <p className="text-sm text-brand-text-muted mt-1">{type.description}</p>
                )}
              </div>

              {typeRoles.length === 0 ? (
                <div className="p-6 text-center text-brand-text-muted">
                  No roles configured for this stakeholder type
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-section-subtle">
                    <tr>
                      <th className="text-left p-3 border-b border-section-border">Role</th>
                      <th className="text-left p-3 border-b border-section-border">Code</th>
                      <th className="text-left p-3 border-b border-section-border">Scope</th>
                      <th className="text-left p-3 border-b border-section-border">Default</th>
                      <th className="text-left p-3 border-b border-section-border">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeRoles.map((mapping) => (
                      <tr key={mapping.id} className="hover:bg-section-subtle/50">
                        <td className="p-3 border-b border-section-border font-medium">
                          {mapping.role.label}
                        </td>
                        <td className="p-3 border-b border-section-border">
                          <code className="text-xs bg-section-subtle px-2 py-1 rounded">
                            {mapping.role.code}
                          </code>
                        </td>
                        <td className="p-3 border-b border-section-border">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              mapping.role.scope === 'general'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {mapping.role.scope === 'general' ? 'General' : 'Specific'}
                          </span>
                        </td>
                        <td className="p-3 border-b border-section-border">
                          <button
                            onClick={() => handleToggleDefault(mapping)}
                            className={`p-1 rounded transition ${
                              mapping.is_default
                                ? 'text-yellow-500 hover:text-yellow-600'
                                : 'text-gray-400 hover:text-yellow-500'
                            }`}
                            title={mapping.is_default ? 'Default role' : 'Set as default'}
                          >
                            <Star
                              className="w-5 h-5"
                              fill={mapping.is_default ? 'currentColor' : 'none'}
                            />
                          </button>
                        </td>
                        <td className="p-3 border-b border-section-border">
                          <button
                            onClick={() => handleDelete(mapping.id)}
                            className="p-2 bg-semantic-error-bg hover:bg-red-900/40 text-semantic-error rounded transition"
                            title="Remove role"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
      </main>
    </div>
  );
}
