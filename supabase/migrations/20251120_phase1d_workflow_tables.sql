-- ============================================================================
-- PHASE 1D: Workflow Management System - Database Schema
-- File: 20251120_phase1d_workflow_tables.sql
-- Purpose: Create complete PostgreSQL database schema for workflow orchestration
-- Sprint: 1d.1 - Database Schema Implementation
-- Dependencies: applications table (app_code), auth.jwt() function
-- 
-- NOTE: This migration requires an 'applications' table with 'app_code' column.
--       If the applications table does not exist, create it first or modify
--       the foreign key constraints to reference an existing table.
-- ============================================================================

-- ============================================================================
-- TABLE 1: workflow_definitions
-- Purpose: Workflow blueprints (outer JSON structure)
-- Description: Stores workflow templates/definitions that define the structure
--              and flow of business processes. Each workflow can have multiple
--              versions and is scoped to a specific application.
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenancy: Application isolation
    app_code TEXT NOT NULL,
    
    -- Workflow Identity
    workflow_code TEXT NOT NULL,           -- Unique identifier: 'onboarding_workflow', 'approval_process'
    name TEXT NOT NULL,                    -- Display name: 'Onboarding Workflow'
    description TEXT,                      -- What this workflow does
    
    -- Workflow Structure
    model_structure JSONB NOT NULL,        -- Complete workflow definition (nodes, edges, conditions)
    version INTEGER NOT NULL DEFAULT 1,    -- Version number for workflow evolution
    
    -- Status & Lifecycle
    status TEXT NOT NULL DEFAULT 'DRAFT',  -- DRAFT, ACTIVE, DEPRECATED
    is_active BOOLEAN DEFAULT true,        -- Soft delete flag
    
    -- L4 Operation Code (for integration with higher-level systems)
    l4_operation_code TEXT,                -- Optional: links to L4 operation definitions
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,                       -- References stakeholders.id or users.id
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID,                       -- References stakeholders.id or users.id
    
    -- Constraints
    CONSTRAINT workflow_definitions_app_workflow_version_unique 
        UNIQUE (app_code, workflow_code, version),
    CONSTRAINT workflow_definitions_status_check 
        CHECK (status IN ('DRAFT', 'ACTIVE', 'DEPRECATED')),
    CONSTRAINT workflow_definitions_app_code_fk 
        FOREIGN KEY (app_code) REFERENCES applications(app_code) ON DELETE CASCADE
);

-- Indexes for workflow_definitions
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_app_status 
    ON workflow_definitions(app_code, status);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_app_workflow_version 
    ON workflow_definitions(app_code, workflow_code, version);

-- Table comment
COMMENT ON TABLE workflow_definitions IS 
    'Workflow blueprints/templates that define business process structures. Each workflow can have multiple versions for evolution.';

-- Column comments
COMMENT ON COLUMN workflow_definitions.model_structure IS 
    'Complete workflow definition in JSON format containing nodes, edges, conditions, and execution logic';
COMMENT ON COLUMN workflow_definitions.l4_operation_code IS 
    'Optional link to L4 operation definitions for integration with higher-level business operations';

-- ============================================================================
-- TABLE 2: workflow_instances
-- Purpose: Runtime instances (state machine execution)
-- Description: Represents an active or completed execution of a workflow.
--              Each instance tracks its current state, input data, and lifecycle.
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenancy: Application isolation
    app_code TEXT NOT NULL,
    
    -- Workflow Reference
    workflow_definition_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE RESTRICT,
    workflow_code TEXT NOT NULL,           -- Denormalized for performance
    
    -- State Machine State
    current_node_id TEXT,                  -- Current node in the workflow execution
    status TEXT NOT NULL DEFAULT 'RUNNING', -- RUNNING, COMPLETED, SUSPENDED, ERROR
    
    -- Execution Data
    input_data JSONB DEFAULT '{}',         -- Initial input data for the workflow
    error_message TEXT,                    -- Error details if status = ERROR
    
    -- Lifecycle Tracking
    initiated_by UUID,                     -- References stakeholders.id
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE, -- When workflow finished (success or error)
    suspended_at TIMESTAMP WITH TIME ZONE, -- When workflow was suspended
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,        -- Soft delete flag
    
    -- Constraints
    CONSTRAINT workflow_instances_status_check 
        CHECK (status IN ('RUNNING', 'COMPLETED', 'SUSPENDED', 'ERROR')),
    CONSTRAINT workflow_instances_app_code_fk 
        FOREIGN KEY (app_code) REFERENCES applications(app_code) ON DELETE CASCADE
);

