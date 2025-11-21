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

    // 2. Fetch all tasks for this instance (simple query without any joins)
    const { data: tasks, error: tasksError } = await supabase
      .from('instance_tasks')
      .select('*')
      .eq('workflow_instance_id', instanceId)
      .order('created_at', { ascending: true });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
    }

    const tasksList = tasks || [];

    console.log(`[Instance Status API] Instance: ${instanceId}, Found ${tasksList.length} created tasks`);
    tasksList.forEach(t => {
      console.log(`  - Task ${t.id.slice(0,8)}: node_id=${t.node_id}, status=${t.status}`);
    });

    // 3. Get template and workflow definition
    const template = Array.isArray(instance.workflow_templates)
      ? instance.workflow_templates[0]
      : instance.workflow_templates;

    const workflowDef = template?.definition || { nodes: [] };

    // 4. Get all TASK nodes from workflow definition
    const taskNodes = workflowDef.nodes?.filter((n: any) => n.type === 'TASK') || [];
    const totalTasksInDefinition = taskNodes.length;

    console.log(`[Instance Status API] Found ${totalTasksInDefinition} TASK nodes in workflow definition`);
    taskNodes.forEach((n: any) => {
      console.log(`  - Node ${n.id}: ${n.label || n.function_code}`);
    });

    // 5. Get task assignments from instance input_data
    const taskAssignments = instance.input_data?._task_assignments || {};

    // 6. Fetch all stakeholder and function data upfront (prevent N+1 queries)
    const allStakeholderIds = new Set<string>();
    const allFunctionCodes = new Set<string>();

    // Collect all stakeholder IDs and function codes
    tasksList.forEach(task => {
      if (task.assigned_to) allStakeholderIds.add(task.assigned_to);
      if (task.function_code) allFunctionCodes.add(task.function_code);
    });
    Object.values(taskAssignments).forEach((stakeholderId: any) => {
      if (stakeholderId) allStakeholderIds.add(stakeholderId);
    });
    taskNodes.forEach((node: any) => {
      if (node.function_code) allFunctionCodes.add(node.function_code);
    });

    // Fetch all stakeholders in ONE query
    const stakeholdersMap = new Map();
    if (allStakeholderIds.size > 0) {
      const { data: stakeholders } = await supabase
        .from('stakeholders')
        .select('id, name, email')
        .in('id', Array.from(allStakeholderIds));

      if (stakeholders) {
        stakeholders.forEach(s => stakeholdersMap.set(s.id, s));
      }
    }

    // Fetch all function registry entries in ONE query
    const functionsMap = new Map();
    if (allFunctionCodes.size > 0) {
      const { data: functions } = await supabase
        .from('function_registry')
        .select('function_code, description')
        .in('function_code', Array.from(allFunctionCodes));

      if (functions) {
        functions.forEach(f => functionsMap.set(f.function_code, f));
      }
    }

    // 7. Create task list showing ALL tasks from definition (created or not)
    const allTasks = taskNodes.map((taskNode: any) => {
      // Find matching created instance_task
      const createdTask = tasksList.find(t => t.node_id === taskNode.id);

      console.log(`[Instance Status API] Matching node ${taskNode.id}: ${createdTask ? `FOUND (${createdTask.status})` : 'NOT FOUND'}`);

      if (createdTask) {
        // Task has been created - lookup related data from maps
        let assignedToName = 'Unassigned';
        let assignedToEmail = '';
        let taskDescription = taskNode.label || createdTask.function_code;

        // Lookup stakeholder info from map
        if (createdTask.assigned_to) {
          const stakeholder = stakeholdersMap.get(createdTask.assigned_to);
          if (stakeholder) {
            assignedToName = stakeholder.name || 'Unknown';
            assignedToEmail = stakeholder.email || '';
          }
        }

        // Lookup function description from map
        if (createdTask.function_code) {
          const func = functionsMap.get(createdTask.function_code);
          if (func?.description) {
            taskDescription = func.description;
          }
        }

        return {
          task_id: createdTask.id,
          node_id: createdTask.node_id,
          function_code: createdTask.function_code,
          task_name: taskDescription,
          task_type: createdTask.task_type,
          status: createdTask.status,
          assigned_to_id: createdTask.assigned_to,
          assigned_to_name: assignedToName,
          assigned_to_email: assignedToEmail,
          input_data: createdTask.input_data,
          output_data: createdTask.output_data,
          created_at: createdTask.created_at,
          started_at: createdTask.started_at,
          completed_at: createdTask.completed_at,
          error_message: createdTask.error_message,
        };
      } else {
        // Task not created yet - return placeholder with expected assignment
        const expectedAssignmentId = taskAssignments[taskNode.id];
        let assignedToName = 'Not assigned';
        let assignedToEmail = '';

        // Look up stakeholder name from map
        if (expectedAssignmentId) {
          const stakeholder = stakeholdersMap.get(expectedAssignmentId);
          if (stakeholder) {
            assignedToName = stakeholder.name || 'Unknown';
            assignedToEmail = stakeholder.email || '';
          }
        }

        return {
          task_id: null,
          node_id: taskNode.id,
          function_code: taskNode.function_code,
          task_name: taskNode.label || taskNode.function_code,
          task_type: 'USER_TASK',
          status: 'NOT_STARTED',
          assigned_to_id: expectedAssignmentId || null,
          assigned_to_name: assignedToName,
          assigned_to_email: assignedToEmail,
          input_data: {},
          output_data: null,
          created_at: null,
          started_at: null,
          completed_at: null,
          error_message: null,
        };
      }
    });

    // 8. Calculate progress
    const completedTasks = allTasks.filter((t: any) => t.status === 'COMPLETED').length;
    const progressPercentage = totalTasksInDefinition > 0 ? Math.round((completedTasks / totalTasksInDefinition) * 100) : 0;

    // 9. Find current node name from workflow definition
    const currentNode = workflowDef.nodes?.find((n: any) => n.id === instance.current_node_id);

    // 10. Format response
    const response = NextResponse.json({
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
      tasks: allTasks,
      created_at: instance.initiated_at || instance.created_at,
      updated_at: instance.updated_at,
      completed_at: instance.completed_at,
      error_message: instance.error_message,
    });

    // Prevent caching to ensure fresh data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');

    return response;
  } catch (error: any) {
    console.error('Error in workflows/instances/[instanceId]/status GET:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
