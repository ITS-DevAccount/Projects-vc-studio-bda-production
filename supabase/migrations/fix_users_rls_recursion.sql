-- Fix infinite recursion in users table RLS policies
-- The problem: Admin policies check the users table, which triggers RLS, which checks users again = infinite loop

-- =============================================================================
-- SOLUTION: Remove circular dependency by using service role or simplifying
-- =============================================================================

-- Drop the problematic admin policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Keep simple policies that don't cause recursion
-- Users can see their own record
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can view own record" ON users;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON users;

CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth_user_id = auth.uid());

-- Users can insert their own record
DROP POLICY IF EXISTS "Users can insert own record" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;

CREATE POLICY "Users can insert own record" ON users
    FOR INSERT TO authenticated
    WITH CHECK (auth_user_id = auth.uid());

-- Users can update their own record
DROP POLICY IF EXISTS "Enable update for own record" ON users;

CREATE POLICY "Users can update own record" ON users
    FOR UPDATE TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- =============================================================================
-- NOTE: For admin operations on users table, use service role key
-- OR create a separate admin_users table that doesn't have RLS
-- =============================================================================

-- For now, to manage users as admin, you'll need to:
-- 1. Use Supabase Dashboard with service role, OR
-- 2. Create users via the application (which will work with the insert policy above)

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check policies (should not have circular dependencies)
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%users%' THEN '⚠️ Potential recursion'
        ELSE '✓ Safe'
    END as safety_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;






