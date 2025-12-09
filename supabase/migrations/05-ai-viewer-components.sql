-- ============================================================================
-- AI VIEWER COMPONENTS - MIGRATION FILE
-- File: 05-ai-viewer-components.sql
-- Purpose: Add AI Viewer component types to registry for rendering AI prompt outputs
-- Prerequisites: 04-interfaces-llm.sql completed, component_registry table exists
-- Sprint: 1d.7 FLM Building Specification
-- ============================================================================

-- ============================================================================
-- ASSUMPTIONS & VALIDATION
-- ============================================================================
-- This migration assumes either:
-- A) A unified_registry table exists (from Sprint 1d.2 Option A), OR
-- B) A components_registry table exists (from Sprint 1d.2 Option B)
--
-- Adjust table name below based on your implementation:
-- ============================================================================

DO $$
BEGIN
    -- Check if unified_registry exists (Option A)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'unified_registry') THEN
        RAISE NOTICE 'Using unified_registry structure';
    -- Check if components_registry exists (Option B)
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'components_registry') THEN
        RAISE NOTICE 'Using components_registry structure';
    ELSE
        RAISE EXCEPTION 'Neither unified_registry nor components_registry table found. Run Sprint 1d.2 migration first.';
    END IF;
END $$;

-- ============================================================================
-- AI PROMPTS TABLE EXTENSION - Add default viewer reference
-- ============================================================================

-- Create ai_prompts table if it doesn't exist (from your screenshot it exists)
CREATE TABLE IF NOT EXISTS ai_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Categorization
    category TEXT NOT NULL, -- 'FLM', 'DOCUMENT', 'ANALYSIS', etc.
    
    -- AI Configuration
    model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    max_tokens INTEGER DEFAULT 4096,
    temperature NUMERIC DEFAULT 0.7,
    
    -- Prompt content
    system_prompt TEXT,
    user_prompt_template TEXT NOT NULL,
    output_format TEXT DEFAULT 'json', -- 'json', 'text', 'markdown'
    
    -- Input variables
    input_variables JSONB DEFAULT '[]', -- Array of {name, type, description, required}
    
    -- Metadata
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
    version INTEGER DEFAULT 1,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add default_viewer_code column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_prompts' AND column_name = 'default_viewer_code'
    ) THEN
        ALTER TABLE ai_prompts ADD COLUMN default_viewer_code TEXT;
        RAISE NOTICE 'Added default_viewer_code column to ai_prompts';
    END IF;
END $$;

-- ============================================================================
-- AI VIEWER COMPONENT REGISTRY ENTRIES
-- ============================================================================
-- These are reusable viewer configurations for rendering AI outputs
-- ============================================================================

-- ============================================================================
-- STEP 1: Extend CHECK constraint to allow AI_VIEWER type
-- ============================================================================

ALTER TABLE components_registry 
DROP CONSTRAINT IF EXISTS components_registry_registry_type_check;

ALTER TABLE components_registry 
ADD CONSTRAINT components_registry_registry_type_check 
CHECK (
    registry_type = ANY (ARRAY[
        'UI_COMPONENT'::text,
        'AI_FUNCTION'::text,
        'WORKFLOW_TASK'::text,
        'ADMIN_TOOL'::text,
        'AI_VIEWER'::text  -- NEW: Support for AI output viewers
    ])
);

-- ============================================================================
-- STEP 2: Insert AI Viewer Components
-- ============================================================================

-- Get the default app_uuid (adjust if you have multiple apps)
DO $$
DECLARE
    default_app_uuid UUID;
BEGIN
    -- Get the first app_uuid from site_settings
    SELECT app_uuid INTO default_app_uuid 
    FROM site_settings 
    LIMIT 1;
    
    IF default_app_uuid IS NULL THEN
        RAISE EXCEPTION 'No app_uuid found in site_settings. Create an app first.';
    END IF;
    
    RAISE NOTICE 'Using app_uuid: %', default_app_uuid;
END $$;

INSERT INTO components_registry (
    component_code,
    component_name,
    registry_type,
    description,
    widget_component_name,
    default_params,
    is_active,
    app_uuid
) VALUES

