-- ============================================================================
-- PHASE 1C: Component Registry & File System Architecture
-- File: 20251109150000_phase1c_components_registry.sql
-- Purpose: Create components_registry table and extend nodes table for Phase 1c
-- Dependencies: app_uuid multitenancy, stakeholders.core_config
-- ============================================================================

-- ============================================================================
-- STEP 1a: Create components_registry table
-- ============================================================================

CREATE TABLE IF NOT EXISTS components_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Component Identity
    component_code TEXT UNIQUE NOT NULL,  -- e.g., 'file_explorer', 'workflow_tasks', 'vc_pyramid'
    component_name TEXT NOT NULL,          -- Display name: 'File Explorer'
    description TEXT,                      -- What this component does

    -- UI & Navigation
    icon_name TEXT,                        -- 'folder', 'upload', 'layers', etc. (lucide-react icon)
    route_path TEXT,                       -- e.g., '/workspace/files', '/workspace/workflows'
    widget_component_name TEXT NOT NULL,   -- React component name: 'FileExplorer', 'WorkflowTasks'

    -- Access Control
    required_permissions TEXT[] DEFAULT '{}',  -- e.g., ['READ_FILES', 'WRITE_FILES']
    required_role_codes TEXT[] DEFAULT '{}',   -- e.g., ['admin', 'producer']
    min_proficiency_level TEXT DEFAULT 'awareness', -- Capability requirement

    -- Functional Configuration
    supports_params BOOLEAN DEFAULT true,       -- Can accept dynamic parameters
    default_params JSONB DEFAULT '{}',          -- Default configuration
    parameters_schema JSONB DEFAULT '{}',       -- JSON Schema for validation

    -- File System Integration
    creates_nodes BOOLEAN DEFAULT false,        -- If true, component creates file system nodes
    node_type_created TEXT,                     -- 'file' or 'folder' (if creates_nodes=true)

    -- UI Behaviour
    launch_in_modal BOOLEAN DEFAULT false,      -- Opens in modal vs. main workspace
    launch_in_sidebar BOOLEAN DEFAULT false,    -- Opens in sidebar panel
    supports_full_screen BOOLEAN DEFAULT true,  -- Can expand to full screen

    -- State & Data Fetching
    data_fetch_query TEXT,  -- SQL or API endpoint for initial data load
    realtime_updates BOOLEAN DEFAULT false,     -- WebSocket/subscription for live updates

    -- Monitoring & Governance
    is_active BOOLEAN DEFAULT true,
    is_beta BOOLEAN DEFAULT false,
    version TEXT DEFAULT '1.0',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Multi-tenancy (FIXED: references site_settings.app_uuid not applications.uuid)
    app_uuid UUID NOT NULL REFERENCES site_settings(app_uuid) ON DELETE CASCADE
);

-- Create indexes on components_registry
CREATE INDEX IF NOT EXISTS idx_components_registry_code ON components_registry(component_code);
CREATE INDEX IF NOT EXISTS idx_components_registry_active ON components_registry(is_active);
CREATE INDEX IF NOT EXISTS idx_components_registry_app ON components_registry(app_uuid);

-- Add table comment
COMMENT ON TABLE components_registry IS 'Registry of all available dashboard components/widgets with their configuration and access requirements';

-- Enable RLS on components_registry
ALTER TABLE components_registry ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Authenticated users can see active components for their app
CREATE POLICY "components_registry_select" ON components_registry
    FOR SELECT USING (
        is_active = true
        AND app_uuid IN (
            SELECT app_uuid FROM stakeholders
            WHERE auth_user_id = auth.uid()
        )
    );

-- ============================================================================
-- STEP 1b: Extend nodes table with component fields
-- ============================================================================

-- Add component type to CHECK constraint
DO $$
BEGIN
    -- Drop existing constraint
    ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_type_check;

    -- Add new constraint with 'component' type
    ALTER TABLE nodes ADD CONSTRAINT nodes_type_check
        CHECK (type IN ('file', 'folder', 'component'));

    RAISE NOTICE '✓ Updated nodes type constraint to include component';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠ Error updating type constraint: %', SQLERRM;
END $$;

