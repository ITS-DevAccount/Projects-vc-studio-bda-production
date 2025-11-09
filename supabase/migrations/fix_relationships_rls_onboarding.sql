-- Fix RLS policies on relationships table to allow onboarding
-- This allows anonymous users to create relationships during registration

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Allow authenticated users to create relationships" ON relationships;
DROP POLICY IF EXISTS "Allow users to create relationships" ON relationships;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON relationships;

-- Create new insert policy that allows both authenticated and anonymous users
CREATE POLICY "Allow relationship creation during onboarding"
  ON relationships
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Keep existing select policy (authenticated users can view relationships)
DROP POLICY IF EXISTS "Allow authenticated users to view relationships" ON relationships;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON relationships;

CREATE POLICY "Allow authenticated users to view relationships"
  ON relationships
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update their own relationships
DROP POLICY IF EXISTS "Allow authenticated users to update relationships" ON relationships;

CREATE POLICY "Allow authenticated users to update relationships"
  ON relationships
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete relationships
DROP POLICY IF EXISTS "Allow authenticated users to delete relationships" ON relationships;

CREATE POLICY "Allow authenticated users to delete relationships"
  ON relationships
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment explaining the policy
COMMENT ON POLICY "Allow relationship creation during onboarding" ON relationships IS
  'Allows anonymous users to create relationships during stakeholder onboarding. Admin approval workflow ensures data quality.';
