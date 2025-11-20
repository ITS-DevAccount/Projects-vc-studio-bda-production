/**
 * Sprint 1d.4 - Layer 2: Workflow Templates API
 * Routes: GET (list), POST (create)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { WorkflowTemplate, CreateWorkflowTemplateInput } from '@/lib/types/workflow';

function getAccessToken(req: NextRequest): string | undefined {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

/**
 * GET /api/workflows/templates
 * List all workflow templates
 */
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

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');
    const workflowType = searchParams.get('workflow_type');
    const isActive = searchParams.get('is_active');
    const search = searchParams.get('search');

    let query = supabase
      .from('workflow_templates')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (workflowType) query = query.eq('workflow_type', workflowType);
    if (isActive !== null) query = query.eq('is_active', isActive === 'true');
    if (search) query = query.or(`template_code.ilike.%${search}%,name.ilike.%${search}%`);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching workflow templates:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      count: count || 0,
      page,
      page_size: pageSize,
    });
  } catch (error) {
    console.error('Error in workflows/templates GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/workflows/templates
 * Create new workflow template
 */
export async function POST(request: NextRequest) {
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

    const input: CreateWorkflowTemplateInput = await request.json();

    if (!input.template_code || !input.workflow_type || !input.name) {
      return NextResponse.json(
        { error: 'template_code, workflow_type, and name are required' },
        { status: 400 }
      );
    }

    // Get app_uuid from user's stakeholder record
    const { data: stakeholder } = await supabase
      .from('stakeholders')
      .select('app_uuid')
      .eq('auth_user_id', user.id)
      .single();

    if (!stakeholder) {
      return NextResponse.json({ error: 'User stakeholder not found' }, { status: 404 });
    }

    const insertData = {
      template_code: input.template_code,
      workflow_type: input.workflow_type,
      name: input.name,
      description: input.description || null,
      maturity_gate: input.maturity_gate || null,
      definition: input.definition,
      is_active: input.is_active !== undefined ? input.is_active : true,
      app_uuid: stakeholder.app_uuid,
    };

    const { data, error } = await supabase
      .from('workflow_templates')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error creating workflow template:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Template code already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Error in workflows/templates POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
