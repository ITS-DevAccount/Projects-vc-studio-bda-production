/**
 * API Route: /api/registry
 * Purpose: Registry CRUD operations - List and Create
 * Sprint 10.1d.2: Registry Consolidation & Management
 */

import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { CreateRegistryEntryInput, RegistryFilters } from '@/lib/types/registry';

/**
 * GET /api/registry
 * List all components in registry with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const registry_type = searchParams.get('registry_type');
    const is_active = searchParams.get('is_active');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const page_size = parseInt(searchParams.get('page_size') || '50');

    // Get stakeholder and app_uuid (stakeholders are global, app_uuid comes from stakeholder_roles)
    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!stakeholder) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }

    // Get app_uuid from stakeholder_roles
    const { data: roleData } = await supabase
      .from('stakeholder_roles')
      .select('app_uuid')
      .eq('stakeholder_id', stakeholder.id)
      .limit(1)
      .single();

    if (!roleData) {
      return NextResponse.json({ error: 'No app access found' }, { status: 403 });
    }

    const app_uuid = roleData.app_uuid;

    // Build query
    let query = supabase
      .from('components_registry')
      .select('*', { count: 'exact' })
      .eq('app_uuid', app_uuid)
      .is('deleted_at', null)
      .order('component_name', { ascending: true });

    // Apply filters
    if (registry_type) {
      query = query.eq('registry_type', registry_type);
    }

    if (is_active !== null && is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    if (search) {
      query = query.or(`component_code.ilike.%${search}%,component_name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply pagination
    const offset = (page - 1) * page_size;
    query = query.range(offset, offset + page_size - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching registry:', error);
      return NextResponse.json({ error: 'Failed to fetch registry' }, { status: 500 });
    }

    return NextResponse.json({
      data,
      count: count || 0,
      page,
      page_size,
    });
  } catch (error: any) {
    console.error('Error in GET /api/registry:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/registry
 * Create new registry entry
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get stakeholder (stakeholders are global, app_uuid comes from stakeholder_roles)
    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!stakeholder) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }

    // Check if user is admin and get app_uuid
    const { data: roles } = await supabase
      .from('stakeholder_roles')
      .select('role_type, app_uuid')
      .eq('stakeholder_id', stakeholder.id)
      .eq('role_type', 'admin')
      .single();

    if (!roles) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const app_uuid = roles.app_uuid;

    // Parse request body
    const body: CreateRegistryEntryInput = await request.json();

    // Validate required fields
    if (!body.component_code || !body.component_name || !body.widget_component_name) {
      return NextResponse.json(
        { error: 'Missing required fields: component_code, component_name, widget_component_name' },
        { status: 400 }
      );
    }

    // Check for duplicate component_code
    const { data: existing } = await supabase
      .from('components_registry')
      .select('id')
      .eq('component_code', body.component_code)
      .eq('app_uuid', app_uuid)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: `Component code "${body.component_code}" already exists` },
        { status: 409 }
      );
    }

    // Create registry entry
    const { data, error } = await supabase
      .from('components_registry')
      .insert([
        {
          ...body,
          app_uuid: app_uuid,
          created_by: user.id,
          last_modified_by: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating registry entry:', error);
      return NextResponse.json({ error: 'Failed to create registry entry' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/registry:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
