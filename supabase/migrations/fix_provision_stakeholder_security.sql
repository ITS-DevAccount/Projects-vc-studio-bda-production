-- Fix provision_stakeholder to run with elevated privileges
-- This allows it to bypass RLS policies when creating stakeholders and relationships

ALTER FUNCTION provision_stakeholder(
  p_stakeholder JSONB,
  p_role_codes TEXT[],
  p_primary_role_id UUID,
  p_relationships JSONB,
  p_auth_user_id UUID,
  p_invite_email TEXT,
  p_is_user BOOLEAN,
  p_created_by UUID
) SECURITY DEFINER;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION provision_stakeholder(
  p_stakeholder JSONB,
  p_role_codes TEXT[],
  p_primary_role_id UUID,
  p_relationships JSONB,
  p_auth_user_id UUID,
  p_invite_email TEXT,
  p_is_user BOOLEAN,
  p_created_by UUID
) TO authenticated, anon;

-- Add comment explaining security model
COMMENT ON FUNCTION provision_stakeholder IS 'Creates or updates stakeholder with roles and relationships. Runs as SECURITY DEFINER to bypass RLS during onboarding.';
