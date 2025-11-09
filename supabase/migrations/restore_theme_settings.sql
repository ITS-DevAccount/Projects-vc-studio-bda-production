-- Restore theme/branding settings in site_settings table
-- This preserves existing theme colors and adds app_uuid if missing
-- Run this in Supabase SQL Editor

-- =============================================================================
-- RESTORE THEME SETTINGS WITH APP_UUID
-- =============================================================================

-- First, ensure the table has all required columns (including app_uuid if it was added)
DO $$
BEGIN
  -- Add app_uuid column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'site_settings' 
    AND column_name = 'app_uuid'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN app_uuid UUID;
  END IF;

  -- Add site_code and domain_code if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'site_settings' 
    AND column_name = 'site_code'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN site_code TEXT DEFAULT 'VC_STUDIO';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'site_settings' 
    AND column_name = 'domain_code'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN domain_code TEXT DEFAULT 'BDA';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'site_settings' 
    AND column_name = 'is_active_app'
  ) THEN
    ALTER TABLE site_settings ADD COLUMN is_active_app BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Insert or update default theme settings
-- This uses ON CONFLICT to update existing record or insert new one
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
  font_heading,
  font_body,
  border_radius,
  is_active,
  app_uuid,
  site_code,
  domain_code,
  is_active_app
)
VALUES (
  'VC Studio',
  'Systematic business transformation through Value Chain Excellence Framework',
  'https://res.cloudinary.com/demo/image/upload',
  'logo',
  180,
  60,
  '#2563eb', -- primary_color (blue)
  '#1d4ed8', -- primary_hover
  '#7c3aed', -- secondary_color (purple)
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
  '#10b981', -- success_color (green)
  '#ef4444', -- error_color (red)
  '#f59e0b', -- warning_color (orange)
  '#3b82f6', -- info_color (blue)
  'Inter, system-ui, sans-serif', -- font_heading
  'Inter, system-ui, sans-serif', -- font_body
  '0.5rem', -- border_radius
  true, -- is_active
  gen_random_uuid(), -- app_uuid (generate new UUID)
  'VC_STUDIO', -- site_code
  'BDA', -- domain_code
  true -- is_active_app
)
ON CONFLICT (id) DO UPDATE SET
  -- Only update theme colors if they're NULL or missing
  primary_color = COALESCE(site_settings.primary_color, EXCLUDED.primary_color),
  primary_hover = COALESCE(site_settings.primary_hover, EXCLUDED.primary_hover),
  secondary_color = COALESCE(site_settings.secondary_color, EXCLUDED.secondary_color),
  secondary_hover = COALESCE(site_settings.secondary_hover, EXCLUDED.secondary_hover),
  background_color = COALESCE(site_settings.background_color, EXCLUDED.background_color),
  background_subtle = COALESCE(site_settings.background_subtle, EXCLUDED.background_subtle),
  section_light = COALESCE(site_settings.section_light, EXCLUDED.section_light),
  section_subtle = COALESCE(site_settings.section_subtle, EXCLUDED.section_subtle),
  section_emphasis = COALESCE(site_settings.section_emphasis, EXCLUDED.section_emphasis),
  section_border = COALESCE(site_settings.section_border, EXCLUDED.section_border),
  text_primary = COALESCE(site_settings.text_primary, EXCLUDED.text_primary),
  text_secondary = COALESCE(site_settings.text_secondary, EXCLUDED.text_secondary),
  text_muted = COALESCE(site_settings.text_muted, EXCLUDED.text_muted),
  text_light = COALESCE(site_settings.text_light, EXCLUDED.text_light),
  success_color = COALESCE(site_settings.success_color, EXCLUDED.success_color),
  error_color = COALESCE(site_settings.error_color, EXCLUDED.error_color),
  warning_color = COALESCE(site_settings.warning_color, EXCLUDED.warning_color),
  info_color = COALESCE(site_settings.info_color, EXCLUDED.info_color),
  -- Always update app_uuid if it's NULL
  app_uuid = COALESCE(site_settings.app_uuid, gen_random_uuid()),
  -- Update new fields
  site_code = COALESCE(site_settings.site_code, EXCLUDED.site_code),
  domain_code = COALESCE(site_settings.domain_code, EXCLUDED.domain_code),
  is_active_app = COALESCE(site_settings.is_active_app, EXCLUDED.is_active_app),
  is_active = true,
  updated_at = NOW();

-- If no active record exists, create one with default theme
DO $$
DECLARE
  existing_id UUID;
  new_app_uuid UUID := gen_random_uuid();
BEGIN
  SELECT id INTO existing_id
  FROM site_settings
  WHERE is_active = true
  LIMIT 1;

  IF existing_id IS NULL THEN
    INSERT INTO site_settings (
      site_name,
      site_tagline,
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
      is_active,
      app_uuid,
      site_code,
      domain_code,
      is_active_app
    )
    VALUES (
      'VC Studio',
      'Systematic business transformation through Value Chain Excellence Framework',
      '#2563eb', '#1d4ed8', '#7c3aed', '#6d28d9',
      '#ffffff', '#f9fafb', '#f3f4f6', '#e5e7eb', '#1f2937', '#d1d5db',
      '#111827', '#4b5563', '#6b7280', '#9ca3af',
      '#10b981', '#ef4444', '#f59e0b', '#3b82f6',
      true,
      new_app_uuid,
      'VC_STUDIO',
      'BDA',
      true
    );
    
    RAISE NOTICE 'Created new site_settings record with app_uuid: %', new_app_uuid;
  ELSE
    -- Ensure app_uuid is set on existing record
    UPDATE site_settings
    SET 
      app_uuid = COALESCE(app_uuid, gen_random_uuid()),
      site_code = COALESCE(site_code, 'VC_STUDIO'),
      domain_code = COALESCE(domain_code, 'BDA'),
      is_active_app = COALESCE(is_active_app, true),
      updated_at = NOW()
    WHERE id = existing_id;
    
    RAISE NOTICE 'Updated existing site_settings record with id: %', existing_id;
  END IF;
END $$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Show current active site settings
SELECT 
  id,
  app_uuid,
  site_name,
  site_code,
  domain_code,
  primary_color,
  secondary_color,
  background_color,
  text_primary,
  is_active,
  is_active_app,
  created_at,
  updated_at
FROM site_settings
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 1;

-- Count total records
SELECT COUNT(*) as total_site_settings FROM site_settings;





