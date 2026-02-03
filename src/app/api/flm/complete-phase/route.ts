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

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const body = await request.json();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!body?.flm_model_id || !body?.phase || body.phase !== 'BVS') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
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
      .select('id, reference, name')
      .eq('auth_user_id', user.id)
      .single();

    if (stakeholderError || !stakeholder) {
      return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
    }

    const { data: flmModel, error: flmError } = await adminClient
      .from('flm_models')
      .select('id, vc_model_id')
      .eq('id', body.flm_model_id)
      .single();

    if (flmError || !flmModel) {
      return NextResponse.json({ error: 'FLM model not found' }, { status: 404 });
    }

    const { data: vcModel, error: vcModelError } = await adminClient
      .from('vc_models')
      .select('id, model_name, stakeholder_id, app_uuid')
      .eq('id', flmModel.vc_model_id)
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

    const descriptionText = body?.data?.business_description || '';
    const companyName = body?.data?.company_name || '';
    const stakeholderName = stakeholder?.name || '';
    const companyLabel = companyName || stakeholderName;
    const descriptionWithHeader = companyLabel
      ? `Company Name: ${companyLabel}\n\n${descriptionText}`
      : descriptionText;
    const sourceDocuments = Array.isArray(body?.data?.source_documents)
      ? body.data.source_documents
      : [];

    const storagePath = `${stakeholder.reference}/vc-models/${vcModel.model_name}/preliminaries/business_description.txt`;

    const { error: uploadError } = await adminClient.storage
      .from('workspace-files')
      .upload(storagePath, Buffer.from(descriptionWithHeader, 'utf-8'), {
        contentType: 'text/plain',
        upsert: true
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: existingNode } = await adminClient
      .from('nodes')
      .select('id')
      .eq('owner_id', stakeholder.id)
      .eq('parent_id', preliminariesId)
      .eq('name', 'business_description.txt')
      .eq('type', 'file')
      .maybeSingle();

    let descriptionNodeId: string | null = null;

    if (existingNode?.id) {
      const { data: updatedNode, error: updateError } = await adminClient
        .from('nodes')
        .update({
          file_storage_path: storagePath,
          size_bytes: descriptionWithHeader.length,
          mime_type: 'text/plain',
          description: 'Business Value Summary'
        })
        .eq('id', existingNode.id)
        .select('id')
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      descriptionNodeId = updatedNode?.id || null;
    } else {
      const { data: createdNode, error: insertError } = await adminClient
        .from('nodes')
        .insert({
          name: 'business_description.txt',
          type: 'file',
          parent_id: preliminariesId,
          owner_id: stakeholder.id,
          app_uuid: appUuid,
          file_storage_path: storagePath,
          size_bytes: descriptionWithHeader.length,
          mime_type: 'text/plain',
          description: 'Business Value Summary',
          created_by: createdBy
        })
        .select('id')
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      descriptionNodeId = createdNode?.id || null;
    }

    const { data: existingArtefact } = await adminClient
      .from('flm_artefacts')
      .select('id')
      .eq('flm_model_id', flmModel.id)
      .eq('artefact_type', 'BVS')
      .eq('version', 1)
      .maybeSingle();

    const artefactPayload = {
      artefact_json: {
        company_name: companyName,
        business_description: descriptionWithHeader,
        source_documents: sourceDocuments
      },
      status: 'DRAFT',
      document_path: storagePath,
      created_by: createdBy
    };

    if (existingArtefact?.id) {
      const { error: artefactUpdateError } = await adminClient
        .from('flm_artefacts')
        .update(artefactPayload)
        .eq('id', existingArtefact.id);

      if (artefactUpdateError) {
        return NextResponse.json({ error: artefactUpdateError.message }, { status: 500 });
      }
    } else {
      const { error: artefactInsertError } = await adminClient
        .from('flm_artefacts')
        .insert({
          flm_model_id: flmModel.id,
          artefact_type: 'BVS',
          version: 1,
          ...artefactPayload
        });

      if (artefactInsertError) {
        return NextResponse.json({ error: artefactInsertError.message }, { status: 500 });
      }
    }

    const { error: stepError } = await adminClient
      .from('flm_models')
      .update({ current_step: 'PRELIMINARY_DBS' })
      .eq('id', flmModel.id);

    if (stepError) {
      return NextResponse.json({ error: stepError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      document_node_id: descriptionNodeId
    });
  } catch (error: any) {
    console.error('Error in POST /api/flm/complete-phase:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
