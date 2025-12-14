-- ============================================================================
-- DIAGNOSTIC: Check which app_uuid VC Studio should be using
-- ============================================================================

-- STEP 1: Check what VC Studio's app_code should resolve to
SELECT 
  id as app_uuid,
  app_code,
  app_name,
  is_active
FROM applications
WHERE app_code = 'VC_STUDIO'
ORDER BY created_at DESC;

-- STEP 2: Check what BuildBid's app_code resolves to
SELECT 
  id as app_uuid,
  app_code,
  app_name,
  is_active
FROM applications
WHERE app_code = 'BUILDBID'
ORDER BY created_at DESC;

-- STEP 3: Check if there are multiple VC_STUDIO records (should only be one)
SELECT 
  COUNT(*) as vc_studio_count
FROM applications
WHERE app_code = 'VC_STUDIO';

-- STEP 4: Check which page_settings each app should see
SELECT 
  a.app_code,
  a.id as app_uuid,
  ps.id as page_settings_id,
  ps.hero_title,
  ps.is_published,
  COUNT(pi.id) as image_count
FROM applications a
LEFT JOIN page_settings ps ON ps.app_uuid = a.id AND ps.page_name = 'home' AND ps.is_published = true
LEFT JOIN page_images pi ON pi.page_settings_id = ps.id AND pi.is_active = true
WHERE a.app_code IN ('VC_STUDIO', 'BUILDBID')
GROUP BY a.app_code, a.id, ps.id, ps.hero_title, ps.is_published
ORDER BY a.app_code;

-- STEP 5: Check if VC Studio's page_settings has the correct app_uuid
SELECT 
  ps.id,
  ps.page_name,
  ps.app_uuid,
  ps.hero_title,
  a.app_code,
  a.app_name,
  CASE 
    WHEN ps.app_uuid = '15f9ef84-4fa4-4421-a37b-6185501fb62d' THEN '✓ CORRECT (VC Studio)'
    WHEN ps.app_uuid = 'cca44f46-d406-4235-8384-4bfa16d3dbbb' THEN '✗ WRONG (BuildBid)'
    ELSE '? UNKNOWN'
  END as status
FROM page_settings ps
LEFT JOIN applications a ON ps.app_uuid = a.id
WHERE ps.page_name = 'home'
AND ps.is_published = true
ORDER BY ps.updated_at DESC;



