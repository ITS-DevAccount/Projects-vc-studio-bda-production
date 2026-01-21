-- Migration: Create workspace_configurations junction table
-- Description: Links workspaces to their active configurations (dashboard, file structure, business services)
-- Created: 2024-12-15

CREATE TABLE IF NOT EXISTS workspace_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Workspace Link
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    -- Configuration References (all optional - use defaults if NULL)
    dashboard_config_id UUID REFERENCES workspace_dashboard_configurations(id) ON DELETE SET NULL,
    file_structure_template_id UUID REFERENCES workspace_file_structure_templates(id) ON DELETE SET NULL,
    business_services_config_id UUID REFERENCES workspace_business_services_configurations(id) ON DELETE SET NULL,

    -- Version Tracking
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applied_by UUID REFERENCES stakeholders(id) ON DELETE SET NULL,

    -- Only one active configuration per workspace
    is_active BOOLEAN DEFAULT true
);

-- Create indexes
CREATE INDEX idx_workspace_configs_workspace ON workspace_configurations(workspace_id);
CREATE INDEX idx_workspace_configs_active ON workspace_configurations(workspace_id, is_active) WHERE is_active = true;
CREATE INDEX idx_workspace_configs_dashboard ON workspace_configurations(dashboard_config_id) WHERE dashboard_config_id IS NOT NULL;
CREATE INDEX idx_workspace_configs_file_structure ON workspace_configurations(file_structure_template_id) WHERE file_structure_template_id IS NOT NULL;
CREATE INDEX idx_workspace_configs_business_services ON workspace_configurations(business_services_config_id) WHERE business_services_config_id IS NOT NULL;

-- Unique constraint: only one active configuration per workspace
CREATE UNIQUE INDEX unique_active_workspace_config
    ON workspace_configurations(workspace_id)
    WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE workspace_configurations ENABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON TABLE workspace_configurations IS 'Junction table linking workspaces to their active configuration set';
COMMENT ON COLUMN workspace_configurations.workspace_id IS 'Reference to the workspace using this configuration';
COMMENT ON COLUMN workspace_configurations.dashboard_config_id IS 'Active dashboard configuration (NULL = use defaults)';
COMMENT ON COLUMN workspace_configurations.file_structure_template_id IS 'File structure template used (NULL = no template applied)';
COMMENT ON COLUMN workspace_configurations.business_services_config_id IS 'Active business services configuration (NULL = use defaults)';
COMMENT ON COLUMN workspace_configurations.is_active IS 'Only one configuration can be active per workspace at a time';
