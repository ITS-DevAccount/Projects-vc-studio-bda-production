/**
 * DEBUG: Task Assignment Diagnostic Endpoint
 * GET /api/debug/task-assignment
 * Checks task assignments and stakeholder matching
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = getAccessToken(request);
    const supabase = await createServerClient(accessToken);

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get stakeholder for current user
    const { data: stakeholder, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    // Get all instance tasks
    const { data: allTasks, error: tasksError } = await supabase
      .from('instance_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (tasksError) {
      console.error('Error fetching instance tasks:', tasksError);
      const errorMessage = (tasksError as any)?.message || 'Unknown error';
      return NextResponse.json(
        { error: 'Failed to fetch instance tasks', details: errorMessage },
        { status: 500 }
      );
    }

    // Get all stakeholders
    const { data: allStakeholders } = await supabase
      .from('stakeholders')
      .select('id, name, auth_user_id');

    // Get pending tasks for current user (if stakeholder exists)
    let pendingTasks = null;
    if (stakeholder) {
      const { data } = await supabase
        .from('instance_tasks')
        .select('*')
        .eq('assigned_to', stakeholder.id)
        .eq('status', 'PENDING');
      pendingTasks = data;
    }

    return NextResponse.json({
      current_user: {
        auth_user_id: user.id,
        email: user.email,
      },
      stakeholder: stakeholder || { error: stakeholderError?.message || 'Not found' },
      pending_tasks_for_user: pendingTasks || [],
      all_tasks_summary: (allTasks || []).map(t => ({
        id: t.id.slice(0, 8) + '...',
        node_id: t.node_id,
        function_code: t.function_code,
        status: t.status,
        assigned_to: t.assigned_to,
        created_at: t.created_at,
      })),
      all_stakeholders: allStakeholders || [],
      diagnosis: {
        is_user_stakeholder: !!stakeholder,
        stakeholder_id: stakeholder?.id || null,
        pending_tasks_count: pendingTasks?.length || 0,
        total_tasks_in_system: allTasks?.length || 0,
        potential_issues: []
      }
    });
  } catch (error: any) {
    console.error('Error in debug/task-assignment GET:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
