/**
 * Agent Determination
 *
 * Determines how a task should be executed based on registry configuration
 * Returns agent assignment details for work token creation
 */

import {
  FunctionRegistryEntry,
  AgentAssignment,
  UserTaskAssignment,
  ServiceTaskAssignment,
  AIAgentTaskAssignment,
  TaskNode,
  WorkflowInstance,
} from '../types'
import { WorkflowError } from '../types/errors'

// ============================================================================
// Agent Determination Class
// ============================================================================

export class AgentDetermination {
  /**
   * Determine agent assignment for a task
   *
   * @param registryEntry - Function registry entry
   * @param taskNode - Task node definition
   * @param instance - Workflow instance
   * @returns Agent assignment details
   */
  async determineAgent(
    registryEntry: FunctionRegistryEntry,
    taskNode: TaskNode,
    _instance: WorkflowInstance
  ): Promise<AgentAssignment> {
    switch (registryEntry.implementationType) {
      case 'USER_TASK':
        return this.determineUserTaskAgent(registryEntry, taskNode, _instance)

      case 'SERVICE_TASK':
        return this.determineServiceTaskAgent(registryEntry)

      case 'AI_AGENT_TASK':
        return this.determineAIAgentTaskAgent(registryEntry)

      default:
        throw new WorkflowError(
          'INVALID_CONFIGURATION',
          {
            implementationType: (registryEntry as any).implementationType,
            functionCode: registryEntry.functionCode,
          },
          false,
          `Unknown implementation type: ${(registryEntry as any).implementationType}`
        )
    }
  }

  /**
   * Determine agent for USER_TASK
   *
   * User tasks are assigned to human users based on role
   */
  private async determineUserTaskAgent(
    registryEntry: FunctionRegistryEntry,
    taskNode: TaskNode,
    _instance: WorkflowInstance
  ): Promise<UserTaskAssignment> {
    const config = registryEntry.config as any

    // Get role assignment
    // Priority: task node assignment > registry default > null
    const assignedRole =
      taskNode.assignedRole ||
      (config.allowedRoles && config.allowedRoles[0]) ||
      undefined

    return {
      implementationType: 'USER_TASK',
      assignedRole,
      uiWidgetId: config.uiWidgetId,
      instructions: config.instructions,
    }
  }

  /**
   * Determine agent for SERVICE_TASK
   *
   * Service tasks are executed by calling external HTTP endpoints
   */
  private async determineServiceTaskAgent(
    registryEntry: FunctionRegistryEntry
  ): Promise<ServiceTaskAssignment> {
    const config = registryEntry.config as any

    if (!config.endpointUrl) {
      throw new WorkflowError(
        'INVALID_CONFIGURATION',
        {
          functionCode: registryEntry.functionCode,
          implementationType: 'SERVICE_TASK',
          error: 'Missing required field: endpointUrl',
        },
        false,
        'SERVICE_TASK requires endpointUrl in config'
      )
    }

    return {
      implementationType: 'SERVICE_TASK',
      serviceEndpoint: config.endpointUrl,
      httpMethod: config.httpMethod || 'POST',
      httpConfig: {
        headers: config.headers,
        auth: config.authConfig,
        timeout: config.timeout,
      },
    }
  }

  /**
   * Determine agent for AI_AGENT_TASK
   *
   * AI tasks are executed by AI agents (e.g., Claude, GPT)
   */
  private async determineAIAgentTaskAgent(
    registryEntry: FunctionRegistryEntry
  ): Promise<AIAgentTaskAssignment> {
    const config = registryEntry.config as any

    if (!config.aiProvider || !config.model) {
      throw new WorkflowError(
        'INVALID_CONFIGURATION',
        {
          functionCode: registryEntry.functionCode,
          implementationType: 'AI_AGENT_TASK',
          error: 'Missing required fields: aiProvider, model',
        },
        false,
        'AI_AGENT_TASK requires aiProvider and model in config'
      )
    }

    return {
      implementationType: 'AI_AGENT_TASK',
      aiConfig: {
        provider: config.aiProvider,
        model: config.model,
        systemPrompt: config.systemPrompt,
        temperature: config.temperature ?? 0.7,
        maxTokens: config.maxTokens,
      },
    }
  }

  /**
   * Validate agent assignment against registry constraints
   */
  validateAgentAssignment(
    assignment: AgentAssignment,
    registryEntry: FunctionRegistryEntry
  ): boolean {
    if (assignment.implementationType !== registryEntry.implementationType) {
      return false
    }

    // Type-specific validation
    if (assignment.implementationType === 'USER_TASK') {
      const userAssignment = assignment as UserTaskAssignment
      const config = registryEntry.config as any

      // If registry specifies allowed roles, check assignment is in list
      if (
        config.allowedRoles &&
        userAssignment.assignedRole &&
        !config.allowedRoles.includes(userAssignment.assignedRole)
      ) {
        return false
      }
    }

    return true
  }
}
