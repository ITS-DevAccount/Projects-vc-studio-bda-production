// API Route: GET /api/dashboard/menu-items
// Purpose: Returns menu items from stakeholder.core_config for current role
// Phase 1c: Component Registry & File System

import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
  try {
    console.log('[API /dashboard/menu-items] Request received');

    const supabase = await createServerClient();

    console.log('[API /dashboard/menu-items] Server client created, checking auth...');

    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('[API /dashboard/menu-items] Auth check result:', {
      hasUser: !!user,
      hasError: !!authError,
      errorMessage: authError?.message,
      errorStatus: authError?.status
    });

    if (authError || !user) {
      console.error('[API /dashboard/menu-items] Unauthorized - user:', user?.id, 'error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized', details: authError?.message },
        { status: 401 }
      );
    }

    console.log('[API /dashboard/menu-items] User authenticated:', user.email);

    // Get stakeholder record with core_config
    const { data: stakeholder, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select('id, core_config')
      .eq('auth_user_id', user.id)
      .single();

    if (stakeholderError || !stakeholder) {
      console.error('[API /dashboard/menu-items] Stakeholder not found:', stakeholderError);
      return NextResponse.json(
        { error: 'Stakeholder not found' },
        { status: 404 }
      );
    }

    console.log('[API /dashboard/menu-items] Stakeholder found:', stakeholder.id);

    // Get stakeholder roles and app_uuid (stakeholders are global, app_uuid comes from stakeholder_roles)
    const { data: stakeholderRoles, error: rolesError } = await supabase
      .from('stakeholder_roles')
      .select('role_type, app_uuid')
      .eq('stakeholder_id', stakeholder.id)
      .limit(1)
      .maybeSingle();

    console.log('[API /dashboard/menu-items] Stakeholder roles query:', {
      hasData: !!stakeholderRoles,
      data: stakeholderRoles,
      error: rolesError ? {
        message: rolesError.message,
        code: rolesError.code
      } : null
    });

    // Extract core_config - handle both JSON string and object
    let coreConfig = stakeholder.core_config as any;

    console.log('[API /dashboard/menu-items] Core config exists:', !!coreConfig);
    console.log('[API /dashboard/menu-items] Core config type:', typeof coreConfig);
    
    if (typeof coreConfig === 'string') {
      try {
        coreConfig = JSON.parse(coreConfig);
        console.log('[API /dashboard/menu-items] Parsed core_config from string');
      } catch (e) {
        console.error('[API /dashboard/menu-items] Failed to parse core_config JSON:', e);
        return NextResponse.json(
          { error: 'Invalid core_config format' },
          { status: 500 }
        );
      }
    }
    console.log('[API /dashboard/menu-items] Role configurations:', coreConfig?.role_configurations ? Object.keys(coreConfig.role_configurations) : 'none');
    console.log('[API /dashboard/menu-items] Full role_configurations:', JSON.stringify(coreConfig?.role_configurations, null, 2));

    if (!coreConfig || !coreConfig.role_configurations) {
      console.error('[API /dashboard/menu-items] No role_configurations in core_config');
      return NextResponse.json(
        { error: 'No dashboard configuration found' },
        { status: 404 }
      );
    }

    // Get menu items for current role
    // First, check what roles are available in the config
    const availableRoleConfigs = Object.keys(coreConfig?.role_configurations || {});
    console.log('[API /dashboard/menu-items] Available role configs:', availableRoleConfigs);
    
    // Get role from stakeholder_roles or try to match from __meta.roles
    let role = stakeholderRoles?.role_type || null;
    console.log('[API /dashboard/menu-items] Role from stakeholder_roles:', role);
    
    // If we have __meta.roles, we can use those to help find the right config
    const metaRoles = coreConfig?.__meta?.roles || [];
    console.log('[API /dashboard/menu-items] Meta roles:', metaRoles);
    
    // Try to find matching role config
    let roleConfig = null;
    
    // Strategy 1: Direct match with role from stakeholder_roles
    if (role && coreConfig.role_configurations?.[role]) {
      roleConfig = coreConfig.role_configurations[role];
      console.log('[API /dashboard/menu-items] Found role config by direct match:', role);
    }
    // Strategy 2: Try combining meta roles (e.g., "individual" + "investor" = "individual_investor")
    else if (metaRoles.length > 0) {
      const combinedRole = metaRoles.join('_');
      if (coreConfig.role_configurations?.[combinedRole]) {
        roleConfig = coreConfig.role_configurations[combinedRole];
        role = combinedRole;
        console.log('[API /dashboard/menu-items] Found role config by combining meta roles:', combinedRole);
      }
      // Strategy 3: Try each meta role individually
      else {
        for (const metaRole of metaRoles) {
          if (coreConfig.role_configurations?.[metaRole]) {
            roleConfig = coreConfig.role_configurations[metaRole];
            role = metaRole;
            console.log('[API /dashboard/menu-items] Found role config by meta role:', metaRole);
            break;
          }
        }
      }
    }
    // Strategy 4: Try 'default' fallback
    if (!roleConfig && coreConfig.role_configurations?.['default']) {
      roleConfig = coreConfig.role_configurations['default'];
      role = 'default';
      console.log('[API /dashboard/menu-items] Using default role config');
    }
    // Strategy 5: Use first available role config as last resort
    if (!roleConfig && availableRoleConfigs.length > 0) {
      role = availableRoleConfigs[0];
      roleConfig = coreConfig.role_configurations[role];
      console.log('[API /dashboard/menu-items] Using first available role config:', role);
    }
    
    if (roleConfig) {
      console.log('[API /dashboard/menu-items] Selected role:', role);
      console.log('[API /dashboard/menu-items] Role config menu_items:', roleConfig.menu_items);
      console.log('[API /dashboard/menu-items] Role config menu_items type:', Array.isArray(roleConfig.menu_items) ? 'array' : typeof roleConfig.menu_items);
      console.log('[API /dashboard/menu-items] Role config menu_items length:', Array.isArray(roleConfig.menu_items) ? roleConfig.menu_items.length : 'N/A');
    } else {
      console.warn('[API /dashboard/menu-items] No role config found after all strategies');
    }

    if (!roleConfig) {
      console.warn('[API /dashboard/menu-items] No role config found, returning defaults');
      return NextResponse.json({
        menu_items: [],
        dashboard_name: 'Dashboard',
        workspace_layout: {
          sidebar_width: '250px',
          theme: 'light',
          show_notifications: true,
          default_component: 'file_explorer'
        },
        widgets: [],
        role: role,
        stakeholder_id: stakeholder.id
      });
    }

    // Handle menu_items - can be array of strings or array of objects
    let menuItems = roleConfig.menu_items || [];

    // Fetch component metadata from components_registry (single source of truth)
    const componentCodes = menuItems.map((item: any) => {
      if (typeof item === 'string') return item;
      return item.component_code || item.component_id || item.id || item;
    }).filter(Boolean);

    let componentsMap = new Map();

    if (componentCodes.length > 0 && stakeholderRoles) {
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

    // Convert menu_items to standardized format
    menuItems = menuItems.map((item: any, index: number) => {
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

      // Get component metadata from registry
      const registryEntry = componentsMap.get(componentCode);

      return {
        label: overrideLabel || registryEntry?.component_name || componentCode.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        component_id: componentCode,
        component_code: componentCode,
        icon_name: registryEntry?.icon_name || null,
        route_path: registryEntry?.route_path || null,
        position,
        is_default: isDefault
      };
    });

    console.log('[API /dashboard/menu-items] Processed menu items:', menuItems.length, 'items');

    // Ensure workspace_layout always has default values
    const workspaceLayout = roleConfig.workspace_layout || {};
    const defaultWorkspaceLayout = {
      sidebar_width: '250px',
      theme: 'light',
      show_notifications: true,
      default_component: 'file_explorer'
    };

    return NextResponse.json({
      menu_items: menuItems,
      dashboard_name: roleConfig.dashboard_name || 'Dashboard',
      workspace_layout: {
        ...defaultWorkspaceLayout,
        ...workspaceLayout
      },
      widgets: roleConfig.widgets || [],
      role: role,
      stakeholder_id: stakeholder.id
    });

  } catch (error: any) {
    console.error('Error fetching menu items:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
