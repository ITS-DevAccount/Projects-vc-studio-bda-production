/**
 * Sprint 1d.6: Monitoring - Instance Details API
 * GET /api/monitoring/instances/:instanceId
 * Returns comprehensive details for a single workflow instance
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { InstanceDetailsResponse, InstanceTaskDetail, InstanceExecutionPath } from '@/lib/types/monitoring';

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;
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

    // Get workflow instance with template
    const { data: instance, error: instanceError } = await supabase
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
      `)
      .eq('id', instanceId)
      .single();

    if (instanceError || !instance) {
      return NextResponse.json(
        { error: 'Workflow instance not found', details: instanceError?.message },
        { status: 404 }
      );
    }

    const template = Array.isArray(instance.workflow_templates)
      ? instance.workflow_templates[0]
      : instance.workflow_templates;

    // Get all tasks for this instance
    const { data: tasks, error: tasksError } = await supabase
      .from('instance_tasks')
      .select(`
        *,
        stakeholders:assigned_to (
          id,
          name,
          email
        )
      `)
      .eq('workflow_instance_id', instanceId)
      .order('created_at', { ascending: true });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return NextResponse.json(
        { error: 'Failed to fetch tasks', details: tasksError.message },
        { status: 500 }
      );
    }

    // Enrich tasks with node names and duration
    const taskDetails: InstanceTaskDetail[] = (tasks || []).map((task) => {
      const node = template?.definition?.nodes?.find((n: any) => n.id === task.node_id);
      const nodeName = node?.label || task.node_id;

      const stakeholder = Array.isArray(task.stakeholders)
        ? task.stakeholders[0]
        : task.stakeholders;

      let durationSeconds: number | undefined;
      if (task.completed_at && task.created_at) {
        const start = new Date(task.created_at).getTime();
        const end = new Date(task.completed_at).getTime();
        durationSeconds = Math.floor((end - start) / 1000);
      }

      return {
        id: task.id,
        node_id: task.node_id,
        node_name: nodeName,
        function_code: task.function_code,
        task_type: task.task_type,
        status: task.status,
        assigned_to: task.assigned_to,
        assigned_to_name: stakeholder?.name,
        input_data: task.input_data || {},
        output_data: task.output_data,
        context: task.context || {},
        created_at: task.created_at,
        updated_at: task.updated_at,
        started_at: task.started_at,
        completed_at: task.completed_at,
        duration_seconds: durationSeconds,
        error_message: task.error_message,
      };
    });

    // Build execution path from workflow_history
    const { data: historyEvents } = await supabase
      .from('workflow_history')
      .select('*')
      .eq('workflow_instance_id', instanceId)
      .eq('event_type', 'NODE_TRANSITION')
      .order('event_timestamp', { ascending: true });

    const executionPath: InstanceExecutionPath[] = [];

    if (historyEvents && historyEvents.length > 0) {
      for (let i = 0; i < historyEvents.length; i++) {
        const event = historyEvents[i];
        const nodeId = event.new_state?.node_id || event.node_id;
        const node = template?.definition?.nodes?.find((n: any) => n.id === nodeId);

        const enteredAt = event.event_timestamp;
        const nextEvent = historyEvents[i + 1];
        const exitedAt = nextEvent?.event_timestamp;

        let durationSeconds: number | undefined;
        if (exitedAt) {
          const start = new Date(enteredAt).getTime();
          const end = new Date(exitedAt).getTime();
          durationSeconds = Math.floor((end - start) / 1000);
        }

        executionPath.push({
          node_id: nodeId,
          node_name: node?.label || nodeId,
          node_type: node?.type || 'TASK',
          entered_at: enteredAt,
          exited_at: exitedAt,
          duration_seconds: durationSeconds,
        });
      }
    } else {
      // Fallback: build from current state
      if (instance.current_node_id) {
        const currentNode = template?.definition?.nodes?.find(
          (n: any) => n.id === instance.current_node_id
        );
        executionPath.push({
          node_id: instance.current_node_id,
          node_name: currentNode?.label || instance.current_node_id,
          node_type: currentNode?.type || 'TASK',
          entered_at: instance.updated_at,
        });
      }
    }

    // Calculate metrics
    const completedTasks = taskDetails.filter((t) => t.status === 'COMPLETED').length;
    const pendingTasks = taskDetails.filter((t) => t.status === 'PENDING').length;
    const failedTasks = taskDetails.filter((t) => t.status === 'FAILED').length;

    const completedTaskDurations = taskDetails
      .filter((t) => t.duration_seconds !== undefined)
      .map((t) => t.duration_seconds!);

    const averageTaskDuration =
      completedTaskDurations.length > 0
        ? Math.floor(
            completedTaskDurations.reduce((sum, d) => sum + d, 0) / completedTaskDurations.length
          )
        : 0;

    // Calculate elapsed time
    const createdAt = new Date(instance.created_at);
    const endTime = instance.completed_at ? new Date(instance.completed_at) : new Date();
    const elapsedSeconds = Math.floor((endTime.getTime() - createdAt.getTime()) / 1000);

    const response: InstanceDetailsResponse = {
      instance: {
        id: instance.id,
        instance_name: instance.instance_name,
        workflow_code: instance.workflow_code,
        status: instance.status,
        current_node_id: instance.current_node_id,
        created_at: instance.created_at,
        updated_at: instance.updated_at,
        completed_at: instance.completed_at,
        elapsed_seconds: elapsedSeconds,
        instance_context: instance.instance_context || {},
        initial_context: instance.initial_context,
      },
      template: {
        id: template?.id || '',
        template_code: template?.template_code || '',
        name: template?.name || '',
        workflow_type: template?.workflow_type || '',
        definition: template?.definition || {},
      },
      tasks: taskDetails,
      execution_path: executionPath,
      metrics: {
        total_tasks: taskDetails.length,
        completed_tasks: completedTasks,
        pending_tasks: pendingTasks,
        failed_tasks: failedTasks,
        average_task_duration: averageTaskDuration,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in monitoring/instances/:instanceId GET:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
