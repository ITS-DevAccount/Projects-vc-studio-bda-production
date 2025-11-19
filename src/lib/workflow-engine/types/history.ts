/**
 * Workflow History Types
 *
 * Types for workflow execution audit trail
 */

import { z } from 'zod'

// ============================================================================
// Event Types
// ============================================================================

export type WorkflowEventType =
  | 'instance_created'
  | 'instance_started'
  | 'node_evaluated'
  | 'task_created'
  | 'task_assigned'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'transition_evaluated'
  | 'context_updated'
  | 'instance_completed'
  | 'instance_failed'
  | 'instance_paused'
  | 'instance_resumed'
  | 'error_occurred'

export const WorkflowEventTypeSchema = z.enum([
  'instance_created',
  'instance_started',
  'node_evaluated',
  'task_created',
  'task_assigned',
  'task_started',
  'task_completed',
  'task_failed',
  'transition_evaluated',
  'context_updated',
  'instance_completed',
  'instance_failed',
  'instance_paused',
  'instance_resumed',
  'error_occurred',
])

// ============================================================================
// Actor Types
// ============================================================================

export type ActorType = 'SYSTEM' | 'USER' | 'SERVICE' | 'AI_AGENT'

export const ActorTypeSchema = z.enum(['SYSTEM', 'USER', 'SERVICE', 'AI_AGENT'])

// ============================================================================
// History Entry
// ============================================================================

export interface WorkflowHistoryEntry {
  id: string
  workflowInstanceId: string

  // Event classification
  eventType: WorkflowEventType

  // Context
  nodeId?: string
  taskId?: string
  details: Record<string, unknown>

  // Actor tracking
  actorType?: ActorType
  actorId?: string

  // Multi-tenancy
  appUuid: string

  // Timestamp
  createdAt: Date
}

export const WorkflowHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  workflowInstanceId: z.string().uuid(),
  eventType: WorkflowEventTypeSchema,
  nodeId: z.string().optional(),
  taskId: z.string().uuid().optional(),
  details: z.record(z.unknown()),
  actorType: ActorTypeSchema.optional(),
  actorId: z.string().optional(),
  appUuid: z.string().uuid(),
  createdAt: z.date(),
})

// ============================================================================
// Log Event Request
// ============================================================================

export interface LogEventRequest {
  workflowInstanceId: string
  eventType: WorkflowEventType
  nodeId?: string
  taskId?: string
  details?: Record<string, unknown>
  actorType?: ActorType
  actorId?: string
}

export const LogEventRequestSchema = z.object({
  workflowInstanceId: z.string().uuid(),
  eventType: WorkflowEventTypeSchema,
  nodeId: z.string().optional(),
  taskId: z.string().uuid().optional(),
  details: z.record(z.unknown()).optional(),
  actorType: ActorTypeSchema.optional(),
  actorId: z.string().optional(),
})

// ============================================================================
// History Query Options
// ============================================================================

export interface HistoryQueryOptions {
  workflowInstanceId?: string
  eventTypes?: WorkflowEventType[]
  taskId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

// ============================================================================
// Event Details by Type
// ============================================================================

export interface InstanceCreatedDetails {
  templateId: string
  templateCode: string
  rootNodeId: string
  initialContext?: Record<string, unknown>
}

export interface NodeEvaluatedDetails {
  nodeId: string
  nodeType: string
  nodeName: string
  evaluationResult: string
}

export interface TaskCreatedDetails {
  taskId: string
  taskCode: string
  functionCode: string
  implementationType: string
  nodeId: string
}

export interface TransitionEvaluatedDetails {
  fromNodeId: string
  toNodeId: string
  transitionId?: string
  condition?: string
  conditionResult?: boolean
}

export interface ContextUpdatedDetails {
  scope: string
  keysUpdated: string[]
  taskId?: string
}

export interface ErrorOccurredDetails {
  errorType: string
  errorMessage: string
  nodeId?: string
  taskId?: string
  stackTrace?: string
}
