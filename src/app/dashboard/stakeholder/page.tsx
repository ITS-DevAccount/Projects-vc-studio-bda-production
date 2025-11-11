'use client';

// Dashboard Page with Dynamic Component Loading - Phase 1c
// Location: /dashboard/stakeholder (stakeholder portal entry point)

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { FileSystemProvider } from '@/contexts/FileSystemContext';

// Import workspace components
import FileExplorer from '@/components/workspace/FileExplorer';
import FileUploader from '@/components/workspace/FileUploader';
import FolderCreator from '@/components/workspace/FolderCreator';
import WorkflowTasksWidget from '@/components/workspace/WorkflowTasksWidget';
import VCModelPyramid from '@/components/workspace/VCModelPyramid';

// Component map for dynamic loading
const COMPONENT_MAP: Record<string, React.ComponentType<any>> = {
  'file_explorer': FileExplorer,
  'file_uploader': FileUploader,
  'folder_creator': FolderCreator,
  'workflow_tasks': WorkflowTasksWidget,
  'vc_pyramid': VCModelPyramid,
};

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stakeholderName, setStakeholderName] = useState<string>('');

  useEffect(() => {
    fetchDashboardConfig();
  }, []);

  const fetchDashboardConfig = async () => {
    try {
      console.log('[Dashboard] Fetching menu items...');
      const response = await fetch('/api/dashboard/menu-items');

      console.log('[Dashboard] API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Dashboard] API error:', response.status, errorData);

        if (response.status === 401) {
          console.log('[Dashboard] Unauthorized - redirecting to login');
          router.push('/auth/login');
          return;
        }
        throw new Error(`Failed to load dashboard configuration: ${errorData.error || 'Unknown error'}`);
      }

      const data: DashboardConfig = await response.json();
      console.log('[Dashboard] Config loaded:', data);
      setConfig(data);

      // Get stakeholder name
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: stakeholder } = await supabase
          .from('stakeholders')
          .select('name')
          .eq('auth_user_id', user.id)
          .single();

        if (stakeholder) {
          setStakeholderName(stakeholder.name);
        }
      }

      // Set default component
      const defaultItem = data.menu_items.find(item => item.is_default);
      const defaultComponent = defaultItem?.component_id ||
                             data.workspace_layout?.default_component ||
                             'file_explorer';
      setActiveComponent(defaultComponent);

    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (componentId: string) => {
    setActiveComponent(componentId);
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

  const ActiveComponentToRender = COMPONENT_MAP[activeComponent];
  const sidebarWidth = config.workspace_layout.sidebar_width || '250px';

  return (
    <FileSystemProvider>
      <div className="flex h-screen bg-gray-50">
      {/* Sidebar: Menu Items */}
      <aside
        className="bg-white border-r border-gray-200 flex flex-col"
        style={{ width: sidebarWidth }}
      >
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">
            {config.dashboard_name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {stakeholderName}
          </p>
          <p className="text-xs text-gray-400">
            Role: {config.role}
          </p>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          {config.menu_items
            .sort((a, b) => a.position - b.position)
            .map((item) => (
              <button
                key={item.component_id}
                onClick={() => handleMenuClick(item.component_id)}
                className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors ${
                  activeComponent === item.component_id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition text-gray-700"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Phase 1c: Component Registry
          </p>
        </div>
      </aside>

      {/* Main Workspace: Active Component */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto p-6">
          {ActiveComponentToRender ? (
            <ActiveComponentToRender />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-600">
                  Component '{activeComponent}' not found
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Component map does not include this component
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
    </FileSystemProvider>
  );
}

