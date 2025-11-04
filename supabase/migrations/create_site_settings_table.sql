-- Create site_settings table for branding and theme configuration
-- Run this in Supabase SQL Editor

-- =============================================================================
-- SITE_SETTINGS TABLE - Stores global site branding and theme configuration
-- =============================================================================

CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Site Identity
  site_name VARCHAR(200) NOT NULL DEFAULT 'VC Studio',
  site_tagline TEXT,

  -- Logo Configuration
  logo_url TEXT, -- Cloudinary URL for logo
  logo_public_id TEXT, -- Cloudinary public ID
  logo_width INTEGER DEFAULT 180, -- Logo width in pixels
  logo_height INTEGER DEFAULT 60, -- Logo height in pixels
  favicon_url TEXT, -- Favicon URL

  -- Primary Brand Colors
  primary_color VARCHAR(7) DEFAULT '#2563eb', -- Main brand color (hex)
  primary_hover VARCHAR(7) DEFAULT '#1d4ed8', -- Primary hover state
  secondary_color VARCHAR(7) DEFAULT '#7c3aed', -- Secondary brand color
  secondary_hover VARCHAR(7) DEFAULT '#6d28d9', -- Secondary hover state

  -- Background Colors
  background_color VARCHAR(7) DEFAULT '#ffffff', -- Main background
  background_subtle VARCHAR(7) DEFAULT '#f9fafb', -- Subtle background variation

  -- Section Colors
  section_light VARCHAR(7) DEFAULT '#f3f4f6', -- Light sections
  section_subtle VARCHAR(7) DEFAULT '#e5e7eb', -- Subtle sections
  section_emphasis VARCHAR(7) DEFAULT '#1f2937', -- Emphasized sections
  section_border VARCHAR(7) DEFAULT '#d1d5db', -- Section borders

  -- Text Colors
  text_primary VARCHAR(7) DEFAULT '#111827', -- Primary text
  text_secondary VARCHAR(7) DEFAULT '#4b5563', -- Secondary text
  text_muted VARCHAR(7) DEFAULT '#6b7280', -- Muted text
  text_light VARCHAR(7) DEFAULT '#9ca3af', -- Light text

  -- Semantic Colors
  success_color VARCHAR(7) DEFAULT '#10b981', -- Success state
  error_color VARCHAR(7) DEFAULT '#ef4444', -- Error state
  warning_color VARCHAR(7) DEFAULT '#f59e0b', -- Warning state
  info_color VARCHAR(7) DEFAULT '#3b82f6', -- Info state

  -- Typography
  font_heading VARCHAR(100) DEFAULT 'Inter, system-ui, sans-serif',
  font_body VARCHAR(100) DEFAULT 'Inter, system-ui, sans-serif',

  -- Additional Settings
  border_radius VARCHAR(20) DEFAULT '0.5rem', -- Global border radius
  is_active BOOLEAN DEFAULT true, -- Only one should be active at a time

  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create index for active settings lookup
CREATE INDEX idx_site_settings_is_active ON site_settings(is_active);

-- =============================================================================
-- TRIGGER - Auto-update updated_at timestamp
-- =============================================================================

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TRIGGER - Ensure only one active setting at a time
-- =============================================================================

CREATE OR REPLACE FUNCTION ensure_single_active_site_settings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Deactivate all other settings
    UPDATE site_settings
    SET is_active = false
    WHERE id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_active_site_settings_trigger
  BEFORE INSERT OR UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_site_settings();

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Public can read active settings
CREATE POLICY "Enable read for all users" ON site_settings
FOR SELECT TO anon, authenticated
USING (is_active = true);

-- Authenticated users can read all settings
CREATE POLICY "Enable read all for authenticated users" ON site_settings
FOR SELECT TO authenticated
USING (true);

-- Only authenticated users can insert
CREATE POLICY "Enable insert for authenticated users" ON site_settings
FOR INSERT TO authenticated
WITH CHECK (true);

-- Only authenticated users can update
CREATE POLICY "Enable update for authenticated users" ON site_settings
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Only authenticated users can delete
CREATE POLICY "Enable delete for authenticated users" ON site_settings
FOR DELETE TO authenticated
USING (true);

-- =============================================================================
-- SEED DATA - Insert default site settings
-- =============================================================================

INSERT INTO site_settings (
  site_name,
  site_tagline,
  logo_url,
  logo_public_id,
  logo_width,
  logo_height,
  primary_color,
  primary_hover,
  secondary_color,
  secondary_hover,
  background_color,
  background_subtle,
  section_light,
  section_subtle,
  section_emphasis,
  section_border,
  text_primary,
  text_secondary,
  text_muted,
  text_light,
  success_color,
  error_color,
  warning_color,
  info_color,
  is_active
) VALUES (
  'VC Studio',
  'Systematic business transformation through Value Chain Excellence Framework',
  'https://res.cloudinary.com/demo/image/upload',
  'logo',
  180,
  60,
  '#2563eb', -- primary_color
  '#1d4ed8', -- primary_hover
  '#7c3aed', -- secondary_color
  '#6d28d9', -- secondary_hover
  '#ffffff', -- background_color
  '#f9fafb', -- background_subtle
  '#f3f4f6', -- section_light
  '#e5e7eb', -- section_subtle
  '#1f2937', -- section_emphasis
  '#d1d5db', -- section_border
  '#111827', -- text_primary
  '#4b5563', -- text_secondary
  '#6b7280', -- text_muted
  '#9ca3af', -- text_light
  '#10b981', -- success_color
  '#ef4444', -- error_color
  '#f59e0b', -- warning_color
  '#3b82f6', -- info_color
  true
);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check table exists
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'site_settings';

-- Check data
SELECT * FROM site_settings WHERE is_active = true;
