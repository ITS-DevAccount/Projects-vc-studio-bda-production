-- Migration: Create workspace_access_control table
-- Description: Multi-user access control for workspace collaboration
-- Created: 2024-12-15

CREATE TABLE IF NOT EXISTS workspace_access_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Workspace & User
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,

    -- Role
    access_role TEXT NOT NULL CHECK (access_role IN ('owner', 'collaborator', 'consultant', 'viewer')),

    -- Permissions (granular control)
    permissions JSONB DEFAULT '{}'::JSONB,
    /*
    Expected structure:
    {
        "can_edit_dashboard": true,
        "can_manage_files": true,
        "can_invite_users": false,
        "can_configure_services": false,
        "can_view_audit_logs": true,
        "can_delete_workspace": false
    }
    */

    -- Invitation
    invited_by UUID REFERENCES stakeholders(id) ON DELETE SET NULL,
    invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    invitation_status TEXT NOT NULL DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'accepted', 'declined', 'revoked')),

    -- Audit
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,

    -- One role per stakeholder per workspace
    CONSTRAINT unique_workspace_stakeholder UNIQUE(workspace_id, stakeholder_id)
);

-- Create indexes
CREATE INDEX idx_workspace_access_workspace ON workspace_access_control(workspace_id);
CREATE INDEX idx_workspace_access_stakeholder ON workspace_access_control(stakeholder_id);
CREATE INDEX idx_workspace_access_role ON workspace_access_control(access_role);
CREATE INDEX idx_workspace_access_status ON workspace_access_control(invitation_status);
CREATE INDEX idx_workspace_access_invited_by ON workspace_access_control(invited_by) WHERE invited_by IS NOT NULL;
CREATE INDEX idx_workspace_access_expires ON workspace_access_control(expires_at) WHERE expires_at IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE workspace_access_control ENABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON TABLE workspace_access_control IS 'Multi-user access control for workspace collaboration';
COMMENT ON COLUMN workspace_access_control.access_role IS 'User role in workspace: owner (full control), collaborator (edit), consultant (suggest), viewer (read-only)';
COMMENT ON COLUMN workspace_access_control.permissions IS 'JSONB structure with granular permission flags';
COMMENT ON COLUMN workspace_access_control.invitation_status IS 'Invitation workflow status: pending, accepted, declined, or revoked';
COMMENT ON COLUMN workspace_access_control.expires_at IS 'Optional expiration date for time-limited access';
COMMENT ON COLUMN workspace_access_control.last_accessed_at IS 'Timestamp of last workspace access for activity tracking';
