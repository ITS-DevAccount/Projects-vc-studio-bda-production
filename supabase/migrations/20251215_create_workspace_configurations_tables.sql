-- Migration: Create workspace configuration tables
-- Description: Three configuration types for workspaces (dashboard, file structure, business services)
-- Created: 2024-12-15

-- ============================================================================
-- 1. WORKSPACE DASHBOARD CONFIGURATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspace_dashboard_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    config_name TEXT NOT NULL,
    description TEXT,

    -- Configuration Content (extends stakeholders.core_config structure)
    dashboard_config JSONB NOT NULL DEFAULT '{}'::JSONB,
    /*
    Expected structure:
    {
        "menu_items": [
            {
                "label": "Portfolio",
                "component_id": "vc_pyramid",
                "position": 1,
                "is_default": true
            }
        ],
        "widgets": [],
        "workspace_layout": {
            "sidebar_width": "250px",
            "theme": "light",
            "show_notifications": true,
            "default_component": "file_explorer"
        },
        "function_registry": [
            {
                "id": "file_view",
                "label": "File View",
                "icon": "folder",
                "component_code": "file_explorer"
            }
        ]
    }
    */

    -- Ownership & Context
    created_by UUID REFERENCES stakeholders(id) ON DELETE SET NULL,
    app_uuid UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,

    -- Versioning
    version TEXT DEFAULT '1.0',
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dashboard_config_app ON workspace_dashboard_configurations(app_uuid);
CREATE INDEX idx_dashboard_config_active ON workspace_dashboard_configurations(is_active) WHERE is_active = true;
CREATE INDEX idx_dashboard_config_default ON workspace_dashboard_configurations(app_uuid, is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE workspace_dashboard_configurations ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE workspace_dashboard_configurations IS 'Dashboard configuration templates for workspaces';
COMMENT ON COLUMN workspace_dashboard_configurations.dashboard_config IS 'JSONB structure matching stakeholders.core_config pattern for dashboard layout';

-- ============================================================================
-- 2. WORKSPACE FILE STRUCTURE TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspace_file_structure_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    template_name TEXT NOT NULL,
    description TEXT,

    -- File Structure Definition (hierarchical JSON)
    structure_definition JSONB NOT NULL,
    /*
    Expected structure:
    {
        "root_folders": [
            {
                "name": "Projects",
                "description": "Active project files",
                "tags": ["work"],
                "subfolders": [
                    {
                        "name": "Draft",
                        "description": "Draft documents",
                        "tags": ["draft"]
                    },
                    {
                        "name": "Final",
                        "tags": ["final"]
                    }
                ]
            }
        ]
    }
    */

    -- Context
    app_uuid UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    applicable_roles TEXT[] DEFAULT '{}',

    -- Metadata
    created_by UUID REFERENCES stakeholders(id) ON DELETE SET NULL,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_file_structure_template_app ON workspace_file_structure_templates(app_uuid);
CREATE INDEX idx_file_structure_template_active ON workspace_file_structure_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_file_structure_template_default ON workspace_file_structure_templates(app_uuid, is_default) WHERE is_default = true;
CREATE INDEX idx_file_structure_template_usage ON workspace_file_structure_templates(usage_count DESC);

-- Enable RLS
ALTER TABLE workspace_file_structure_templates ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE workspace_file_structure_templates IS 'Hierarchical folder structure templates for workspace initialization';
COMMENT ON COLUMN workspace_file_structure_templates.structure_definition IS 'JSONB hierarchical structure defining folders and subfolders to create';
COMMENT ON COLUMN workspace_file_structure_templates.applicable_roles IS 'Array of role codes that can use this template';

-- ============================================================================
-- 3. WORKSPACE BUSINESS SERVICES CONFIGURATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspace_business_services_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    config_name TEXT NOT NULL,
    description TEXT,

    -- Service Configuration
    services_config JSONB NOT NULL DEFAULT '{}'::JSONB,
    /*
    Expected structure:
    {
        "workflows": [
            {
                "workflow_code": "approval_process",
                "enabled": true,
                "params": {
                    "approval_required": true,
                    "notification_channels": ["email", "in_app"]
                }
            }
        ],
        "services": [
            {
                "service_name": "document_review",
                "config_override": {}
            }
        ],
        "notifications": {
            "channels": ["email", "in_app"],
            "rules": [
                {
                    "event": "workspace_updated",
                    "notify": "owner"
                }
            ]
        },
        "automation_rules": [
            {
                "trigger": "file_uploaded",
                "condition": "file.tags contains 'important'",
                "action": "notify_owner"
            }
        ]
    }
    */

    -- Context
    app_uuid UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    created_by UUID REFERENCES stakeholders(id) ON DELETE SET NULL,

    -- Status
    is_active BOOLEAN DEFAULT true,
    version TEXT DEFAULT '1.0',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_business_services_config_app ON workspace_business_services_configurations(app_uuid);
CREATE INDEX idx_business_services_config_active ON workspace_business_services_configurations(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE workspace_business_services_configurations ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE workspace_business_services_configurations IS 'Business logic configurations for workspace workflows, notifications, and automation';
COMMENT ON COLUMN workspace_business_services_configurations.services_config IS 'JSONB structure defining workflows, notifications, and automation rules';
