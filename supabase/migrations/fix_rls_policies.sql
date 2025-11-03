-- Fix infinite recursion in RLS policies
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- =============================================================================
-- USERS TABLE - Fix infinite recursion
-- =============================================================================

-- Drop existing policies that may cause recursion
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON users;

-- Create simple, non-recursive policies for users table
CREATE POLICY "Enable read for authenticated users" ON users
FOR SELECT TO authenticated
USING (auth.uid() = id);  -- Direct comparison, no subquery = no recursion

CREATE POLICY "Enable insert for authenticated users" ON users
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for own record" ON users
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- =============================================================================
-- ENQUIRIES TABLE - Allow authenticated users to manage enquiries
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read for authenticated users" ON enquiries;
DROP POLICY IF EXISTS "Enable insert for all users" ON enquiries;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON enquiries;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON enquiries;

-- Allow anonymous users to submit enquiries (contact form)
CREATE POLICY "Enable insert for all users" ON enquiries
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Only authenticated users (admins) can read enquiries
CREATE POLICY "Enable read for authenticated users" ON enquiries
FOR SELECT TO authenticated
USING (true);

-- Only authenticated users (admins) can delete enquiries
CREATE POLICY "Enable delete for authenticated users" ON enquiries
FOR DELETE TO authenticated
USING (true);

-- Only authenticated users (admins) can update enquiries
CREATE POLICY "Enable update for authenticated users" ON enquiries
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- =============================================================================
-- BLOG_POSTS TABLE - Public read, authenticated write
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read for all users" ON blog_posts;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON blog_posts;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON blog_posts;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON blog_posts;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON blog_posts;

-- Allow everyone to read published blog posts
CREATE POLICY "Enable read for all users" ON blog_posts
FOR SELECT TO anon, authenticated
USING (true);

-- Only authenticated users (admins) can insert blog posts
CREATE POLICY "Enable insert for authenticated users" ON blog_posts
FOR INSERT TO authenticated
WITH CHECK (true);

-- Only authenticated users (admins) can update blog posts
CREATE POLICY "Enable update for authenticated users" ON blog_posts
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Only authenticated users (admins) can delete blog posts
CREATE POLICY "Enable delete for authenticated users" ON blog_posts
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
  AND tablename IN ('users', 'enquiries', 'blog_posts');

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
  AND tablename IN ('users', 'enquiries', 'blog_posts')
ORDER BY tablename, policyname;
