/**
 * Registry Delete Confirmation Component
 * Sprint 10.1d.2: Registry Consolidation & Management
 */

'use client';

import { useState, useEffect } from 'react';
import type { RegistryEntry, ComponentUsage } from '@/lib/types/registry';

interface RegistryDeleteConfirmationProps {
  entry: RegistryEntry;
  onClose: () => void;
  onDeleted: () => void;
}

export function RegistryDeleteConfirmation({
  entry,
  onClose,
  onDeleted,
}: RegistryDeleteConfirmationProps) {
  const [loading, setLoading] = useState(false);
  const [checkingUsage, setCheckingUsage] = useState(true);
  const [usage, setUsage] = useState<ComponentUsage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkComponentUsage();
  }, []);

  const checkComponentUsage = async () => {
    try {
      setCheckingUsage(true);
      const response = await fetch(`/api/registry/${entry.component_code}/usage`);

      if (!response.ok) {
        throw new Error('Failed to check component usage');
      }

      const data = await response.json();
      setUsage(data.usage || []);
    } catch (err: any) {
      console.error('Error checking usage:', err);
      setError(err.message || 'Failed to check component usage');
    } finally {
      setCheckingUsage(false);
    }
  };

  const handleDelete = async () => {
    if (usage.length > 0) {
      setError('Cannot delete component that is currently in use. Please remove it from all stakeholder dashboards first.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/registry/${entry.component_code}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete component');
      }

      onDeleted();
    } catch (err: any) {
      console.error('Error deleting component:', err);
      setError(err.message || 'Failed to delete component');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">Delete Component</h2>
        </div>

        <div className="p-6 space-y-4">
          {checkingUsage ? (
            <div className="text-center py-4">
              <p className="text-gray-600">Checking component usage...</p>
            </div>
          ) : (
            <>
              <p className="text-gray-700">
                Are you sure you want to delete the component:
              </p>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="font-semibold text-gray-900">{entry.component_name}</p>
                <p className="text-sm text-gray-600 font-mono mt-1">{entry.component_code}</p>
              </div>

              {usage.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                  <p className="font-semibold text-yellow-900 mb-2">
                    ⚠️ This component is currently in use by {usage.length} stakeholder(s):
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {usage.map((u, i) => (
                      <li key={i} className="text-sm text-yellow-800">
                        {u.stakeholder_name} ({u.stakeholder_email}) - Role: {u.role_config_key}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-yellow-800 mt-3">
                    You must remove this component from their dashboards before deleting.
                  </p>
                </div>
              )}

              {usage.length === 0 && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-md">
                  <p className="text-green-800">
                    ✓ This component is not currently in use and can be safely deleted.
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-md">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              <p className="text-sm text-gray-600">
                This action will soft delete the component (it will be marked as deleted but data will be retained).
              </p>
            </>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50"
            disabled={loading || checkingUsage || usage.length > 0}
          >
            {loading ? 'Deleting...' : 'Delete Component'}
          </button>
        </div>
      </div>
    </div>
  );
}
