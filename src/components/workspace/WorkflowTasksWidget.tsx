'use client';

// Workflow Tasks Widget (Placeholder)
// Phase 1c: Component Registry & File System
// TODO: Implement in Phase 1d when workflows are added

export default function WorkflowTasksWidget() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">My Tasks</h2>

      <div className="text-center py-12">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Workflow Tasks</h3>
        <p className="text-gray-500 mb-4">
          This component will display your workflow tasks and activities
        </p>
        <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm">
          Coming in Phase 1d: Workflow Orchestration
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-2">Planned Features:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• View active workflow tasks</li>
          <li>• Filter by due date and priority</li>
          <li>• Mark tasks as complete</li>
          <li>• Real-time updates via WebSocket</li>
          <li>• Group tasks by workflow instance</li>
        </ul>
      </div>
    </div>
  );
}
