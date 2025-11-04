-- Check if page_settings table exists and has data
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check if table exists and view structure
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'page_settings'
ORDER BY ordinal_position;

-- 2. Check RLS status
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'page_settings';

-- 3. View all policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'page_settings';

-- 4. Check if any data exists
SELECT
  id,
  page_name,
  hero_video_url,
  hero_video_public_id,
  hero_title,
  is_published,
  created_at
FROM page_settings
ORDER BY created_at DESC;

-- 5. Count records
SELECT
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE is_published = true) as published_records,
  COUNT(*) FILTER (WHERE page_name = 'home') as home_records
FROM page_settings;
