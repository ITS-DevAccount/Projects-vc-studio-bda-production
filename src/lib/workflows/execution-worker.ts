/**
 * Sprint 1d.4 - Workflow Execution Worker
 * Processes workflow_execution_queue to advance workflows after task completion
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create Supabase client with service role (bypasses RLS)
const getServiceClient = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not configured for workflow worker');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
};

/**
 * Process a single workflow execution queue item
 */
export async function processQueueItem(queueId: string): Promise<boolean> {
  const supabase = getServiceClient();

  try {
    console.log(`[Workflow Worker] Processing queue item: ${queueId}`);

    // Get queue item
    const { data: queueItem, error: queueError } = await supabase
      .from('workflow_execution_queue')
      .select('*')
      .eq('queue_id', queueId)
      .single();

    if (queueError || !queueItem) {
      console.error('[Workflow Worker] Queue item not found:', queueError);
      return false;
    }

    // Skip if already processing or completed
    if (queueItem.status !== 'PENDING') {
      console.log(`[Workflow Worker] Queue item ${queueId} already ${queueItem.status}`);
      return false;
    }

    // Mark as processing
    await supabase
      .from('workflow_execution_queue')
      .update({ status: 'PROCESSING' })
      .eq('queue_id', queueId);

    // Get workflow instance with template
    const { data: instance, error: instanceError } = await supabase
      .from('workflow_instances')
      .select(`
        *,
        workflow_templates:workflow_definition_id (
          id,
          template_code,
          name,
          definition
        )
      `)
      .eq('id', queueItem.workflow_instance_id)
      .single();

    if (instanceError || !instance) {
      throw new Error(`Workflow instance not found: ${queueItem.workflow_instance_id}`);
    }

    // Get template (handle both array and object formats)
    const template = Array.isArray(instance.workflow_templates)
      ? instance.workflow_templates[0]
      : instance.workflow_templates;

    if (!template || !template.definition) {
      throw new Error('Workflow template or definition not found');
    }

    const definition = template.definition;

    // Find current node
    const currentNode = definition.nodes?.find(
      (n: any) => n.id === instance.current_node_id
    );

    if (!currentNode) {
      throw new Error(`Current node not found: ${instance.current_node_id}`);
    }

    console.log(`[Workflow Worker] Current node: ${currentNode.id} (${currentNode.type})`);

    // Find transitions from current node
    const transitions = definition.transitions?.filter(
      (t: any) => t.from_node_id === instance.current_node_id
    ) || [];

    if (transitions.length === 0) {
      console.log('[Workflow Worker] No transitions from current node - marking instance as completed');
      await supabase
        .from('workflow_instances')
        .update({
          status: 'COMPLETED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', instance.id);

      await supabase
        .from('workflow_execution_queue')
        .update({
          status: 'COMPLETED',
          processed_at: new Date().toISOString(),
        })
        .eq('queue_id', queueId);

      return true;
    }

    // Get latest instance context for condition evaluation
    const { data: contextData } = await supabase
      .from('instance_context')
      .select('*')
      .eq('workflow_instance_id', instance.id)
      .order('version', { ascending: false })
      .limit(1);

    const context = contextData?.[0]?.context_data || {};

    // Evaluate transitions and take first matching one
    let transitioned = false;

    for (const transition of transitions) {
      const shouldTransition = evaluateCondition(transition.condition, context);

      if (shouldTransition) {
        const nextNode = definition.nodes?.find(
          (n: any) => n.id === transition.to_node_id
        );

        if (!nextNode) {
          console.error(`[Workflow Worker] Next node not found: ${transition.to_node_id}`);
          continue;
        }

        console.log(`[Workflow Worker] Transitioning from ${currentNode.id} to ${nextNode.id}`);

        // Update workflow instance
        await supabase
          .from('workflow_instances')
          .update({
            current_node_id: nextNode.id,
            status: nextNode.type === 'END' ? 'COMPLETED' : 'RUNNING',
            updated_at: new Date().toISOString(),
          })
          .eq('id', instance.id);

        // Log transition in workflow_history
        await supabase.from('workflow_history').insert([{
          app_code: instance.app_code,
          workflow_instance_id: instance.id,
          event_type: 'TRANSITION',
          node_id: nextNode.id,
          description: `Transitioned from ${currentNode.id} to ${nextNode.id}`,
          metadata: {
            from_node_id: currentNode.id,
            to_node_id: nextNode.id,
            condition: transition.condition,
          },
        }]);

        // If next node is a TASK node, create instance_task
        if (nextNode.type === 'TASK' && nextNode.function_code) {
          console.log(`[Workflow Worker] Creating task for node: ${nextNode.id}`);
          await createInstanceTask(instance, nextNode);
        }

        // If next node is END, log completion
        if (nextNode.type === 'END') {
          console.log(`[Workflow Worker] Workflow completed: ${instance.id}`);
          await supabase.from('workflow_history').insert([{
            app_code: instance.app_code,
            workflow_instance_id: instance.id,
            event_type: 'WORKFLOW_COMPLETED',
            node_id: nextNode.id,
            description: `Workflow completed successfully`,
            metadata: {},
          }]);
        }

        transitioned = true;
        break; // Take first matching transition
      }
    }

    if (!transitioned) {
      console.warn(`[Workflow Worker] No transitions matched for node: ${currentNode.id}`);
    }

    // Mark queue item as completed
    await supabase
      .from('workflow_execution_queue')
      .update({
        status: 'COMPLETED',
        processed_at: new Date().toISOString(),
      })
      .eq('queue_id', queueId);

    console.log(`[Workflow Worker] Queue item ${queueId} processed successfully`);
    return true;

  } catch (error: any) {
    console.error(`[Workflow Worker] Error processing queue item ${queueId}:`, error);

    // Mark as failed
    const supabase = getServiceClient();
    await supabase
      .from('workflow_execution_queue')
      .update({
        status: 'FAILED',
        error_message: error.message || 'Unknown error',
        processed_at: new Date().toISOString(),
      })
      .eq('queue_id', queueId);

    return false;
  }
}

/**
 * Process all pending workflow execution queue items
 */
export async function processWorkflowQueue(limit: number = 10): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  serviceTasks: number;
}> {
  const supabase = getServiceClient();

  console.log('[Workflow Worker] Starting queue processing...');

  // First, check for any orphaned SERVICE_TASKs that are stuck in PENDING
  await processOrphanedServiceTasks();

  // Get pending queue items
  const { data: queueItems, error } = await supabase
    .from('workflow_execution_queue')
    .select('queue_id')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[Workflow Worker] Error fetching queue items:', error);
    return { processed: 0, succeeded: 0, failed: 0, serviceTasks: 0 };
  }

  if (!queueItems || queueItems.length === 0) {
    console.log('[Workflow Worker] No pending queue items');
    return { processed: 0, succeeded: 0, failed: 0, serviceTasks: 0 };
  }

  console.log(`[Workflow Worker] Found ${queueItems.length} pending queue items`);

  let succeeded = 0;
  let failed = 0;

  // Process each queue item
  for (const item of queueItems) {
    const success = await processQueueItem(item.queue_id);
    if (success) {
      succeeded++;
    } else {
      failed++;
    }
  }

  console.log(`[Workflow Worker] Processed ${queueItems.length} items: ${succeeded} succeeded, ${failed} failed`);

  return {
    processed: queueItems.length,
    succeeded,
    failed,
    serviceTasks: 0,
  };
}

