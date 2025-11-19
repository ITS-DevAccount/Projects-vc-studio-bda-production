/**
 * Node Evaluator
 *
 * Evaluates individual workflow nodes and determines next actions
 */

import {
  WorkflowNode,
  TaskNode,
  GatewayNode,
  StartNode,
  EndNode,
  StateTransition,
  WorkflowInstance,
  WorkflowDefinition,
} from '../types'
import { WorkflowError } from '../types/errors'

// ============================================================================
// Node Evaluator Class
// ============================================================================

export class NodeEvaluator {
  /**
   * Evaluate a node and determine the next state transition
   *
   * @param node - The node to evaluate
   * @param instance - Current workflow instance
   * @param definition - Workflow definition
   * @returns State transition indicating next action
   */
  async evaluateNode(
    node: WorkflowNode,
    instance: WorkflowInstance,
    definition: WorkflowDefinition
  ): Promise<StateTransition> {
    switch (node.type) {
      case 'START_NODE':
        return this.evaluateStartNode(node as StartNode)

      case 'TASK_NODE':
        return this.evaluateTaskNode(node as TaskNode)

      case 'GATEWAY_NODE':
        // Gateway evaluation requires context, handled by condition evaluator
        // Return WAIT here; state machine will handle transition evaluation
        return {
          action: 'WAIT',
          reason: 'gateway_requires_condition_evaluation',
        }

      case 'END_NODE':
        return this.evaluateEndNode(node as EndNode)

      default:
        throw new WorkflowError(
          'INVALID_NODE_TYPE',
          { nodeType: (node as any).type, nodeId: node.id },
          false,
          `Invalid node type: ${(node as any).type}`
        )
    }
  }

  /**
   * Evaluate a START node
   *
   * Start nodes simply transition to the next node
   */
  private async evaluateStartNode(node: StartNode): Promise<StateTransition> {
    return {
      action: 'TRANSITION',
      fromNodeId: node.id,
      toNodeId: node.nextNodeId,
    }
  }

  /**
   * Evaluate a TASK node
   *
   * Task nodes trigger work token creation
   */
  private async evaluateTaskNode(node: TaskNode): Promise<StateTransition> {
    return {
      action: 'CREATE_TASK',
      taskNodeId: node.id,
      nextNodeId: node.nextNodeId,
    }
  }

  /**
   * Evaluate an END node
   *
   * End nodes mark workflow completion
   */
  private async evaluateEndNode(node: EndNode): Promise<StateTransition> {
    return {
      action: 'END',
      status: node.outcome === 'FAILURE' ? 'failed' : 'completed',
      reason: node.outcome,
    }
  }

  /**
   * Get node by ID from workflow definition
   *
   * @param definition - Workflow definition
   * @param nodeId - Node identifier
   * @returns Workflow node
   * @throws WorkflowError if node not found
   */
  getNode(definition: WorkflowDefinition, nodeId: string): WorkflowNode {
    const node = definition.definitionJson.nodes[nodeId]

    if (!node) {
      throw new WorkflowError(
        'INVALID_TRANSITION',
        { nodeId, availableNodes: Object.keys(definition.definitionJson.nodes) },
        false,
        `Node not found: ${nodeId}`
      )
    }

    return node
  }
}
