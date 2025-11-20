/**
 * Sprint 1d.4 Fix: List Workflow Instances API
 * GET /api/workflows/instances
 * Returns list of all workflow instances with task counts and template info
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

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch workflow instances with template details
    const { data: instances, error: instancesError } = await supabase
      .from('workflow_instances')
      .select(`
        *,
        workflow_templates:workflow_definition_id (
          id,
          template_code,
          name,
          workflow_type,
          definition
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100); // Limit to recent 100 instances

    if (instancesError) {
      console.error('Error fetching instances:', instancesError);
      return NextResponse.json(
        { error: 'Failed to fetch instances' },
        { status: 500 }
      );
    }

    // For each instance, get task counts
    const enrichedInstances = await Promise.all(
      (instances || []).map(async (instance) => {
        // Get task counts
        const { data: tasks, error: tasksError } = await supabase
          .from('instance_tasks')
          .select('id, status, node_id')
          .eq('workflow_instance_id', instance.id);

        const totalTasks = tasks?.length || 0;
        const completedTasks = tasks?.filter(t => t.status === 'COMPLETED').length || 0;
        const pendingTasks = tasks?.filter(t => t.status === 'PENDING').length || 0;

        // Get template info (handle array or object response)
        const template = Array.isArray(instance.workflow_templates)
          ? instance.workflow_templates[0]
          : instance.workflow_templates;

        // Find current node name from definition
        let currentNodeName = instance.current_node_id;
        if (template?.definition?.nodes && instance.current_node_id) {
          const currentNode = template.definition.nodes.find(
            (n: any) => n.id === instance.current_node_id
          );
          if (currentNode) {
            currentNodeName = currentNode.label || currentNode.id;
          }
        }

        return {
          id: instance.id,
          workflow_code: instance.workflow_code,
          workflow_name: template?.name || instance.workflow_code,
          status: instance.status,
          current_node_id: instance.current_node_id,
          current_node_name: currentNodeName,
          created_at: instance.created_at,
          updated_at: instance.updated_at,
          completed_at: instance.completed_at,
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          pending_tasks: pendingTasks,
          progress_percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        };
      })
    );

    return NextResponse.json({
      instances: enrichedInstances,
      count: enrichedInstances.length,
    });
  } catch (error: any) {
    console.error('Error in workflows/instances GET:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
