/**
 * API Route: /api/registry/[code]
 * Purpose: Registry CRUD operations - Get, Update, Delete individual entries
 * Sprint 10.1d.2: Registry Consolidation & Management
 */

import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { UpdateRegistryEntryInput } from '@/lib/types/registry';

/**
 * GET /api/registry/[code]
 * Get single registry entry by component_code
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = params;

    // Get stakeholder to check app_uuid
    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select('app_uuid')
      .eq('auth_user_id', user.id)
      .single();

    if (!stakeholder) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }

    // Fetch registry entry
    const { data, error } = await supabase
      .from('components_registry')
      .select('*')
      .eq('component_code', code)
      .eq('app_uuid', stakeholder.app_uuid)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Component not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in GET /api/registry/[code]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/registry/[code]
 * Update registry entry
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = params;

    // Get stakeholder to check admin role and app_uuid
    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select('id, app_uuid')
      .eq('auth_user_id', user.id)
      .single();

    if (!stakeholder) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from('stakeholder_roles')
      .select('role_type')
      .eq('stakeholder_id', stakeholder.id)
      .eq('role_type', 'admin')
      .single();

    if (!roles) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body: Partial<UpdateRegistryEntryInput> = await request.json();

    // Remove fields that shouldn't be updated via API
    delete (body as any).id;
    delete (body as any).app_uuid;
    delete (body as any).created_by;
    delete (body as any).created_at;

    // Add audit fields
    const updateData = {
      ...body,
      last_modified_by: user.id,
      updated_at: new Date().toISOString(),
    };

    // Update registry entry
    const { data, error } = await supabase
      .from('components_registry')
      .update(updateData)
      .eq('component_code', code)
      .eq('app_uuid', stakeholder.app_uuid)
      .is('deleted_at', null)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating registry entry:', error);
      return NextResponse.json({ error: 'Failed to update registry entry' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in PATCH /api/registry/[code]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/registry/[code]
 * Soft delete registry entry (sets deleted_at timestamp)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = params;

    // Get stakeholder to check admin role and app_uuid
    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select('id, app_uuid')
      .eq('auth_user_id', user.id)
      .single();

    if (!stakeholder) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from('stakeholder_roles')
      .select('role_type')
      .eq('stakeholder_id', stakeholder.id)
      .eq('role_type', 'admin')
      .single();

    if (!roles) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Check if component is in use
    const { data: usageData } = await supabase.rpc('check_component_usage', {
      p_component_code: code,
    });

    if (usageData && usageData.length > 0) {
      return NextResponse.json(
        {
          error: 'Component is currently in use',
          usage: usageData,
          message: `This component is used in ${usageData.length} stakeholder dashboard(s). Please remove it from their menus before deleting.`,
        },
        { status: 409 }
      );
    }

    // Soft delete (set deleted_at timestamp)
    const { data, error } = await supabase
      .from('components_registry')
      .update({
        deleted_at: new Date().toISOString(),
        last_modified_by: user.id,
        is_active: false,
      })
      .eq('component_code', code)
      .eq('app_uuid', stakeholder.app_uuid)
      .is('deleted_at', null)
      .select()
      .single();

    if (error || !data) {
      console.error('Error deleting registry entry:', error);
      return NextResponse.json({ error: 'Failed to delete registry entry' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Component soft deleted successfully',
      data,
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/registry/[code]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
