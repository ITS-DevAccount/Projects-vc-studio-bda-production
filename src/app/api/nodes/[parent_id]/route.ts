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
    if (parent_id === 'root' || parent_id === 'null') {
      query = query.is('parent_id', null);
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

    // Get parent node details if not root
    let parentNode = null;
    if (parent_id !== 'root' && parent_id !== 'null') {
      const { data: parent } = await supabase
        .from('nodes')
        .select('*')
        .eq('id', parent_id)
        .single();
      parentNode = parent;
    }

    return NextResponse.json({
      nodes: nodes || [],
      count: nodes?.length || 0,
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
