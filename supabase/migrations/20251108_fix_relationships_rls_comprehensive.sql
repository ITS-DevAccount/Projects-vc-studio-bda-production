-- Comprehensive fix for relationships RLS policies
-- Allows both authenticated users and the provision_stakeholder function to work

-- First, disable RLS temporarily to see current state
-- (We'll re-enable it with proper policies)

-- Drop ALL existing policies on relationships table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'relationships') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON relationships', r.policyname);
    END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to view all relationships
CREATE POLICY "authenticated_users_select_relationships"
  ON relationships
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: Allow authenticated users to insert relationships
CREATE POLICY "authenticated_users_insert_relationships"
  ON relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy 3: Allow anonymous users to insert relationships (for onboarding)
-- This is needed for the provision_stakeholder function when called during registration
CREATE POLICY "anon_users_insert_relationships"
  ON relationships
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy 4: Allow authenticated users to update relationships
CREATE POLICY "authenticated_users_update_relationships"
  ON relationships
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy 5: Allow authenticated users to delete relationships
CREATE POLICY "authenticated_users_delete_relationships"
  ON relationships
  FOR DELETE
  TO authenticated
  USING (true);

-- Also ensure stakeholders table allows authenticated users to insert
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'stakeholders' AND policyname LIKE '%insert%') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON stakeholders', r.policyname);
    END LOOP;
END $$;

-- Allow authenticated users to insert stakeholders
CREATE POLICY "authenticated_users_insert_stakeholders"
  ON stakeholders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow anonymous users to insert stakeholders (for onboarding)
CREATE POLICY "anon_users_insert_stakeholders"
  ON stakeholders
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Fix stakeholder_roles table policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'stakeholder_roles' AND policyname LIKE '%insert%') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON stakeholder_roles', r.policyname);
    END LOOP;
END $$;

-- Allow authenticated users to insert stakeholder roles
CREATE POLICY "authenticated_users_insert_stakeholder_roles"
  ON stakeholder_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow anonymous users to insert stakeholder roles (for onboarding)
CREATE POLICY "anon_users_insert_stakeholder_roles"
  ON stakeholder_roles
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON POLICY "authenticated_users_select_relationships" ON relationships IS
  'Allows authenticated users to view all relationships';

COMMENT ON POLICY "authenticated_users_insert_relationships" ON relationships IS
  'Allows authenticated users to create relationships';

COMMENT ON POLICY "anon_users_insert_relationships" ON relationships IS
  'Allows anonymous users to create relationships during onboarding. Admin review ensures data quality.';

COMMENT ON POLICY "authenticated_users_update_relationships" ON relationships IS
  'Allows authenticated users to update relationships';

COMMENT ON POLICY "authenticated_users_delete_relationships" ON relationships IS
  'Allows authenticated users to delete relationships';
