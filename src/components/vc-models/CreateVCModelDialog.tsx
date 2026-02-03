'use client';

import { useState } from 'react';
import type { VCModel } from '@/lib/types/vc-model';

interface CreateVCModelDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (vcModel: VCModel) => void;
}

export default function CreateVCModelDialog({
  open,
  onClose,
  onSuccess
}: CreateVCModelDialogProps) {
  const [modelName, setModelName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!modelName.trim()) {
      setError('Model name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/vc-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_name: modelName.trim(),
          description: description.trim() || null
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create VC Model');
      }

      onSuccess(result.data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create VC Model');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-gray-900 mb-4">Create New VC Model</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="modelName" className="block text-sm font-medium text-gray-700 mb-2">
              Model Name
            </label>
            <input
              id="modelName"
              type="text"
              value={modelName}
              onChange={(event) => setModelName(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="e.g., Coffee Roasting Business"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              rows={4}
              placeholder="Brief description of the value chain..."
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create VC Model'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
