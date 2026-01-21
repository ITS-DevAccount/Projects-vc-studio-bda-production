'use client';

// FLM Component Suite - Phase 2: Step Builder Components
// DBSForm - Dynamic form from AI-generated schema

import { useState, useEffect, useMemo, useRef } from 'react';
import { Save, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import DynamicFormRenderer from '@/components/workflow/DynamicFormRenderer';

interface DBSFormProps {
  vcModelId: string;
  flmModelId: string;
  schema: any; // JSON Schema from AI
  prefill?: any; // Pre-filled values from AI
  initialData?: any;
  onSave: (data: any) => Promise<void>;
  onSubmit?: (data: any) => Promise<void>;
  readOnly?: boolean;
}

export default function DBSForm({
  vcModelId,
  flmModelId,
  schema,
  prefill = {},
  initialData = {},
  onSave,
  onSubmit,
  readOnly = false
}: DBSFormProps) {
  const [formData, setFormData] = useState<any>({ ...prefill, ...initialData });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Memoize merged data to compare values, not references
  const mergedData = useMemo(() => ({ ...prefill, ...initialData }), [
    JSON.stringify(prefill),
    JSON.stringify(initialData)
  ]);

  useEffect(() => {
    // Only update if the merged data actually changed (by value, not reference)
    setFormData(mergedData);
  }, [mergedData]);

  const handleSave = async (data: any) => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await onSave(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save DBS');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (data: any) => {
    if (onSubmit) {
      setSaving(true);
      setError(null);
      setSuccess(false);

      try {
        await onSubmit(data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit DBS');
      } finally {
        setSaving(false);
      }
    }
  };

  if (!schema || !schema.properties) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
        <p>DBS schema not yet generated. Please complete the BVS step first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Domain Business Summary (DBS)</h2>
        <p className="text-gray-600 mb-6">
          Complete the structured business information below. Fields have been pre-filled where possible from your Business Value Summary.
        </p>
      </div>

      <div className="space-y-4">
        <DynamicFormRenderer
          schema={schema}
          initialData={formData}
          onSubmit={handleSubmit}
          readOnly={readOnly}
        />

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>DBS saved successfully</span>
          </div>
        )}

        {!readOnly && (
          <div className="flex items-center gap-4 pt-4">
            <button
              onClick={() => handleSave(formData)}
              disabled={saving}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                saving
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
                  <span>Save Draft</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
