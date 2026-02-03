-- ============================================================================
-- VC Studio BDA: Register Campaign Types and Campaign Dashboard Components
-- Migration: Register the two missing campaign components in components_registry
-- Description: Registers campaign_types and campaign_analytics in components_registry
-- Created: 2026-02-02
-- ============================================================================

DO $$
DECLARE
    v_app_uuid UUID;
BEGIN
    -- Get app UUID from site_settings (components_registry FK references site_settings.app_uuid)
    SELECT app_uuid INTO v_app_uuid FROM site_settings WHERE is_active_app = true LIMIT 1;
    IF v_app_uuid IS NULL THEN
        RAISE NOTICE 'No active app found in site_settings. Skipping campaign component registration.';
        RETURN;
    END IF;

    -- Register Campaign Types component
    INSERT INTO components_registry (
        component_code,
        component_name,
        description,
        icon_name,
        route_path,
        widget_component_name,
        required_permissions,
        required_role_codes,
        supports_params,
        default_params,
        launch_in_modal,
        launch_in_sidebar,
        supports_full_screen,
        is_active,
        version,
        app_uuid
    ) VALUES (
        'campaign_types',
        'Campaign Types',
        'Define funnel stages and configure campaign templates',
        'settings',
        '/dashboard/admin/campaigns/types/new',
        'CampaignTypeManager',
        ARRAY[]::TEXT[],
        ARRAY['administrator', 'admin', 'campaign_admin']::TEXT[],
        true,
        '{}'::JSONB,
        false,
        false,
        true,
        true,
        '1.0',
        v_app_uuid
    )
    ON CONFLICT (component_code) DO UPDATE
    SET
        component_name = EXCLUDED.component_name,
        description = EXCLUDED.description,
        icon_name = EXCLUDED.icon_name,
        route_path = EXCLUDED.route_path,
        widget_component_name = EXCLUDED.widget_component_name,
        required_role_codes = EXCLUDED.required_role_codes,
        is_active = EXCLUDED.is_active,
        version = EXCLUDED.version,
        app_uuid = EXCLUDED.app_uuid,
        updated_at = NOW();

    RAISE NOTICE '✓ Campaign Types component registered in components_registry';

    -- Register Campaign Dashboard (Analytics) component
    INSERT INTO components_registry (
        component_code,
        component_name,
        description,
        icon_name,
        route_path,
        widget_component_name,
        required_permissions,
        required_role_codes,
        supports_params,
        default_params,
        launch_in_modal,
        launch_in_sidebar,
        supports_full_screen,
        is_active,
        version,
        app_uuid
    ) VALUES (
        'campaign_analytics',
        'Campaign Dashboard',
        'View campaign-level dashboards and performance',
        'bar-chart',
        '/dashboard/admin/campaigns/analytics',
        'CampaignAnalyticsDashboard',
        ARRAY[]::TEXT[],
        ARRAY['administrator', 'admin', 'campaign_admin']::TEXT[],
        true,
        '{}'::JSONB,
        false,
        false,
        true,
        true,
        '1.0',
        v_app_uuid
    )
    ON CONFLICT (component_code) DO UPDATE
    SET
        component_name = EXCLUDED.component_name,
        description = EXCLUDED.description,
        icon_name = EXCLUDED.icon_name,
        route_path = EXCLUDED.route_path,
        widget_component_name = EXCLUDED.widget_component_name,
        required_role_codes = EXCLUDED.required_role_codes,
        is_active = EXCLUDED.is_active,
        version = EXCLUDED.version,
        app_uuid = EXCLUDED.app_uuid,
        updated_at = NOW();

    RAISE NOTICE '✓ Campaign Dashboard component registered in components_registry';
END $$;
