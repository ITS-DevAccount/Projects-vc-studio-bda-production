/**
 * Sprint 1d.4 Fix: Workflow Instance Status API
 * GET /api/workflows/instances/[instanceId]/status
 * Returns detailed status of a workflow instance including all tasks
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
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

    const { instanceId } = await params;

    // 1. Fetch workflow instance with template details
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
      console.error('Error fetching instance:', instanceError);
      return NextResponse.json(
        { error: 'Workflow instance not found' },
        { status: 404 }
      );
    }

    // 2. Fetch all tasks for this instance with stakeholder details
    const { data: tasks, error: tasksError } = await supabase
      .from('instance_tasks')
      .select(`
        *,
        function_registry:function_code (
          function_code,
          description
        ),
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
    }

    const tasksList = tasks || [];

    // 3. Get template and workflow definition
    const template = Array.isArray(instance.workflow_templates)
      ? instance.workflow_templates[0]
      : instance.workflow_templates;

    const workflowDef = template?.definition || { nodes: [] };

    // 4. Calculate progress based on total TASK nodes in definition (not just created tasks)
    const taskNodes = workflowDef.nodes?.filter((n: any) => n.type === 'TASK') || [];
    const totalTasksInDefinition = taskNodes.length;
    const completedTasks = tasksList.filter(t => t.status === 'COMPLETED').length;
    const progressPercentage = totalTasksInDefinition > 0 ? Math.round((completedTasks / totalTasksInDefinition) * 100) : 0;

    // 5. Find current node name from workflow definition
    const currentNode = workflowDef.nodes?.find((n: any) => n.id === instance.current_node_id);

    // 5. Format response
    return NextResponse.json({
      instance_id: instance.id,
      workflow_code: instance.workflow_code,
      workflow_name: template?.name || 'Unknown',
      instance_name: instance.instance_name,
      workflow_type: template?.workflow_type || 'Unknown',
      status: instance.status,
      current_node_id: instance.current_node_id,
      current_node_name: currentNode?.label || currentNode?.name || 'Unknown',
      progress_percentage: progressPercentage,
      completed_tasks: completedTasks,
      total_tasks: totalTasksInDefinition,
      tasks: tasksList.map((t: any) => ({
        task_id: t.id,
        node_id: t.node_id,
        function_code: t.function_code,
        task_name: t.function_registry?.description || t.function_code,
        task_type: t.task_type,
        status: t.status,
        assigned_to_id: t.assigned_to,
        assigned_to_name: t.stakeholders?.name || 'Unassigned',
        assigned_to_email: t.stakeholders?.email || '',
        input_data: t.input_data,
        output_data: t.output_data,
        created_at: t.created_at,
        started_at: t.started_at,
        completed_at: t.completed_at,
        error_message: t.error_message,
      })),
      created_at: instance.initiated_at || instance.created_at,
      updated_at: instance.updated_at,
      completed_at: instance.completed_at,
      error_message: instance.error_message,
    });
  } catch (error: any) {
    console.error('Error in workflows/instances/[instanceId]/status GET:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
