-- Helper function to return current stakeholder context
CREATE OR REPLACE FUNCTION current_stakeholder_context()
RETURNS TABLE (
  id uuid,
  reference text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, reference
  FROM stakeholders
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;
