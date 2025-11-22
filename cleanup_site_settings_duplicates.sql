-- Cleanup duplicate site_settings records
-- Keep only the record with app_uuid that matches your roles/relationship_types data

-- Step 1: Delete ALL site_settings records EXCEPT the one with the correct app_uuid
DELETE FROM site_settings
WHERE app_uuid != '15f9ef84-4fa4-4421-a37b-6185501fb62d';

-- Step 2: Ensure the remaining record is set as active
UPDATE site_settings
SET
  is_active = true,
  is_active_app = true,
  updated_at = NOW()
WHERE app_uuid = '15f9ef84-4fa4-4421-a37b-6185501fb62d';

-- Step 3: Verify - should return exactly 1 record
SELECT
    COUNT(*) as total_records,
    app_uuid,
    site_code,
    is_active,
    is_active_app
FROM site_settings
GROUP BY app_uuid, site_code, is_active, is_active_app;
