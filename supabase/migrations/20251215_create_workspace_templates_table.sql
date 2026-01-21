-- Migration: Create workspace_templates table
-- Description: Named templates that combine dashboard, file structure, and business services configurations
-- Created: 2024-12-15

CREATE TABLE IF NOT EXISTS workspace_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    template_code TEXT UNIQUE NOT NULL,
    template_name TEXT NOT NULL,
    description TEXT,

    -- Configuration References
    dashboard_config_id UUID REFERENCES workspace_dashboard_configurations(id) ON DELETE SET NULL,
    file_structure_template_id UUID REFERENCES workspace_file_structure_templates(id) ON DELETE SET NULL,
    business_services_config_id UUID REFERENCES workspace_business_services_configurations(id) ON DELETE SET NULL,

    -- Context
    app_uuid UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    applicable_roles TEXT[] NOT NULL DEFAULT '{}',

    -- Metadata
    category TEXT,
    icon_name TEXT,
    preview_image_url TEXT,
    is_featured BOOLEAN DEFAULT false,
    is_system_template BOOLEAN DEFAULT false,

    -- Status
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,

    -- Audit
    created_by UUID REFERENCES stakeholders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_workspace_templates_app ON workspace_templates(app_uuid);
CREATE INDEX idx_workspace_templates_active ON workspace_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_workspace_templates_featured ON workspace_templates(is_featured, app_uuid) WHERE is_featured = true;
CREATE INDEX idx_workspace_templates_category ON workspace_templates(category, app_uuid);
CREATE INDEX idx_workspace_templates_usage ON workspace_templates(usage_count DESC);
CREATE INDEX idx_workspace_templates_code ON workspace_templates(template_code);

-- Enable Row Level Security
ALTER TABLE workspace_templates ENABLE ROW LEVEL SECURITY;

-- Add foreign key constraint to workspace_configurations (circular dependency handled here)
ALTER TABLE workspaces
    ADD CONSTRAINT fk_workspace_template
    FOREIGN KEY (created_from_template_id)
    REFERENCES workspace_templates(id)
    ON DELETE SET NULL;

-- Add comments
COMMENT ON TABLE workspace_templates IS 'Named templates combining dashboard, file structure, and business services configurations';
COMMENT ON COLUMN workspace_templates.template_code IS 'Unique code identifier (e.g., VC_STUDIO_INVESTOR, BUILDBID_CONTRACTOR)';
COMMENT ON COLUMN workspace_templates.applicable_roles IS 'Array of role codes that can use this template';
COMMENT ON COLUMN workspace_templates.category IS 'Template category for organization (e.g., Investment Management, Project Management)';
COMMENT ON COLUMN workspace_templates.is_featured IS 'Featured templates shown prominently in UI';
COMMENT ON COLUMN workspace_templates.is_system_template IS 'System templates cannot be deleted by users';
COMMENT ON COLUMN workspace_templates.usage_count IS 'Number of workspaces created from this template';
