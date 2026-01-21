-- Migration: Seed VC Studio workspace templates and configurations
-- Description: Default dashboard configs, file structures, business services, and workspace templates for VC Studio
-- Created: 2024-12-17

-- ============================================================================
-- 1. SEED DASHBOARD CONFIGURATIONS
-- ============================================================================

-- VC Studio Investor Dashboard
INSERT INTO workspace_dashboard_configurations (
    config_name,
    description,
    dashboard_config,
    created_by,
    app_uuid,
    is_default,
    version,
    is_active
) VALUES (
    'VC Studio Investor Default',
    'Default dashboard configuration for investors',
    '{
        "menu_items": [
            {
                "label": "Portfolio",
                "component_id": "vc_pyramid",
                "position": 1,
                "is_default": true,
                "icon": "trending-up"
            },
            {
                "label": "Documents",
                "component_id": "file_explorer",
                "position": 2,
                "icon": "folder"
            },
            {
                "label": "Workflows",
                "component_id": "workflow_tasks",
                "position": 3,
                "icon": "list-checks"
            }
        ],
        "widgets": [],
        "workspace_layout": {
            "sidebar_width": "250px",
            "theme": "light",
            "show_notifications": true,
            "default_component": "vc_pyramid"
        }
    }'::JSONB,
    NULL,
    (SELECT id FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1),
    true,
    '1.0',
    true
) ON CONFLICT DO NOTHING;

-- VC Studio Administrator Dashboard
INSERT INTO workspace_dashboard_configurations (
    config_name,
    description,
    dashboard_config,
    created_by,
    app_uuid,
    is_default,
    version,
    is_active
) VALUES (
    'VC Studio Administrator Default',
    'Default dashboard configuration for administrators',
    '{
        "menu_items": [
            {
                "label": "File Manager",
                "component_id": "file_explorer",
                "position": 1,
                "is_default": true,
                "icon": "folder"
            },
            {
                "label": "Workflows",
                "component_id": "workflow_tasks",
                "position": 2,
                "icon": "list-checks"
            },
            {
                "label": "Settings",
                "component_id": "workspace_settings",
                "position": 3,
                "icon": "settings"
            }
        ],
        "widgets": [],
        "workspace_layout": {
            "sidebar_width": "280px",
            "theme": "light",
            "show_notifications": true,
            "default_component": "file_explorer"
        }
    }'::JSONB,
    NULL,
    (SELECT id FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1),
    false,
    '1.0',
    true
) ON CONFLICT DO NOTHING;

-- VC Studio Individual Dashboard
INSERT INTO workspace_dashboard_configurations (
    config_name,
    description,
    dashboard_config,
    created_by,
    app_uuid,
    is_default,
    version,
    is_active
) VALUES (
    'VC Studio Individual Default',
    'Default dashboard configuration for individual users',
    '{
        "menu_items": [
            {
                "label": "My Files",
                "component_id": "file_explorer",
                "position": 1,
                "is_default": true,
                "icon": "folder"
            },
            {
                "label": "Tasks",
                "component_id": "workflow_tasks",
                "position": 2,
                "icon": "list-checks"
            }
        ],
        "widgets": [],
        "workspace_layout": {
            "sidebar_width": "250px",
            "theme": "light",
            "show_notifications": true,
            "default_component": "file_explorer"
        }
    }'::JSONB,
    NULL,
    (SELECT id FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1),
    false,
    '1.0',
    true
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. SEED FILE STRUCTURE TEMPLATES
-- ============================================================================

-- VC Studio Investment Portfolio Structure
INSERT INTO workspace_file_structure_templates (
    template_name,
    description,
    structure_definition,
    app_uuid,
    applicable_roles,
    is_default,
    is_active
) VALUES (
    'VC Studio Investment Portfolio',
    'Standard folder structure for investment portfolios',
    '{
        "root_folders": [
            {
                "name": "Portfolio Companies",
                "description": "Individual portfolio company folders",
                "tags": ["portfolio", "companies"],
                "subfolders": [
                    {
                        "name": "Due Diligence",
                        "description": "Due diligence materials and analysis",
                        "tags": ["dd", "analysis"]
                    },
                    {
                        "name": "Financial Reports",
                        "description": "Financial statements and reports",
                        "tags": ["financial", "reports"]
                    },
                    {
                        "name": "Board Materials",
                        "description": "Board meeting materials and minutes",
                        "tags": ["board", "governance"]
                    },
                    {
                        "name": "Cap Table",
                        "description": "Capitalization table documents",
                        "tags": ["cap-table", "equity"]
                    }
                ]
            },
            {
                "name": "Investment Memos",
                "description": "Investment decision documents",
                "tags": ["memos", "decisions"],
                "subfolders": [
                    {
                        "name": "Approved",
                        "tags": ["approved"]
                    },
                    {
                        "name": "Declined",
                        "tags": ["declined"]
                    },
                    {
                        "name": "Under Review",
                        "tags": ["review", "pending"]
                    }
                ]
            },
            {
                "name": "Fund Documents",
                "description": "Fund-level documentation",
                "tags": ["fund", "legal"],
                "subfolders": [
                    {
                        "name": "Legal",
                        "tags": ["legal"]
                    },
                    {
                        "name": "LPA",
                        "description": "Limited Partnership Agreements",
                        "tags": ["lpa", "agreements"]
                    }
                ]
            },
            {
                "name": "Reports to LPs",
                "description": "Limited partner reporting",
                "tags": ["lp", "reports"],
                "subfolders": [
                    {
                        "name": "Quarterly",
                        "tags": ["quarterly"]
                    },
                    {
                        "name": "Annual",
                        "tags": ["annual"]
                    }
                ]
            }
        ]
    }'::JSONB,
    (SELECT id FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1),
    ARRAY['investor', 'administrator'],
    true,
    true
) ON CONFLICT DO NOTHING;

