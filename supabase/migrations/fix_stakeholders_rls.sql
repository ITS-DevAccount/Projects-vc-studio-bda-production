-- Fix RLS policies for stakeholders table to allow authenticated admins to INSERT, UPDATE, DELETE
-- Run this in Supabase SQL Editor

-- =============================================================================
-- STAKEHOLDERS TABLE - Fix RLS policies for admin operations
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Stakeholders can view own record" ON stakeholders;
DROP POLICY IF EXISTS "Admins can view all stakeholders" ON stakeholders;

-- Stakeholders can see their own record (SELECT only)
CREATE POLICY "Stakeholders can view own record" ON stakeholders
    FOR SELECT USING (auth_user_id = auth.uid());

-- Admins can SELECT all stakeholders
CREATE POLICY "Admins can select all stakeholders" ON stakeholders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin', 'manager')
        )
    );

-- Admins can INSERT stakeholders
CREATE POLICY "Admins can insert stakeholders" ON stakeholders
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin', 'manager')
        )
    );

-- Admins can UPDATE stakeholders
CREATE POLICY "Admins can update stakeholders" ON stakeholders
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin', 'manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin', 'manager')
        )
    );

-- Admins can DELETE stakeholders
CREATE POLICY "Admins can delete stakeholders" ON stakeholders
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin', 'manager')
        )
    );

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check policies exist
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
  AND tablename = 'stakeholders'
ORDER BY policyname;

