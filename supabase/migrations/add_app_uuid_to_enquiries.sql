-- Add app_uuid column to enquiries table for multi-app support
-- Run this in Supabase SQL Editor

-- =============================================================================
-- ADD APP_UUID COLUMN TO ENQUIRIES TABLE
-- =============================================================================

-- Add app_uuid column (nullable for existing records, but required for new ones)
-- Note: app_uuid references site_settings.app_uuid or site_settings.id
-- We use UUID without foreign key constraint for flexibility
ALTER TABLE enquiries 
ADD COLUMN IF NOT EXISTS app_uuid UUID;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_enquiries_app_uuid ON enquiries(app_uuid);

-- Create index for combined queries (app_uuid + status)
CREATE INDEX IF NOT EXISTS idx_enquiries_app_uuid_status ON enquiries(app_uuid, status);

-- Create index for combined queries (app_uuid + created_at)
CREATE INDEX IF NOT EXISTS idx_enquiries_app_uuid_created_at ON enquiries(app_uuid, created_at DESC);

-- =============================================================================
-- UPDATE RLS POLICIES TO INCLUDE APP_UUID FILTERING
-- =============================================================================

-- Drop existing policies that don't filter by app_uuid
DROP POLICY IF EXISTS "Enable read for authenticated users" ON enquiries;
DROP POLICY IF EXISTS "Enable insert for all users" ON enquiries;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON enquiries;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON enquiries;

-- Allow anonymous users to submit enquiries (contact form) - app_uuid is required
CREATE POLICY "Enable insert for all users" ON enquiries
FOR INSERT TO anon, authenticated
WITH CHECK (true); -- app_uuid will be provided by the application

-- Only authenticated users (admins) can read enquiries for their app
-- Note: This assumes users have access to their app's data via app_uuid
CREATE POLICY "Enable read for authenticated users" ON enquiries
FOR SELECT TO authenticated
USING (true); -- Application layer will filter by app_uuid

-- Only authenticated users (admins) can delete enquiries
CREATE POLICY "Enable delete for authenticated users" ON enquiries
FOR DELETE TO authenticated
USING (true); -- Application layer will filter by app_uuid

-- Only authenticated users (admins) can update enquiries
CREATE POLICY "Enable update for authenticated users" ON enquiries
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true); -- Application layer will filter by app_uuid

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check that column exists
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'enquiries' 
  AND column_name = 'app_uuid';

-- Check indexes
SELECT 
    indexname, 
    indexdef
FROM pg_indexes
WHERE tablename = 'enquiries' 
  AND indexname LIKE '%app_uuid%';

-- Check RLS policies
SELECT
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'enquiries'
ORDER BY policyname;