-- DBS Card Viewer - Structured business summary cards
('DBS_CARD_VIEW', 'DBS Card Viewer', 'AI_VIEWER',
 'Displays Domain Business Summary as structured cards with sections for identity, products, market, supply chain, revenue model',
 'DomainBusinessSummaryViewer',
 jsonb_build_object(
    'component_type', 'card_grid',
    'layout', jsonb_build_object(
        'columns', 2,
        'spacing', 'large',
        'responsive', true
    ),
    'sections', jsonb_build_array(
        jsonb_build_object('key', 'business_identity', 'title', 'Business Identity', 'icon', 'building', 'color', 'blue'),
        jsonb_build_object('key', 'products_services', 'title', 'Products & Services', 'icon', 'package', 'color', 'green'),
        jsonb_build_object('key', 'target_market', 'title', 'Target Market', 'icon', 'users', 'color', 'purple'),
        jsonb_build_object('key', 'supply_chain', 'title', 'Supply Chain', 'icon', 'truck', 'color', 'orange'),
        jsonb_build_object('key', 'revenue_model', 'title', 'Revenue Model', 'icon', 'dollar-sign', 'color', 'emerald'),
        jsonb_build_object('key', 'key_differentiators', 'title', 'Differentiators', 'icon', 'star', 'color', 'yellow')
    ),
    'field_rendering', jsonb_build_object(
        'arrays', 'bullet_list',
        'objects', 'nested_cards',
        'strings', 'paragraph',
        'hide_schema', true
    )
 ),
 true,
 (SELECT app_uuid FROM site_settings LIMIT 1)
),

-- L0 Domain Study Viewer
('L0_DOMAIN_VIEWER', 'L0 Domain Study Viewer', 'AI_VIEWER',
 'Displays L0 Domain Study with tabs for context, analysis, stakeholders, and strategic insights',
 'L0DomainStudyViewer',
 jsonb_build_object(
    'component_type', 'tabbed_view',
    'tabs', jsonb_build_array(
        jsonb_build_object('key', 'domain_context', 'label', 'Domain Context', 'icon', 'map'),
        jsonb_build_object('key', 'business_analysis', 'label', 'Business Analysis', 'icon', 'trending-up'),
        jsonb_build_object('key', 'stakeholder_map', 'label', 'Stakeholders', 'icon', 'users'),
        jsonb_build_object('key', 'strategic_insights', 'label', 'Strategic Insights', 'icon', 'lightbulb')
    ),
    'visualization', jsonb_build_object(
        'enable_charts', true,
        'enable_diagrams', true
    )
 ),
 true,
 (SELECT app_uuid FROM site_settings LIMIT 1)
),

-- JSON Tree Viewer
('JSON_TREE_VIEWER', 'JSON Tree Viewer', 'AI_VIEWER',
 'Generic expandable JSON tree view with syntax highlighting',
 'JsonTreeViewer',
 jsonb_build_object(
    'component_type', 'json_tree',
    'features', jsonb_build_object(
        'collapsible', true,
        'syntax_highlighting', true,
        'copy_button', true,
        'search', true
    ),
    'theme', 'light'
 ),
 true,
 (SELECT app_uuid FROM site_settings LIMIT 1)
),

-- Table Viewer
('TABLE_VIEWER', 'Table Viewer', 'AI_VIEWER',
 'Displays array data in sortable, filterable table format',
 'TableViewer',
 jsonb_build_object(
    'component_type', 'data_table',
    'features', jsonb_build_object(
        'sortable', true,
        'filterable', true,
        'paginated', true,
        'exportable', true
    ),
    'default_page_size', 10
 ),
 true,
 (SELECT app_uuid FROM site_settings LIMIT 1)
),

-- Document Viewer
('DOCUMENT_VIEWER', 'Document Viewer', 'AI_VIEWER',
 'Renders markdown or rich text documents with formatting',
 'DocumentViewer',
 jsonb_build_object(
    'component_type', 'document',
    'format', 'markdown',
    'features', jsonb_build_object(
        'table_of_contents', true,
        'print_button', true,
        'export_pdf', true
    )
 ),
 true,
 (SELECT app_uuid FROM site_settings LIMIT 1)
)

ON CONFLICT (component_code) DO UPDATE SET
    default_params = EXCLUDED.default_params,
    description = EXCLUDED.description,
    widget_component_name = EXCLUDED.widget_component_name,
    updated_at = NOW();


-- ============================================================================
-- UPDATE AI PROMPTS WITH DEFAULT VIEWERS
-- ============================================================================

UPDATE ai_prompts SET default_viewer_code = 'DBS_CARD_VIEW' 
WHERE code = 'BVS_TO_DBS';

UPDATE ai_prompts SET default_viewer_code = 'L0_DOMAIN_VIEWER' 
WHERE code = 'DBS_TO_L0';

UPDATE ai_prompts SET default_viewer_code = 'L0_DOMAIN_VIEWER' 
WHERE code = 'L0_TO_L1';

UPDATE ai_prompts SET default_viewer_code = 'L0_DOMAIN_VIEWER' 
WHERE code = 'L1_TO_L2';

UPDATE ai_prompts SET default_viewer_code = 'DOCUMENT_VIEWER' 
WHERE code IN ('FLM_TO_BLUEPRINT', 'FLM_TO_ONE_PAGER', 'FLM_TO_PITCH_DECK');

