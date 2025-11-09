-- =============================================================================
-- Seed Initial Admin Account (Auth user + Stakeholder + App user row)
-- =============================================================================
-- 1. Create your admin Auth user first (e.g. via Supabase Auth dashboard or CLI).
-- 2. Update the placeholders below for email, display name and optional reference.
-- 3. Run this script in the Supabase SQL editor (or `supabase db remote commit`).
--    It will:
--      • ensure the admin stakeholder type and administrator role exist
--      • create/update a stakeholder record linked to the Auth user
--      • grant the stakeholder the administrator role + mark as primary role
--      • create/update the matching row in the `users` table with `super_admin` role

DO $$
DECLARE
  v_admin_email      text := 'admin@its-vcef.com';  -- TODO: replace with your admin email
  v_display_name     text := 'Studio Admin';        -- Optional: friendly name for the admin
  v_reference        text := NULL;                  -- Optional: custom stakeholder reference (NULL = auto)

  v_auth_user_id        uuid;
  v_stakeholder_type_id uuid;
  v_admin_role_id       uuid;
  v_stakeholder_id      uuid;
BEGIN
  -- Locate the Auth user by email (must exist already)
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = v_admin_email
  LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Auth user with email % was not found. Create the Auth user first, then re-run this script.', v_admin_email;
  END IF;

  -- Fetch required reference data
  SELECT id INTO v_stakeholder_type_id
  FROM stakeholder_types
  WHERE code = 'admin'
  LIMIT 1;

  IF v_stakeholder_type_id IS NULL THEN
    RAISE EXCEPTION 'Stakeholder type with code "admin" was not found. Ensure migrations have run.';
  END IF;

  SELECT id INTO v_admin_role_id
  FROM roles
  WHERE code = 'administrator'
  LIMIT 1;

  IF v_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Role with code "administrator" was not found. Ensure migrations have run.';
  END IF;

  -- Upsert stakeholder linked to the Auth user
  SELECT id INTO v_stakeholder_id
  FROM stakeholders
  WHERE auth_user_id = v_auth_user_id
  LIMIT 1;

  IF v_stakeholder_id IS NULL THEN
    INSERT INTO stakeholders (
      reference,
      name,
      stakeholder_type_id,
      primary_role_id,
      email,
      status,
      is_verified,
      is_user,
      invite_email,
      auth_user_id
    )
    VALUES (
      COALESCE(v_reference, 'ADMIN-' || replace(substring(uuid_generate_v4()::text, 1, 8), '-', '')),
      v_display_name,
      v_stakeholder_type_id,
      v_admin_role_id,
      v_admin_email,
      'active',
      true,
      true,
      v_admin_email,
      v_auth_user_id
    )
    RETURNING id INTO v_stakeholder_id;
  ELSE
    UPDATE stakeholders
    SET
      name = v_display_name,
      stakeholder_type_id = v_stakeholder_type_id,
      primary_role_id = v_admin_role_id,
      email = v_admin_email,
      status = 'active',
      is_verified = true,
      is_user = true,
      invite_email = v_admin_email
    WHERE id = v_stakeholder_id;
  END IF;

  -- Ensure administrator role assignment exists for this stakeholder
  INSERT INTO stakeholder_roles (stakeholder_id, role_type, role_id)
  VALUES (v_stakeholder_id, 'administrator', v_admin_role_id)
  ON CONFLICT (stakeholder_id, role_type)
  DO UPDATE SET role_id = EXCLUDED.role_id;

  -- Upsert application user record with elevated permissions
  INSERT INTO users (auth_user_id, email, display_name, role, is_active)
  VALUES (v_auth_user_id, v_admin_email, v_display_name, 'super_admin', true)
  ON CONFLICT (auth_user_id)
  DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

  RAISE NOTICE 'Admin account seeded/updated for % (stakeholder_id=%).', v_admin_email, v_stakeholder_id;
END $$;

-- =============================================================================
-- Verification helper (optional – run separately if desired)
-- =============================================================================
-- SELECT s.id, s.name, s.reference, s.email, s.primary_role_id, s.is_user, s.auth_user_id
-- FROM stakeholders s
-- WHERE s.auth_user_id = (SELECT id FROM auth.users WHERE email = 'admin@example.com')
-- LIMIT 1;
--
-- SELECT u.id, u.email, u.display_name, u.role, u.is_active, u.auth_user_id
-- FROM users u
-- WHERE u.email = 'admin@example.com';


