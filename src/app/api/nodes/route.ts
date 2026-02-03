// API Route: POST /api/nodes
// Purpose: Create new node (file/folder/component)
// Phase 1c: Component Registry & File System

import { createServerClient } from '@/lib/supabase/server';
import { getAppUuid } from '@/lib/server/getAppUuid';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    const body = await req.json();

    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: 'Server configuration error (missing service role key)' },
        { status: 500 }
      );
    }

    const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: stakeholderData, error: stakeholderError } = await adminClient
      .from('stakeholders')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (stakeholderError || !stakeholderData) {
      console.error('[POST /api/nodes] Stakeholder not found for user:', user.id, stakeholderError);
      return NextResponse.json(
        { error: 'Stakeholder not found' },
        { status: 404 }
      );
    }

    const stakeholder = stakeholderData;
    const appUuid = await getAppUuid();

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

    // Build node data - stakeholder-owned, can be used across apps
    const nodeData: any = {
      name: body.name,
      type: body.type,
      parent_id: body.parent_id || null,  // For folder hierarchy
      owner_id: stakeholder.id,            // Primary ownership by stakeholder
      app_uuid: appUuid,                   // App isolation
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
    const { data: node, error: insertError } = await adminClient
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
    const supabase = await createServerClient();
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parent_id');
    const includeShares = searchParams.get('include_shares') === '1';
    const includeCounts = searchParams.get('include_counts') === '1';
    const includeOwner = searchParams.get('include_owner') === '1';

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

    const stakeholderId = stakeholder?.id || null;

    // Query nodes - RLS will filter by access automatically
    let query = supabase
      .from('nodes')
      .select(includeOwner ? '*, owner:stakeholders(id, name, email)' : '*')
      .order('type', { ascending: true }) // folders first, then files
      .order('name', { ascending: true });

    // Filter by parent_id
    if (parentId && parentId !== 'null') {
      query = query.eq('parent_id', parentId);
    } else {
      query = query.is('parent_id', null);
      if (stakeholderId) {
        query = query.eq('owner_id', stakeholderId);
      }
    }

    const { data: nodes, error: nodesError } = await query;

    if (nodesError) {
      console.error('Error fetching nodes:', nodesError);
      return NextResponse.json(
        { error: 'Failed to fetch nodes', details: nodesError.message },
        { status: 500 }
      );
    }

    let nodesWithShares = nodes || [];
    if (includeShares && nodes && nodes.length > 0) {
      const nodeIds = nodes.map((node) => node.id);
      const { data: shares } = await supabase
        .from('node_shares')
        .select('id, node_id, permission, shared_with_stakeholder_id')
        .in('node_id', nodeIds);

      const stakeholderIds = Array.from(
        new Set((shares || []).map((share: any) => share.shared_with_stakeholder_id).filter(Boolean))
      );
      const { data: stakeholders } = stakeholderIds.length
        ? await supabase
            .from('stakeholders')
            .select('id, name, email')
            .in('id', stakeholderIds)
        : { data: [] };
      const stakeholderMap = new Map<string, any>();
      (stakeholders || []).forEach((stakeholder: any) => {
        stakeholderMap.set(stakeholder.id, stakeholder);
      });

      const sharesByNode = new Map<string, any[]>();
      (shares || []).forEach((share: any) => {
        const stakeholder = stakeholderMap.get(share.shared_with_stakeholder_id) || null;
        const enrichedShare = { ...share, stakeholder };
        if (!sharesByNode.has(share.node_id)) {
          sharesByNode.set(share.node_id, []);
        }
        sharesByNode.get(share.node_id)?.push(enrichedShare);
      });

      nodesWithShares = nodes.map((node) => ({
        ...node,
        shares: sharesByNode.get(node.id) || []
      }));
    }

    let nodesWithCounts = nodesWithShares;
    if (includeCounts && nodesWithShares.length > 0) {
      const folderIds = nodesWithShares
        .filter((node: any) => node.type === 'folder')
        .map((node: any) => node.id);
      if (folderIds.length > 0) {
        const { data: children } = await supabase
          .from('nodes')
          .select('parent_id, type')
          .in('parent_id', folderIds);
        const counts = new Map<string, { folders: number; files: number }>();
        (children || []).forEach((child: any) => {
          const entry = counts.get(child.parent_id) || { folders: 0, files: 0 };
          if (child.type === 'folder') entry.folders += 1;
          if (child.type === 'file') entry.files += 1;
          counts.set(child.parent_id, entry);
        });
        nodesWithCounts = nodesWithShares.map((node: any) => ({
          ...node,
          child_counts: node.type === 'folder' ? counts.get(node.id) || { folders: 0, files: 0 } : undefined
        }));
      }
    }

    return NextResponse.json({
      nodes: nodesWithCounts || [],
      count: nodesWithCounts?.length || 0,
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

// PATCH /api/nodes?node_id=xxx
// Purpose: Update node sharing flags (public)
export async function PATCH(req: Request) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(req.url);
    const nodeId = searchParams.get('node_id');
    const body = await req.json();

    if (!nodeId) {
      return NextResponse.json({ error: 'node_id is required' }, { status: 400 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (body.is_shared === undefined) {
      return NextResponse.json({ error: 'is_shared is required' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: 'Server configuration error (missing service role key)' },
        { status: 500 }
      );
    }

    const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: updated, error: updateError } = await adminClient
      .from('nodes')
      .update({ is_shared: !!body.is_shared })
      .eq('id', nodeId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update node', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ node: updated, success: true });
  } catch (error: any) {
    console.error('Error in PATCH /api/nodes:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
