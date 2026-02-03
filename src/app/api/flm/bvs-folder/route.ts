import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getAppUuid } from '@/lib/server/getAppUuid';

async function ensureFolder(adminClient: any, params: {
  ownerId: string;
  appUuid: string;
  parentId: string | null;
  name: string;
  createdBy: string | null;
  fileStoragePath?: string | null;
}) {
  const { ownerId, appUuid, parentId, name, createdBy, fileStoragePath } = params;

  let query = adminClient
    .from('nodes')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('type', 'folder')
    .eq('name', name)
    .limit(1);

  if (parentId === null) {
    query = query.is('parent_id', null);
  } else {
    query = query.eq('parent_id', parentId);
  }

  const { data: existing, error } = await query;

  if (error) {
    console.warn('ensureFolder lookup failed:', error.message || error);
  }

  if (existing && existing.length > 0) {
    return existing[0].id as string;
  }

  const { data: created, error: insertError } = await adminClient
    .from('nodes')
    .insert({
      name,
      type: 'folder',
      parent_id: parentId,
      owner_id: ownerId,
      app_uuid: appUuid,
      file_storage_path: fileStoragePath || null,
      created_by: createdBy
    })
    .select('id')
    .single();

  if (insertError) {
    if (insertError.code == '23505') {
      let retryQuery = adminClient
        .from('nodes')
        .select('id')
        .eq('owner_id', ownerId)
        .eq('type', 'folder')
        .eq('name', name)
        .limit(1);

      if (parentId === null) {
        retryQuery = retryQuery.is('parent_id', null);
      } else {
        retryQuery = retryQuery.eq('parent_id', parentId);
      }

      const { data: retry } = await retryQuery;
      if (retry && retry.length > 0) {
        return retry[0].id as string;
      }
    }
    throw new Error(insertError.message || 'Failed to create folder');
  }

  return created.id as string;
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const vcModelId = searchParams.get('vc_model_id');

    if (!vcModelId) {
      return NextResponse.json({ error: 'vc_model_id is required' }, { status: 400 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const { data: stakeholder, error: stakeholderError } = await adminClient
      .from('stakeholders')
      .select('id, reference')
      .eq('auth_user_id', user.id)
      .single();

    if (stakeholderError || !stakeholder) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }

    const { data: vcModel, error: vcModelError } = await adminClient
      .from('vc_models')
      .select('id, model_name, stakeholder_id, app_uuid')
      .eq('id', vcModelId)
      .single();

    if (vcModelError || !vcModel) {
      return NextResponse.json({ error: 'VC Model not found' }, { status: 404 });
    }

    if (vcModel.stakeholder_id !== stakeholder.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const appUuid = await getAppUuid();
    const createdBy = user.id || null;

    let rootId: string | null = null;
    const { data: rootFolder } = await adminClient
      .from('nodes')
      .select('id')
      .eq('owner_id', stakeholder.id)
      .eq('type', 'folder')
      .is('parent_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (rootFolder?.id) {
      rootId = rootFolder.id as string;
    } else {
      rootId = await ensureFolder(adminClient, {
        ownerId: stakeholder.id,
        appUuid,
        parentId: null,
        name: 'My Workspace',
        createdBy,
        fileStoragePath: null
      });
    }

    const vcRootId = await ensureFolder(adminClient, {
      ownerId: stakeholder.id,
      appUuid,
      parentId: null,
      name: 'VC Models',
      createdBy,
      fileStoragePath: '/VC Models/'
    });

    const modelFolderId = await ensureFolder(adminClient, {
      ownerId: stakeholder.id,
      appUuid,
      parentId: vcRootId,
      name: vcModel.model_name,
      createdBy,
      fileStoragePath: `/VC Models/${vcModel.model_name}/`
    });

    const preliminariesId = await ensureFolder(adminClient, {
      ownerId: stakeholder.id,
      appUuid,
      parentId: modelFolderId,
      name: 'Preliminaries',
      createdBy,
      fileStoragePath: `/VC Models/${vcModel.model_name}/Preliminaries/`
    });

    return NextResponse.json({
      preliminaries_folder_id: preliminariesId,
      model_name: vcModel.model_name
    });
  } catch (error: any) {
    console.error('Error in GET /api/flm/bvs-folder:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
