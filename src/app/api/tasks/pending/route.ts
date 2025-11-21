/**
 * Sprint 1d.4 - Layer 3: Task Execution API
 * Route: GET /api/tasks/pending
 * Returns pending tasks for current user with function registry details
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

/**
 * GET /api/tasks/pending
 * Get all pending tasks assigned to current user
 */
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

    // Get stakeholder_id from auth user
    const { data: stakeholder, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (stakeholderError || !stakeholder) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }

    // Fetch pending tasks assigned to this user (simple query without FK joins)
    const { data: tasks, error: tasksError } = await supabase
      .from('instance_tasks')
      .select('*')
      .eq('assigned_to', stakeholder.id)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true });

    if (tasksError) {
      console.error('Error fetching pending tasks:', tasksError);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    const tasksList = tasks || [];

    // Collect all unique function codes and workflow instance IDs
    const functionCodes = new Set<string>();
    const instanceIds = new Set<string>();
    tasksList.forEach(task => {
      if (task.function_code) functionCodes.add(task.function_code);
      if (task.workflow_instance_id) instanceIds.add(task.workflow_instance_id);
    });

    // Fetch all function registry entries in ONE query
    const functionsMap = new Map();
    if (functionCodes.size > 0) {
      const { data: functions } = await supabase
        .from('function_registry')
        .select('function_code, description, input_schema, output_schema, ui_widget_id, ui_definitions')
        .in('function_code', Array.from(functionCodes));

      if (functions) {
        functions.forEach(f => functionsMap.set(f.function_code, f));
      }
    }

    // Fetch all workflow instances in ONE query
    const instancesMap = new Map();
    const workflowDefIds = new Set<string>();
    if (instanceIds.size > 0) {
      const { data: instances } = await supabase
        .from('workflow_instances')
        .select('id, instance_name, workflow_code, workflow_definition_id')
        .in('id', Array.from(instanceIds));

      if (instances) {
        instances.forEach(i => {
          instancesMap.set(i.id, i);
          if (i.workflow_definition_id) workflowDefIds.add(i.workflow_definition_id);
        });
      }
    }

    // Fetch all workflow templates in ONE query
    const templatesMap = new Map();
    if (workflowDefIds.size > 0) {
      const { data: templates } = await supabase
        .from('workflow_templates')
        .select('id, name')
        .in('id', Array.from(workflowDefIds));

      if (templates) {
        templates.forEach(t => templatesMap.set(t.id, t));
      }
    }

    // Transform data using maps (no more FK joins)
    const formattedTasks = tasksList.map((task: any) => {
      const funcRegistry = functionsMap.get(task.function_code);
      const workflowInstance = instancesMap.get(task.workflow_instance_id);
      const workflowTemplate = workflowInstance?.workflow_definition_id
        ? templatesMap.get(workflowInstance.workflow_definition_id)
        : null;

      return {
        // Task fields
        id: task.id,
        app_code: task.app_code,
        workflow_instance_id: task.workflow_instance_id,
        workflow_code: task.workflow_code,
        function_code: task.function_code,
        node_id: task.node_id,
        task_type: task.task_type,
        status: task.status,
        input_data: task.input_data,
        output_data: task.output_data,
        assigned_to: task.assigned_to,
        assigned_at: task.assigned_at,
        started_at: task.started_at,
        completed_at: task.completed_at,
        error_message: task.error_message,
        created_at: task.created_at,
        updated_at: task.updated_at,
        is_active: task.is_active,

        // Function registry fields
        description: funcRegistry?.description || null,
        input_schema: funcRegistry?.input_schema || {},
        output_schema: funcRegistry?.output_schema || {},
        ui_widget_id: funcRegistry?.ui_widget_id || null,
        ui_definitions: funcRegistry?.ui_definitions || {},

        // Workflow instance fields
        instance_name: workflowInstance?.instance_name || null,
        workflow_template_name: workflowTemplate?.name || 'Unknown Workflow',
      };
    });

    return NextResponse.json({
      tasks: formattedTasks,
      count: formattedTasks.length,
    });
  } catch (error) {
    console.error('Error in tasks/pending GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
