DO $$
DECLARE
    v_app_uuid UUID;
BEGIN
    -- Get VC Studio app UUID (stored on site_settings)
    SELECT app_uuid
    INTO v_app_uuid
    FROM site_settings
    WHERE is_active_app = true
    LIMIT 1;

    IF v_app_uuid IS NULL THEN
        RAISE EXCEPTION 'VC Studio application not found';
    END IF;

    -- Register VC Models component
    INSERT INTO components_registry (
        component_code,
        component_name,
        description,
        route_path,
        widget_component_name,
        is_active,
        app_uuid
    ) VALUES (
        'vc_models',
        'VC Models',
        'Value Chain Models management - list, create, and manage VC Models',
        '/dashboard/vc-models',
        'VCModelsPage',
        true,
        v_app_uuid
    )
    ON CONFLICT (component_code)
    DO UPDATE SET
        route_path = '/dashboard/vc-models',
        widget_component_name = 'VCModelsPage',
        is_active = true,
        app_uuid = v_app_uuid,
        updated_at = NOW();

    -- Register FLM Components
    INSERT INTO components_registry (
        component_code,
        component_name,
        description,
        route_path,
        widget_component_name,
        is_active,
        app_uuid
    ) VALUES (
        'flm_components',
        'FLM Components',
        'Framework Level Mapping tools and workflow',
        '/dashboard/flm',
        'FLMComponentsPage',
        true,
        v_app_uuid
    )
    ON CONFLICT (component_code)
    DO UPDATE SET
        route_path = '/dashboard/flm',
        widget_component_name = 'FLMComponentsPage',
        is_active = true,
        app_uuid = v_app_uuid,
        updated_at = NOW();

    -- Register Collaboration component
    INSERT INTO components_registry (
        component_code,
        component_name,
        description,
        route_path,
        widget_component_name,
        is_active,
        app_uuid
    ) VALUES (
        'collaboration',
        'Collaboration',
        'Manage collaborators on VC Models',
        '/dashboard/collaboration',
        'CollaborationPage',
        true,
        v_app_uuid
    )
    ON CONFLICT (component_code)
    DO UPDATE SET
        route_path = '/dashboard/collaboration',
        widget_component_name = 'CollaborationPage',
        is_active = true,
        app_uuid = v_app_uuid,
        updated_at = NOW();
END $$;
