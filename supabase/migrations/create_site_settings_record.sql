-- Create or update site_settings record with app_uuid
-- Run this in Supabase SQL Editor to set up the app context

-- =============================================================================
-- CREATE SITE_SETTINGS RECORD
-- =============================================================================

-- Check if site_settings table exists, if not create it
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_uuid UUID DEFAULT gen_random_uuid(), -- Use id as app_uuid if not set
  site_code TEXT DEFAULT 'VC_STUDIO',
  domain_code TEXT DEFAULT 'BDA',
  site_name TEXT DEFAULT 'VC Studio',
  is_active BOOLEAN DEFAULT true,
  is_active_app BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert or update the site settings record
-- Use ON CONFLICT to update if exists, or insert if not
INSERT INTO site_settings (
  app_uuid,
  site_code,
  domain_code,
  site_name,
  is_active,
  is_active_app
)
VALUES (
  gen_random_uuid(), -- Generate a new UUID for app_uuid
  COALESCE(NULLIF(current_setting('app.site_code', true), ''), 'VC_STUDIO'),
  'BDA',
  'VC Studio',
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  app_uuid = COALESCE(site_settings.app_uuid, gen_random_uuid()),
  site_code = COALESCE(EXCLUDED.site_code, site_settings.site_code),
  domain_code = COALESCE(EXCLUDED.domain_code, site_settings.domain_code),
  site_name = COALESCE(EXCLUDED.site_name, site_settings.site_name),
  is_active = true,
  is_active_app = true,
  updated_at = NOW();

-- If no record exists, insert one with a generated UUID
-- First, try to get or create a record
DO $$
DECLARE
  existing_id UUID;
  new_app_uuid UUID := gen_random_uuid();
BEGIN
  -- Try to get existing active record
  SELECT id INTO existing_id
  FROM site_settings
  WHERE is_active = true
  LIMIT 1;

  -- If no record exists, create one
  IF existing_id IS NULL THEN
    INSERT INTO site_settings (
      app_uuid,
      site_code,
      domain_code,
      site_name,
      is_active,
      is_active_app
    )
    VALUES (
      new_app_uuid,
      'VC_STUDIO',
      'BDA',
      'VC Studio',
      true,
      true
    );
    
    RAISE NOTICE 'Created new site_settings record with app_uuid: %', new_app_uuid;
  ELSE
    -- Update existing record to ensure app_uuid is set
    UPDATE site_settings
    SET 
      app_uuid = COALESCE(app_uuid, gen_random_uuid()),
      is_active = true,
      is_active_app = true,
      updated_at = NOW()
    WHERE id = existing_id;
    
    RAISE NOTICE 'Updated existing site_settings record with id: %', existing_id;
  END IF;
END $$;

-- =============================================================================
-- CREATE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_site_settings_is_active ON site_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_site_settings_app_uuid ON site_settings(app_uuid);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Show the current site_settings record
SELECT 
  id,
  app_uuid,
  site_code,
  domain_code,
  site_name,
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





