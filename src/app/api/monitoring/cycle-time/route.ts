/**
 * Sprint 1d.6: Monitoring - Cycle Time Reporting API
 * GET /api/monitoring/cycle-time
 * Calculates end-to-end workflow cycle time metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type {
  CycleTimeResponse,
  CycleTimeMetric,
  CycleTimeTrend,
  CycleTimeDistribution,
} from '@/lib/types/monitoring';

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

function getDurationBucket(durationSeconds: number): string {
  const hours = durationSeconds / 3600;
  const days = hours / 24;

  if (hours < 1) return '0-1h';
  if (hours < 4) return '1-4h';
  if (hours < 24) return '4-24h';
  if (days < 7) return '1-7d';
  return '7d+';
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

    // Get all workflow instances with their templates
    let query = supabase
      .from('workflow_instances')
      .select(`
        id,
        workflow_code,
        status,
        created_at,
        completed_at,
        workflow_templates:workflow_definition_id (
          id,
          template_code,
          name,
          workflow_type
        )
      `)
      .gte('created_at', startDateTime.toISOString())
      .lte('created_at', endDateTime.toISOString());

    const { data: instances, error: instancesError } = await query;

    if (instancesError) {
      console.error('Error fetching instances for cycle time:', instancesError);
      return NextResponse.json(
        { error: 'Failed to fetch instances', details: instancesError.message },
        { status: 500 }
      );
    }

    // Group instances by workflow type
    const instancesByType: Map<
      string,
      {
        workflow_type: string;
        workflow_name: string;
        durations: number[];
        completed: number;
        failed: number;
        running: number;
      }
    > = new Map();

    // Track trends by date
    const trendsByDate: Map<
      string,
      {
        date: string;
        durations: number[];
        completed: number;
        failed: number;
      }
    > = new Map();

    // Track distribution
    const distributionBuckets: Map<string, number> = new Map([
      ['0-1h', 0],
      ['1-4h', 0],
      ['4-24h', 0],
      ['1-7d', 0],
      ['7d+', 0],
    ]);

    for (const instance of instances || []) {
      const template = Array.isArray(instance.workflow_templates)
        ? instance.workflow_templates[0]
        : instance.workflow_templates;

      const instanceWorkflowType = template?.workflow_type || 'Unknown';
      const instanceWorkflowName = template?.name || instance.workflow_code;

      // Filter by workflow_type if specified
      if (workflowType && instanceWorkflowType !== workflowType) continue;

      // Initialize type group if needed
      if (!instancesByType.has(instanceWorkflowType)) {
        instancesByType.set(instanceWorkflowType, {
          workflow_type: instanceWorkflowType,
          workflow_name: instanceWorkflowName,
          durations: [],
          completed: 0,
          failed: 0,
          running: 0,
        });
      }

      const typeData = instancesByType.get(instanceWorkflowType)!;

      // Calculate duration if completed
      if (instance.completed_at && instance.created_at) {
        const start = new Date(instance.created_at).getTime();
        const end = new Date(instance.completed_at).getTime();
        const durationSeconds = Math.floor((end - start) / 1000);

        typeData.durations.push(durationSeconds);

        // Track for trends
        const dateKey = instance.created_at.split('T')[0]; // YYYY-MM-DD
        if (!trendsByDate.has(dateKey)) {
          trendsByDate.set(dateKey, {
            date: dateKey,
            durations: [],
            completed: 0,
            failed: 0,
          });
        }

        const trendData = trendsByDate.get(dateKey)!;
        trendData.durations.push(durationSeconds);

        // Track for distribution
        const bucket = getDurationBucket(durationSeconds);
        distributionBuckets.set(bucket, (distributionBuckets.get(bucket) || 0) + 1);
      }

      // Update status counters
      if (instance.status === 'COMPLETED') {
        typeData.completed++;
        if (instance.created_at) {
          const dateKey = instance.created_at.split('T')[0];
          if (trendsByDate.has(dateKey)) {
            trendsByDate.get(dateKey)!.completed++;
          }
        }
      } else if (instance.status === 'FAILED') {
        typeData.failed++;
        if (instance.created_at) {
          const dateKey = instance.created_at.split('T')[0];
          if (trendsByDate.has(dateKey)) {
            trendsByDate.get(dateKey)!.failed++;
          }
        }
      } else if (instance.status === 'RUNNING' || instance.status === 'SUSPENDED') {
        typeData.running++;
      }
    }

    // Calculate metrics for each workflow type
    const metrics: CycleTimeMetric[] = [];

    for (const [, typeData] of instancesByType) {
      const durations = typeData.durations;
      const totalInstances = typeData.completed + typeData.failed + typeData.running;

      if (totalInstances === 0) continue;

      const avgDuration =
        durations.length > 0
          ? Math.floor(durations.reduce((sum, d) => sum + d, 0) / durations.length)
          : 0;

      const medianDuration = calculatePercentile(durations, 50);
      const p95Duration = calculatePercentile(durations, 95);
      const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
      const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;

      metrics.push({
        workflow_type: typeData.workflow_type,
        workflow_name: typeData.workflow_name,
        total_instances: totalInstances,
        average_duration: avgDuration,
        median_duration: medianDuration,
        p95_duration: p95Duration,
        min_duration: minDuration,
        max_duration: maxDuration,
        completed_count: typeData.completed,
        failed_count: typeData.failed,
        running_count: typeData.running,
      });
    }

    // Sort by average duration descending
    metrics.sort((a, b) => b.average_duration - a.average_duration);

    // Build trends array
    const trends: CycleTimeTrend[] = Array.from(trendsByDate.entries())
      .map(([date, data]) => ({
        date,
        average_duration:
          data.durations.length > 0
            ? Math.floor(data.durations.reduce((sum, d) => sum + d, 0) / data.durations.length)
            : 0,
        instance_count: data.durations.length,
        completed_count: data.completed,
        failed_count: data.failed,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Build distribution array
    const totalDistributionCount = Array.from(distributionBuckets.values()).reduce(
      (sum, count) => sum + count,
      0
    );

    const distribution: CycleTimeDistribution[] = Array.from(
      distributionBuckets.entries()
    ).map(([bucket, count]) => ({
      duration_bucket: bucket,
      instance_count: count,
      percentage:
        totalDistributionCount > 0
          ? Math.round((count / totalDistributionCount) * 10000) / 100
          : 0,
    }));

    // Calculate overall stats
    const allDurations = metrics.flatMap((m) => m.total_instances > 0 ? [m.average_duration] : []);

    const overallAvgDuration =
      allDurations.length > 0
        ? Math.floor(allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length)
        : 0;

    const overallMedianDuration = calculatePercentile(
      metrics.flatMap((m) => Array(m.total_instances).fill(m.average_duration)),
      50
    );

    const response: CycleTimeResponse = {
      metrics,
      trends,
      distribution,
      overall_stats: {
        total_workflows: (instances || []).length,
        average_duration: overallAvgDuration,
        median_duration: overallMedianDuration,
        date_range: {
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
        },
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in monitoring/cycle-time GET:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
