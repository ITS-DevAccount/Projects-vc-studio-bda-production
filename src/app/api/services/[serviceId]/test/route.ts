// Sprint 1d.5: Service Task Execution System
// API Route: /api/services/[serviceId]/test
// POST - Test service configuration (executes service call)

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/clients/ServiceClient';
import { ServiceConfiguration, ServiceTestResponse } from '@/lib/types/service';

/**
 * POST /api/services/[serviceId]/test
 * Test service configuration by executing a test call (admin only)
 *
 * Request body:
 * - input_data?: object - Optional test input data
 */
export async function POST(
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

    // Get user's stakeholder record
    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select('app_uuid, core_config')
      .eq('id', user.id)
      .single();

    if (!stakeholder) {
      return NextResponse.json(
        { error: 'Stakeholder not found' },
        { status: 404 }
      );
    }

    // Check if user is admin
    const isAdmin = stakeholder.core_config?.permissions?.is_admin === true;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    // Fetch service configuration
    const { data: service, error: serviceError } = await supabase
      .from('service_configurations')
      .select('*')
      .eq('service_config_id', serviceId)
      .eq('app_uuid', stakeholder.app_uuid)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Parse request body for test input
    const body = await request.json();
    const testInput = body.input_data || {};

    // Create service client
    const client = await createServiceClient(service as ServiceConfiguration);

    // Execute service call
    const endpoint = service.endpoint_url || service.service_name;
    const response = await client.execute(
      endpoint,
      testInput,
      service as ServiceConfiguration
    );

    // Build test response
    const testResponse: ServiceTestResponse = {
      success: response.status === 'success',
      data: response.data,
      error: response.error,
      execution_time_ms: response.executionTimeMs,
      http_status_code: response.statusCode,
    };

    return NextResponse.json(testResponse);
  } catch (error) {
    console.error('Error in POST /api/services/[serviceId]/test:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
