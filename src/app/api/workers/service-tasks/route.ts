// Sprint 1d.5: Service Task Execution System
// API Route: /api/workers/service-tasks
// POST - Manually trigger service task worker

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { startServiceTaskWorker, stopServiceTaskWorker } from '@/lib/workers/service-task-worker';

/**
 * POST /api/workers/service-tasks
 * Manually trigger the service task worker (admin only)
 *
 * Query params:
 * - action: 'start' | 'stop' | 'process-once' (default: 'process-once')
 *
 * 'start' - Start continuous worker polling
 * 'stop' - Stop worker polling
 * 'process-once' - Process pending tasks once without starting polling loop
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
      .select('core_config')
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

    // Parse action from query params
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'process-once';

    if (action === 'start') {
      // Start continuous worker
      const worker = startServiceTaskWorker();
      return NextResponse.json({
        success: true,
        message: 'Service task worker started',
      });
    } else if (action === 'stop') {
      // Stop worker
      stopServiceTaskWorker();
      return NextResponse.json({
        success: true,
        message: 'Service task worker stopped',
      });
    } else if (action === 'process-once') {
      // Process pending tasks once without starting polling loop
      // Import worker class directly
      const { ServiceTaskWorker } = await import('@/lib/workers/service-task-worker');
      const worker = new ServiceTaskWorker();

      // Call processPendingTasks once
      // Access private method via workaround for admin endpoint
      await (worker as any).processPendingTasks();

      return NextResponse.json({
        success: true,
        message: 'Processed pending service tasks',
      });
    } else {
      return NextResponse.json(
        { error: `Invalid action: ${action}. Must be 'start', 'stop', or 'process-once'` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in POST /api/workers/service-tasks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workers/service-tasks
 * Get worker status (admin only)
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

    // Get user's stakeholder record
    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select('core_config')
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

    // Get queue statistics
    const { data: pendingCount } = await supabase
      .from('service_task_queue')
      .select('queue_id', { count: 'exact', head: true })
      .eq('status', 'PENDING');

    const { data: runningCount } = await supabase
      .from('service_task_queue')
      .select('queue_id', { count: 'exact', head: true })
      .eq('status', 'RUNNING');

    return NextResponse.json({
      pending_tasks: pendingCount || 0,
      running_tasks: runningCount || 0,
    });
  } catch (error) {
    console.error('Error in GET /api/workers/service-tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
