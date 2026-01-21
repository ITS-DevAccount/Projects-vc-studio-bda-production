'use client';

// FLM Component Suite - Phase 2: Main Display Component
// FLMModelDisplay - Main navigation/progress display component

import { useState, useEffect } from 'react';
import { ChevronRight, Users, FileText, Clock, AlertCircle, CheckCircle, Circle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ArtefactStatusBadge from './ArtefactStatusBadge';

interface VCModel {
  id: string;
  model_code: string;
  model_name: string;
  version_number: number;
  status: string;
  description?: string;
}

interface Collaborator {
  id: string;
  stakeholder_id: string;
  role: 'OWNER' | 'COLLABORATOR' | 'REVIEWER' | 'VIEWER';
  stakeholder?: {
    name: string;
  };
}

interface FLMModel {
  id: string;
  vc_model_id: string;
  status: string;
  current_step: 'BVS' | 'L0' | 'L1' | 'L2' | 'BLUEPRINT';
  flm_version: number;
  description?: string;
}

interface Artefact {
  id: string;
  flm_model_id: string;
  artefact_type: 'BVS' | 'L0' | 'L1' | 'L2' | 'BLUEPRINT';
  status: 'DRAFT' | 'PENDING_REVIEW' | 'CONFIRMED' | 'SUPERSEDED';
  version: number;
  created_at: string;
  confirmed_at?: string;
}

interface FLMModelDisplayProps {
  vcModelId: string;
  flmModelId: string;
  stakeholderId: string;
  vcModel?: VCModel;
  flmModel?: FLMModel;
  collaborators?: Collaborator[];
  artefacts?: Artefact[];
  onStepClick?: (step: string) => void;
  onStartFLM?: () => void;
}

type FLMStep = 'BVS' | 'L0' | 'L1' | 'L2' | 'BLUEPRINT';

const STEP_ORDER: FLMStep[] = ['BVS', 'L0', 'L1', 'L2', 'BLUEPRINT'];
const STEP_LABELS: Record<FLMStep, string> = {
  BVS: 'Business Value Summary',
  L0: 'L0 Domain Study',
  L1: 'L1 Pillars',
  L2: 'L2 Capabilities',
  BLUEPRINT: 'Business Blueprint'
};

export default function FLMModelDisplay({
  vcModelId,
  flmModelId,
  stakeholderId,
  vcModel,
  flmModel,
  collaborators = [],
  artefacts = [],
  onStepClick,
  onStartFLM
}: FLMModelDisplayProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const getStepStatus = (step: FLMStep): 'completed' | 'current' | 'locked' | 'available' => {
    if (!flmModel) return 'locked';
    
    const currentStepIndex = STEP_ORDER.indexOf(flmModel.current_step);
    const stepIndex = STEP_ORDER.indexOf(step);
    const artefact = artefacts.find((a) => a.artefact_type === step);

    if (artefact?.status === 'CONFIRMED') {
      return 'completed';
    }
    
    if (flmModel.current_step === step) {
      return 'current';
    }
    
    // Lock steps that come after the current step
    if (stepIndex > currentStepIndex) {
      // Check if previous step is confirmed
      const previousStep = STEP_ORDER[stepIndex - 1];
      const previousArtefact = artefacts.find((a) => a.artefact_type === previousStep);
      if (previousArtefact?.status === 'CONFIRMED') {
        return 'available';
      }
      return 'locked';
    }
    
    return 'available';
  };

  const handleStepClick = (step: FLMStep) => {
    const status = getStepStatus(step);
    if (status === 'locked') return;
    
    if (onStepClick) {
      onStepClick(step);
    } else {
      router.push(`/dashboard/workspace/vc-models/${vcModelId}/flm?step=${step}`);
    }
  };

  const getStepIcon = (step: FLMStep, status: 'completed' | 'current' | 'locked' | 'available') => {
    if (status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    if (status === 'current') {
      return <Circle className="w-5 h-5 text-blue-600 fill-blue-600" />;
    }
    if (status === 'locked') {
      return <Circle className="w-5 h-5 text-gray-300" />;
    }
    return <Circle className="w-5 h-5 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading FLM Model...</p>
        </div>
      </div>
    );
  }

  if (!flmModel) {
    return (
      <div className="p-8 bg-white rounded-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">FLM Model</h2>
        <p className="text-gray-600 mb-6">
          No FLM model exists for this VC Model. Start building your Framework Level Model.
        </p>
        {onStartFLM && (
          <button
            onClick={onStartFLM}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Start FLM
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* VC Model Header */}
      {vcModel && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{vcModel.model_name}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Code: {vcModel.model_code}</span>
                <span>Version: {vcModel.version_number}</span>
                <span className="inline-flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  Status: {vcModel.status}
                </span>
              </div>
              {vcModel.description && (
                <p className="mt-2 text-gray-600">{vcModel.description}</p>
              )}
            </div>
            {collaborators.length > 0 && (
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Users className="w-4 h-4" />
                  <span>{collaborators.length} collaborator{collaborators.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {collaborators.slice(0, 3).map((collab) => (
                    <span
                      key={collab.id}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                    >
                      {collab.stakeholder?.name || collab.role}
                    </span>
                  ))}
                  {collaborators.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      +{collaborators.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLM Progress */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">FLM Progress</h2>
          <p className="text-sm text-gray-600">
            Current step: {STEP_LABELS[flmModel.current_step]} (Version {flmModel.flm_version})
          </p>
        </div>

        {/* Progress Steps */}
        <div className="space-y-4">
          {STEP_ORDER.map((step, index) => {
            const status = getStepStatus(step);
            const artefact = artefacts.find((a) => a.artefact_type === step);
            const isLast = index === STEP_ORDER.length - 1;

            return (
              <div key={step} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => handleStepClick(step)}
                    disabled={status === 'locked'}
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                      status === 'completed'
                        ? 'border-green-600 bg-green-50'
                        : status === 'current'
                        ? 'border-blue-600 bg-blue-50'
                        : status === 'locked'
                        ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                        : 'border-gray-300 bg-white hover:border-blue-400 cursor-pointer'
                    }`}
                  >
                    {getStepIcon(step, status)}
                  </button>
                  {!isLast && (
                    <div
                      className={`w-0.5 h-12 ${
                        status === 'completed' ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>

                <div className="flex-1 pb-8">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => handleStepClick(step)}
                      disabled={status === 'locked'}
                      className={`text-left font-semibold ${
                        status === 'locked'
                          ? 'text-gray-400 cursor-not-allowed'
                          : status === 'current'
                          ? 'text-blue-600'
                          : 'text-gray-900 hover:text-blue-600'
                      }`}
                    >
                      {STEP_LABELS[step]}
                    </button>
                    {artefact && (
                      <ArtefactStatusBadge status={artefact.status} />
                    )}
                  </div>
                  {artefact && (
                    <div className="text-xs text-gray-500 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(artefact.created_at).toLocaleDateString()}
                      </span>
                      {artefact.confirmed_at && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Confirmed {new Date(artefact.confirmed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FLM Status Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {STEP_ORDER.map((step) => {
            const artefact = artefacts.find((a) => a.artefact_type === step);
            const status = getStepStatus(step);
            return (
              <div
                key={step}
                className={`p-4 rounded-lg border-2 ${
                  status === 'completed'
                    ? 'border-green-600 bg-green-50'
                    : status === 'current'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="text-xs font-semibold text-gray-600 mb-1">{step}</div>
                <div className="text-lg font-bold text-gray-900">
                  {artefact ? (
                    <span className={status === 'completed' ? 'text-green-600' : 'text-blue-600'}>
                      {artefact.status === 'CONFIRMED' ? '✓' : '○'}
                    </span>
                  ) : (
                    <span className="text-gray-400">○</span>
                  )}
                </div>
                {artefact && (
                  <div className="text-xs text-gray-500 mt-1">v{artefact.version}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      {flmModel.status !== 'COMPLETED' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Next Steps</h3>
              <p className="text-sm text-blue-700">
                Continue building your FLM by completing each step in order.
              </p>
            </div>
            <button
              onClick={() => handleStepClick(flmModel.current_step)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Continue FLM
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
