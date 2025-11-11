'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Loader, Users, Plus, Trash2, Edit } from 'lucide-react';

interface RelationshipType {
  id: string;
  code: string;
  label: string;
  description: string | null;
  is_bidirectional: boolean;
  reverse_label: string | null;
}

interface Stakeholder {
  id: string;
  name: string;
  reference: string;
}

interface Relationship {
  id: string;
  reference: string;
  from_stakeholder_id: string;
  to_stakeholder_id: string;
  relationship_type_id: string;
  strength: number | null;
  status: 'active' | 'inactive' | 'pending' | 'terminated';
  start_date: string;
  from_stakeholder?: { name: string };
  to_stakeholder?: { name: string };
  relationship_type?: { label: string; code: string };
}

export default function ManageRelationshipsPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [stakeholder, setStakeholder] = useState<Stakeholder | null>(null);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    to_stakeholder_id: '',
    relationship_type_id: '',
    strength: '',
    status: 'active' as 'active' | 'inactive' | 'pending' | 'terminated',
  });

  const stakeholderId = params?.id as string;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (stakeholderId) {
      loadData();
    }
  }, [stakeholderId, user, authLoading]);

  async function loadData() {
    if (!stakeholderId) return;
    setLoadingData(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      // Load stakeholder
      const stakeholderRes = await fetch(`/api/stakeholders/${stakeholderId}`, {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });
      if (stakeholderRes.ok) {
        const data = await stakeholderRes.json();
        setStakeholder(data);
      }

      // Load all stakeholders for dropdown
      const stakeholdersRes = await fetch('/api/stakeholders?pageSize=1000', {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });
      if (stakeholdersRes.ok) {
        const data = await stakeholdersRes.json();
        setStakeholders(data.data || []);
      }

      // Load relationship types
      const typesRes = await fetch('/api/relationship-types', {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });
      if (typesRes.ok) {
        const data = await typesRes.json();
        setRelationshipTypes(data || []);
      }

      // Load relationships
      const relsRes = await fetch(`/api/relationships?stakeholderId=${stakeholderId}&direction=both`, {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });
      if (relsRes.ok) {
        const data = await relsRes.json();
        setRelationships(data.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading data');
    } finally {
      setLoadingData(false);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.to_stakeholder_id || !formData.relationship_type_id) {
        throw new Error('Please select a stakeholder and relationship type');
      }

      if (formData.to_stakeholder_id === stakeholderId) {
        throw new Error('Cannot create relationship to the same stakeholder');
      }

      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const payload: any = {
        from_stakeholder_id: stakeholderId,
        to_stakeholder_id: formData.to_stakeholder_id,
        relationship_type_id: formData.relationship_type_id,
        status: formData.status,
      };

      if (formData.strength) {
        payload.strength = parseInt(formData.strength);
      }

      let res;
      if (editingId) {
        res = await fetch(`/api/relationships/${editingId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/relationships', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save relationship');
      }

      // Reset form and reload
      setFormData({ to_stakeholder_id: '', relationship_type_id: '', strength: '', status: 'active' });
      setShowCreateForm(false);
      setEditingId(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving relationship');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rel: Relationship) => {
    setFormData({
      to_stakeholder_id: rel.to_stakeholder_id,
      relationship_type_id: rel.relationship_type_id,
      strength: rel.strength?.toString() || '',
      status: rel.status,
    });
    setEditingId(rel.id);
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this relationship?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch(`/api/relationships/${id}`, {
        method: 'DELETE',
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete relationship');
      }

      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting relationship');
    }
  };

  const handleCancel = () => {
    setFormData({ to_stakeholder_id: '', relationship_type_id: '', strength: '', status: 'active' });
    setShowCreateForm(false);
    setEditingId(null);
  };

  if (authLoading || loadingData) {
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
          <Users className="w-6 h-6" /> Manage Relationships
        </h1>
        <p className="text-sm text-brand-text-muted mb-6">Stakeholder: {stakeholder?.name || 'Unknown'}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-6">
            {error}
          </div>
        )}

        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="mb-6 px-4 py-2 bg-accent-primary text-white rounded hover:bg-accent-primary-hover transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Relationship
          </button>
        )}

        {showCreateForm && (
          <form onSubmit={handleSubmit} className="bg-section-light border border-section-border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-brand-text mb-4">{editingId ? 'Edit Relationship' : 'Add Relationship'}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-brand-text">Related Stakeholder *</label>
                <select
                  name="to_stakeholder_id"
                  value={formData.to_stakeholder_id}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text transition"
                >
                  <option value="">Select a stakeholder...</option>
                  {stakeholders
                    .filter((s) => s.id !== stakeholderId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.reference})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-brand-text">Relationship Type *</label>
                <select
                  name="relationship_type_id"
                  value={formData.relationship_type_id}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text transition"
                >
                  <option value="">Select a type...</option>
                  {relationshipTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label} {type.description ? `- ${type.description}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-brand-text">Strength (1-10)</label>
                  <input
                    type="number"
                    name="strength"
                    value={formData.strength}
                    onChange={handleChange}
                    min="1"
                    max="10"
                    className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-brand-text">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text transition"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-accent-primary hover:bg-accent-primary-hover disabled:bg-neutral-400 text-white px-6 py-3 rounded-lg font-semibold transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  {loading && <Loader className="w-5 h-5 animate-spin" />}
                  {loading ? 'Saving...' : editingId ? 'Update Relationship' : 'Create Relationship'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-section-subtle hover:bg-section-emphasis text-brand-text px-6 py-3 rounded-lg font-semibold transition text-center border border-section-border"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="bg-section-light border border-section-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-brand-text mb-4">Existing Relationships</h2>
          {relationships.length > 0 ? (
            <div className="space-y-3">
              {relationships.map((rel) => {
                const isFrom = rel.from_stakeholder_id === stakeholderId;
                const otherStakeholder = isFrom ? rel.to_stakeholder : rel.from_stakeholder;
                const relType = rel.relationship_type;
                
                return (
                  <div key={rel.id} className="p-4 bg-section-subtle border border-section-border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-brand-text">
                            {isFrom ? '→' : '←'} {otherStakeholder?.name || 'Unknown'}
                          </span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {relType?.label || 'Unknown'}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            rel.status === 'active' ? 'bg-green-100 text-green-800' :
                            rel.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            rel.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {rel.status}
                          </span>
                        </div>
                        {rel.strength && (
                          <p className="text-sm text-brand-text-muted">Strength: {rel.strength}/10</p>
                        )}
                        <p className="text-xs text-brand-text-muted mt-1">Reference: {rel.reference}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(rel)}
                          className="px-3 py-1 bg-section-emphasis text-white rounded hover:bg-opacity-90 transition text-sm flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(rel.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-brand-text-muted">No relationships found</p>
          )}
        </div>
      </div>
    </div>
  );
}