-- Indexes for workflow_instances
CREATE INDEX IF NOT EXISTS idx_workflow_instances_app_status 
    ON workflow_instances(app_code, status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_app_initiated_at 
    ON workflow_instances(app_code, initiated_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_current_node 
    ON workflow_instances(current_node_id);

-- Table comment
COMMENT ON TABLE workflow_instances IS 
    'Runtime instances of workflow executions. Each row represents a single execution of a workflow definition.';

-- Column comments
COMMENT ON COLUMN workflow_instances.current_node_id IS 
    'Current position in the workflow execution. Updated as workflow progresses through nodes.';

-- ============================================================================
-- TABLE 3: instance_tasks
-- Purpose: Work tokens for individual tasks
-- Description: Represents individual tasks within a workflow instance. Each task
--              can be a user task, service task, or AI agent task. Tasks track
--              their assignment, execution status, and results.
-- ============================================================================

CREATE TABLE IF NOT EXISTS instance_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenancy: Application isolation
    app_code TEXT NOT NULL,
    
    -- Workflow Instance Reference
    workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    workflow_code TEXT NOT NULL,           -- Denormalized for performance
    
    -- Task Identity
    function_code TEXT NOT NULL,           -- References function_registry.function_code
    node_id TEXT NOT NULL,                 -- Node in workflow where this task executes
    task_type TEXT NOT NULL,               -- USER_TASK, SERVICE_TASK, AI_AGENT_TASK
    
    -- Task State
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, RUNNING, COMPLETED, FAILED
    
    -- Task Data
    input_data JSONB DEFAULT '{}',        -- Input data for the task
    output_data JSONB,                     -- Output data after task completion
    
    -- Assignment & Execution
    assigned_to UUID,                      -- References stakeholders.id (for USER_TASK)
    assigned_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,  -- When task execution began
    completed_at TIMESTAMP WITH TIME ZONE, -- When task finished
    
    -- Error Handling
    error_message TEXT,                    -- Error details if status = FAILED
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,        -- Soft delete flag
    
    -- Constraints
    CONSTRAINT instance_tasks_status_check 
        CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
    CONSTRAINT instance_tasks_task_type_check 
        CHECK (task_type IN ('USER_TASK', 'SERVICE_TASK', 'AI_AGENT_TASK')),
    CONSTRAINT instance_tasks_app_code_fk 
        FOREIGN KEY (app_code) REFERENCES applications(app_code) ON DELETE CASCADE,
    CONSTRAINT instance_tasks_function_code_fk 
        FOREIGN KEY (function_code) REFERENCES function_registry(function_code) ON DELETE RESTRICT
);

-- Indexes for instance_tasks
CREATE INDEX IF NOT EXISTS idx_instance_tasks_app_status 
    ON instance_tasks(app_code, status);
CREATE INDEX IF NOT EXISTS idx_instance_tasks_app_assigned_status 
    ON instance_tasks(app_code, assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_instance_tasks_instance_node 
    ON instance_tasks(workflow_instance_id, node_id);

-- Table comment
COMMENT ON TABLE instance_tasks IS 
    'Individual tasks within workflow instances. Represents work tokens that need to be executed.';

-- Column comments
COMMENT ON COLUMN instance_tasks.function_code IS 
    'References the function_registry to determine how this task should be executed';
COMMENT ON COLUMN instance_tasks.assigned_to IS 
    'For USER_TASK types, this indicates which stakeholder is assigned to complete the task';

-- ============================================================================
-- TABLE 4: instance_context
-- Purpose: Workflow execution data (accumulated)
-- Description: Stores accumulated context data for workflow instances. This allows
--              versioning of context data as the workflow progresses, enabling
--              rollback and audit capabilities.
-- ============================================================================

CREATE TABLE IF NOT EXISTS instance_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenancy: Application isolation
    app_code TEXT NOT NULL,
    
    -- Workflow Instance Reference
    workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    
    -- Context Data
    context_data JSONB NOT NULL DEFAULT '{}', -- Accumulated execution context
    version INTEGER NOT NULL DEFAULT 1,        -- Version number for context snapshots
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT instance_context_instance_version_unique 
        UNIQUE (workflow_instance_id, version),
    CONSTRAINT instance_context_app_code_fk 
        FOREIGN KEY (app_code) REFERENCES applications(app_code) ON DELETE CASCADE
);

-- Indexes for instance_context
CREATE INDEX IF NOT EXISTS idx_instance_context_app_instance 
    ON instance_context(app_code, workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_instance_context_instance_version 
    ON instance_context(workflow_instance_id, version DESC);

-- Table comment
COMMENT ON TABLE instance_context IS 
    'Accumulated execution context for workflow instances. Supports versioning for rollback and audit.';

-- Column comments
COMMENT ON COLUMN instance_context.context_data IS 
    'Accumulated data from workflow execution. Updated as workflow progresses through nodes.';
COMMENT ON COLUMN instance_context.version IS 
    'Version number for context snapshots. Increments as context is updated.';

-- ============================================================================
-- TABLE 5: workflow_history
-- Purpose: Immutable audit log
-- Description: Complete audit trail of all events in workflow execution.
--              This table is append-only and provides full traceability.
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenancy: Application isolation
    app_code TEXT NOT NULL,
    
    -- Workflow Instance Reference
    workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    
    -- Event Details
    event_type TEXT NOT NULL,             -- Event type (see CHECK constraint)
    node_id TEXT,                          -- Node where event occurred
    task_id UUID REFERENCES instance_tasks(id) ON DELETE SET NULL, -- Related task (if applicable)
    from_node_id TEXT,                     -- Source node (for transitions)
    to_node_id TEXT,                       -- Target node (for transitions)
    description TEXT,                      -- Human-readable event description
    metadata JSONB DEFAULT '{}',           -- Additional event metadata
    
    -- Actor Information
    actor_id UUID,                         -- References stakeholders.id (who triggered event)
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When event occurred
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT workflow_history_event_type_check 
        CHECK (event_type IN (
            'INSTANCE_CREATED',
            'NODE_ENTERED',
            'TASK_CREATED',
            'TASK_COMPLETED',
            'TASK_FAILED',
            'TRANSITION',
            'INSTANCE_COMPLETED',
            'INSTANCE_SUSPENDED'
        )),
    CONSTRAINT workflow_history_app_code_fk 
        FOREIGN KEY (app_code) REFERENCES applications(app_code) ON DELETE CASCADE
);

-- Indexes for workflow_history
CREATE INDEX IF NOT EXISTS idx_workflow_history_app_instance_timestamp 
    ON workflow_history(app_code, workflow_instance_id, event_timestamp);
CREATE INDEX IF NOT EXISTS idx_workflow_history_app_timestamp 
    ON workflow_history(app_code, event_timestamp DESC);

-- Table comment
COMMENT ON TABLE workflow_history IS 
    'Immutable audit log of all workflow execution events. Provides complete traceability and debugging capabilities.';

-- Column comments
COMMENT ON COLUMN workflow_history.event_type IS 
    'Type of event that occurred in the workflow execution';
COMMENT ON COLUMN workflow_history.metadata IS 
    'Additional event-specific data stored as JSON for flexibility';

-- ============================================================================
-- TABLE 6: function_registry
-- Purpose: Execution contracts for all functions
-- Description: Registry of all executable functions (user tasks, service tasks,
--              AI agent tasks) that can be invoked within workflows. Defines
--              the contract, schema, and execution details for each function.
-- ============================================================================

CREATE TABLE IF NOT EXISTS function_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenancy: Application isolation (nullable for shared functions)
    app_code TEXT,                          -- NULL for shared/cross-app functions
    
    -- Function Identity
    function_code TEXT NOT NULL,           -- Unique identifier: 'approve_document', 'send_email'
    
    -- Implementation Details
    implementation_type TEXT NOT NULL,      -- USER_TASK, SERVICE_TASK, AI_AGENT_TASK
    endpoint_or_path TEXT,                  -- API endpoint or file path for execution
    input_schema JSONB DEFAULT '{}',        -- JSON Schema for input validation
    output_schema JSONB DEFAULT '{}',      -- JSON Schema for output validation
    
    -- UI Integration
    ui_widget_id TEXT,                     -- UI widget to render (for USER_TASK)
    ui_definitions JSONB DEFAULT '{}',      -- UI configuration and layout
    
    -- Metadata
    description TEXT,                       -- What this function does
    version TEXT DEFAULT '1.0',            -- Function version
    tags TEXT[] DEFAULT '{}',              -- Searchable tags
    
    -- Execution Configuration
    timeout_seconds INTEGER DEFAULT 300,    -- Maximum execution time (seconds)
    retry_count INTEGER DEFAULT 0,         -- Number of retry attempts on failure
    
    -- Status & Lifecycle
    is_active BOOLEAN DEFAULT true,        -- Whether function is available
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,                        -- References stakeholders.id
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID,                        -- References stakeholders.id
    
    -- Constraints
    CONSTRAINT function_registry_app_function_unique 
        UNIQUE (app_code, function_code),
    CONSTRAINT function_registry_implementation_type_check 
        CHECK (implementation_type IN ('USER_TASK', 'SERVICE_TASK', 'AI_AGENT_TASK')),
    CONSTRAINT function_registry_app_code_fk 
        FOREIGN KEY (app_code) REFERENCES applications(app_code) ON DELETE CASCADE
);

