// API Route: GET/POST/DELETE /api/nodes/shares?node_id=xxx
// Purpose: Manage node shares (selective sharing)

import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getAppUuid } from '@/lib/server/getAppUuid';

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('node_id');
    if (!nodeId) {
      return NextResponse.json({ error: 'node_id is required' }, { status: 400 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: shares, error } = await supabase
      .from('node_shares')
      .select('id, node_id, permission, shared_with_stakeholder_id')
      .eq('node_id', nodeId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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

    const enrichedShares = (shares || []).map((share: any) => ({
      ...share,
      stakeholder: stakeholderMap.get(share.shared_with_stakeholder_id) || null
    }));

    return NextResponse.json({ shares: enrichedShares });
  } catch (error: any) {
    console.error('Error in GET /api/nodes/shares:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('node_id');
    const body = await request.json();
    if (!nodeId) {
      return NextResponse.json({ error: 'node_id is required' }, { status: 400 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!body.stakeholder_id) {
      return NextResponse.json({ error: 'stakeholder_id is required' }, { status: 400 });
    }

    const { data: stakeholderContext, error: stakeholderError } = await supabase.rpc('current_stakeholder_context');
    if (stakeholderError || !stakeholderContext || stakeholderContext.length === 0) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }
    const currentStakeholderId = stakeholderContext[0]?.stakeholder_id || stakeholderContext[0]?.id;
    if (!currentStakeholderId) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }

    const permission = body.permission || 'view';
    if (!['view', 'edit', 'admin'].includes(permission)) {
      return NextResponse.json({ error: 'Invalid permission' }, { status: 400 });
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

    let appUuid: string | null = null;
    try {
      appUuid = await getAppUuid();
    } catch (appError: any) {
      return NextResponse.json(
        { error: appError.message || 'Failed to resolve application context' },
        { status: 500 }
      );
    }

    const { data: share, error } = await adminClient
      .from('node_shares')
      .insert({
        node_id: nodeId,
        shared_with_stakeholder_id: body.stakeholder_id,
        permission,
        shared_by: currentStakeholderId,
        app_uuid: appUuid
      })
      .select('id, node_id, permission, shared_with_stakeholder_id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let stakeholder = null;
    const { data: stakeholderRow } = await adminClient
      .from('stakeholders')
      .select('id, name, email')
      .eq('id', share.shared_with_stakeholder_id)
      .single();
    if (stakeholderRow) {
      stakeholder = stakeholderRow;
    }

    return NextResponse.json({ share: { ...share, stakeholder } });
  } catch (error: any) {
    console.error('Error in POST /api/nodes/shares:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('node_id');
    const body = await request.json();
    if (!nodeId) {
      return NextResponse.json({ error: 'node_id is required' }, { status: 400 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shareId = body.share_id;
    if (!shareId) {
      return NextResponse.json({ error: 'share_id is required' }, { status: 400 });
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

    const { error } = await adminClient
      .from('node_shares')
      .delete()
      .eq('id', shareId)
      .eq('node_id', nodeId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/nodes/shares:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
