/**
 * Sprint 1d.4 Enhancement: Workflow Instance Details API
 * GET /api/workflows/instances/[instanceId]
 * Fetches full details of a workflow instance including tasks and template
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { InstanceDetailsResponse } from '@/lib/types/workflow-instance';

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

    const { instanceId } = await params;

    // Fetch workflow instance
    const { data: instance, error: instanceError } = await supabase
      .from('workflow_instances')
      .select('*')
      .eq('id', instanceId)
      .single();

    if (instanceError || !instance) {
      return NextResponse.json(
        { error: 'Workflow instance not found' },
        { status: 404 }
      );
    }

    // Fetch instance tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('instance_tasks')
      .select('*')
      .eq('workflow_instance_id', instanceId)
      .order('created_at', { ascending: true });

    if (tasksError) {
      console.error('Error fetching instance tasks:', tasksError);
      return NextResponse.json(
        { error: 'Failed to fetch instance tasks' },
        { status: 500 }
      );
    }

    // Fetch workflow template
    const { data: template, error: templateError } = await supabase
      .from('workflow_templates')
      .select('id, template_code, name, workflow_type, definition')
      .eq('id', instance.workflow_template_id)
      .single();

    if (templateError || !template) {
      console.error('Error fetching workflow template:', templateError);
      return NextResponse.json(
        { error: 'Workflow template not found' },
        { status: 404 }
      );
    }

    const response: InstanceDetailsResponse = {
      instance,
      tasks: tasks || [],
      template,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in workflows/instances/[instanceId] GET:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
