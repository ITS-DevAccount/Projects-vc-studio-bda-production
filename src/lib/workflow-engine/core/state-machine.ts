/**
 * State Machine Evaluator
 *
 * Core orchestrator for workflow execution using deterministic state machine pattern
 * Current node state is single source of truth for workflow progress
 */

import {
  WorkflowInstance,
  WorkflowDefinition,
  StateTransition,
  ContextData,
  GatewayNode,
} from '../types'
import { RecursionGuard, DEFAULT_MAX_RECURSION_DEPTH } from './recursion-guard'
import { NodeEvaluator } from './node-evaluator'
import { ConditionEvaluator } from './condition-evaluator'

// ============================================================================
// State Machine Configuration
// ============================================================================

export interface StateMachineConfig {
  maxRecursionDepth?: number
  enableLogging?: boolean
}

// ============================================================================
// State Machine Evaluator Class
// ============================================================================

export class StateMachineEvaluator {
  private recursionGuard: RecursionGuard
  private nodeEvaluator: NodeEvaluator
  private conditionEvaluator: ConditionEvaluator
  private config: StateMachineConfig

  constructor(config: StateMachineConfig = {}) {
    this.config = {
      maxRecursionDepth: config.maxRecursionDepth || DEFAULT_MAX_RECURSION_DEPTH,
      enableLogging: config.enableLogging ?? false,
    }

    this.recursionGuard = new RecursionGuard(this.config.maxRecursionDepth)
    this.nodeEvaluator = new NodeEvaluator()
    this.conditionEvaluator = new ConditionEvaluator()
  }

  /**
   * Evaluate current node and determine next state transition
   *
   * This is the main entry point for state machine evaluation.
   * It handles:
   * - Node type evaluation
   * - Gateway condition evaluation with recursion
   * - Recursion protection
   *
   * @param instance - Current workflow instance
   * @param definition - Workflow definition
   * @param context - Current workflow context
   * @returns State transition indicating next action
   */
  async evaluateNode(
    instance: WorkflowInstance,
    definition: WorkflowDefinition,
    context: ContextData
  ): Promise<StateTransition> {
    // Reset recursion guard for new evaluation
    this.recursionGuard.reset()

    // Start evaluation from current node
    return this.evaluateNodeRecursive(
      instance.currentNodeId,
      instance,
      definition,
      context
    )
  }

  /**
   * Recursively evaluate nodes (used for gateway chains)
   *
   * @param nodeId - Node to evaluate
   * @param instance - Workflow instance
   * @param definition - Workflow definition
   * @param context - Workflow context
   * @returns State transition
   */
  private async evaluateNodeRecursive(
    nodeId: string,
    instance: WorkflowInstance,
    definition: WorkflowDefinition,
    context: ContextData
  ): Promise<StateTransition> {
    // Recursion protection
    this.recursionGuard.enter(nodeId)

    try {
      // Get node from definition
      const node = this.nodeEvaluator.getNode(definition, nodeId)

      if (this.config.enableLogging) {
        console.log(`[StateMachine] Evaluating node: ${nodeId} (${node.type})`)
      }

      // Special handling for gateway nodes (require condition evaluation)
      if (node.type === 'GATEWAY_NODE') {
        return this.evaluateGatewayNodeRecursive(
          node as GatewayNode,
          instance,
          definition,
          context
        )
      }

      // For other node types, evaluate and return
      const transition = await this.nodeEvaluator.evaluateNode(
        node,
        instance,
        definition
      )

      return transition
    } finally {
      // Always exit node in finally block to maintain recursion guard state
      this.recursionGuard.exit()
    }
  }

  /**
   * Evaluate gateway node and recursively evaluate next node if it's also a gateway
   *
   * This allows gateway chains to be evaluated in a single operation,
   * stopping only when a task node, end node, or error is encountered.
   *
   * @param gatewayNode - Gateway node to evaluate
   * @param instance - Workflow instance
   * @param definition - Workflow definition
   * @param context - Workflow context
   * @returns State transition (may be from a downstream node)
   */
  private async evaluateGatewayNodeRecursive(
    gatewayNode: GatewayNode,
    instance: WorkflowInstance,
    definition: WorkflowDefinition,
    context: ContextData
  ): Promise<StateTransition> {
    // Evaluate gateway conditions to determine next node
    const transition = await this.conditionEvaluator.evaluateGateway(
      gatewayNode,
      context
    )

    if (transition.action !== 'TRANSITION') {
      // Unexpected: gateways should always return TRANSITION
      return transition
    }

    // Get the target node
    const nextNodeId = transition.toNodeId
    const nextNode = this.nodeEvaluator.getNode(definition, nextNodeId)

    // If next node is also a gateway, recurse immediately
    if (nextNode.type === 'GATEWAY_NODE') {
      if (this.config.enableLogging) {
        console.log(
          `[StateMachine] Gateway chain detected: ${gatewayNode.id} → ${nextNodeId}`
        )
      }

      // Recursively evaluate the next gateway
      return this.evaluateNodeRecursive(nextNodeId, instance, definition, context)
    }

    // Next node is task/end/start - return transition to it
    return transition
  }

  /**
   * Get current recursion state (for debugging/logging)
   */
  getRecursionState() {
    return this.recursionGuard.getState()
  }

  /**
   * Reset the state machine (for reuse)
   */
  reset(): void {
    this.recursionGuard.reset()
  }
}
