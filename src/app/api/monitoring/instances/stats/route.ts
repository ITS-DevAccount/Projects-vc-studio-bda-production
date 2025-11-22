/**
 * Sprint 1d.6: Monitoring - Instances Summary Stats API
 * GET /api/monitoring/instances/stats
 * Returns high-level summary statistics for dashboard widgets
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

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all instances
    const { data: instances, error: instancesError } = await supabase
      .from('workflow_instances')
      .select('id, status, created_at, completed_at');

    if (instancesError) {
      console.error('Error fetching instances for stats:', instancesError);
      return NextResponse.json(
        { error: 'Failed to fetch instance stats', details: instancesError.message },
        { status: 500 }
      );
    }

    // Calculate stats
    const stats = {
      total_instances: instances?.length || 0,
      running: instances?.filter((i) => i.status === 'RUNNING').length || 0,
      completed: instances?.filter((i) => i.status === 'COMPLETED').length || 0,
      failed: instances?.filter((i) => i.status === 'FAILED').length || 0,
      suspended: instances?.filter((i) => i.status === 'SUSPENDED').length || 0,
    };

    // Calculate completion rate
    const completionRate =
      stats.total_instances > 0
        ? Math.round(
            ((stats.completed + stats.failed) / stats.total_instances) * 100
          )
        : 0;

    // Calculate average completion time (for completed workflows)
    const completedInstances = instances?.filter(
      (i) => i.status === 'COMPLETED' && i.completed_at
    ) || [];

    let averageCompletionTime = 0;
    if (completedInstances.length > 0) {
      const totalDuration = completedInstances.reduce((sum, instance) => {
        const start = new Date(instance.created_at).getTime();
        const end = new Date(instance.completed_at!).getTime();
        return sum + (end - start);
      }, 0);

      averageCompletionTime = Math.floor(
        totalDuration / completedInstances.length / 1000
      ); // in seconds
    }

    // Get pending tasks count
    const { count: pendingTasksCount } = await supabase
      .from('instance_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING');

    // Recent activity (instances created in last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const recentInstances = instances?.filter(
      (i) => new Date(i.created_at) >= yesterday
    ).length || 0;

    return NextResponse.json({
      stats,
      completion_rate: completionRate,
      average_completion_time_seconds: averageCompletionTime,
      pending_tasks_count: pendingTasksCount || 0,
      recent_instances_24h: recentInstances,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in monitoring/instances/stats GET:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
