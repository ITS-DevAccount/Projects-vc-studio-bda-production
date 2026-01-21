-- Migration: Add workspace_template_id to roles table
-- Description: Link roles to workspace templates for automatic workspace provisioning
-- Created: 2024-12-17

-- Add workspace_template_id column to roles table
ALTER TABLE roles
ADD COLUMN IF NOT EXISTS workspace_template_id UUID REFERENCES workspace_templates(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_roles_workspace_template_id
ON roles(workspace_template_id);

-- Add comment
COMMENT ON COLUMN roles.workspace_template_id IS 'Optional workspace template to use when creating workspaces for users with this role';
