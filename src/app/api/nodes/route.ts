// API Route: POST /api/nodes
// Purpose: Create new node (file/folder/component)
// Phase 1c: Component Registry & File System

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const body = await req.json();

    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get stakeholder
    const { data: stakeholder, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select('id, app_uuid')
      .eq('auth_user_id', user.id)
      .single();

    if (stakeholderError || !stakeholder) {
      return NextResponse.json(
        { error: 'Stakeholder not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['file', 'folder', 'component'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be: file, folder, or component' },
        { status: 400 }
      );
    }

    // Build node data
    const nodeData: any = {
      name: body.name,
      type: body.type,
      parent_id: body.parent_id || null,
      owner_id: stakeholder.id,
      app_uuid: stakeholder.app_uuid,
      created_by: user.id,
      description: body.description || null,
      tags: body.tags || [],
      is_shared: body.is_shared || false,
    };

    // Add type-specific fields
    if (body.type === 'file') {
      if (!body.file_storage_path) {
        return NextResponse.json(
          { error: 'file_storage_path required for type=file' },
          { status: 400 }
        );
      }
      nodeData.file_storage_path = body.file_storage_path;
      nodeData.size_bytes = body.size_bytes || 0;
      nodeData.mime_type = body.mime_type || 'application/octet-stream';
    }

    if (body.type === 'component') {
      if (!body.component_id) {
        return NextResponse.json(
          { error: 'component_id required for type=component' },
          { status: 400 }
        );
      }
      nodeData.component_id = body.component_id;
      nodeData.component_config = body.component_config || {};
      nodeData.component_state = body.component_state || {};
    }

    // Add workflow fields if provided
    if (body.associated_workflow_id) {
      nodeData.associated_workflow_id = body.associated_workflow_id;
    }
    if (body.activity_code) {
      nodeData.activity_code = body.activity_code;
    }

    // Insert node
    const { data: node, error: insertError } = await supabase
      .from('nodes')
      .insert([nodeData])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating node:', insertError);
      return NextResponse.json(
        { error: 'Failed to create node', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      node,
      success: true,
      message: `${body.type} created successfully`
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error in POST /api/nodes:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/nodes?parent_id=xxx
// Purpose: Get all nodes for a parent (for root, use parent_id=null or omit)
export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parent_id');

    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get stakeholder
    const { data: stakeholder, error: stakeholderError } = await supabase
      .from('stakeholders')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (stakeholderError || !stakeholder) {
      return NextResponse.json(
        { error: 'Stakeholder not found' },
        { status: 404 }
      );
    }

    // Query nodes - RLS will filter by owner automatically
    let query = supabase
      .from('nodes')
      .select('*')
      .order('type', { ascending: true }) // folders first, then files
      .order('name', { ascending: true });

    // Filter by parent_id
    if (parentId && parentId !== 'null') {
      query = query.eq('parent_id', parentId);
    } else {
      query = query.is('parent_id', null);
    }

    const { data: nodes, error: nodesError } = await query;

    if (nodesError) {
      console.error('Error fetching nodes:', nodesError);
      return NextResponse.json(
        { error: 'Failed to fetch nodes', details: nodesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      nodes: nodes || [],
      count: nodes?.length || 0,
      parent_id: parentId
    });

  } catch (error: any) {
    console.error('Error in GET /api/nodes:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
