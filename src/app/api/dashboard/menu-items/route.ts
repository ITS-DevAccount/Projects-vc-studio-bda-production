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

    // Get stakeholder roles
    const { data: stakeholderRoles, error: rolesError } = await supabase
      .from('stakeholder_roles')
      .select('role_type')
      .eq('stakeholder_id', stakeholder.id)
      .limit(1)
      .single();

    if (rolesError) {
      console.warn('Error fetching stakeholder roles:', rolesError);
    }

    // Extract core_config
    const coreConfig = stakeholder.core_config as any;

    console.log('[API /dashboard/menu-items] Core config exists:', !!coreConfig);
    console.log('[API /dashboard/menu-items] Role configurations:', coreConfig?.role_configurations ? Object.keys(coreConfig.role_configurations) : 'none');

    if (!coreConfig || !coreConfig.role_configurations) {
      console.error('[API /dashboard/menu-items] No role_configurations in core_config');
      return NextResponse.json(
        { error: 'No dashboard configuration found' },
        { status: 404 }
      );
    }

    // Get menu items for current role
    const role = stakeholderRoles?.role_type || 'producer';
    console.log('[API /dashboard/menu-items] Looking for role config:', role);

    const roleConfig = coreConfig.role_configurations[role];

    if (!roleConfig || !roleConfig.menu_items) {
      return NextResponse.json({
        menu_items: [],
        dashboard_name: 'Dashboard',
        role: role
      });
    }

    return NextResponse.json({
      menu_items: roleConfig.menu_items || [],
      dashboard_name: roleConfig.dashboard_name || 'Dashboard',
      workspace_layout: roleConfig.workspace_layout || {},
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
