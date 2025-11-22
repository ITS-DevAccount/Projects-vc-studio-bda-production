-- Fix site_settings to have only one active app
-- This ensures getAppUuid() returns the correct app_uuid that matches your roles and relationship_types data

-- Step 1: Set ALL records to is_active_app = false
UPDATE site_settings
SET is_active_app = false;

-- Step 2: Set ONLY the record with the correct app_uuid to is_active_app = true
UPDATE site_settings
SET is_active_app = true
WHERE app_uuid = '15f9ef84-4fa4-4421-a37b-6185501fb62d';

-- Verify the fix
SELECT
    id,
    site_name,
    app_uuid,
    site_code,
    domain_code,
    is_active_app,
    is_active,
    created_at
FROM site_settings
WHERE is_active_app = true;

-- This should return exactly ONE record with app_uuid = '15f9ef84-4fa4-4421-a37b-6185501fb62d'
