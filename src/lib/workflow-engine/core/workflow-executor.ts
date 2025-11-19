/**
 * Workflow Executor
 *
 * High-level orchestrator that coordinates state machine, context, registry,
 * and work token creation for workflow execution
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  WorkflowInstance,
  WorkflowDefinition,
  WorkflowExecutionResult,
} from '../types'
import { StateMachineEvaluator } from './state-machine'
import { ContextManager } from '../context/context-manager'
import { RegistryLookup } from '../registry/registry-lookup'
import { AgentDetermination } from '../registry/agent-determination'
import { WorkTokenCreator } from '../tasks/work-token-creator'
import { ExecutionLogger } from '../logging/execution-logger'
import { updateWorkflowInstance } from '@/lib/db/workflows'

// ============================================================================
// Workflow Executor Class
// ============================================================================

export class WorkflowExecutor {
  private supabase: SupabaseClient
  private appUuid: string
  private userId?: string

  private stateMachine: StateMachineEvaluator
  private contextManager: ContextManager
  private registryLookup: RegistryLookup
  private agentDetermination: AgentDetermination
  private workTokenCreator: WorkTokenCreator
  private logger: ExecutionLogger

  constructor(supabase: SupabaseClient, appUuid: string, userId?: string) {
    this.supabase = supabase
    this.appUuid = appUuid
    this.userId = userId

    this.stateMachine = new StateMachineEvaluator()
    this.contextManager = new ContextManager(supabase, appUuid)
    this.registryLookup = new RegistryLookup(supabase, appUuid)
    this.agentDetermination = new AgentDetermination()
    this.workTokenCreator = new WorkTokenCreator(supabase, appUuid)
    this.logger = new ExecutionLogger(supabase, appUuid)
  }

  /**
   * Execute workflow from current state
   *
   * Evaluates current node, creates work tokens if needed,
   * transitions through gateway nodes until reaching a task or end node
   */
  async execute(
    instance: WorkflowInstance,
    definition: WorkflowDefinition
  ): Promise<WorkflowExecutionResult> {
    const result: WorkflowExecutionResult = {
      instanceId: instance.id,
      currentNodeId: instance.currentNodeId,
      status: instance.status,
      workTokensCreated: [],
      transitionsTaken: [],
    }

    try {
      // Get current context
      const effectiveContext = await this.contextManager.getEffectiveContext(
        instance.id,
        'workflow'
      )

      // Evaluate current node
      const transition = await this.stateMachine.evaluateNode(
        instance,
        definition,
        effectiveContext.merged
      )

      // Log evaluation
      const currentNode = definition.definitionJson.nodes[instance.currentNodeId]
      await this.logger.logNodeEvaluated(
        instance.id,
        instance.currentNodeId,
        currentNode.type,
        currentNode.name,
        transition.action
      )

      // Handle transition
      if (transition.action === 'CREATE_TASK') {
        // Create work token
        const taskNode = definition.definitionJson.nodes[transition.taskNodeId]
        
        // Ensure it's a TaskNode (only TaskNodes have functionCode)
        if (taskNode.type !== 'TASK_NODE') {
          throw new Error(`Node ${taskNode.id} is not a TASK_NODE`)
        }
        
        const registryEntry = await this.registryLookup.lookupFunction(
          taskNode.functionCode
        )

        const agentAssignment = await this.agentDetermination.determineAgent(
          registryEntry,
          taskNode,
          instance
        )

        const inputData = this.contextManager.extractInputData(
          effectiveContext.merged,
          taskNode.inputMapping
        )

        const workToken = await this.workTokenCreator.createWorkToken(
          taskNode,
          instance,
          registryEntry,
          agentAssignment,
          inputData,
          this.userId
        )

        await this.logger.logTaskCreated(
          instance.id,
          workToken.id,
          workToken.taskCode,
          workToken.functionCode,
          workToken.implementationType,
          taskNode.id
        )

        // Update instance status
        await updateWorkflowInstance(
          this.supabase,
          instance.id,
          {
            status: 'PENDING_TASK',
          },
          instance.version,
          this.appUuid
        )

        result.status = 'PENDING_TASK'
        result.workTokensCreated = [workToken.id]

      } else if (transition.action === 'TRANSITION') {
        // Transition to next node
        await this.logger.logTransitionEvaluated(
          instance.id,
          transition.fromNodeId,
          transition.toNodeId,
          transition.condition
        )

        const updatedInstance = await updateWorkflowInstance(
          this.supabase,
          instance.id,
          {
            currentNodeId: transition.toNodeId,
            status: 'RUNNING',
          },
          instance.version,
          this.appUuid
        )

        result.currentNodeId = transition.toNodeId
        result.status = 'RUNNING'
        result.transitionsTaken = [transition.toNodeId]

        // Recursively execute next node if it's a gateway
        const nextNode = definition.definitionJson.nodes[transition.toNodeId]
        if (nextNode.type === 'GATEWAY_NODE') {
          const nextResult = await this.execute(updatedInstance, definition)
          result.currentNodeId = nextResult.currentNodeId
          result.status = nextResult.status
          result.workTokensCreated?.push(...(nextResult.workTokensCreated || []))
          result.transitionsTaken?.push(...(nextResult.transitionsTaken || []))
        }

      } else if (transition.action === 'END') {
        // Workflow completed
        await updateWorkflowInstance(
          this.supabase,
          instance.id,
          {
            status: transition.status === 'failed' ? 'FAILED' : 'COMPLETED',
            completedAt: new Date(),
          },
          instance.version,
          this.appUuid
        )

        await this.logger.logInstanceCompleted(instance.id, transition.reason)

        result.status = transition.status === 'failed' ? 'FAILED' : 'COMPLETED'
      }

      return result
    } catch (error: any) {
      // Log error
      await this.logger.logError(instance.id, {
        type: error.type || 'UNKNOWN_ERROR',
        message: error.message,
        nodeId: instance.currentNodeId,
        stackTrace: error.stack,
      })

      // Update instance with error
      await updateWorkflowInstance(
        this.supabase,
        instance.id,
        {
          status: 'FAILED',
          errorType: error.type || 'UNKNOWN_ERROR',
          errorDetails: { message: error.message, details: error.details },
        },
        instance.version,
        this.appUuid
      )

      result.status = 'FAILED'
      result.error = {
        type: error.type || 'UNKNOWN_ERROR',
        message: error.message,
        details: error.details,
      }

      return result
    }
  }
}
