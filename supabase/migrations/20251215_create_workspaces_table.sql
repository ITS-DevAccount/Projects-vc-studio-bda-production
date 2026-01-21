-- Migration: Create workspaces table
-- Description: Core workspace entity with multi-tenancy support
-- Created: 2024-12-15

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    reference TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,

    -- Ownership & Context
    owner_stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
    app_uuid UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    primary_role_code TEXT NOT NULL,

    -- Lifecycle
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,

    -- Template Association
    created_from_template_id UUID,

    -- Metadata
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,

    -- Composite unique constraint: one workspace per (stakeholder, app, role)
    CONSTRAINT unique_stakeholder_app_role UNIQUE(owner_stakeholder_id, app_uuid, primary_role_code)
);

-- Create indexes for efficient queries
CREATE INDEX idx_workspaces_owner ON workspaces(owner_stakeholder_id);
CREATE INDEX idx_workspaces_app ON workspaces(app_uuid);
CREATE INDEX idx_workspaces_status ON workspaces(status) WHERE status = 'active';
CREATE INDEX idx_workspaces_template ON workspaces(created_from_template_id) WHERE created_from_template_id IS NOT NULL;
CREATE INDEX idx_workspaces_created_at ON workspaces(created_at DESC);

-- Enable Row Level Security
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE workspaces IS 'Core workspace entity - one per (stakeholder, app, role) combination';
COMMENT ON COLUMN workspaces.reference IS 'Unique workspace reference in format WKS-XXXXXX';
COMMENT ON COLUMN workspaces.primary_role_code IS 'Role context in which this workspace operates (e.g., investor, administrator)';
COMMENT ON COLUMN workspaces.status IS 'Workspace lifecycle status: active, archived, or suspended';
COMMENT ON COLUMN workspaces.created_from_template_id IS 'Reference to workspace_templates if created from template';
