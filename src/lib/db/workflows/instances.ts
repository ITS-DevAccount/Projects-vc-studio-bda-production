/**
 * Workflow Instance Database Queries
 *
 * Database operations for workflow_engine_instances table
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  WorkflowInstance,
  WorkflowInstanceStatus,
  CreateWorkflowInstanceRequest,
} from '@/lib/workflow-engine/types'
import { WorkflowError, createInstanceNotFoundError } from '@/lib/workflow-engine/types/errors'

// ============================================================================
// Create Instance
// ============================================================================

export async function createWorkflowInstance(
  supabase: SupabaseClient,
  data: {
    instanceCode: string
    workflowDefinitionId: string
    currentNodeId: string
    stakeholderId?: string
    appUuid: string
    createdBy?: string
  }
): Promise<WorkflowInstance> {
  const instanceData = {
    instance_code: data.instanceCode,
    workflow_definition_id: data.workflowDefinitionId,
    current_node_id: data.currentNodeId,
    status: 'PENDING' as WorkflowInstanceStatus,
    stakeholder_id: data.stakeholderId,
    version: 1,
    app_uuid: data.appUuid,
    created_by: data.createdBy,
    created_at: new Date(),
    updated_at: new Date(),
  }

  const { data: instance, error } = await supabase
    .from('workflow_engine_instances')
    .insert(instanceData)
    .select()
    .single()

  if (error) {
    throw new WorkflowError(
      'DATABASE_ERROR',
      { operation: 'createWorkflowInstance', error: error.message },
      false,
      `Failed to create workflow instance: ${error.message}`
    )
  }

  return mapDatabaseRowToInstance(instance)
}

// ============================================================================
// Get Instance
// ============================================================================

export async function getWorkflowInstance(
  supabase: SupabaseClient,
  instanceId: string,
  appUuid: string
): Promise<WorkflowInstance> {
  const { data, error } = await supabase
    .from('workflow_engine_instances')
    .select('*')
    .eq('id', instanceId)
    .eq('app_uuid', appUuid)
    .single()

  if (error || !data) {
    throw createInstanceNotFoundError(instanceId)
  }

  return mapDatabaseRowToInstance(data)
}

// ============================================================================
// Update Instance
// ============================================================================

export async function updateWorkflowInstance(
  supabase: SupabaseClient,
  instanceId: string,
  updates: {
    currentNodeId?: string
    status?: WorkflowInstanceStatus
    errorType?: string
    errorDetails?: Record<string, unknown>
    completedAt?: Date
  },
  expectedVersion?: number,
  appUuid?: string
): Promise<WorkflowInstance> {
  const updateData: any = {
    updated_at: new Date(),
  }

  if (updates.currentNodeId) {
    updateData.current_node_id = updates.currentNodeId
  }

  if (updates.status) {
    updateData.status = updates.status
  }

  if (updates.errorType) {
    updateData.error_type = updates.errorType
    updateData.error_details = updates.errorDetails
  }

  if (updates.completedAt) {
    updateData.completed_at = updates.completedAt
  }

  // Optimistic locking: increment version
  if (expectedVersion !== undefined) {
    updateData.version = expectedVersion + 1
  }

  let query = supabase
    .from('workflow_engine_instances')
    .update(updateData)
    .eq('id', instanceId)

  // Optimistic lock check
  if (expectedVersion !== undefined) {
    query = query.eq('version', expectedVersion)
  }

  if (appUuid) {
    query = query.eq('app_uuid', appUuid)
  }

  const { data, error } = await query.select().single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - version mismatch or not found
      throw new WorkflowError(
        'CONCURRENT_MODIFICATION',
        { instanceId, expectedVersion },
        true,
        'Workflow instance was modified concurrently'
      )
    }

    throw new WorkflowError(
      'DATABASE_ERROR',
      { operation: 'updateWorkflowInstance', error: error.message },
      false,
      `Failed to update workflow instance: ${error.message}`
    )
  }

  return mapDatabaseRowToInstance(data)
}

// ============================================================================
// List Instances
// ============================================================================

export async function listWorkflowInstances(
  supabase: SupabaseClient,
  appUuid: string,
  filters?: {
    stakeholderId?: string
    status?: WorkflowInstanceStatus | WorkflowInstanceStatus[]
    definitionId?: string
    limit?: number
    offset?: number
  }
): Promise<WorkflowInstance[]> {
  let query = supabase
    .from('workflow_engine_instances')
    .select('*')
    .eq('app_uuid', appUuid)

  if (filters?.stakeholderId) {
    query = query.eq('stakeholder_id', filters.stakeholderId)
  }

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status)
    } else {
      query = query.eq('status', filters.status)
    }
  }

  if (filters?.definitionId) {
    query = query.eq('workflow_definition_id', filters.definitionId)
  }

  query = query.order('created_at', { ascending: false })

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
  }

  const { data, error } = await query

  if (error) {
    throw new WorkflowError(
      'DATABASE_ERROR',
      { operation: 'listWorkflowInstances', error: error.message },
      false,
      `Failed to list workflow instances: ${error.message}`
    )
  }

  return (data || []).map(mapDatabaseRowToInstance)
}

// ============================================================================
// Delete Instance
// ============================================================================

export async function deleteWorkflowInstance(
  supabase: SupabaseClient,
  instanceId: string,
  appUuid: string
): Promise<void> {
  const { error } = await supabase
    .from('workflow_engine_instances')
    .delete()
    .eq('id', instanceId)
    .eq('app_uuid', appUuid)

  if (error) {
    throw new WorkflowError(
      'DATABASE_ERROR',
      { operation: 'deleteWorkflowInstance', error: error.message },
      false,
      `Failed to delete workflow instance: ${error.message}`
    )
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function mapDatabaseRowToInstance(row: any): WorkflowInstance {
  return {
    id: row.id,
    instanceCode: row.instance_code,
    workflowDefinitionId: row.workflow_definition_id,
    currentNodeId: row.current_node_id,
    status: row.status,
    errorType: row.error_type,
    errorDetails: row.error_details,
    stakeholderId: row.stakeholder_id,
    version: row.version,
    appUuid: row.app_uuid,
    createdAt: new Date(row.created_at),
    createdBy: row.created_by,
    updatedAt: new Date(row.updated_at),
    updatedBy: row.updated_by,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
  }
}

/**
 * Generate unique instance code
 */
export function generateInstanceCode(templateCode: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${templateCode}-${timestamp}-${random}`
}
