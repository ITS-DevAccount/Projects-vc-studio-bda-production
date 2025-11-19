/**
 * Condition Evaluator
 *
 * Evaluates JSONPath conditions for gateway transitions
 */

import { JSONPath } from 'jsonpath-plus'
import {
  GatewayNode,
  Transition,
  ContextData,
  StateTransition,
} from '../types'
import {
  createNoMatchingTransitionError,
  createJsonPathEvaluationError,
  WorkflowError,
} from '../types/errors'

// ============================================================================
// Condition Evaluator Class
// ============================================================================

export class ConditionEvaluator {
  /**
   * Evaluate gateway node and determine next transition
   *
   * @param gatewayNode - Gateway node to evaluate
   * @param context - Current workflow context
   * @returns State transition to next node
   * @throws WorkflowError if no matching transition found
   */
  async evaluateGateway(
    gatewayNode: GatewayNode,
    context: ContextData
  ): Promise<StateTransition> {
    const { gatewayType, transitions } = gatewayNode

    switch (gatewayType) {
      case 'EXCLUSIVE':
        return this.evaluateExclusiveGateway(gatewayNode, transitions, context)

      case 'INCLUSIVE':
        // Future enhancement: Multiple parallel paths
        throw new WorkflowError(
          'INVALID_CONFIGURATION',
          { gatewayType, message: 'INCLUSIVE gateways not yet implemented' },
          false
        )

      case 'PARALLEL':
        // Future enhancement: Fork into multiple parallel executions
        throw new WorkflowError(
          'INVALID_CONFIGURATION',
          { gatewayType, message: 'PARALLEL gateways not yet implemented' },
          false
        )

      default:
        throw new WorkflowError(
          'INVALID_CONFIGURATION',
          { gatewayType, message: `Unknown gateway type: ${gatewayType}` },
          false
        )
    }
  }

  /**
   * Evaluate exclusive gateway (XOR - first matching transition wins)
   *
   * @param gatewayNode - Gateway node
   * @param transitions - Available transitions
   * @param context - Current context
   * @returns Transition to next node
   */
  private async evaluateExclusiveGateway(
    gatewayNode: GatewayNode,
    transitions: Transition[],
    context: ContextData
  ): Promise<StateTransition> {
    // Evaluate transitions in order
    for (const transition of transitions) {
      // Skip default transitions initially
      if (transition.isDefault) {
        continue
      }

      // Evaluate condition
      if (transition.condition) {
        const result = await this.evaluateCondition(transition.condition, context)

        if (result === true) {
          return {
            action: 'TRANSITION',
            fromNodeId: gatewayNode.id,
            toNodeId: transition.targetNodeId,
            condition: transition.condition,
          }
        }
      } else {
        // No condition means always match (unless marked as default)
        return {
          action: 'TRANSITION',
          fromNodeId: gatewayNode.id,
          toNodeId: transition.targetNodeId,
        }
      }
    }

    // No conditions matched - check for default transition
    const defaultTransition = transitions.find(t => t.isDefault)
    if (defaultTransition) {
      return {
        action: 'TRANSITION',
        fromNodeId: gatewayNode.id,
        toNodeId: defaultTransition.targetNodeId,
      }
    }

    // No matching transition found - error
    throw createNoMatchingTransitionError(gatewayNode.id, context)
  }

  /**
   * Evaluate a single JSONPath condition
   *
   * Supported formats:
   * - Simple JSONPath: "$.status" (truthy check)
   * - Comparison: "$.amount > 1000"
   * - Equality: "$.status == 'approved'"
   * - Boolean: "$.isActive"
   *
   * @param condition - JSONPath expression
   * @param context - Context data to evaluate against
   * @returns Boolean result
   */
  async evaluateCondition(
    condition: string,
    context: ContextData
  ): Promise<boolean> {
    try {
      // Check for comparison operators
      if (this.hasComparisonOperator(condition)) {
        return this.evaluateComparisonCondition(condition, context)
      }

      // Simple JSONPath - evaluate and check truthiness
      const result = JSONPath({ path: condition, json: context })

      // JSONPath returns array of results
      if (Array.isArray(result)) {
        if (result.length === 0) {
          return false
        }
        // Check first result for truthiness
        return this.isTruthy(result[0])
      }

      return this.isTruthy(result)
    } catch (error) {
      throw createJsonPathEvaluationError(
        condition,
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  /**
   * Check if condition contains comparison operators
   */
  private hasComparisonOperator(condition: string): boolean {
    return /[=!<>]=?/.test(condition)
  }

  /**
   * Evaluate comparison condition (e.g., "$.amount > 1000")
   */
  private evaluateComparisonCondition(
    condition: string,
    context: ContextData
  ): boolean {
    // Parse condition into: path operator value
    // Supported: ==, !=, >, <, >=, <=
    const match = condition.match(
      /^([$@][\w.\[\]]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/
    )

    if (!match) {
      // Fallback to simple evaluation
      return this.isTruthy(JSONPath({ path: condition, json: context }))
    }

    const [, path, operator, valueStr] = match

    // Extract actual value from context using JSONPath
    const actualValues = JSONPath({ path, json: context })
    const actualValue = Array.isArray(actualValues) ? actualValues[0] : actualValues

    // Parse expected value (handle strings, numbers, booleans, null)
    const expectedValue = this.parseValue(valueStr.trim())

    // Perform comparison
    return this.compareValues(actualValue, operator, expectedValue)
  }

  /**
   * Parse string value into appropriate type
   */
  private parseValue(valueStr: string): any {
    // String literal
    if ((valueStr.startsWith("'") && valueStr.endsWith("'")) ||
        (valueStr.startsWith('"') && valueStr.endsWith('"'))) {
      return valueStr.slice(1, -1)
    }

    // Number
    if (!isNaN(Number(valueStr))) {
      return Number(valueStr)
    }

    // Boolean
    if (valueStr === 'true') return true
    if (valueStr === 'false') return false

    // Null
    if (valueStr === 'null') return null

    // Default: treat as string
    return valueStr
  }

  /**
   * Compare two values using operator
   */
  private compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case '==':
        return actual == expected // Loose equality
      case '!=':
        return actual != expected
      case '>':
        return actual > expected
      case '<':
        return actual < expected
      case '>=':
        return actual >= expected
      case '<=':
        return actual <= expected
      default:
        return false
    }
  }

  /**
   * Check if value is truthy
   */
  private isTruthy(value: any): boolean {
    if (value === null || value === undefined) {
      return false
    }
    if (typeof value === 'boolean') {
      return value
    }
    if (typeof value === 'number') {
      return value !== 0
    }
    if (typeof value === 'string') {
      return value.length > 0
    }
    if (Array.isArray(value)) {
      return value.length > 0
    }
    if (typeof value === 'object') {
      return Object.keys(value).length > 0
    }
    return Boolean(value)
  }
}
