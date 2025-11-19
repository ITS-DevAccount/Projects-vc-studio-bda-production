/**
 * Workflow Definition Database Queries
 *
 * Database operations for workflow_definitions table
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { WorkflowDefinition } from '@/lib/workflow-engine/types'
import { WorkflowError, createTemplateNotFoundError } from '@/lib/workflow-engine/types/errors'

// ============================================================================
// Create Definition
// ============================================================================

export async function createWorkflowDefinition(
  supabase: SupabaseClient,
  data: {
    templateCode: string
    templateName: string
    description?: string
    definitionJson: any
    rootNodeId: string
    appUuid: string
    createdBy?: string
  }
): Promise<WorkflowDefinition> {
  const definitionData = {
    template_code: data.templateCode,
    template_name: data.templateName,
    description: data.description,
    version: 1,
    definition_json: data.definitionJson,
    root_node_id: data.rootNodeId,
    is_active: true,
    is_validated: false,
    app_uuid: data.appUuid,
    created_by: data.createdBy,
    created_at: new Date(),
    updated_at: new Date(),
  }

  const { data: definition, error } = await supabase
    .from('workflow_definitions')
    .insert(definitionData)
    .select()
    .single()

  if (error) {
    throw new WorkflowError(
      'DATABASE_ERROR',
      { operation: 'createWorkflowDefinition', error: error.message },
      false,
      `Failed to create workflow definition: ${error.message}`
    )
  }

  return mapDatabaseRowToDefinition(definition)
}

// ============================================================================
// Get Definition
// ============================================================================

export async function getWorkflowDefinition(
  supabase: SupabaseClient,
  definitionId: string,
  appUuid: string
): Promise<WorkflowDefinition> {
  const { data, error } = await supabase
    .from('workflow_definitions')
    .select('*')
    .eq('id', definitionId)
    .eq('app_uuid', appUuid)
    .single()

  if (error || !data) {
    throw createTemplateNotFoundError(definitionId)
  }

  return mapDatabaseRowToDefinition(data)
}

// ============================================================================
// Get Definition by Template Code
// ============================================================================

export async function getWorkflowDefinitionByCode(
  supabase: SupabaseClient,
  templateCode: string,
  appUuid: string
): Promise<WorkflowDefinition> {
  const { data, error } = await supabase
    .from('workflow_definitions')
    .select('*')
    .eq('template_code', templateCode)
    .eq('app_uuid', appUuid)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    throw new WorkflowError(
      'TEMPLATE_NOT_FOUND',
      { templateCode, appUuid },
      false,
      `Workflow definition not found: ${templateCode}`
    )
  }

  return mapDatabaseRowToDefinition(data)
}

// ============================================================================
// Update Definition
// ============================================================================

export async function updateWorkflowDefinition(
  supabase: SupabaseClient,
  definitionId: string,
  updates: {
    templateName?: string
    description?: string
    definitionJson?: any
    rootNodeId?: string
    isActive?: boolean
    isValidated?: boolean
    validationErrors?: any[]
  },
  appUuid: string
): Promise<WorkflowDefinition> {
  const updateData: any = {
    updated_at: new Date(),
  }

  if (updates.templateName) updateData.template_name = updates.templateName
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.definitionJson) updateData.definition_json = updates.definitionJson
  if (updates.rootNodeId) updateData.root_node_id = updates.rootNodeId
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive
  if (updates.isValidated !== undefined) updateData.is_validated = updates.isValidated
  if (updates.validationErrors !== undefined) updateData.validation_errors = updates.validationErrors

  const { data, error } = await supabase
    .from('workflow_definitions')
    .update(updateData)
    .eq('id', definitionId)
    .eq('app_uuid', appUuid)
    .select()
    .single()

  if (error) {
    throw new WorkflowError(
      'DATABASE_ERROR',
      { operation: 'updateWorkflowDefinition', error: error.message },
      false,
      `Failed to update workflow definition: ${error.message}`
    )
  }

  return mapDatabaseRowToDefinition(data)
}

// ============================================================================
// List Definitions
// ============================================================================

export async function listWorkflowDefinitions(
  supabase: SupabaseClient,
  appUuid: string,
  filters?: {
    isActive?: boolean
    isValidated?: boolean
    limit?: number
    offset?: number
  }
): Promise<WorkflowDefinition[]> {
  let query = supabase
    .from('workflow_definitions')
    .select('*')
    .eq('app_uuid', appUuid)

  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive)
  }

  if (filters?.isValidated !== undefined) {
    query = query.eq('is_validated', filters.isValidated)
  }

  query = query.order('template_code').order('version', { ascending: false })

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
      { operation: 'listWorkflowDefinitions', error: error.message },
      false,
      `Failed to list workflow definitions: ${error.message}`
    )
  }

  // Group by template_code and return highest version only
  const result: WorkflowDefinition[] = []
  const seen = new Set<string>()

  for (const row of data || []) {
    if (!seen.has(row.template_code)) {
      result.push(mapDatabaseRowToDefinition(row))
      seen.add(row.template_code)
    }
  }

  return result
}

// ============================================================================
// Delete Definition
// ============================================================================

export async function deleteWorkflowDefinition(
  supabase: SupabaseClient,
  definitionId: string,
  appUuid: string
): Promise<void> {
  // Soft delete by marking as inactive
  const { error } = await supabase
    .from('workflow_definitions')
    .update({
      is_active: false,
      updated_at: new Date(),
    })
    .eq('id', definitionId)
    .eq('app_uuid', appUuid)

  if (error) {
    throw new WorkflowError(
      'DATABASE_ERROR',
      { operation: 'deleteWorkflowDefinition', error: error.message },
      false,
      `Failed to delete workflow definition: ${error.message}`
    )
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function mapDatabaseRowToDefinition(row: any): WorkflowDefinition {
  return {
    id: row.id,
    templateCode: row.template_code,
    templateName: row.template_name,
    description: row.description,
    version: row.version,
    definitionJson: row.definition_json,
    rootNodeId: row.root_node_id,
    isActive: row.is_active,
    isValidated: row.is_validated,
    validationErrors: row.validation_errors,
    appUuid: row.app_uuid,
    createdAt: new Date(row.created_at),
    createdBy: row.created_by,
    updatedAt: new Date(row.updated_at),
    updatedBy: row.updated_by,
  }
}
