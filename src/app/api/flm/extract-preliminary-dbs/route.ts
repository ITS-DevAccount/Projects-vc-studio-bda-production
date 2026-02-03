import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getPromptLibrary } from '@/lib/ai/prompt-library';
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

  const { data: existing } = await query;
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
    throw new Error(insertError.message || 'Failed to create folder');
  }

  return created.id as string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    if (!body?.flm_model_id) {
      return NextResponse.json({ error: 'flm_model_id is required' }, { status: 400 });
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

    const { data: bvsArtefact } = await adminClient
      .from('flm_artefacts')
      .select('artefact_json')
      .eq('flm_model_id', flmModel.id)
      .eq('artefact_type', 'BVS')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!bvsArtefact) {
      return NextResponse.json({ error: 'BVS artefact not found' }, { status: 404 });
    }

    const bvsPayload = bvsArtefact.artefact_json;
    let bvsObject: any = null;

    if (typeof bvsPayload === 'string') {
      try {
        bvsObject = JSON.parse(bvsPayload);
      } catch {
        bvsObject = { business_description: bvsPayload };
      }
    } else {
      bvsObject = bvsPayload || {};
    }

    const bvsText = typeof bvsObject?.business_description === 'string' && bvsObject.business_description.trim()
      ? bvsObject.business_description
      : (typeof bvsObject?.text === 'string' && bvsObject.text.trim()
          ? bvsObject.text
          : (typeof bvsPayload === 'string' ? bvsPayload : JSON.stringify(bvsObject)));

    const companyName = bvsObject?.company_name || '';
    const stakeholderName = stakeholder?.name || '';
    const sourceDocuments = Array.isArray(bvsObject?.source_documents)
      ? bvsObject.source_documents
      : [];

    const promptLibrary = await getPromptLibrary();
    const promptVariables = {
      bvs: bvsText,
      input: bvsText,
      description: bvsText,
      business_description: bvsText,
      bvs_content: bvsText,
      stakeholder_name: stakeholderName || companyName,
      source_documents: sourceDocuments,
      company_name: companyName,
      company: companyName
    };

    if (body?.dry_run) {
      const rendered = await promptLibrary.getPrompt('BVS_TO_PRELIMINARY_DBS', promptVariables);
      if (!rendered) {
        return NextResponse.json({ error: 'Prompt template not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        preview: {
          system_prompt: rendered.systemPrompt,
          user_prompt: rendered.userPrompt,
          variables: promptVariables
        }
      });
    }

    const promptResponse = await promptLibrary.executePrompt(
      'BVS_TO_PRELIMINARY_DBS',
      promptVariables,
      { stakeholderId: stakeholder.id }
    );

    if (!promptResponse.success) {
      return NextResponse.json({ error: promptResponse.error || 'AI extraction failed' }, { status: 500 });
    }

    const appUuid = await getAppUuid();
    const createdBy = user.id || null;

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

    const storagePath = `${stakeholder.reference}/vc-models/${vcModel.model_name}/preliminaries/preliminary_dbs.json`;

    const { error: uploadError } = await adminClient.storage
      .from('workspace-files')
      .upload(storagePath, JSON.stringify(promptResponse.data, null, 2), {
        contentType: 'application/json',
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
      .eq('name', 'preliminary_dbs.json')
      .eq('type', 'file')
      .maybeSingle();

    if (existingNode?.id) {
      const { error: updateError } = await adminClient
        .from('nodes')
        .update({
          file_storage_path: storagePath,
          size_bytes: JSON.stringify(promptResponse.data).length,
          mime_type: 'application/json',
          description: 'Preliminary DBS'
        })
        .eq('id', existingNode.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      const { error: insertError } = await adminClient
        .from('nodes')
        .insert({
          name: 'preliminary_dbs.json',
          type: 'file',
          parent_id: preliminariesId,
          owner_id: stakeholder.id,
          app_uuid: appUuid,
          file_storage_path: storagePath,
          size_bytes: JSON.stringify(promptResponse.data).length,
          mime_type: 'application/json',
          description: 'Preliminary DBS',
          created_by: createdBy
        });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    const { data: existingArtefact } = await adminClient
      .from('flm_artefacts')
      .select('id')
      .eq('flm_model_id', flmModel.id)
      .eq('artefact_type', 'PRELIMINARY_DBS')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const artefactPayload = {
      artefact_json: promptResponse.data,
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
          artefact_type: 'PRELIMINARY_DBS',
          version: 1,
          ...artefactPayload
        });

      if (artefactInsertError) {
        return NextResponse.json({ error: artefactInsertError.message }, { status: 500 });
      }
    }

    const { error: stepError } = await adminClient
      .from('flm_models')
      .update({ current_step: 'DBS_REVIEW' })
      .eq('id', flmModel.id);

    if (stepError) {
      return NextResponse.json({ error: stepError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, next_step: 'DBS_REVIEW' });
  } catch (error: any) {
    console.error('Error in POST /api/flm/extract-preliminary-dbs:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