/**
 * Process any SERVICE_TASKs or AI_AGENT_TASKs that are stuck in PENDING status
 * This is a safety mechanism in case tasks were created but not executed
 */
async function processOrphanedServiceTasks(): Promise<number> {
  const supabase = getServiceClient();

  try {
    console.log('[Workflow Worker] Checking for orphaned SERVICE_TASKs...');

    // Find SERVICE_TASK and AI_AGENT_TASK types that are in PENDING status
    const { data: tasks, error } = await supabase
      .from('instance_tasks')
      .select('*, function_registry:function_code(*)')
      .in('task_type', ['SERVICE_TASK', 'AI_AGENT_TASK'])
      .eq('status', 'PENDING')
      .limit(10);

    if (error || !tasks || tasks.length === 0) {
      return 0;
    }

    console.log(`[Workflow Worker] Found ${tasks.length} orphaned service tasks, executing...`);

    let executed = 0;
    for (const task of tasks) {
      try {
        const func = Array.isArray(task.function_registry)
          ? task.function_registry[0]
          : task.function_registry;

        if (func && func.endpoint_or_path) {
          await executeServiceTask(task, func);
          executed++;
        }
      } catch (error) {
        console.error(`[Workflow Worker] Error executing orphaned task ${task.id}:`, error);
      }
    }

    console.log(`[Workflow Worker] Executed ${executed} orphaned service tasks`);
    return executed;
  } catch (error) {
    console.error('[Workflow Worker] Error processing orphaned service tasks:', error);
    return 0;
  }
}

/**
 * Evaluate transition condition
 * For now, supports simple conditions or defaults to true
 */
function evaluateCondition(condition: string | null | undefined, _context: any): boolean {
  // If no condition, always transition
  if (!condition || condition === '' || condition === 'true') {
    return true;
  }

  // If condition is 'false', never transition
  if (condition === 'false') {
    return false;
  }

  // TODO: Implement JSONPath or expression evaluation
  // For now, just return true for any other condition
  console.log(`[Workflow Worker] Evaluating condition: ${condition} (defaulting to true)`);
  return true;
}

/**
 * Execute a SERVICE_TASK or AI_AGENT_TASK by calling its endpoint
 */
