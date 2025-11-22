/**
 * Sprint 1d.6: Monitoring - Bottleneck Analysis API
 * GET /api/monitoring/bottlenecks
 * Analyzes task performance to identify bottlenecks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { BottleneckAnalysisResponse, BottleneckMetric } from '@/lib/types/monitoring';

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function calculateStdDeviation(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const squareDiffs = values.map((value) => Math.pow(value - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const workflowType = searchParams.get('workflow_type');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const daysBack = parseInt(searchParams.get('days_back') || '30');

    // Default date range: last N days
    const endDateTime = endDate ? new Date(endDate) : new Date();
    const startDateTime = startDate
      ? new Date(startDate)
      : new Date(endDateTime.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Get all completed tasks with their workflow info
    const { data: tasks, error: tasksError } = await supabase
      .from('instance_tasks')
      .select(`
        id,
        node_id,
        function_code,
        task_type,
        status,
        created_at,
        completed_at,
        workflow_instance:workflow_instance_id (
          id,
          workflow_code,
          workflow_templates:workflow_definition_id (
            workflow_type,
            name,
            definition
          )
        )
      `)
      .in('status', ['COMPLETED', 'FAILED'])
      .gte('created_at', startDateTime.toISOString())
      .lte('created_at', endDateTime.toISOString());

    if (tasksError) {
      console.error('Error fetching tasks for bottleneck analysis:', tasksError);
      return NextResponse.json(
        { error: 'Failed to fetch tasks', details: tasksError.message },
        { status: 500 }
      );
    }

    // Group tasks by node_id and workflow_type
    const tasksByNode: Map<
      string,
      {
        node_id: string;
        node_name: string;
        function_code: string;
        workflow_type: string;
        durations: number[];
        completed: number;
        failed: number;
      }
    > = new Map();

    for (const task of tasks || []) {
      const instance = Array.isArray(task.workflow_instance)
        ? task.workflow_instance[0]
        : task.workflow_instance;

      if (!instance) continue;

      const template = Array.isArray(instance.workflow_templates)
        ? instance.workflow_templates[0]
        : instance.workflow_templates;

      const taskWorkflowType = template?.workflow_type || 'Unknown';

      // Filter by workflow_type if specified
      if (workflowType && taskWorkflowType !== workflowType) continue;

      // Get node name from template definition
      let nodeName = task.node_id;
      if (template?.definition?.nodes) {
        const node = template.definition.nodes.find((n: any) => n.id === task.node_id);
        nodeName = node?.label || task.node_id;
      }

      // Create unique key: workflow_type + node_id
      const key = `${taskWorkflowType}:${task.node_id}`;

      if (!tasksByNode.has(key)) {
        tasksByNode.set(key, {
          node_id: task.node_id,
          node_name: nodeName,
          function_code: task.function_code,
          workflow_type: taskWorkflowType,
          durations: [],
          completed: 0,
          failed: 0,
        });
      }

      const nodeData = tasksByNode.get(key)!;

      // Calculate duration if task is completed
      if (task.completed_at && task.created_at) {
        const start = new Date(task.created_at).getTime();
        const end = new Date(task.completed_at).getTime();
        const durationSeconds = Math.floor((end - start) / 1000);
        nodeData.durations.push(durationSeconds);
      }

      // Update counters
      if (task.status === 'COMPLETED') {
        nodeData.completed++;
      } else if (task.status === 'FAILED') {
        nodeData.failed++;
      }
    }

    // Calculate metrics for each node
    const bottlenecks: BottleneckMetric[] = [];

    for (const [, nodeData] of tasksByNode) {
      const totalExecutions = nodeData.completed + nodeData.failed;
      if (totalExecutions === 0) continue;

      const durations = nodeData.durations;
      const avgDuration =
        durations.length > 0
          ? Math.floor(durations.reduce((sum, d) => sum + d, 0) / durations.length)
          : 0;

      const medianDuration = calculatePercentile(durations, 50);
      const p95Duration = calculatePercentile(durations, 95);
      const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
      const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
      const stdDeviation = calculateStdDeviation(durations, avgDuration);

      const failureRate =
        totalExecutions > 0 ? (nodeData.failed / totalExecutions) * 100 : 0;

      bottlenecks.push({
        node_id: nodeData.node_id,
        node_name: nodeData.node_name,
        function_code: nodeData.function_code,
        workflow_type: nodeData.workflow_type,
        total_executions: totalExecutions,
        average_duration: avgDuration,
        median_duration: medianDuration,
        p95_duration: p95Duration,
        min_duration: minDuration,
        max_duration: maxDuration,
        std_deviation: Math.floor(stdDeviation),
        completed_count: nodeData.completed,
        failed_count: nodeData.failed,
        failure_rate: Math.round(failureRate * 100) / 100,
      });
    }

    // Sort by average duration descending (slowest first)
    bottlenecks.sort((a, b) => b.average_duration - a.average_duration);

    // Group by workflow type
    const byWorkflowType: Record<string, BottleneckMetric[]> = {};
    for (const metric of bottlenecks) {
      if (!byWorkflowType[metric.workflow_type]) {
        byWorkflowType[metric.workflow_type] = [];
      }
      byWorkflowType[metric.workflow_type].push(metric);
    }

    // Calculate overall stats
    const totalWorkflows = new Set(
      (tasks || []).map((t) => {
        const instance = Array.isArray(t.workflow_instance)
          ? t.workflow_instance[0]
          : t.workflow_instance;
        return instance?.id;
      })
    ).size;

    const allDurations = bottlenecks.flatMap((b) => {
      return Array(b.total_executions).fill(b.average_duration);
    });

    const overallAvgDuration =
      allDurations.length > 0
        ? Math.floor(allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length)
        : 0;

    const response: BottleneckAnalysisResponse = {
      bottlenecks,
      by_workflow_type: byWorkflowType,
      overall_stats: {
        total_workflows: totalWorkflows,
        total_tasks: (tasks || []).length,
        average_workflow_duration: overallAvgDuration,
        date_range: {
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
        },
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in monitoring/bottlenecks GET:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
