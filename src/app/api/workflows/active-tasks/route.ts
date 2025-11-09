import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = getAccessToken(request);
    const supabase = await createServerClient(accessToken)

    // Get stakeholder_id from query params
    const searchParams = request.nextUrl.searchParams
    const stakeholderId = searchParams.get('stakeholder_id')

    if (!stakeholderId) {
      return NextResponse.json(
        { error: 'stakeholder_id is required' },
        { status: 400 }
      )
    }

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch stakeholder to verify ownership
    const { data: stakeholder, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select('id, auth_user_id')
      .eq('id', stakeholderId)
      .single()

    if (stakeholderError || !stakeholder) {
      return NextResponse.json(
        { error: 'Stakeholder not found' },
        { status: 404 }
      )
    }

    // Verify user owns this stakeholder record
    if (stakeholder.auth_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Fetch active workflow instances for this stakeholder
    const { data: workflowInstances, error: workflowError } = await supabase
      .from('workflow_instances')
      .select('id, instance_code, workflow_type, status')
      .eq('stakeholder_id', stakeholderId)
      .eq('status', 'active')

    if (workflowError) {
      console.error('Error fetching workflows:', workflowError)
      return NextResponse.json(
        { error: 'Failed to fetch workflows' },
        { status: 500 }
      )
    }

    if (!workflowInstances || workflowInstances.length === 0) {
      return NextResponse.json([])
    }

    // Get workflow instance IDs
    const workflowIds = workflowInstances.map(w => w.id)

    // Fetch pending activities for these workflows
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .in('workflow_instance_id', workflowIds)
      .eq('status', 'pending')
      .order('due_date', { ascending: true })

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError)
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      )
    }

    // Format tasks with workflow instance code
    const tasks = activities?.map((activity: any) => {
      const workflow = workflowInstances.find(w => w.id === activity.workflow_instance_id)
      return {
        id: activity.id,
        activity_name: activity.activity_name,
        due_date: activity.due_date,
        workflow_instance_code: workflow?.instance_code || '',
        activity_code: activity.activity_code,
        owner: activity.owner,
        status: activity.status
      }
    }) || []

    return NextResponse.json(tasks)

  } catch (error) {
    console.error('Error in active-tasks endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
