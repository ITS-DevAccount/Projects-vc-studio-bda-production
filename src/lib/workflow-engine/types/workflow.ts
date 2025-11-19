/**
 * Workflow Definition and Instance Types
 *
 * Core types for workflow templates and runtime instances
 */

import { z } from 'zod'
import { NodeCollection, NodeCollectionSchema } from './nodes'

// ============================================================================
// Workflow Definition (Template)
// ============================================================================

export interface WorkflowDefinition {
  id: string
  templateCode: string
  templateName: string
  description?: string
  version: number

  // Workflow structure
  definitionJson: {
    nodes: NodeCollection
    metadata?: Record<string, unknown>
  }

  rootNodeId: string

  // Validation
  isActive: boolean
  isValidated: boolean
  validationErrors?: ValidationError[]

  // Multi-tenancy
  appUuid: string

  // Audit
  createdAt: Date
  createdBy?: string
  updatedAt: Date
  updatedBy?: string
}

export interface ValidationError {
  code: string
  message: string
  path?: string
}

export const ValidationErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  path: z.string().optional(),
})

export const WorkflowDefinitionJsonSchema = z.object({
  nodes: NodeCollectionSchema,
  metadata: z.record(z.unknown()).optional(),
})

export const WorkflowDefinitionSchema = z.object({
  id: z.string().uuid(),
  templateCode: z.string().min(1),
  templateName: z.string().min(1),
  description: z.string().optional(),
  version: z.number().int().min(1),
  definitionJson: WorkflowDefinitionJsonSchema,
  rootNodeId: z.string().min(1),
  isActive: z.boolean(),
  isValidated: z.boolean(),
  validationErrors: z.array(ValidationErrorSchema).optional(),
  appUuid: z.string().uuid(),
  createdAt: z.date(),
  createdBy: z.string().uuid().optional(),
  updatedAt: z.date(),
  updatedBy: z.string().uuid().optional(),
})

// ============================================================================
// Workflow Instance (Runtime)
// ============================================================================

export type WorkflowInstanceStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'PENDING_TASK'
  | 'COMPLETED'
  | 'FAILED'
  | 'PAUSED'

export const WorkflowInstanceStatusSchema = z.enum([
  'PENDING',
  'RUNNING',
  'PENDING_TASK',
  'COMPLETED',
  'FAILED',
  'PAUSED',
])

export interface WorkflowInstance {
  id: string
  instanceCode: string

  // Template reference
  workflowDefinitionId: string

  // State machine state (single source of truth)
  currentNodeId: string
  status: WorkflowInstanceStatus

  // Error tracking
  errorType?: string
  errorDetails?: Record<string, unknown>

  // Stakeholder reference
  stakeholderId?: string

  // Optimistic locking
  version: number

  // Multi-tenancy
  appUuid: string

  // Audit
  createdAt: Date
  createdBy?: string
  updatedAt: Date
  updatedBy?: string
  completedAt?: Date
}

export const WorkflowInstanceSchema = z.object({
  id: z.string().uuid(),
  instanceCode: z.string().min(1),
  workflowDefinitionId: z.string().uuid(),
  currentNodeId: z.string().min(1),
  status: WorkflowInstanceStatusSchema,
  errorType: z.string().optional(),
  errorDetails: z.record(z.unknown()).optional(),
  stakeholderId: z.string().uuid().optional(),
  version: z.number().int().min(1),
  appUuid: z.string().uuid(),
  createdAt: z.date(),
  createdBy: z.string().uuid().optional(),
  updatedAt: z.date(),
  updatedBy: z.string().uuid().optional(),
  completedAt: z.date().optional(),
})

// ============================================================================
// Workflow Instance with Definition (for API responses)
// ============================================================================

export interface WorkflowInstanceWithDefinition extends WorkflowInstance {
  definition: WorkflowDefinition
}

// ============================================================================
// Create Workflow Instance Request
// ============================================================================

export interface CreateWorkflowInstanceRequest {
  workflowTemplateId: string
  initialContext?: Record<string, unknown>
  stakeholderId?: string
}

export const CreateWorkflowInstanceRequestSchema = z.object({
  workflowTemplateId: z.string().uuid(),
  initialContext: z.record(z.unknown()).optional(),
  stakeholderId: z.string().uuid().optional(),
})

// ============================================================================
// State Transition Types
// ============================================================================

export type StateTransitionAction =
  | 'CREATE_TASK'
  | 'TRANSITION'
  | 'END'
  | 'WAIT'
  | 'ERROR'

export interface CreateTaskTransition {
  action: 'CREATE_TASK'
  taskNodeId: string
  nextNodeId: string
}

export interface NodeTransition {
  action: 'TRANSITION'
  fromNodeId: string
  toNodeId: string
  condition?: string
}

export interface EndTransition {
  action: 'END'
  status: 'completed' | 'failed'
  reason?: string
}

export interface WaitTransition {
  action: 'WAIT'
  reason: string
}

export interface ErrorTransition {
  action: 'ERROR'
  errorType: string
  errorDetails: Record<string, unknown>
}

export type StateTransition =
  | CreateTaskTransition
  | NodeTransition
  | EndTransition
  | WaitTransition
  | ErrorTransition

// ============================================================================
// Workflow Execution Result
// ============================================================================

export interface WorkflowExecutionResult {
  instanceId: string
  currentNodeId: string
  status: WorkflowInstanceStatus
  workTokensCreated?: string[]
  transitionsTaken?: string[]
  error?: {
    type: string
    message: string
    details?: Record<string, unknown>
  }
}
