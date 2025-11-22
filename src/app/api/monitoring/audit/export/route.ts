/**
 * Sprint 1d.6: Monitoring - Audit Export API
 * POST /api/monitoring/audit/export
 * Generates and returns audit trail export in CSV or JSON format
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

function convertToCSV(events: any[]): string {
  if (events.length === 0) return '';

  // Define headers
  const headers = [
    'Event ID',
    'Instance ID',
    'Event Type',
    'Event Timestamp',
    'Node ID',
    'Node Name',
    'Task ID',
    'Task Name',
    'Stakeholder ID',
    'Stakeholder Name',
    'Error Message',
    'Event Data',
  ];

  // Create CSV rows
  const rows = events.map((event) => [
    event.id,
    event.workflow_instance_id,
    event.event_type,
    event.event_timestamp,
    event.node_id || '',
    event.node_name || '',
    event.task_id || '',
    event.task_name || '',
    event.stakeholder_id || '',
    event.stakeholder_name || '',
    event.error_message || '',
    JSON.stringify(event.event_data || {}),
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  return csvContent;
}

export async function POST(request: NextRequest) {
  try {
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

    // Get request body
    const body = await request.json();
    const {
      instance_id,
      format = 'CSV',
      event_type,
      start_date,
      end_date,
      include_event_data = true,
    } = body;

    if (!instance_id) {
      return NextResponse.json(
        { error: 'instance_id is required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('workflow_history')
      .select('*')
      .eq('workflow_instance_id', instance_id);

    // Apply filters
    if (event_type) {
      query = query.eq('event_type', event_type);
    }

    if (start_date) {
      query = query.gte('event_timestamp', start_date);
    }

    if (end_date) {
      query = query.lte('event_timestamp', end_date);
    }

    // Order by timestamp
    query = query.order('event_timestamp', { ascending: true });

    const { data: events, error: eventsError } = await query;

    if (eventsError) {
      console.error('Error fetching events for export:', eventsError);
      return NextResponse.json(
        { error: 'Failed to fetch events', details: eventsError.message },
        { status: 500 }
      );
    }

    if (!events || events.length === 0) {
      return NextResponse.json(
        { error: 'No events found for the specified criteria' },
        { status: 404 }
      );
    }

    // Get workflow template to enrich with node names
    const { data: instance } = await supabase
      .from('workflow_instances')
      .select(`
        instance_name,
        workflow_code,
        workflow_templates:workflow_definition_id (
          name,
          definition
        )
      `)
      .eq('id', instance_id)
      .single();

    const template = Array.isArray(instance?.workflow_templates)
      ? instance?.workflow_templates[0]
      : instance?.workflow_templates;

    // Enrich events
    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
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

        // Get node name
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

        const enriched: any = {
          ...event,
          stakeholder_name: stakeholderName,
          node_name: nodeName,
          task_name: taskName,
        };

        // Remove sensitive data if requested
        if (!include_event_data) {
          delete enriched.event_data;
          delete enriched.previous_state;
          delete enriched.new_state;
        }

        return enriched;
      })
    );

    // Generate export based on format
    if (format.toUpperCase() === 'CSV') {
      const csvContent = convertToCSV(enrichedEvents);

      const filename = `audit-trail-${instance?.instance_name || instance?.workflow_code || instance_id}-${new Date().toISOString().split('T')[0]}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } else if (format.toUpperCase() === 'JSON') {
      const filename = `audit-trail-${instance?.instance_name || instance?.workflow_code || instance_id}-${new Date().toISOString().split('T')[0]}.json`;

      return new NextResponse(
        JSON.stringify(
          {
            metadata: {
              instance_id,
              instance_name: instance?.instance_name,
              workflow_code: instance?.workflow_code,
              workflow_name: template?.name,
              exported_at: new Date().toISOString(),
              exported_by: user.email,
              event_count: enrichedEvents.length,
              filters: {
                event_type,
                start_date,
                end_date,
              },
            },
            events: enrichedEvents,
          },
          null,
          2
        ),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        }
      );
    } else {
      return NextResponse.json(
        { error: 'Unsupported format. Use CSV or JSON.' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error in monitoring/audit/export POST:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
