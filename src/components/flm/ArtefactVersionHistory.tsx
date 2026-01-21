'use client';

// FLM Component Suite - Phase 2: Supporting Components
// ArtefactVersionHistory - Version tracking UI

import { useState } from 'react';
import { Clock, User, CheckCircle } from 'lucide-react';
import ArtefactStatusBadge from './ArtefactStatusBadge';

interface ArtefactVersion {
  id: string;
  version: number;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'CONFIRMED' | 'SUPERSEDED';
  created_at: string;
  created_by?: string;
  confirmed_at?: string;
  confirmed_by?: string;
}

interface ArtefactVersionHistoryProps {
  artefactType: 'BVS' | 'L0' | 'L1' | 'L2' | 'BLUEPRINT';
  versions: ArtefactVersion[];
  onSelectVersion?: (version: ArtefactVersion) => void;
  currentVersion?: number;
}

export default function ArtefactVersionHistory({
  artefactType,
  versions,
  onSelectVersion,
  currentVersion
}: ArtefactVersionHistoryProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    versions.find((v) => v.version === currentVersion)?.id || null
  );

  const handleVersionSelect = (version: ArtefactVersion) => {
    setSelectedVersionId(version.id);
    if (onSelectVersion) {
      onSelectVersion(version);
    }
  };

  // Sort versions by version number (newest first)
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Version History</h3>
        <p className="text-sm text-gray-600">{artefactType} Artefact Versions</p>
      </div>

      {sortedVersions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No versions available
        </div>
      ) : (
        <div className="space-y-2">
          {sortedVersions.map((version) => {
            const isSelected = selectedVersionId === version.id;
            const isCurrent = version.version === currentVersion;

            return (
              <button
                key={version.id}
                onClick={() => handleVersionSelect(version)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-900">
                        Version {version.version}
                      </span>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                          <CheckCircle className="w-3 h-3" />
                          Current
                        </span>
                      )}
                      <ArtefactStatusBadge status={version.status} />
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(version.created_at).toLocaleString()}</span>
                      </div>
                      {version.created_by && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>Created by {version.created_by}</span>
                        </div>
                      )}
                      {version.confirmed_at && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>Confirmed {new Date(version.confirmed_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
