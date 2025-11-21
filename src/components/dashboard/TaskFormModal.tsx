/**
 * Sprint 1d.4 - Task Form Modal Component
 * Separate component to prevent widget freezing issues
 */

'use client';

import React, { useState, useCallback, FormEvent } from 'react';
import { XCircle, CheckCircle, AlertCircle } from 'lucide-react';
import type { TaskWithFunction, CompleteTaskInput, CompleteTaskResponse } from '@/lib/types/task';
import { validateAgainstSchema } from '@/lib/validators/schema-validator';

interface TaskFormModalProps {
  task: TaskWithFunction;
  onClose: () => void;
  onSuccess: () => void;
}

const TaskFormModal = React.memo(({ task, onClose, onSuccess }: TaskFormModalProps) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Array<{ field: string; message: string }>>([]);

  // Handle form field change
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
    // Clear validation errors for this field
    setValidationErrors(prev => prev.filter(e => e.field !== fieldName));
  }, []);

  // Submit task
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setSubmitError(null);
    setValidationErrors([]);

    try {
      // Client-side validation against output schema
      const validationResult = validateAgainstSchema(formData, task.output_schema);

      if (!validationResult.valid) {
        setValidationErrors(validationResult.errors || []);
        setSubmitting(false);
        return;
      }

      // Submit to API
      const input: CompleteTaskInput = {
        output: formData,
      };

      const response = await fetch(`/api/tasks/${task.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const result: CompleteTaskResponse = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result.message || 
          (result.errors && result.errors.length > 0 
            ? result.errors.map(e => `${e.field}: ${e.message}`).join(', ')
            : 'Failed to complete task');
        throw new Error(errorMessage);
      }

      // Success
      setSubmitSuccess(true);

      // Trigger workflow queue processing to advance the workflow
      console.log('[TaskFormModal] Triggering workflow queue processing...');
      fetch('/api/workflows/process-queue', { method: 'POST' })
        .then(res => res.json())
        .then(data => console.log('[TaskFormModal] Queue processing result:', data))
        .catch(err => console.error('[TaskFormModal] Queue processing error:', err));

      // Notify parent and close after short delay
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('[TaskFormModal] Error completing task:', err);
      setSubmitError(err.message || 'Failed to complete task');
      setSubmitting(false);
    }
  };

  // Render field based on schema
  const renderField = (fieldName: string, fieldSchema: any) => {
    const fieldType = fieldSchema.type;
    const fieldValue = formData[fieldName] || '';
    const fieldError = validationErrors.find(e => e.field === fieldName);

    const baseInputClass = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      fieldError ? 'border-red-500' : 'border-gray-300'
    }`;

    switch (fieldType) {
      case 'string':
        if (fieldSchema.enum) {
          return (
            <select
              value={fieldValue}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              className={baseInputClass}
              required={fieldSchema.required}
            >
              <option value="">Select...</option>
              {fieldSchema.enum.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          );
        }
        if (fieldSchema.format === 'textarea' || fieldSchema.maxLength > 200) {
          return (
            <textarea
              value={fieldValue}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              className={baseInputClass}
              rows={4}
              required={fieldSchema.required}
              placeholder={fieldSchema.description || ''}
            />
          );
        }
        return (
          <input
            type="text"
            value={fieldValue}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            className={baseInputClass}
            required={fieldSchema.required}
            placeholder={fieldSchema.description || ''}
          />
        );

      case 'number':
      case 'integer':
        return (
          <input
            type="number"
            value={fieldValue}
            onChange={(e) => handleFieldChange(fieldName, parseFloat(e.target.value))}
            className={baseInputClass}
            required={fieldSchema.required}
            min={fieldSchema.minimum}
            max={fieldSchema.maximum}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={fieldValue || false}
              onChange={(e) => handleFieldChange(fieldName, e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="ml-2 text-sm text-gray-700">
              {fieldSchema.description || fieldName}
            </label>
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={fieldValue}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            className={baseInputClass}
            required={fieldSchema.required}
          />
        );

      default:
        return (
          <input
            type="text"
            value={fieldValue}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            className={baseInputClass}
            required={fieldSchema.required}
            placeholder={fieldSchema.description || ''}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {task.description || task.function_code}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Complete this task by filling out the form below
              </p>
            </div>
            {!submitting && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition"
                type="button"
              >
                <XCircle className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Success Message */}
          {submitSuccess && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-green-800 font-medium">Task completed successfully!</p>
                <p className="text-green-700 text-sm">Closing in a moment...</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {submitError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Error completing task</p>
                <p className="text-red-700 text-sm">{submitError}</p>
              </div>
            </div>
          )}

          {/* Task Info */}
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Function Code</p>
                <p className="font-medium">{task.function_code}</p>
              </div>
              <div>
                <p className="text-gray-600">Workflow</p>
                <p className="font-medium">{task.workflow_code}</p>
              </div>
              <div>
                <p className="text-gray-600">Task Type</p>
                <p className="font-medium">{task.task_type}</p>
              </div>
              <div>
                <p className="text-gray-600">Created</p>
                <p className="font-medium">{new Date(task.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Dynamic Form Fields based on output_schema */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-3">Task Output</h3>

            {task.output_schema?.properties ? (
              Object.entries(task.output_schema.properties).map(([fieldName, fieldSchema]: [string, any]) => (
                <div key={fieldName}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {fieldSchema.title || fieldName}
                    {task.output_schema.required?.includes(fieldName) && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  {fieldSchema.description && (
                    <p className="text-xs text-gray-500 mb-2">{fieldSchema.description}</p>
                  )}
                  {renderField(fieldName, fieldSchema)}
                  {validationErrors.find(e => e.field === fieldName) && (
                    <p className="text-xs text-red-600 mt-1">
                      {validationErrors.find(e => e.field === fieldName)?.message}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  No output schema defined for this task. Contact your administrator.
                </p>
              </div>
            )}
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm font-medium text-red-800 mb-1">Please fix the following errors:</p>
              <ul className="text-sm text-red-700 list-disc list-inside">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Form Actions */}
          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={submitting || submitSuccess || !task.output_schema?.properties}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition"
            >
              {submitting ? 'Submitting...' : submitSuccess ? 'Completed!' : 'Complete Task'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

TaskFormModal.displayName = 'TaskFormModal';

export default TaskFormModal;
