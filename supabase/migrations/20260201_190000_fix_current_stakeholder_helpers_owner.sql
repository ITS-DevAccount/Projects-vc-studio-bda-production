-- Ensure helper functions bypass RLS by disabling row_security and setting owner

CREATE OR REPLACE FUNCTION current_stakeholder_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT id
  FROM stakeholders
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION current_stakeholder_context()
RETURNS TABLE (id uuid, reference text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT id, reference
  FROM stakeholders
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Try to set owner to postgres/supabase_admin if available (safe to ignore errors)
DO $$
BEGIN
  BEGIN
    ALTER FUNCTION current_stakeholder_id() OWNER TO postgres;
    ALTER FUNCTION current_stakeholder_context() OWNER TO postgres;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      ALTER FUNCTION current_stakeholder_id() OWNER TO supabase_admin;
      ALTER FUNCTION current_stakeholder_context() OWNER TO supabase_admin;
    EXCEPTION WHEN OTHERS THEN
      -- ignore
    END;
  END;
END $$;
