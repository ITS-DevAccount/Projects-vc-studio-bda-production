-- Restore default page_settings data
-- Run this in Supabase SQL Editor if page_settings were accidentally deleted

-- =============================================================================
-- RESTORE PAGE_SETTINGS DATA
-- =============================================================================

-- Insert default home page settings (only if it doesn't exist)
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
) VALUES (
  'home',
  'https://res.cloudinary.com/demo/video/upload',
  'dog',
  'Value Chain Studio',
  'Systematic business transformation through Value Chain Excellence Framework',
  'Map your business value creation, connect stakeholders, and deploy AI-enabled operations with proven methodology',
  'Get Started',
  'Learn More',
  'What is VC Studio?',
  'VCEF Methodology',
  'Value Chain Evolution Framework provides a systematic L0-L6 mapping of your business. Understand how value flows through your organisation from strategic vision to operational execution.',
  'AI-Powered Intelligence',
  'Knowledge Domain Architecture transforms business intelligence into actionable AI-enhanced operations. Deploy agents where they create measurable value while preserving human expertise.',
  'Stage 1 Focus: Build your Value Chain Model by mapping domains, sub-domains, and stakeholders within a unified knowledge infrastructure.',
  'Our Work in Action',
  'Showcasing value chain transformations and implementations',
  true
) ON CONFLICT (page_name) DO UPDATE SET
  hero_video_url = EXCLUDED.hero_video_url,
  hero_video_public_id = EXCLUDED.hero_video_public_id,
  hero_title = EXCLUDED.hero_title,
  hero_subtitle = EXCLUDED.hero_subtitle,
  hero_description = EXCLUDED.hero_description,
  hero_cta_primary_text = EXCLUDED.hero_cta_primary_text,
  hero_cta_secondary_text = EXCLUDED.hero_cta_secondary_text,
  info_section_title = EXCLUDED.info_section_title,
  info_block_1_title = EXCLUDED.info_block_1_title,
  info_block_1_content = EXCLUDED.info_block_1_content,
  info_block_2_title = EXCLUDED.info_block_2_title,
  info_block_2_content = EXCLUDED.info_block_2_content,
  info_highlight_text = EXCLUDED.info_highlight_text,
  gallery_section_title = EXCLUDED.gallery_section_title,
  gallery_section_subtitle = EXCLUDED.gallery_section_subtitle,
  is_published = EXCLUDED.is_published,
  updated_at = NOW();

-- =============================================================================
-- RESTORE DEFAULT GALLERY IMAGES
-- =============================================================================

-- Insert default gallery images (only if they don't exist)
INSERT INTO page_images (
  page_settings_id,
  cloudinary_url,
  public_id,
  alt_text,
  title,
  caption,
  display_order,
  is_active
)
SELECT
  ps.id,
  'https://res.cloudinary.com/demo/image/upload',
  unnest(ARRAY['sample', 'coffee', 'bike', 'woman', 'shoes', 'basketball']),
  unnest(ARRAY[
    'Value Chain Mapping Process',
    'Stakeholder Integration Framework',
    'AI-Enabled Operations Deployment',
    'Business Transformation Dashboard',
    'Enterprise Knowledge Architecture',
    'Process Excellence Framework'
  ]),
  unnest(ARRAY[
    'Value Chain Mapping',
    'Stakeholder Integration',
    'AI Operations',
    'Transformation Analytics',
    'Knowledge Architecture',
    'Process Excellence'
  ]),
  unnest(ARRAY[
    'Systematic domain and sub-domain identification',
    'Connecting people, processes, and technology',
    'Intelligent automation at the right touch points',
    'Real-time insights and performance tracking',
    'Structured information flow and accessibility',
    'L0-L6 mapping for operational clarity'
  ]),
  unnest(ARRAY[1, 2, 3, 4, 5, 6]),
  true
FROM page_settings ps
WHERE ps.page_name = 'home'
  AND NOT EXISTS (
    SELECT 1 FROM page_images 
    WHERE page_settings_id = ps.id 
    AND public_id IN ('sample', 'coffee', 'bike', 'woman', 'shoes', 'basketball')
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check that page_settings exists
SELECT * FROM page_settings WHERE page_name = 'home';

-- Check that images exist
SELECT COUNT(*) as image_count FROM page_images;

-- List all page_settings
SELECT page_name, is_published, created_at, updated_at FROM page_settings;





