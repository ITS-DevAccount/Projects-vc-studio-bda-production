/**
 * GET /api/workflows/instances/:instanceId
 *
 * Retrieves a workflow instance with all details
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAppUuid } from '@/lib/server/getAppUuid'
import { WorkflowError } from '@/lib/workflow-engine'
import { getWorkflowInstance, getWorkflowDefinition } from '@/lib/db/workflows'
import { WorkTokenCreator, ExecutionLogger, ContextManager } from '@/lib/workflow-engine'

// ============================================================================
// Helper Functions
// ============================================================================

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization')
  return authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined
}

type RouteContext = { params: Promise<{ instanceId: string }> }

// ============================================================================
// GET /api/workflows/instances/:instanceId
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteContext) {
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

    // Get workflow definition
    const definition = await getWorkflowDefinition(
      supabase,
      instance.workflowDefinitionId,
      appUuid
    )

    // Get work tokens
    const workTokenCreator = new WorkTokenCreator(supabase, appUuid)
    const workTokens = await workTokenCreator.getWorkTokensForInstance(instanceId)

    // Get context
    const contextManager = new ContextManager(supabase, appUuid)
    const context = await contextManager.getEffectiveContext(instanceId, 'workflow')

    // Get execution history (last 50 events)
    const logger = new ExecutionLogger(supabase, appUuid)
    const history = await logger.getHistory(instanceId, undefined, 50)

    // Get current node
    const currentNode = definition.definitionJson.nodes[instance.currentNodeId]

    return NextResponse.json({
      instance: {
        id: instance.id,
        instanceCode: instance.instanceCode,
        status: instance.status,
        currentNodeId: instance.currentNodeId,
        currentNode: currentNode
          ? {
              id: currentNode.id,
              type: currentNode.type,
              name: currentNode.name,
            }
          : null,
        errorType: instance.errorType,
        errorDetails: instance.errorDetails,
        stakeholderId: instance.stakeholderId,
        createdAt: instance.createdAt,
        updatedAt: instance.updatedAt,
        completedAt: instance.completedAt,
      },
      definition: {
        id: definition.id,
        templateCode: definition.templateCode,
        templateName: definition.templateName,
        description: definition.description,
      },
      workTokens: workTokens.map(token => ({
        id: token.id,
        taskCode: token.taskCode,
        nodeId: token.nodeId,
        functionCode: token.functionCode,
        implementationType: token.implementationType,
        status: token.status,
        assignedRole: token.assignedRole,
        assignedUserId: token.assignedUserId,
        createdAt: token.createdAt,
        startedAt: token.startedAt,
        completedAt: token.completedAt,
      })),
      context: context.merged,
      history: history.map(event => ({
        id: event.id,
        eventType: event.eventType,
        nodeId: event.nodeId,
        taskId: event.taskId,
        details: event.details,
        createdAt: event.createdAt,
      })),
    })
  } catch (error) {
    console.error('[Workflow] Error retrieving workflow instance:', error)

    if (error instanceof WorkflowError) {
      return NextResponse.json(
        {
          error: error.getUserMessage(),
          details: {
            type: error.type,
            details: error.details,
          },
        },
        { status: error.type === 'INSTANCE_NOT_FOUND' ? 404 : 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to retrieve workflow instance' },
      { status: 500 }
    )
  }
}
