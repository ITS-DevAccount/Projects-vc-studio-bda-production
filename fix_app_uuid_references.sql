-- Fix all app_uuid references to use the correct one
-- This updates all dependent tables to use app_uuid = '15f9ef84-4fa4-4421-a37b-6185501fb62d'

-- The correct app_uuid (the one that roles and relationship_types use)
-- '15f9ef84-4fa4-4421-a37b-6185501fb62d'

-- Step 1: Update page_settings to use the correct app_uuid
UPDATE page_settings
SET app_uuid = '15f9ef84-4fa4-4421-a37b-6185501fb62d'
WHERE app_uuid != '15f9ef84-4fa4-4421-a37b-6185501fb62d';

-- Step 2: Check for other tables that might reference site_settings.app_uuid
-- Run the find_site_settings_dependencies.sql query first to find all dependent tables

-- Step 3: After updating all dependent tables, delete duplicate site_settings
DELETE FROM site_settings
WHERE app_uuid != '15f9ef84-4fa4-4421-a37b-6185501fb62d';

-- Step 4: Ensure the correct record is active
UPDATE site_settings
SET is_active = true, is_active_app = true, updated_at = NOW()
WHERE app_uuid = '15f9ef84-4fa4-4421-a37b-6185501fb62d';

-- Step 5: Verify
SELECT COUNT(*) as total_site_settings FROM site_settings;
SELECT
    app_uuid,
    COUNT(*) as count
FROM page_settings
GROUP BY app_uuid;