-- ============================================================================
-- AI PROMPT EXECUTION RESULTS TABLE
-- ============================================================================
-- Store execution results with rendered viewer config for Test Harness
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_prompt_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference TEXT UNIQUE NOT NULL DEFAULT ('EXEC-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(uuid_generate_v4()::text, 1, 8)),
    
    -- Prompt context
    prompt_id UUID REFERENCES ai_prompts(id),
    prompt_code TEXT NOT NULL,
    
    -- Input
    input_variables JSONB DEFAULT '{}',
    rendered_prompt TEXT,
    
    -- Execution details
    model TEXT NOT NULL,
    llm_interface_id UUID REFERENCES llm_interfaces(id),
    
    -- Output
    raw_response TEXT,
    parsed_output JSONB,
    output_format TEXT, -- 'json', 'text', 'markdown'
    
    -- Viewer configuration
    viewer_code TEXT, -- Reference to component_registry
    viewer_rendered BOOLEAN DEFAULT false,
    
    -- Metrics
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout')),
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    cost_estimate NUMERIC(10,4),
    duration_seconds NUMERIC(6,2),
    
    -- Error handling
    error_message TEXT,
    error_details JSONB,
    
    -- Association
    stakeholder_id UUID REFERENCES stakeholders(id), -- If executed in stakeholder context
    app_uuid UUID, -- Multi-tenancy
    
    -- Metadata
    executed_by UUID REFERENCES users(id),
    execution_source TEXT DEFAULT 'test_harness', -- 'test_harness', 'workflow', 'api', 'manual'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_prompt_executions_prompt_code ON ai_prompt_executions(prompt_code);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_executions_status ON ai_prompt_executions(status);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_executions_stakeholder ON ai_prompt_executions(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_executions_app_uuid ON ai_prompt_executions(app_uuid);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_executions_created_at ON ai_prompt_executions(created_at DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get viewer config for a prompt execution
CREATE OR REPLACE FUNCTION get_viewer_config_for_execution(execution_id UUID)
RETURNS JSONB AS $$
DECLARE
    viewer_config JSONB;
    viewer_code_val TEXT;
BEGIN
    -- Get the viewer code from execution or prompt default
    SELECT COALESCE(
        e.viewer_code,
        p.default_viewer_code,
        'JSON_TREE_VIEWER'  -- Fallback to generic viewer
    ) INTO viewer_code_val
    FROM ai_prompt_executions e
    LEFT JOIN ai_prompts p ON e.prompt_code = p.code
    WHERE e.id = execution_id;
    
    -- Get the viewer config from components_registry
    SELECT default_params INTO viewer_config
    FROM components_registry
    WHERE component_code = viewer_code_val
    AND registry_type = 'AI_VIEWER'
    AND is_active = true;
    
    RETURN viewer_config;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- EXAMPLE VIEWER CONFIG QUERIES
-- ============================================================================

-- View all available AI viewers
COMMENT ON TABLE components_registry IS 'Component registry including AI_VIEWER types for rendering AI prompt outputs';

-- Query to see all AI viewers
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== Available AI Viewers ===';
    RAISE NOTICE 'Run this query to see all AI viewer components:';
    RAISE NOTICE 'SELECT component_code, component_name, widget_component_name, description FROM components_registry WHERE registry_type = ''AI_VIEWER'' ORDER BY component_code;';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- VERIFICATION & COMPLETION
-- ============================================================================

DO $$
DECLARE
    viewer_count INTEGER;
    prompt_count INTEGER;
BEGIN
    -- Count AI viewers
    SELECT COUNT(*) INTO viewer_count
    FROM components_registry
    WHERE registry_type = 'AI_VIEWER';
    
    -- Count prompts with viewers
    SELECT COUNT(*) INTO prompt_count
    FROM ai_prompts
    WHERE default_viewer_code IS NOT NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '✓ AI VIEWER COMPONENTS MIGRATION - COMPLETED';
    RAISE NOTICE '✓ % AI viewer components registered', viewer_count;
    RAISE NOTICE '✓ % AI prompts configured with default viewers', prompt_count;
    RAISE NOTICE '✓ ai_prompt_executions table created for Test Harness results';
    RAISE NOTICE '✓ Helper function get_viewer_config_for_execution() created';
    RAISE NOTICE '';
    RAISE NOTICE 'Verify viewers:';
    RAISE NOTICE 'SELECT component_code, component_name, widget_component_name FROM components_registry WHERE registry_type = ''AI_VIEWER'';';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Build React viewer components in /components/viewers/';
    RAISE NOTICE '2. Component names: DomainBusinessSummaryViewer, JsonTreeViewer, TableViewer, DocumentViewer, L0DomainStudyViewer';
    RAISE NOTICE '3. Update Test Harness to use ViewerRegistry for rendering';
    RAISE NOTICE '4. Test DBS_CARD_VIEW with your coffee roaster test data';
    RAISE NOTICE '';
END $$;
