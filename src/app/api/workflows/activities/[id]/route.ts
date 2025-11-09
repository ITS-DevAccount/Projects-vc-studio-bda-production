import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accessToken = getAccessToken(request);
    const supabase = await createServerClient(accessToken)
    const activityId = params.id

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'status is required' },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'complete']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: pending, in_progress, complete' },
        { status: 400 }
      )
    }

    // Fetch the activity and its workflow to verify ownership
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select(`
        id,
        workflow_instance_id,
        workflow_instances:workflow_instance_id (
          id,
          stakeholder_id,
          stakeholders:stakeholder_id (
            id,
            auth_user_id
          )
        )
      `)
      .eq('id', activityId)
      .single()

    if (activityError || !activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      )
    }

    // Verify user owns the stakeholder associated with this workflow
    const stakeholder = (activity.workflow_instances as any)?.stakeholders
    if (!stakeholder || stakeholder.auth_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Update the activity
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    // If marking as complete, set completed_at
    if (status === 'complete') {
      updateData.completed_at = new Date().toISOString()
    }

    const { data: updatedActivity, error: updateError } = await supabase
      .from('activities')
      .update(updateData)
      .eq('id', activityId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating activity:', updateError)
      return NextResponse.json(
        { error: 'Failed to update activity' },
        { status: 500 }
      )
    }

    // If all activities in workflow are complete, update workflow status
    if (status === 'complete') {
      const { data: allActivities, error: allActivitiesError } = await supabase
        .from('activities')
        .select('status')
        .eq('workflow_instance_id', activity.workflow_instance_id)

      if (!allActivitiesError && allActivities) {
        const allComplete = allActivities.every(a => a.status === 'complete')

        if (allComplete) {
          await supabase
            .from('workflow_instances')
            .update({
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', activity.workflow_instance_id)
        }
      }
    }

    return NextResponse.json(updatedActivity)

  } catch (error) {
    console.error('Error in activity PATCH endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
