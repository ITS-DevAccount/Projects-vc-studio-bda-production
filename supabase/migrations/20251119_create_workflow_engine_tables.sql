-- ============================================================================
-- Workflow Engine Tables Migration
-- Sprint 1d.3: State Machine and Task Orchestration
-- Created: 2025-11-19
-- ============================================================================
-- This migration creates the core workflow engine tables that enable
-- deterministic state machine-based workflow orchestration with:
-- - Template-based workflow definitions
-- - Function registry for task implementation decoupling
-- - Instance execution with context management
-- - Work token creation for task assignment
-- - Comprehensive execution audit trail
-- ============================================================================

-- ============================================================================
-- Table: workflow_definitions
-- Purpose: Store workflow templates/definitions as JSON
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code text UNIQUE NOT NULL,
  template_name text NOT NULL,
  description text,
  version integer DEFAULT 1,

  -- Workflow definition as JSON (nodes, transitions, etc.)
  definition_json jsonb NOT NULL,

  -- Root node identifier (entry point)
  root_node_id text NOT NULL,

  -- Validation and status
  is_active boolean DEFAULT true,
  is_validated boolean DEFAULT false,
  validation_errors jsonb,

  -- Multi-tenancy
  app_uuid uuid NOT NULL REFERENCES applications(uuid) ON DELETE CASCADE,

  -- Audit fields
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT workflow_definitions_template_code_app_unique UNIQUE (template_code, app_uuid),
  CONSTRAINT workflow_definitions_root_node_not_empty CHECK (length(root_node_id) > 0)
);

-- Index for fast lookups by app
CREATE INDEX idx_workflow_definitions_app_uuid ON workflow_definitions(app_uuid);
CREATE INDEX idx_workflow_definitions_active ON workflow_definitions(app_uuid, is_active) WHERE is_active = true;

-- ============================================================================
-- Table: function_registry
-- Purpose: Registry of all available task functions with implementation details
-- ============================================================================
CREATE TABLE IF NOT EXISTS function_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_code text NOT NULL,
  function_name text NOT NULL,
  description text,

  -- Implementation type determines how task is executed
  implementation_type text NOT NULL CHECK (
    implementation_type IN ('USER_TASK', 'SERVICE_TASK', 'AI_AGENT_TASK')
  ),

  -- JSON schemas for validation
  input_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_schema jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Implementation-specific configuration
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- For USER_TASK: { "ui_widget_id": "...", "allowed_roles": [...] }
  -- For SERVICE_TASK: { "endpoint_url": "...", "http_method": "...", "auth_config": {...} }
  -- For AI_AGENT_TASK: { "ai_provider": "...", "model": "...", "system_prompt": "...", "temperature": 0.7 }

  -- Versioning
  version integer DEFAULT 1,
  is_active boolean DEFAULT true,

  -- Multi-tenancy
  app_uuid uuid NOT NULL REFERENCES applications(uuid) ON DELETE CASCADE,

  -- Audit fields
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT function_registry_code_app_unique UNIQUE (function_code, app_uuid, version),
  CONSTRAINT function_registry_code_not_empty CHECK (length(function_code) > 0)
);

-- Index for fast registry lookups
CREATE INDEX idx_function_registry_app_uuid ON function_registry(app_uuid);
CREATE INDEX idx_function_registry_code ON function_registry(function_code, app_uuid, is_active) WHERE is_active = true;
CREATE INDEX idx_function_registry_implementation_type ON function_registry(implementation_type);

-- ============================================================================
-- Table: workflow_instances (Enhanced version for state machine)
-- Purpose: Store active workflow instance state
-- Note: This is separate from the existing workflow_instances table to allow
--       coexistence of simple and advanced workflow systems
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow_engine_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_code text UNIQUE NOT NULL,

  -- Template reference
  workflow_definition_id uuid NOT NULL REFERENCES workflow_definitions(id) ON DELETE RESTRICT,

  -- State machine state (single source of truth)
  current_node_id text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'RUNNING', 'PENDING_TASK', 'COMPLETED', 'FAILED', 'PAUSED')
  ),

  -- Error tracking
  error_type text,
  error_details jsonb,

  -- Stakeholder reference (optional, for user-initiated workflows)
  stakeholder_id uuid REFERENCES stakeholders(id) ON DELETE CASCADE,

  -- Version for optimistic locking
  version integer DEFAULT 1,

  -- Multi-tenancy
  app_uuid uuid NOT NULL REFERENCES applications(uuid) ON DELETE CASCADE,

  -- Audit fields
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  completed_at timestamp with time zone,

  -- Constraints
  CONSTRAINT workflow_engine_instances_code_not_empty CHECK (length(instance_code) > 0),
  CONSTRAINT workflow_engine_instances_current_node_not_empty CHECK (length(current_node_id) > 0)
);

