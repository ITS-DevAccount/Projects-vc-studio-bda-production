/**
 * POST /api/workflows/instances/:instanceId/task-complete
 *
 * Completes a task and continues workflow execution
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAppUuid } from '@/lib/server/getAppUuid'
import { WorkflowError, WorkTokenCreator, ContextManager, ExecutionLogger } from '@/lib/workflow-engine'
import { WorkflowExecutor } from '@/lib/workflow-engine/core/workflow-executor'
import { getWorkflowInstance, getWorkflowDefinition } from '@/lib/db/workflows'

// ============================================================================
// Helper Functions
// ============================================================================

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization')
  return authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined
}

type RouteContext = { params: Promise<{ instanceId: string }> }

// ============================================================================
// POST /api/workflows/instances/:instanceId/task-complete
// ============================================================================

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { instanceId } = await params

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
    const { workTokenId, outputData } = body

    if (!workTokenId || !outputData) {
      return NextResponse.json(
        { error: 'Missing required fields: workTokenId, outputData' },
        { status: 400 }
      )
    }

    // Get workflow instance
    const instance = await getWorkflowInstance(supabase, instanceId, appUuid)

    if (instance.status !== 'PENDING_TASK') {
      return NextResponse.json(
        { error: 'Instance is not waiting for task completion' },
        { status: 400 }
      )
    }

    // Get work token
    const workTokenCreator = new WorkTokenCreator(supabase, appUuid)
    const workToken = await workTokenCreator.getWorkToken(workTokenId)

    if (workToken.workflowInstanceId !== instanceId) {
      return NextResponse.json(
        { error: 'Work token does not belong to this instance' },
        { status: 400 }
      )
    }

    if (workToken.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Task already completed' },
        { status: 400 }
      )
    }

    // TODO: Validate outputData against output schema from registry
    // For now, accept any output data

    // Update work token with output
    await workTokenCreator.updateWorkTokenStatus(
      workTokenId,
      'COMPLETED',
      outputData
    )

    // Get workflow definition
    const definition = await getWorkflowDefinition(
      supabase,
      instance.workflowDefinitionId,
      appUuid
    )

    // Get task node from definition
    const taskNode = definition.definitionJson.nodes[workToken.nodeId]

    // Merge task output into global context
    const contextManager = new ContextManager(supabase, appUuid)
    await contextManager.mergeTaskOutput(
      instanceId,
      outputData,
      taskNode.outputMapping,
      user.id
    )

    // Log task completion
    const logger = new ExecutionLogger(supabase, appUuid)
    await logger.logTaskCompleted(instanceId, workTokenId, outputData, user.id)

    // Log context update
    const keysUpdated = taskNode.outputMapping
      ? Object.keys(taskNode.outputMapping)
      : Object.keys(outputData)

    await logger.logContextUpdated(instanceId, 'GLOBAL', keysUpdated, workTokenId)

    // Transition to next node
    await logger.logTransitionEvaluated(
      instanceId,
      workToken.nodeId,
      taskNode.nextNodeId
    )

    const updatedInstance = await supabase
      .from('workflow_engine_instances')
      .update({
        current_node_id: taskNode.nextNodeId,
        status: 'RUNNING',
        updated_at: new Date(),
      })
      .eq('id', instanceId)
      .select()
      .single()

    // Continue workflow execution from next node
    const executor = new WorkflowExecutor(supabase, appUuid, user.id)
    const result = await executor.execute(
      {
        ...instance,
        currentNodeId: taskNode.nextNodeId,
        status: 'RUNNING',
      },
      definition
    )

    return NextResponse.json({
      success: true,
      result: {
        instanceId: result.instanceId,
        currentNodeId: result.currentNodeId,
        status: result.status,
        workTokensCreated: result.workTokensCreated,
        transitionsTaken: result.transitionsTaken,
      },
    })
  } catch (error) {
    console.error('[Workflow] Error completing task:', error)

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
      { error: 'Failed to complete task' },
      { status: 500 }
    )
  }
}
