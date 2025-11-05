'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Loader, Save } from 'lucide-react';

interface StakeholderType {
  id: string;
  code: string;
  label: string;
  description: string | null;
  is_individual: boolean;
  is_organization: boolean;
}

interface Stakeholder {
  id: string;
  reference: string;
  name: string;
  stakeholder_type_id: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  is_verified: boolean;
  industry: string | null;
  sector: string | null;
}

export default function EditStakeholderPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [stakeholderTypes, setStakeholderTypes] = useState<StakeholderType[]>([]);
  const [formData, setFormData] = useState<Partial<Stakeholder>>({
    name: '',
    stakeholder_type_id: '',
    email: '',
    phone: '',
    website: '',
    industry: '',
    sector: '',
    country: '',
    region: '',
    city: '',
    status: 'active',
    is_verified: false,
  });

  const stakeholderId = params?.id as string;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (stakeholderId) {
      loadStakeholder();
      loadStakeholderTypes();
    }
  }, [stakeholderId, user, authLoading]);

  async function loadStakeholderTypes() {
    try {
      const res = await fetch('/api/stakeholder-types');
      if (res.ok) {
        const data = await res.json();
        setStakeholderTypes(data);
      }
    } catch (err) {
      console.error('Error loading stakeholder types:', err);
    }
  }

  async function loadStakeholder() {
    if (!stakeholderId) return;
    setLoadingData(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch(`/api/stakeholders/${stakeholderId}`, {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load stakeholder');
      }

      const data = await res.json();
      setFormData({
        name: data.name || '',
        stakeholder_type_id: data.stakeholder_type_id || '',
        email: data.email || '',
        phone: data.phone || '',
        website: data.website || '',
        industry: data.industry || '',
        sector: data.sector || '',
        country: data.country || '',
        region: data.region || '',
        city: data.city || '',
        status: data.status || 'active',
        is_verified: data.is_verified || false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading stakeholder');
    } finally {
      setLoadingData(false);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.name || !formData.stakeholder_type_id) {
        throw new Error('Name and stakeholder type are required');
      }

      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const updatePayload: any = {
        name: formData.name,
        stakeholder_type_id: formData.stakeholder_type_id,
        email: formData.email || null,
        phone: formData.phone || null,
        website: formData.website || null,
        industry: formData.industry || null,
        sector: formData.sector || null,
        country: formData.country || null,
        region: formData.region || null,
        city: formData.city || null,
        status: formData.status || 'active',
        is_verified: formData.is_verified || false,
      };

      const res = await fetch(`/api/stakeholders/${stakeholderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify(updatePayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update stakeholder');
      }

      router.push(`/dashboard/admin/stakeholders/${stakeholderId}/view`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating stakeholder');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen bg-section-light flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-section-emphasis" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-section-light p-6">
      <div className="max-w-4xl mx-auto">
        <Link href={`/dashboard/admin/stakeholders/${stakeholderId}/view`} className="inline-flex items-center gap-2 text-section-emphasis hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to View
        </Link>

        <h1 className="text-2xl font-bold text-section-emphasis mb-6">Edit Stakeholder</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-section-subtle border border-section-border rounded-lg p-6 space-y-6">
          {/* Stakeholder Type */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-brand-text">Stakeholder Type *</label>
            <select
              name="stakeholder_type_id"
              value={formData.stakeholder_type_id}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text transition"
            >
              <option value="">Select a type...</option>
              {stakeholderTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label} {type.description ? `- ${type.description}` : ''}
                </option>
              ))}
            </select>
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
              className="w-full px-4 py-3 bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
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
                className="w-full px-4 py-3 bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
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
                className="w-full px-4 py-3 bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
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
              className="w-full px-4 py-3 bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
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
                className="w-full px-4 py-3 bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
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
                className="w-full px-4 py-3 bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
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
                className="w-full px-4 py-3 bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
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
                className="w-full px-4 py-3 bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
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
                className="w-full px-4 py-3 bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text placeholder-brand-text-muted transition"
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
                className="w-full px-4 py-3 bg-section-light border border-section-border rounded-lg focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 text-brand-text transition"
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
                className="w-5 h-5 bg-section-light border border-section-border rounded cursor-pointer accent-accent-primary"
              />
              <label htmlFor="verified" className="text-sm font-semibold cursor-pointer text-brand-text">
                Verified
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-accent-primary hover:bg-accent-primary-hover disabled:bg-neutral-400 text-white px-6 py-3 rounded-lg font-semibold transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {loading && <Loader className="w-5 h-5 animate-spin" />}
              {loading ? 'Saving...' : 'Save Changes'}
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
