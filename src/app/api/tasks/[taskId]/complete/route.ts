/**
 * Sprint 1d.4 - Layer 3: Task Completion API
 * Route: POST /api/tasks/[taskId]/complete
 * Validates output and marks task as completed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { validateAgainstSchema } from '@/lib/validators/schema-validator';
import type { CompleteTaskInput } from '@/lib/types/task';

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

/**
 * POST /api/tasks/[taskId]/complete
 * Complete a task with validated output
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
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

    const { taskId } = params;

    // Get stakeholder_id
    const { data: stakeholder, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (stakeholderError || !stakeholder) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }

    // Parse request body
    const input: CompleteTaskInput = await request.json();

    if (!input.output || typeof input.output !== 'object') {
      return NextResponse.json({ error: 'Invalid output data' }, { status: 400 });
    }

    // Fetch task with function registry details
    const { data: task, error: taskError } = await supabase
      .from('instance_tasks')
      .select(`
        *,
        function_registry!inner (
          output_schema
        )
      `)
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify task is assigned to current user
    if (task.assigned_to !== stakeholder.id) {
      return NextResponse.json({ error: 'Task not assigned to you' }, { status: 403 });
    }

    // Verify task is still pending
    if (task.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Task is already ${task.status.toLowerCase()}` },
        { status: 409 }
      );
    }

    // Get output schema from function registry
    const funcRegistry = Array.isArray(task.function_registry)
      ? task.function_registry[0]
      : task.function_registry;

    const outputSchema = funcRegistry?.output_schema;

    if (!outputSchema) {
      return NextResponse.json({ error: 'Function output schema not found' }, { status: 500 });
    }

    // Validate output against schema
    const validationResult = validateAgainstSchema(input.output, outputSchema);

    if (!validationResult.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Output validation failed',
          errors: validationResult.errors,
        },
        { status: 400 }
      );
    }

    // Update task to COMPLETED
    const { data: updatedTask, error: updateError } = await supabase
      .from('instance_tasks')
      .update({
        status: 'COMPLETED',
        output_data: input.output,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating task:', updateError);
      return NextResponse.json({ error: 'Failed to complete task' }, { status: 500 });
    }

    // Update instance_context with output data
    const { error: contextError } = await supabase.rpc('upsert_instance_context', {
      p_workflow_instance_id: task.workflow_instance_id,
      p_context_data: input.output,
    }).catch(() => {
      // Fallback: manual context update
      return supabase
        .from('instance_context')
        .select('*')
        .eq('workflow_instance_id', task.workflow_instance_id)
        .order('version', { ascending: false })
        .limit(1)
        .then(({ data }) => {
          const latestContext = data?.[0];
          const newContextData = {
            ...(latestContext?.context_data || {}),
            [task.node_id]: input.output,
          };

          return supabase.from('instance_context').insert([{
            app_code: task.app_code,
            workflow_instance_id: task.workflow_instance_id,
            context_data: newContextData,
            version: (latestContext?.version || 0) + 1,
          }]);
        });
    });

    // Log to workflow_history
    await supabase.from('workflow_history').insert([{
      app_code: task.app_code,
      workflow_instance_id: task.workflow_instance_id,
      event_type: 'TASK_COMPLETED',
      task_id: taskId,
      node_id: task.node_id,
      description: `Task ${task.function_code} completed by user`,
      metadata: { output: input.output },
      actor_id: stakeholder.id,
    }]);

    // TODO: Trigger workflow resumption (call workflow engine)
    // For now, this is a placeholder for future workflow engine integration

    return NextResponse.json({
      success: true,
      task_id: updatedTask.id,
      instance_id: updatedTask.workflow_instance_id,
      message: 'Task completed successfully',
    });
  } catch (error) {
    console.error('Error in tasks/[taskId]/complete POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
