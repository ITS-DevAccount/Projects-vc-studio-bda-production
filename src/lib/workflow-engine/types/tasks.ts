/**
 * Work Token and Task Types
 *
 * Types for instance tasks (work tokens) created by the workflow engine
 */

import { z } from 'zod'
import { ImplementationType } from './registry'

// ============================================================================
// Task Status
// ============================================================================

export type TaskStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

export const TaskStatusSchema = z.enum([
  'PENDING',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
])

// ============================================================================
// Instance Task (Work Token)
// ============================================================================

export interface InstanceTask {
  id: string
  taskCode: string

  // Workflow reference
  workflowInstanceId: string

  // Node identification
  nodeId: string

  // Function reference
  functionCode: string
  implementationType: ImplementationType

  // Task data
  inputData: Record<string, unknown>
  outputData?: Record<string, unknown>

  // Agent assignment (populated based on implementation type)
  assignedRole?: string
  assignedUserId?: string
  uiWidgetId?: string

  // Service task config
  serviceEndpoint?: string
  httpConfig?: Record<string, unknown>

  // AI task config
  aiConfig?: Record<string, unknown>

  // Task status
  status: TaskStatus

  // Validation
  outputValidated: boolean
  validationErrors?: Array<{
    field: string
    message: string
  }>

  // Multi-tenancy
  appUuid: string

  // Audit
  createdAt: Date
  createdBy?: string
  startedAt?: Date
  completedAt?: Date
}

export const InstanceTaskSchema = z.object({
  id: z.string().uuid(),
  taskCode: z.string().min(1),
  workflowInstanceId: z.string().uuid(),
  nodeId: z.string().min(1),
  functionCode: z.string().min(1),
  implementationType: z.enum(['USER_TASK', 'SERVICE_TASK', 'AI_AGENT_TASK']),
  inputData: z.record(z.string(), z.unknown()),
  outputData: z.record(z.string(), z.unknown()).optional(),
  assignedRole: z.string().optional(),
  assignedUserId: z.string().uuid().optional(),
  uiWidgetId: z.string().optional(),
  serviceEndpoint: z.string().optional(),
  httpConfig: z.record(z.string(), z.unknown()).optional(),
  aiConfig: z.record(z.string(), z.unknown()).optional(),
  status: TaskStatusSchema,
  outputValidated: z.boolean(),
  validationErrors: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })).optional(),
  appUuid: z.string().uuid(),
  createdAt: z.date(),
  createdBy: z.string().uuid().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
})

// ============================================================================
// Create Task Request
// ============================================================================

export interface CreateTaskRequest {
  workflowInstanceId: string
  nodeId: string
  functionCode: string
  inputData: Record<string, unknown>
  assignedRole?: string
  assignedUserId?: string
}

export const CreateTaskRequestSchema = z.object({
  workflowInstanceId: z.string().uuid(),
  nodeId: z.string().min(1),
  functionCode: z.string().min(1),
  inputData: z.record(z.string(), z.unknown()),
  assignedRole: z.string().optional(),
  assignedUserId: z.string().uuid().optional(),
})

// ============================================================================
// Complete Task Request
// ============================================================================

export interface CompleteTaskRequest {
  taskId: string
  outputData: Record<string, unknown>
}

export const CompleteTaskRequestSchema = z.object({
  taskId: z.string().uuid(),
  outputData: z.record(z.string(), z.unknown()),
})

// ============================================================================
// Task Validation Result
// ============================================================================

export interface TaskValidationResult {
  isValid: boolean
  errors?: Array<{
    field: string
    message: string
    expectedType?: string
    actualValue?: unknown
  }>
}
