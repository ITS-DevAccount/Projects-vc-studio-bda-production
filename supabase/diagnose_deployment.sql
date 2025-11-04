-- Deployment Diagnostic Query
-- Run this in Supabase SQL Editor to diagnose what's missing
-- Copy and paste the entire script

-- =============================================================================
-- 1. CHECK WHICH TABLES EXIST
-- =============================================================================
SELECT '=== TABLES CHECK ===' as section;

SELECT
  CASE
    WHEN table_name IN ('users', 'enquiries', 'blog_posts', 'page_settings', 'page_images', 'site_settings')
    THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'enquiries', 'blog_posts', 'page_settings', 'page_images', 'site_settings')
ORDER BY table_name;

-- =============================================================================
-- 2. CHECK RLS POLICIES
-- =============================================================================
SELECT '=== RLS POLICIES CHECK ===' as section;

SELECT
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'enquiries', 'blog_posts', 'page_settings', 'page_images', 'site_settings')
GROUP BY tablename
ORDER BY tablename;

-- =============================================================================
-- 3. CHECK DATA COUNTS
-- =============================================================================
SELECT '=== DATA COUNTS ===' as section;

-- Check users
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
-- Check enquiries
SELECT 'enquiries' as table_name, COUNT(*) as record_count FROM enquiries
UNION ALL
-- Check blog_posts
SELECT 'blog_posts' as table_name, COUNT(*) as record_count FROM blog_posts
UNION ALL
-- Check page_settings
SELECT 'page_settings' as table_name, COUNT(*) as record_count FROM page_settings
UNION ALL
-- Check page_images
SELECT 'page_images' as table_name, COUNT(*) as record_count FROM page_images
UNION ALL
-- Check site_settings
SELECT 'site_settings' as table_name, COUNT(*) as record_count FROM site_settings
ORDER BY table_name;

-- =============================================================================
-- 4. CHECK SPECIFIC CRITICAL DATA
-- =============================================================================
SELECT '=== CRITICAL DATA CHECK ===' as section;

-- Check if home page exists and is published
SELECT
  'page_settings (home)' as item,
  CASE
    WHEN COUNT(*) = 0 THEN '✗ MISSING - Run fix_page_settings_access.sql'
    WHEN COUNT(*) FILTER (WHERE is_published = true) = 0 THEN '⚠ EXISTS BUT NOT PUBLISHED'
    ELSE '✓ OK'
  END as status,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE is_published = true) as published_records
FROM page_settings
WHERE page_name = 'home';

-- Check if any users exist
SELECT
  'users' as item,
  CASE
    WHEN COUNT(*) = 0 THEN '✗ NO USERS - Create user via Supabase Auth'
    ELSE '✓ OK'
  END as status,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE role = 'admin') as admin_users
FROM users;

-- =============================================================================
-- 5. CHECK AUTH USERS
-- =============================================================================
SELECT '=== AUTH USERS CHECK ===' as section;

-- Check if auth.users exist
SELECT
  'auth.users' as item,
  COUNT(*) as auth_user_count,
  CASE
    WHEN COUNT(*) = 0 THEN '✗ NO AUTH USERS - Sign up through /auth/login'
    ELSE '✓ OK'
  END as status
FROM auth.users;

-- =============================================================================
-- 6. RECOMMENDATIONS
-- =============================================================================
SELECT '=== RECOMMENDATIONS ===' as section;

-- Provide specific recommendations based on findings
SELECT
  1 as priority,
  'CRITICAL' as severity,
  'Run create_page_editor_tables.sql migration' as action,
  'page_settings and page_images tables missing' as reason
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'page_settings'
)

UNION ALL

SELECT
  2 as priority,
  'CRITICAL' as severity,
  'Run fix_page_settings_access.sql script' as action,
  'Home page data missing or RLS policies not configured' as reason
WHERE NOT EXISTS (
  SELECT 1 FROM page_settings WHERE page_name = 'home' AND is_published = true
)

UNION ALL

SELECT
  3 as priority,
  'IMPORTANT' as severity,
  'Create admin user via Supabase Dashboard → Authentication' as action,
  'No users exist in database' as reason
WHERE NOT EXISTS (SELECT 1 FROM users)

UNION ALL

SELECT
  4 as priority,
  'IMPORTANT' as severity,
  'Run fix_rls_policies.sql migration' as action,
  'Users table has no RLS policies' as reason
WHERE NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users'
)

UNION ALL

SELECT
  5 as priority,
  'INFO' as severity,
  'All critical setup complete!' as action,
  'Database is properly configured' as reason
WHERE
  EXISTS (SELECT 1 FROM page_settings WHERE page_name = 'home' AND is_published = true)
  AND EXISTS (SELECT 1 FROM users)
  AND EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'page_settings')

ORDER BY priority;
