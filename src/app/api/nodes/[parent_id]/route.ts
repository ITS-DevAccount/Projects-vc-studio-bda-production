// API Route: GET /api/nodes/[parent_id]
// Purpose: Returns children of folder (for FileExplorer)
// Phase 1c: Component Registry & File System

import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ parent_id: string }> }

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const supabase = await createServerClient();
    const { parent_id } = await params;
    const { searchParams } = new URL(_request.url);
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

    // Query nodes - RLS will filter by access automatically
    let query = supabase
      .from('nodes')
      .select(includeOwner ? '*, owner:stakeholders(id, name, email)' : '*')
      .order('type', { ascending: true }) // folders first, then files
      .order('name', { ascending: true });

    const stakeholderId = stakeholder?.id || null;

    // Filter by parent_id
    if (parent_id === 'root' || parent_id === 'null') {
      query = query.is('parent_id', null);
    } else if (parent_id === 'public') {
      query = query.is('is_shared', true);
      if (stakeholderId) {
        query = query.neq('owner_id', stakeholderId);
      }
    } else if (parent_id === 'shared') {
      if (!stakeholderId) {
        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      } else {
        const { data: shares } = await supabase
          .from('node_shares')
          .select('node_id')
          .eq('shared_with_stakeholder_id', stakeholderId);
        const sharedIds = (shares || []).map((share: any) => share.node_id);
        query = sharedIds.length > 0 ? query.in('id', sharedIds) : query.eq('id', '00000000-0000-0000-0000-000000000000');
        query = query.neq('owner_id', stakeholderId);
      }
    } else {
      query = query.eq('parent_id', parent_id);
    }

    const { data: nodes, error: nodesError } = await query;

    if (nodesError) {
      console.error('Error fetching nodes:', nodesError);
      return NextResponse.json(
        { error: 'Failed to fetch nodes', details: nodesError.message },
        { status: 500 }
      );
    }

    // Get parent node details if not root/special
    let parentNode = null;
    if (parent_id !== 'root' && parent_id !== 'null' && parent_id !== 'public' && parent_id !== 'shared') {
      const { data: parent } = await supabase
        .from('nodes')
        .select('*')
        .eq('id', parent_id)
        .single();
      parentNode = parent;
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
      parent_id: parent_id === 'root' || parent_id === 'null' ? null : parent_id,
      parent_node: parentNode,
      breadcrumb: parentNode ? [parentNode] : []
    });

  } catch (error: any) {
    console.error('Error in GET /api/nodes/[parent_id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/nodes/[parent_id]
// Purpose: Delete a node by id (files/folders/components)
export async function DELETE(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const supabase = await createServerClient();
    const { parent_id } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: node, error: nodeError } = await supabase
      .from('nodes')
      .select('id, type, file_storage_path')
      .eq('id', parent_id)
      .single();

    if (nodeError || !node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    if (node.type === 'file' && node.file_storage_path) {
      await supabase.storage
        .from('workspace-files')
        .remove([node.file_storage_path]);
    }

    const { error: deleteError } = await supabase
      .from('nodes')
      .delete()
      .eq('id', parent_id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete node', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/nodes/[parent_id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/nodes/[parent_id]
// Purpose: Update node sharing flags (public)
export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const supabase = await createServerClient();
    const { parent_id } = await params;
    const body = await request.json();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (body.is_shared === undefined) {
      return NextResponse.json({ error: 'is_shared is required' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('nodes')
      .update({ is_shared: !!body.is_shared })
      .eq('id', parent_id)
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
    console.error('Error in PATCH /api/nodes/[parent_id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
