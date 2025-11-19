/**
 * Execution Logger
 *
 * Logs workflow execution events to workflow_history table
 * Provides comprehensive audit trail for workflow execution
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  WorkflowEventType,
  WorkflowHistoryEntry,
  LogEventRequest,
} from '../types'
import { WorkflowError } from '../types/errors'

// ============================================================================
// Execution Logger Class
// ============================================================================

export class ExecutionLogger {
  private supabase: SupabaseClient
  private appUuid: string

  constructor(supabase: SupabaseClient, appUuid: string) {
    this.supabase = supabase
    this.appUuid = appUuid
  }

  /**
   * Log a workflow execution event
   *
   * @param request - Event logging request
   * @returns Created history entry
   */
  async logEvent(request: LogEventRequest): Promise<WorkflowHistoryEntry> {
    const eventData: any = {
      workflow_instance_id: request.workflowInstanceId,
      event_type: request.eventType,
      node_id: request.nodeId,
      task_id: request.taskId,
      details: request.details || {},
      actor_type: request.actorType,
      actor_id: request.actorId,
      app_uuid: this.appUuid,
      created_at: new Date(),
    }

    const { data, error } = await this.supabase
      .from('workflow_history')
      .insert(eventData)
      .select()
      .single()

    if (error) {
      // Log error but don't throw - history logging should not break workflow
      console.error('[ExecutionLogger] Failed to log event:', error)
      throw new WorkflowError(
        'DATABASE_ERROR',
        { operation: 'logEvent', error: error.message },
        false,
        `Failed to log execution event: ${error.message}`
      )
    }

    return this.mapDatabaseRowToEntry(data)
  }

  /**
   * Log instance created event
   */
  async logInstanceCreated(
    instanceId: string,
    templateId: string,
    templateCode: string,
    rootNodeId: string,
    initialContext?: Record<string, unknown>,
    actorId?: string
  ): Promise<void> {
    await this.logEvent({
      workflowInstanceId: instanceId,
      eventType: 'instance_created',
      details: {
        templateId,
        templateCode,
        rootNodeId,
        initialContext,
      },
      actorType: actorId ? 'USER' : 'SYSTEM',
      actorId,
    })
  }

  /**
   * Log instance started event
   */
  async logInstanceStarted(
    instanceId: string,
    startNodeId: string
  ): Promise<void> {
    await this.logEvent({
      workflowInstanceId: instanceId,
      eventType: 'instance_started',
      nodeId: startNodeId,
      details: {
        startNodeId,
      },
      actorType: 'SYSTEM',
    })
  }

  /**
   * Log node evaluated event
   */
  async logNodeEvaluated(
    instanceId: string,
    nodeId: string,
    nodeType: string,
    nodeName: string,
    evaluationResult: string
  ): Promise<void> {
    await this.logEvent({
      workflowInstanceId: instanceId,
      eventType: 'node_evaluated',
      nodeId,
      details: {
        nodeType,
        nodeName,
        evaluationResult,
      },
      actorType: 'SYSTEM',
    })
  }

  /**
   * Log task created event
   */
  async logTaskCreated(
    instanceId: string,
    taskId: string,
    taskCode: string,
    functionCode: string,
    implementationType: string,
    nodeId: string
  ): Promise<void> {
    await this.logEvent({
      workflowInstanceId: instanceId,
      eventType: 'task_created',
      nodeId,
      taskId,
      details: {
        taskCode,
        functionCode,
        implementationType,
      },
      actorType: 'SYSTEM',
    })
  }

  /**
   * Log task assigned event
   */
  async logTaskAssigned(
    instanceId: string,
    taskId: string,
    assignedUserId: string,
    assignedRole?: string
  ): Promise<void> {
    await this.logEvent({
      workflowInstanceId: instanceId,
      eventType: 'task_assigned',
      taskId,
      details: {
        assignedUserId,
        assignedRole,
      },
      actorType: 'SYSTEM',
    })
  }

  /**
   * Log task started event
   */
  async logTaskStarted(
    instanceId: string,
    taskId: string,
    actorId?: string
  ): Promise<void> {
    await this.logEvent({
      workflowInstanceId: instanceId,
      eventType: 'task_started',
      taskId,
      details: {},
      actorType: actorId ? 'USER' : 'SYSTEM',
      actorId,
    })
  }

  /**
   * Log task completed event
   */
  async logTaskCompleted(
    instanceId: string,
    taskId: string,
    outputSummary?: Record<string, unknown>,
    actorId?: string
  ): Promise<void> {
    await this.logEvent({
      workflowInstanceId: instanceId,
      eventType: 'task_completed',
      taskId,
      details: {
        outputSummary,
      },
      actorType: actorId ? 'USER' : 'SYSTEM',
      actorId,
    })
  }

  /**
   * Log task failed event
   */
  async logTaskFailed(
    instanceId: string,
    taskId: string,
    error: {
      type: string
      message: string
      details?: Record<string, unknown>
    },
    actorId?: string
  ): Promise<void> {
    await this.logEvent({
      workflowInstanceId: instanceId,
      eventType: 'task_failed',
      taskId,
      details: {
        errorType: error.type,
        errorMessage: error.message,
        errorDetails: error.details,
      },
      actorType: actorId ? 'USER' : 'SYSTEM',
      actorId,
    })
  }

  /**
   * Log transition evaluated event
   */
  async logTransitionEvaluated(
    instanceId: string,
    fromNodeId: string,
    toNodeId: string,
    condition?: string,
    conditionResult?: boolean
  ): Promise<void> {
    await this.logEvent({
      workflowInstanceId: instanceId,
      eventType: 'transition_evaluated',
      nodeId: fromNodeId,
      details: {
        fromNodeId,
        toNodeId,
        condition,
        conditionResult,
      },
      actorType: 'SYSTEM',
    })
  }

  /**
   * Log context updated event
   */
  async logContextUpdated(
    instanceId: string,
    scope: string,
    keysUpdated: string[],
    taskId?: string
  ): Promise<void> {
    await this.logEvent({
      workflowInstanceId: instanceId,
      eventType: 'context_updated',
      taskId,
      details: {
        scope,
        keysUpdated,
      },
      actorType: 'SYSTEM',
    })
  }

  /**
   * Log instance completed event
   */
  async logInstanceCompleted(
    instanceId: string,
    outcome?: string
  ): Promise<void> {
    await this.logEvent({
      workflowInstanceId: instanceId,
      eventType: 'instance_completed',
      details: {
        outcome,
      },
      actorType: 'SYSTEM',
    })
  }

  /**
   * Log instance failed event
   */
  async logInstanceFailed(
    instanceId: string,
    error: {
      type: string
      message: string
      details?: Record<string, unknown>
    }
  ): Promise<void> {
    await this.logEvent({
      workflowInstanceId: instanceId,
      eventType: 'instance_failed',
      details: {
        errorType: error.type,
        errorMessage: error.message,
        errorDetails: error.details,
      },
      actorType: 'SYSTEM',
    })
  }

  /**
   * Log error occurred event
   */
  async logError(
    instanceId: string,
    error: {
      type: string
      message: string
      nodeId?: string
      taskId?: string
      stackTrace?: string
      details?: Record<string, unknown>
    }
  ): Promise<void> {
    await this.logEvent({
      workflowInstanceId: instanceId,
      eventType: 'error_occurred',
      nodeId: error.nodeId,
      taskId: error.taskId,
      details: {
        errorType: error.type,
        errorMessage: error.message,
        stackTrace: error.stackTrace,
        ...error.details,
      },
      actorType: 'SYSTEM',
    })
  }

  /**
   * Get workflow history
   */
  async getHistory(
    instanceId: string,
    eventTypes?: WorkflowEventType[],
    limit?: number
  ): Promise<WorkflowHistoryEntry[]> {
    let query = this.supabase
      .from('workflow_history')
      .select('*')
      .eq('workflow_instance_id', instanceId)
      .eq('app_uuid', this.appUuid)
      .order('created_at', { ascending: false })

    if (eventTypes && eventTypes.length > 0) {
      query = query.in('event_type', eventTypes)
    }

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      throw new WorkflowError(
        'DATABASE_ERROR',
        { operation: 'getHistory', error: error.message },
        false,
        `Failed to get workflow history: ${error.message}`
      )
    }

    return (data || []).map(row => this.mapDatabaseRowToEntry(row))
  }

  /**
   * Map database row to WorkflowHistoryEntry type
   */
  private mapDatabaseRowToEntry(row: any): WorkflowHistoryEntry {
    return {
      id: row.id,
      workflowInstanceId: row.workflow_instance_id,
      eventType: row.event_type,
      nodeId: row.node_id,
      taskId: row.task_id,
      details: row.details || {},
      actorType: row.actor_type,
      actorId: row.actor_id,
      appUuid: row.app_uuid,
      createdAt: new Date(row.created_at),
    }
  }
}
