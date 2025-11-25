// Sprint 1d.5: Service Task Execution System
// Service Configuration Admin Page

'use client';

import { useState, useEffect } from 'react';
import {
  ServiceConfiguration,
  ServiceConfigurationListResponse,
  CreateServiceConfigurationInput,
  UpdateServiceConfigurationInput,
  ServiceType,
  HttpMethod,
} from '@/lib/types/service';
import { getMockServiceTemplateOptions } from '@/lib/templates/mock-service-templates';

export default function ServiceConfigurationPage() {
  const [services, setServices] = useState<ServiceConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceConfiguration | null>(null);
  const [filter, setFilter] = useState<{
    service_type?: ServiceType;
    is_active?: boolean;
  }>({});

  // Load services
  useEffect(() => {
    loadServices();
  }, [filter]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.service_type) params.set('service_type', filter.service_type);
      if (filter.is_active !== undefined) params.set('is_active', String(filter.is_active));

      const response = await fetch(`/api/services?${params}`);
      if (!response.ok) throw new Error('Failed to load services');

      const data: ServiceConfigurationListResponse = await response.json();
      setServices(data.services);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete service');
      }

      await loadServices();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete service');
    }
  };

  const handleTest = async (service: ServiceConfiguration) => {
    try {
      const response = await fetch(`/api/services/${service.service_config_id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input_data: {} }),
      });

      const result = await response.json();
      alert(
        result.status === 'success'
          ? `Test successful!\n\nExecution time: ${result.execution_time_ms}ms\n\nResponse: ${JSON.stringify(result.response, null, 2)}`
          : `Test failed: ${result.response?.error || 'Unknown error'}`
      );
    } catch (err) {
      alert('Test failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Service Configurations</h1>
        <p className="text-gray-600">
          Manage service configurations for workflow automation (REAL and MOCK services)
        </p>
      </div>

      {/* Filters and Actions */}
      <div className="mb-6 flex gap-4 items-center">
        <select
          value={filter.service_type || ''}
          onChange={(e) =>
            setFilter({ ...filter, service_type: e.target.value as ServiceType | undefined })
          }
          className="border rounded px-3 py-2"
        >
          <option value="">All Types</option>
          <option value="REAL">REAL</option>
          <option value="MOCK">MOCK</option>
        </select>

        <select
          value={filter.is_active === undefined ? '' : String(filter.is_active)}
          onChange={(e) =>
            setFilter({
              ...filter,
              is_active: e.target.value === '' ? undefined : e.target.value === 'true',
            })
          }
          className="border rounded px-3 py-2"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>

        <button
          onClick={() => setShowCreateModal(true)}
          className="ml-auto bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create Service
        </button>
      </div>

      {/* Service List */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : error ? (
        <div className="text-red-600 py-8">Error: {error}</div>
      ) : services.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No services found. Create your first service configuration.
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Endpoint / Template
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {services.map((service) => (
                <tr key={service.service_config_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{service.service_name}</div>
                    {service.description && (
                      <div className="text-sm text-gray-500">{service.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        service.service_type === 'REAL'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {service.service_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {service.service_type === 'REAL'
                      ? service.endpoint_url
                      : service.mock_template_id || 'Custom'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        service.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {service.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleTest(service)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => {
                        setEditingService(service);
                        setShowEditModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(service.service_config_id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <ServiceFormModal
          service={editingService}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setEditingService(null);
          }}
          onSaved={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setEditingService(null);
            loadServices();
          }}
        />
      )}
    </div>
  );
}

// Service Form Modal Component
function ServiceFormModal({
  service,
  onClose,
  onSaved,
}: {
  service: ServiceConfiguration | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [formData, setFormData] = useState({
    service_name: service?.service_name || '',
    service_type: service?.service_type || ('MOCK' as ServiceType),
    description: service?.description || '',
    endpoint_url: service?.endpoint_url || '',
    http_method: service?.http_method || 'POST',
    timeout_seconds: service?.timeout_seconds || 30,
    max_retries: service?.max_retries || 3,
    mock_template_id: service?.mock_template_id || '',
    is_active: service?.is_active !== false,
    authentication: service?.authentication || undefined,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mockTemplates = getMockServiceTemplateOptions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = service
        ? `/api/services/${service.service_config_id}`
        : '/api/services';

      const payload: CreateServiceConfigurationInput | UpdateServiceConfigurationInput = {
        service_name: formData.service_name,
        service_type: formData.service_type,
        description: formData.description,
        endpoint_url: formData.service_type === 'REAL' ? formData.endpoint_url : undefined,
        http_method: formData.service_type === 'REAL' ? formData.http_method : undefined,
        timeout_seconds: formData.timeout_seconds,
        max_retries: formData.max_retries,
        mock_template_id: formData.service_type === 'MOCK' ? formData.mock_template_id : undefined,
        is_active: formData.is_active,
        authentication: formData.service_type === 'REAL' && formData.authentication
          ? formData.authentication
          : undefined,
      };

      const response = await fetch(url, {
        method: service ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save service');
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {service ? 'Edit Service' : 'Create Service'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Service Name *</label>
              <input
                type="text"
                value={formData.service_name}
                onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            {!service && (
              <div>
                <label className="block text-sm font-medium mb-1">Service Type *</label>
                <select
                  value={formData.service_type}
                  onChange={(e) =>
                    setFormData({ ...formData, service_type: e.target.value as ServiceType })
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="MOCK">MOCK (Simulated)</option>
                  <option value="REAL">REAL (External API)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border rounded px-3 py-2"
                rows={2}
              />
            </div>

            {formData.service_type === 'REAL' ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Endpoint URL *</label>
                  <input
                    type="url"
                    value={formData.endpoint_url}
                    onChange={(e) => setFormData({ ...formData, endpoint_url: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                    placeholder="https://api.example.com/endpoint"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">HTTP Method</label>
                  <select
                    value={formData.http_method}
                    onChange={(e) => setFormData({ ...formData, http_method: e.target.value as HttpMethod })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Timeout (seconds)</label>
                    <input
                      type="number"
                      value={formData.timeout_seconds}
                      onChange={(e) =>
                        setFormData({ ...formData, timeout_seconds: parseInt(e.target.value) })
                      }
                      className="w-full border rounded px-3 py-2"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Retries</label>
                    <input
                      type="number"
                      value={formData.max_retries}
                      onChange={(e) =>
                        setFormData({ ...formData, max_retries: parseInt(e.target.value) })
                      }
                      className="w-full border rounded px-3 py-2"
                      min={0}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">Mock Template *</label>
                <select
                  value={formData.mock_template_id}
                  onChange={(e) => setFormData({ ...formData, mock_template_id: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Select a template...</option>
                  {mockTemplates.map((template) => (
                    <option key={template.value} value={template.value}>
                      {template.label} - {template.description}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>

            {/* Authentication Section */}
            {formData.service_type === 'REAL' && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4">Authentication</h3>

                <label className="block mb-4">
                  <span className="text-sm font-medium text-gray-700 mb-2 block">
                    Authentication Type (Optional)
                  </span>
                  <select
                    value={formData.authentication?.type || 'none'}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'none') {
                        setFormData({
                          ...formData,
                          authentication: undefined
                        });
                      } else {
                        setFormData({
                          ...formData,
                          authentication: {
                            ...formData.authentication,
                            type: value as 'api_key' | 'bearer' | 'custom_header' | 'basic_auth'
                          }
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="none">None</option>
                    <option value="api_key">API Key</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic_auth">Basic Auth</option>
                    <option value="custom_header">Custom Header</option>
                  </select>
                </label>

                {/* API Key Fields */}
                {formData.authentication?.type === 'api_key' && (
                  <div className="space-y-4 mb-4 p-4 bg-blue-50 rounded">
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 mb-2 block">API Key</span>
                      <input
                        type="password"
                        placeholder="Enter your API key"
                        value={(formData.authentication as any)?.api_key || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          authentication: {
                            ...formData.authentication,
                            api_key: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 mb-2 block">
                        Header Name (default: X-API-Key)
                      </span>
                      <input
                        type="text"
                        placeholder="X-API-Key"
                        value={(formData.authentication as any)?.header_name || 'X-API-Key'}
                        onChange={(e) => setFormData({
                          ...formData,
                          authentication: {
                            ...formData.authentication,
                            header_name: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </label>
                  </div>
                )}

                {/* Bearer Token Fields */}
                {formData.authentication?.type === 'bearer' && (
                  <div className="space-y-4 mb-4 p-4 bg-blue-50 rounded">
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 mb-2 block">Bearer Token</span>
                      <input
                        type="password"
                        placeholder="Enter your bearer token"
                        value={(formData.authentication as any)?.bearer_token || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          authentication: {
                            ...formData.authentication,
                            bearer_token: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </label>
                  </div>
                )}

                {/* Basic Auth Fields */}
                {formData.authentication?.type === 'basic_auth' && (
                  <div className="space-y-4 mb-4 p-4 bg-blue-50 rounded">
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 mb-2 block">Username</span>
                      <input
                        type="text"
                        placeholder="Username"
                        value={(formData.authentication as any)?.username || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          authentication: {
                            ...formData.authentication,
                            username: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 mb-2 block">Password</span>
                      <input
                        type="password"
                        placeholder="Password"
                        value={(formData.authentication as any)?.password || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          authentication: {
                            ...formData.authentication,
                            password: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </label>
                  </div>
                )}

                {/* Custom Header Fields */}
                {formData.authentication?.type === 'custom_header' && (
                  <div className="space-y-4 mb-4 p-4 bg-blue-50 rounded">
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 mb-2 block">Header Name</span>
                      <input
                        type="text"
                        placeholder="e.g., Authorization, X-Custom-Auth"
                        value={(formData.authentication as any)?.header_name || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          authentication: {
                            ...formData.authentication,
                            header_name: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 mb-2 block">Header Value</span>
                      <input
                        type="password"
                        placeholder="Header value"
                        value={(formData.authentication as any)?.header_value || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          authentication: {
                            ...formData.authentication,
                            header_value: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                disabled={saving}
              >
                {saving ? 'Saving...' : service ? 'Save Changes' : 'Create Service'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