-- Indexes for function_registry
CREATE INDEX IF NOT EXISTS idx_function_registry_app_active 
    ON function_registry(app_code, is_active);
CREATE INDEX IF NOT EXISTS idx_function_registry_app_type 
    ON function_registry(app_code, implementation_type);

-- Table comment
COMMENT ON TABLE function_registry IS 
    'Registry of all executable functions available in workflows. Defines execution contracts and UI integration.';

-- Column comments
COMMENT ON COLUMN function_registry.app_code IS 
    'Application code. NULL for shared functions that can be used across applications.';
COMMENT ON COLUMN function_registry.endpoint_or_path IS 
    'For SERVICE_TASK: API endpoint URL. For AI_AGENT_TASK: agent configuration path.';
COMMENT ON COLUMN function_registry.ui_widget_id IS 
    'UI widget identifier for rendering user task interfaces';

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- Purpose: Enforce multi-tenancy and data isolation at the database level
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE instance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE instance_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE function_registry ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICY: workflow_definitions
-- ============================================================================

CREATE POLICY "workflow_definitions_app_isolation" ON workflow_definitions
    USING (app_code = (auth.jwt() ->> 'app_code'))
    WITH CHECK (app_code = (auth.jwt() ->> 'app_code'));

-- ============================================================================
-- RLS POLICY: workflow_instances
-- ============================================================================

