/**
 * Sprint 1d.6: Monitoring - List Workflow Instances API
 * GET /api/monitoring/instances
 * Returns enriched list of workflow instances with metrics and filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { MonitoringInstancesResponse, MonitoringInstanceSummary } from '@/lib/types/monitoring';

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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status')?.split(',') || [];
    const workflowType = searchParams.get('workflow_type')?.split(',') || [];
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '100');
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = (searchParams.get('sort_order') || 'desc') as 'asc' | 'desc';

    // Build base query
    let query = supabase
      .from('workflow_instances')
      .select(`
        *,
        workflow_templates:workflow_definition_id (
          id,
          template_code,
          name,
          workflow_type,
          definition
        )
      `);

    // Apply filters
    if (status.length > 0) {
      query = query.in('status', status);
    }

    if (search) {
      query = query.or(`instance_name.ilike.%${search}%,workflow_code.ilike.%${search}%`);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Apply sorting
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending }).limit(limit);

    const { data: instances, error: instancesError } = await query;

    if (instancesError) {
      console.error('Error fetching workflow instances:', instancesError);
      return NextResponse.json(
        { error: 'Failed to fetch workflow instances', details: instancesError.message },
        { status: 500 }
      );
    }

    // Enrich instances with task metrics
    const enrichedInstances: MonitoringInstanceSummary[] = await Promise.all(
      (instances || []).map(async (instance) => {
        const template = Array.isArray(instance.workflow_templates)
          ? instance.workflow_templates[0]
          : instance.workflow_templates;

        // Filter by workflow_type if specified
        if (workflowType.length > 0 && template && !workflowType.includes(template.workflow_type)) {
          return null;
        }

        // Get task counts and stats
        const { data: tasks } = await supabase
          .from('instance_tasks')
          .select('id, status, node_id, created_at, completed_at')
          .eq('workflow_instance_id', instance.id);

        const completedTasks = tasks?.filter((t) => t.status === 'COMPLETED').length || 0;
        const pendingTasks = tasks?.filter((t) => t.status === 'PENDING').length || 0;
        const failedTasks = tasks?.filter((t) => t.status === 'FAILED').length || 0;

        // Count total TASK nodes from workflow definition
        const taskNodes = template?.definition?.nodes?.filter((n: any) => n.type === 'TASK') || [];
        const totalTasks = taskNodes.length;

        // Find current node name
        let currentNodeName = instance.current_node_id;
        if (template?.definition?.nodes && instance.current_node_id) {
          const currentNode = template.definition.nodes.find(
            (n: any) => n.id === instance.current_node_id
          );
          if (currentNode) {
            currentNodeName = currentNode.label || currentNode.id;
          }
        }

        // Calculate elapsed time
        const createdAt = new Date(instance.created_at);
        const endTime = instance.completed_at ? new Date(instance.completed_at) : new Date();
        const elapsedSeconds = Math.floor((endTime.getTime() - createdAt.getTime()) / 1000);

        // Get next assigned user (if any pending task)
        const pendingTask = tasks?.find((t) => t.status === 'PENDING');
        let nextAssignedTo: string | undefined;
        let nextAssignedToName: string | undefined;

        if (pendingTask) {
          const { data: taskDetails } = await supabase
            .from('instance_tasks')
            .select('assigned_to, stakeholders:assigned_to(id, name)')
            .eq('id', pendingTask.id)
            .single();

          if (taskDetails?.assigned_to) {
            nextAssignedTo = taskDetails.assigned_to;
            const stakeholder = Array.isArray(taskDetails.stakeholders)
              ? taskDetails.stakeholders[0]
              : taskDetails.stakeholders;
            nextAssignedToName = stakeholder?.name || 'Unknown';
          }
        }

        return {
          id: instance.id,
          instance_name: instance.instance_name,
          workflow_code: instance.workflow_code,
          workflow_name: template?.name || instance.workflow_code,
          workflow_type: template?.workflow_type || 'Unknown',
          status: instance.status,
          current_node_id: instance.current_node_id,
          current_node_name: currentNodeName,

          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          pending_tasks: pendingTasks,
          failed_tasks: failedTasks,
          progress_percentage:
            totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,

          created_at: instance.created_at,
          updated_at: instance.updated_at,
          completed_at: instance.completed_at,
          elapsed_seconds: elapsedSeconds,

          next_assigned_to: nextAssignedTo,
          next_assigned_to_name: nextAssignedToName,
        } as MonitoringInstanceSummary;
      })
    );

    // Filter out null entries (from workflow_type filtering)
    const filteredInstances = enrichedInstances.filter((i) => i !== null) as MonitoringInstanceSummary[];

    // Calculate stats
    const stats = {
      running: filteredInstances.filter((i) => i.status === 'RUNNING').length,
      completed: filteredInstances.filter((i) => i.status === 'COMPLETED').length,
      failed: filteredInstances.filter((i) => i.status === 'FAILED').length,
      suspended: filteredInstances.filter((i) => i.status === 'SUSPENDED').length,
    };

    const response: MonitoringInstancesResponse = {
      instances: filteredInstances,
      count: filteredInstances.length,
      stats,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in monitoring/instances GET:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
