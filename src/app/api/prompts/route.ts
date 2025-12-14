// Sprint 1d.7: FLM Building Workflow - Prompts API
// Phase A: AI Interface Foundation

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// GET /api/prompts - List all prompt templates
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get search params
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const active = searchParams.get('active');

    // Get app_uuid for filtering
    let app_uuid: string | undefined;
    try {
      const { getAppContext } = await import('@/lib/server/getAppUuid');
      const appContext = await getAppContext();
      app_uuid = appContext.app_uuid;
    } catch (error) {
      console.warn('Could not get app_uuid for prompts query:', error);
      // Continue without app_uuid filtering (for backwards compatibility)
    }

    // Build query
    let query = supabase
      .from('prompt_templates')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by app_uuid if available
    if (app_uuid) {
      query = query.eq('app_uuid', app_uuid);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (active !== null) {
      query = query.eq('is_active', active === 'true');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching prompts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prompts: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/prompts - Create new prompt template
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current app_uuid
    const { getAppContext } = await import('@/lib/server/getAppUuid');
    let app_uuid: string;
    try {
      const appContext = await getAppContext();
      app_uuid = appContext.app_uuid;
    } catch (error) {
      console.error('Failed to get app_uuid:', error);
      return NextResponse.json(
        { error: 'Failed to determine application context' },
        { status: 500 }
      );
    }

    const body = await request.json();

    // Create prompt template
    const { data: prompt, error } = await supabase
      .from('prompt_templates')
      .insert({
        app_uuid: app_uuid,
        prompt_code: body.prompt_code,
        prompt_name: body.prompt_name,
        description: body.description,
        category: body.category,
        system_prompt: body.system_prompt,
        user_prompt_template: body.user_prompt_template,
        default_llm_interface_id: body.default_llm_interface_id || null,
        default_model: body.default_model || 'claude-sonnet-4-5-20250929',
        temperature: body.temperature || 0.7,
        max_tokens: body.max_tokens || 4096,
        input_schema: body.input_schema || {},
        output_schema: body.output_schema || {},
        output_format: body.output_format || 'json',
        is_active: body.is_active || false,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating prompt:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prompt }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
