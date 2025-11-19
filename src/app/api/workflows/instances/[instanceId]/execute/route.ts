/**
 * POST /api/workflows/instances/:instanceId/execute
 *
 * Continues workflow execution from current state
 * Used to resume paused workflows or manually trigger execution
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAppUuid } from '@/lib/server/getAppUuid'
import { WorkflowError } from '@/lib/workflow-engine'
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
// POST /api/workflows/instances/:instanceId/execute
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

    // Get workflow instance
    const instance = await getWorkflowInstance(supabase, instanceId, appUuid)

    // Check if instance can be executed
    if (instance.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Workflow already completed' },
        { status: 400 }
      )
    }

    if (instance.status === 'FAILED') {
      return NextResponse.json(
        { error: 'Workflow failed - cannot resume' },
        { status: 400 }
      )
    }

    if (instance.status === 'PENDING_TASK') {
      return NextResponse.json(
        { error: 'Workflow is waiting for task completion' },
        { status: 400 }
      )
    }

    // Get workflow definition
    const definition = await getWorkflowDefinition(
      supabase,
      instance.workflowDefinitionId,
      appUuid
    )

    // Execute workflow from current state
    const executor = new WorkflowExecutor(supabase, appUuid, user.id)
    const result = await executor.execute(instance, definition)

    return NextResponse.json({
      success: true,
      result: {
        instanceId: result.instanceId,
        currentNodeId: result.currentNodeId,
        status: result.status,
        workTokensCreated: result.workTokensCreated,
        transitionsTaken: result.transitionsTaken,
        error: result.error,
      },
    })
  } catch (error) {
    console.error('[Workflow] Error executing workflow:', error)

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
      { error: 'Failed to execute workflow' },
      { status: 500 }
    )
  }
}
