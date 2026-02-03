'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import FileUploader from '@/components/workspace/FileUploader';
import { FileSystemProvider } from '@/contexts/FileSystemContext';

interface FLMBuilderProps {
  vcModelId: string;
  flmModelId: string;
  stakeholderId: string;
  onClose: () => void;
}

interface FlmModel {
  id: string;
  current_step?: string | null;
}

interface Stakeholder {
  id: string;
  name?: string | null;
}

interface UploadedNode {
  id: string;
  name: string;
  file_storage_path?: string | null;
}

export default function FLMBuilder({ vcModelId, flmModelId, stakeholderId, onClose }: FLMBuilderProps) {
  const [flmModel, setFlmModel] = useState<FlmModel | null>(null);
  const [stakeholder, setStakeholder] = useState<Stakeholder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadedNodes, setUploadedNodes] = useState<UploadedNode[]>([]);
  const [bvsFolderId, setBvsFolderId] = useState<string | null>(null);
  const [preliminaryStatus, setPreliminaryStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [preliminaryError, setPreliminaryError] = useState<string | null>(null);
  const [preliminaryPreview, setPreliminaryPreview] = useState<{
    system_prompt: string;
    user_prompt: string;
    variables: Record<string, string>;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const flmResponse = await fetch(`/api/vc-models/${vcModelId}/flm`);
        const flmResult = await flmResponse.json();
        if (!flmResponse.ok) {
          throw new Error(flmResult.error || 'Failed to load FLM model');
        }
        if (isMounted) {
          setFlmModel(flmResult.data);
        }

        const stakeholderResponse = await fetch(`/api/stakeholders/${stakeholderId}`);
        const stakeholderResult = await stakeholderResponse.json();
        if (!stakeholderResponse.ok) {
          throw new Error(stakeholderResult.error || 'Failed to load stakeholder');
        }
        if (isMounted) {
          const resolvedStakeholder = stakeholderResult.data || stakeholderResult.stakeholder || stakeholderResult;
          setStakeholder(resolvedStakeholder || null);
          setCompanyName((prev) => prev || resolvedStakeholder?.name || '');
        }

        const folderResponse = await fetch(`/api/flm/bvs-folder?vc_model_id=${vcModelId}`);
        const folderResult = await folderResponse.json();
        if (!folderResponse.ok) {
          throw new Error(folderResult.error || 'Failed to resolve BVS folder');
        }
        if (isMounted) {
          setBvsFolderId(folderResult.preliminaries_folder_id || null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load FLM builder');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [vcModelId, stakeholderId]);

  useEffect(() => {
    if (!flmModel || (flmModel.current_step || 'BVS') !== 'PRELIMINARY_DBS') return;
    if (preliminaryPreview || previewLoading) return;

    const loadPreview = async () => {
      try {
        setPreviewLoading(true);
        setPreliminaryError(null);
        const response = await fetch('/api/flm/extract-preliminary-dbs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ flm_model_id: flmModelId, dry_run: true })
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to build preview');
        }
        setPreliminaryPreview(result.preview || null);
      } catch (err: any) {
        setPreliminaryError(err.message || 'Failed to build preview');
      } finally {
        setPreviewLoading(false);
      }
    };

    loadPreview();
  }, [flmModel, flmModelId, preliminaryPreview, previewLoading]);

  const handleRunPreliminary = async () => {
    try {
      setPreliminaryStatus('running');
      setPreliminaryError(null);
      const response = await fetch('/api/flm/extract-preliminary-dbs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flm_model_id: flmModelId })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to extract preliminary DBS');
      }
      setPreliminaryStatus('success');
      setTimeout(() => onClose(), 800);
    } catch (err: any) {
      setPreliminaryStatus('error');
      setPreliminaryError(err.message || 'Failed to extract preliminary DBS');
    }
  };

  const wordCount = useMemo(() => {
    return description.trim().split(/\s+/).filter(Boolean).length;
  }, [description]);

  const isValid = companyName.trim().length > 0 && wordCount >= 100;

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      setValidationError('Company name is required');
      return;
    }

    if (wordCount < 100) {
      setValidationError(`Please write at least 100 words (currently: ${wordCount} words)`);
      return;
    }

    setValidationError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/flm/complete-phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flm_model_id: flmModelId,
          phase: 'BVS',
          data: {
            company_name: companyName.trim(),
            business_description: description.trim(),
            source_documents: uploadedNodes
              .map((node) => node.file_storage_path)
              .filter(Boolean)
          }
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save BVS');
      }

      setFlmModel((prev) => (prev ? { ...prev, current_step: 'PRELIMINARY_DBS' } : prev));
      setPreliminaryStatus('idle');
    } catch (err: any) {
      setValidationError(err.message || 'Failed to save BVS');
    } finally {
      setSubmitting(false);
    }
  };

  const renderPhase = () => {
    if (!flmModel) {
      return <div className="text-sm text-gray-600">FLM model not available.</div>;
    }

    const currentStep = flmModel.current_step || 'BVS';

    if (currentStep === 'PRELIMINARY_DBS') {
      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Review the generated prompt before running the extraction.
          </p>

          {previewLoading && (
            <div className="text-center text-sm text-gray-600">
              Building prompt preview...
            </div>
          )}

          {preliminaryPreview && (
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">User Prompt</h4>
                <pre className="max-h-64 overflow-y-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-800 whitespace-pre-wrap border border-gray-200">
                  {preliminaryPreview.user_prompt}
                </pre>
              </div>
              <details className="text-xs text-gray-600">
                <summary className="cursor-pointer font-medium">System Prompt</summary>
                <pre className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-800 whitespace-pre-wrap border border-gray-200">
                  {preliminaryPreview.system_prompt}
                </pre>
              </details>
            </div>
          )}

          {preliminaryError && (
            <p className="text-sm text-red-600">{preliminaryError}</p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleRunPreliminary}
              disabled={preliminaryStatus === 'running' || previewLoading}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                preliminaryStatus === 'running' || previewLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {preliminaryStatus === 'running' ? 'Extracting...' : 'Run Extraction'}
            </button>
          </div>

          {preliminaryStatus === 'success' && (
            <p className="text-sm text-green-600">Preliminary DBS ready.</p>
          )}
        </div>
      );
    }

    if (currentStep !== 'BVS') {
      return <div className="text-sm text-gray-600">Phase not implemented</div>;
    }

    return (
      <div className="space-y-6">
        <p className="text-sm text-gray-700">
          Help us understand your business by answering these questions:
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Company/Business Name</label>
          <input
            type="text"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder="Enter company name"
            required
          />
          {!companyName.trim() && (
            <p className="text-xs text-red-600 mt-2">Company name is required</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Business Description</label>
          <div className="text-xs text-gray-500 mb-3">
            <p>In one sentence, what does your business do?</p>
            <p className="mt-2">Then provide additional detail on:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>What products or services do you sell?</li>
              <li>Who are your customers? (target market, customer types)</li>
              <li>Where is your primary market located? (geographic region)</li>
              <li>What makes you different from competitors?</li>
              <li>What are your growth ambitions?</li>
            </ul>
          </div>
          <textarea
            rows={8}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder="Write at least 100 words..."
          />
          <p className="text-xs text-gray-500 mt-2">{wordCount} / 100 words minimum</p>
          {wordCount < 100 && description.trim().length > 0 && (
            <p className="text-xs text-red-600 mt-1">Please write at least 100 words (currently: {wordCount} words)</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload any supporting documents (business plans, financials, market research, etc.)
          </label>
          {bvsFolderId ? (
            <FileSystemProvider>
              <FileUploader
                compact
                parentId={bvsFolderId}
                onUploaded={(nodes) => {
                  setUploadedNodes((prev) => [...prev, ...nodes]);
                }}
              />
            </FileSystemProvider>
          ) : (
            <p className="text-xs text-gray-500">Preparing upload folder...</p>
          )}
        </div>

        {validationError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {validationError}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className={`w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition-colors ${
            !isValid || submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {submitting ? 'Saving...' : 'Continue to Domain Business Summary'}
        </button>
      </div>
    );
  };

  if (!vcModelId || !flmModelId) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">FLM Builder</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading && (
          <div className="py-8 text-center text-sm text-gray-600">Loading FLM Builder...</div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {!loading && !error && renderPhase()}
      </div>
    </div>
  );
}
