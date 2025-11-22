/**
 * Sprint 1d.6: Monitoring - Compliance Report Generation API
 * POST /api/monitoring/compliance/generate
 * Generates compliance reports (full audit trail, data lineage, user actions, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { ComplianceReportResponse, ComplianceReportRequest } from '@/lib/types/monitoring';

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
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
    const body: ComplianceReportRequest = await request.json();
    const {
      report_type,
      workflow_instance_id,
      start_date,
      end_date,
      include_pii = false,
    } = body;

    if (!report_type) {
      return NextResponse.json({ error: 'report_type is required' }, { status: 400 });
    }

    // Get current app_uuid
    const { data: appData } = await supabase
      .from('applications')
      .select('id, app_code')
      .limit(1)
      .single();

    const appUuid = appData?.id;

    let reportData: any[] = [];
    let recordCount = 0;

    // Generate report based on type
    switch (report_type) {
      case 'FULL_AUDIT_TRAIL': {
        // Get all audit events
        let query = supabase
          .from('workflow_history')
          .select('*')
          .order('event_timestamp', { ascending: true });

        if (workflow_instance_id) {
          query = query.eq('workflow_instance_id', workflow_instance_id);
        }

        if (start_date) {
          query = query.gte('event_timestamp', start_date);
        }

        if (end_date) {
          query = query.lte('event_timestamp', end_date);
        }

        const { data: events, error } = await query;

        if (error) throw error;

        reportData = events || [];
        recordCount = reportData.length;
        break;
      }

      case 'DATA_LINEAGE': {
        // Track which data touched which tasks
        let query = supabase
          .from('instance_tasks')
          .select(`
            id,
            node_id,
            function_code,
            input_data,
            output_data,
            created_at,
            completed_at,
            workflow_instance:workflow_instance_id (
              id,
              workflow_code,
              instance_context
            )
          `)
          .order('created_at', { ascending: true });

        if (workflow_instance_id) {
          query = query.eq('workflow_instance_id', workflow_instance_id);
        }

        if (start_date) {
          query = query.gte('created_at', start_date);
        }

        if (end_date) {
          query = query.lte('created_at', end_date);
        }

        const { data: tasks, error } = await query;

        if (error) throw error;

        reportData = (tasks || []).map((task) => ({
          task_id: task.id,
          node_id: task.node_id,
          function_code: task.function_code,
          workflow_instance_id: Array.isArray(task.workflow_instance)
            ? task.workflow_instance[0]?.id
            : task.workflow_instance?.id,
          workflow_code: Array.isArray(task.workflow_instance)
            ? task.workflow_instance[0]?.workflow_code
            : task.workflow_instance?.workflow_code,
          data_inputs: include_pii ? task.input_data : Object.keys(task.input_data || {}),
          data_outputs: include_pii ? task.output_data : Object.keys(task.output_data || {}),
          created_at: task.created_at,
          completed_at: task.completed_at,
        }));

        recordCount = reportData.length;
        break;
      }

      case 'USER_ACTIONS': {
        // Get all events with stakeholder actions
        let query = supabase
          .from('workflow_history')
          .select(`
            id,
            workflow_instance_id,
            event_type,
            event_timestamp,
            stakeholder_id,
            stakeholders:stakeholder_id (
              id,
              name,
              email
            ),
            event_data,
            node_id
          `)
          .not('stakeholder_id', 'is', null)
          .order('event_timestamp', { ascending: true });

        if (workflow_instance_id) {
          query = query.eq('workflow_instance_id', workflow_instance_id);
        }

        if (start_date) {
          query = query.gte('event_timestamp', start_date);
        }

        if (end_date) {
          query = query.lte('event_timestamp', end_date);
        }

        const { data: events, error } = await query;

        if (error) throw error;

        reportData = (events || []).map((event) => {
          const stakeholder = Array.isArray(event.stakeholders)
            ? event.stakeholders[0]
            : event.stakeholders;

          return {
            event_id: event.id,
            workflow_instance_id: event.workflow_instance_id,
            event_type: event.event_type,
            event_timestamp: event.event_timestamp,
            stakeholder_id: event.stakeholder_id,
            stakeholder_name: stakeholder?.name,
            stakeholder_email: include_pii ? stakeholder?.email : '***REDACTED***',
            node_id: event.node_id,
            action_data: include_pii ? event.event_data : { redacted: true },
          };
        });

        recordCount = reportData.length;
        break;
      }

      case 'MULTI_TENANT_ISOLATION': {
        // Verify all records have correct app_uuid
        const tables = [
          'workflow_instances',
          'workflow_templates',
          'instance_tasks',
          'workflow_history',
        ];

        const isolationResults: any[] = [];

        for (const table of tables) {
          const { data, error, count } = await supabase
            .from(table)
            .select('id, app_uuid', { count: 'exact' })
            .limit(1000);

          if (error) {
            isolationResults.push({
              table,
              status: 'ERROR',
              error: error.message,
            });
            continue;
          }

          const recordsWithAppUuid = data?.filter((r) => r.app_uuid === appUuid).length || 0;
          const totalRecords = count || 0;

          isolationResults.push({
            table,
            total_records: totalRecords,
            records_with_correct_app_uuid: recordsWithAppUuid,
            isolation_percentage:
              totalRecords > 0 ? Math.round((recordsWithAppUuid / totalRecords) * 100) : 100,
            status: recordsWithAppUuid === totalRecords ? 'COMPLIANT' : 'NON_COMPLIANT',
          });
        }

        reportData = isolationResults;
        recordCount = isolationResults.length;
        break;
      }

      case 'SERVICE_INTEGRATION_AUDIT': {
        // Get all service call events
        let query = supabase
          .from('workflow_history')
          .select('*')
          .in('event_type', ['SERVICE_CALLED', 'SERVICE_RESPONSE'])
          .order('event_timestamp', { ascending: true });

        if (workflow_instance_id) {
          query = query.eq('workflow_instance_id', workflow_instance_id);
        }

        if (start_date) {
          query = query.gte('event_timestamp', start_date);
        }

        if (end_date) {
          query = query.lte('event_timestamp', end_date);
        }

        const { data: events, error } = await query;

        if (error) throw error;

        reportData = (events || []).map((event) => ({
          event_id: event.id,
          workflow_instance_id: event.workflow_instance_id,
          event_type: event.event_type,
          event_timestamp: event.event_timestamp,
          service_details: include_pii ? event.event_data : { redacted: true },
          task_id: event.task_id,
          error_message: event.error_message,
        }));

        recordCount = reportData.length;
        break;
      }

      default:
        return NextResponse.json({ error: 'Unsupported report type' }, { status: 400 });
    }

    // Build response
    const response: ComplianceReportResponse = {
      metadata: {
        report_id: crypto.randomUUID(),
        report_type,
        generated_at: new Date().toISOString(),
        generated_by: user.email || user.id,
        date_range: {
          start: start_date || 'N/A',
          end: end_date || 'N/A',
        },
        record_count: recordCount,
        app_uuid: appUuid || '',
      },
      data: reportData,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in monitoring/compliance/generate POST:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
