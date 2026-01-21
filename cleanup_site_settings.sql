-- Clean up site_settings table for VC Studio BDA Production
-- First, identify the correct app_uuid from applications table

-- ============================================================================
-- STEP 0: Find VC Studio BDA Production app_uuid
-- ============================================================================
SELECT 
  id as app_uuid,
  app_code,
  app_name
FROM applications
WHERE app_code = 'VC_STUDIO'
ORDER BY created_at DESC
LIMIT 1;

-- Note: Replace 'VC_STUDIO_APP_UUID' below with the actual UUID from above query

-- ============================================================================
-- STEP 1: View all site_settings records and identify issues
-- ============================================================================
SELECT 
  id,
  app_uuid,
  site_code,
  site_name,
  is_active,
  is_active_app,
  created_at,
  updated_at,
  CASE 
    WHEN app_uuid = (SELECT id FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1) THEN '✓ Valid VC Studio'
    WHEN app_uuid IS NULL THEN '✗ Missing app_uuid'
    ELSE '✗ Wrong app_uuid: ' || app_uuid
  END as status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM applications WHERE id = site_settings.app_uuid
    ) THEN 'App exists'
    WHEN app_uuid IS NULL THEN 'No app_uuid'
    ELSE 'App NOT found'
  END as app_validation
FROM site_settings
ORDER BY updated_at DESC;

-- ============================================================================
-- STEP 2: Find duplicate app_uuid records (should only be one per app_uuid)
-- ============================================================================
SELECT 
  app_uuid,
  COUNT(*) as record_count,
  STRING_AGG(id::text, ', ') as record_ids,
  STRING_AGG(site_name, ' | ') as site_names,
  MAX(updated_at) as latest_update
FROM site_settings
WHERE app_uuid IS NOT NULL
GROUP BY app_uuid
HAVING COUNT(*) > 1
ORDER BY record_count DESC;

-- ============================================================================
-- STEP 3: Identify records with wrong app_uuid or missing app_uuid
-- ============================================================================
-- Replace 'VC_STUDIO_APP_UUID' with actual UUID from STEP 0
WITH vc_studio_uuid AS (
  SELECT id FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1
)
SELECT 
  ss.id,
  ss.app_uuid,
  ss.site_code,
  ss.site_name,
  ss.is_active,
  ss.is_active_app,
  ss.created_at,
  ss.updated_at,
  CASE 
    WHEN ss.app_uuid IS NULL THEN 'Missing app_uuid'
    WHEN ss.app_uuid != (SELECT id FROM vc_studio_uuid) THEN 'Wrong app_uuid'
    WHEN ss.app_uuid = (SELECT id FROM vc_studio_uuid) AND ss.is_active = false THEN 'VC Studio but inactive'
    ELSE 'Valid'
  END as issue
FROM site_settings ss
CROSS JOIN vc_studio_uuid
WHERE ss.app_uuid IS NULL 
   OR ss.app_uuid != (SELECT id FROM vc_studio_uuid)
   OR (ss.app_uuid = (SELECT id FROM vc_studio_uuid) AND ss.is_active = false)
ORDER BY ss.updated_at DESC;

-- ============================================================================
-- STEP 4: Check for VC Studio records - should have exactly one active record
-- ============================================================================
WITH vc_studio_uuid AS (
  SELECT id FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1
)
SELECT 
  ss.id,
  ss.app_uuid,
  ss.site_code,
  ss.site_name,
  ss.is_active,
  ss.is_active_app,
  ss.primary_color,
  ss.secondary_color,
  ss.created_at,
  ss.updated_at
FROM site_settings ss
CROSS JOIN vc_studio_uuid
WHERE ss.app_uuid = (SELECT id FROM vc_studio_uuid)
ORDER BY 
  ss.is_active DESC,  -- Active records first
  ss.updated_at DESC;  -- Most recent first

-- ============================================================================
-- STEP 5: Clean up - Delete invalid records
-- ============================================================================

-- Option A: Delete records with wrong app_uuid (not VC Studio and app doesn't exist)
DELETE FROM site_settings
WHERE app_uuid IS NOT NULL
  AND app_uuid != (SELECT id FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM applications WHERE id = site_settings.app_uuid
  );

-- Option B: Delete records with NULL app_uuid
DELETE FROM site_settings
WHERE app_uuid IS NULL;

-- Option C: Ensure only one active VC Studio record
-- First, get the VC Studio app_uuid
WITH vc_studio_uuid AS (
  SELECT id FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1
),
-- Deactivate all VC Studio records
deactivate_all AS (
  UPDATE site_settings
  SET 
    is_active = false,
    is_active_app = false,
    updated_at = NOW()
  WHERE app_uuid = (SELECT id FROM vc_studio_uuid)
  RETURNING id
)
-- Then activate only the most recent one
UPDATE site_settings
SET 
  is_active = true,
  is_active_app = true,
  site_code = 'VC_STUDIO',
  domain_code = 'BDA',
  updated_at = NOW()
WHERE app_uuid = (SELECT id FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1)
  AND id = (
    SELECT id 
    FROM site_settings
    WHERE app_uuid = (SELECT id FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1)
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 1
  );

-- Option D: Delete all inactive VC Studio duplicates (keep only the active one)
WITH vc_studio_uuid AS (
  SELECT id FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1
),
active_record AS (
  SELECT id 
  FROM site_settings
  WHERE app_uuid = (SELECT id FROM vc_studio_uuid)
  AND is_active = true
  ORDER BY updated_at DESC
  LIMIT 1
)
DELETE FROM site_settings
WHERE app_uuid = (SELECT id FROM vc_studio_uuid)
  AND is_active = false
  AND id NOT IN (SELECT id FROM active_record);

-- ============================================================================
-- STEP 6: Verify final state - should have exactly one active VC Studio record
-- ============================================================================
WITH vc_studio_uuid AS (
  SELECT id FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1
)
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN app_uuid = (SELECT id FROM vc_studio_uuid) THEN 1 END) as vc_studio_records,
  COUNT(CASE WHEN app_uuid = (SELECT id FROM vc_studio_uuid) AND is_active = true THEN 1 END) as active_vc_studio_records,
  COUNT(CASE WHEN app_uuid IS NULL THEN 1 END) as null_app_uuid,
  COUNT(CASE WHEN app_uuid != (SELECT id FROM vc_studio_uuid) AND app_uuid IS NOT NULL THEN 1 END) as other_app_records
FROM site_settings
CROSS JOIN vc_studio_uuid;

-- Show final list
WITH vc_studio_uuid AS (
  SELECT id FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1
)
SELECT 
  ss.id,
  ss.app_uuid,
  ss.site_code,
  ss.site_name,
  ss.is_active,
  ss.is_active_app,
  ss.primary_color,
  ss.secondary_color,
  ss.updated_at,
  CASE 
    WHEN ss.app_uuid = (SELECT id FROM vc_studio_uuid) AND ss.is_active = true THEN '✓ Active VC Studio'
    WHEN ss.app_uuid = (SELECT id FROM vc_studio_uuid) AND ss.is_active = false THEN '⚠ Inactive VC Studio'
    ELSE '✗ Invalid'
  END as status
FROM site_settings ss
CROSS JOIN vc_studio_uuid
ORDER BY 
  CASE 
    WHEN ss.app_uuid = (SELECT id FROM vc_studio_uuid) AND ss.is_active = true THEN 1
    WHEN ss.app_uuid = (SELECT id FROM vc_studio_uuid) THEN 2
    ELSE 3
  END,
  ss.updated_at DESC;


























