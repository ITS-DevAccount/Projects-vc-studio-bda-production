'use client';

// FLM Component Suite - Phase 2: Step Builder Components
// L0Builder - L0 Domain Definition editor

import { useState, useEffect } from 'react';
import { Save, Loader, AlertCircle, CheckCircle, Eye } from 'lucide-react';
import JsonView from '@uiw/react-json-view';

interface L0BuilderProps {
  vcModelId: string;
  flmModelId: string;
  artefact?: any; // L0 artefact JSON
  initialData?: any;
  onSave: (data: any) => Promise<void>;
  onConfirm?: (data: any) => Promise<void>;
  readOnly?: boolean;
}

export default function L0Builder({
  vcModelId,
  flmModelId,
  artefact,
  initialData,
  onSave,
  onConfirm,
  readOnly = false
}: L0BuilderProps) {
  const [jsonData, setJsonData] = useState<any>(initialData || artefact?.artefact_json || {});
  const [jsonString, setJsonString] = useState<string>('');
  const [editMode, setEditMode] = useState<'view' | 'edit'>('view');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize JSON string
    try {
      setJsonString(JSON.stringify(jsonData, null, 2));
    } catch (err) {
      setJsonString('{}');
    }
  }, [jsonData]);

  const handleJsonChange = (value: string) => {
    setJsonString(value);
    setJsonError(null);
    try {
      const parsed = JSON.parse(value);
      setJsonData(parsed);
    } catch (err) {
      setJsonError('Invalid JSON syntax');
    }
  };

  const handleSave = async () => {
    if (jsonError) {
      setError('Please fix JSON syntax errors before saving');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await onSave(jsonData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setEditMode('view');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save L0');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (jsonError) {
      setError('Please fix JSON syntax errors before confirming');
      return;
    }

    if (onConfirm) {
      setSaving(true);
      setError(null);
      setSuccess(false);

      try {
        await onConfirm(jsonData);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to confirm L0');
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">L0 Domain Study</h2>
        <p className="text-gray-600 mb-6">
          Review and edit the L0 Domain Study. This defines the comprehensive business operating domain with market context, competitive landscape, and domain boundaries.
        </p>
      </div>

      <div className="space-y-4">
        {!readOnly && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setEditMode(editMode === 'view' ? 'edit' : 'view')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              <Eye className="w-4 h-4" />
              <span>{editMode === 'view' ? 'Edit JSON' : 'View Formatted'}</span>
            </button>
          </div>
        )}

        {editMode === 'view' ? (
          <div className="border border-gray-300 rounded-lg p-4 bg-white">
            <JsonView
              value={jsonData}
              style={{
                backgroundColor: 'transparent',
                fontSize: '14px'
              }}
            />
          </div>
        ) : (
          <div>
            <textarea
              value={jsonString}
              onChange={(e) => handleJsonChange(e.target.value)}
              rows={20}
              className={`w-full px-4 py-3 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                jsonError ? 'border-red-500' : 'border-gray-300'
              } ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              readOnly={readOnly}
            />
            {jsonError && (
              <p className="mt-2 text-sm text-red-600">{jsonError}</p>
            )}
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
            <span>L0 saved successfully</span>
          </div>
        )}

        {!readOnly && (
          <div className="flex items-center gap-4 pt-4">
            <button
              onClick={handleSave}
              disabled={saving || !!jsonError}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                saving || jsonError
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
                  <span>Save L0</span>
                </>
              )}
            </button>

            {onConfirm && (
              <button
                onClick={handleConfirm}
                disabled={saving || !!jsonError}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                  saving || jsonError
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {saving ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Confirm L0</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
