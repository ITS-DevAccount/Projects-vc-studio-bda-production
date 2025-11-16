'use client';

import { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronUp, Edit2, Trash2, X, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface WorkflowTemplate {
  id: string;
  template_code: string;
  workflow_type: string;
  name: string;
  description: string | null;
  maturity_gate: string;
  is_active: boolean;
  activity_count: number;
  created_at: string;
  updated_at: string;
}

interface Activity {
  activity_code: string;
  activity_name: string;
  owner: string;
  estimated_days: number | null;
  prerequisite_activity_codes: string[];
}

export default function WorkflowDesigner() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    template_code: '',
    workflow_type: '',
    name: '',
    description: '',
    maturity_gate: 'FLM',
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentActivity, setCurrentActivity] = useState<Activity>({
    activity_code: '',
    activity_name: '',
    owner: 'admin',
    estimated_days: null,
    prerequisite_activity_codes: [],
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch('/api/workflows/templates', {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load templates');
      }

      const data = await res.json();
      setTemplates(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      template_code: '',
      workflow_type: '',
      name: '',
      description: '',
      maturity_gate: 'FLM',
    });
    setActivities([]);
    setCurrentActivity({
      activity_code: '',
      activity_name: '',
      owner: 'admin',
      estimated_days: null,
      prerequisite_activity_codes: [],
    });
    setShowForm(false);
  }

  function addActivity() {
    if (!currentActivity.activity_code || !currentActivity.activity_name) {
      setError('Activity code and name are required');
      return;
    }

    setActivities([...activities, currentActivity]);
    setCurrentActivity({
      activity_code: '',
      activity_name: '',
      owner: 'admin',
      estimated_days: null,
      prerequisite_activity_codes: [],
    });
    setError('');
  }

  function removeActivity(index: number) {
    setActivities(activities.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.template_code || !formData.workflow_type || !formData.name) {
      setError('Template code, workflow type, and name are required');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch('/api/workflows/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({
          ...formData,
          activities,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create template');
      }

      setSuccess('Template created successfully!');
      resetForm();
      loadTemplates();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function toggleActive(template: WorkflowTemplate) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch(`/api/workflows/templates/${template.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({
          is_active: !template.is_active,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update template');
      }

      loadTemplates();
      setSuccess(`Template ${template.is_active ? 'deactivated' : 'activated'} successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function deleteTemplate(template: WorkflowTemplate) {
    if (!confirm(`Are you sure you want to delete the template "${template.name}"? This will also delete all associated activities.`)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch(`/api/workflows/templates/${template.id}`, {
        method: 'DELETE',
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete template');
      }

      loadTemplates();
      setSuccess('Template deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Designer</h1>
          <p className="text-sm text-gray-600 mt-1">
            Create and manage workflow templates
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'New Template'}
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Workflow Template</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Template Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Code *
                </label>
                <input
                  type="text"
                  value={formData.template_code}
                  onChange={(e) => setFormData({ ...formData, template_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., WF_ONBOARDING"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workflow Type *
                </label>
                <input
                  type="text"
                  value={formData.workflow_type}
                  onChange={(e) => setFormData({ ...formData, workflow_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., onboarding"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Client Onboarding"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maturity Gate
                </label>
                <select
                  value={formData.maturity_gate}
                  onChange={(e) => setFormData({ ...formData, maturity_gate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="FLM">FLM</option>
                  <option value="AGM">AGM</option>
                  <option value="Full">Full</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Optional description"
              />
            </div>

            {/* Activities Section */}
            <div className="border-t pt-4">
              <h3 className="text-md font-semibold text-gray-900 mb-3">Activities</h3>

              {/* Current Activities List */}
              {activities.length > 0 && (
                <div className="mb-4 space-y-2">
                  {activities.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{activity.activity_name}</div>
                        <div className="text-xs text-gray-600">
                          Code: {activity.activity_code} | Owner: {activity.owner}
                          {activity.estimated_days && ` | ${activity.estimated_days} days`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeActivity(index)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Activity Form */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <input
                    type="text"
                    value={currentActivity.activity_code}
                    onChange={(e) => setCurrentActivity({ ...currentActivity, activity_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Activity Code"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={currentActivity.activity_name}
                    onChange={(e) => setCurrentActivity({ ...currentActivity, activity_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Activity Name"
                  />
                </div>
                <div>
                  <select
                    value={currentActivity.owner}
                    onChange={(e) => setCurrentActivity({ ...currentActivity, owner: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="admin">Admin</option>
                    <option value="client">Client</option>
                    <option value="ai_agent">AI Agent</option>
                  </select>
                </div>
                <div>
                  <input
                    type="number"
                    value={currentActivity.estimated_days || ''}
                    onChange={(e) => setCurrentActivity({ ...currentActivity, estimated_days: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Estimated Days (optional)"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={addActivity}
                className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                + Add Activity
              </button>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Create Template
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Templates List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No templates found. Create your first workflow template!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activities
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.map((template) => (
                  <>
                    <tr key={template.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpandedTemplateId(expandedTemplateId === template.id ? null : template.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {expandedTemplateId === template.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            {template.template_code}
                          </code>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{template.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">{template.workflow_type}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {template.activity_count}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          template.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleActive(template)}
                            className="text-gray-400 hover:text-blue-600 p-1"
                            title={template.is_active ? 'Deactivate' : 'Activate'}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTemplate(template)}
                            className="text-gray-400 hover:text-red-600 p-1"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedTemplateId === template.id && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-2">
                            {template.description && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">Description: </span>
                                <span className="text-sm text-gray-600">{template.description}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-sm font-medium text-gray-700">Maturity Gate: </span>
                              <span className="text-sm text-gray-600">{template.maturity_gate}</span>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-700">Created: </span>
                              <span className="text-sm text-gray-600">
                                {new Date(template.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
