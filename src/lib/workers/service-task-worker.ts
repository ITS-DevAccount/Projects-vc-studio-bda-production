// Sprint 1d.5: Service Task Execution System
// Service Task Worker - Background job processor for SERVICE_TASK execution

import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '../clients/ServiceClient';
import { ServiceConfiguration } from '../types/service';

/**
 * Service Task Worker
 *
 * Background worker that:
 * 1. Polls service_task_queue for PENDING tasks
 * 2. Executes service calls (REAL or MOCK)
 * 3. Validates responses against output_schema
 * 4. Logs execution results
 * 5. Updates task and queue status
 * 6. Triggers workflow resumption on completion
 *
 * Uses Supabase service role for RLS bypass
 */
export class ServiceTaskWorker {
  private supabase: ReturnType<typeof createClient>;
  private isRunning = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLL_INTERVAL_MS = 10000; // 10 seconds

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
      );
    }

    // Create Supabase client with service role (bypasses RLS)
    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Start the worker polling loop
   */
  start(): void {
    if (this.isRunning) {
      console.log('[ServiceTaskWorker] Already running');
      return;
    }

    this.isRunning = true;
    console.log(
      `[ServiceTaskWorker] Starting... (polling every ${this.POLL_INTERVAL_MS}ms)`
    );

    // Process immediately, then start interval
    this.processPendingTasks();

    this.pollingInterval = setInterval(() => {
      this.processPendingTasks();
    }, this.POLL_INTERVAL_MS);
  }

  /**
   * Stop the worker polling loop
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    console.log('[ServiceTaskWorker] Stopped');
  }

  /**
   * Process all pending tasks in the queue
   */
  private async processPendingTasks(): Promise<void> {
    try {
      // Get next pending task (atomically locks it)
      const { data: tasks, error } = await (this.supabase.rpc as any)(
        'get_next_pending_service_task'
      ) as { data: any[] | null; error: any };

      if (error) {
        console.error('[ServiceTaskWorker] Error fetching tasks:', error);
        return;
      }

      if (!tasks || tasks.length === 0) {
        // No pending tasks
        return;
      }

      // Process each task
      for (const task of tasks) {
        await this.processTask(task);
      }
    } catch (error) {
      console.error('[ServiceTaskWorker] Error in processPendingTasks:', error);
    }
  }

  /**
   * Process a single service task
   */
  private async processTask(queueItem: any): Promise<void> {
    const startTime = Date.now();
    const {
      queue_id,
      instance_id,
      task_id,
      service_config_id,
      input_data,
      retry_count,
      max_retries,
    } = queueItem;

    console.log(
      `[ServiceTaskWorker] Processing task ${task_id} (queue: ${queue_id}, retry: ${retry_count})`
    );

    try {
      // Fetch service configuration
      const { data: serviceConfig, error: configError } = await this.supabase
        .from('service_configurations')
        .select('*')
        .eq('service_config_id', service_config_id)
        .single() as { data: ServiceConfiguration | null; error: any };

      if (configError || !serviceConfig) {
        throw new Error(
          `Service configuration not found: ${service_config_id}`
        );
      }

      // Get app_uuid from queue item
      const { data: queueData } = await this.supabase
        .from('service_task_queue')
        .select('app_uuid')
        .eq('queue_id', queue_id)
        .single() as { data: { app_uuid: string } | null };

      const app_uuid = queueData?.app_uuid || '';

      // Create service client (Mock or HTTP)
      const client = await createServiceClient(serviceConfig);

      // Execute service call
      const endpoint =
        serviceConfig.endpoint_url || serviceConfig.service_name || '';
      const response = await client.execute(
        endpoint,
        input_data || {},
        serviceConfig
      );

      const executionTimeMs = Date.now() - startTime;

      // Log execution
      await this.logServiceExecution(
        app_uuid,
        instance_id,
        task_id,
        service_config_id,
        serviceConfig.service_name,
        response.status === 'success' ? 'SUCCESS' : 'FAILED',
        input_data,
        response.data,
        response.error,
        executionTimeMs,
        response.statusCode,
        retry_count
      );

      if (response.status === 'success') {
        // Success - mark queue item as COMPLETED
        await (this.supabase
          .from('service_task_queue') as any)
          .update({
            status: 'COMPLETED',
            output_data: response.data || {},
            completed_at: new Date().toISOString(),
          })
          .eq('queue_id', queue_id);

        // Update instance_task status
        await (this.supabase
          .from('instance_tasks') as any)
          .update({
            status: 'COMPLETED',
            output_data: response.data || {},
            completed_at: new Date().toISOString(),
          })
          .eq('task_id', task_id);

        console.log(`[ServiceTaskWorker] Task ${task_id} completed successfully`);

        // Trigger workflow resumption
        await this.triggerWorkflowResumption(instance_id);
      } else {
        // Failure - check if we should retry
        const newRetryCount = retry_count + 1;

        if (newRetryCount < max_retries) {
          // Retry - set back to PENDING
          await (this.supabase
            .from('service_task_queue') as any)
            .update({
              status: 'PENDING',
              retry_count: newRetryCount,
              error_message: response.error,
            })
            .eq('queue_id', queue_id);

          console.log(
            `[ServiceTaskWorker] Task ${task_id} failed, will retry (${newRetryCount}/${max_retries})`
          );
        } else {
          // Max retries exceeded - mark as FAILED
          await (this.supabase
            .from('service_task_queue') as any)
            .update({
              status: 'FAILED',
              error_message: response.error,
              completed_at: new Date().toISOString(),
            })
            .eq('queue_id', queue_id);

          // Update instance_task status
          await (this.supabase
            .from('instance_tasks') as any)
            .update({
              status: 'FAILED',
              error_message: response.error,
            })
            .eq('task_id', task_id);

          console.log(
            `[ServiceTaskWorker] Task ${task_id} failed after ${max_retries} retries`
          );
        }
      }
    } catch (error) {
      console.error(`[ServiceTaskWorker] Error processing task ${task_id}:`, error);

      // Mark queue item as FAILED
      await (this.supabase
        .from('service_task_queue') as any)
        .update({
          status: 'FAILED',
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('queue_id', queue_id);

      // Update instance_task status
      await (this.supabase
        .from('instance_tasks') as any)
        .update({
          status: 'FAILED',
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('task_id', task_id);
    }
  }

  /**
   * Log service execution to database
   */
  private async logServiceExecution(
    app_uuid: string,
    instance_id: string,
    task_id: string,
    service_config_id: string,
    service_name: string,
    status: string,
    request_data: any,
    response_data: any,
    error_message: string | undefined,
    execution_time_ms: number,
    http_status_code: number | undefined,
    retry_attempt: number
  ): Promise<void> {
    try {
      await (this.supabase.rpc as any)('log_service_execution', {
        p_app_uuid: app_uuid,
        p_instance_id: instance_id,
        p_task_id: task_id,
        p_service_config_id: service_config_id,
        p_service_name: service_name,
        p_status: status,
        p_request_data: request_data,
        p_response_data: response_data,
        p_error_message: error_message || null,
        p_execution_time_ms: execution_time_ms,
        p_http_status_code: http_status_code || null,
        p_retry_attempt: retry_attempt,
      });
    } catch (error) {
      console.error('[ServiceTaskWorker] Error logging execution:', error);
    }
  }

  /**
   * Trigger workflow resumption after task completion
   */
  private async triggerWorkflowResumption(instance_id: string): Promise<void> {
    try {
      // Queue workflow resumption
      await (this.supabase.from('workflow_execution_queue') as any).insert({
        instance_id,
        priority: 1,
      });

      console.log(
        `[ServiceTaskWorker] Queued workflow resumption for instance ${instance_id}`
      );
    } catch (error) {
      console.error(
        '[ServiceTaskWorker] Error queuing workflow resumption:',
        error
      );
    }
  }
}

// Singleton instance
let workerInstance: ServiceTaskWorker | null = null;

/**
 * Get or create the singleton worker instance
 */
export function getServiceTaskWorker(): ServiceTaskWorker {
  if (!workerInstance) {
    workerInstance = new ServiceTaskWorker();
  }
  return workerInstance;
}

/**
 * Start the service task worker (if not already running)
 */
export function startServiceTaskWorker(): ServiceTaskWorker {
  const worker = getServiceTaskWorker();
  worker.start();
  return worker;
}

/**
 * Stop the service task worker
 */
export function stopServiceTaskWorker(): void {
  if (workerInstance) {
    workerInstance.stop();
  }
}
