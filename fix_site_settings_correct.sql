-- Fix site_settings to ensure the correct app_uuid is active
-- The correct app_uuid is: 15f9ef84-4fa4-4421-a37b-6185501fb62d

-- Step 1: Set ALL records to is_active_app = false and is_active = false
UPDATE site_settings
SET is_active_app = false, is_active = false;

-- Step 2: Set ONLY the correct record to is_active_app = true and is_active = true
UPDATE site_settings
SET is_active_app = true, is_active = true
WHERE app_uuid = '15f9ef84-4fa4-4421-a37b-6185501fb62d';

-- Step 3: Verify the fix - should return exactly ONE record
SELECT
    app_uuid,
    site_code,
    domain_code,
    is_active_app,
    is_active
FROM site_settings
WHERE is_active_app = true OR is_active = true;
