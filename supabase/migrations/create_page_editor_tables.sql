-- Create page_settings and page_images tables for front page editor
-- Run this in Supabase SQL Editor

-- =============================================================================
-- PAGE_SETTINGS TABLE - Stores page content configuration
-- =============================================================================

CREATE TABLE IF NOT EXISTS page_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_name VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'home', 'about', 'contact'

  -- Hero Section
  hero_video_url TEXT, -- Cloudinary video URL
  hero_video_public_id TEXT, -- Cloudinary public ID for video
  hero_title TEXT NOT NULL DEFAULT 'Value Chain Studio',
  hero_subtitle TEXT NOT NULL DEFAULT 'Systematic business transformation through Value Chain Excellence Framework',
  hero_description TEXT,
  hero_cta_primary_text VARCHAR(50) DEFAULT 'Get Started',
  hero_cta_secondary_text VARCHAR(50) DEFAULT 'Learn More',

  -- Info Section
  info_section_title TEXT DEFAULT 'What is VC Studio?',
  info_section_subtitle TEXT,
  info_block_1_title VARCHAR(200),
  info_block_1_content TEXT,
  info_block_2_title VARCHAR(200),
  info_block_2_content TEXT,
  info_highlight_text TEXT,

  -- Gallery Section
  gallery_section_title TEXT DEFAULT 'Our Work in Action',
  gallery_section_subtitle TEXT,

  -- Meta
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create index for faster lookups
CREATE INDEX idx_page_settings_page_name ON page_settings(page_name);
CREATE INDEX idx_page_settings_is_published ON page_settings(is_published);

-- =============================================================================
-- PAGE_IMAGES TABLE - Stores gallery images for pages
-- =============================================================================

CREATE TABLE IF NOT EXISTS page_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_settings_id UUID NOT NULL REFERENCES page_settings(id) ON DELETE CASCADE,

  -- Image Details
  cloudinary_url TEXT NOT NULL, -- Base Cloudinary URL
  public_id TEXT NOT NULL, -- Cloudinary public ID
  alt_text TEXT NOT NULL,
  title TEXT,
  caption TEXT,

  -- Display Settings
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX idx_page_images_page_settings ON page_images(page_settings_id);
CREATE INDEX idx_page_images_display_order ON page_images(page_settings_id, display_order);
CREATE INDEX idx_page_images_is_active ON page_images(is_active);

-- =============================================================================
-- TRIGGER - Auto-update updated_at timestamp
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_page_settings_updated_at
  BEFORE UPDATE ON page_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_page_images_updated_at
  BEFORE UPDATE ON page_images
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE page_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_images ENABLE ROW LEVEL SECURITY;

-- page_settings policies
-- Public can read published pages
CREATE POLICY "Enable read for all users" ON page_settings
FOR SELECT TO anon, authenticated
USING (is_published = true);

-- Authenticated users can read all pages (for editing)
CREATE POLICY "Enable read all for authenticated users" ON page_settings
FOR SELECT TO authenticated
USING (true);

-- Only authenticated users can insert
CREATE POLICY "Enable insert for authenticated users" ON page_settings
FOR INSERT TO authenticated
WITH CHECK (true);

-- Only authenticated users can update
CREATE POLICY "Enable update for authenticated users" ON page_settings
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Only authenticated users can delete
CREATE POLICY "Enable delete for authenticated users" ON page_settings
FOR DELETE TO authenticated
USING (true);

-- page_images policies
-- Public can read active images from published pages
CREATE POLICY "Enable read for all users" ON page_images
FOR SELECT TO anon, authenticated
USING (
  is_active = true AND
  EXISTS (
    SELECT 1 FROM page_settings
    WHERE page_settings.id = page_images.page_settings_id
    AND page_settings.is_published = true
  )
);

-- Authenticated users can read all images
CREATE POLICY "Enable read all for authenticated users" ON page_images
FOR SELECT TO authenticated
USING (true);

-- Only authenticated users can insert
CREATE POLICY "Enable insert for authenticated users" ON page_images
FOR INSERT TO authenticated
WITH CHECK (true);

-- Only authenticated users can update
CREATE POLICY "Enable update for authenticated users" ON page_images
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Only authenticated users can delete
CREATE POLICY "Enable delete for authenticated users" ON page_images
FOR DELETE TO authenticated
USING (true);

-- =============================================================================
-- SEED DATA - Insert default home page settings
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
) ON CONFLICT (page_name) DO NOTHING;

-- Insert default gallery images
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
ON CONFLICT DO NOTHING;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check tables exist
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('page_settings', 'page_images');

-- Check data
SELECT * FROM page_settings WHERE page_name = 'home';
SELECT * FROM page_images ORDER BY display_order;
