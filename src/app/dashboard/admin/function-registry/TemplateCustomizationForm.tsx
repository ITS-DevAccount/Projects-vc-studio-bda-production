/**
 * Sprint 1d.4: Template Customization Form
 * Edit template properties before creating function
 */

'use client';

import { useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import type { FunctionTemplate } from '@/lib/templates/template-types';
import type { CreateFunctionRegistryInput, ImplementationType } from '@/lib/types/function-registry';
import { WIDGET_CATALOG } from '@/lib/types/function-registry';

interface TemplateCustomizationFormProps {
  template: FunctionTemplate;
  onClose: () => void;
  onBack: () => void;
  onCreated: () => void;
}

export default function TemplateCustomizationForm({
  template,
  onClose,
  onBack,
  onCreated,
}: TemplateCustomizationFormProps) {
  const [formData, setFormData] = useState({
    function_code: template.defaultFunctionCode,
    implementation_type: template.implementationType,
    description: template.description,
    ui_widget_id: template.uiWidgetId,
    version: '1.0',
    tags: [template.category],
    timeout_seconds: 300,
    retry_count: 0,
    is_active: true,
  });

  const [inputSchemaJson, setInputSchemaJson] = useState(JSON.stringify(template.inputSchema, null, 2));
  const [outputSchemaJson, setOutputSchemaJson] = useState(JSON.stringify(template.outputSchema, null, 2));
  const [tagsInput, setTagsInput] = useState<string>(template.category);

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

      // Parse tags
      const tags = tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Build request payload
      const payload: CreateFunctionRegistryInput = {
        function_code: formData.function_code,
        implementation_type: formData.implementation_type,
        description: formData.description,
        input_schema: inputSchema,
        output_schema: outputSchema,
        ui_widget_id: formData.ui_widget_id,
        ui_definitions: {},
        version: formData.version,
        tags,
        timeout_seconds: formData.timeout_seconds,
        retry_count: formData.retry_count,
        is_active: formData.is_active,
      };

      // Submit to API
      const response = await fetch('/api/function-registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create function from template');
      }

      // Success!
      onCreated();
    } catch (err: any) {
      console.error('Error creating function from template:', err);
      setSubmitError(err.message || 'Failed to create function from template');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={onBack}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Templates
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
              disabled={submitting}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex items-start gap-4">
            <div className="text-3xl">{template.icon}</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Customize Template</h2>
              <p className="text-sm text-gray-600 mt-1">
                {template.name} - Modify the template to fit your needs
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {submitError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{submitError}</p>
            </div>
          )}

          {/* Function Code */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Function Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.function_code}
              onChange={(e) => setFormData({ ...formData, function_code: e.target.value })}
              placeholder="e.g., approve_tender"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Unique identifier for this function (you can customize this)
            </p>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Implementation Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Implementation Type
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.implementation_type}
                onChange={(e) =>
                  setFormData({ ...formData, implementation_type: e.target.value as ImplementationType })
                }
              >
                <option value="USER_TASK">User Task</option>
                <option value="SERVICE_TASK">Service Task</option>
                <option value="AI_AGENT_TASK">AI Agent Task</option>
              </select>
            </div>

            {/* UI Widget */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UI Widget</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.ui_widget_id}
                onChange={(e) => setFormData({ ...formData, ui_widget_id: e.target.value })}
              >
                {WIDGET_CATALOG.map((widget) => (
                  <option key={widget.id} value={widget.id}>
                    {widget.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Input Schema */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Input Schema (JSON) <span className="text-red-500">*</span>
            </label>
            <textarea
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${
                errors.input_schema ? 'border-red-500' : 'border-gray-300'
              }`}
              rows={10}
              value={inputSchemaJson}
              onChange={(e) => setInputSchemaJson(e.target.value)}
              required
            />
            {errors.input_schema && (
              <p className="mt-1 text-sm text-red-600">{errors.input_schema}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              You can add, remove, or modify fields in the schema
            </p>
          </div>

          {/* Output Schema */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Output Schema (JSON) <span className="text-red-500">*</span>
            </label>
            <textarea
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${
                errors.output_schema ? 'border-red-500' : 'border-gray-300'
              }`}
              rows={10}
              value={outputSchemaJson}
              onChange={(e) => setOutputSchemaJson(e.target.value)}
              required
            />
            {errors.output_schema && (
              <p className="mt-1 text-sm text-red-600">{errors.output_schema}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Customize the output fields as needed
            </p>
          </div>

          {/* Tags */}
          <div className="mb-6">
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
          <div className="mb-6">
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
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
              disabled={submitting}
            >
              Back
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Creating Function...' : 'Create Function'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
