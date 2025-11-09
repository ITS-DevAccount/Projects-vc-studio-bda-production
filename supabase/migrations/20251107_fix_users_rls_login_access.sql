-- Ensure super-admin lookup during login can read its own users row

-- Drop existing users table policies that may conflict
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own record" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Allow each authenticated account to read its matching users row
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid());

-- Allow accounts to create their own users row (used by triggers / signups)
CREATE POLICY "Users can insert own record" ON users
    FOR INSERT TO authenticated
    WITH CHECK (auth_user_id = auth.uid());

-- Allow accounts to update their own users row
CREATE POLICY "Users can update own record" ON users
    FOR UPDATE TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- Verification: list active policies for the users table
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;
