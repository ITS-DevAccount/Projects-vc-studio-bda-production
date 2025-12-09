-- Fix RLS policies for policies table
-- Allows public read access to active policies (privacy policy, terms of service)
-- Run this in Supabase SQL Editor

-- =============================================================================
-- POLICIES TABLE - Public read, authenticated write
-- =============================================================================

-- Enable RLS if not already enabled
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read for all users" ON policies;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON policies;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON policies;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON policies;

-- Allow everyone to read active policies (public access)
CREATE POLICY "Enable read for all users" ON policies
FOR SELECT TO anon, authenticated
USING (is_active = true);

-- Only authenticated users (admins) can insert policies
CREATE POLICY "Enable insert for authenticated users" ON policies
FOR INSERT TO authenticated
WITH CHECK (true);

-- Only authenticated users (admins) can update policies
CREATE POLICY "Enable update for authenticated users" ON policies
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Only authenticated users (admins) can delete policies
CREATE POLICY "Enable delete for authenticated users" ON policies
FOR DELETE TO authenticated
USING (true);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check that RLS is enabled
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'policies';

-- List all policies
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
WHERE schemaname = 'public'
  AND tablename = 'policies'
ORDER BY policyname;