-- VC Studio Due Diligence Structure
INSERT INTO workspace_file_structure_templates (
    template_name,
    description,
    structure_definition,
    app_uuid,
    applicable_roles,
    is_default,
    is_active
) VALUES (
    'VC Studio Due Diligence',
    'Comprehensive due diligence folder structure',
    '{
        "root_folders": [
            {
                "name": "Financial DD",
                "description": "Financial due diligence materials",
                "tags": ["financial", "dd"]
            },
            {
                "name": "Legal DD",
                "description": "Legal due diligence materials",
                "tags": ["legal", "dd"]
            },
            {
                "name": "Technical DD",
                "description": "Technical assessment materials",
                "tags": ["technical", "dd"]
            },
            {
                "name": "Market DD",
                "description": "Market analysis and research",
                "tags": ["market", "dd"]
            },
            {
                "name": "Team DD",
                "description": "Team background and references",
                "tags": ["team", "dd"]
            }
        ]
    }'::JSONB,
    (SELECT id FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1),
    ARRAY['investor', 'administrator'],
    false,
    true
) ON CONFLICT DO NOTHING;

-- VC Studio Fund Management Structure
INSERT INTO workspace_file_structure_templates (
    template_name,
    description,
    structure_definition,
    app_uuid,
    applicable_roles,
    is_default,
    is_active
) VALUES (
    'VC Studio Fund Management',
    'Fund management and operations structure',
    '{
        "root_folders": [
            {
                "name": "Fund Operations",
                "description": "Operational documents and processes",
                "tags": ["operations"]
            },
            {
                "name": "Compliance",
                "description": "Regulatory and compliance documents",
                "tags": ["compliance", "regulatory"]
            },
            {
                "name": "Investor Relations",
                "description": "LP communications and materials",
                "tags": ["ir", "lp"]
            }
        ]
    }'::JSONB,
    (SELECT id FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1),
    ARRAY['administrator'],
    false,
    true
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. SEED BUSINESS SERVICES CONFIGURATIONS
-- ============================================================================

-- VC Studio Investor Services
INSERT INTO workspace_business_services_configurations (
    config_name,
    description,
    services_config,
    app_uuid,
    created_by,
    is_active,
    version
) VALUES (
    'VC Studio Investor Services',
    'Default business services for investors',
    '{
        "workflows": [
            {
                "workflow_code": "investment_approval",
                "enabled": true,
                "params": {
                    "approval_chain": ["analyst", "partner", "gp"],
                    "notification_channels": ["email", "in_app"],
                    "sla_days": 14
                }
            },
            {
                "workflow_code": "portfolio_review",
                "enabled": true,
                "params": {
                    "review_frequency": "quarterly",
                    "auto_remind": true
                }
            }
        ],
        "notifications": {
            "channels": ["email", "in_app"],
            "rules": [
                {
                    "event": "portfolio_update",
                    "notify": "owner",
                    "frequency": "immediate"
                },
                {
                    "event": "board_meeting",
                    "notify": "all",
                    "frequency": "daily_digest"
                },
                {
                    "event": "document_uploaded",
                    "notify": "collaborators",
                    "frequency": "immediate"
                }
            ]
        },
        "automation_rules": [
            {
                "trigger": "file_uploaded",
                "condition": "file.tags contains financial",
                "action": "notify_owner"
            },
            {
                "trigger": "workspace_created",
                "action": "send_welcome_email"
            }
        ]
    }'::JSONB,
    (SELECT id FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1),
    NULL,
    true,
    '1.0'
) ON CONFLICT DO NOTHING;

-- VC Studio Administrator Services
INSERT INTO workspace_business_services_configurations (
    config_name,
    description,
    services_config,
    app_uuid,
    created_by,
    is_active,
    version
) VALUES (
    'VC Studio Administrator Services',
    'Default business services for administrators',
    '{
        "workflows": [
            {
                "workflow_code": "document_approval",
                "enabled": true,
                "params": {
                    "approval_required": true,
                    "notification_channels": ["email"]
                }
            }
        ],
        "notifications": {
            "channels": ["email", "in_app"],
            "rules": [
                {
                    "event": "workspace_created",
                    "notify": "owner",
                    "frequency": "immediate"
                },
                {
                    "event": "access_granted",
                    "notify": "owner",
                    "frequency": "immediate"
                }
            ]
        },
        "automation_rules": []
    }'::JSONB,
    (SELECT id FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1),
    NULL,
    true,
    '1.0'
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. SEED WORKSPACE TEMPLATES
-- ============================================================================

