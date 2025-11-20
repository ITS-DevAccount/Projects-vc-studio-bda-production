/**
 * Sprint 1d.4 - Layer 3: Task Handler Page
 * Location: /dashboard/tasks
 * Polls for pending tasks and renders dynamic forms
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import type { TaskWithFunction } from '@/lib/types/task';
import { PollingTaskUpdateStrategy } from '@/lib/types/task';

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskWithFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskWithFunction | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Fetch pending tasks
  const fetchTasks = useCallback(async () => {
    try {
      setError(null);

      const response = await fetch('/api/tasks/pending');

      if (!response.ok) {
        throw new Error('Failed to fetch pending tasks');
      }

      const data = await response.json();
      setTasks(data.tasks || []);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      setError(err.message || 'Failed to load tasks');
      setLoading(false);
    }
  }, []);

  // Set up polling with abstraction layer
  useEffect(() => {
    const pollingStrategy = new PollingTaskUpdateStrategy(fetchTasks, 10000); // 10 seconds

    pollingStrategy.onUpdate((updatedTasks) => {
      setTasks(updatedTasks);
    });

    pollingStrategy.start();

    return () => {
      pollingStrategy.stop();
    };
  }, [fetchTasks]);

  const handleOpenTask = (task: TaskWithFunction) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleTaskCompleted = () => {
    setShowTaskModal(false);
    setSelectedTask(null);
    fetchTasks(); // Refresh list
  };

  return (
    <div className="p-6">
      {/* Back Navigation */}
      <div className="mb-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-gray-600 mt-2">Pending workflow tasks assigned to you</p>
        </div>

        <button
          onClick={fetchTasks}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition inline-flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Task List */}
      {loading && tasks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">Loading your tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No pending tasks!</p>
          <p className="text-gray-500 text-sm mt-2">You're all caught up.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
              onClick={() => handleOpenTask(task)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{task.function_code}</h3>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  )}
                </div>
                <Clock className="w-5 h-5 text-blue-500 flex-shrink-0 ml-2" />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  task.task_type === 'USER_TASK' ? 'bg-blue-100 text-blue-800' :
                  task.task_type === 'SERVICE_TASK' ? 'bg-green-100 text-green-800' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  {task.task_type.replace('_', ' ')}
                </span>

                <span className="text-gray-500">
                  {new Date(task.created_at).toLocaleDateString()}
                </span>
              </div>

              <button
                className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenTask(task);
                }}
              >
                Open Task
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Task Execution Modal */}
      {showTaskModal && selectedTask && (
        <TaskExecutionModal
          task={selectedTask}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
          onCompleted={handleTaskCompleted}
        />
      )}
    </div>
  );
}

/**
 * Task Execution Modal Component
 * Renders dynamic form based on input_schema
 */
function TaskExecutionModal({
  task,
  onClose,
  onCompleted,
}: {
  task: TaskWithFunction;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/tasks/${task.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ output: formData }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors) {
          // Set field-specific errors
          const fieldErrors: Record<string, string> = {};
          result.errors.forEach((err: any) => {
            fieldErrors[err.field] = err.message;
          });
          setErrors(fieldErrors);
        }
        throw new Error(result.error || 'Failed to complete task');
      }

      // Success!
      onCompleted();
    } catch (err: any) {
      console.error('Error completing task:', err);
      setSubmitError(err.message || 'Failed to complete task');
    } finally {
      setSubmitting(false);
    }
  };

  const inputSchema = task.input_schema;
  const required = inputSchema.required || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-2">{task.function_code}</h2>
        {task.description && (
          <p className="text-gray-600 mb-6">{task.description}</p>
        )}

        {submitError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{submitError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Render form fields from input_schema */}
          {Object.entries(inputSchema.properties).map(([fieldName, fieldSchema]) => {
            const isRequired = required.includes(fieldName);
            const error = errors[fieldName];

            return (
              <div key={fieldName} className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {fieldSchema.description || fieldName}
                  {isRequired && <span className="text-red-500 ml-1">*</span>}
                </label>

                {/* Render appropriate input based on field type */}
                {fieldSchema.type === 'string' && !fieldSchema.enum && (
                  <input
                    type={fieldSchema.format === 'email' ? 'email' : fieldSchema.format === 'date' ? 'date' : 'text'}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      error ? 'border-red-500' : 'border-gray-300'
                    }`}
                    value={formData[fieldName] || ''}
                    onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                    required={isRequired}
                  />
                )}

                {fieldSchema.type === 'string' && fieldSchema.enum && (
                  <select
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      error ? 'border-red-500' : 'border-gray-300'
                    }`}
                    value={formData[fieldName] || ''}
                    onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                    required={isRequired}
                  >
                    <option value="">Select...</option>
                    {fieldSchema.enum.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {(fieldSchema.type === 'number' || fieldSchema.type === 'integer') && (
                  <input
                    type="number"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      error ? 'border-red-500' : 'border-gray-300'
                    }`}
                    value={formData[fieldName] || ''}
                    onChange={(e) => handleFieldChange(fieldName, parseFloat(e.target.value) || '')}
                    min={fieldSchema.minimum}
                    max={fieldSchema.maximum}
                    step={fieldSchema.type === 'integer' ? 1 : 'any'}
                    required={isRequired}
                  />
                )}

                {fieldSchema.type === 'boolean' && (
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    checked={formData[fieldName] || false}
                    onChange={(e) => handleFieldChange(fieldName, e.target.checked)}
                  />
                )}

                {error && (
                  <p className="mt-1 text-sm text-red-600">{error}</p>
                )}
              </div>
            );
          })}

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Complete Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
