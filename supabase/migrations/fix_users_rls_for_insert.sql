-- Fix RLS policies on users table to allow inserting
-- Run this in Supabase SQL Editor

-- =============================================================================
-- USERS TABLE - Allow authenticated users to insert their own record
-- =============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Allow authenticated users to insert their own user record
-- This is needed when creating the initial user record
CREATE POLICY "Users can insert own record" ON users
    FOR INSERT TO authenticated
    WITH CHECK (auth_user_id = auth.uid());

-- Users can see their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth_user_id = auth.uid());

-- Admins can see all users
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin')
        )
    );

-- Admins can update all users
CREATE POLICY "Admins can update all users" ON users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin')
        )
    );

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check policies
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;






