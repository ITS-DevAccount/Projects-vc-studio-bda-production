-- Migration: Extend audit_logs table for workspace tracking
-- Description: Add workspace_id column to track workspace-related events
-- Created: 2024-12-15

-- Add workspace_id column to audit_logs table
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- Create index for efficient workspace audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace
    ON audit_logs(workspace_id)
    WHERE workspace_id IS NOT NULL;

-- Create composite index for workspace + action queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_action
    ON audit_logs(workspace_id, action)
    WHERE workspace_id IS NOT NULL;

-- Create index for workspace + timestamp queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_created
    ON audit_logs(workspace_id, created_at DESC)
    WHERE workspace_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN audit_logs.workspace_id IS 'Reference to workspace for workspace-related audit events';

-- Update action comment to include workspace events
COMMENT ON COLUMN audit_logs.action IS 'Action types include:
- workspace_created: Workspace provisioned
- workspace_updated: Workspace metadata changed
- workspace_archived: Workspace archived/deleted
- workspace_restored: Workspace restored from archive
- access_granted: User granted access to workspace
- access_revoked: User access revoked
- access_updated: User permissions updated
- config_changed: Workspace configuration changed
- template_applied: Template applied to workspace
- file_structure_initialized: File structure created
- collaborator_invited: Invitation sent
- collaborator_accepted: Invitation accepted
- collaborator_declined: Invitation declined';