-- Indexes for workflow instance queries
CREATE INDEX idx_workflow_engine_instances_app_uuid ON workflow_engine_instances(app_uuid);
CREATE INDEX idx_workflow_engine_instances_status ON workflow_engine_instances(status, app_uuid);
CREATE INDEX idx_workflow_engine_instances_stakeholder ON workflow_engine_instances(stakeholder_id) WHERE stakeholder_id IS NOT NULL;
CREATE INDEX idx_workflow_engine_instances_definition ON workflow_engine_instances(workflow_definition_id);

-- ============================================================================
-- Table: instance_tasks (Work Tokens)
-- Purpose: Store work tokens created by workflow engine for task execution
-- ============================================================================
CREATE TABLE IF NOT EXISTS instance_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_code text UNIQUE NOT NULL,

  -- Workflow instance reference
  workflow_instance_id uuid NOT NULL REFERENCES workflow_engine_instances(id) ON DELETE CASCADE,

  -- Node identification
  node_id text NOT NULL,

  -- Function reference
  function_code text NOT NULL,
  implementation_type text NOT NULL CHECK (
    implementation_type IN ('USER_TASK', 'SERVICE_TASK', 'AI_AGENT_TASK')
  ),

  -- Task data
  input_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_data jsonb,

  -- Agent assignment
  assigned_role text,
  assigned_user_id uuid REFERENCES auth.users(id),
  ui_widget_id text,

  -- Service task config
  service_endpoint text,
  http_config jsonb,

  -- AI task config
  ai_config jsonb,

  -- Task status
  status text NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED')
  ),

  -- Validation tracking
  output_validated boolean DEFAULT false,
  validation_errors jsonb,

  -- Multi-tenancy
  app_uuid uuid NOT NULL REFERENCES applications(uuid) ON DELETE CASCADE,

  -- Audit fields
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,

  -- Constraints
  CONSTRAINT instance_tasks_code_not_empty CHECK (length(task_code) > 0),
  CONSTRAINT instance_tasks_function_code_not_empty CHECK (length(function_code) > 0)
);

-- Indexes for task queries
CREATE INDEX idx_instance_tasks_app_uuid ON instance_tasks(app_uuid);
CREATE INDEX idx_instance_tasks_workflow_instance ON instance_tasks(workflow_instance_id);
CREATE INDEX idx_instance_tasks_status ON instance_tasks(status, app_uuid);
CREATE INDEX idx_instance_tasks_assigned_user ON instance_tasks(assigned_user_id) WHERE assigned_user_id IS NOT NULL;
CREATE INDEX idx_instance_tasks_implementation_type ON instance_tasks(implementation_type);

-- ============================================================================
-- Table: instance_context
-- Purpose: Store workflow context data with scoping
-- ============================================================================
CREATE TABLE IF NOT EXISTS instance_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Workflow instance reference
  workflow_instance_id uuid NOT NULL REFERENCES workflow_engine_instances(id) ON DELETE CASCADE,

  -- Context scoping
  scope text NOT NULL CHECK (scope IN ('GLOBAL', 'TASK_LOCAL', 'NODE_LOCAL')),

  -- Task reference for TASK_LOCAL scope
  task_id uuid REFERENCES instance_tasks(id) ON DELETE CASCADE,

  -- Context data
  key text NOT NULL,
  value jsonb NOT NULL,

  -- Multi-tenancy
  app_uuid uuid NOT NULL REFERENCES applications(uuid) ON DELETE CASCADE,

  -- Audit fields (context is immutable - updates create new entries)
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT instance_context_key_not_empty CHECK (length(key) > 0),
  CONSTRAINT instance_context_task_scope_check CHECK (
    (scope = 'TASK_LOCAL' AND task_id IS NOT NULL) OR
    (scope != 'TASK_LOCAL' AND task_id IS NULL)
  )
);

