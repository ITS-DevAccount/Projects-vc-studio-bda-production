/**
 * Sprint 1d.4 - Layer 2: Workflow Designer Page (Simplified Canvas)
 * Location: /dashboard/admin/workflow-designer
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import type { WorkflowTemplate, WorkflowNode, WorkflowTransition } from '@/lib/types/workflow';
import type { FunctionRegistryEntry } from '@/lib/types/function-registry';

export default function WorkflowDesignerPage() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [functions, setFunctions] = useState<FunctionRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'view' | null>(null);

  useEffect(() => {
    fetchTemplates();
    fetchFunctions();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/workflows/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFunctions = async () => {
    try {
      const response = await fetch('/api/function-registry');
      if (response.ok) {
        const data = await response.json();
        setFunctions(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching functions:', err);
    }
  };

  const handleEdit = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setViewMode('edit');
  };

  const handleView = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setViewMode('view');
  };

  const handleCloseView = () => {
    setSelectedTemplate(null);
    setViewMode(null);
  };

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin Dashboard
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Designer</h1>
          <p className="text-gray-600 mt-2">Create and manage workflow templates</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Workflow
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">Loading workflows...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">No workflow templates found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Create Your First Workflow
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{template.description || 'No description'}</p>

              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {template.workflow_type}
                </span>

                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {template.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleEdit(template)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleView(template)}
                  className="flex-1 px-3 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50 transition"
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Workflow Modal (Simplified) */}
      {showCreateModal && (
        <WorkflowCreateModal
          functions={functions}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchTemplates();
          }}
        />
      )}

      {/* View/Edit Workflow Modal */}
      {selectedTemplate && viewMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {viewMode === 'edit' ? 'Edit' : 'View'} Workflow
                </h2>
                <p className="text-sm text-gray-600 mt-1">{selectedTemplate.name}</p>
              </div>
              <button
                onClick={handleCloseView}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Workflow Definition</h3>
                <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-sm font-mono border border-gray-200">
                  {JSON.stringify(selectedTemplate.definition, null, 2)}
                </pre>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Metadata</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Template Code</p>
                    <p className="font-medium">{selectedTemplate.template_code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Workflow Type</p>
                    <p className="font-medium">{selectedTemplate.workflow_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Maturity Gate</p>
                    <p className="font-medium">{selectedTemplate.maturity_gate || 'None'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-medium">{selectedTemplate.is_active ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
              </div>

              {selectedTemplate.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-gray-700">{selectedTemplate.description}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  onClick={handleCloseView}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
                >
                  Close
                </button>
                {viewMode === 'view' && (
                  <button
                    onClick={() => setViewMode('edit')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                  >
                    Edit Workflow
                  </button>
                )}
                {viewMode === 'edit' && (
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                    onClick={() => alert('Edit functionality coming soon. Full visual editor planned for future sprint.')}
                  >
                    Save Changes
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Simplified Workflow Create Modal
 * Shows form to create basic workflow with sequential tasks
 */
function WorkflowCreateModal({
  functions,
  onClose,
  onCreated,
}: {
  functions: FunctionRegistryEntry[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    template_code: '',
    name: '',
    description: '',
    workflow_type: 'Custom',
    maturity_gate: '',
  });

  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Build workflow definition with nodes and transitions
      const nodes: WorkflowNode[] = [
        { id: 'start', type: 'START', label: 'Start', position: { x: 100, y: 100 } },
      ];

      const transitions: WorkflowTransition[] = [];

      // Add task nodes for each selected function
      selectedFunctions.forEach((functionCode, index) => {
        const nodeId = `task_${index + 1}`;
        nodes.push({
          id: nodeId,
          type: 'TASK',
          label: functionCode,
          function_code: functionCode,
          position: { x: 100 + (index + 1) * 200, y: 100 },
        });

        // Add transition from previous node
        const fromId = index === 0 ? 'start' : `task_${index}`;
        transitions.push({
          id: `trans_${index + 1}`,
          from_node_id: fromId,
          to_node_id: nodeId,
        });
      });

      // Add end node
      nodes.push({
        id: 'end',
        type: 'END',
        label: 'End',
        position: { x: 100 + (selectedFunctions.length + 1) * 200, y: 100 },
      });

      // Add final transition to end
      if (selectedFunctions.length > 0) {
        transitions.push({
          id: `trans_end`,
          from_node_id: `task_${selectedFunctions.length}`,
          to_node_id: 'end',
        });
      } else {
        transitions.push({
          id: 'trans_end',
          from_node_id: 'start',
          to_node_id: 'end',
        });
      }

      const definition = {
        nodes,
        transitions,
        metadata: {
          version: '1.0',
          created_at: new Date().toISOString(),
        },
      };

      const response = await fetch('/api/workflows/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          definition,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create workflow');
      }

      onCreated();
    } catch (err: any) {
      console.error('Error creating workflow:', err);
      setError(err.message || 'Failed to create workflow');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Create Workflow Template</h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.template_code}
              onChange={(e) => setFormData({ ...formData, template_code: e.target.value })}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Workflow Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Workflow Type</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.workflow_type}
                onChange={(e) => setFormData({ ...formData, workflow_type: e.target.value })}
              >
                <option value="Custom">Custom</option>
                <option value="FLM">FLM</option>
                <option value="AGM">AGM</option>
                <option value="Full">Full</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maturity Gate</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.maturity_gate}
                onChange={(e) => setFormData({ ...formData, maturity_gate: e.target.value })}
              >
                <option value="">None</option>
                <option value="FLM">FLM</option>
                <option value="AGM">AGM</option>
                <option value="Full">Full</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Sequence (select functions in order)
            </label>
            <div className="border border-gray-300 rounded-md p-4 max-h-60 overflow-y-auto">
              {functions.map((func) => (
                <label key={func.id} className="flex items-center gap-2 mb-2 hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={selectedFunctions.includes(func.function_code)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFunctions([...selectedFunctions, func.function_code]);
                      } else {
                        setSelectedFunctions(selectedFunctions.filter(f => f !== func.function_code));
                      }
                    }}
                  />
                  <span className="text-sm font-mono">{func.function_code}</span>
                  <span className="text-xs text-gray-500">({func.implementation_type})</span>
                </label>
              ))}
            </div>

            {selectedFunctions.length > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                Selected sequence: {selectedFunctions.join(' → ')}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
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
              {submitting ? 'Creating...' : 'Create Workflow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
