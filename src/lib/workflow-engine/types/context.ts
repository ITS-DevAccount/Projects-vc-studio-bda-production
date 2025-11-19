/**
 * Workflow Context Types
 *
 * Types for workflow context management with scoping
 */

import { z } from 'zod'

// ============================================================================
// Context Scope
// ============================================================================

export type ContextScope = 'GLOBAL' | 'TASK_LOCAL' | 'NODE_LOCAL'

export const ContextScopeSchema = z.enum(['GLOBAL', 'TASK_LOCAL', 'NODE_LOCAL'])

// ============================================================================
// Context Entry
// ============================================================================

export interface ContextEntry {
  id: string
  workflowInstanceId: string
  scope: ContextScope
  key: string
  value: unknown

  // For TASK_LOCAL scope
  taskId?: string

  // Multi-tenancy
  appUuid: string

  // Audit
  createdAt: Date
  createdBy?: string
}

export const ContextEntrySchema = z.object({
  id: z.string().uuid(),
  workflowInstanceId: z.string().uuid(),
  scope: ContextScopeSchema,
  key: z.string().min(1),
  value: z.unknown(),
  taskId: z.string().uuid().optional(),
  appUuid: z.string().uuid(),
  createdAt: z.date(),
  createdBy: z.string().uuid().optional(),
})

// ============================================================================
// Context Data (flattened key-value pairs)
// ============================================================================

export type ContextData = Record<string, unknown>

// ============================================================================
// Context Update Request
// ============================================================================

export interface ContextUpdateRequest {
  workflowInstanceId: string
  scope: ContextScope
  updates: ContextData
  taskId?: string
}

export const ContextUpdateRequestSchema = z.object({
  workflowInstanceId: z.string().uuid(),
  scope: ContextScopeSchema,
  updates: z.record(z.string(), z.unknown()),
  taskId: z.string().uuid().optional(),
})

// ============================================================================
// Context Query Options
// ============================================================================

export interface ContextQueryOptions {
  workflowInstanceId: string
  scope?: ContextScope | ContextScope[]
  taskId?: string
  includeHistory?: boolean // Include all historical values or just latest
}

// ============================================================================
// Effective Context (merged view)
// ============================================================================

export interface EffectiveContext {
  global: ContextData
  taskLocal?: ContextData
  merged: ContextData // task-local overrides global
}
