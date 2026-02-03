'use client';

import StatusBadge from '@/components/ui/StatusBadge';
import type { VCModel } from '@/lib/types/vc-model';

interface VCModelHeaderProps {
  vcModel: VCModel;
  onCreateVersion?: () => void;
  onStartFlm?: () => void;
}

export default function VCModelHeader({ vcModel, onCreateVersion, onStartFlm }: VCModelHeaderProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{vcModel.model_name}</h1>
            <StatusBadge status={vcModel.status} />
          </div>
          <p className="text-sm text-gray-500 mt-1">{vcModel.model_code} · v{vcModel.version_number}</p>
          {vcModel.description && (
            <p className="text-sm text-gray-600 mt-3">{vcModel.description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onCreateVersion && (
            <button
              onClick={onCreateVersion}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Create New Version
            </button>
          )}
          {onStartFlm && (
            <button
              onClick={onStartFlm}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Start FLM
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
