'use client';

// Dashboard Page with Dynamic Component Loading - Phase 1c
// Location: /dashboard/stakeholder (stakeholder portal entry point)

import { Suspense, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { FileSystemProvider } from '@/contexts/FileSystemContext';
import { DashboardStatusProvider } from '@/contexts/DashboardStatusContext';
import { DashboardNavMenu } from '@/components/dashboard/DashboardNavMenu';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';
import { getComponentMetadata, resolveComponent } from '@/lib/componentRegistry';
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

export default function StakeholderDashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [activeComponent, setActiveComponent] = useState<string>('file_explorer');
  const [componentMetadata, setComponentMetadata] = useState<RegistryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stakeholderName, setStakeholderName] = useState<string>('');

  useEffect(() => {
    fetchDashboardConfig();
  }, []);

  const fetchDashboardConfig = async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Dashboard] Fetching menu items...');
      }

      const response = await fetch('/api/dashboard/menu-items');

      if (process.env.NODE_ENV === 'development') {
        console.log('[Dashboard] API response status:', response.status);
      }

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          // If response is not JSON, use status text
          errorData = { error: response.statusText || 'Unknown error' };
        }

        if (process.env.NODE_ENV === 'development') {
          console.error('[Dashboard] API error:', response.status, errorData);
        }

        if (response.status === 401) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[Dashboard] Unauthorized - redirecting to login');
          }
          router.push('/auth/login');
          return;
        }

        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`Failed to load dashboard configuration: ${errorMessage}`);
      }

      const data: DashboardConfig = await response.json();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[Dashboard] Config loaded:', data);
        console.log('[Dashboard] Menu items count:', data.menu_items?.length || 0);
        console.log('[Dashboard] Menu items:', data.menu_items);
      }

      setConfig(data);

      // Get stakeholder name
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[Dashboard] Error fetching user:', userError.message);
          }
        } else if (user) {
          const { data: stakeholder, error: stakeholderError } = await supabase
            .from('stakeholders')
            .select('name')
            .eq('auth_user_id', user.id)
            .single();

          if (stakeholderError) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[Dashboard] Error fetching stakeholder:', stakeholderError.message);
            }
          } else if (stakeholder) {
            setStakeholderName(stakeholder.name);
          }
        }
      } catch (authErr: any) {
        // Non-critical error - continue without stakeholder name
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Dashboard] Error fetching stakeholder name:', authErr.message);
        }
      }

      // Set default component
      const defaultItem = data.menu_items?.find(item => item.is_default);
      const defaultComponent = defaultItem?.component_id ||
                             data.workspace_layout?.default_component ||
                             'file_explorer';
      setActiveComponent(defaultComponent);
      const metadata = await getComponentMetadata(defaultComponent);
      setComponentMetadata(metadata);

    } catch (err: any) {
      const errorMessage = err?.message || 'An unexpected error occurred while loading the dashboard';
      if (process.env.NODE_ENV === 'development') {
        console.error('[Dashboard] Error loading dashboard:', err);
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = async (componentId: string) => {
    setActiveComponent(componentId);
    const metadata = await getComponentMetadata(componentId);
    setComponentMetadata(metadata);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
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
  // Safely access workspace_layout with defaults
  const workspaceLayout = config.workspace_layout || {};
  const menuStyle = workspaceLayout.menu_style ?? 'ring';
  const needsTopPadding = menuStyle === 'ring';

  return (
    <WorkspaceProvider>
      <FileSystemProvider>
        <DashboardStatusProvider activeComponent={activeComponent}>
        <div className="flex h-screen bg-gray-50">
      <DashboardNavMenu
        menuItems={config.menu_items || []}
        activeComponent={activeComponent}
        onMenuClick={handleMenuClick}
        dashboardName={config.dashboard_name}
        role={config.role}
        workspaceLayout={workspaceLayout}
        stakeholderName={stakeholderName}
        headerSlot={<WorkspaceSwitcher />}
        topBarRightSlot={
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        }
        footerSlot={
          <>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition text-gray-700"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Phase 1c: Component Registry
            </p>
          </>
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
      </FileSystemProvider>
    </WorkspaceProvider>
  );
}
