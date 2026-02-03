'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FLMModelDisplay from '@/components/flm/FLMModelDisplay';
import BVSBuilder from '@/components/flm/BVSBuilder';
import DBSForm from '@/components/flm/DBSForm';
import L0Builder from '@/components/flm/L0Builder';
import L1Builder from '@/components/flm/L1Builder';
import L2Builder from '@/components/flm/L2Builder';
import BlueprintViewer from '@/components/flm/BlueprintViewer';
import type { FLMArtefact, FLMModel, VCModel } from '@/lib/types/vc-model';

type StepKey = 'BVS' | 'DBS' | 'L0' | 'L1' | 'L2' | 'BLUEPRINT';

export default function FLMWorkflowPage({ params }: { params: { vcModelId: string } }) {
  const { vcModelId } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vcModel, setVcModel] = useState<VCModel | null>(null);
  const [flmModel, setFlmModel] = useState<FLMModel | null>(null);
  const [artefacts, setArtefacts] = useState<FLMArtefact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const stepParam = searchParams.get('step')?.toUpperCase() as StepKey | undefined;
  const currentStep = stepParam || flmModel?.current_step || 'BVS';

  const bvsArtefact = useMemo(
    () => artefacts.find((item) => item.artefact_type === 'BVS'),
    [artefacts]
  );
  const l0Artefact = useMemo(
    () => artefacts.find((item) => item.artefact_type === 'L0'),
    [artefacts]
  );
  const l1Artefact = useMemo(
    () => artefacts.find((item) => item.artefact_type === 'L1'),
    [artefacts]
  );
  const l2Artefact = useMemo(
    () => artefacts.find((item) => item.artefact_type === 'L2'),
    [artefacts]
  );
  const blueprintArtefact = useMemo(
    () => artefacts.find((item) => item.artefact_type === 'BLUEPRINT'),
    [artefacts]
  );

  useEffect(() => {
    fetchData();
  }, [vcModelId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const vcResponse = await fetch(`/api/vc-models/${vcModelId}`);
      const vcResult = await vcResponse.json();
      if (!vcResponse.ok) {
        throw new Error(vcResult.error || 'Failed to load VC Model');
      }
      setVcModel(vcResult.data);

      const flmResponse = await fetch(`/api/vc-models/${vcModelId}/flm`);
      const flmResult = await flmResponse.json();
      if (!flmResponse.ok) {
        throw new Error(flmResult.error || 'Failed to load FLM');
      }
      const flmData = flmResult.data;
      setFlmModel(flmData);

      if (flmData?.id) {
        const artefactRes = await fetch(`/api/vc-models/${vcModelId}/flm/${flmData.id}/artefacts`);
        const artefactResult = await artefactRes.json();
        if (artefactRes.ok) {
          setArtefacts(artefactResult.data || []);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load FLM workflow');
    } finally {
      setLoading(false);
    }
  };

  const updateArtefact = async (artefactId: string, artefact_json: unknown, status?: string) => {
    const response = await fetch(
      `/api/vc-models/${vcModelId}/flm/${flmModel?.id}/artefacts/${artefactId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artefact_json, status })
      }
    );
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to update artefact');
    }
    setArtefacts((prev) => prev.map((item) => (item.id === artefactId ? result.data : item)));
  };

  const confirmArtefact = async (artefactId: string) => {
    const response = await fetch(
      `/api/vc-models/${vcModelId}/flm/${flmModel?.id}/artefacts/${artefactId}/confirm`,
      { method: 'POST' }
    );
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to confirm artefact');
    }
    setArtefacts((prev) => prev.map((item) => (item.id === artefactId ? result.data : item)));
  };

  const ensureArtefact = (artefact: FLMArtefact | undefined, label: string) => {
    if (!artefact) {
      setNotice(`${label} artefact has not been initialized yet. Workflow integration will create it in Phase 4.`);
      return false;
    }
    setNotice(null);
    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading FLM workflow...</p>
        </div>
      </div>
    );
  }

  if (error || !vcModel || !flmModel) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-red-800">
        {error || 'FLM workflow not available.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FLMModelDisplay
        vcModelId={vcModelId}
        flmModelId={flmModel.id}
        stakeholderId=""
        vcModel={vcModel}
        flmModel={flmModel}
        artefacts={artefacts}
        onStepClick={(step) => router.push(`/dashboard/vc-models/${vcModelId}/flm?step=${step}`)}
      />

      {notice && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          {notice}
        </div>
      )}

      {currentStep === 'BVS' && (
        <BVSBuilder
          vcModelId={vcModelId}
          flmModelId={flmModel.id}
          stakeholderId=""
          initialBVS={typeof bvsArtefact?.artefact_json === 'string' ? bvsArtefact?.artefact_json : (bvsArtefact?.artefact_json as any)?.text || ''}
          initialDocuments={(bvsArtefact?.artefact_json as any)?.documents || []}
          onSave={async (bvs, documents) => {
            if (!ensureArtefact(bvsArtefact, 'BVS')) return;
            await updateArtefact(bvsArtefact.id, { text: bvs, documents }, 'DRAFT');
          }}
          onGenerateDBS={() => {
            if (!ensureArtefact(bvsArtefact, 'BVS')) return;
            router.push(`/dashboard/vc-models/${vcModelId}/flm?step=DBS`);
          }}
        />
      )}

      {currentStep === 'DBS' && (
        <DBSForm
          vcModelId={vcModelId}
          flmModelId={flmModel.id}
          schema={(bvsArtefact?.artefact_json as any)?.dbs_schema || null}
          prefill={(bvsArtefact?.artefact_json as any)?.dbs_prefill || {}}
          initialData={(bvsArtefact?.artefact_json as any)?.dbs_data || {}}
          onSave={async (data) => {
            if (!ensureArtefact(bvsArtefact, 'BVS')) return;
            const payload = {
              ...(bvsArtefact?.artefact_json as any),
              dbs_data: data
            };
            await updateArtefact(bvsArtefact.id, payload, 'DRAFT');
          }}
        />
      )}

      {currentStep === 'L0' && (
        <L0Builder
          vcModelId={vcModelId}
          flmModelId={flmModel.id}
          artefact={l0Artefact}
          onSave={async (data) => {
            if (!ensureArtefact(l0Artefact, 'L0')) return;
            await updateArtefact(l0Artefact.id, data, 'DRAFT');
          }}
          onConfirm={async () => {
            if (!ensureArtefact(l0Artefact, 'L0')) return;
            await confirmArtefact(l0Artefact.id);
          }}
        />
      )}

      {currentStep === 'L1' && (
        <L1Builder
          vcModelId={vcModelId}
          flmModelId={flmModel.id}
          artefact={l1Artefact}
          onSave={async (data) => {
            if (!ensureArtefact(l1Artefact, 'L1')) return;
            await updateArtefact(l1Artefact.id, data, 'DRAFT');
          }}
          onConfirm={async () => {
            if (!ensureArtefact(l1Artefact, 'L1')) return;
            await confirmArtefact(l1Artefact.id);
          }}
        />
      )}

      {currentStep === 'L2' && (
        <L2Builder
          vcModelId={vcModelId}
          flmModelId={flmModel.id}
          artefact={l2Artefact}
          onSave={async (data) => {
            if (!ensureArtefact(l2Artefact, 'L2')) return;
            await updateArtefact(l2Artefact.id, data, 'DRAFT');
          }}
          onConfirm={async () => {
            if (!ensureArtefact(l2Artefact, 'L2')) return;
            await confirmArtefact(l2Artefact.id);
          }}
        />
      )}

      {currentStep === 'BLUEPRINT' && (
        <BlueprintViewer
          vcModelId={vcModelId}
          flmModelId={flmModel.id}
          blueprint={typeof blueprintArtefact?.artefact_json === 'string' ? blueprintArtefact?.artefact_json : (blueprintArtefact?.artefact_json as any)?.content}
          blueprintPath={blueprintArtefact?.document_path || undefined}
          loading={false}
        />
      )}
    </div>
  );
}
