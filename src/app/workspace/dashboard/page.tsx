'use client';

// Dashboard Page with Dynamic Component Loading
// Phase 1c: Component Registry & File System
// Location: /workspace/dashboard

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getComponentMetadata, resolveComponent } from '@/lib/componentRegistry';
import { DashboardStatusProvider } from '@/contexts/DashboardStatusContext';
import { DashboardNavMenu } from '@/components/dashboard/DashboardNavMenu';
import type { RegistryEntry } from '@/lib/types/registry';

interface MenuItem {
  label: string;
  component_id: string;
  position: number;
  is_default?: boolean;
}

interface DashboardConfig {
  menu_items: MenuItem[];
  dashboard_name: string;
  workspace_layout: {
    sidebar_width?: string;
    theme?: string;
    show_notifications?: boolean;
    default_component?: string;
  };
  widgets: any[];
  role: string;
  stakeholder_id: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [activeComponent, setActiveComponent] = useState<string>('file_explorer');
  const [componentMetadata, setComponentMetadata] = useState<RegistryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardConfig();
  }, []);

  const fetchDashboardConfig = async () => {
    try {
      const response = await fetch('/api/dashboard/menu-items');

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to load dashboard configuration');
      }

      const data: DashboardConfig = await response.json();
      setConfig(data);

      // Set default component
      const defaultItem = data.menu_items.find(item => item.is_default);
      const defaultComponent = defaultItem?.component_id ||
                             data.workspace_layout?.default_component ||
                             'file_explorer';
      setActiveComponent(defaultComponent);
      const metadata = await getComponentMetadata(defaultComponent);
      setComponentMetadata(metadata);

    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = async (componentId: string) => {
    setActiveComponent(componentId);
    const metadata = await getComponentMetadata(componentId);
    setComponentMetadata(metadata);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">No dashboard configuration found</p>
      </div>
    );
  }

  const ActiveComponentToRender = resolveComponent(
    activeComponent,
    null,
    componentMetadata?.widget_component_name
  );
  const workspaceLayout = config.workspace_layout ?? {};
  const menuStyle = workspaceLayout.menu_style ?? 'ring';
  const needsTopPadding = menuStyle === 'ring';

  return (
    <DashboardStatusProvider activeComponent={activeComponent}>
    <div className="flex h-screen bg-gray-50">
      <DashboardNavMenu
        menuItems={config.menu_items || []}
        activeComponent={activeComponent}
        onMenuClick={handleMenuClick}
        dashboardName={config.dashboard_name}
        role={config.role}
        workspaceLayout={workspaceLayout}
        footerSlot={
          <p className="text-xs text-gray-500">Phase 1c: Component Registry</p>
        }
      />

      {/* Main Workspace: Active Component */}
      <main
        className={`flex-1 overflow-hidden flex flex-col pt-14 ${
          needsTopPadding ? 'md:pt-28' : 'md:pt-0'
        }`}
      >
        <div className="flex-1 overflow-auto p-6">
          <Suspense fallback={<div className="text-gray-600">Loading component...</div>}>
            <ActiveComponentToRender />
          </Suspense>
        </div>
      </main>
    </div>
    </DashboardStatusProvider>
  );
}
