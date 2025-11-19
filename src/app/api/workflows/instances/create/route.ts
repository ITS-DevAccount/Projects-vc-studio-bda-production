/**
 * POST /api/workflows/instances/create
 *
 * Creates a new workflow instance from a template
 * Initializes context, evaluates root node, and creates work tokens if needed
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAppUuid } from '@/lib/server/getAppUuid'
import {
  StateMachineEvaluator,
  ContextManager,
  RegistryLookup,
  AgentDetermination,
  WorkTokenCreator,
  ExecutionLogger,
  WorkflowError,
} from '@/lib/workflow-engine'
import {
  getWorkflowDefinition,
  createWorkflowInstance,
  generateInstanceCode,
} from '@/lib/db/workflows'

// ============================================================================
// Helper Functions
// ============================================================================

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization')
  return authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined
}

// ============================================================================
// POST /api/workflows/instances/create
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Get access token and initialize Supabase
    const accessToken = getAccessToken(request)
    const supabase = await createServerClient(accessToken)
    const appUuid = await getAppUuid(accessToken)

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const {
      workflowTemplateId,
      initialContext = {},
      stakeholderId,
    } = body

    if (!workflowTemplateId) {
      return NextResponse.json(
        { error: 'Missing required field: workflowTemplateId' },
        { status: 400 }
      )
    }

    // ========================================================================
    // Transaction Logic (Application-level Rollback)
    // ========================================================================

    const rollbackActions: Array<() => Promise<void>> = []

    try {
      // Step 1: Get workflow definition
      const definition = await getWorkflowDefinition(
        supabase,
        workflowTemplateId,
        appUuid
      )

      if (!definition.isActive) {
        return NextResponse.json(
          { error: 'Workflow template is not active' },
          { status: 400 }
        )
      }

      // Step 2: Create workflow instance
      const instanceCode = generateInstanceCode(definition.templateCode)
      const instance = await createWorkflowInstance(supabase, {
        instanceCode,
        workflowDefinitionId: definition.id,
        currentNodeId: definition.rootNodeId,
        stakeholderId,
        appUuid,
        createdBy: user.id,
      })

      rollbackActions.push(async () => {
        // Rollback: Delete instance (cascade will delete context/tasks)
        await supabase
          .from('workflow_engine_instances')
          .delete()
          .eq('id', instance.id)
      })

      // Step 3: Initialize context
      const contextManager = new ContextManager(supabase, appUuid)
      if (Object.keys(initialContext).length > 0) {
        await contextManager.initializeContext(
          instance.id,
          initialContext,
          user.id
        )
      }

      // Step 4: Initialize execution logger
      const logger = new ExecutionLogger(supabase, appUuid)

      // Log instance creation
      await logger.logInstanceCreated(
        instance.id,
        definition.id,
        definition.templateCode,
        definition.rootNodeId,
        initialContext,
        user.id
      )

      // Step 5: Evaluate root node
      const stateMachine = new StateMachineEvaluator()
      const effectiveContext = await contextManager.getEffectiveContext(
        instance.id,
        'workflow'
      )

      const transition = await stateMachine.evaluateNode(
        instance,
        definition,
        effectiveContext.merged
      )

      // Log node evaluation
      const rootNode = definition.definitionJson.nodes[definition.rootNodeId]
      await logger.logNodeEvaluated(
        instance.id,
        definition.rootNodeId,
        rootNode.type,
        rootNode.name,
        transition.action
      )

      // Step 6: Handle transition result
      let workToken = null

      if (transition.action === 'CREATE_TASK') {
        // Create work token for task
        const taskNode = definition.definitionJson.nodes[transition.taskNodeId]
        
        // Ensure it's a TaskNode (only TaskNodes have functionCode)
        if (taskNode.type === 'TASK_NODE') {

        const registryLookup = new RegistryLookup(supabase, appUuid)
        const agentDetermination = new AgentDetermination()
        const workTokenCreator = new WorkTokenCreator(supabase, appUuid)

        // Lookup function in registry
        const registryEntry = await registryLookup.lookupFunction(
          taskNode.functionCode
        )

        // Determine agent assignment
        const agentAssignment = await agentDetermination.determineAgent(
          registryEntry,
          taskNode,
          instance
        )

        // Extract input data from context
        const inputData = contextManager.extractInputData(
          effectiveContext.merged,
          taskNode.inputMapping
        )

        // Create work token
        workToken = await workTokenCreator.createWorkToken(
          taskNode,
          instance,
          registryEntry,
          agentAssignment,
          inputData,
          user.id
        )

          // Log task creation
          await logger.logTaskCreated(
            instance.id,
            workToken.id,
            workToken.taskCode,
            workToken.functionCode,
            workToken.implementationType,
            taskNode.id
          )

          // Update instance status to PENDING_TASK
          await supabase
            .from('workflow_engine_instances')
            .update({ status: 'PENDING_TASK', updated_at: new Date() })
            .eq('id', instance.id)
        }
      } else if (transition.action === 'TRANSITION') {
        // Move to next node (Start node transitioning)
        await supabase
          .from('workflow_engine_instances')
          .update({
            current_node_id: transition.toNodeId,
            status: 'RUNNING',
            updated_at: new Date(),
          })
          .eq('id', instance.id)

        await logger.logTransitionEvaluated(
          instance.id,
          transition.fromNodeId,
          transition.toNodeId
        )

      } else if (transition.action === 'END') {
        // Workflow completed immediately
        await supabase
          .from('workflow_engine_instances')
          .update({
            status: 'COMPLETED',
            completed_at: new Date(),
            updated_at: new Date(),
          })
          .eq('id', instance.id)

        await logger.logInstanceCompleted(instance.id)
      }

      // Success - return result
      return NextResponse.json({
        success: true,
        instance: {
          id: instance.id,
          instanceCode: instance.instanceCode,
          status: workToken ? 'PENDING_TASK' : instance.status,
          currentNodeId: instance.currentNodeId,
        },
        workToken: workToken
          ? {
              id: workToken.id,
              taskCode: workToken.taskCode,
              functionCode: workToken.functionCode,
              implementationType: workToken.implementationType,
              status: workToken.status,
            }
          : null,
      })
    } catch (error) {
      // Rollback all actions
      console.error('[Workflow] Error creating instance, rolling back:', error)

      for (const rollback of rollbackActions.reverse()) {
        try {
          await rollback()
        } catch (rollbackError) {
          console.error('[Workflow] Rollback error:', rollbackError)
        }
      }

      throw error
    }
  } catch (error) {
    console.error('[Workflow] Error creating workflow instance:', error)

    if (error instanceof WorkflowError) {
      return NextResponse.json(
        {
          error: error.getUserMessage(),
          details: {
            type: error.type,
            details: error.details,
          },
        },
        { status: error.recoverable ? 400 : 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create workflow instance' },
      { status: 500 }
    )
  }
}
