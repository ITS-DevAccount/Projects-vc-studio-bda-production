'use client';

import { useEffect, useState } from 'react';
import { CTAButton, CreateCTAInput } from '@/lib/types/cta';
import { Plus, Edit, Trash2, X, Save, Link as LinkIcon } from 'lucide-react';

export default function CTAButtonsPage() {
  const [buttons, setButtons] = useState<CTAButton[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Ensure form is hidden on mount
  useEffect(() => {
    setIsCreating(false);
    setEditingId(null);
  }, []);

  const [formData, setFormData] = useState<CreateCTAInput>({
    label: '',
    href: '',
    variant: 'primary',
    icon_name: '',
    analytics_event: '',
  });

  // Fetch buttons on mount
  useEffect(() => {
    fetchButtons();
  }, []);

  const fetchButtons = async () => {
    try {
      setLoading(true);

      // Get VC_STUDIO app UUID
      const appsRes = await fetch('/api/applications?app_code=VC_STUDIO');
      if (appsRes.ok) {
        const appsData = await appsRes.json();
        if (appsData.data && appsData.data.length > 0) {
          const vcStudioAppUuid = appsData.data[0].id;

          // Fetch CTA buttons
          const res = await fetch(`/api/cta-buttons?app_uuid=${vcStudioAppUuid}`);
          const data = await res.json();

          if (data.success) {
            setButtons(data.data || []);
            setError(null);
          } else {
            setError(data.error || 'Failed to load buttons');
          }
        }
      }
    } catch (err) {
      setError('Failed to load buttons');
      console.error('[Fetch Buttons Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.label || !formData.href) {
      setError('Label and href are required');
      return;
    }

    try {
      const res = await fetch('/api/cta-buttons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setButtons([data.data, ...buttons]);
        setFormData({ label: '', href: '', variant: 'primary', icon_name: '', analytics_event: '' });
        setIsCreating(false);
        setError(null);
      } else {
        setError(data.error || 'Failed to create button');
      }
    } catch (err) {
      setError('Failed to create button');
      console.error('[Create Error]:', err);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const res = await fetch(`/api/cta-buttons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setButtons(buttons.map((b) => (b.id === id ? data.data : b)));
        setEditingId(null);
        setFormData({ label: '', href: '', variant: 'primary', icon_name: '', analytics_event: '' });
        setError(null);
      } else {
        setError(data.error || 'Failed to update button');
      }
    } catch (err) {
      setError('Failed to update button');
      console.error('[Update Error]:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this CTA button? It will be removed from all pages.')) return;

    try {
      const res = await fetch(`/api/cta-buttons/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        setButtons(buttons.filter((b) => b.id !== id));
        setError(null);
      } else {
        setError(data.error || 'Failed to delete button');
      }
    } catch (err) {
      setError('Failed to delete button');
      console.error('[Delete Error]:', err);
    }
  };

  const handleEdit = (button: CTAButton) => {
    setFormData({
      label: button.label,
      href: button.href,
      variant: button.variant,
      icon_name: button.icon_name || '',
      analytics_event: button.analytics_event || '',
    });
    setEditingId(button.id);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ label: '', href: '', variant: 'primary', icon_name: '', analytics_event: '' });
    setError(null);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">CTA Buttons</h1>
        <p className="text-gray-600">
          Manage call-to-action buttons for your pages. Create once, use everywhere.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg border border-red-300 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <div className="mb-8 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {editingId ? 'Edit CTA Button' : 'Create New CTA Button'}
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700 transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Get Started"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                URL/Href <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.href}
                onChange={(e) => setFormData({ ...formData, href: e.target.value })}
                placeholder="e.g., /signup or https://example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Absolute URL, relative path, or anchor (#section)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Variant</label>
                <select
                  value={formData.variant}
                  onChange={(e) => setFormData({ ...formData, variant: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="outline">Outline</option>
                  <option value="ghost">Ghost</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Icon Name (optional)</label>
                <input
                  type="text"
                  value={formData.icon_name}
                  onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                  placeholder="e.g., arrow-right"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Analytics Event (optional)
              </label>
              <input
                type="text"
                value={formData.analytics_event}
                onChange={(e) => setFormData({ ...formData, analytics_event: e.target.value })}
                placeholder="e.g., hero_signup_clicked"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2 justify-end">
              {editingId ? (
                <>
                  <button
                    onClick={() => handleUpdate(editingId)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Save size={16} />
                    Update
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Create
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Button */}
      {!isCreating && !editingId && (
        <button
          onClick={() => setIsCreating(true)}
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Create New CTA Button
        </button>
      )}

      {/* Buttons List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        {buttons.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="mb-4">
              <LinkIcon size={48} className="mx-auto text-gray-300" />
            </div>
            <h3 className="text-lg font-medium mb-2">No CTA buttons created yet</h3>
            <p className="text-sm">
              Click &quot;Create New CTA Button&quot; to get started.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Label
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Href</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Variant
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Icon</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {buttons.map((button) => (
                <tr key={button.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{button.label}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {button.href}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                      {button.variant}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{button.icon_name || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleEdit(button)}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Edit size={16} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(button.id)}
                        className="text-red-600 hover:text-red-800 flex items-center gap-1"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
