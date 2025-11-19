/**
 * Node Type Definitions for Workflow Engine
 *
 * Defines the structure of workflow nodes in the state machine:
 * - START_NODE: Entry point of workflow
 * - TASK_NODE: Represents work to be done (creates work tokens)
 * - GATEWAY_NODE: Decision point with conditional routing
 * - END_NODE: Terminal state indicating completion
 */

import { z } from 'zod'

// ============================================================================
// Node Types
// ============================================================================

export type NodeType = 'START_NODE' | 'TASK_NODE' | 'GATEWAY_NODE' | 'END_NODE'

export const NodeTypeSchema = z.enum(['START_NODE', 'TASK_NODE', 'GATEWAY_NODE', 'END_NODE'])

// ============================================================================
// Base Node Interface
// ============================================================================

export interface BaseNode {
  id: string
  type: NodeType
  name: string
  description?: string
}

export const BaseNodeSchema = z.object({
  id: z.string().min(1),
  type: NodeTypeSchema,
  name: z.string().min(1),
  description: z.string().optional(),
})

// ============================================================================
// Start Node
// ============================================================================

export interface StartNode extends BaseNode {
  type: 'START_NODE'
  // Start nodes have a single default transition
  nextNodeId: string
}

export const StartNodeSchema = BaseNodeSchema.extend({
  type: z.literal('START_NODE'),
  nextNodeId: z.string().min(1),
})

// ============================================================================
// Task Node
// ============================================================================

export interface InputMapping {
  [taskInputField: string]: string // JSONPath expression to extract from context
}

export interface OutputMapping {
  [contextField: string]: string // JSONPath expression to extract from task output
}

export const InputMappingSchema = z.record(z.string(), z.string())
export const OutputMappingSchema = z.record(z.string(), z.string())

export interface TaskNode extends BaseNode {
  type: 'TASK_NODE'

  // Function reference (looked up in registry)
  functionCode: string

  // Data mapping
  inputMapping?: InputMapping // Extract input from context
  outputMapping?: OutputMapping // Merge output into context

  // Assignment (for USER_TASK)
  assignedRole?: string

  // Transition to next node
  nextNodeId: string
}

export const TaskNodeSchema = BaseNodeSchema.extend({
  type: z.literal('TASK_NODE'),
  functionCode: z.string().min(1),
  inputMapping: InputMappingSchema.optional(),
  outputMapping: OutputMappingSchema.optional(),
  assignedRole: z.string().optional(),
  nextNodeId: z.string().min(1),
})

// ============================================================================
// Gateway Node (Conditional Branching)
// ============================================================================

export interface Transition {
  id: string
  name?: string
  // JSONPath condition evaluated against context
  // Example: "$.approvalStatus == 'approved'"
  condition?: string
  targetNodeId: string
  isDefault?: boolean // Default path if no conditions match
}

export const TransitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  condition: z.string().optional(),
  targetNodeId: z.string().min(1),
  isDefault: z.boolean().optional(),
})

export interface GatewayNode extends BaseNode {
  type: 'GATEWAY_NODE'

  // Gateway type
  gatewayType: 'EXCLUSIVE' | 'INCLUSIVE' | 'PARALLEL'

  // Outgoing transitions with conditions
  transitions: Transition[]
}

export const GatewayNodeSchema = BaseNodeSchema.extend({
  type: z.literal('GATEWAY_NODE'),
  gatewayType: z.enum(['EXCLUSIVE', 'INCLUSIVE', 'PARALLEL']),
  transitions: z.array(TransitionSchema).min(1),
})

// ============================================================================
// End Node
// ============================================================================

export interface EndNode extends BaseNode {
  type: 'END_NODE'

  // Outcome of workflow
  outcome?: 'SUCCESS' | 'FAILURE' | 'CANCELLED'
}

export const EndNodeSchema = BaseNodeSchema.extend({
  type: z.literal('END_NODE'),
  outcome: z.enum(['SUCCESS', 'FAILURE', 'CANCELLED']).optional(),
})

// ============================================================================
// Union Types
// ============================================================================

export type WorkflowNode = StartNode | TaskNode | GatewayNode | EndNode

export const WorkflowNodeSchema = z.discriminatedUnion('type', [
  StartNodeSchema,
  TaskNodeSchema,
  GatewayNodeSchema,
  EndNodeSchema,
])

// ============================================================================
// Node Collection
// ============================================================================

export interface NodeCollection {
  [nodeId: string]: WorkflowNode
}

export const NodeCollectionSchema = z.record(z.string(), WorkflowNodeSchema)
