/**
 * Sprint 1d.4 Enhancement: Workflow Instance Creation Page
 * Location: /dashboard/admin/workflow-instances
 * Create executable workflow instances from templates with stakeholder assignments
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, PlayCircle, Users } from 'lucide-react';
import type { WorkflowTemplate } from '@/lib/types/workflow';
import type { TaskAssignments, CreateInstanceResponse } from '@/lib/types/workflow-instance';

interface Stakeholder {
  id: string;
  name: string;
  email: string;
  reference: string;
}

export default function WorkflowInstanceCreationPage() {
  // State
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [instanceName, setInstanceName] = useState<string>('');
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignments>({});
  const [initialContext, setInitialContext] = useState<string>('{}');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CreateInstanceResponse | null>(null);

  // Fetch templates and stakeholders on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch workflow templates
        const templatesResponse = await fetch('/api/workflows/templates');
        if (!templatesResponse.ok) throw new Error('Failed to fetch templates');
        const templatesData = await templatesResponse.json();
        setTemplates(templatesData.data || []);

        // Fetch stakeholders
        const stakeholdersResponse = await fetch('/api/stakeholders');
        if (!stakeholdersResponse.ok) throw new Error('Failed to fetch stakeholders');
        const stakeholdersData = await stakeholdersResponse.json();
        // Handle both response formats: direct array or object with data property
        const stakeholdersList = Array.isArray(stakeholdersData)
          ? stakeholdersData
          : (stakeholdersData.data || []);
        setStakeholders(stakeholdersList);

        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load data');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle template selection
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    setSelectedTemplate(template || null);
    setTaskAssignments({});
    setSuccess(null);
  };

  // Handle stakeholder assignment
  const handleAssignmentChange = (nodeId: string, stakeholderId: string) => {
    setTaskAssignments(prev => ({
      ...prev,
      [nodeId]: stakeholderId,
    }));
  };

  // Get task nodes from selected template
  const getTaskNodes = () => {
    if (!selectedTemplate?.definition?.nodes) return [];
    return selectedTemplate.definition.nodes.filter((node: any) => node.type === 'TASK');
  };

  // Validate all USER_TASK nodes have assignments
  const validateAssignments = (): string | null => {
    const taskNodes = getTaskNodes();
    for (const node of taskNodes) {
      if (!taskAssignments[node.id]) {
        return `Please assign a stakeholder to task: ${node.label || node.id}`;
      }
    }
    return null;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate
      const validationError = validateAssignments();
      if (validationError) {
        setError(validationError);
        setSubmitting(false);
        return;
      }

      // Parse initial context
      let parsedContext = {};
      if (initialContext.trim()) {
        try {
          parsedContext = JSON.parse(initialContext);
        } catch (err) {
          setError('Invalid JSON in initial context');
          setSubmitting(false);
          return;
        }
      }

      // Create instance
      const response = await fetch('/api/workflows/instances/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_template_id: selectedTemplateId,
          instance_name: instanceName.trim() || undefined,
          task_assignments: taskAssignments,
          initial_context: parsedContext,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create workflow instance');
      }

      const result: CreateInstanceResponse = await response.json();
      setSuccess(result);
    } catch (err: any) {
      console.error('Error creating workflow instance:', err);
      setError(err.message || 'Failed to create workflow instance');
    } finally {
      setSubmitting(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <PlayCircle className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Create Workflow Instance</h1>
        </div>
        <p className="text-gray-600">Loading templates and stakeholders...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/admin/workflow-designer"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workflow Designer
        </Link>

        <div className="flex items-center gap-3">
          <PlayCircle className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Create Workflow Instance</h1>
            <p className="text-gray-600 mt-1">
              Create an executable instance from a workflow template
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-1">Instance Created Successfully!</h3>
              <p className="text-green-800 mb-3">{success.message}</p>
              <div className="bg-white p-3 rounded border border-green-300 mb-3">
                <p className="text-sm text-gray-600">Instance ID:</p>
                <p className="font-mono text-sm">{success.instance_id}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSuccess(null);
                    setSelectedTemplateId('');
                    setSelectedTemplate(null);
                    setInstanceName('');
                    setTaskAssignments({});
                    setInitialContext('{}');
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Create Another Instance
                </button>
                <Link
                  href="/dashboard/tasks"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  View My Tasks
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Form */}
      {!success && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          {/* Step 1: Select Template */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Step 1: Select Workflow Template</h2>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Choose a template...</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.template_code})
                </option>
              ))}
            </select>

            {selectedTemplate && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-gray-700">
                  <strong>Type:</strong> {selectedTemplate.workflow_type}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  <strong>Description:</strong> {selectedTemplate.description || 'No description'}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  <strong>Tasks:</strong> {getTaskNodes().length} task(s)
                </p>
              </div>
            )}
          </div>

          {/* Step 2: Name This Instance */}
          {selectedTemplate && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Step 2: Name This Instance (Optional)</h2>
              <input
                type="text"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder={`e.g., "John Smith Onboarding", "ACME Corp Contract Review"`}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={200}
              />
              <p className="mt-2 text-sm text-gray-600">
                Give this instance a unique name to easily identify it later.
                If left blank, only the workflow template name will be shown.
              </p>
            </div>
          )}

          {/* Step 3: Assign Stakeholders */}
          {selectedTemplate && getTaskNodes().length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Step 3: Assign Stakeholders to Tasks
              </h2>

              <div className="space-y-4">
                {getTaskNodes().map((node: any) => (
                  <div key={node.id} className="border border-gray-300 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{node.label || node.id}</h3>
                        <p className="text-sm text-gray-600">
                          Function: {node.function_code}
                        </p>
                        <p className="text-sm text-gray-500">Type: USER_TASK</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assign to: <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={taskAssignments[node.id] || ''}
                        onChange={(e) => handleAssignmentChange(node.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select stakeholder...</option>
                        {stakeholders.map(stakeholder => (
                          <option key={stakeholder.id} value={stakeholder.id}>
                            {stakeholder.name} ({stakeholder.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Initial Context (Optional) */}
          {selectedTemplate && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Step 4: Initial Context (Optional)</h2>
              <p className="text-sm text-gray-600 mb-3">
                Provide initial data for the workflow as JSON (e.g., document names, IDs, etc.)
              </p>
              <textarea
                value={initialContext}
                onChange={(e) => setInitialContext(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={6}
                placeholder='{"documentName": "Q4 Budget Review", "priority": "high"}'
              />
            </div>
          )}

          {/* Submit Button */}
          {selectedTemplate && (
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting || !selectedTemplateId}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <PlayCircle className="w-5 h-5" />
                {submitting ? 'Creating Instance...' : 'Create Instance'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplateId('');
                  setSelectedTemplate(null);
                  setTaskAssignments({});
                  setInitialContext('{}');
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Clear
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
