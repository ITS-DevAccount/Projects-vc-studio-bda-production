'use client';

import { useState } from 'react';
import type { VCModel } from '@/lib/types/vc-model';

interface VersionHistoryProps {
  vcModelId: string;
  current: VCModel;
  versions?: VCModel[];
  onVersionCreated?: (newVersion: VCModel) => void;
}

export default function VersionHistory({ vcModelId, current, versions, onVersionCreated }: VersionHistoryProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = versions && versions.length > 0 ? versions : [current];

  const handleCreateVersion = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/vc-models/${vcModelId}/version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create version');
      }
      if (onVersionCreated) {
        onVersionCreated(result.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create version');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Version History</h3>
          <p className="text-sm text-gray-500">Current version v{current.version_number}</p>
        </div>
        <button
          onClick={handleCreateVersion}
          disabled={loading}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create New Version'}
        </button>
      </div>
      {error && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      <div className="divide-y divide-gray-200">
        {list.map((version) => (
          <div key={version.id} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Version {version.version_number}
                </p>
                <p className="text-xs text-gray-500">{version.model_code}</p>
              </div>
              <p className="text-xs text-gray-500">
                Updated {new Date(version.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
