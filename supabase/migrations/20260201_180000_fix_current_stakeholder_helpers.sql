-- Ensure SECURITY DEFINER helpers can read stakeholders despite RLS

CREATE OR REPLACE FUNCTION current_stakeholder_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
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
AS $$
  SELECT id, reference
  FROM stakeholders
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;
