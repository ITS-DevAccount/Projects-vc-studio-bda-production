-- Fix nodes INSERT RLS to avoid stakeholders.app_uuid dependency

-- Helper: current app uuid (VC Studio)
CREATE OR REPLACE FUNCTION current_app_uuid()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id
  FROM applications
  WHERE app_code = 'VC_STUDIO'
  LIMIT 1;
$$;

-- Replace INSERT policy
DROP POLICY IF EXISTS nodes_owner_insert ON nodes;
CREATE POLICY nodes_owner_insert ON nodes
  FOR INSERT
  WITH CHECK (
    owner_id = current_stakeholder_id()
    AND app_uuid = current_app_uuid()
  );