-- Add reference field (unique identifier)
ALTER TABLE nodes
ADD COLUMN IF NOT EXISTS reference TEXT UNIQUE
DEFAULT ('NODE-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8));

-- Add component-related fields
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS component_id UUID REFERENCES components_registry(id) ON DELETE SET NULL;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS component_config JSONB DEFAULT '{}';
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS component_state JSONB DEFAULT '{}';

-- Add file metadata fields
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- Add workflow integration fields
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS associated_workflow_id UUID;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS activity_code TEXT;

-- Add audit field
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Add unique constraint for folder/file names
DO $$
BEGIN
    -- Drop old constraint if exists
    ALTER TABLE nodes DROP CONSTRAINT IF EXISTS unique_name_in_folder;

    -- Add constraint to prevent duplicate names in same folder
    ALTER TABLE nodes ADD CONSTRAINT unique_name_in_folder
        UNIQUE(parent_id, name, owner_id);

    RAISE NOTICE '✓ Added unique constraint for folder/file names';
EXCEPTION
    WHEN duplicate_table THEN
        RAISE NOTICE '⚠ Constraint already exists';
END $$;

-- Add CHECK constraints for data integrity
ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_file_storage_path_check;
ALTER TABLE nodes ADD CONSTRAINT nodes_file_storage_path_check
    CHECK (
        -- If type='file', file_storage_path must be set
        (type = 'file' AND file_storage_path IS NOT NULL)
        OR (type != 'file')
    );

ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_component_id_check;
ALTER TABLE nodes ADD CONSTRAINT nodes_component_id_check
    CHECK (
        -- If type='component', component_id must be set
        (type = 'component' AND component_id IS NOT NULL)
        OR (type != 'component')
    );

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_nodes_component_id ON nodes(component_id);
CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
CREATE INDEX IF NOT EXISTS idx_nodes_created_at ON nodes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nodes_workflow ON nodes(associated_workflow_id);

-- Add column comments
COMMENT ON COLUMN nodes.reference IS 'Unique human-readable identifier for the node';
COMMENT ON COLUMN nodes.component_id IS 'Reference to component in components_registry (for type=component)';
COMMENT ON COLUMN nodes.component_config IS 'Instance-specific configuration for component';
COMMENT ON COLUMN nodes.component_state IS 'Runtime state (last opened, position, etc.)';
COMMENT ON COLUMN nodes.mime_type IS 'MIME type for files (e.g., application/pdf)';
COMMENT ON COLUMN nodes.description IS 'User-provided description';
COMMENT ON COLUMN nodes.tags IS 'Array of tags for categorization';
COMMENT ON COLUMN nodes.is_shared IS 'Whether this node is shared with other users';
COMMENT ON COLUMN nodes.associated_workflow_id IS 'Workflow instance that created/uses this node';
COMMENT ON COLUMN nodes.activity_code IS 'VCEF activity code that created this node';
COMMENT ON COLUMN nodes.created_by IS 'User who created this node';

-- Update RLS policies for nodes (extend existing policies to handle shared nodes)
DROP POLICY IF EXISTS nodes_owner_access ON nodes;
CREATE POLICY "nodes_owner_access" ON nodes
    FOR SELECT USING (
        owner_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
        OR is_shared = true
    );

-- Ensure INSERT policy includes app_uuid check
DROP POLICY IF EXISTS nodes_owner_insert ON nodes;
CREATE POLICY "nodes_owner_insert" ON nodes
    FOR INSERT WITH CHECK (
        owner_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
        AND app_uuid IN (
            SELECT app_uuid FROM stakeholders WHERE auth_user_id = auth.uid()
        )
    );

-- Ensure UPDATE policy is correct
DROP POLICY IF EXISTS nodes_owner_update ON nodes;
CREATE POLICY "nodes_owner_update" ON nodes
    FOR UPDATE USING (
        owner_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    ) WITH CHECK (
        owner_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    );

-- Ensure DELETE policy is correct
DROP POLICY IF EXISTS nodes_owner_delete ON nodes;
CREATE POLICY "nodes_owner_delete" ON nodes
    FOR DELETE USING (
        owner_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_components_count INT;
    v_nodes_count INT;
BEGIN
    RAISE NOTICE '=== VERIFICATION: Phase 1c Migration ===';

    -- Check components_registry exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'components_registry') THEN
        SELECT COUNT(*) INTO v_components_count FROM components_registry;
        RAISE NOTICE '✓ components_registry table exists (% rows)', v_components_count;
    ELSE
        RAISE WARNING '⚠ components_registry table NOT FOUND';
    END IF;

    -- Check nodes extensions
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nodes' AND column_name = 'component_id') THEN
        RAISE NOTICE '✓ nodes.component_id column exists';
    ELSE
        RAISE WARNING '⚠ nodes.component_id column NOT FOUND';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nodes' AND column_name = 'component_config') THEN
        RAISE NOTICE '✓ nodes.component_config column exists';
    ELSE
        RAISE WARNING '⚠ nodes.component_config column NOT FOUND';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nodes' AND column_name = 'reference') THEN
        RAISE NOTICE '✓ nodes.reference column exists';
    ELSE
        RAISE WARNING '⚠ nodes.reference column NOT FOUND';
    END IF;

    -- Check indexes
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'components_registry' AND indexname = 'idx_components_registry_code') THEN
        RAISE NOTICE '✓ Index idx_components_registry_code exists';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'nodes' AND indexname = 'idx_nodes_component_id') THEN
        RAISE NOTICE '✓ Index idx_nodes_component_id exists';
    END IF;

    SELECT COUNT(*) INTO v_nodes_count FROM nodes;
    RAISE NOTICE '✓ nodes table has % rows', v_nodes_count;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Phase 1c Step 1 (Database Tables) COMPLETE';
    RAISE NOTICE '========================================';
END $$;