async function executeServiceTask(task: any, func: any): Promise<void> {
  const supabase = getServiceClient();

  try {
    console.log(`[Service Task Executor] Executing task ${task.id}: ${func.function_code}`);
    console.log(`[Service Task Executor] Endpoint: ${func.endpoint_or_path}`);

    // Update task status to IN_PROGRESS
    await supabase
      .from('instance_tasks')
      .update({
        status: 'IN_PROGRESS',
        started_at: new Date().toISOString(),
      })
      .eq('id', task.id);

    // Determine if endpoint is relative (internal API) or absolute (external URL)
    const isAbsoluteUrl = func.endpoint_or_path.startsWith('http://') || func.endpoint_or_path.startsWith('https://');
    const endpoint = isAbsoluteUrl
      ? func.endpoint_or_path
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'}${func.endpoint_or_path}`;

    console.log(`[Service Task Executor] Calling endpoint: ${endpoint}`);

    // Prepare request payload
    const payload = {
      task_id: task.id,
      workflow_instance_id: task.workflow_instance_id,
      function_code: task.function_code,
      input_data: task.input_data,
      context: {
        app_code: task.app_code,
        workflow_code: task.workflow_code,
      },
    };

    // Call the service endpoint
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add service role authorization if calling internal API
        ...(isAbsoluteUrl ? {} : {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        }),
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(`Service task failed: ${responseData.error || response.statusText}`);
    }

    console.log(`[Service Task Executor] Task completed successfully: ${task.id}`);

    // Update task status to COMPLETED with output data
    await supabase
      .from('instance_tasks')
      .update({
        status: 'COMPLETED',
        output_data: responseData.output || responseData,
        completed_at: new Date().toISOString(),
      })
      .eq('id', task.id);

    // Log task completion in workflow history
    await supabase.from('workflow_history').insert([{
      app_code: task.app_code,
      workflow_instance_id: task.workflow_instance_id,
      event_type: 'TASK_COMPLETED',
      node_id: task.node_id,
      description: `${func.implementation_type} completed: ${func.function_code}`,
      metadata: {
        task_id: task.id,
        function_code: task.function_code,
      },
    }]);

    // Queue workflow resumption to move to next node
    await supabase.from('workflow_execution_queue').insert([{
      app_code: task.app_code,
      workflow_instance_id: task.workflow_instance_id,
      trigger_type: 'TASK_COMPLETED',
      trigger_node_id: task.node_id,
      status: 'PENDING',
      metadata: {
        task_id: task.id,
        task_type: func.implementation_type,
      },
    }]);

    console.log(`[Service Task Executor] Queued workflow resumption for instance: ${task.workflow_instance_id}`);

  } catch (error: any) {
    console.error(`[Service Task Executor] Error executing task ${task.id}:`, error);

    // Mark task as FAILED
    await supabase
      .from('instance_tasks')
      .update({
        status: 'FAILED',
        error_message: error.message || 'Service task execution failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', task.id);

    // Log task failure
    await supabase.from('workflow_history').insert([{
      app_code: task.app_code,
      workflow_instance_id: task.workflow_instance_id,
      event_type: 'TASK_FAILED',
      node_id: task.node_id,
      description: `${func.implementation_type} failed: ${error.message}`,
      metadata: {
        task_id: task.id,
        function_code: task.function_code,
        error: error.message,
      },
    }]);

    // Optionally suspend workflow on service task failure
    // For now, we'll let it fail silently and the workflow will remain at this node
    console.log(`[Service Task Executor] Workflow ${task.workflow_instance_id} suspended due to task failure`);
  }
}

/**
 * Create an instance task for a workflow node
 */
async function createInstanceTask(instance: any, node: any): Promise<void> {
  const supabase = getServiceClient();

  try {
    // Get function registry details
    const { data: func, error: funcError } = await supabase
      .from('function_registry')
      .select('*')
      .eq('function_code', node.function_code)
      .single();

    if (funcError || !func) {
      console.error(`[Workflow Worker] Function not found: ${node.function_code}`);
      return;
    }

    // Get stakeholder assignment from instance input_data._task_assignments
    // These were stored during instance creation
    const taskAssignments = instance.input_data?._task_assignments || {};
    const assignedTo = taskAssignments[node.id] || null;

    console.log(`[Workflow Worker] Creating task for node ${node.id}, assigned to: ${assignedTo}`);

    // Create instance task
    const { data: createdTask, error: taskError } = await supabase
      .from('instance_tasks')
      .insert([{
        app_code: instance.app_code,
        workflow_instance_id: instance.id,
        workflow_code: instance.workflow_code,
        function_code: node.function_code,
        node_id: node.id,
        task_type: func.implementation_type || 'USER_TASK',
        status: 'PENDING',
        input_data: node.input_data || {},
        assigned_to: assignedTo,
      }])
      .select()
      .single();

    if (taskError) {
      console.error('[Workflow Worker] Error creating instance task:', taskError);
      throw taskError;
    }

    console.log(`[Workflow Worker] Created task for node ${node.id}, function ${node.function_code}, assigned to ${assignedTo}`);

    // Auto-execute SERVICE_TASK and AI_AGENT_TASK types
    if (func.implementation_type === 'SERVICE_TASK' || func.implementation_type === 'AI_AGENT_TASK') {
      console.log(`[Workflow Worker] Auto-executing ${func.implementation_type}: ${createdTask.id}`);
      await executeServiceTask(createdTask, func);
    }

  } catch (error) {
    console.error('[Workflow Worker] Error in createInstanceTask:', error);
    throw error;
  }
}
