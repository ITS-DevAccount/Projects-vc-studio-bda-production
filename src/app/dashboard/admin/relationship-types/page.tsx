'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, Save, X, Loader } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminMenu from '@/components/admin/AdminMenu';

interface RelationshipType {
  id: string;
  code: string;
  label: string;
  description: string;
  is_bidirectional: boolean;
  reverse_label: string | null;
  is_active: boolean;
  created_at: string;
}

export default function RelationshipTypesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [types, setTypes] = useState<RelationshipType[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    code: '',
    label: '',
    description: '',
    is_bidirectional: true,
    reverse_label: '',
    is_active: true,
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

      const res = await fetch('/api/relationship-types', {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });
      if (!res.ok) throw new Error('Failed to load relationship types');
      const data = await res.json();
      setTypes(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (type: RelationshipType) => {
    setEditingId(type.id);
    setFormData({
      code: type.code,
      label: type.label,
      description: type.description || '',
      is_bidirectional: type.is_bidirectional,
      reverse_label: type.reverse_label || '',
      is_active: type.is_active,
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
      is_bidirectional: true,
      reverse_label: '',
      is_active: true,
    });
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingId(null);
    setFormData({
      code: '',
      label: '',
      description: '',
      is_bidirectional: true,
      reverse_label: '',
      is_active: true,
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

      const url = editingId
        ? `/api/relationship-types/${editingId}`
        : '/api/relationship-types';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify(formData),
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
    if (!confirm('Are you sure you want to delete this relationship type?')) return;

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch(`/api/relationship-types/${id}`, {
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
            <h1 className="text-2xl font-bold">Relationship Types</h1>
            <p className="text-brand-text-muted text-sm mt-1">
              Define the types of relationships between stakeholders
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 bg-accent-primary hover:bg-accent-primary-hover text-white px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            Create Type
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
            {editingId ? 'Edit Relationship Type' : 'Create Relationship Type'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Code * <span className="text-brand-text-muted font-normal">(e.g., supplier, customer)</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                  placeholder="supplier"
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
                  placeholder="Supplier"
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
                placeholder="Describe this relationship type..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_bidirectional}
                    onChange={(e) => setFormData({ ...formData, is_bidirectional: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Is Bidirectional?</span>
                </label>
                <p className="text-xs text-brand-text-muted mt-1 ml-6">
                  If checked, relationship works both ways (e.g., "Partner")
                </p>
              </div>

              {!formData.is_bidirectional && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Reverse Label <span className="text-brand-text-muted font-normal">(e.g., "Buyer")</span>
                  </label>
                  <input
                    type="text"
                    value={formData.reverse_label}
                    onChange={(e) => setFormData({ ...formData, reverse_label: e.target.value })}
                    className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                    placeholder="Buyer"
                  />
                </div>
              )}

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
                  Inactive types won't appear in dropdowns
                </p>
              </div>
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
        ) : types.length === 0 ? (
          <div className="p-8 text-center text-brand-text-muted">
            No relationship types found. Create one to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-section-subtle">
              <tr>
                <th className="text-left p-3 border-b border-section-border">Code</th>
                <th className="text-left p-3 border-b border-section-border">Label</th>
                <th className="text-left p-3 border-b border-section-border">Description</th>
                <th className="text-left p-3 border-b border-section-border">Bidirectional</th>
                <th className="text-left p-3 border-b border-section-border">Reverse Label</th>
                <th className="text-left p-3 border-b border-section-border">Active</th>
                <th className="text-left p-3 border-b border-section-border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {types.map((type) => (
                <tr key={type.id} className="hover:bg-section-subtle/50">
                  <td className="p-3 border-b border-section-border">
                    <code className="text-xs bg-section-subtle px-2 py-1 rounded">{type.code}</code>
                  </td>
                  <td className="p-3 border-b border-section-border font-medium">{type.label}</td>
                  <td className="p-3 border-b border-section-border text-brand-text-muted">
                    {type.description || '-'}
                  </td>
                  <td className="p-3 border-b border-section-border">
                    {type.is_bidirectional ? 'Yes' : 'No'}
                  </td>
                  <td className="p-3 border-b border-section-border">
                    {type.reverse_label || '-'}
                  </td>
                  <td className="p-3 border-b border-section-border">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        type.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {type.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3 border-b border-section-border">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(type)}
                        className="p-2 bg-section-subtle hover:bg-section-emphasis rounded transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(type.id)}
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
