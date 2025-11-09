-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL, -- 'onboarding_complete', 'stakeholder_updated', 'workflow_completed', etc.
  stakeholder_id uuid REFERENCES stakeholders(id) ON DELETE SET NULL,
  performed_by uuid REFERENCES stakeholders(id) ON DELETE SET NULL, -- Who performed the action
  details jsonb, -- Flexible JSON field for action-specific details
  created_at timestamp with time zone DEFAULT now(),
  app_uuid uuid REFERENCES applications(uuid)
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can see audit logs (simplified for now)
-- Users can see their own audit logs
CREATE POLICY audit_logs_owner_access ON audit_logs
  FOR SELECT USING (
    stakeholder_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    OR performed_by = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
  );

-- Create indexes for faster lookups
CREATE INDEX idx_audit_logs_stakeholder ON audit_logs(stakeholder_id);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
