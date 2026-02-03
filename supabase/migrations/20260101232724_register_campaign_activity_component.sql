-- ============================================================================
-- BuildBid: Register Campaign Activity Monitor Component
-- Migration: Register the Campaign Activity Monitor component
-- Description: Registers the campaign activity monitor component in the components_registry
-- Created: 2026-01-01
-- ============================================================================

-- Register Campaign Activity Monitor component
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
)
SELECT
    'campaign_activity',
    'Campaign Activity Monitor',
    'Manage and track campaign opportunities through sales pipeline stages',
    'activity',
    '/dashboard/admin/campaigns/activity',
    'CampaignActivityMonitor',
    ARRAY[]::TEXT[],
    ARRAY['administrator', 'admin', 'campaign_admin', 'external_consultant']::TEXT[],
    true,
    '{}'::JSONB,
    false,
    false,
    true,
    true,
    '1.0',
    id
FROM applications
WHERE app_code = 'BUILDBID'
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
    updated_at = NOW();

-- Verification
DO $$
DECLARE
    v_component_count INT;
BEGIN
    SELECT COUNT(*) INTO v_component_count
    FROM components_registry
    WHERE component_code = 'campaign_activity'
    AND app_uuid IN (SELECT id FROM applications WHERE app_code = 'BUILDBID');

    IF v_component_count > 0 THEN
        RAISE NOTICE '✓ Campaign Activity Monitor component registered in components_registry';
    ELSE
        RAISE WARNING '⚠ Campaign Activity Monitor component NOT found in components_registry';
    END IF;
END $$;
