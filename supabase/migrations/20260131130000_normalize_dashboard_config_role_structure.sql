-- Migration: Normalize dashboard_config to use role_configurations structure
-- Converts top-level menu_items/workspace_layout to role_configurations[roleCode]
-- for API compatibility. Idempotent: skips rows that already have role_configurations.

DO $$
DECLARE
  r RECORD;
  v_config jsonb;
  v_role_config jsonb;
  v_role_codes text[];
  v_role text;
BEGIN
  FOR r IN
    SELECT id, config_name, dashboard_config
    FROM workspace_dashboard_configurations
    WHERE dashboard_config ? 'menu_items'
      AND (NOT (dashboard_config ? 'role_configurations') OR dashboard_config->'role_configurations' = '{}'::jsonb)
  LOOP
    v_config := r.dashboard_config;

    -- Determine role codes from workspace_templates that use this config
    SELECT array_agg(DISTINCT role_code) INTO v_role_codes
    FROM (
      SELECT unnest(applicable_roles) AS role_code
      FROM workspace_templates
      WHERE dashboard_config_id = r.id
    ) sub
    WHERE role_code IS NOT NULL;

    -- Fallback: map by config_name if no templates link
    IF v_role_codes IS NULL OR array_length(v_role_codes, 1) IS NULL THEN
      v_role_codes := CASE r.config_name
        WHEN 'VC Studio Investor Default' THEN ARRAY['investor', 'administrator']
        WHEN 'VC Studio Administrator Default' THEN ARRAY['administrator']
        WHEN 'VC Studio Individual Default' THEN ARRAY['individual']
        ELSE ARRAY['default']
      END;
    END IF;

    -- Build role_configurations from top-level menu_items, workspace_layout, etc.
    v_role_config := '{}'::jsonb;
    FOREACH v_role IN ARRAY v_role_codes
    LOOP
      v_role_config := v_role_config || jsonb_build_object(
        v_role,
        jsonb_build_object(
          'menu_items', COALESCE(v_config->'menu_items', '[]'::jsonb),
          'dashboard_name', COALESCE(v_config->>'dashboard_name', r.config_name),
          'workspace_layout', COALESCE(v_config->'workspace_layout', '{}'::jsonb),
          'widgets', COALESCE(v_config->'widgets', '[]'::jsonb),
          'component_access', COALESCE(v_config->'component_access', '{}'::jsonb)
        )
      );
    END LOOP;

    -- Merge: keep other keys, replace/add role_configurations
    v_config := (v_config - 'menu_items' - 'dashboard_name' - 'workspace_layout' - 'widgets' - 'component_access')
      || jsonb_build_object('role_configurations', v_role_config);

    UPDATE workspace_dashboard_configurations
    SET dashboard_config = v_config,
        updated_at = NOW()
    WHERE id = r.id;

    RAISE NOTICE 'Normalized dashboard_config for: % (roles: %)', r.config_name, array_to_string(v_role_codes, ', ');
  END LOOP;
END $$;
