-- Create your first admin user
-- Run this in Supabase SQL Editor after logging in
-- Replace YOUR_AUTH_USER_ID with your actual Supabase auth user ID

-- =============================================================================
-- STEP 1: Get your auth user ID
-- =============================================================================
-- First, run this query to see your auth user ID:
-- SELECT id, email FROM auth.users;

-- =============================================================================
-- STEP 2: Create admin user record
-- =============================================================================
-- Replace 'YOUR_AUTH_USER_ID_HERE' with the ID from step 1
-- Replace 'your-email@example.com' with your actual email

INSERT INTO users (
  auth_user_id,
  email,
  display_name,
  role,
  is_active
) VALUES (
  'YOUR_AUTH_USER_ID_HERE',  -- Get this from: SELECT id FROM auth.users WHERE email = 'your-email@example.com';
  'your-email@example.com',  -- Your email
  'Admin User',               -- Display name
  'super_admin',              -- Role: super_admin, domain_admin, or manager
  true
) ON CONFLICT (email) DO UPDATE
SET 
  auth_user_id = EXCLUDED.auth_user_id,
  role = EXCLUDED.role,
  is_active = true;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- Check that your user was created:
SELECT 
  u.id,
  u.email,
  u.display_name,
  u.role,
  u.is_active,
  au.id as auth_user_id,
  au.email as auth_email
FROM users u
LEFT JOIN auth.users au ON u.auth_user_id = au.id
WHERE u.email = 'your-email@example.com';

