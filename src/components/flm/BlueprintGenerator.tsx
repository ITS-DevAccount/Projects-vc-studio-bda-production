'use client';

// FLM Component Suite - Phase 2: Step Builder Components
// BlueprintGenerator - Final blueprint compilation display

import { useState, useEffect } from 'react';
import { Download, Loader, AlertCircle, CheckCircle, FileText } from 'lucide-react';

interface BlueprintGeneratorProps {
  vcModelId: string;
  flmModelId: string;
  blueprint?: string; // Markdown content
  blueprintPath?: string;
  onGenerate?: () => Promise<void>;
  onDownload?: () => Promise<void>;
  loading?: boolean;
}

export default function BlueprintGenerator({
  vcModelId,
  flmModelId,
  blueprint,
  blueprintPath,
  onGenerate,
  onDownload,
  loading = false
}: BlueprintGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleGenerate = async () => {
    if (!onGenerate) return;

    setGenerating(true);
    setError(null);
    setSuccess(false);

    try {
      await onGenerate();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate blueprint');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!onDownload) return;

    try {
      await onDownload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download blueprint');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Blueprint</h2>
        <p className="text-gray-600 mb-6">
          The comprehensive Business Blueprint document compiled from your complete FLM (BVS, DBS, L0, L1, L2).
        </p>
      </div>

      <div className="space-y-4">
        {!blueprint && !loading && (
          <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
            <p className="mb-4">Blueprint not yet generated. Click the button below to generate it.</p>
            {onGenerate && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                  generating
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {generating ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    <span>Generate Blueprint</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {loading && (
          <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            <div className="flex items-center gap-2">
              <Loader className="w-5 h-5 animate-spin" />
              <span>Generating blueprint...</span>
            </div>
          </div>
        )}

        {blueprint && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Blueprint Document</h3>
              {onDownload && (
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              )}
            </div>
            <div className="border border-gray-300 rounded-lg p-6 bg-white">
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{
                  __html: blueprint
                    .replace(/\n/g, '<br />')
                    .replace(/#{1,6}\s+(.+)/g, (match, text) => {
                      const level = match.match(/^#+/)[0].length;
                      return `<h${level}>${text}</h${level}>`;
                    })
                }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>Blueprint generated successfully</span>
          </div>
        )}
      </div>
    </div>
  );
}