-- VC Studio Investor Workspace Template
INSERT INTO workspace_templates (
    template_code,
    template_name,
    description,
    dashboard_config_id,
    file_structure_template_id,
    business_services_config_id,
    app_uuid,
    applicable_roles,
    category,
    icon_name,
    is_featured,
    is_system_template,
    is_active
) VALUES (
    'VC_STUDIO_INVESTOR',
    'Venture Capital Investor Workspace',
    'Complete workspace setup for VC investors managing portfolios with pre-configured dashboard, file structure, and investment workflows',
    (SELECT id FROM workspace_dashboard_configurations WHERE config_name = 'VC Studio Investor Default' LIMIT 1),
    (SELECT id FROM workspace_file_structure_templates WHERE template_name = 'VC Studio Investment Portfolio' LIMIT 1),
    (SELECT id FROM workspace_business_services_configurations WHERE config_name = 'VC Studio Investor Services' LIMIT 1),
    (SELECT id FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1),
    ARRAY['investor'],
    'Investment Management',
    'trending-up',
    true,
    true,
    true
) ON CONFLICT (template_code) DO NOTHING;

-- VC Studio Administrator Workspace Template
INSERT INTO workspace_templates (
    template_code,
    template_name,
    description,
    dashboard_config_id,
    file_structure_template_id,
    business_services_config_id,
    app_uuid,
    applicable_roles,
    category,
    icon_name,
    is_featured,
    is_system_template,
    is_active
) VALUES (
    'VC_STUDIO_ADMINISTRATOR',
    'VC Studio Administrator Workspace',
    'Administrative workspace for managing fund operations and compliance with comprehensive file organization',
    (SELECT id FROM workspace_dashboard_configurations WHERE config_name = 'VC Studio Administrator Default' LIMIT 1),
    (SELECT id FROM workspace_file_structure_templates WHERE template_name = 'VC Studio Fund Management' LIMIT 1),
    (SELECT id FROM workspace_business_services_configurations WHERE config_name = 'VC Studio Administrator Services' LIMIT 1),
    (SELECT id FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1),
    ARRAY['administrator'],
    'Fund Management',
    'briefcase',
    true,
    true,
    true
) ON CONFLICT (template_code) DO NOTHING;

-- VC Studio Individual Workspace Template
INSERT INTO workspace_templates (
    template_code,
    template_name,
    description,
    dashboard_config_id,
    file_structure_template_id,
    business_services_config_id,
    app_uuid,
    applicable_roles,
    category,
    icon_name,
    is_featured,
    is_system_template,
    is_active
) VALUES (
    'VC_STUDIO_INDIVIDUAL',
    'Individual User Workspace',
    'Simple workspace for individual users with basic file management and task tracking',
    (SELECT id FROM workspace_dashboard_configurations WHERE config_name = 'VC Studio Individual Default' LIMIT 1),
    NULL,
    NULL,
    (SELECT id FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1),
    ARRAY['individual'],
    'Personal',
    'user',
    false,
    true,
    true
) ON CONFLICT (template_code) DO NOTHING;

-- VC Studio Due Diligence Workspace Template
INSERT INTO workspace_templates (
    template_code,
    template_name,
    description,
    dashboard_config_id,
    file_structure_template_id,
    business_services_config_id,
    app_uuid,
    applicable_roles,
    category,
    icon_name,
    is_featured,
    is_system_template,
    is_active
) VALUES (
    'VC_STUDIO_DUE_DILIGENCE',
    'Due Diligence Project Workspace',
    'Specialized workspace for conducting comprehensive due diligence on potential investments',
    (SELECT id FROM workspace_dashboard_configurations WHERE config_name = 'VC Studio Investor Default' LIMIT 1),
    (SELECT id FROM workspace_file_structure_templates WHERE template_name = 'VC Studio Due Diligence' LIMIT 1),
    (SELECT id FROM workspace_business_services_configurations WHERE config_name = 'VC Studio Investor Services' LIMIT 1),
    (SELECT id FROM applications WHERE app_code = 'VC_STUDIO' LIMIT 1),
    ARRAY['investor', 'administrator'],
    'Investment Management',
    'search',
    false,
    false,
    true
) ON CONFLICT (template_code) DO NOTHING;

-- Add comments
COMMENT ON TABLE workspace_dashboard_configurations IS 'Pre-configured dashboard layouts for different VC Studio roles';
COMMENT ON TABLE workspace_file_structure_templates IS 'Pre-defined folder hierarchies for various VC Studio workflows';
COMMENT ON TABLE workspace_business_services_configurations IS 'Business logic configurations for VC Studio workflows and automation';
COMMENT ON TABLE workspace_templates IS 'Complete workspace templates combining dashboard, files, and services for VC Studio';
