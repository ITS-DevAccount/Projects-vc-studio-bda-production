// Sprint 1d.7: FLM Building Workflow - VC Model Viewer Component
// Phase B: Workflow Components

'use client';

import { useState } from 'react';

interface VCModelData {
  bvs?: any;
  dbs?: any;
  l0?: any;
  l1?: any;
  l2?: any;
}

interface VCModelViewerProps {
  stakeholderId: string;
  modelData: VCModelData;
  viewMode: 'stakeholder' | 'admin';
  showDrafts?: boolean;
  showCompletion?: boolean;
  expandedByDefault?: boolean;
}

export default function VCModelViewer({
  stakeholderId: _stakeholderId,
  modelData,
  viewMode,
  showDrafts: _showDrafts = false,
  showCompletion = true,
  expandedByDefault = false
}: VCModelViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    l0: expandedByDefault,
    l1: expandedByDefault,
    l2: expandedByDefault
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getCompletionStatus = () => {
    const statuses = {
      l0: !!modelData.l0,
      l1: !!modelData.l1,
      l2: !!modelData.l2
    };

    const completed = Object.values(statuses).filter(Boolean).length;
    const total = Object.values(statuses).length;
    const percentage = Math.round((completed / total) * 100);

    return { statuses, completed, total, percentage };
  };

  const { statuses, completed, total, percentage } = getCompletionStatus();

  const StatusIcon = ({ complete }: { complete: boolean }) => {
    if (complete) {
      return (
        <span className="inline-block w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">
          ✓
        </span>
      );
    }
    return (
      <span className="inline-block w-5 h-5 rounded-full bg-gray-300 text-white text-xs flex items-center justify-center">
        ○
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              VC Model: {modelData.dbs?.business_name || 'Untitled Business'}
            </h2>
            {showCompletion && (
              <p className="text-sm text-gray-600 mt-1">
                Completion: {completed} of {total} levels ({percentage}%)
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {viewMode === 'admin' && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                Admin View
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {showCompletion && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* L0 Domain */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div
          onClick={() => toggleSection('l0')}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <StatusIcon complete={statuses.l0} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">L0 DOMAIN</h3>
              <p className="text-sm text-gray-600">Market context and competitive landscape</p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${
              expandedSections.l0 ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {expandedSections.l0 && modelData.l0 && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="space-y-3">
              {modelData.l0.market_context && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Market Context</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    TAM: {modelData.l0.market_context.tam} | SAM:{' '}
                    {modelData.l0.market_context.sam} | SOM: {modelData.l0.market_context.som}
                  </p>
                </div>
              )}
              {modelData.l0.competitive_landscape && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Competitive Landscape</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {modelData.l0.competitive_landscape.competitors?.length || 0} competitors
                    identified
                  </p>
                </div>
              )}
              {modelData.l0.regulatory_environment && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Regulatory Environment</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {Array.isArray(modelData.l0.regulatory_environment.regulations)
                      ? modelData.l0.regulatory_environment.regulations.join(', ')
                      : 'Not specified'}
                  </p>
                </div>
              )}
              {modelData.l0.customer_profile && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Customer Profile</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {modelData.l0.customer_profile.segments?.join(', ') || 'Not specified'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {expandedSections.l0 && !modelData.l0 && (
          <div className="border-t border-gray-200 p-4 bg-gray-50 text-center text-gray-500">
            L0 Domain Study not yet created
          </div>
        )}
      </div>

      {/* L1 Business Pillars */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div
          onClick={() => toggleSection('l1')}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <StatusIcon complete={statuses.l1} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">L1 BUSINESS PILLARS</h3>
              <p className="text-sm text-gray-600">Strategic value chain segments</p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${
              expandedSections.l1 ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {expandedSections.l1 && modelData.l1 && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="space-y-3">
              {Array.isArray(modelData.l1.pillars) &&
                modelData.l1.pillars.map((pillar: any, index: number) => (
                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          [{pillar.code}] {pillar.name}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">{pillar.description}</p>
                      </div>
                      {pillar.value_contribution && (
                        <span className="text-xs font-medium text-blue-600">
                          {pillar.value_contribution}% of margin
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {expandedSections.l1 && !modelData.l1 && (
          <div className="border-t border-gray-200 p-4 bg-gray-50 text-center text-gray-500">
            L1 Business Pillars not yet created
          </div>
        )}
      </div>

      {/* L2 Capabilities */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div
          onClick={() => toggleSection('l2')}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <StatusIcon complete={statuses.l2} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">L2 CAPABILITIES</h3>
              <p className="text-sm text-gray-600">Functional capabilities matrix</p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${
              expandedSections.l2 ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {expandedSections.l2 && modelData.l2 && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="space-y-4">
              {modelData.l2.capabilities &&
                Object.entries(modelData.l2.capabilities).map(
                  ([pillarCode, capabilities]: [string, any]) => (
                    <div key={pillarCode}>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">{pillarCode}</h4>
                      <div className="space-y-2 ml-4">
                        {Array.isArray(capabilities) &&
                          capabilities.map((capability: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between bg-white border border-gray-200 rounded p-2"
                            >
                              <div>
                                <span className="text-sm text-gray-900">{capability.name}</span>
                                {capability.description && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    {capability.description}
                                  </p>
                                )}
                              </div>
                              {capability.maturity && (
                                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                  {capability.maturity}
                                </span>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )
                )}
            </div>
          </div>
        )}

        {expandedSections.l2 && !modelData.l2 && (
          <div className="border-t border-gray-200 p-4 bg-gray-50 text-center text-gray-500">
            L2 Capabilities Matrix not yet created
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            View Full Detail
          </button>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Export JSON
            </button>
            {viewMode === 'admin' && (
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
