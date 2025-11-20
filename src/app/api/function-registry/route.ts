/**
 * Sprint 1d.4 - Layer 1: Function Registry API
 * Routes: GET (list), POST (create)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type {
  FunctionRegistryEntry,
  CreateFunctionRegistryInput,
  FunctionRegistryFilters,
} from '@/lib/types/function-registry';

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

/**
 * GET /api/function-registry
 * List all function registry entries with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const accessToken = getAccessToken(request);
    const supabase = await createServerClient(accessToken);

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');
    const implementationType = searchParams.get('implementation_type');
    const isActive = searchParams.get('is_active');
    const search = searchParams.get('search');

    // Build query
    let query = supabase
      .from('function_registry')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (implementationType) {
      query = query.eq('implementation_type', implementationType);
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }

    if (search) {
      query = query.or(`function_code.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching function registry:', error);
      return NextResponse.json({ error: 'Failed to fetch registry entries' }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      count: count || 0,
      page,
      page_size: pageSize,
    });
  } catch (error) {
    console.error('Error in function-registry GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/function-registry
 * Create new function registry entry
 */
export async function POST(request: NextRequest) {
  try {
    const accessToken = getAccessToken(request);
    const supabase = await createServerClient(accessToken);

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const input: CreateFunctionRegistryInput = await request.json();

    // Validate required fields
    if (!input.function_code || !input.implementation_type) {
      return NextResponse.json(
        { error: 'function_code and implementation_type are required' },
        { status: 400 }
      );
    }

    // Validate schemas are valid JSON
    if (!input.input_schema || !input.output_schema) {
      return NextResponse.json(
        { error: 'input_schema and output_schema are required' },
        { status: 400 }
      );
    }

    // For USER_TASK, ui_widget_id should be provided
    if (input.implementation_type === 'USER_TASK' && !input.ui_widget_id) {
      return NextResponse.json(
        { error: 'ui_widget_id is required for USER_TASK type' },
        { status: 400 }
      );
    }

    // For SERVICE_TASK and AI_AGENT_TASK, endpoint_or_path should be provided
    if (
      (input.implementation_type === 'SERVICE_TASK' ||
        input.implementation_type === 'AI_AGENT_TASK') &&
      !input.endpoint_or_path
    ) {
      return NextResponse.json(
        { error: 'endpoint_or_path is required for SERVICE_TASK and AI_AGENT_TASK types' },
        { status: 400 }
      );
    }

    // Prepare insert data
    const insertData = {
      function_code: input.function_code,
      implementation_type: input.implementation_type,
      description: input.description || null,
      endpoint_or_path: input.endpoint_or_path || null,
      input_schema: input.input_schema,
      output_schema: input.output_schema,
      ui_widget_id: input.ui_widget_id || null,
      ui_definitions: input.ui_definitions || {},
      version: input.version || '1.0',
      tags: input.tags || [],
      timeout_seconds: input.timeout_seconds || 300,
      retry_count: input.retry_count || 0,
      is_active: input.is_active !== undefined ? input.is_active : true,
      created_by: user.id,
      updated_by: user.id,
    };

    // Insert into database
    const { data, error } = await supabase
      .from('function_registry')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error creating function registry entry:', error);

      // Check for duplicate function_code
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Function code already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: 'Failed to create registry entry' }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        function_code: data.function_code,
        data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in function-registry POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
