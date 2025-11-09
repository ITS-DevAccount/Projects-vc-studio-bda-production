-- Fix stakeholders RLS to avoid recursion by checking users table
-- Use a simpler approach: allow all authenticated users to manage stakeholders
-- OR check auth.users metadata instead of users table

-- =============================================================================
-- OPTION 1: Allow all authenticated users (for now - can tighten later)
-- =============================================================================

DROP POLICY IF EXISTS "Admins can insert stakeholders" ON stakeholders;
DROP POLICY IF EXISTS "Admins can update stakeholders" ON stakeholders;
DROP POLICY IF EXISTS "Admins can delete stakeholders" ON stakeholders;
DROP POLICY IF EXISTS "Admins can select all stakeholders" ON stakeholders;

-- Allow all authenticated users to manage stakeholders
-- (You can tighten this later with role checks if needed)
CREATE POLICY "Authenticated users can insert stakeholders" ON stakeholders
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can select stakeholders" ON stakeholders
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can update stakeholders" ON stakeholders
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can delete stakeholders" ON stakeholders
    FOR DELETE TO authenticated
    USING (true);

-- Keep the "view own record" policy for public access
DROP POLICY IF EXISTS "Stakeholders can view own record" ON stakeholders;
CREATE POLICY "Stakeholders can view own record" ON stakeholders
    FOR SELECT USING (auth_user_id = auth.uid());

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'stakeholders'
ORDER BY policyname;






