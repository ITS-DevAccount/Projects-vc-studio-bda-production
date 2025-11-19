/**
 * Work Token Creator
 *
 * Creates work tokens (instance_tasks) for task execution
 * Work tokens contain all information needed to execute a task
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  InstanceTask,
  TaskNode,
  WorkflowInstance,
  FunctionRegistryEntry,
  AgentAssignment,
  ContextData,
} from '../types'
import { WorkflowError } from '../types/errors'

// ============================================================================
// Work Token Creator Class
// ============================================================================

export class WorkTokenCreator {
  private supabase: SupabaseClient
  private appUuid: string

  constructor(supabase: SupabaseClient, appUuid: string) {
    this.supabase = supabase
    this.appUuid = appUuid
  }

  /**
   * Create a work token for task execution
   *
   * @param taskNode - Task node definition
   * @param instance - Workflow instance
   * @param registryEntry - Function registry entry
   * @param agentAssignment - Agent assignment details
   * @param inputData - Input data for task
   * @param createdBy - User/system ID
   * @returns Created work token
   */
  async createWorkToken(
    taskNode: TaskNode,
    instance: WorkflowInstance,
    registryEntry: FunctionRegistryEntry,
    agentAssignment: AgentAssignment,
    inputData: ContextData,
    createdBy?: string
  ): Promise<InstanceTask> {
    // Generate unique task code
    const taskCode = this.generateTaskCode(instance.instanceCode, taskNode.id)

    // Prepare work token data based on implementation type
    const workTokenData: any = {
      task_code: taskCode,
      workflow_instance_id: instance.id,
      node_id: taskNode.id,
      function_code: taskNode.functionCode,
      implementation_type: registryEntry.implementationType,
      input_data: inputData,
      status: 'PENDING',
      output_validated: false,
      app_uuid: this.appUuid,
      created_by: createdBy,
      created_at: new Date(),
    }

    // Add implementation-specific fields
    if (agentAssignment.implementationType === 'USER_TASK') {
      workTokenData.assigned_role = agentAssignment.assignedRole
      workTokenData.assigned_user_id = agentAssignment.assignedUserId
      workTokenData.ui_widget_id = agentAssignment.uiWidgetId
    } else if (agentAssignment.implementationType === 'SERVICE_TASK') {
      workTokenData.service_endpoint = agentAssignment.serviceEndpoint
      workTokenData.http_config = agentAssignment.httpConfig
    } else if (agentAssignment.implementationType === 'AI_AGENT_TASK') {
      workTokenData.ai_config = agentAssignment.aiConfig
    }

    // Insert work token
    const { data, error } = await this.supabase
      .from('instance_tasks')
      .insert(workTokenData)
      .select()
      .single()

    if (error) {
      throw new WorkflowError(
        'DATABASE_ERROR',
        { operation: 'createWorkToken', error: error.message },
        false,
        `Failed to create work token: ${error.message}`
      )
    }

    return this.mapDatabaseRowToTask(data)
  }

  /**
   * Get work token by ID
   */
  async getWorkToken(taskId: string): Promise<InstanceTask> {
    const { data, error } = await this.supabase
      .from('instance_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('app_uuid', this.appUuid)
      .single()

    if (error || !data) {
      throw new WorkflowError(
        'TASK_NOT_FOUND',
        { taskId },
        false,
        `Work token not found: ${taskId}`
      )
    }

    return this.mapDatabaseRowToTask(data)
  }

  /**
   * Get work tokens for a workflow instance
   */
  async getWorkTokensForInstance(
    instanceId: string
  ): Promise<InstanceTask[]> {
    const { data, error } = await this.supabase
      .from('instance_tasks')
      .select('*')
      .eq('workflow_instance_id', instanceId)
      .eq('app_uuid', this.appUuid)
      .order('created_at', { ascending: true })

    if (error) {
      throw new WorkflowError(
        'DATABASE_ERROR',
        { operation: 'getWorkTokensForInstance', error: error.message },
        false,
        `Failed to get work tokens: ${error.message}`
      )
    }

    return (data || []).map(row => this.mapDatabaseRowToTask(row))
  }

  /**
   * Update work token status
   */
  async updateWorkTokenStatus(
    taskId: string,
    status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
    outputData?: ContextData,
    validationErrors?: Array<{ field: string; message: string }>
  ): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date(),
    }

    if (status === 'IN_PROGRESS' && !outputData) {
      updates.started_at = new Date()
    }

    if (status === 'COMPLETED' || status === 'FAILED') {
      updates.completed_at = new Date()
    }

    if (outputData) {
      updates.output_data = outputData
      updates.output_validated = !validationErrors || validationErrors.length === 0
    }

    if (validationErrors) {
      updates.validation_errors = validationErrors
    }

    const { error } = await this.supabase
      .from('instance_tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('app_uuid', this.appUuid)

    if (error) {
      throw new WorkflowError(
        'DATABASE_ERROR',
        { operation: 'updateWorkTokenStatus', error: error.message },
        false,
        `Failed to update work token: ${error.message}`
      )
    }
  }

  /**
   * Assign work token to specific user
   */
  async assignWorkToken(
    taskId: string,
    userId: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('instance_tasks')
      .update({
        assigned_user_id: userId,
        status: 'ASSIGNED',
        updated_at: new Date(),
      })
      .eq('id', taskId)
      .eq('app_uuid', this.appUuid)

    if (error) {
      throw new WorkflowError(
        'DATABASE_ERROR',
        { operation: 'assignWorkToken', error: error.message },
        false,
        `Failed to assign work token: ${error.message}`
      )
    }
  }

  /**
   * Generate unique task code
   */
  private generateTaskCode(instanceCode: string, nodeId: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `${instanceCode}-${nodeId}-${timestamp}-${random}`
  }

  /**
   * Map database row to InstanceTask type
   */
  private mapDatabaseRowToTask(row: any): InstanceTask {
    return {
      id: row.id,
      taskCode: row.task_code,
      workflowInstanceId: row.workflow_instance_id,
      nodeId: row.node_id,
      functionCode: row.function_code,
      implementationType: row.implementation_type,
      inputData: row.input_data || {},
      outputData: row.output_data,
      assignedRole: row.assigned_role,
      assignedUserId: row.assigned_user_id,
      uiWidgetId: row.ui_widget_id,
      serviceEndpoint: row.service_endpoint,
      httpConfig: row.http_config,
      aiConfig: row.ai_config,
      status: row.status,
      outputValidated: row.output_validated || false,
      validationErrors: row.validation_errors,
      appUuid: row.app_uuid,
      createdAt: new Date(row.created_at),
      createdBy: row.created_by,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    }
  }
}
