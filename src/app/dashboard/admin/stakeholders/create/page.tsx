'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Loader, Save, Plus, Trash2 } from 'lucide-react';

interface StakeholderType {
  id: string;
  code: string;
  label: string;
  description: string | null;
  is_individual: boolean;
  is_organization: boolean;
}

interface Role {
  id: string;
  code: string;
  label: string;
  description: string | null;
  is_default: boolean;
}

export default function CreateStakeholderPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [error, setError] = useState('');
  const [stakeholderTypes, setStakeholderTypes] = useState<StakeholderType[]>([]);
  const [existingStakeholders, setExistingStakeholders] = useState<Array<{ id: string; name: string; reference: string }>>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<Array<{ id: string; label: string; code: string }>>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [formData, setFormData] = useState({
    stakeholder_type_id: '',
    name: '',
    email: '',
    phone: '',
    website: '',
    industry: '',
    sector: '',
    country: '',
    region: '',
    city: '',
    status: 'active' as 'active' | 'inactive' | 'pending' | 'suspended',
    is_verified: false,
    selectedRoles: [] as string[], // Store role codes
    relationships: [] as Array<{ to_stakeholder_id: string; relationship_type_id: string; strength?: number }>,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        // Fetch stakeholder types
        const typesRes = await fetch('/api/stakeholder-types');
        const typesData = await typesRes.json();
        if (typesRes.ok) {
          setStakeholderTypes(typesData);
        }

        // Fetch existing stakeholders for relationships
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        const stakeholdersRes = await fetch('/api/stakeholders?pageSize=1000', {
          headers: {
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          },
        });
        if (stakeholdersRes.ok) {
          const stakeholdersData = await stakeholdersRes.json();
          setExistingStakeholders(stakeholdersData.data || []);
        }

        // Fetch relationship types
        const relTypesRes = await fetch('/api/relationship-types', {
          headers: {
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          },
        });
        if (relTypesRes.ok) {
          const relTypesData = await relTypesRes.json();
          setRelationshipTypes(relTypesData || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setLoadingTypes(false);
      }
    };
    fetchTypes();
  }, []);

  // Fetch roles when stakeholder type changes
  useEffect(() => {
    const fetchRolesForType = async () => {
      if (!formData.stakeholder_type_id) {
        setAvailableRoles([]);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        const res = await fetch(`/api/stakeholder-types/${formData.stakeholder_type_id}/roles`, {
          headers: {
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          },
        });

        if (res.ok) {
          const data = await res.json();
          setAvailableRoles(data || []);
          // Clear selected roles if they're not available for this type
          setFormData(prev => ({
            ...prev,
            selectedRoles: prev.selectedRoles.filter(roleCode => 
              data.some((r: Role) => r.code === roleCode)
            ),
          }));
        }
      } catch (err) {
        console.error('Error fetching roles for stakeholder type:', err);
      }
    };

    fetchRolesForType();
  }, [formData.stakeholder_type_id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleRoleToggle = (roleValue: string) => {
    setFormData({
      ...formData,
      selectedRoles: formData.selectedRoles.includes(roleValue)
        ? formData.selectedRoles.filter(r => r !== roleValue)
        : [...formData.selectedRoles, roleValue],
    });
  };

  const handleAddRelationship = () => {
    setFormData({
      ...formData,
      relationships: [...formData.relationships, { to_stakeholder_id: '', relationship_type_id: '' }],
    });
  };

  const handleRemoveRelationship = (index: number) => {
    setFormData({
      ...formData,
      relationships: formData.relationships.filter((_, i) => i !== index),
    });
  };

  const handleRelationshipChange = (index: number, field: string, value: string | number) => {
    setFormData({
      ...formData,
      relationships: formData.relationships.map((rel, i) =>
        i === index ? { ...rel, [field]: value } : rel
      ),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.name || !formData.stakeholder_type_id) {
        throw new Error('Name and stakeholder type are required');
      }

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      // Create stakeholder
      const res = await fetch('/api/stakeholders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({
          stakeholder_type_id: formData.stakeholder_type_id,
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          website: formData.website || null,
          industry: formData.industry || null,
          sector: formData.sector || null,
          country: formData.country || null,
          region: formData.region || null,
          city: formData.city || null,
          status: formData.status,
          is_verified: formData.is_verified,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create stakeholder');
      }

      // Assign roles if any selected
      if (formData.selectedRoles.length > 0) {
        const rolesRes = await fetch('/api/roles/assign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          },
          body: JSON.stringify({
            stakeholderId: data.id,
            add: formData.selectedRoles,
          }),
        });

        if (!rolesRes.ok) {
          console.warn('Stakeholder created but roles assignment failed');
        }
      }

      // Create relationships if any selected
      if (formData.relationships.length > 0) {
        const validRelationships = formData.relationships.filter(
          (rel) => rel.to_stakeholder_id && rel.relationship_type_id
        );
        
        if (validRelationships.length !== formData.relationships.length) {
          const skipped = formData.relationships.length - validRelationships.length;
          console.warn(`${skipped} relationship(s) were skipped due to missing required fields`);
          setError(prev => prev ? `${prev}; ${skipped} relationship(s) skipped` : `${skipped} relationship(s) skipped - ensure stakeholder and type are selected`);
        }

        console.log('Creating relationships:', validRelationships);
        
        for (const rel of validRelationships) {
          try {
            const payload = {
              from_stakeholder_id: data.id,
              to_stakeholder_id: rel.to_stakeholder_id,
              relationship_type_id: rel.relationship_type_id,
              strength: rel.strength || null,
              status: 'active',
            };
            
            console.log('Creating relationship with payload:', payload);
            
            const relRes = await fetch('/api/relationships', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
              },
              body: JSON.stringify(payload),
            });
            
            const relData = await relRes.json();
            
            if (!relRes.ok) {
              console.error('Relationship creation failed:', relData);
              setError(prev => prev ? `${prev}; Failed to create relationship: ${relData.error || 'Unknown error'}` : `Failed to create relationship: ${relData.error || 'Unknown error'}`);
            } else {
              console.log('Relationship created successfully:', relData);
            }
          } catch (err) {
            console.error('Error creating relationship:', err);
            setError(prev => prev ? `${prev}; Relationship creation error: ${err instanceof Error ? err.message : 'Unknown error'}` : `Relationship creation error: ${err instanceof Error ? err.message : 'Unknown error'}`);
            // Continue with other relationships even if one fails
          }
        }
      }

      router.push('/dashboard?tab=stakeholders');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating stakeholder');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-brand-background text-brand-text">
      {/* Header */}
      <header className="bg-section-light border-b border-section-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <Link href="/dashboard" className="hover:text-accent-primary transition text-brand-text">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold text-brand-text">Create New Stakeholder</h1>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-section-light rounded-xl p-8 border border-section-border shadow-sm space-y-6">
          {error && (
            <div className="bg-semantic-error-bg border border-semantic-error text-semantic-error px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Stakeholder Type */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-brand-text">
              Stakeholder Type *
            </label>
            {loadingTypes ? (
              <div className="text-brand-text-muted">Loading types...</div>
            ) : (
              <select
                name="stakeholder_type_id"
                value={formData.stakeholder_type_id}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text transition"
              >
                <option value="">Select a type...</option>
                {stakeholderTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label} {type.description ? `- ${type.description}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-brand-text">Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Stakeholder name"
              className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
            />
          </div>

          {/* Contact Information */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-brand-text">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-brand-text">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 234 567 8900"
                className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-brand-text">Website</label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://example.com"
              className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
            />
          </div>

          {/* Industry & Sector */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-brand-text">Industry</label>
              <input
                type="text"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                placeholder="e.g., Technology, Agriculture"
                className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-brand-text">Sector</label>
              <input
                type="text"
                name="sector"
                value={formData.sector}
                onChange={handleChange}
                placeholder="e.g., Fintech, Healthcare"
                className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
              />
            </div>
          </div>

          {/* Location */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-brand-text">Country</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="Country"
                className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-brand-text">Region</label>
              <input
                type="text"
                name="region"
                value={formData.region}
                onChange={handleChange}
                placeholder="Region/State"
                className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-brand-text">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="City"
                className="w-full px-4 py-3 bg-section-subtle border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
              />
            </div>
          </div>

          {/* Status & Verification */}
          <div className="grid md:grid-cols-2 gap-4">
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
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-8">
              <input
                type="checkbox"
                id="verified"
                name="is_verified"
                checked={formData.is_verified}
                onChange={handleChange}
                className="w-5 h-5 bg-section-subtle border border-section-border rounded cursor-pointer accent-accent-primary"
              />
              <label htmlFor="verified" className="text-sm font-semibold cursor-pointer text-brand-text">
                Verified
              </label>
            </div>
          </div>

          {/* Roles */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-brand-text">
              Roles {formData.stakeholder_type_id && `(Available for ${stakeholderTypes.find(t => t.id === formData.stakeholder_type_id)?.label || 'this type'})`}
            </label>
            {!formData.stakeholder_type_id ? (
              <p className="text-sm text-brand-text-muted p-4 bg-section-subtle rounded-lg border border-section-border">
                Please select a stakeholder type first to see available roles
              </p>
            ) : availableRoles.length === 0 ? (
              <p className="text-sm text-brand-text-muted p-4 bg-section-subtle rounded-lg border border-section-border">
                No roles available for this stakeholder type. Roles need to be configured in the database.
              </p>
            ) : (
              <div className="grid md:grid-cols-2 gap-3 p-4 bg-section-subtle rounded-lg border border-section-border">
                {availableRoles.map((role) => (
                  <label key={role.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.selectedRoles.includes(role.code)}
                      onChange={() => handleRoleToggle(role.code)}
                      className="w-5 h-5 bg-section-light border border-section-border rounded cursor-pointer accent-accent-primary"
                    />
                    <div className="flex-1">
                      <span className="text-brand-text font-medium">{role.label}</span>
                      {role.is_default && (
                        <span className="ml-2 text-xs text-brand-text-muted">(default)</span>
                      )}
                      {role.description && (
                        <p className="text-xs text-brand-text-muted mt-0.5">{role.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Relationships */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-brand-text">Relationships (Optional)</label>
              <button
                type="button"
                onClick={handleAddRelationship}
                className="px-3 py-1 bg-accent-primary text-white rounded hover:bg-accent-primary-hover transition text-sm flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            {formData.relationships.length > 0 && (
              <div className="space-y-3 p-4 bg-section-subtle rounded-lg border border-section-border">
                {formData.relationships.map((rel, index) => (
                  <div key={index} className="grid md:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-brand-text">Stakeholder</label>
                      <select
                        value={rel.to_stakeholder_id}
                        onChange={(e) => handleRelationshipChange(index, 'to_stakeholder_id', e.target.value)}
                        className="w-full px-3 py-2 bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text text-sm transition"
                      >
                        <option value="">Select...</option>
                        {existingStakeholders.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.reference})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-brand-text">Type</label>
                      <select
                        value={rel.relationship_type_id}
                        onChange={(e) => handleRelationshipChange(index, 'relationship_type_id', e.target.value)}
                        className="w-full px-3 py-2 bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text text-sm transition"
                      >
                        <option value="">Select...</option>
                        {relationshipTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold mb-1 text-brand-text">Strength</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={rel.strength || ''}
                          onChange={(e) => handleRelationshipChange(index, 'strength', e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="1-10"
                          className="w-full px-3 py-2 bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text text-sm transition"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRelationship(index)}
                        className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {formData.relationships.length === 0 && (
              <p className="text-sm text-brand-text-muted p-4 bg-section-subtle rounded-lg border border-section-border">
                No relationships added. Click "Add" to create relationships with existing stakeholders.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-accent-primary hover:bg-accent-primary-hover disabled:bg-neutral-400 text-white px-6 py-3 rounded-lg font-semibold transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {loading && <Loader className="w-5 h-5 animate-spin" />}
              {loading ? 'Creating...' : 'Create Stakeholder'}
            </button>
            <Link
              href="/dashboard"
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



