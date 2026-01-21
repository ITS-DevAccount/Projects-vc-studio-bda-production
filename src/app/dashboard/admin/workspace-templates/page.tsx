'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, Save, X, Loader, Folder, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminMenu from '@/components/admin/AdminMenu';

interface WorkspaceTemplate {
  id: string;
  template_code: string;
  template_name: string;
  description: string | null;
  applicable_roles: string[];
  category: string | null;
  icon_name: string | null;
  is_featured: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

interface Role {
  id: string;
  code: string;
  label: string;
}

export default function WorkspaceTemplatesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<WorkspaceTemplate[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    template_code: '',
    template_name: '',
    description: '',
    role_code: '',
    category: '',
    icon_name: 'folder',
    is_featured: false,
    dashboard_config: '{}',
    file_structure: '{}',
    business_services_config: '{}',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user) {
      loadData();
    }
  }, [user, authLoading]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      // Fetch templates
      const templatesRes = await fetch('/api/admin/workspace-templates', {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });
      if (!templatesRes.ok) throw new Error('Failed to load templates');
      const templatesData = await templatesRes.json();
      setTemplates(templatesData.data || []);

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = async (template: WorkspaceTemplate) => {
    setError('');
    setEditingId(template.id);

    // Fetch full template details before showing form
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch(`/api/admin/workspace-templates/${template.id}`, {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to load template');
      }

      const data = await res.json();
      const fullTemplate = data.data;

      console.log('Loaded template for editing:', fullTemplate);

      setFormData({
        template_code: fullTemplate.template_code,
        template_name: fullTemplate.template_name,
        description: fullTemplate.description || '',
        role_code: fullTemplate.applicable_roles?.[0] || '',
        category: fullTemplate.category || '',
        icon_name: fullTemplate.icon_name || 'folder',
        is_featured: fullTemplate.is_featured || false,
        dashboard_config: JSON.stringify(fullTemplate.dashboard_config?.dashboard_config || {}, null, 2),
        file_structure: JSON.stringify(fullTemplate.file_structure_template?.structure_definition || {}, null, 2),
        business_services_config: JSON.stringify(fullTemplate.business_services_config?.services_config || {}, null, 2),
      });

      // Show form after data is loaded
      setShowCreateForm(true);
    } catch (err: any) {
      console.error('Error loading template:', err);
      setError(`Failed to load template: ${err.message}`);
      setEditingId(null);
    }
  };

  const handleCreate = () => {
    setShowCreateForm(true);
    setEditingId(null);
    setFormData({
      template_code: '',
      template_name: '',
      description: '',
      role_code: '',
      category: '',
      icon_name: 'folder',
      is_featured: false,
      dashboard_config: JSON.stringify({
        menu_items: [],
        widgets: [],
        workspace_layout: {
          sidebar_width: '250px',
          theme: 'light'
        }
      }, null, 2),
      file_structure: JSON.stringify({
        name: 'Root',
        folders: []
      }, null, 2),
      business_services_config: JSON.stringify({
        workflows: [],
        notifications: {
          channels: ['email'],
          rules: []
        },
        automation_rules: []
      }, null, 2),
    });
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingId(null);
    setFormData({
      template_code: '',
      template_name: '',
      description: '',
      role_code: '',
      category: '',
      icon_name: 'folder',
      is_featured: false,
      dashboard_config: '{}',
      file_structure: '{}',
      business_services_config: '{}',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      // Validate JSON fields
      let dashboardConfig, fileStructure, businessServicesConfig;
      try {
        dashboardConfig = JSON.parse(formData.dashboard_config || '{}');
        fileStructure = JSON.parse(formData.file_structure || '{}');
        businessServicesConfig = JSON.parse(formData.business_services_config || '{}');
      } catch (err) {
        throw new Error('Invalid JSON in configuration fields');
      }

      const url = editingId
        ? `/api/admin/workspace-templates/${editingId}`
        : '/api/admin/workspace-templates';
      const method = editingId ? 'PATCH' : 'POST';

      // For edit, only send metadata (can't update configs)
      const payload = editingId ? {
        template_name: formData.template_name,
        description: formData.description || null,
        is_featured: formData.is_featured,
      } : {
        template_code: formData.template_code.toUpperCase().replace(/\s+/g, '_'),
        template_name: formData.template_name,
        description: formData.description || null,
        role_code: formData.role_code,
        category: formData.category || 'Custom',
        icon_name: formData.icon_name,
        is_featured: formData.is_featured,
        dashboard_config: dashboardConfig,
        file_structure: fileStructure,
        business_services_config: businessServicesConfig,
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      handleCancel();
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (template: WorkspaceTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.template_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch(`/api/admin/workspace-templates/${template.id}`, {
        method: 'DELETE',
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || 'Failed to delete');
      }

      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminMenu />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Workspace Templates</h1>
              <p className="text-brand-text-muted text-sm mt-1">
                Define workspace templates for different roles. These templates will be used when onboarding new users.
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 bg-accent-primary hover:bg-accent-primary-hover text-white px-4 py-2 rounded-lg transition"
            >
              <Plus className="w-5 h-5" />
              Create Template
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-semantic-error-bg border border-red-500 text-semantic-error rounded-lg p-4">
            {error}
          </div>
        )}

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="mb-6 bg-section-light border border-section-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? 'Edit Workspace Template' : 'Create Workspace Template'}
            </h2>
            {editingId && (
              <p className="text-sm text-brand-text-muted mb-4">
                Note: You can only edit template metadata. Configuration changes require creating a new template.
              </p>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-md font-semibold flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Basic Information
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Template Code * <span className="text-brand-text-muted font-normal">(e.g., VC_STUDIO_INVESTOR)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.template_code}
                      onChange={(e) => setFormData({ ...formData, template_code: e.target.value })}
                      className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                      placeholder="VC_STUDIO_INVESTOR"
                      required
                      disabled={!!editingId}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Template Name *</label>
                    <input
                      type="text"
                      value={formData.template_name}
                      onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                      className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                      placeholder="Investor Workspace"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                    rows={2}
                    placeholder="Describe this workspace template..."
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Role *</label>
                    <select
                      value={formData.role_code}
                      onChange={(e) => setFormData({ ...formData, role_code: e.target.value })}
                      className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                      required
                      disabled={!!editingId}
                    >
                      <option value="">Select role...</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.code}>
                          {role.label} ({role.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                      placeholder="Investment Management"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Icon Name</label>
                    <input
                      type="text"
                      value={formData.icon_name}
                      onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                      className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded"
                      placeholder="folder"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Featured Template</span>
                  </label>
                  <p className="text-xs text-brand-text-muted mt-1 ml-6">
                    Featured templates are highlighted during workspace creation
                  </p>
                </div>
              </div>

              {/* Configuration sections - Read-only in edit mode */}
              <>
                {/* Dashboard Configuration */}
                <div className="space-y-4">
                  <h3 className="text-md font-semibold flex items-center gap-2">
                    <Folder className="w-4 h-4" />
                    Dashboard Configuration (JSON)
                    {editingId && <span className="text-xs text-brand-text-muted font-normal">(Read-only)</span>}
                  </h3>
                  <textarea
                    value={formData.dashboard_config}
                    onChange={(e) => setFormData({ ...formData, dashboard_config: e.target.value })}
                    className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded font-mono text-sm"
                    rows={10}
                    placeholder='{"menu_items": [], "widgets": []}'
                    readOnly={!!editingId}
                    disabled={!!editingId}
                  />
                  <p className="text-xs text-brand-text-muted">
                    {editingId ? 'Configuration cannot be changed after creation' : 'Define dashboard layout, menu items, and widgets'}
                  </p>
                </div>

                {/* File Structure */}
                <div className="space-y-4">
                  <h3 className="text-md font-semibold flex items-center gap-2">
                    <Folder className="w-4 h-4" />
                    File Structure (JSON)
                    {editingId && <span className="text-xs text-brand-text-muted font-normal">(Read-only)</span>}
                  </h3>
                  <textarea
                    value={formData.file_structure}
                    onChange={(e) => setFormData({ ...formData, file_structure: e.target.value })}
                    className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded font-mono text-sm"
                    rows={10}
                    placeholder='{"name": "Root", "folders": []}'
                    readOnly={!!editingId}
                    disabled={!!editingId}
                  />
                  <p className="text-xs text-brand-text-muted">
                    {editingId ? 'Configuration cannot be changed after creation' : 'Define default folder hierarchy for this workspace'}
                  </p>
                </div>

                {/* Business Services */}
                <div className="space-y-4">
                  <h3 className="text-md font-semibold flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Business Services Configuration (JSON)
                    {editingId && <span className="text-xs text-brand-text-muted font-normal">(Read-only)</span>}
                  </h3>
                  <textarea
                    value={formData.business_services_config}
                    onChange={(e) => setFormData({ ...formData, business_services_config: e.target.value })}
                    className="w-full px-3 py-2 bg-section-subtle border border-section-border rounded font-mono text-sm"
                    rows={10}
                    placeholder='{"workflows": [], "notifications": {}}'
                    readOnly={!!editingId}
                    disabled={!!editingId}
                  />
                  <p className="text-xs text-brand-text-muted">
                    {editingId ? 'Configuration cannot be changed after creation' : 'Define workflows, notifications, and automation rules'}
                  </p>
                </div>
              </>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-accent-primary hover:bg-accent-primary-hover text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {editingId ? 'Update Template' : 'Create Template'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center gap-2 bg-section-subtle hover:bg-section-emphasis px-4 py-2 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Templates List */}
        <div className="bg-section-light border border-section-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-brand-text-muted">
              <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
              Loading...
            </div>
          ) : templates.length === 0 ? (
            <div className="p-8 text-center text-brand-text-muted">
              No templates found. Create one to get started.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-section-subtle">
                <tr>
                  <th className="text-left p-3 border-b border-section-border">Code</th>
                  <th className="text-left p-3 border-b border-section-border">Name</th>
                  <th className="text-left p-3 border-b border-section-border">Role</th>
                  <th className="text-left p-3 border-b border-section-border">Category</th>
                  <th className="text-left p-3 border-b border-section-border">Usage</th>
                  <th className="text-left p-3 border-b border-section-border">Featured</th>
                  <th className="text-left p-3 border-b border-section-border">Created</th>
                  <th className="text-left p-3 border-b border-section-border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-section-subtle/50">
                    <td className="p-3 border-b border-section-border">
                      <code className="text-xs bg-section-subtle px-2 py-1 rounded">{template.template_code}</code>
                    </td>
                    <td className="p-3 border-b border-section-border font-medium">{template.template_name}</td>
                    <td className="p-3 border-b border-section-border">
                      {template.applicable_roles?.map(role => (
                        <span key={role} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs mr-1">
                          {role}
                        </span>
                      ))}
                    </td>
                    <td className="p-3 border-b border-section-border text-brand-text-muted">
                      {template.category || '-'}
                    </td>
                    <td className="p-3 border-b border-section-border text-brand-text-muted">
                      {template.usage_count}
                    </td>
                    <td className="p-3 border-b border-section-border">
                      {template.is_featured && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                          Featured
                        </span>
                      )}
                    </td>
                    <td className="p-3 border-b border-section-border text-brand-text-muted text-xs">
                      {new Date(template.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 border-b border-section-border">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(template)}
                          className="p-2 bg-section-subtle hover:bg-section-emphasis rounded transition"
                          title="Edit template"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(template)}
                          className="p-2 bg-semantic-error-bg hover:bg-red-900/40 text-semantic-error rounded transition"
                          title="Delete template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
