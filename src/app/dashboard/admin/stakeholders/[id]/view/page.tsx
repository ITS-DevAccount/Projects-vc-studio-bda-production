'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Loader, Edit, Trash2, Shield, Users } from 'lucide-react';

interface Stakeholder {
  id: string;
  reference: string;
  name: string;
  stakeholder_type_id: string;
  primary_role_id?: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  is_verified: boolean;
  is_user?: boolean;
  auth_user_email?: string | null;
  invite_email?: string | null;
  industry: string | null;
  sector: string | null;
  created_at: string;
  updated_at: string;
}

interface StakeholderType {
  id: string;
  code: string;
  label: string;
}

interface StakeholderRole {
  id: string;
  role_id: string;
  role?: {
    id: string;
    code: string;
    label: string;
    description?: string | null;
  } | null;
  assigned_at: string;
  app_uuid?: string;
}

interface Relationship {
  id: string;
  reference: string;
  from_stakeholder_id: string;
  to_stakeholder_id: string;
  relationship_type_id: string;
  status: 'active' | 'inactive' | 'pending' | 'terminated';
  strength: number | null;
  from_stakeholder?: { name: string };
  to_stakeholder?: { name: string };
  relationship_type?: { label: string; code: string };
}

const BDA_ROLES: Record<string, string> = {
  individual: 'Individual',
  investor: 'Investor',
  producer: 'Producer/Service Provider',
  administrator: 'Administrator',
};

