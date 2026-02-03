// API Route: GET /api/dashboard/menu-items
// Purpose: Returns menu items from workspace_dashboard_configurations based on user workspace and role
// Phase 1c: Component Registry & File System

import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
  try {
    console.log('[API /dashboard/menu-items] Request received - Starting debug trace');
    const supabase = await createServerClient();
    
    // 1. Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[API /dashboard/menu-items] Unauthorized:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[API /dashboard/menu-items] User authenticated:', user.email);

    // Get stakeholder
    const { data: stakeholder, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select('id, email')
      .eq('auth_user_id', user.id)
      .single();

    if (stakeholderError || !stakeholder) {
      console.error('[API /dashboard/menu-items] Stakeholder not found for user:', user.id);
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }
    console.log('[API /dashboard/menu-items] Stakeholder found:', stakeholder.id);

    // Helper for default menu items (fallback)
    const getDefaultMenuItems = () => {
      console.log('[API /dashboard/menu-items] Returning DEFAULT menu items');
      return [
        'content',
        'community', 
        'workflows', 
        'workspace_templates',
        'monitoring', 
        'ai_prompts', 
        'llm_interfaces', 
        'json_tools'
      ];
    };

    let menuItems: any[] = [];
    let dashboardName = 'Dashboard';
    let workspaceLayout = {};
    let widgets: any[] = [];
    let componentAccess = {};
    let roleCode = 'default';

    // 2. Get stakeholder's active workspace (where they are owner)
    // Changing from single() to limit(1) to prevent errors if multiple exist (though ideally shouldn't for owner)
    const { data: workspaces, error: workspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('owner_stakeholder_id', stakeholder.id)
      .eq('status', 'active');

    if (workspaceError) {
      console.error('[API /dashboard/menu-items] Error fetching workspaces:', workspaceError);
      menuItems = getDefaultMenuItems();
    } else if (!workspaces || workspaces.length === 0) {
      console.log('[API /dashboard/menu-items] No active workspace found for stakeholder:', stakeholder.id);
      menuItems = getDefaultMenuItems();
    } else {
      const workspace = workspaces[0];
      console.log('[API /dashboard/menu-items] Workspace found:', {
        id: workspace.id,
        name: workspace.name,
        primary_role_code: workspace.primary_role_code
      });

      // 3. Get workspace configuration with dashboard config
      const { data: workspaceConfig, error: configError } = await supabase
        .from('workspace_configurations')
        .select(`
          *,
          dashboard_config:workspace_dashboard_configurations!inner(
            id,
            config_name,
            dashboard_config
          )
        `)
        .eq('workspace_id', workspace.id)
        .eq('is_active', true)
        .single();

      if (configError) {
        console.error('[API /dashboard/menu-items] Error fetching workspace config:', configError);
        menuItems = getDefaultMenuItems();
      } else if (!workspaceConfig?.dashboard_config) {
        console.warn('[API /dashboard/menu-items] No dashboard config linked to workspace config');
        menuItems = getDefaultMenuItems();
      } else {
        // 4. Get user's role from workspace
        roleCode = workspace.primary_role_code;
        console.log('[API /dashboard/menu-items] Using role code:', roleCode);
        
        // 5. Extract role configuration from dashboard config
        // Support both: role_configurations[roleCode] (canonical) and top-level menu_items (legacy)
        const dashboardConfigData = workspaceConfig.dashboard_config.dashboard_config as any;
        
        // Debug config structure
        console.log('[API /dashboard/menu-items] Config keys:', Object.keys(dashboardConfigData || {}));
        if (dashboardConfigData?.role_configurations) {
             console.log('[API /dashboard/menu-items] Available roles:', Object.keys(dashboardConfigData.role_configurations));
        }

        let roleConfiguration = dashboardConfigData?.role_configurations?.[roleCode];

        // Backward compatibility: if no role_configurations, use top-level menu_items/workspace_layout
        if (!roleConfiguration && dashboardConfigData?.menu_items) {
          console.log('[API /dashboard/menu-items] Using legacy top-level menu_items structure');
          roleConfiguration = {
            menu_items: dashboardConfigData.menu_items,
            dashboard_name: dashboardConfigData.dashboard_name || workspace.name,
            workspace_layout: dashboardConfigData.workspace_layout || {},
            widgets: dashboardConfigData.widgets || [],
            component_access: dashboardConfigData.component_access || {},
          };
        }

        if (!roleConfiguration) {
          console.warn(`[API /dashboard/menu-items] No configuration found for role '${roleCode}' in dashboard config`);
          menuItems = getDefaultMenuItems();
        } else {
          console.log('[API /dashboard/menu-items] Role configuration found. Menu items count:', roleConfiguration.menu_items?.length);
          menuItems = roleConfiguration.menu_items || [];
          dashboardName = roleConfiguration.dashboard_name || workspace.name;
          workspaceLayout = roleConfiguration.workspace_layout || {};
          widgets = roleConfiguration.widgets || [];
          componentAccess = roleConfiguration.component_access || {};
        }
      }
    }

    // Get app_uuid for component registry lookup
    const { data: stakeholderRoles } = await supabase
      .from('stakeholder_roles')
      .select('role_type, app_uuid')
      .eq('stakeholder_id', stakeholder.id)
      .limit(1)
      .maybeSingle();

    // ENRICHMENT: Fetch component metadata
    const componentCodes = menuItems.map((item: any) => {
      if (typeof item === 'string') return item;
      return item.component_code || item.component_id || item.id || item;
    }).filter(Boolean);

    let componentsMap = new Map();

    if (componentCodes.length > 0 && stakeholderRoles?.app_uuid) {
      const { data: componentsData } = await supabase
        .from('components_registry')
        .select('component_code, component_name, icon_name, route_path')
        .in('component_code', componentCodes)
        .eq('app_uuid', stakeholderRoles.app_uuid)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (componentsData) {
        componentsData.forEach((comp: any) => {
          componentsMap.set(comp.component_code, comp);
        });
      }
    }

    // Convert to standardized format
    const formattedMenuItems = menuItems.map((item: any, index: number) => {
      let componentCode: string;
      let overrideLabel: string | null = null;
      let position: number = index + 1;
      let isDefault: boolean = index === 0;

      if (typeof item === 'string') {
        componentCode = item;
      } else {
        componentCode = item.component_code || item.component_id || item.id || item;
        overrideLabel = item.override_label || item.label || null;
        position = item.position !== undefined ? item.position : index + 1;
        isDefault = item.is_default !== undefined ? item.is_default : index === 0;
      }

      const registryEntry = componentsMap.get(componentCode);

      // Fallback label generation
      const defaultLabel = componentCode
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l: string) => l.toUpperCase());

      return {
        label: overrideLabel || registryEntry?.component_name || defaultLabel,
        component_id: componentCode,
        component_code: componentCode,
        icon_name: registryEntry?.icon_name || null,
        route_path: registryEntry?.route_path || null,
        position,
        is_default: isDefault
      };
    });

    const defaultWorkspaceLayout = {
      sidebar_width: '250px',
      theme: 'light',
      show_notifications: true,
      default_component: 'file_explorer'
    };

    return NextResponse.json({
      menu_items: formattedMenuItems,
      dashboard_name: dashboardName,
      workspace_layout: {
        ...defaultWorkspaceLayout,
        ...workspaceLayout
      },
      widgets: widgets,
      component_access: componentAccess,
      role: roleCode,
      stakeholder_id: stakeholder.id
    });

  } catch (error: any) {
    console.error('Error loading dashboard menu items:', error);
    return NextResponse.json(
      { error: 'Failed to load menu items', details: error.message }, 
      { status: 500 }
    );
  }
}