-- Indexes for context queries
CREATE INDEX idx_instance_context_app_uuid ON instance_context(app_uuid);
CREATE INDEX idx_instance_context_workflow_instance ON instance_context(workflow_instance_id);
CREATE INDEX idx_instance_context_scope ON instance_context(workflow_instance_id, scope);
CREATE INDEX idx_instance_context_task ON instance_context(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_instance_context_key ON instance_context(workflow_instance_id, key, created_at DESC);

-- ============================================================================
-- Table: workflow_history
-- Purpose: Comprehensive audit trail of all workflow execution events
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Workflow instance reference
  workflow_instance_id uuid NOT NULL REFERENCES workflow_engine_instances(id) ON DELETE CASCADE,

  -- Event classification
  event_type text NOT NULL CHECK (
    event_type IN (
      'instance_created',
      'instance_started',
      'node_evaluated',
      'task_created',
      'task_assigned',
      'task_started',
      'task_completed',
      'task_failed',
      'transition_evaluated',
      'context_updated',
      'instance_completed',
      'instance_failed',
      'instance_paused',
      'instance_resumed',
      'error_occurred'
    )
  ),

  -- Event details
  node_id text,
  task_id uuid REFERENCES instance_tasks(id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Actor tracking
  actor_type text CHECK (actor_type IN ('SYSTEM', 'USER', 'SERVICE', 'AI_AGENT')),
  actor_id uuid, -- auth.users(id) for USER, service identifier for SERVICE/AI

  -- Multi-tenancy
  app_uuid uuid NOT NULL REFERENCES applications(uuid) ON DELETE CASCADE,

  -- Timestamp
  created_at timestamp with time zone DEFAULT now()
);

-- Indexes for history queries
CREATE INDEX idx_workflow_history_app_uuid ON workflow_history(app_uuid);
CREATE INDEX idx_workflow_history_workflow_instance ON workflow_history(workflow_instance_id, created_at DESC);
CREATE INDEX idx_workflow_history_event_type ON workflow_history(event_type, created_at DESC);
CREATE INDEX idx_workflow_history_task ON workflow_history(task_id) WHERE task_id IS NOT NULL;

-- ============================================================================
-- Row-Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE function_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_engine_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE instance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE instance_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies: workflow_definitions
-- ============================================================================

-- Admins can manage workflow definitions
CREATE POLICY workflow_definitions_admin_all ON workflow_definitions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM stakeholders s
      JOIN stakeholder_roles sr ON s.id = sr.stakeholder_id
      JOIN roles r ON sr.role_id = r.id
      WHERE s.auth_user_id = auth.uid()
        AND r.role_name = 'admin'
        AND s.app_uuid = workflow_definitions.app_uuid
    )
  );

-- Users can view active workflow definitions in their app
CREATE POLICY workflow_definitions_user_select ON workflow_definitions
  FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM stakeholders
      WHERE auth_user_id = auth.uid()
        AND app_uuid = workflow_definitions.app_uuid
    )
  );

-- ============================================================================
-- RLS Policies: function_registry
-- ============================================================================

-- Admins can manage function registry
CREATE POLICY function_registry_admin_all ON function_registry
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM stakeholders s
      JOIN stakeholder_roles sr ON s.id = sr.stakeholder_id
      JOIN roles r ON sr.role_id = r.id
      WHERE s.auth_user_id = auth.uid()
        AND r.role_name = 'admin'
        AND s.app_uuid = function_registry.app_uuid
    )
  );

-- Users can view active registry functions in their app
CREATE POLICY function_registry_user_select ON function_registry
  FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM stakeholders
      WHERE auth_user_id = auth.uid()
        AND app_uuid = function_registry.app_uuid
    )
  );

-- ============================================================================
-- RLS Policies: workflow_engine_instances
-- ============================================================================

-- Users can view their own workflow instances
CREATE POLICY workflow_engine_instances_owner_select ON workflow_engine_instances
  FOR SELECT
  USING (
    stakeholder_id IN (
      SELECT id FROM stakeholders WHERE auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM stakeholders s
      JOIN stakeholder_roles sr ON s.id = sr.stakeholder_id
      JOIN roles r ON sr.role_id = r.id
      WHERE s.auth_user_id = auth.uid()
        AND r.role_name = 'admin'
        AND s.app_uuid = workflow_engine_instances.app_uuid
    )
  );

