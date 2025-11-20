/**
 * Sprint 1d.4: Function Registry Edit Modal
 * Form for editing existing function registry entries
 */

'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { FunctionRegistryEntry, UpdateFunctionRegistryInput, ImplementationType } from '@/lib/types/function-registry';
import { WIDGET_CATALOG } from '@/lib/types/function-registry';

interface FunctionRegistryEditModalProps {
  entry: FunctionRegistryEntry;
  onClose: () => void;
  onUpdated: () => void;
}

export default function FunctionRegistryEditModal({ entry, onClose, onUpdated }: FunctionRegistryEditModalProps) {
  const [formData, setFormData] = useState({
    implementation_type: entry.implementation_type,
    description: entry.description || '',
    endpoint_or_path: entry.endpoint_or_path || '',
    ui_widget_id: entry.ui_widget_id || 'TextInput',
    version: entry.version,
    timeout_seconds: entry.timeout_seconds,
    retry_count: entry.retry_count,
    is_active: entry.is_active,
  });

  const [inputSchemaJson, setInputSchemaJson] = useState(JSON.stringify(entry.input_schema, null, 2));
  const [outputSchemaJson, setOutputSchemaJson] = useState(JSON.stringify(entry.output_schema, null, 2));
  const [uiDefinitionsJson, setUiDefinitionsJson] = useState(JSON.stringify(entry.ui_definitions, null, 2));
  const [tagsInput, setTagsInput] = useState((entry.tags || []).join(', '));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setErrors({});

    try {
      // Parse JSON fields
      let inputSchema;
      let outputSchema;
      let uiDefinitions;

      try {
        inputSchema = JSON.parse(inputSchemaJson);
      } catch (err) {
        setErrors({ input_schema: 'Invalid JSON format' });
        setSubmitting(false);
        return;
      }

      try {
        outputSchema = JSON.parse(outputSchemaJson);
      } catch (err) {
        setErrors({ output_schema: 'Invalid JSON format' });
        setSubmitting(false);
        return;
      }

      try {
        uiDefinitions = JSON.parse(uiDefinitionsJson);
      } catch (err) {
        setErrors({ ui_definitions: 'Invalid JSON format' });
        setSubmitting(false);
        return;
      }

      // Parse tags
      const tags = tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Build request payload
      const payload: Partial<UpdateFunctionRegistryInput> = {
        ...formData,
        input_schema: inputSchema,
        output_schema: outputSchema,
        ui_definitions: uiDefinitions,
        tags,
      };

      // Submit to API
      const response = await fetch(`/api/function-registry/${entry.function_code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update function');
      }

      // Success!
      onUpdated();
    } catch (err: any) {
      console.error('Error updating function:', err);
      setSubmitError(err.message || 'Failed to update function');
    } finally {
      setSubmitting(false);
    }
  };

  const showEndpointField =
    formData.implementation_type === 'SERVICE_TASK' ||
    formData.implementation_type === 'AI_AGENT_TASK';

  const showWidgetField = formData.implementation_type === 'USER_TASK';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Function</h2>
            <p className="text-sm text-gray-600 mt-1">Function Code: <span className="font-mono">{entry.function_code}</span></p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            disabled={submitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {submitError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{submitError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Implementation Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Implementation Type <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.implementation_type}
                onChange={(e) =>
                  setFormData({ ...formData, implementation_type: e.target.value as ImplementationType })
                }
                required
              >
                <option value="USER_TASK">User Task (Human Input)</option>
                <option value="SERVICE_TASK">Service Task (API Call)</option>
                <option value="AI_AGENT_TASK">AI Agent Task (LLM)</option>
              </select>
            </div>

            {/* Version */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              />
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Endpoint/Path (for SERVICE_TASK and AI_AGENT_TASK) */}
          {showEndpointField && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endpoint or Path
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.endpoint_or_path}
                onChange={(e) => setFormData({ ...formData, endpoint_or_path: e.target.value })}
              />
            </div>
          )}

          {/* UI Widget ID (for USER_TASK) */}
          {showWidgetField && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">UI Widget</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.ui_widget_id}
                onChange={(e) => setFormData({ ...formData, ui_widget_id: e.target.value })}
              >
                {WIDGET_CATALOG.map((widget) => (
                  <option key={widget.id} value={widget.id}>
                    {widget.label} - {widget.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Input Schema */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Input Schema (JSON) <span className="text-red-500">*</span>
            </label>
            <textarea
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${
                errors.input_schema ? 'border-red-500' : 'border-gray-300'
              }`}
              rows={8}
              value={inputSchemaJson}
              onChange={(e) => setInputSchemaJson(e.target.value)}
              required
            />
            {errors.input_schema && (
              <p className="mt-1 text-sm text-red-600">{errors.input_schema}</p>
            )}
          </div>

          {/* Output Schema */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Output Schema (JSON) <span className="text-red-500">*</span>
            </label>
            <textarea
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${
                errors.output_schema ? 'border-red-500' : 'border-gray-300'
              }`}
              rows={8}
              value={outputSchemaJson}
              onChange={(e) => setOutputSchemaJson(e.target.value)}
              required
            />
            {errors.output_schema && (
              <p className="mt-1 text-sm text-red-600">{errors.output_schema}</p>
            )}
          </div>

          {/* UI Definitions (optional) */}
          {showWidgetField && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                UI Definitions (JSON, optional)
              </label>
              <textarea
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${
                  errors.ui_definitions ? 'border-red-500' : 'border-gray-300'
                }`}
                rows={4}
                value={uiDefinitionsJson}
                onChange={(e) => setUiDefinitionsJson(e.target.value)}
              />
              {errors.ui_definitions && (
                <p className="mt-1 text-sm text-red-600">{errors.ui_definitions}</p>
              )}
            </div>
          )}

          {/* Additional Settings */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Timeout */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timeout (seconds)
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.timeout_seconds}
                onChange={(e) =>
                  setFormData({ ...formData, timeout_seconds: parseInt(e.target.value) || 300 })
                }
                min="0"
              />
            </div>

            {/* Retry Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Retry Count
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.retry_count}
                onChange={(e) =>
                  setFormData({ ...formData, retry_count: parseInt(e.target.value) || 0 })
                }
                min="0"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>

          {/* Active Status */}
          <div className="mt-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>

          {/* Actions */}
          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Updating...' : 'Update Function'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
