-- FLM Component Suite - Phase 2: Register FLM UI Components
-- File: 20260111_170125_register_flm_ui_components.sql
-- Purpose: Register all FLM UI components in components_registry

DO $$
DECLARE
  v_app_uuid UUID;
BEGIN
  -- Get app UUID from site_settings (components_registry references site_settings.app_uuid)
  SELECT app_uuid INTO v_app_uuid FROM site_settings WHERE site_code = 'VC_STUDIO' AND is_active = true LIMIT 1;
  
  IF v_app_uuid IS NULL THEN
    RAISE NOTICE 'VC_STUDIO site_settings not found, skipping component registration';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Registering FLM UI components with app_uuid: %', v_app_uuid;
  
  -- Register FLM_MODEL_DISPLAY
  INSERT INTO components_registry (
    component_code,
    component_name,
    description,
    widget_component_name,
    default_params,
    is_active,
    app_uuid,
    version
  ) VALUES (
    'FLM_MODEL_DISPLAY',
    'FLM Model Display',
    'Main FLM progress and navigation display component',
    'FLMModelDisplay',
    '{"phase": "1d.7", "reusable": true}'::jsonb,
    true,
    v_app_uuid,
    '1.0'
  )
  ON CONFLICT (component_code) DO UPDATE
  SET
    component_name = EXCLUDED.component_name,
    description = EXCLUDED.description,
    widget_component_name = EXCLUDED.widget_component_name,
    default_params = EXCLUDED.default_params,
    updated_at = NOW();
  
  RAISE NOTICE '✓ Registered FLM_MODEL_DISPLAY';
  
  -- Register FLM_BVS_BUILDER
  INSERT INTO components_registry (
    component_code,
    component_name,
    description,
    widget_component_name,
    is_active,
    app_uuid,
    version,
    default_params
  ) VALUES (
    'FLM_BVS_BUILDER',
    'BVS Builder Component',
    'Business Value Summary capture interface',
    'BVSBuilder',
    true,
    v_app_uuid,
    '1.0',
    '{"phase": "1d.7", "reusable": true}'::jsonb
  )
  ON CONFLICT (component_code) DO UPDATE
  SET
    component_name = EXCLUDED.component_name,
    description = EXCLUDED.description,
    widget_component_name = EXCLUDED.widget_component_name,
    default_params = EXCLUDED.default_params,
    updated_at = NOW();
  
  RAISE NOTICE '✓ Registered FLM_BVS_BUILDER';
  
  -- Register FLM_DBS_FORM
  INSERT INTO components_registry (
    component_code,
    component_name,
    description,
    widget_component_name,
    is_active,
    app_uuid,
    version,
    default_params
  ) VALUES (
    'FLM_DBS_FORM',
    'DBS Form Component',
    'Dynamic form from AI-generated schema',
    'DBSForm',
    true,
    v_app_uuid,
    '1.0',
    '{"phase": "1d.7", "reusable": true}'::jsonb
  )
  ON CONFLICT (component_code) DO UPDATE
  SET
    component_name = EXCLUDED.component_name,
    description = EXCLUDED.description,
    widget_component_name = EXCLUDED.widget_component_name,
    default_params = EXCLUDED.default_params,
    updated_at = NOW();
  
  RAISE NOTICE '✓ Registered FLM_DBS_FORM';
  
  -- Register FLM_L0_BUILDER
  INSERT INTO components_registry (
    component_code,
    component_name,
    description,
    widget_component_name,
    is_active,
    app_uuid,
    version,
    default_params
  ) VALUES (
    'FLM_L0_BUILDER',
    'L0 Domain Builder',
    'L0 domain definition interface',
    'L0Builder',
    true,
    v_app_uuid,
    '1.0',
    '{"phase": "1d.7", "reusable": true}'::jsonb
  )
  ON CONFLICT (component_code) DO UPDATE
  SET
    component_name = EXCLUDED.component_name,
    description = EXCLUDED.description,
    widget_component_name = EXCLUDED.widget_component_name,
    default_params = EXCLUDED.default_params,
    updated_at = NOW();
  
  RAISE NOTICE '✓ Registered FLM_L0_BUILDER';
  
  -- Register FLM_L1_BUILDER
  INSERT INTO components_registry (
    component_code,
    component_name,
    description,
    widget_component_name,
    is_active,
    app_uuid,
    version,
    default_params
  ) VALUES (
    'FLM_L1_BUILDER',
    'L1 Pillar Builder',
    'L1 pillar definition interface',
    'L1Builder',
    true,
    v_app_uuid,
    '1.0',
    '{"phase": "1d.7", "reusable": true}'::jsonb
  )
  ON CONFLICT (component_code) DO UPDATE
  SET
    component_name = EXCLUDED.component_name,
    description = EXCLUDED.description,
    widget_component_name = EXCLUDED.widget_component_name,
    default_params = EXCLUDED.default_params,
    updated_at = NOW();
  
  RAISE NOTICE '✓ Registered FLM_L1_BUILDER';
  
  -- Register FLM_L2_BUILDER
  INSERT INTO components_registry (
    component_code,
    component_name,
    description,
    widget_component_name,
    is_active,
    app_uuid,
    version,
    default_params
  ) VALUES (
    'FLM_L2_BUILDER',
    'L2 Capability Builder',
    'L2 capability matrix interface',
    'L2Builder',
    true,
    v_app_uuid,
    '1.0',
    '{"phase": "1d.7", "reusable": true}'::jsonb
  )
  ON CONFLICT (component_code) DO UPDATE
  SET
    component_name = EXCLUDED.component_name,
    description = EXCLUDED.description,
    widget_component_name = EXCLUDED.widget_component_name,
    default_params = EXCLUDED.default_params,
    updated_at = NOW();
  
  RAISE NOTICE '✓ Registered FLM_L2_BUILDER';
  
  -- Register FLM_BLUEPRINT_GENERATOR
  INSERT INTO components_registry (
    component_code,
    component_name,
    description,
    widget_component_name,
    is_active,
    app_uuid,
    version,
    default_params
  ) VALUES (
    'FLM_BLUEPRINT_GENERATOR',
    'Blueprint Generator',
    'Final blueprint compilation display',
    'BlueprintGenerator',
    true,
    v_app_uuid,
    '1.0',
    '{"phase": "1d.7", "reusable": true}'::jsonb
  )
  ON CONFLICT (component_code) DO UPDATE
  SET
    component_name = EXCLUDED.component_name,
    description = EXCLUDED.description,
    widget_component_name = EXCLUDED.widget_component_name,
    default_params = EXCLUDED.default_params,
    updated_at = NOW();
  
  RAISE NOTICE '✓ Registered FLM_BLUEPRINT_GENERATOR';
  
  RAISE NOTICE '✓ All FLM UI components registered successfully';
END $$;
