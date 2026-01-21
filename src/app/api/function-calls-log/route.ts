// Function Calls Log API - Execution History
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// Helper to get access token from request
function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

// GET /api/function-calls-log - List function calls (execution history)
export async function GET(req: NextRequest) {
  try {
    const accessToken = getAccessToken(req);

    // Verify user is authenticated
    const supabase = await createServerClient(accessToken);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (required for viewing execution history)
    const { data: adminCheck } = await supabase.rpc('is_user_admin');
    if (!adminCheck) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const llmInterfaceId = searchParams.get('llm_interface_id') || undefined;
    const functionCode = searchParams.get('function_code') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const limit = Math.min(pageSize, 100); // Max 100 per page
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('function_calls_log')
      .select(`
        id,
        reference,
        function_code,
        llm_interface_id,
        ai_model,
        execution_status,
        error_message,
        requested_at,
        started_at,
        completed_at,
        duration_ms,
        tokens_used,
        retry_count,
        created_at,
        llm_interfaces:llm_interface_id (
          id,
          name,
          provider
        )
      `, { count: 'exact' })
      .order('requested_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (llmInterfaceId) {
      query = query.eq('llm_interface_id', llmInterfaceId);
    }
    if (functionCode) {
      query = query.eq('function_code', functionCode);
    }
    if (status) {
      query = query.eq('execution_status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching function calls log:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      calls: data || [],
      pagination: {
        page,
        pageSize: limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (e: any) {
    console.error('API error in GET /api/function-calls-log:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


















