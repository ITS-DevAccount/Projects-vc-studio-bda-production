/**
 * Context Manager
 *
 * Manages workflow context data with scoping:
 * - GLOBAL: Available throughout entire workflow
 * - TASK_LOCAL: Scoped to individual task execution
 * - NODE_LOCAL: Temporary data for node evaluation (not persisted)
 *
 * Context is immutable - updates create new entries
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  ContextData,
  ContextScope,
  ContextEntry,
  EffectiveContext,
  ContextQueryOptions,
} from '../types'
import { WorkflowError } from '../types/errors'

// ============================================================================
// Context Manager Class
// ============================================================================

export class ContextManager {
  private supabase: SupabaseClient
  private appUuid: string

  constructor(supabase: SupabaseClient, appUuid: string) {
    this.supabase = supabase
    this.appUuid = appUuid
  }

  /**
   * Get effective context for workflow or task execution
   *
   * For workflow-level: Returns GLOBAL only
   * For task-level: Returns GLOBAL + TASK_LOCAL merged
   *
   * @param workflowInstanceId - Workflow instance ID
   * @param scope - 'workflow' or 'task'
   * @param taskId - Task ID (required if scope is 'task')
   * @returns Effective context data
   */
  async getEffectiveContext(
    workflowInstanceId: string,
    scope: 'workflow' | 'task',
    taskId?: string
  ): Promise<EffectiveContext> {
    if (scope === 'workflow') {
      const global = await this.getGlobalContext(workflowInstanceId)
      return {
        global,
        merged: global,
      }
    }

    if (!taskId) {
      throw new WorkflowError(
        'MISSING_REQUIRED_FIELD',
        { field: 'taskId', scope },
        false,
        'taskId is required for task scope context'
      )
    }

    const global = await this.getGlobalContext(workflowInstanceId)
    const taskLocal = await this.getTaskLocalContext(workflowInstanceId, taskId)

    return {
      global,
      taskLocal,
      merged: { ...global, ...taskLocal }, // Task-local overrides global
    }
  }

  /**
   * Get GLOBAL context for a workflow instance
   */
  async getGlobalContext(workflowInstanceId: string): Promise<ContextData> {
    const entries = await this.queryContext({
      workflowInstanceId,
      scope: 'GLOBAL',
    })

    return this.entriesToContextData(entries)
  }

  /**
   * Get TASK_LOCAL context for a specific task
   */
  async getTaskLocalContext(
    workflowInstanceId: string,
    taskId: string
  ): Promise<ContextData> {
    const entries = await this.queryContext({
      workflowInstanceId,
      scope: 'TASK_LOCAL',
      taskId,
    })

    return this.entriesToContextData(entries)
  }

  /**
   * Initialize context with initial data (typically on instance creation)
   */
  async initializeContext(
    workflowInstanceId: string,
    initialData: ContextData,
    createdBy?: string
  ): Promise<void> {
    const entries = Object.entries(initialData).map(([key, value]) => ({
      workflow_instance_id: workflowInstanceId,
      scope: 'GLOBAL' as ContextScope,
      key,
      value,
      app_uuid: this.appUuid,
      created_by: createdBy,
      created_at: new Date(),
    }))

    if (entries.length === 0) {
      return // No initial data
    }

    const { error } = await this.supabase
      .from('instance_context')
      .insert(entries)

    if (error) {
      throw new WorkflowError(
        'DATABASE_ERROR',
        { operation: 'initializeContext', error: error.message },
        false,
        `Failed to initialize context: ${error.message}`
      )
    }
  }

  /**
   * Update context (creates new entries, doesn't modify existing)
   */
  async updateContext(
    workflowInstanceId: string,
    scope: ContextScope,
    updates: ContextData,
    taskId?: string,
    createdBy?: string
  ): Promise<void> {
    if (scope === 'TASK_LOCAL' && !taskId) {
      throw new WorkflowError(
        'MISSING_REQUIRED_FIELD',
        { field: 'taskId', scope },
        false,
        'taskId is required for TASK_LOCAL scope'
      )
    }

    const entries = Object.entries(updates).map(([key, value]) => ({
      workflow_instance_id: workflowInstanceId,
      scope,
      key,
      value,
      task_id: taskId,
      app_uuid: this.appUuid,
      created_by: createdBy,
      created_at: new Date(),
    }))

    if (entries.length === 0) {
      return // No updates
    }

    const { error } = await this.supabase
      .from('instance_context')
      .insert(entries)

    if (error) {
      throw new WorkflowError(
        'DATABASE_ERROR',
        { operation: 'updateContext', error: error.message },
        false,
        `Failed to update context: ${error.message}`
      )
    }
  }

  /**
   * Merge task output into global context using output mapping
   *
   * @param workflowInstanceId - Workflow instance ID
   * @param taskOutput - Output data from task
   * @param outputMapping - Mapping from task output to context keys (optional)
   * @param createdBy - User/system ID
   */
  async mergeTaskOutput(
    workflowInstanceId: string,
    taskOutput: ContextData,
    outputMapping?: Record<string, string>,
    createdBy?: string
  ): Promise<void> {
    let dataToMerge: ContextData

    if (outputMapping) {
      // Apply output mapping to extract specific fields
      dataToMerge = this.applyOutputMapping(taskOutput, outputMapping)
    } else {
      // No mapping - merge entire output
      dataToMerge = taskOutput
    }

    await this.updateContext(
      workflowInstanceId,
      'GLOBAL',
      dataToMerge,
      undefined,
      createdBy
    )
  }

  /**
   * Apply output mapping to extract fields from task output
   *
   * Output mapping format:
   * {
   *   "contextKey": "$.taskOutput.field"
   * }
   */
  private applyOutputMapping(
    taskOutput: ContextData,
    outputMapping: Record<string, string>
  ): ContextData {
    const { JSONPath } = require('jsonpath-plus')
    const result: ContextData = {}

    for (const [contextKey, jsonPathExpr] of Object.entries(outputMapping)) {
      try {
        const values = JSONPath({ path: jsonPathExpr, json: taskOutput })
        result[contextKey] = Array.isArray(values) ? values[0] : values
      } catch (error) {
        // If JSONPath fails, try direct access
        if (jsonPathExpr.startsWith('$.')) {
          const key = jsonPathExpr.slice(2)
          result[contextKey] = taskOutput[key]
        }
      }
    }

    return result
  }

  /**
   * Extract input data from context using input mapping
   *
   * Input mapping format:
   * {
   *   "taskInputField": "$.context.field"
   * }
   */
  extractInputData(
    context: ContextData,
    inputMapping?: Record<string, string>
  ): ContextData {
    if (!inputMapping) {
      // No mapping - return entire context
      return context
    }

    const { JSONPath } = require('jsonpath-plus')
    const result: ContextData = {}

    for (const [taskField, jsonPathExpr] of Object.entries(inputMapping)) {
      try {
        const values = JSONPath({ path: jsonPathExpr, json: context })
        result[taskField] = Array.isArray(values) ? values[0] : values
      } catch (error) {
        // If JSONPath fails, try direct access
        if (jsonPathExpr.startsWith('$.')) {
          const key = jsonPathExpr.slice(2)
          result[taskField] = context[key]
        }
      }
    }

    return result
  }

  /**
   * Query context entries from database
   */
  private async queryContext(
    options: ContextQueryOptions
  ): Promise<ContextEntry[]> {
    let query = this.supabase
      .from('instance_context')
      .select('*')
      .eq('workflow_instance_id', options.workflowInstanceId)
      .eq('app_uuid', this.appUuid)

    // Filter by scope
    if (options.scope) {
      if (Array.isArray(options.scope)) {
        query = query.in('scope', options.scope)
      } else {
        query = query.eq('scope', options.scope)
      }
    }

    // Filter by task ID
    if (options.taskId) {
      query = query.eq('task_id', options.taskId)
    }

    // Order by created_at descending (most recent first)
    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      throw new WorkflowError(
        'DATABASE_ERROR',
        { operation: 'queryContext', error: error.message },
        false,
        `Failed to query context: ${error.message}`
      )
    }

    return (data || []) as ContextEntry[]
  }

  /**
   * Convert context entries to flat key-value object
   * (takes most recent value for each key)
   */
  private entriesToContextData(entries: ContextEntry[]): ContextData {
    const result: ContextData = {}
    const seenKeys = new Set<string>()

    // Entries are already sorted by created_at DESC
    for (const entry of entries) {
      if (!seenKeys.has(entry.key)) {
        result[entry.key] = entry.value
        seenKeys.add(entry.key)
      }
    }

    return result
  }

  /**
   * Get full context history (for debugging/audit)
   */
  async getContextHistory(
    workflowInstanceId: string
  ): Promise<ContextEntry[]> {
    return this.queryContext({
      workflowInstanceId,
      includeHistory: true,
    })
  }
}
