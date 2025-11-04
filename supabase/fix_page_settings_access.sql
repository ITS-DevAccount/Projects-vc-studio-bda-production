-- Fix page_settings table access for existing table
-- This script is safe to run on an existing table
-- Run this in Supabase SQL Editor

-- =============================================================================
-- STEP 1: Ensure RLS policies allow anonymous read access to published pages
-- =============================================================================

-- Drop existing policies if they exist (safe - will only drop if exists)
DROP POLICY IF EXISTS "page_settings_select_published" ON page_settings;
DROP POLICY IF EXISTS "page_settings_select_all_auth" ON page_settings;
DROP POLICY IF EXISTS "page_settings_insert_auth" ON page_settings;
DROP POLICY IF EXISTS "page_settings_update_auth" ON page_settings;
DROP POLICY IF EXISTS "page_settings_delete_auth" ON page_settings;

-- Enable RLS if not already enabled
ALTER TABLE page_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous users to read published pages
CREATE POLICY "page_settings_select_published" ON page_settings
FOR SELECT TO anon, authenticated
USING (is_published = true);

-- Allow authenticated users to read all pages
CREATE POLICY "page_settings_select_all_auth" ON page_settings
FOR SELECT TO authenticated
USING (true);

-- Allow authenticated users to insert/update/delete
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
-- STEP 2: Insert home page data if it doesn't exist
-- =============================================================================

-- Insert home page record (only if it doesn't exist)
INSERT INTO page_settings (
  page_name,
  hero_video_url,
  hero_video_public_id,
  hero_title,
  hero_subtitle,
  hero_description,
  hero_cta_primary_text,
  hero_cta_secondary_text,
  info_section_title,
  info_block_1_title,
  info_block_1_content,
  info_block_2_title,
  info_block_2_content,
  info_highlight_text,
  gallery_section_title,
  gallery_section_subtitle,
  is_published
)
SELECT
  'home',
  'https://res.cloudinary.com/demo/video/upload',
  'sea-turtle',
  'Value Chain Studio',
  'Systematic business transformation through Value Chain Excellence Framework',
  'Transform your business with our proven methodology',
  'Get Started',
  'Learn More',
  'What is VC Studio?',
  'VCEF Methodology',
  'Value Chain Evolution Framework provides a systematic L0-L6 mapping of your business. Understand how value flows through your organisation from strategic vision to operational execution.',
  'AI-Powered Intelligence',
  'Knowledge Domain Architecture transforms business intelligence into actionable AI-enhanced operations. Deploy agents where they create measurable value while preserving human expertise.',
  'Establishing comprehensive L0-L6 mapping and building foundational knowledge architecture.',
  'Our Work in Action',
  'Showcasing value chain transformations and implementations',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM page_settings WHERE page_name = 'home'
);

-- =============================================================================
-- STEP 3: Verification - Check what we have
-- =============================================================================

SELECT
  page_name,
  hero_video_url,
  hero_video_public_id,
  hero_title,
  is_published,
  created_at
FROM page_settings
WHERE page_name = 'home';
