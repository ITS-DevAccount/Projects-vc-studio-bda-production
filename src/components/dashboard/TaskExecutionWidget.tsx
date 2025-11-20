/**
 * Sprint 1d.4 - Fix 3: User Task Execution Widget
 * Component for stakeholder users to view and execute their assigned tasks
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';
import type { TaskWithFunction } from '@/lib/types/task';
import dynamic from 'next/dynamic';

// Dynamically import TaskFormModal to prevent SSR issues and improve isolation
const TaskFormModal = dynamic(() => import('./TaskFormModal'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white p-6 rounded-lg">Loading...</div></div>
});

export function TaskExecutionWidget() {
  const [tasks, setTasks] = useState<TaskWithFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskWithFunction | null>(null);

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

  // Open task modal
  const handleOpenTask = useCallback((task: TaskWithFunction) => {
    console.log('[TaskWidget] Opening task:', task.id);
    setSelectedTask(task);
  }, []);

  // Close task modal
  const handleCloseModal = useCallback(() => {
    console.log('[TaskWidget] Closing task modal');
    setSelectedTask(null);
  }, []);

  // Handle task completion success
  const handleTaskSuccess = useCallback(() => {
    console.log('[TaskWidget] Task completed successfully, refreshing tasks');
    fetchTasks();
  }, [fetchTasks]);

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

      {/* Task Execution Modal - Separate component to prevent freezing */}
      {selectedTask && (
        <TaskFormModal
          task={selectedTask}
          onClose={handleCloseModal}
          onSuccess={handleTaskSuccess}
        />
      )}
    </>
  );
}
