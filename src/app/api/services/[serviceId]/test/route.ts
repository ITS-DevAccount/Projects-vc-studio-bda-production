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

    // Fetch service configuration
    console.log('[Test Service] Fetching service config:', serviceId);
    const { data: service, error: serviceError } = await supabase
      .from('service_configurations')
      .select('*')
      .eq('service_config_id', serviceId)
      .eq('app_id', appId)
      .single();

    if (serviceError) {
      console.error('[Test Service] Error fetching service:', serviceError);
      return NextResponse.json(
        {
          status: 'error',
          response: { error: `Service fetch error: ${serviceError.message}` },
          execution_time_ms: 0
        },
        { status: 404 }
      );
    }

    if (!service) {
      console.error('[Test Service] Service not found:', serviceId);
      return NextResponse.json(
        {
          status: 'error',
          response: { error: 'Service not found' },
          execution_time_ms: 0
        },
        { status: 404 }
      );
    }

    console.log('[Test Service] Service found:', service.service_name, 'Type:', service.service_type);

    // Parse request body for test input
    let testInput = {};
    try {
      const body = await request.json();
      testInput = body.input_data || {};
      console.log('[Test Service] Test input:', testInput);
    } catch (e) {
      // No body or invalid JSON - use empty input
      console.log('[Test Service] No input data, using empty object');
      testInput = {};
    }

    // Create service client
    console.log('[Test Service] Creating service client...');
    const client = await createServiceClient(service as ServiceConfiguration);
    console.log('[Test Service] Client created:', client.constructor.name);

    // Execute service call
    const endpoint = service.endpoint_url || service.service_name;
    console.log('[Test Service] Executing service call to:', endpoint);

    const response = await client.execute(
      endpoint,
      testInput,
      service as ServiceConfiguration
    );

    console.log('[Test Service] Response received:', JSON.stringify(response, null, 2));

    // Validate response structure
    if (!response || typeof response !== 'object') {
      console.error('[Test Service] Invalid response structure:', response);
      return NextResponse.json({
        status: 'error',
        response: { error: 'Invalid response from service client' },
        execution_time_ms: 0,
      });
    }

    console.log('[Test Service] Response status:', response.status);
    console.log('[Test Service] Response data:', response.data);
    console.log('[Test Service] Response error:', response.error);
    console.log('[Test Service] Execution time:', response.executionTimeMs);

    // Build test response in standard format
    const testResponse: ServiceTestResponse = {
      status: response.status === 'success' ? 'success' : 'error',
      response: response.status === 'success'
        ? (response.data || {})
        : { error: response.error || 'Unknown error' },
      execution_time_ms: response.executionTimeMs || 0,
    };

    console.log('[Test Service] Built test response:', JSON.stringify(testResponse, null, 2));
    return NextResponse.json(testResponse);
  } catch (error) {
    console.error('Error in POST /api/services/[serviceId]/test:', error);
    const testResponse: ServiceTestResponse = {
      status: 'error',
      response: {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      execution_time_ms: 0,
    };
    return NextResponse.json(testResponse, { status: 500 });
  }
}
