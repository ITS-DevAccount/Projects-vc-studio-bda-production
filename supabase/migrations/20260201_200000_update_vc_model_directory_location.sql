-- Place VC Model directories under the stakeholder's "VC Models" folder.
-- Ensures root and VC Models parent folders exist, then creates model folder and full subtree.

CREATE OR REPLACE FUNCTION ensure_vc_folder(
  p_owner_id UUID,
  p_parent_id UUID,
  p_app_uuid UUID,
  p_name TEXT,
  p_storage_path TEXT,
  p_created_by UUID
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id
  FROM nodes
  WHERE owner_id = p_owner_id
    AND parent_id IS NOT DISTINCT FROM p_parent_id
    AND type = 'folder'
    AND name = p_name
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO nodes (
      name,
      type,
      parent_id,
      owner_id,
      app_uuid,
      file_storage_path,
      created_by
    ) VALUES (
      p_name,
      'folder',
      p_parent_id,
      p_owner_id,
      p_app_uuid,
      p_storage_path,
      p_created_by
    ) RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS create_vc_model(uuid, text, text, uuid);

CREATE OR REPLACE FUNCTION create_vc_model(
  p_stakeholder_id UUID,
  p_model_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_app_uuid UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_model_id UUID;
  v_model_code TEXT;
  v_app_uuid UUID;
  v_created_by UUID;
  v_root_id UUID;
  v_vc_models_root_id UUID;
  v_model_folder_id UUID;
  v_preliminaries_id UUID;
  v_dbs_id UUID;
  v_flm_id UUID;
  v_agm_id UUID;
BEGIN
  -- Get app_uuid (use provided or get from applications table)
  IF p_app_uuid IS NULL THEN
    SELECT id INTO v_app_uuid FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1;
    IF v_app_uuid IS NULL THEN
      RAISE EXCEPTION 'VC_STUDIO application not found';
    END IF;
  ELSE
    v_app_uuid := p_app_uuid;
  END IF;

  -- Use auth user id when it exists in auth.users
  SELECT id INTO v_created_by FROM auth.users WHERE id = auth.uid() LIMIT 1;

  -- Generate unique model code
  v_model_code := 'VC-' || to_char(NOW(), 'YYYY') || '-' ||
                  LPAD(nextval('vc_model_sequence')::text, 4, '0');

  -- Insert VC model
  INSERT INTO vc_models (
    model_code,
    stakeholder_id,
    app_uuid,
    model_name,
    description,
    status,
    is_current_version,
    version_number,
    created_by
  ) VALUES (
    v_model_code,
    p_stakeholder_id,
    v_app_uuid,
    p_model_name,
    p_description,
    'INITIATED',
    true,
    1,
    v_created_by
  ) RETURNING id INTO v_model_id;

  -- Add creator as owner in collaborators
  INSERT INTO vc_model_collaborators (
    vc_model_id,
    stakeholder_id,
    role,
    permissions,
    added_by
  ) VALUES (
    v_model_id,
    p_stakeholder_id,
    'OWNER',
    '{"can_edit": true, "can_approve": true, "can_delete": true}'::jsonb,
    v_created_by
  );

  -- Ensure root workspace folder exists
  SELECT id INTO v_root_id
  FROM nodes
  WHERE owner_id = p_stakeholder_id
    AND parent_id IS NULL
    AND type = 'folder'
  ORDER BY created_at
  LIMIT 1;

  IF v_root_id IS NULL THEN
    v_root_id := ensure_vc_folder(
      p_stakeholder_id,
      NULL,
      v_app_uuid,
      'My Workspace',
      NULL,
      v_created_by
    );
  END IF;

  -- Ensure VC Models parent folder exists at root
  v_vc_models_root_id := ensure_vc_folder(
    p_stakeholder_id,
    v_root_id,
    v_app_uuid,
    'VC Models',
    '/VC Models/',
    v_created_by
  );

  -- Create model directory under VC Models folder
  v_model_folder_id := ensure_vc_folder(
    p_stakeholder_id,
    v_vc_models_root_id,
    v_app_uuid,
    p_model_name,
    '/VC Models/' || p_model_name || '/',
    v_created_by
  );

  -- Preliminaries
  v_preliminaries_id := ensure_vc_folder(
    p_stakeholder_id,
    v_model_folder_id,
    v_app_uuid,
    'Preliminaries',
    '/VC Models/' || p_model_name || '/Preliminaries/',
    v_created_by
  );

  -- FLM
  PERFORM ensure_vc_folder(
    p_stakeholder_id,
    v_model_folder_id,
    v_app_uuid,
    'FLM',
    '/VC Models/' || p_model_name || '/FLM/',
    v_created_by
  );

  -- Transitions
  PERFORM ensure_vc_folder(
    p_stakeholder_id,
    v_model_folder_id,
    v_app_uuid,
    'Transitions',
    '/VC Models/' || p_model_name || '/Transitions/',
    v_created_by
  );

  -- AGM (future)
  PERFORM ensure_vc_folder(
    p_stakeholder_id,
    v_model_folder_id,
    v_app_uuid,
    'AGM',
    '/VC Models/' || p_model_name || '/AGM/',
    v_created_by
  );

  -- Blueprints
  PERFORM ensure_vc_folder(
    p_stakeholder_id,
    v_model_folder_id,
    v_app_uuid,
    'Blueprints',
    '/VC Models/' || p_model_name || '/Blueprints/',
    v_created_by
  );

  RETURN v_model_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
