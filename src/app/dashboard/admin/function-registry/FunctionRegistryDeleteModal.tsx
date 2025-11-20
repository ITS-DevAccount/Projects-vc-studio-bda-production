/**
 * Sprint 1d.4: Function Registry Delete Modal
 * Confirmation dialog for deleting function registry entries
 */

'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { FunctionRegistryEntry } from '@/lib/types/function-registry';

interface FunctionRegistryDeleteModalProps {
  entry: FunctionRegistryEntry;
  onClose: () => void;
  onDeleted: () => void;
}

export default function FunctionRegistryDeleteModal({
  entry,
  onClose,
  onDeleted,
}: FunctionRegistryDeleteModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/function-registry/${entry.function_code}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to delete function');
      }

      // Success!
      onDeleted();
    } catch (err: any) {
      console.error('Error deleting function:', err);
      setError(err.message || 'Failed to delete function');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Function</h2>
            <p className="text-gray-600">
              Are you sure you want to delete the function <strong>{entry.function_code}</strong>?
            </p>
            <p className="text-gray-600 mt-2">
              This action cannot be undone. The function will be permanently removed from the registry.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Function'}
          </button>
        </div>
      </div>
    </div>
  );
}
