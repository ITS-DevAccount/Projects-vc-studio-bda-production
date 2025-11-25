// Sprint 1d.5: Service Task Execution System
// API Route: /api/services/[serviceId]
// GET - Get single service configuration
// PATCH - Update service configuration
// DELETE - Delete service configuration

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { UpdateServiceConfigurationInput } from '@/lib/types/service';

/**
 * GET /api/services/[serviceId]
 * Get single service configuration
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const supabase = await createClient();
    const { serviceId } = await params;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get app_id by looking up VC_STUDIO application code
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('id')
      .eq('app_code', 'VC_STUDIO')
      .single();

    if (appError || !app) {
      return NextResponse.json(
        { error: 'Application VC_STUDIO not found' },
        { status: 500 }
      );
    }

    const appId = app.id;

    // Fetch service configuration
    const { data: service, error } = await supabase
      .from('service_configurations')
      .select('*')
      .eq('service_config_id', serviceId)
      .eq('app_id', appId)
      .single();

    if (error || !service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error('Error in GET /api/services/[serviceId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/services/[serviceId]
 * Update service configuration (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const supabase = await createClient();
    const { serviceId } = await params;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get app_id by looking up VC_STUDIO application code
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('id')
      .eq('app_code', 'VC_STUDIO')
      .single();

    if (appError || !app) {
      return NextResponse.json(
        { error: 'Application VC_STUDIO not found' },
        { status: 500 }
      );
    }

    const appId = app.id;

    // Check if user is admin via database function
    const { data: isAdminResult } = await supabase.rpc('is_user_admin');

    if (!isAdminResult) {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    // Verify service belongs to user's app
    const { data: existing } = await supabase
      .from('service_configurations')
      .select('service_config_id')
      .eq('service_config_id', serviceId)
      .eq('app_id', appId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body: UpdateServiceConfigurationInput = await request.json();

    // If updating service name, check for duplicates
    if (body.service_name) {
      const { data: duplicate } = await supabase
        .from('service_configurations')
        .select('service_config_id')
        .eq('app_id', appId)
        .eq('service_name', body.service_name)
        .neq('service_config_id', serviceId)
        .single();

      if (duplicate) {
        return NextResponse.json(
          { error: 'Service name already exists' },
          { status: 409 }
        );
      }
    }

    // Update service configuration
    const { data: updatedService, error: updateError } = await supabase
      .from('service_configurations')
      .update({
        service_name: body.service_name,
        endpoint_url: body.endpoint_url,
        http_method: body.http_method,
        timeout_seconds: body.timeout_seconds,
        max_retries: body.max_retries,
        authentication: body.authentication,
        mock_template_id: body.mock_template_id,
        mock_definition: body.mock_definition,
        is_active: body.is_active,
        description: body.description,
      })
      .eq('service_config_id', serviceId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating service:', updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedService);
  } catch (error) {
    console.error('Error in PATCH /api/services/[serviceId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/services/[serviceId]
 * Delete service configuration (admin only)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const supabase = await createClient();
    const { serviceId } = await params;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get app_id by looking up VC_STUDIO application code
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('id')
      .eq('app_code', 'VC_STUDIO')
      .single();

    if (appError || !app) {
      return NextResponse.json(
        { error: 'Application VC_STUDIO not found' },
        { status: 500 }
      );
    }

    const appId = app.id;

    // Check if user is admin via database function
    const { data: isAdminResult } = await supabase.rpc('is_user_admin');

    if (!isAdminResult) {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    // Check if service is in use
    // Note: This may fail due to RLS policies, but we'll allow deletion anyway
    const { data: queueItems, error: queueError } = await supabase
      .from('service_task_queue')
      .select('queue_id')
      .eq('service_config_id', serviceId)
      .in('status', ['PENDING', 'RUNNING'])
      .limit(1);

    if (queueError) {
      // Log warning but don't block deletion
      console.warn('Could not check service usage (RLS may be blocking):', queueError);
      // Continue with deletion
    } else if (queueItems && queueItems.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete service with pending/running tasks' },
        { status: 409 }
      );
    }

    // Delete service configuration
    const { error: deleteError } = await supabase
      .from('service_configurations')
      .delete()
      .eq('service_config_id', serviceId)
      .eq('app_id', appId);

    if (deleteError) {
      console.error('Error deleting service:', deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/services/[serviceId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
