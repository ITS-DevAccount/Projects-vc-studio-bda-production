/**
 * Function Registry Types
 *
 * Types for the function registry that decouples workflow definitions
 * from task implementations
 */

import { z } from 'zod'

// ============================================================================
// Implementation Types
// ============================================================================

export type ImplementationType = 'USER_TASK' | 'SERVICE_TASK' | 'AI_AGENT_TASK'

export const ImplementationTypeSchema = z.enum(['USER_TASK', 'SERVICE_TASK', 'AI_AGENT_TASK'])

// ============================================================================
// JSON Schema Type (for input/output validation)
// ============================================================================

export interface JsonSchema {
  type?: string
  properties?: Record<string, JsonSchema>
  required?: string[]
  items?: JsonSchema
  additionalProperties?: boolean | JsonSchema
  [key: string]: unknown
}

export const JsonSchemaSchema: z.ZodType<JsonSchema> = z.lazy(() =>
  z.object({
    type: z.string().optional(),
    properties: z.record(JsonSchemaSchema).optional(),
    required: z.array(z.string()).optional(),
    items: JsonSchemaSchema.optional(),
    additionalProperties: z.union([z.boolean(), JsonSchemaSchema]).optional(),
  }).passthrough()
)

// ============================================================================
// Implementation Configurations
// ============================================================================

export interface UserTaskConfig {
  uiWidgetId?: string
  allowedRoles?: string[]
  instructions?: string
}

export const UserTaskConfigSchema = z.object({
  uiWidgetId: z.string().optional(),
  allowedRoles: z.array(z.string()).optional(),
  instructions: z.string().optional(),
})

export interface ServiceTaskConfig {
  endpointUrl: string
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  authConfig?: {
    type: 'NONE' | 'BEARER' | 'API_KEY' | 'BASIC'
    credentials?: Record<string, string>
  }
  headers?: Record<string, string>
  timeout?: number
}

export const ServiceTaskConfigSchema = z.object({
  endpointUrl: z.string().url(),
  httpMethod: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  authConfig: z.object({
    type: z.enum(['NONE', 'BEARER', 'API_KEY', 'BASIC']),
    credentials: z.record(z.string()).optional(),
  }).optional(),
  headers: z.record(z.string()).optional(),
  timeout: z.number().optional(),
})

export interface AIAgentTaskConfig {
  aiProvider: 'anthropic' | 'openai'
  model: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  additionalParams?: Record<string, unknown>
}

export const AIAgentTaskConfigSchema = z.object({
  aiProvider: z.enum(['anthropic', 'openai']),
  model: z.string(),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().optional(),
  additionalParams: z.record(z.unknown()).optional(),
})

export type TaskConfig = UserTaskConfig | ServiceTaskConfig | AIAgentTaskConfig

// ============================================================================
// Function Registry Entry
// ============================================================================

export interface FunctionRegistryEntry {
  id: string
  functionCode: string
  functionName: string
  description?: string

  // Implementation details
  implementationType: ImplementationType

  // Validation schemas
  inputSchema: JsonSchema
  outputSchema: JsonSchema

  // Implementation-specific configuration
  config: TaskConfig

  // Versioning
  version: number
  isActive: boolean

  // Multi-tenancy
  appUuid: string

  // Audit
  createdAt: Date
  createdBy?: string
  updatedAt: Date
  updatedBy?: string
}

export const FunctionRegistryEntrySchema = z.object({
  id: z.string().uuid(),
  functionCode: z.string().min(1),
  functionName: z.string().min(1),
  description: z.string().optional(),
  implementationType: ImplementationTypeSchema,
  inputSchema: JsonSchemaSchema,
  outputSchema: JsonSchemaSchema,
  config: z.record(z.unknown()), // Will validate based on implementationType
  version: z.number().int().min(1),
  isActive: z.boolean(),
  appUuid: z.string().uuid(),
  createdAt: z.date(),
  createdBy: z.string().uuid().optional(),
  updatedAt: z.date(),
  updatedBy: z.string().uuid().optional(),
})

// ============================================================================
// Agent Assignment
// ============================================================================

export interface BaseAgentAssignment {
  implementationType: ImplementationType
}

export interface UserTaskAssignment extends BaseAgentAssignment {
  implementationType: 'USER_TASK'
  assignedRole?: string
  assignedUserId?: string
  uiWidgetId?: string
  instructions?: string
}

export interface ServiceTaskAssignment extends BaseAgentAssignment {
  implementationType: 'SERVICE_TASK'
  serviceEndpoint: string
  httpMethod: string
  httpConfig: {
    headers?: Record<string, string>
    auth?: Record<string, unknown>
    timeout?: number
  }
}

export interface AIAgentTaskAssignment extends BaseAgentAssignment {
  implementationType: 'AI_AGENT_TASK'
  aiConfig: {
    provider: string
    model: string
    systemPrompt?: string
    temperature?: number
    maxTokens?: number
  }
}

export type AgentAssignment =
  | UserTaskAssignment
  | ServiceTaskAssignment
  | AIAgentTaskAssignment

// ============================================================================
// Registry Lookup Result
// ============================================================================

export interface RegistryLookupResult {
  registryEntry: FunctionRegistryEntry
  agentAssignment: AgentAssignment
}
