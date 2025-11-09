// API Route: GET /api/dashboard/menu-items
// Purpose: Returns menu items from stakeholder.core_config for current role
// Phase 1c: Component Registry & File System

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const supabase = createClient();

    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get stakeholder record with core_config
    const { data: stakeholder, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select('id, core_config, primary_role')
      .eq('auth_user_id', user.id)
      .single();

    if (stakeholderError || !stakeholder) {
      return NextResponse.json(
        { error: 'Stakeholder not found' },
        { status: 404 }
      );
    }

    // Extract core_config
    const coreConfig = stakeholder.core_config as any;

    if (!coreConfig || !coreConfig.role_configurations) {
      return NextResponse.json(
        { error: 'No dashboard configuration found' },
        { status: 404 }
      );
    }

    // Get menu items for current role
    const role = stakeholder.primary_role || 'producer';
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
