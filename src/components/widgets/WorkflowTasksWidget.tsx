'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Task {
  id: string
  activity_name: string
  due_date: string
  workflow_instance_code: string
  activity_code: string
  owner: string
  status: string
}

interface WorkflowTasksWidgetProps {
  stakeholder: {
    id: string
  }
}

export function WorkflowTasksWidget({ stakeholder }: WorkflowTasksWidgetProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)

  const fetchTasks = async () => {
    try {
      setLoading(true)

      // Get the session token for authorization
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/workflows/active-tasks?stakeholder_id=${stakeholder.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }

      const result = await response.json()
      setTasks(result)
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [stakeholder.id])

  const handleCompleteTask = async (taskId: string) => {
    try {
      setCompleting(taskId)

      // Get the session token for authorization
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/workflows/activities/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ status: 'complete' }),
      })

      if (!response.ok) {
        throw new Error('Failed to complete task')
      }

      // Refresh tasks list
      await fetchTasks()
    } catch (err) {
      console.error('Error completing task:', err)
      alert('Failed to complete task. Please try again.')
    } finally {
      setCompleting(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Workflow Tasks</h3>
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Workflow Tasks</h3>
        <p className="text-red-500">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Workflow Tasks</h3>

      {tasks.length === 0 ? (
        <p className="text-gray-500 text-sm">No pending tasks</p>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex justify-between items-center border-b border-gray-100 pb-3 last:border-b-0"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900">{task.activity_name}</p>
                <p className="text-sm text-gray-500">
                  Due: {new Date(task.due_date).toLocaleDateString()}
                  {task.workflow_instance_code && (
                    <span className="ml-2 text-xs text-gray-400">
                      ({task.workflow_instance_code})
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => handleCompleteTask(task.id)}
                disabled={completing === task.id}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {completing === task.id ? 'Accepting...' : 'Accept'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
