'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import VCModelCard from './VCModelCard';
import CreateVCModelDialog from './CreateVCModelDialog';
import FLMBuilder from '@/components/flm/FLMBuilder';
import type { VCModel } from '@/lib/types/vc-model';

type VCModelListItem = VCModel & {
  flm?: Array<{ id: string; status: string; current_step?: string | null }>;
};

export default function VCModelsList() {
  const router = useRouter();
  const [vcModels, setVCModels] = useState<VCModelListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeBuilder, setActiveBuilder] = useState<{ vcModelId: string; flmModelId: string; stakeholderId: string } | null>(null);

  useEffect(() => {
    fetchVCModels();
  }, []);

  const fetchVCModels = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/vc-models');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch VC Models');
      }

      setVCModels(result.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load VC Models');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = (newModel: VCModel) => {
    setVCModels((prev) => [newModel as VCModelListItem, ...prev]);
    setShowCreateDialog(false);
  };

  const hasActiveModel = vcModels.some((model) => model.status === 'INITIATED' || model.status === 'IN_PROGRESS');

  const handleStepClick = async (model: VCModelListItem, step: string) => {
    const allowedSteps = new Set(['BVS', 'PRELIMINARY_DBS', 'DBS_REVIEW', 'DBS_COMPLETE']);
    if (!allowedSteps.has(step)) {
      return;
    }

    try {
      const flmModel = Array.isArray(model.flm) ? model.flm[0] : model.flm;
      const currentStep = flmModel?.current_step || 'BVS';

      if (step !== currentStep) {
        return;
      }
      let flmModelId = flmModel?.id;

      if (!flmModelId) {
        const response = await fetch(`/api/vc-models/${model.id}/flm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: 'Auto-created for BVS' })
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to create FLM model');
        }
        flmModelId = result.data?.id;
      }

      if (!flmModelId) {
        throw new Error('FLM model not found for this VC Model.');
      }

      setActiveBuilder({
        vcModelId: model.id,
        flmModelId,
        stakeholderId: model.stakeholder_id
      });
    } catch (err: any) {
      setError(err.message || 'Failed to open FLM Builder');
    }
  };

  const buildProgress = (model: VCModelListItem) => {
    const flmModel = Array.isArray(model.flm) ? model.flm[0] : model.flm;
    const currentStepRaw = flmModel?.current_step ?? 'BVS';
    const orderedSteps = ['BVS', 'PRELIMINARY_DBS', 'DBS_REVIEW', 'DBS_COMPLETE', 'L0', 'L1', 'L2', 'BLUEPRINT'];
    const currentIndex = currentStepRaw ? orderedSteps.indexOf(currentStepRaw) : -1;

    return {
      bvs_complete: model.status === 'COMPLETED' || currentIndex > 0,
      preliminary_dbs_complete: model.status === 'COMPLETED' || currentIndex > 1,
      dbs_review_complete: model.status === 'COMPLETED' || currentIndex > 2,
      dbs_complete: model.status === 'COMPLETED' || currentIndex > 3,
      l0_complete: model.status === 'COMPLETED' || currentIndex > 4,
      l1_complete: model.status === 'COMPLETED' || currentIndex > 5,
      l2_complete: model.status === 'COMPLETED' || currentIndex > 6,
      current_step: currentStepRaw || 'BVS'
    };
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((index) => (
          <div key={index} className="h-48 rounded-lg bg-gray-200 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <div className="text-sm text-red-700">{error}</div>
        <button
          onClick={fetchVCModels}
          className="mt-2 text-sm font-medium text-red-800 hover:text-red-900"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">VC Models</h2>
          <p className="text-sm text-gray-600">
            {vcModels.length} model{vcModels.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => setShowCreateDialog(true)}
            disabled={hasActiveModel}
            title={hasActiveModel ? 'Finish the active VC Model before creating a new one.' : 'Create a new VC Model'}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white ${
              hasActiveModel ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Plus className="h-4 w-4" />
            Create VC Model
          </button>
          {hasActiveModel && (
            <p className="text-xs text-gray-500">Active model in progress.</p>
          )}
        </div>
      </div>

      {vcModels.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 mb-4">No VC Models yet</p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="text-blue-600 hover:underline"
          >
            Create your first VC Model
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vcModels.map((model) => (
            <VCModelCard
              key={model.id}
              vcModel={model}
              flmProgress={buildProgress(model)}
              onContinue={() => router.push(`/dashboard/vc-models/${model.id}`)}
              onStepClick={(step) => handleStepClick(model, step)}
            />
          ))}
        </div>
      )}

      <CreateVCModelDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleCreateSuccess}
      />

      {activeBuilder && (
        <FLMBuilder
          vcModelId={activeBuilder.vcModelId}
          flmModelId={activeBuilder.flmModelId}
          stakeholderId={activeBuilder.stakeholderId}
          onClose={() => {
            setActiveBuilder(null);
            fetchVCModels();
          }}
        />
      )}
    </div>
  );
}
