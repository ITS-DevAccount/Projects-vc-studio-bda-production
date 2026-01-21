'use client';

// FLM Component Suite - Phase 2: Step Builder Components
// BVSBuilder - Business Value Summary capture component

import { useState } from 'react';
import { Save, Upload, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import SourceDocUploader from './SourceDocUploader';

interface BVSBuilderProps {
  vcModelId: string;
  flmModelId: string;
  stakeholderId: string;
  initialBVS?: string;
  initialDocuments?: any[];
  onSave: (bvs: string, documents: any[]) => Promise<void>;
  onGenerateDBS?: () => void;
}

export default function BVSBuilder({
  vcModelId,
  flmModelId,
  stakeholderId,
  initialBVS = '',
  initialDocuments = [],
  onSave,
  onGenerateDBS
}: BVSBuilderProps) {
  const [bvs, setBvs] = useState(initialBVS);
  const [documents, setDocuments] = useState(initialDocuments);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [minLength] = useState(100);

  const handleSave = async () => {
    if (bvs.trim().length < minLength) {
      setError(`Business description must be at least ${minLength} characters`);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await onSave(bvs.trim(), documents);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save BVS');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateDBS = () => {
    if (bvs.trim().length < minLength) {
      setError(`Business description must be at least ${minLength} characters`);
      return;
    }

    if (onGenerateDBS) {
      onGenerateDBS();
    }
  };

  const handleDocumentUpload = (document: any) => {
    setDocuments((prev) => [...prev, document]);
  };

  const handleDocumentDelete = (documentId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Value Summary (BVS)</h2>
        <p className="text-gray-600 mb-6">
          Describe your business in natural language. This will be used to generate the Domain Business Summary (DBS) schema.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="bvs" className="block text-sm font-semibold text-gray-700 mb-2">
            Business Description
          </label>
          <textarea
            id="bvs"
            value={bvs}
            onChange={(e) => {
              setBvs(e.target.value);
              setError(null);
            }}
            placeholder="What does your business do? Who do you serve? How do you create value? What makes you unique?"
            rows={12}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {bvs.length} / {minLength} characters minimum
            </p>
            {bvs.length < minLength && (
              <p className="text-sm text-red-600">
                {minLength - bvs.length} more characters needed
              </p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Supporting Documents (Optional)</h3>
          <p className="text-sm text-gray-600 mb-4">
            Upload business plans, financial models, or other documents to provide additional context.
          </p>
          <SourceDocUploader
            flmModelId={flmModelId}
            onUploadComplete={handleDocumentUpload}
            existingDocuments={documents}
            onDelete={handleDocumentDelete}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>BVS saved successfully</span>
          </div>
        )}

        <div className="flex items-center gap-4 pt-4">
          <button
            onClick={handleSave}
            disabled={saving || bvs.trim().length < minLength}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
              saving || bvs.trim().length < minLength
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {saving ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save BVS</span>
              </>
            )}
          </button>

          {onGenerateDBS && (
            <button
              onClick={handleGenerateDBS}
              disabled={saving || bvs.trim().length < minLength}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                saving || bvs.trim().length < minLength
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <Upload className="w-5 h-5" />
              <span>Generate DBS Schema</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
