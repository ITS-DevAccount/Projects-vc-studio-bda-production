// Sprint 1d.5: Service Task Execution System
// API Route: /api/services/logs
// GET - List service execution logs

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ServiceExecutionLogsResponse } from '@/lib/types/service';

/**
 * GET /api/services/logs
 * List service execution logs with filtering
 *
 * Query params:
 * - service_config_id: Filter by specific service
 * - service_name: Filter by service name
 * - status: Filter by execution status (SUCCESS, FAILED, TIMEOUT, ERROR)
 * - instance_id: Filter by workflow instance
 * - date_from: Filter logs after this date (ISO 8601)
 * - date_to: Filter logs before this date (ISO 8601)
 * - page: Page number (default: 1)
 * - page_size: Items per page (default: 50)
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
    const service_config_id = searchParams.get('service_config_id');
    const service_name = searchParams.get('service_name');
    const status = searchParams.get('status');
    const instance_id = searchParams.get('instance_id');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const page = parseInt(searchParams.get('page') || '1');
    const page_size = parseInt(searchParams.get('page_size') || '50');

    // Build query
    let query = supabase
      .from('service_execution_logs')
      .select('*', { count: 'exact' })
      .eq('app_uuid', app_uuid)
      .order('created_at', { ascending: false });

    // Apply filters
    if (service_config_id) {
      query = query.eq('service_config_id', service_config_id);
    }

    if (service_name) {
      query = query.ilike('service_name', `%${service_name}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (instance_id) {
      query = query.eq('instance_id', instance_id);
    }

    if (date_from) {
      query = query.gte('created_at', date_from);
    }

    if (date_to) {
      query = query.lte('created_at', date_to);
    }

    // Apply pagination
    const from = (page - 1) * page_size;
    const to = from + page_size - 1;
    query = query.range(from, to);

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('Error fetching logs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const response: ServiceExecutionLogsResponse = {
      logs: logs || [],
      total: count || 0,
      page,
      page_size,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/services/logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
