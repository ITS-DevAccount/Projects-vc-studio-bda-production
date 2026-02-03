-- ============================================================================
-- BuildBid: Register Campaign Seeder Component
-- Migration: Register the Campaign Seeder (OCDS Upload) component
-- Description: Registers the campaign seeder component in the components_registry
-- Created: 2025-12-31
-- ============================================================================

-- Register Campaign Seeder component
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
    'campaign_seeder',
    'Campaign Seeder (OCDS Upload)',
    'Upload and process OCDS JSON files to extract supplier/award data and create campaign opportunities',
    'upload',
    '/dashboard/admin/campaigns/[id]/seed',
    'CampaignSeeder',
    ARRAY[]::TEXT[],
    ARRAY['administrator', 'admin', 'campaign_admin']::TEXT[],
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
    WHERE component_code = 'campaign_seeder'
    AND app_uuid IN (SELECT id FROM applications WHERE app_code = 'BUILDBID');

    IF v_component_count > 0 THEN
        RAISE NOTICE '✓ Campaign Seeder component registered in components_registry';
    ELSE
        RAISE WARNING '⚠ Campaign Seeder component NOT found in components_registry';
    END IF;
END $$;

