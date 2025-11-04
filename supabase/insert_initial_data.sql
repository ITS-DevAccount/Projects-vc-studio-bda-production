-- Insert initial data for deployment
-- Safe to run multiple times - will only insert if data doesn't exist
-- Run this in Supabase SQL Editor

-- =============================================================================
-- Insert home page data if it doesn't exist
-- =============================================================================

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
-- Verify the data was inserted
-- =============================================================================

SELECT
  'Home page data:' as info,
  page_name,
  hero_title,
  hero_video_public_id,
  is_published
FROM page_settings
WHERE page_name = 'home';

-- =============================================================================
-- Check what data you currently have
-- =============================================================================

SELECT
  'All page_settings:' as info,
  page_name,
  is_published,
  created_at
FROM page_settings
ORDER BY created_at DESC;