export default function ViewStakeholderPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stakeholder, setStakeholder] = useState<Stakeholder | null>(null);
  const [stakeholderType, setStakeholderType] = useState<StakeholderType | null>(null);
  const [roles, setRoles] = useState<StakeholderRole[]>([]);
  const [primaryRoleLabel, setPrimaryRoleLabel] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [deleting, setDeleting] = useState(false);

  const stakeholderId = params?.id as string;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (stakeholderId) {
      loadStakeholder();
    }
  }, [stakeholderId, user, authLoading]);

  async function loadStakeholder() {
    if (!stakeholderId) return;
    setLoading(true);
    setError('');

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      // Fetch stakeholder
      const res = await fetch(`/api/stakeholders/${stakeholderId}`, {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load stakeholder');
      }

      const stakeholderData = await res.json();
      setStakeholder(stakeholderData);

      // Fetch stakeholder type
      if (stakeholderData.stakeholder_type_id) {
        const typeRes = await fetch('/api/stakeholder-types');
        if (typeRes.ok) {
          const types = await typeRes.json();
          const type = types.find((t: StakeholderType) => t.id === stakeholderData.stakeholder_type_id);
          setStakeholderType(type || null);
        }
      }

      // Fetch roles
      const rolesRes = await fetch(`/api/stakeholders/${stakeholderId}/roles`, {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData || []);

        if (stakeholderData.primary_role_id) {
          const primaryRole = (rolesData || []).find((role: StakeholderRole) => role.role_id === stakeholderData.primary_role_id);
          if (primaryRole) {
            setPrimaryRoleLabel(primaryRole.role?.label || primaryRole.role?.code || 'Unknown Role');
          } else {
            setPrimaryRoleLabel(null);
          }
        } else {
          setPrimaryRoleLabel(null);
        }
      }

      // Fetch relationships
      const relsRes = await fetch(`/api/relationships?stakeholderId=${stakeholderId}&direction=both`, {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });
      if (relsRes.ok) {
        const relsData = await relsRes.json();
        setRelationships(relsData.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading stakeholder');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this stakeholder? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch(`/api/stakeholders/${stakeholderId}`, {
        method: 'DELETE',
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete stakeholder');
      }

      router.push('/dashboard?tab=stakeholders');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting stakeholder');
      setDeleting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-brand-background flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-brand-text" />
      </div>
    );
  }

  if (error && !stakeholder) {
    return (
      <div className="min-h-screen bg-brand-background text-brand-text p-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/dashboard?tab=stakeholders" className="inline-flex items-center gap-2 text-brand-text hover:text-accent-primary transition mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Stakeholders
          </Link>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!stakeholder) {
    return null;
  }

  return (
    <div className="min-h-screen bg-brand-background text-brand-text p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/dashboard?tab=stakeholders" className="inline-flex items-center gap-2 text-brand-text hover:text-accent-primary transition mb-2">
              <ArrowLeft className="w-4 h-4" /> Back to Stakeholders
            </Link>
            <h1 className="text-2xl font-bold text-brand-text">{stakeholder.name}</h1>
            <p className="text-sm text-brand-text-muted mt-1">Reference: {stakeholder.reference}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/admin/stakeholders/${stakeholderId}/edit`}
              className="px-4 py-2 bg-section-subtle border border-section-border rounded hover:bg-section-emphasis transition flex items-center gap-2 text-brand-text"
            >
              <Edit className="w-4 h-4" /> Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-6">
            {error}
          </div>
        )}

        {/* Details Card */}
        <div className="bg-section-light border border-section-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-brand-text mb-4">Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-brand-text-muted block mb-1">Name</label>
              <p className="text-brand-text font-medium">{stakeholder.name}</p>
            </div>
            <div>
              <label className="text-sm text-brand-text-muted block mb-1">Type</label>
              <p className="text-brand-text font-medium">{stakeholderType?.label || 'Unknown'}</p>
            </div>
            <div>
              <label className="text-sm text-brand-text-muted block mb-1">Primary Role</label>
              <p className="text-brand-text font-medium">{primaryRoleLabel || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm text-brand-text-muted block mb-1">Email</label>
              <p className="text-brand-text">{stakeholder.email || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-brand-text-muted block mb-1">Phone</label>
              <p className="text-brand-text">{stakeholder.phone || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-brand-text-muted block mb-1">Website</label>
              <p className="text-brand-text">
                {stakeholder.website ? (
                  <a href={stakeholder.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {stakeholder.website}
                  </a>
                ) : '-'}
              </p>
            </div>
            <div>
              <label className="text-sm text-brand-text-muted block mb-1">Status</label>
              <p className="text-brand-text">
                <span className={`px-2 py-1 rounded text-xs ${
                  stakeholder.status === 'active' ? 'bg-green-100 text-green-800' :
                  stakeholder.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                  stakeholder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {stakeholder.status}
                </span>
              </p>
            </div>
            <div>
              <label className="text-sm text-brand-text-muted block mb-1">Verified</label>
              <p className="text-brand-text">{stakeholder.is_verified ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <label className="text-sm text-brand-text-muted block mb-1">Portal Account</label>
              <p className="text-brand-text">{stakeholder.is_user ? 'Enabled' : 'Not enabled'}</p>
            </div>
            <div>
              <label className="text-sm text-brand-text-muted block mb-1">Login Email</label>
              <p className="text-brand-text">{stakeholder.invite_email || stakeholder.auth_user_email || stakeholder.email || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-brand-text-muted block mb-1">Country</label>
              <p className="text-brand-text">{stakeholder.country || '-'}</p>
            </div>
            {stakeholder.region && (
              <div>
                <label className="text-sm text-brand-text-muted block mb-1">Region</label>
                <p className="text-brand-text">{stakeholder.region}</p>
              </div>
            )}
            {stakeholder.city && (
              <div>
                <label className="text-sm text-brand-text-muted block mb-1">City</label>
                <p className="text-brand-text">{stakeholder.city}</p>
              </div>
            )}
            {stakeholder.industry && (
              <div>
                <label className="text-sm text-brand-text-muted block mb-1">Industry</label>
                <p className="text-brand-text">{stakeholder.industry}</p>
              </div>
            )}
            {stakeholder.sector && (
              <div>
                <label className="text-sm text-brand-text-muted block mb-1">Sector</label>
                <p className="text-brand-text">{stakeholder.sector}</p>
              </div>
            )}
            <div>
              <label className="text-sm text-brand-text-muted block mb-1">Created</label>
              <p className="text-brand-text">{new Date(stakeholder.created_at).toLocaleString()}</p>
            </div>
            <div>
              <label className="text-sm text-brand-text-muted block mb-1">Updated</label>
              <p className="text-brand-text">{new Date(stakeholder.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Roles Card */}
        <div className="bg-section-light border border-section-border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-brand-text flex items-center gap-2">
              <Shield className="w-5 h-5" /> Roles
            </h2>
            <Link
              href={`/dashboard/admin/stakeholders/${stakeholderId}/roles`}
              className="px-4 py-2 bg-accent-primary text-white rounded hover:bg-accent-primary-hover transition text-sm"
            >
              Manage Roles
            </Link>
          </div>
          {roles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <span
                  key={role.id}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                >
                  {role.role?.label || BDA_ROLES[role.role?.code || ''] || role.role?.code || 'Unknown Role'}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-brand-text-muted">No roles assigned</p>
          )}
        </div>

        {/* Relationships Card */}
        <div className="bg-section-light border border-section-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-brand-text flex items-center gap-2">
              <Users className="w-5 h-5" /> Relationships
            </h2>
            <Link
              href={`/dashboard/admin/stakeholders/${stakeholderId}/relationships`}
              className="px-4 py-2 bg-accent-primary text-white rounded hover:bg-accent-primary-hover transition text-sm"
            >
              Manage Relationships
            </Link>
          </div>
          {relationships.length > 0 ? (
            <div className="space-y-2">
              {relationships.slice(0, 5).map((rel) => {
                const isFrom = rel.from_stakeholder_id === stakeholderId;
                const otherStakeholder = isFrom ? rel.to_stakeholder : rel.from_stakeholder;
                const relType = rel.relationship_type;
                
                return (
                  <div key={rel.id} className="flex items-center gap-2 text-sm">
                    <span className="text-brand-text">
                      {isFrom ? '→' : '←'} {otherStakeholder?.name || 'Unknown'}
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {relType?.label || 'Unknown'}
                    </span>
                    {rel.strength && (
                      <span className="text-brand-text-muted text-xs">Strength: {rel.strength}/10</span>
                    )}
                  </div>
                );
              })}
              {relationships.length > 5 && (
                <p className="text-brand-text-muted text-sm mt-2">
                  + {relationships.length - 5} more relationship{relationships.length - 5 !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          ) : (
            <p className="text-brand-text-muted">No relationships found</p>
          )}
        </div>
      </div>
    </div>
  );
}
