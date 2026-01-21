'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, Save, X, Loader, TestTube, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminMenu from '@/components/admin/AdminMenu';

type LLMProvider = 'anthropic' | 'openai' | 'deepseek' | 'gemini';

interface LLMInterface {
  id: string;
  app_uuid: string;
  provider: LLMProvider;
  name: string;
  base_url?: string;
  default_model: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export default function LLMInterfacesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [interfaces, setInterfaces] = useState<LLMInterface[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    provider: 'anthropic' as LLMProvider,
    name: '',
    api_key: '',
    base_url: '',
    default_model: '',
    is_active: true,
    is_default: false,
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
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch('/api/llm-interfaces', {
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to load LLM interfaces');
      }
      const data = await res.json();
      setInterfaces(data.interfaces || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (interfaceItem: LLMInterface) => {
    setEditingId(interfaceItem.id);
    setFormData({
      provider: interfaceItem.provider,
      name: interfaceItem.name,
      api_key: '', // Don't show existing API key for security
      base_url: interfaceItem.base_url || '',
      default_model: interfaceItem.default_model || '',
      is_active: interfaceItem.is_active,
      is_default: interfaceItem.is_default,
    });
    setShowCreateForm(false);
    setError('');
    setSuccess('');
  };

  const handleCreate = () => {
    setShowCreateForm(true);
    setEditingId(null);
    setFormData({
      provider: 'anthropic',
      name: '',
      api_key: '',
      base_url: '',
      default_model: '',
      is_active: true,
      is_default: false,
    });
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingId(null);
    setFormData({
      provider: 'anthropic',
      name: '',
      api_key: '',
      base_url: '',
      default_model: '',
      is_active: true,
      is_default: false,
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const url = editingId ? `/api/llm-interfaces/${editingId}` : '/api/llm-interfaces';
      const method = editingId ? 'PATCH' : 'POST';

      const submitData: any = {
        provider: formData.provider,
        name: formData.name,
        base_url: formData.base_url || null,
        default_model: formData.default_model || null,
        is_active: formData.is_active,
        is_default: formData.is_default,
      };

      // Only include API key if provided (for updates, empty means don't change)
      if (formData.api_key) {
        submitData.api_key = formData.api_key;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify(submitData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save LLM interface');
      }

      setSuccess(editingId ? 'LLM interface updated successfully' : 'LLM interface created successfully');
      handleCancel();
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this LLM interface? This action cannot be undone.')) {
      return;
    }

    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch(`/api/llm-interfaces/${id}`, {
        method: 'DELETE',
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete LLM interface');
      }

      setSuccess('LLM interface deleted successfully');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch(`/api/llm-interfaces/${id}/test`, {
        method: 'POST',
        headers: {
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(`Connection test successful! Response: ${data.response}`);
      } else {
        setError(`Connection test failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setError(`Test failed: ${err.message}`);
    } finally {
      setTesting(null);
    }
  };

  // Get default models for each provider
  const getDefaultModel = (provider: LLMProvider): string => {
    const defaults: Record<LLMProvider, string> = {
      anthropic: 'claude-sonnet-4-5-20250929',
      openai: 'gpt-4',
      deepseek: 'deepseek-chat',
      gemini: 'gemini-pro'
    };
    return defaults[provider];
  };

  // Update default model when provider changes
  useEffect(() => {
    if (!formData.default_model || formData.default_model === '') {
      setFormData(prev => ({
        ...prev,
        default_model: getDefaultModel(formData.provider)
      }));
    }
  }, [formData.provider]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="flex">
        <AdminMenu />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">LLM Interfaces</h1>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 bg-accent-primary text-white px-4 py-2 rounded-lg hover:bg-accent-primary-hover transition"
              >
                <Plus className="w-5 h-5" />
                Add LLM Interface
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                {success}
              </div>
            )}

            {/* Create/Edit Form */}
            {(showCreateForm || editingId) && (
              <div className="mb-6 p-6 bg-white rounded-lg shadow border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">
                  {editingId ? 'Edit LLM Interface' : 'Create LLM Interface'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Provider *
                      </label>
                      <select
                        value={formData.provider}
                        onChange={(e) => setFormData({ ...formData, provider: e.target.value as LLMProvider })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                        required
                        disabled={!!editingId} // Can't change provider after creation
                      >
                        <option value="anthropic">Anthropic (Claude)</option>
                        <option value="openai">OpenAI</option>
                        <option value="deepseek">DeepSeek</option>
                        <option value="gemini">Google Gemini</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                        placeholder="e.g., Production Claude"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        API Key {editingId ? '(leave empty to keep current)' : '*'}
                      </label>
                      <input
                        type="password"
                        value={formData.api_key}
                        onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                        placeholder={editingId ? 'Enter new API key or leave empty' : 'Enter API key'}
                        required={!editingId}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Base URL (optional)
                      </label>
                      <input
                        type="text"
                        value={formData.base_url}
                        onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                        placeholder="e.g., https://api.deepseek.com/v1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Only needed for custom endpoints (e.g., DeepSeek)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Model
                      </label>
                      <input
                        type="text"
                        value={formData.default_model}
                        onChange={(e) => setFormData({ ...formData, default_model: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                        placeholder={getDefaultModel(formData.provider)}
                      />
                    </div>

                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="w-4 h-4 text-accent-primary rounded focus:ring-accent-primary"
                        />
                        <span className="text-sm font-medium text-gray-700">Active</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_default}
                          onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                          className="w-4 h-4 text-accent-primary rounded focus:ring-accent-primary"
                        />
                        <span className="text-sm font-medium text-gray-700">Default for Provider</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 bg-accent-primary text-white px-6 py-2 rounded-lg hover:bg-accent-primary-hover disabled:opacity-50 transition"
                    >
                      {saving ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex items-center gap-2 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Interfaces List */}
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Model
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {interfaces.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No LLM interfaces configured. Click "Add LLM Interface" to create one.
                      </td>
                    </tr>
                  ) : (
                    interfaces.map((interfaceItem) => (
                      <tr key={interfaceItem.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                            {interfaceItem.provider}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {interfaceItem.name}
                            {interfaceItem.is_default && (
                              <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                                Default
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {interfaceItem.default_model || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {interfaceItem.is_active ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm">Active</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-gray-400">
                              <XCircle className="w-4 h-4" />
                              <span className="text-sm">Inactive</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTest(interfaceItem.id)}
                              disabled={testing === interfaceItem.id || !interfaceItem.is_active}
                              className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Test connection"
                            >
                              {testing === interfaceItem.id ? (
                                <Loader className="w-4 h-4 animate-spin" />
                              ) : (
                                <TestTube className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleEdit(interfaceItem)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(interfaceItem.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}























