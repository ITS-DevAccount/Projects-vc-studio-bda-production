// Sprint 1d.5: Service Task Execution System
// API Route: /api/services
// GET - List service configurations
// POST - Create new service configuration

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  CreateServiceConfigurationInput,
  ServiceConfigurationListResponse,
} from '@/lib/types/service';

/**
 * GET /api/services
 * List service configurations with filtering
 *
 * Query params:
 * - service_type: Filter by REAL or MOCK
 * - is_active: Filter by active status
 * - search: Search by service name
 * - page: Page number (default: 1)
 * - page_size: Items per page (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's app_uuid
    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select('app_uuid')
      .eq('id', user.id)
      .single();

    if (!stakeholder) {
      return NextResponse.json(
        { error: 'Stakeholder not found' },
        { status: 404 }
      );
    }

    const app_uuid = stakeholder.app_uuid;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const service_type = searchParams.get('service_type');
    const is_active = searchParams.get('is_active');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const page_size = parseInt(searchParams.get('page_size') || '20');

    // Build query
    let query = supabase
      .from('service_configurations')
      .select('*', { count: 'exact' })
      .eq('app_uuid', app_uuid)
      .order('created_at', { ascending: false });

    // Apply filters
    if (service_type) {
      query = query.eq('service_type', service_type);
    }

    if (is_active !== null && is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    if (search) {
      query = query.ilike('service_name', `%${search}%`);
    }

    // Apply pagination
    const from = (page - 1) * page_size;
    const to = from + page_size - 1;
    query = query.range(from, to);

    const { data: services, error, count } = await query;

    if (error) {
      console.error('Error fetching services:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const response: ServiceConfigurationListResponse = {
      services: services || [],
      total: count || 0,
      page,
      page_size,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/services:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/services
 * Create new service configuration (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    // Parse request body
    const body: CreateServiceConfigurationInput = await request.json();

    // Validate required fields
    if (!body.service_name || !body.service_type) {
      return NextResponse.json(
        { error: 'Missing required fields: service_name, service_type' },
        { status: 400 }
      );
    }

    // Validate service type specific fields
    if (body.service_type === 'REAL' && !body.endpoint_url) {
      return NextResponse.json(
        { error: 'REAL services require endpoint_url' },
        { status: 400 }
      );
    }

    if (
      body.service_type === 'MOCK' &&
      !body.mock_template_id &&
      !body.mock_definition
    ) {
      return NextResponse.json(
        { error: 'MOCK services require mock_template_id or mock_definition' },
        { status: 400 }
      );
    }

    // Check for duplicate service name
    const { data: existing } = await supabase
      .from('service_configurations')
      .select('service_config_id')
      .eq('app_uuid', stakeholder.app_uuid)
      .eq('service_name', body.service_name)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Service name already exists' },
        { status: 409 }
      );
    }

    // Create service configuration
    const { data: newService, error: createError } = await supabase
      .from('service_configurations')
      .insert({
        app_uuid: stakeholder.app_uuid,
        service_name: body.service_name,
        service_type: body.service_type,
        endpoint_url: body.endpoint_url,
        http_method: body.http_method || 'POST',
        timeout_seconds: body.timeout_seconds || 30,
        max_retries: body.max_retries || 3,
        authentication: body.authentication,
        mock_template_id: body.mock_template_id,
        mock_definition: body.mock_definition,
        is_active: body.is_active !== undefined ? body.is_active : true,
        description: body.description,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating service:', createError);
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(newService, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/services:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
