'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import VCModelHeader from '@/components/vc-models/VCModelHeader';
import VersionHistory from '@/components/vc-models/VersionHistory';
import FLMModelDisplay from '@/components/flm/FLMModelDisplay';
import type { FLMModel, FLMArtefact, VCModel } from '@/lib/types/vc-model';

type VCModelDetail = VCModel & {
  flm?: Array<FLMModel>;
};

const TABS = ['overview', 'flm', 'versions'] as const;
type TabKey = (typeof TABS)[number];

export default function VCModelDetailPage({ params }: { params: { vcModelId: string } }) {
  const { vcModelId } = params;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [vcModel, setVCModel] = useState<VCModelDetail | null>(null);
  const [flmModel, setFlmModel] = useState<FLMModel | null>(null);
  const [artefacts, setArtefacts] = useState<FLMArtefact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVCModel();
  }, [vcModelId]);

  useEffect(() => {
    if (vcModelId) {
      fetchFLM();
    }
  }, [vcModelId]);

  const fetchVCModel = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/vc-models/${vcModelId}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load VC Model');
      }
      setVCModel(result.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load VC Model');
    } finally {
      setLoading(false);
    }
  };

  const fetchFLM = async () => {
    try {
      const response = await fetch(`/api/vc-models/${vcModelId}/flm`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load FLM');
      }
      const flm = result.data;
      setFlmModel(flm);
      if (flm?.id) {
        const artefactRes = await fetch(`/api/vc-models/${vcModelId}/flm/${flm.id}/artefacts`);
        const artefactResult = await artefactRes.json();
        if (artefactRes.ok) {
          setArtefacts(artefactResult.data || []);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load FLM');
    }
  };

  const handleCreateVersion = async () => {
    try {
      const response = await fetch(`/api/vc-models/${vcModelId}/version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create version');
      }
      if (result.data?.id) {
        router.push(`/dashboard/vc-models/${result.data.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create version');
    }
  };

  const handleStartFlm = async () => {
    try {
      const response = await fetch(`/api/vc-models/${vcModelId}/flm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'FLM initiated via dashboard' })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create FLM');
      }
      setFlmModel(result.data);
      setActiveTab('flm');
    } catch (err: any) {
      setError(err.message || 'Failed to create FLM');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading VC Model...</p>
        </div>
      </div>
    );
  }

  if (error || !vcModel) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-red-800">
        {error || 'VC Model not found.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VCModelHeader vcModel={vcModel} onCreateVersion={handleCreateVersion} onStartFlm={handleStartFlm} />

      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Overview</h3>
          <p className="text-sm text-gray-600">
            Use the tabs above to manage version history and FLM progress.
          </p>
        </div>
      )}

      {activeTab === 'flm' && (
        <FLMModelDisplay
          vcModelId={vcModelId}
          flmModelId={flmModel?.id || ''}
          stakeholderId=""
          vcModel={vcModel}
          flmModel={flmModel || undefined}
          artefacts={artefacts}
          onStepClick={(step) => router.push(`/dashboard/vc-models/${vcModelId}/flm?step=${step}`)}
          onStartFLM={handleStartFlm}
        />
      )}

      {activeTab === 'versions' && (
        <VersionHistory
          vcModelId={vcModelId}
          current={vcModel}
          onVersionCreated={(newVersion) => router.push(`/dashboard/vc-models/${newVersion.id}`)}
        />
      )}
    </div>
  );
}
