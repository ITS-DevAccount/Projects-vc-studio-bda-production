/**
 * Sprint 1d.4 - Fix 3: User Task Execution Widget
 * Component for stakeholder users to view and execute their assigned tasks
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Clock, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import type { TaskWithFunction, CompleteTaskInput, CompleteTaskResponse } from '@/lib/types/task';
import { validateAgainstSchema } from '@/lib/validators/schema-validator';

export function TaskExecutionWidget() {
  const [tasks, setTasks] = useState<TaskWithFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskWithFunction | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Array<{ field: string; message: string }>>([]);

  // Fetch pending tasks
  const fetchTasks = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/tasks/pending');

      if (!response.ok) {
        if (response.status === 404) {
          // User is not a stakeholder, just show empty state
          setTasks([]);
          return;
        }
        throw new Error('Failed to fetch tasks');
      }

      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and polling setup
  useEffect(() => {
    fetchTasks();

    // Set up polling every 10 seconds
    const intervalId = setInterval(fetchTasks, 10000);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [fetchTasks]);

  // Open task modal - memoized to prevent recreating on each render
  const handleOpenTask = useCallback((task: TaskWithFunction) => {
    console.log('[TaskWidget] Opening task:', task.id);
    setSelectedTask(task);
    setFormData({});
    setSubmitError(null);
    setSubmitSuccess(false);
    setValidationErrors([]);
  }, []);

  // Close task modal - memoized and with cleanup delay
  const handleCloseModal = useCallback(() => {
    if (!submitting) {
      console.log('[TaskWidget] Closing task modal');
      setSelectedTask(null);
      // Clear state with slight delay to allow modal animation
      setTimeout(() => {
        setFormData({});
        setSubmitError(null);
        setSubmitSuccess(false);
        setValidationErrors([]);
      }, 200);
    }
  }, [submitting]);

  // Handle form field change - memoized to prevent recreating on each render
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
    // Clear validation errors for this field
    setValidationErrors(prev => prev.filter(e => e.field !== fieldName));
  }, []);

  // Submit task
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTask) return;

    setSubmitting(true);
    setSubmitError(null);
    setValidationErrors([]);

    try {
      // Client-side validation against output schema
      const validationResult = validateAgainstSchema(formData, selectedTask.output_schema);

      if (!validationResult.valid) {
        setValidationErrors(validationResult.errors || []);
        setSubmitting(false);
        return;
      }

      // Submit to API
      const input: CompleteTaskInput = {
        output: formData,
      };

      const response = await fetch(`/api/tasks/${selectedTask.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const result: CompleteTaskResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to complete task');
      }

      // Success
      setSubmitSuccess(true);

      // Trigger workflow queue processing to advance the workflow
      console.log('[TaskWidget] Triggering workflow queue processing...');
      fetch('/api/workflows/process-queue', { method: 'POST' })
        .then(res => res.json())
        .then(data => console.log('[TaskWidget] Queue processing result:', data))
        .catch(err => console.error('[TaskWidget] Queue processing error:', err));

      // Refresh tasks after short delay
      setTimeout(() => {
        fetchTasks();
        handleCloseModal();
      }, 1500);
    } catch (err: any) {
      console.error('Error completing task:', err);
      setSubmitError(err.message || 'Failed to complete task');
      setSubmitting(false);
    }
  };

  // Render field based on schema - memoized to prevent recreating on each render
  const renderField = useCallback((fieldName: string, fieldSchema: any) => {
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
  }, [formData, validationErrors, handleFieldChange]);

  // Render loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">My Pending Tasks</h2>
        </div>
        <p className="text-gray-600">Loading tasks...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">My Pending Tasks</h2>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Error loading tasks</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Task List Widget */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">My Pending Tasks</h2>
            {tasks.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                {tasks.length}
              </span>
            )}
          </div>
          <button
            onClick={fetchTasks}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition"
            title="Refresh tasks"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600">No pending tasks</p>
            <p className="text-sm text-gray-500 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {task.description || task.function_code}
                      </h3>
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                        PENDING
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Function:</span> {task.function_code}
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Workflow:</span> {task.workflow_code}
                    </p>
                    <p className="text-xs text-gray-500">
                      Created: {new Date(task.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenTask(task)}
                    className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition whitespace-nowrap"
                  >
                    Open Task
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task Execution Modal - key forces remount on task change */}
      {selectedTask && (
        <div key={selectedTask.id} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedTask.description || selectedTask.function_code}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Complete this task by filling out the form below
                  </p>
                </div>
                {!submitting && (
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-600 transition"
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
                    <p className="font-medium">{selectedTask.function_code}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Workflow</p>
                    <p className="font-medium">{selectedTask.workflow_code}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Task Type</p>
                    <p className="font-medium">{selectedTask.task_type}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Created</p>
                    <p className="font-medium">{new Date(selectedTask.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Dynamic Form Fields based on output_schema */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 mb-3">Task Output</h3>

                {selectedTask.output_schema?.properties ? (
                  Object.entries(selectedTask.output_schema.properties).map(([fieldName, fieldSchema]: [string, any]) => (
                    <div key={fieldName}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {fieldSchema.title || fieldName}
                        {selectedTask.output_schema.required?.includes(fieldName) && (
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
                  disabled={submitting || submitSuccess || !selectedTask.output_schema?.properties}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition"
                >
                  {submitting ? 'Submitting...' : submitSuccess ? 'Completed!' : 'Complete Task'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="px-4 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
