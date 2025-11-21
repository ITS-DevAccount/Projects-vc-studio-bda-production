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
}> {
  const supabase = getServiceClient();

  console.log('[Workflow Worker] Starting queue processing...');

  // Get pending queue items
  const { data: queueItems, error } = await supabase
    .from('workflow_execution_queue')
    .select('queue_id')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[Workflow Worker] Error fetching queue items:', error);
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  if (!queueItems || queueItems.length === 0) {
    console.log('[Workflow Worker] No pending queue items');
    return { processed: 0, succeeded: 0, failed: 0 };
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
  };
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
    const { error: taskError } = await supabase
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
      }]);

    if (taskError) {
      console.error('[Workflow Worker] Error creating instance task:', taskError);
      throw taskError;
    }

    console.log(`[Workflow Worker] Created task for node ${node.id}, function ${node.function_code}, assigned to ${assignedTo}`);

  } catch (error) {
    console.error('[Workflow Worker] Error in createInstanceTask:', error);
    throw error;
  }
}
