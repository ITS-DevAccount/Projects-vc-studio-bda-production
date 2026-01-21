'use client';

import { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface WorkspaceCreationWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (workspaceId: string) => void;
}

interface Stakeholder {
  id: string;
  name: string;
  reference: string;
  primary_role_id: string;
}

interface Role {
  id: string;
  code: string;
  label: string;
  workspace_template_id: string | null;
}

interface Template {
  id: string;
  template_code: string;
  template_name: string;
}

export function WorkspaceCreationWizard({
  open,
  onClose,
  onSuccess,
}: WorkspaceCreationWizardProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const [formData, setFormData] = useState({
    stakeholderId: '',
    name: '',
    roleId: '',
    templateId: '',
    description: '',
  });

  const [stakeholderSearch, setStakeholderSearch] = useState('');
  const [filteredStakeholders, setFilteredStakeholders] = useState<Stakeholder[]>([]);

  // Load stakeholders, roles, and templates
  useEffect(() => {
    if (open) {
      loadData();
      // Reset search
      setStakeholderSearch('');
    }
  }, [open]);

  // Filter stakeholders based on search
  useEffect(() => {
    if (stakeholderSearch.trim() === '') {
      setFilteredStakeholders(stakeholders);
    } else {
      const search = stakeholderSearch.toLowerCase();
      const filtered = stakeholders.filter(s =>
        s.name.toLowerCase().includes(search) ||
        s.reference.toLowerCase().includes(search)
      );

      // Always include the selected stakeholder if it's not already in filtered results
      if (formData.stakeholderId) {
        const selectedStakeholder = stakeholders.find(s => s.id === formData.stakeholderId);
        if (selectedStakeholder && !filtered.find(s => s.id === formData.stakeholderId)) {
          filtered.unshift(selectedStakeholder);
        }
      }

      setFilteredStakeholders(filtered);
    }
  }, [stakeholderSearch, stakeholders, formData.stakeholderId]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      // Fetch stakeholders
      const stakeholdersRes = await fetch('/api/stakeholders?pageSize=1000', {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });
      if (stakeholdersRes.ok) {
        const stakeholdersData = await stakeholdersRes.json();
        setStakeholders(stakeholdersData.data || []);
      }

      // Fetch roles
      const rolesRes = await fetch('/api/roles', {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData || []);
      }

      // Fetch templates
      const templatesRes = await fetch('/api/workspaces/templates', {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });
      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData.data || []);
      }
    } catch (err: any) {
      setError('Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };

  // Handle stakeholder selection
  const handleStakeholderChange = (stakeholderId: string) => {
    const stakeholder = stakeholders.find(s => s.id === stakeholderId);
    if (stakeholder) {
      const role = roles.find(r => r.id === stakeholder.primary_role_id);

      // Generate workspace name based on role
      let workspaceName = `${stakeholder.name}'s Workspace`;
      if (role) {
        // Customize based on role
        if (role.code === 'investor') {
          workspaceName = `${stakeholder.name}'s Investment Portfolio`;
        } else if (role.code === 'administrator') {
          workspaceName = `${stakeholder.name}'s Admin Workspace`;
        } else {
          workspaceName = `${stakeholder.name}'s ${role.label} Workspace`;
        }
      }

      setFormData({
        ...formData,
        stakeholderId,
        name: workspaceName,
        roleId: stakeholder.primary_role_id || '',
        templateId: role?.workspace_template_id || '',
      });
    }
  };

  // Handle role selection (cascades to template)
  const handleRoleChange = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    const stakeholder = stakeholders.find(s => s.id === formData.stakeholderId);

    // Update workspace name based on new role
    let workspaceName = formData.name;
    if (stakeholder && role) {
      if (role.code === 'investor') {
        workspaceName = `${stakeholder.name}'s Investment Portfolio`;
      } else if (role.code === 'administrator') {
        workspaceName = `${stakeholder.name}'s Admin Workspace`;
      } else {
        workspaceName = `${stakeholder.name}'s ${role.label} Workspace`;
      }
    }

    setFormData({
      ...formData,
      roleId,
      name: workspaceName,
      templateId: role?.workspace_template_id || '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const role = roles.find(r => r.id === formData.roleId);
      if (!role) {
        throw new Error('Invalid role selected');
      }

      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({
          name: formData.name,
          primary_role_code: role.code,
          template_id: formData.templateId || null,
          description: formData.description || null,
          owner_stakeholder_id: formData.stakeholderId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create workspace');
      }

      const data = await res.json();
      onSuccess(data.data.workspace_id);
      onClose();

      // Reset form
      setFormData({
        stakeholderId: '',
        name: '',
        roleId: '',
        templateId: '',
        description: '',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create Workspace</h2>
            <p className="text-sm text-gray-600 mt-1">
              Create a new workspace for a stakeholder
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 rounded-lg bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-6">
          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Stakeholder Selection with Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stakeholder <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={stakeholderSearch}
                    onChange={(e) => setStakeholderSearch(e.target.value)}
                    placeholder="Search by name or reference..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={formData.stakeholderId}
                    onChange={(e) => handleStakeholderChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select stakeholder...</option>
                    {filteredStakeholders.slice(0, 100).map(stakeholder => (
                      <option key={stakeholder.id} value={stakeholder.id}>
                        {stakeholder.name} ({stakeholder.reference})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">
                    Showing {Math.min(filteredStakeholders.length, 100)} of {filteredStakeholders.length} stakeholder(s)
                    {filteredStakeholders.length > 100 && ' - refine search to see more'}
                  </p>
                </div>
              </div>

              {/* Workspace Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workspace Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="My Workspace"
                  required
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.name.length}/100 characters
                </p>
              </div>

              {/* Role (Editable with cascading template) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.roleId}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={!formData.stakeholderId}
                >
                  <option value="">Select role...</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Auto-filled from stakeholder's primary role (can be changed)
                </p>
              </div>

              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template
                </label>
                <select
                  value={formData.templateId}
                  onChange={(e) =>
                    setFormData({ ...formData, templateId: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No template (blank workspace)</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.template_name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.templateId
                    ? `Auto-selected from ${roles.find(r => r.id === formData.roleId)?.label || 'selected'} role (can be changed)`
                    : 'Optional: Select a template to pre-configure this workspace'}
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Describe this workspace..."
                  maxLength={500}
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.stakeholderId || !formData.name || !formData.roleId}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Workspace'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
