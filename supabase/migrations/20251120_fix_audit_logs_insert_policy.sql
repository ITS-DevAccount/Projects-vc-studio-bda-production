-- ============================================================================
-- Fix audit_logs RLS Policy - Add INSERT Policy
-- Purpose: Allow authenticated users and system functions to insert audit logs
-- Issue: Community functionality was blocked because no INSERT policy existed
-- ============================================================================

-- Drop existing INSERT policy if it exists (in case of previous attempts)
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_allow_insert" ON audit_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON audit_logs;

-- Create INSERT policy: Allow authenticated users to insert audit logs
-- This allows community functions (like provision_stakeholder) to log actions
-- 
-- Policy allows inserts when:
-- 1. User is inserting a log where they are the performer, OR
-- 2. User is inserting a log for their own stakeholder record, OR
-- 3. performed_by is NULL (system-generated logs), OR
-- 4. User is authenticated (covers community functions and SECURITY DEFINER functions)
CREATE POLICY "audit_logs_insert_policy" ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is inserting a log where they are the performer
    performed_by = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    -- OR allow if user is inserting a log for their own stakeholder record
    OR stakeholder_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    -- OR allow if performed_by is NULL (system-generated logs)
    OR performed_by IS NULL
    -- OR allow any authenticated user (for community functions and system functions)
    -- This ensures provision_stakeholder and other SECURITY DEFINER functions can log
    OR auth.uid() IS NOT NULL
  );

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'audit_logs'
    AND cmd = 'INSERT';
  
  IF policy_count > 0 THEN
    RAISE NOTICE '✓ INSERT policy created successfully. Found % INSERT policy/policies.', policy_count;
  ELSE
    RAISE WARNING '⚠ No INSERT policies found for audit_logs table';
  END IF;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'audit_logs INSERT Policy Fix';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Added INSERT policy for authenticated users';
  RAISE NOTICE '✓ Community functions can now insert audit logs';
  RAISE NOTICE '========================================';
END $$;

