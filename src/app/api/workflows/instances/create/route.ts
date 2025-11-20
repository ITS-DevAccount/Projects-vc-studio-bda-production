/**
 * Sprint 1d.4 Enhancement: Workflow Instance Creation API
 * POST /api/workflows/instances/create
 * Creates executable workflow instances from templates with stakeholder assignments
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getAppContext } from '@/lib/server/getAppUuid';
import type { CreateInstanceInput, CreateInstanceResponse } from '@/lib/types/workflow-instance';
import type { WorkflowNode } from '@/lib/types/workflow';

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

export async function POST(request: NextRequest) {
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

    // Parse request body
    const input: CreateInstanceInput = await request.json();

    if (!input.workflow_template_id) {
      return NextResponse.json(
        { error: 'workflow_template_id is required' },
        { status: 400 }
      );
    }

    if (!input.task_assignments || typeof input.task_assignments !== 'object') {
      return NextResponse.json(
        { error: 'task_assignments is required and must be an object' },
        { status: 400 }
      );
    }

    // Get app context from site settings
    const appContext = await getAppContext(accessToken);
    const app_code = appContext.site_code; // Use site_code as app_code

    // Fetch workflow template
    const { data: template, error: templateError } = await supabase
      .from('workflow_templates')
      .select('*')
      .eq('id', input.workflow_template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Workflow template not found' },
        { status: 404 }
      );
    }

    if (!template.definition || !template.definition.nodes) {
      return NextResponse.json(
        { error: 'Invalid workflow definition: missing nodes' },
        { status: 400 }
      );
    }

    const nodes: WorkflowNode[] = template.definition.nodes;

    // Extract TASK nodes that need stakeholder assignment
    const taskNodes = nodes.filter((node: WorkflowNode) => node.type === 'TASK');

    if (taskNodes.length === 0) {
      return NextResponse.json(
        { error: 'Workflow has no task nodes' },
        { status: 400 }
      );
    }

    // Validate stakeholder assignments for USER_TASK nodes
    const userTaskNodes = taskNodes.filter((node: WorkflowNode) => {
      // Lookup function_code to determine task type
      return node.function_code; // For now, assume all task nodes need assignment
    });

    const missingAssignments: string[] = [];

    for (const node of userTaskNodes) {
      if (!input.task_assignments[node.id]) {
        missingAssignments.push(`${node.label || node.id} (function: ${node.function_code})`);
      }
    }

    if (missingAssignments.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing stakeholder assignments for tasks',
          missing_tasks: missingAssignments,
        },
        { status: 400 }
      );
    }

    // Validate all assigned stakeholder IDs exist
    const stakeholderIds = Object.values(input.task_assignments).filter(Boolean);
    // Get unique stakeholder IDs (same person can be assigned to multiple tasks)
    const uniqueStakeholderIds = [...new Set(stakeholderIds)];

    if (uniqueStakeholderIds.length > 0) {
      console.log('Validating stakeholder IDs:', uniqueStakeholderIds);

      const { data: stakeholders, error: stakeholderError } = await supabase
        .from('stakeholders')
        .select('id')
        .in('id', uniqueStakeholderIds);

      console.log('Stakeholder validation result:', {
        found: stakeholders?.length,
        expected: uniqueStakeholderIds.length,
        error: stakeholderError
      });

      if (stakeholderError) {
        console.error('Error validating stakeholders:', stakeholderError);
        return NextResponse.json(
          {
            error: 'Failed to validate stakeholder IDs',
            details: stakeholderError.message
          },
          { status: 500 }
        );
      }

      if (!stakeholders || stakeholders.length !== uniqueStakeholderIds.length) {
        const foundIds = stakeholders?.map(s => s.id) || [];
        const missingIds = uniqueStakeholderIds.filter(id => !foundIds.includes(id));

        console.error('Invalid stakeholder IDs:', {
          requested: uniqueStakeholderIds,
          found: foundIds,
          missing: missingIds
        });

        return NextResponse.json(
          {
            error: 'One or more stakeholder IDs are invalid',
            requested: uniqueStakeholderIds,
            found: foundIds,
            missing: missingIds
          },
          { status: 400 }
        );
      }
    }

    // Find the first TASK node (after START)
    const startNode = nodes.find((n: WorkflowNode) => n.type === 'START');
    const transitions = template.definition.transitions || [];

    let firstTaskNodeId: string | null = null;
    if (startNode) {
      const firstTransition = transitions.find((t: any) => t.from_node_id === startNode.id);
      if (firstTransition) {
        const firstNode = nodes.find((n: WorkflowNode) => n.id === firstTransition.to_node_id);
        if (firstNode && firstNode.type === 'TASK') {
          firstTaskNodeId = firstNode.id;
        }
      }
    }

    // Create workflow instance (match actual table schema)
    const instanceData = {
      app_code,
      workflow_definition_id: template.id, // FK to workflow_templates
      workflow_code: template.template_code,
      current_node_id: firstTaskNodeId,
      status: 'RUNNING' as const,
      input_data: input.initial_context || {},
      initiated_by: user.id,
    };

    const { data: instance, error: instanceError } = await supabase
      .from('workflow_instances')
      .insert([instanceData])
      .select()
      .single();

    if (instanceError) {
      console.error('Error creating workflow instance:', instanceError);
      return NextResponse.json(
        { error: 'Failed to create workflow instance', details: instanceError.message },
        { status: 500 }
      );
    }

    // Create instance_tasks for each TASK node (match actual table schema)
    const tasksToCreate = taskNodes.map((node: WorkflowNode) => ({
      app_code: app_code,
      workflow_instance_id: instance.id,
      workflow_code: instance.workflow_code,
      function_code: node.function_code,
      node_id: node.id,
      task_type: 'USER_TASK' as const, // For now, assume all are USER_TASK
      status: node.id === firstTaskNodeId ? 'PENDING' : 'PENDING',
      assigned_to: input.task_assignments[node.id] || null,
      input_data: {},
    }));

    const { data: createdTasks, error: tasksError } = await supabase
      .from('instance_tasks')
      .insert(tasksToCreate)
      .select();

    if (tasksError) {
      console.error('Error creating instance tasks:', tasksError);

      // Rollback: delete the instance
      await supabase
        .from('workflow_instances')
        .delete()
        .eq('id', instance.id);

      return NextResponse.json(
        { error: 'Failed to create instance tasks', details: tasksError.message },
        { status: 500 }
      );
    }

    // Find the first task ID
    const firstTask = createdTasks?.find(t => t.node_id === firstTaskNodeId);

    // Log instance creation
    await supabase.from('workflow_history').insert([{
      app_code: app_code,
      workflow_instance_id: instance.id,
      event_type: 'INSTANCE_CREATED',
      node_id: startNode?.id || null,
      description: `Workflow instance created from template: ${template.name}`,
      metadata: {
        template_id: template.id,
        template_code: template.template_code,
        task_count: createdTasks?.length || 0,
        assignments: input.task_assignments,
      },
      actor_id: user.id,
    }]);

    const response: CreateInstanceResponse = {
      success: true,
      instance_id: instance.id,
      status: instance.status,
      first_task_id: firstTask?.id,
      message: `Workflow instance created successfully with ${createdTasks?.length || 0} tasks`,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error('Error in workflows/instances/create POST:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
