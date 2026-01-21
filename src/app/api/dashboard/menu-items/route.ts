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

    // Get stakeholder record
    const { data: stakeholder, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select('id')
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

    // Simple flow: stakeholder → workspace → template → dashboard config
    // Get workspaces where stakeholder has access (via ownership or access_control)
    const { data: accessRecords, error: accessError } = await supabase
      .from('workspace_access_control')
      .select('workspace_id')
      .eq('stakeholder_id', stakeholder.id)
      .eq('invitation_status', 'accepted');

    if (accessError) {
      console.error('[API /dashboard/menu-items] Error fetching access records:', accessError);
      return NextResponse.json(
        { error: 'Failed to fetch workspace access' },
        { status: 500 }
      );
    }

    const workspaceIds = accessRecords?.map(r => r.workspace_id) || [];

    if (workspaceIds.length === 0) {
      console.error('[API /dashboard/menu-items] No workspace access found');
      return NextResponse.json(
        { error: 'No workspace found for this stakeholder' },
        { status: 404 }
      );
    }

    // Get first accessible workspace with template and dashboard config
    const { data: workspaceData, error: workspaceError } = await supabase
      .from('workspaces')
      .select(`
        id,
        name,
        created_from_template_id,
        template:workspace_templates!created_from_template_id(
          id,
          template_name,
          dashboard_config_id,
          dashboard_config:workspace_dashboard_configurations!dashboard_config_id(
            id,
            config_name,
            dashboard_config
          )
        )
      `)
      .eq('status', 'active')
      .in('id', workspaceIds)
      .limit(1)
      .maybeSingle();

    console.log('[API /dashboard/menu-items] Workspace query:', {
      hasWorkspace: !!workspaceData,
      workspaceId: workspaceData?.id,
      hasTemplate: !!workspaceData?.template,
      error: workspaceError
    });

    if (workspaceError || !workspaceData) {
      console.error('[API /dashboard/menu-items] No workspace found:', workspaceError);
      return NextResponse.json(
        { error: 'No workspace found for this stakeholder' },
        { status: 404 }
      );
    }

    const template = Array.isArray(workspaceData.template) ? workspaceData.template[0] : workspaceData.template;

    if (!template?.dashboard_config) {
      console.error('[API /dashboard/menu-items] Workspace has no dashboard configuration');
      return NextResponse.json(
        { error: 'Workspace template has no dashboard configuration' },
        { status: 404 }
      );
    }

    // Get dashboard config from template (can be object or array)
    const dashboardConfigRecord = Array.isArray(template.dashboard_config)
      ? template.dashboard_config[0]
      : template.dashboard_config;
    let coreConfig = dashboardConfigRecord.dashboard_config;

    if (typeof coreConfig === 'string') {
      try {
        coreConfig = JSON.parse(coreConfig);
      } catch (e) {
        console.error('[API /dashboard/menu-items] Failed to parse dashboard config:', e);
        return NextResponse.json(
          { error: 'Invalid dashboard configuration format' },
          { status: 500 }
        );
      }
    }

    console.log('[API /dashboard/menu-items] Using dashboard config from workspace template');

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

    // Workspace dashboard config has direct structure (no role_configurations)
    console.log('[API /dashboard/menu-items] Dashboard config structure:', Object.keys(coreConfig || {}));

    if (!coreConfig || !coreConfig.menu_items) {
      console.error('[API /dashboard/menu-items] Dashboard config missing menu_items');
      return NextResponse.json(
        { error: 'Dashboard configuration is invalid' },
        { status: 404 }
      );
    }

    // Get role for component registry lookup
    const role = stakeholderRoles?.role_type || 'default';
    console.log('[API /dashboard/menu-items] Using role:', role);

    // Handle menu_items - can be array of strings or array of objects
    let menuItems = coreConfig.menu_items || [];

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
    const workspaceLayout = coreConfig.workspace_layout || {};
    const defaultWorkspaceLayout = {
      sidebar_width: '250px',
      theme: 'light',
      show_notifications: true,
      default_component: 'file_explorer'
    };

    return NextResponse.json({
      menu_items: menuItems,
      dashboard_name: workspaceData.name || 'Dashboard',
      workspace_layout: {
        ...defaultWorkspaceLayout,
        ...workspaceLayout
      },
      widgets: coreConfig.widgets || [],
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
