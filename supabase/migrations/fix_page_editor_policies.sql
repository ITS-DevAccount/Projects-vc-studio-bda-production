-- Fix potential RLS policy conflicts for page editor tables
-- Run this if you get permission errors when saving

-- =============================================================================
-- DROP AND RECREATE POLICIES FOR page_settings
-- =============================================================================

-- Drop all existing policies for page_settings
DROP POLICY IF EXISTS "Enable read for all users" ON page_settings;
DROP POLICY IF EXISTS "Enable read all for authenticated users" ON page_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON page_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON page_settings;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON page_settings;

-- Recreate with unique names
CREATE POLICY "page_settings_select_published" ON page_settings
FOR SELECT TO anon, authenticated
USING (is_published = true);

CREATE POLICY "page_settings_select_all_auth" ON page_settings
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "page_settings_insert_auth" ON page_settings
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "page_settings_update_auth" ON page_settings
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "page_settings_delete_auth" ON page_settings
FOR DELETE TO authenticated
USING (true);

-- =============================================================================
-- DROP AND RECREATE POLICIES FOR page_images
-- =============================================================================

-- Drop all existing policies for page_images
DROP POLICY IF EXISTS "Enable read for all users" ON page_images;
DROP POLICY IF EXISTS "Enable read all for authenticated users" ON page_images;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON page_images;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON page_images;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON page_images;

-- Recreate with unique names
CREATE POLICY "page_images_select_published" ON page_images
FOR SELECT TO anon, authenticated
USING (
  is_active = true AND
  EXISTS (
    SELECT 1 FROM page_settings
    WHERE page_settings.id = page_images.page_settings_id
    AND page_settings.is_published = true
  )
);

CREATE POLICY "page_images_select_all_auth" ON page_images
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "page_images_insert_auth" ON page_images
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "page_images_update_auth" ON page_images
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "page_images_delete_auth" ON page_images
FOR DELETE TO authenticated
USING (true);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- List all policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('page_settings', 'page_images')
ORDER BY tablename, policyname;
