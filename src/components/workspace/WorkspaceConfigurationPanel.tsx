'use client';

import { useEffect, useState } from 'react';
import { Settings, FileText, Workflow, Layout } from 'lucide-react';
import type { WorkspaceConfiguration } from '@/lib/types/workspace';

interface WorkspaceConfigurationPanelProps {
  workspaceId: string;
}

export function WorkspaceConfigurationPanel({ workspaceId }: WorkspaceConfigurationPanelProps) {
  const [configuration, setConfiguration] = useState<WorkspaceConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConfiguration();
  }, [workspaceId]);

  async function fetchConfiguration() {
    try {
      setLoading(true);
      const res = await fetch(`/api/workspaces/${workspaceId}/configurations`);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to fetch configuration');
      }

      setConfiguration(result.data);
    } catch (error: any) {
      console.error('Failed to fetch configuration:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Configuration</h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Workspace settings and configuration
        </p>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Dashboard Configuration */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Layout className="h-4 w-4 text-gray-600" />
            <h4 className="text-sm font-medium text-gray-900">Dashboard</h4>
          </div>
          {configuration?.dashboard_config ? (
            <div className="space-y-1 text-sm text-gray-600">
              <p>
                <strong>Config:</strong> {configuration.dashboard_config.config_name}
              </p>
              {configuration.dashboard_config.version && (
                <p>
                  <strong>Version:</strong> {configuration.dashboard_config.version}
                </p>
              )}
              {configuration.dashboard_config.dashboard_config?.menu_items && (
                <p>
                  <strong>Menu Items:</strong>{' '}
                  {configuration.dashboard_config.dashboard_config.menu_items.length}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No dashboard configuration</p>
          )}
        </div>

        {/* File Structure Template */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-gray-600" />
            <h4 className="text-sm font-medium text-gray-900">File Structure</h4>
          </div>
          {configuration?.file_structure_template ? (
            <div className="space-y-1 text-sm text-gray-600">
              <p>
                <strong>Template:</strong> {configuration.file_structure_template.template_name}
              </p>
              {configuration.file_structure_template.structure_definition?.root_folders && (
                <p>
                  <strong>Root Folders:</strong>{' '}
                  {configuration.file_structure_template.structure_definition.root_folders.length}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No file structure template</p>
          )}
        </div>

        {/* Business Services Configuration */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Workflow className="h-4 w-4 text-gray-600" />
            <h4 className="text-sm font-medium text-gray-900">Business Services</h4>
          </div>
          {configuration?.business_services_config ? (
            <div className="space-y-1 text-sm text-gray-600">
              <p>
                <strong>Config:</strong> {configuration.business_services_config.config_name}
              </p>
              {configuration.business_services_config.version && (
                <p>
                  <strong>Version:</strong> {configuration.business_services_config.version}
                </p>
              )}
              {configuration.business_services_config.services_config?.workflows && (
                <p>
                  <strong>Workflows:</strong>{' '}
                  {configuration.business_services_config.services_config.workflows.length}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No business services configuration</p>
          )}
        </div>

        {/* Applied Info */}
        {configuration && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Configuration applied on {new Date(configuration.applied_at).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