-- System can create and update instances (handled via service role)
-- Users cannot directly create instances via RLS (must use API with service role)

-- ============================================================================
-- RLS Policies: instance_tasks
-- ============================================================================

-- Users can view tasks assigned to them or their workflow instances
CREATE POLICY instance_tasks_user_select ON instance_tasks
  FOR SELECT
  USING (
    assigned_user_id = auth.uid()
    OR workflow_instance_id IN (
      SELECT id FROM workflow_engine_instances
      WHERE stakeholder_id IN (
        SELECT id FROM stakeholders WHERE auth_user_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM stakeholders s
      JOIN stakeholder_roles sr ON s.id = sr.stakeholder_id
      JOIN roles r ON sr.role_id = r.id
      WHERE s.auth_user_id = auth.uid()
        AND r.role_name = 'admin'
        AND s.app_uuid = instance_tasks.app_uuid
    )
  );

-- Users can update tasks assigned to them
CREATE POLICY instance_tasks_user_update ON instance_tasks
  FOR UPDATE
  USING (assigned_user_id = auth.uid())
  WITH CHECK (assigned_user_id = auth.uid());

-- ============================================================================
-- RLS Policies: instance_context
-- ============================================================================

-- Users can view context for their workflow instances
CREATE POLICY instance_context_user_select ON instance_context
  FOR SELECT
  USING (
    workflow_instance_id IN (
      SELECT id FROM workflow_engine_instances
      WHERE stakeholder_id IN (
        SELECT id FROM stakeholders WHERE auth_user_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM stakeholders s
      JOIN stakeholder_roles sr ON s.id = sr.stakeholder_id
      JOIN roles r ON sr.role_id = r.id
      WHERE s.auth_user_id = auth.uid()
        AND r.role_name = 'admin'
        AND s.app_uuid = instance_context.app_uuid
    )
  );

-- ============================================================================
-- RLS Policies: workflow_history
-- ============================================================================

-- Users can view history for their workflow instances
CREATE POLICY workflow_history_user_select ON workflow_history
  FOR SELECT
  USING (
    workflow_instance_id IN (
      SELECT id FROM workflow_engine_instances
      WHERE stakeholder_id IN (
        SELECT id FROM stakeholders WHERE auth_user_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM stakeholders s
      JOIN stakeholder_roles sr ON s.id = sr.stakeholder_id
      JOIN roles r ON sr.role_id = r.id
      WHERE s.auth_user_id = auth.uid()
        AND r.role_name = 'admin'
        AND s.app_uuid = workflow_history.app_uuid
    )
  );

-- ============================================================================
-- Triggers for updated_at timestamp
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER update_workflow_definitions_updated_at
  BEFORE UPDATE ON workflow_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_function_registry_updated_at
  BEFORE UPDATE ON function_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_engine_instances_updated_at
  BEFORE UPDATE ON workflow_engine_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE workflow_definitions IS 'Stores workflow templates/definitions as JSON with validation status';
COMMENT ON TABLE function_registry IS 'Registry of available task functions with implementation specifications';
COMMENT ON TABLE workflow_engine_instances IS 'Active workflow instances with current state machine state';
COMMENT ON TABLE instance_tasks IS 'Work tokens created by workflow engine for task execution';
COMMENT ON TABLE instance_context IS 'Workflow context data with scoping (GLOBAL, TASK_LOCAL, NODE_LOCAL)';
COMMENT ON TABLE workflow_history IS 'Comprehensive audit trail of all workflow execution events';

COMMENT ON COLUMN workflow_engine_instances.current_node_id IS 'Single source of truth for workflow state - determines active node';
COMMENT ON COLUMN workflow_engine_instances.version IS 'Optimistic locking version number for concurrent update prevention';
COMMENT ON COLUMN instance_tasks.implementation_type IS 'Determines execution method: USER_TASK (UI), SERVICE_TASK (API), AI_AGENT_TASK (AI)';
COMMENT ON COLUMN instance_context.scope IS 'Context visibility: GLOBAL (entire workflow), TASK_LOCAL (single task), NODE_LOCAL (temporary)';

-- ============================================================================
-- Migration Complete
-- ============================================================================
