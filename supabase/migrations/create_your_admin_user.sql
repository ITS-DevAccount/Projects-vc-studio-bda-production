-- =============================================================================
-- CREATE YOUR ADMIN USER
-- =============================================================================
-- STEP 1: Find your auth user ID
-- Run this first to see your auth user ID:
SELECT id, email FROM auth.users;

-- =============================================================================
-- STEP 2: Create your user record
-- Replace 'YOUR_EMAIL_HERE' with your actual email address from step 1
-- =============================================================================

INSERT INTO users (auth_user_id, email, display_name, role, is_active)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'display_name', au.email) as display_name,
  'super_admin' as role,
  true as is_active
FROM auth.users au
WHERE au.email = 'YOUR_EMAIL_HERE'  -- ⚠️ CHANGE THIS TO YOUR ACTUAL EMAIL
ON CONFLICT (email) DO UPDATE
SET 
  auth_user_id = EXCLUDED.auth_user_id,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- =============================================================================
-- STEP 3: Verify your user was created
-- =============================================================================
SELECT 
  u.id,
  u.email,
  u.display_name,
  u.role,
  u.is_active,
  u.auth_user_id,
  CASE 
    WHEN au.id IS NOT NULL THEN '✓ Auth user exists'
    ELSE '✗ Auth user NOT found'
  END as auth_status
FROM users u
LEFT JOIN auth.users au ON u.auth_user_id = au.id
WHERE u.email = 'YOUR_EMAIL_HERE';  -- ⚠️ CHANGE THIS TO YOUR ACTUAL EMAIL






