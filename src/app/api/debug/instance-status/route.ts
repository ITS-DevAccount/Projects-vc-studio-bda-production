/**
 * DEBUG: Instance and Task Status Diagnostic
 * GET /api/debug/instance-status
 * Shows detailed instance and task information
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

export async function GET(request: NextRequest) {
  try {
    const accessToken = getAccessToken(request);
    const supabase = await createServerClient(accessToken);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all workflow instances with template info
    const { data: instances, error: instancesError } = await supabase
      .from('workflow_instances')
      .select(`
        id,
        workflow_code,
        instance_name,
        current_node_id,
        status,
        created_at,
        workflow_templates:workflow_definition_id (
          id,
          name,
          template_code,
          definition
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    // For each instance, get detailed task info
    const instanceDetails = await Promise.all(
      (instances || []).map(async (instance) => {
        const template = Array.isArray(instance.workflow_templates)
          ? instance.workflow_templates[0]
          : instance.workflow_templates;

        // Get all tasks for this instance
        const { data: tasks } = await supabase
          .from('instance_tasks')
          .select('*')
          .eq('workflow_instance_id', instance.id);

        // Count TASK nodes in definition
        const taskNodes = template?.definition?.nodes?.filter((n: any) => n.type === 'TASK') || [];

        return {
          instance_id: instance.id.slice(0, 8) + '...',
          instance_name: instance.instance_name,
          template_name: template?.name || 'Unknown',
          workflow_code: instance.workflow_code,
          status: instance.status,
          current_node_id: instance.current_node_id,
          created_at: instance.created_at,
          total_task_nodes_in_definition: taskNodes.length,
          task_nodes: taskNodes.map((n: any) => ({
            node_id: n.id,
            label: n.label,
            function_code: n.function_code,
          })),
          created_tasks_count: tasks?.length || 0,
          tasks_detail: (tasks || []).map(t => ({
            id: t.id.slice(0, 8) + '...',
            node_id: t.node_id,
            function_code: t.function_code,
            status: t.status,
            assigned_to: t.assigned_to,
            created_at: t.created_at,
          })),
        };
      })
    );

    // Get current user's stakeholder info
    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select('id, name, auth_user_id')
      .eq('auth_user_id', user.id)
      .single();

    // Get pending tasks for current user
    let myPendingTasks = [];
    if (stakeholder) {
      const { data } = await supabase
        .from('instance_tasks')
        .select('*')
        .eq('assigned_to', stakeholder.id)
        .eq('status', 'PENDING');
      myPendingTasks = data || [];
    }

    return NextResponse.json({
      current_user: {
        id: user.id,
        email: user.email,
      },
      stakeholder: stakeholder || null,
      my_pending_tasks_count: myPendingTasks.length,
      my_pending_tasks: myPendingTasks.map(t => ({
        id: t.id.slice(0, 8) + '...',
        node_id: t.node_id,
        function_code: t.function_code,
        instance_id: t.workflow_instance_id.slice(0, 8) + '...',
      })),
      instances_overview: instanceDetails,
      diagnosis: {
        total_instances: instances?.length || 0,
        instances_with_names: instanceDetails.filter(i => i.instance_name).length,
        instances_without_names: instanceDetails.filter(i => !i.instance_name).length,
        total_created_tasks: instanceDetails.reduce((sum, i) => sum + i.created_tasks_count, 0),
        expected_total_tasks: instanceDetails.reduce((sum, i) => sum + i.total_task_nodes_in_definition, 0),
      },
    });
  } catch (error: any) {
    console.error('Error in debug/instance-status GET:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
