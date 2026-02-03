
-- Ensure VC Models folder is created at root (parent_id NULL)

CREATE OR REPLACE FUNCTION public.create_vc_model(
  p_stakeholder_id uuid,
  p_model_name text,
  p_description text DEFAULT NULL::text,
  p_app_uuid uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_model_id UUID;
  v_model_code TEXT;
  v_app_uuid UUID;
  v_created_by UUID;
  v_vc_models_root_id UUID;
  v_model_folder_id UUID;
  v_preliminaries_id UUID;
BEGIN
  IF p_app_uuid IS NULL THEN
    SELECT id INTO v_app_uuid FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1;
    IF v_app_uuid IS NULL THEN
      RAISE EXCEPTION 'VC_STUDIO application not found';
    END IF;
  ELSE
    v_app_uuid := p_app_uuid;
  END IF;

  SELECT id INTO v_created_by FROM auth.users WHERE id = auth.uid() LIMIT 1;

  v_model_code := 'VC-' || to_char(NOW(), 'YYYY') || '-' ||
                  LPAD(nextval('vc_model_sequence')::text, 4, '0');

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

  v_vc_models_root_id := ensure_vc_folder(
    p_stakeholder_id,
    NULL,
    v_app_uuid,
    'VC Models',
    '/VC Models/',
    v_created_by
  );

  v_model_folder_id := ensure_vc_folder(
    p_stakeholder_id,
    v_vc_models_root_id,
    v_app_uuid,
    p_model_name,
    '/VC Models/' || p_model_name || '/',
    v_created_by
  );

  v_preliminaries_id := ensure_vc_folder(
    p_stakeholder_id,
    v_model_folder_id,
    v_app_uuid,
    'Preliminaries',
    '/VC Models/' || p_model_name || '/Preliminaries/',
    v_created_by
  );

  PERFORM ensure_vc_folder(
    p_stakeholder_id,
    v_model_folder_id,
    v_app_uuid,
    'FLM',
    '/VC Models/' || p_model_name || '/FLM/',
    v_created_by
  );

  PERFORM ensure_vc_folder(
    p_stakeholder_id,
    v_model_folder_id,
    v_app_uuid,
    'Transitions',
    '/VC Models/' || p_model_name || '/Transitions/',
    v_created_by
  );

  PERFORM ensure_vc_folder(
    p_stakeholder_id,
    v_model_folder_id,
    v_app_uuid,
    'AGM',
    '/VC Models/' || p_model_name || '/AGM/',
    v_created_by
  );

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
$function$;
