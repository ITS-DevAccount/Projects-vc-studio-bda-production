-- Auto-create users table record when someone signs up via Supabase Auth
-- This ensures users are automatically created in the users table

-- =============================================================================
-- FUNCTION: Auto-create user record
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    auth_user_id,
    email,
    display_name,
    role,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    'viewer',  -- Default role, can be changed by admin
    true
  )
  ON CONFLICT (email) DO UPDATE
  SET 
    auth_user_id = NEW.id,
    is_active = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGER: Auto-create user on signup
-- =============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- BACKFILL: Create users for existing auth.users
-- =============================================================================

INSERT INTO public.users (
  auth_user_id,
  email,
  display_name,
  role,
  is_active
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'display_name', au.email),
  'viewer',  -- Default role
  true
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.auth_user_id = au.id
)
ON CONFLICT (email) DO UPDATE
SET 
  auth_user_id = EXCLUDED.auth_user_id,
  is_active = true;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check that trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check users created
SELECT 
  u.id,
  u.email,
  u.role,
  u.is_active,
  au.id as auth_user_id
FROM users u
LEFT JOIN auth.users au ON u.auth_user_id = au.id;

