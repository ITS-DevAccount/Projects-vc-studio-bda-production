'use client';

import { BookOpen, Check, FileText } from 'lucide-react';

interface VCModelCardProps {
  vcModel: {
    id: string;
    model_code: string;
    model_name: string;
    status: 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED';
  };
  flmProgress?: {
    bvs_complete: boolean;
    l0_complete: boolean;
    l1_complete: boolean;
    l2_complete: boolean;
    current_step?: 'BVS' | 'PRELIMINARY_DBS' | 'DBS_REVIEW' | 'DBS_COMPLETE' | 'L0' | 'L1' | 'L2' | 'BLUEPRINT';
  };
  onContinue?: () => void;
  onStepClick?: (step: StepKey) => void;
}

const steps = [
  {
    key: 'BVS',
    label: 'Business Value Summary',
    shortLabel: 'BVS',
    icon: FileText
  },
  { key: 'PRELIMINARY_DBS', label: 'Preliminary DBS', shortLabel: 'DBS' },
  { key: 'DBS_REVIEW', label: 'Review DBS', shortLabel: 'Review' },
  { key: 'DBS_COMPLETE', label: 'Complete DBS', shortLabel: 'Complete' },
  { key: 'L0', label: 'Domain Study', shortLabel: 'L0' },
  { key: 'L1', label: 'Sub Domain', shortLabel: 'L1' },
  { key: 'L2', label: 'Components', shortLabel: 'L2' },
  {
    key: 'BLUEPRINT',
    label: 'Business Blueprint',
    shortLabel: 'Blueprint',
    icon: BookOpen
  }
] as const;

type StepKey = (typeof steps)[number]['key'];

export default function VCModelCard({ vcModel, flmProgress, onContinue, onStepClick }: VCModelCardProps) {
  const completedMap: Record<StepKey, boolean> = {
    BVS: flmProgress?.bvs_complete ?? false,
    PRELIMINARY_DBS: flmProgress?.preliminary_dbs_complete ?? false,
    DBS_REVIEW: flmProgress?.dbs_review_complete ?? false,
    DBS_COMPLETE: flmProgress?.dbs_complete ?? false,
    L0: flmProgress?.l0_complete ?? false,
    L1: flmProgress?.l1_complete ?? false,
    L2: flmProgress?.l2_complete ?? false,
    BLUEPRINT: false
  };

  if (vcModel.status === 'COMPLETED') {
    (Object.keys(completedMap) as StepKey[]).forEach((key) => {
      completedMap[key] = true;
    });
  }

  const completedCount = steps.reduce((count, step) => {
    return completedMap[step.key] ? count + 1 : count;
  }, 0);
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  const statusTone =
    vcModel.status === 'COMPLETED'
      ? 'from-green-600 to-emerald-600'
      : 'from-blue-600 to-indigo-600';
  const statusPill = 'bg-white/20 text-white';
  const codeTone = vcModel.status === 'COMPLETED' ? 'text-green-100' : 'text-blue-100';

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-white/40">
      <div className={`bg-gradient-to-r ${statusTone} p-6 text-white`}>
        <h3 className="text-xl font-bold">{vcModel.model_name}</h3>
        <p className={`${codeTone} text-sm mt-1`}>{vcModel.model_code}</p>
        <span
          className={`inline-flex mt-3 px-3 py-1 rounded-full text-xs font-semibold ${statusPill}`}
        >
          {vcModel.status === 'COMPLETED' ? 'COMPLETED' : vcModel.status.replace('_', ' ')}
        </span>

        {(vcModel.status === 'IN_PROGRESS' || vcModel.status === 'COMPLETED') && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Progress</span>
              <span className="font-semibold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div className="bg-white rounded-full h-2" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="p-6 space-y-0">
        {steps.map((step, index) => {
          const isComplete = completedMap[step.key];
          const isCurrent = flmProgress?.current_step === step.key && !isComplete;
          const hasLockedPrior = steps.slice(0, index).some((prior) => !completedMap[prior.key]);
          const isLocked = !isComplete && !isCurrent && hasLockedPrior;
          const stateText = isComplete
            ? 'Complete'
            : isCurrent
              ? 'Pending'
              : isLocked
                ? 'Locked'
                : 'Pending';

          const isInteractive = isCurrent && !isComplete && !isLocked;
          const isClickable = isInteractive && onStepClick;


          const Icon = step.icon;
          const circleStyles = isComplete
            ? 'bg-green-500 text-white shadow-lg'
            : isCurrent
              ? 'border-4 border-amber-400 text-amber-600 bg-white shadow-lg animate-pulse'
              : 'border-2 border-gray-300 text-gray-400 bg-white';
          const lineStyles = isComplete ? 'bg-green-300' : 'bg-gray-200';

          return (
            <div
              key={step.key}
              onClick={() => {
                if (isClickable) {
                  onStepClick(step.key);
                }
              }}
              role={isClickable ? 'button' : undefined}
              className={`flex items-start gap-4 ${isClickable ? 'cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-2 -mx-2' : ''}`}
            >
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${circleStyles}`}>
                  {isComplete ? (
                    <Check className="w-5 h-5" />
                  ) : Icon ? (
                    <Icon className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{step.shortLabel}</span>
                  )}
                </div>
                {index < steps.length - 1 && <div className={`w-0.5 h-12 ${lineStyles}`} />}
              </div>
              <div className="flex-1 pt-2">
                <h4 className="font-semibold text-gray-900" title={step.label}>{step.shortLabel}</h4>
                <p
                  className={`text-sm mt-1 ${
                    isComplete ? 'text-green-600 font-medium' : isCurrent ? 'text-amber-600 font-medium' : 'text-gray-500'
                  }`}
                >
                  {stateText}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {vcModel.status === 'IN_PROGRESS' && (
        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={onContinue}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