CREATE POLICY "workflow_instances_app_isolation" ON workflow_instances
    USING (app_code = (auth.jwt() ->> 'app_code'))
    WITH CHECK (app_code = (auth.jwt() ->> 'app_code'));

-- ============================================================================
-- RLS POLICY: instance_tasks
-- ============================================================================

CREATE POLICY "instance_tasks_app_isolation" ON instance_tasks
    USING (app_code = (auth.jwt() ->> 'app_code'))
    WITH CHECK (app_code = (auth.jwt() ->> 'app_code'));

-- ============================================================================
-- RLS POLICY: instance_context
-- ============================================================================

CREATE POLICY "instance_context_app_isolation" ON instance_context
    USING (app_code = (auth.jwt() ->> 'app_code'))
    WITH CHECK (app_code = (auth.jwt() ->> 'app_code'));

-- ============================================================================
-- RLS POLICY: workflow_history
-- ============================================================================

CREATE POLICY "workflow_history_app_isolation" ON workflow_history
    USING (app_code = (auth.jwt() ->> 'app_code'))
    WITH CHECK (app_code = (auth.jwt() ->> 'app_code'));

-- ============================================================================
-- RLS POLICY: function_registry
-- Note: Allows app_code = NULL for shared functions, otherwise enforces isolation
-- ============================================================================

CREATE POLICY "function_registry_app_isolation" ON function_registry
    USING (
        app_code IS NULL 
        OR app_code = (auth.jwt() ->> 'app_code')
    )
    WITH CHECK (
        app_code IS NULL 
        OR app_code = (auth.jwt() ->> 'app_code')
    );

-- ============================================================================
-- VERIFICATION QUERIES
-- Purpose: Verify all tables, constraints, indexes, and RLS policies are created
-- ============================================================================

DO $$
DECLARE
    table_count INT;
    index_count INT;
    policy_count INT;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'workflow_definitions',
        'workflow_instances',
        'instance_tasks',
        'instance_context',
        'workflow_history',
        'function_registry'
    );
    
    -- Count indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename IN (
        'workflow_definitions',
        'workflow_instances',
        'instance_tasks',
        'instance_context',
        'workflow_history',
        'function_registry'
    );
    
    -- Count RLS policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN (
        'workflow_definitions',
        'workflow_instances',
        'instance_tasks',
        'instance_context',
        'workflow_history',
        'function_registry'
    );
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration Verification';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables created: %', table_count;
    RAISE NOTICE 'Indexes created: %', index_count;
    RAISE NOTICE 'RLS policies created: %', policy_count;
    RAISE NOTICE '========================================';
    
    IF table_count = 6 THEN
        RAISE NOTICE '✓ All 6 tables created successfully';
    ELSE
        RAISE WARNING '⚠ Expected 6 tables, found %', table_count;
    END IF;
    
    IF policy_count >= 6 THEN
        RAISE NOTICE '✓ All RLS policies created successfully';
    ELSE
        RAISE WARNING '⚠ Expected at least 6 policies, found %', policy_count;
    END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Phase 1d.1: Workflow Database Schema';
    RAISE NOTICE 'Migration completed successfully';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Created 6 core workflow tables:';
    RAISE NOTICE '  1. workflow_definitions';
    RAISE NOTICE '  2. workflow_instances';
    RAISE NOTICE '  3. instance_tasks';
    RAISE NOTICE '  4. instance_context';
    RAISE NOTICE '  5. workflow_history';
    RAISE NOTICE '  6. function_registry';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All tables include:';
    RAISE NOTICE '  - Multi-tenancy (app_code)';
    RAISE NOTICE '  - Row-level security policies';
    RAISE NOTICE '  - Performance indexes';
    RAISE NOTICE '  - Foreign key constraints';
    RAISE NOTICE '========================================';
END $$;

