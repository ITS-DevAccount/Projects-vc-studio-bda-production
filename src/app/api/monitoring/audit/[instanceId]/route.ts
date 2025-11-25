/**
 * Sprint 1d.6: Monitoring - Audit History API
 * GET /api/monitoring/audit/:instanceId
 * Returns audit trail events for a workflow instance
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { AuditHistoryResponse, AuditEventDetail } from '@/lib/types/monitoring';

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;
    const accessToken = getAccessToken(request);
    const supabase = await createServerClient(accessToken);

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const eventType = searchParams.get('event_type');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const userId = searchParams.get('user_id');
    const nodeId = searchParams.get('node_id');
    const taskId = searchParams.get('task_id');

    // Build query
    let query = supabase
      .from('workflow_history')
      .select('*')
      .eq('workflow_instance_id', instanceId);

    // Apply filters
    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    if (startDate) {
      query = query.gte('event_timestamp', startDate);
    }

    if (endDate) {
      query = query.lte('event_timestamp', endDate);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (nodeId) {
      query = query.eq('node_id', nodeId);
    }

    if (taskId) {
      query = query.eq('task_id', taskId);
    }

    // Order by timestamp descending (most recent first)
    query = query.order('event_timestamp', { ascending: false });

    const { data: events, error: eventsError } = await query;

    if (eventsError) {
      console.error('Error fetching audit events:', eventsError);
      return NextResponse.json(
        { error: 'Failed to fetch audit events', details: eventsError.message },
        { status: 500 }
      );
    }

    // Get workflow template to enrich with node names
    const { data: instance } = await supabase
      .from('workflow_instances')
      .select(`
        workflow_templates:workflow_definition_id (
          definition
        )
      `)
      .eq('id', instanceId)
      .single();

    const template = Array.isArray(instance?.workflow_templates)
      ? instance?.workflow_templates[0]
      : instance?.workflow_templates;

    // Enrich events with user/stakeholder names and node names
    const enrichedEvents: AuditEventDetail[] = await Promise.all(
      (events || []).map(async (event) => {
        let userName: string | undefined;
        let stakeholderName: string | undefined;
        let nodeName: string | undefined;
        let taskName: string | undefined;

        // Get stakeholder name
        if (event.stakeholder_id) {
          const { data: stakeholder } = await supabase
            .from('stakeholders')
            .select('name')
            .eq('id', event.stakeholder_id)
            .single();
          stakeholderName = stakeholder?.name;
        }

        // Get node name from template definition
        if (event.node_id && template?.definition?.nodes) {
          const node = template.definition.nodes.find((n: any) => n.id === event.node_id);
          nodeName = node?.label || event.node_id;
        }

        // Get task name
        if (event.task_id) {
          const { data: task } = await supabase
            .from('instance_tasks')
            .select('node_id, function_code')
            .eq('id', event.task_id)
            .single();

          if (task) {
            const taskNode = template?.definition?.nodes?.find(
              (n: any) => n.id === task.node_id
            );
            taskName = taskNode?.label || task.function_code;
          }
        }

        return {
          ...event,
          user_name: userName,
          stakeholder_name: stakeholderName,
          node_name: nodeName,
          task_name: taskName,
        } as AuditEventDetail;
      })
    );

    const response: AuditHistoryResponse = {
      events: enrichedEvents,
      count: enrichedEvents.length,
      filters: {
        event_type: eventType || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        user_id: userId || undefined,
        node_id: nodeId || undefined,
        task_id: taskId || undefined,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in monitoring/audit/:instanceId GET:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
