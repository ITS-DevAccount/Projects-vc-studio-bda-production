/**
 * Registry Edit Modal Component
 * Sprint 10.1d.2: Registry Consolidation & Management
 */

'use client';

import { useState } from 'react';
import { REGISTRY_TYPES } from '@/lib/types/registry';
import type { RegistryEntry, UpdateRegistryEntryInput } from '@/lib/types/registry';

interface RegistryEditModalProps {
  entry: RegistryEntry;
  onClose: () => void;
  onUpdated: () => void;
}

export function RegistryEditModal({ entry, onClose, onUpdated }: RegistryEditModalProps) {
  const [formData, setFormData] = useState<Partial<UpdateRegistryEntryInput>>({
    component_name: entry.component_name,
    description: entry.description || '',
    registry_type: entry.registry_type,
    icon_name: entry.icon_name || '',
    route_path: entry.route_path || '',
    widget_component_name: entry.widget_component_name,
    is_active: entry.is_active,
    is_beta: entry.is_beta,
    launch_in_modal: entry.launch_in_modal,
    creates_nodes: entry.creates_nodes,
    version: entry.version,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/registry/${entry.component_code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update component');
      }

      onUpdated();
    } catch (err: any) {
      console.error('Error updating component:', err);
      setError(err.message || 'Failed to update component');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Edit Registry Entry</h2>
          <p className="text-sm text-gray-600 mt-1">
            Component Code: <span className="font-mono">{entry.component_code}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Component Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.component_name}
                  onChange={(e) => setFormData({ ...formData, component_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Widget Component Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.widget_component_name}
                  onChange={(e) => setFormData({ ...formData, widget_component_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registry Type
                </label>
                <select
                  value={formData.registry_type}
                  onChange={(e) => setFormData({ ...formData, registry_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {REGISTRY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon Name
                </label>
                <input
                  type="text"
                  value={formData.icon_name}
                  onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                  placeholder="folder"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Version
                </label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Route Path
              </label>
              <input
                type="text"
                value={formData.route_path}
                onChange={(e) => setFormData({ ...formData, route_path: e.target.value })}
                placeholder="/workspace/files"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status & Behavior */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Status & Behavior</h3>

            <div className="flex gap-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_beta}
                  onChange={(e) => setFormData({ ...formData, is_beta: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Beta</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.launch_in_modal}
                  onChange={(e) => setFormData({ ...formData, launch_in_modal: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Launch in Modal</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.creates_nodes}
                  onChange={(e) => setFormData({ ...formData, creates_nodes: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Creates Nodes</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
