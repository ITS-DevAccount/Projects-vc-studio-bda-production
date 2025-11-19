-- ============================================================================
-- Workflow Engine Tables Migration (Fixed for Dependencies)
-- Sprint 1d.3: State Machine and Task Orchestration
-- Created: 2025-11-19
-- ============================================================================

-- ============================================================================
-- STEP 1: Create tables WITHOUT foreign key constraints first
-- ============================================================================

-- Table: workflow_definitions
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code text UNIQUE NOT NULL,
  template_name text NOT NULL,
  description text,
  version integer DEFAULT 1,
  definition_json jsonb NOT NULL,
  root_node_id text NOT NULL,
  is_active boolean DEFAULT true,
  is_validated boolean DEFAULT false,
  validation_errors jsonb,
  app_uuid uuid NOT NULL,  -- FK added later
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,  -- FK added later
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid,  -- FK added later
  CONSTRAINT workflow_definitions_template_code_app_unique UNIQUE (template_code, app_uuid),
  CONSTRAINT workflow_definitions_root_node_not_empty CHECK (length(root_node_id) > 0)
);

-- Table: function_registry
CREATE TABLE IF NOT EXISTS function_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_code text NOT NULL,
  function_name text NOT NULL,
  description text,
  implementation_type text NOT NULL CHECK (
    implementation_type IN ('USER_TASK', 'SERVICE_TASK', 'AI_AGENT_TASK')
  ),
  input_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer DEFAULT 1,
  is_active boolean DEFAULT true,
  app_uuid uuid NOT NULL,  -- FK added later
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,  -- FK added later
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid,  -- FK added later
  CONSTRAINT function_registry_code_app_unique UNIQUE (function_code, app_uuid, version),
  CONSTRAINT function_registry_code_not_empty CHECK (length(function_code) > 0)
);

-- Table: workflow_engine_instances
CREATE TABLE IF NOT EXISTS workflow_engine_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_code text UNIQUE NOT NULL,
  workflow_definition_id uuid NOT NULL,  -- FK added later
  current_node_id text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'RUNNING', 'PENDING_TASK', 'COMPLETED', 'FAILED', 'PAUSED')
  ),
  error_type text,
  error_details jsonb,
  stakeholder_id uuid,  -- FK added later
  version integer DEFAULT 1,
  app_uuid uuid NOT NULL,  -- FK added later
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,  -- FK added later
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid,  -- FK added later
  completed_at timestamp with time zone,
  CONSTRAINT workflow_engine_instances_code_not_empty CHECK (length(instance_code) > 0),
  CONSTRAINT workflow_engine_instances_current_node_not_empty CHECK (length(current_node_id) > 0)
);

-- Table: instance_tasks
CREATE TABLE IF NOT EXISTS instance_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_code text UNIQUE NOT NULL,
  workflow_instance_id uuid NOT NULL,  -- FK added later
  node_id text NOT NULL,
  function_code text NOT NULL,
  implementation_type text NOT NULL CHECK (
    implementation_type IN ('USER_TASK', 'SERVICE_TASK', 'AI_AGENT_TASK')
  ),
  input_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_data jsonb,
  assigned_role text,
  assigned_user_id uuid,  -- FK added later
  ui_widget_id text,
  service_endpoint text,
  http_config jsonb,
  ai_config jsonb,
  status text NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED')
  ),
  output_validated boolean DEFAULT false,
  validation_errors jsonb,
  app_uuid uuid NOT NULL,  -- FK added later
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,  -- FK added later
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  CONSTRAINT instance_tasks_code_not_empty CHECK (length(task_code) > 0),
  CONSTRAINT instance_tasks_function_code_not_empty CHECK (length(function_code) > 0)
);

-- Table: instance_context
CREATE TABLE IF NOT EXISTS instance_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id uuid NOT NULL,  -- FK added later
  scope text NOT NULL CHECK (scope IN ('GLOBAL', 'TASK_LOCAL', 'NODE_LOCAL')),
  task_id uuid,  -- FK added later
  key text NOT NULL,
  value jsonb NOT NULL,
  app_uuid uuid NOT NULL,  -- FK added later
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,  -- FK added later
  CONSTRAINT instance_context_key_not_empty CHECK (length(key) > 0),
  CONSTRAINT instance_context_task_scope_check CHECK (
    (scope = 'TASK_LOCAL' AND task_id IS NOT NULL) OR
    (scope != 'TASK_LOCAL' AND task_id IS NULL)
  )
);

-- Table: workflow_history
CREATE TABLE IF NOT EXISTS workflow_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id uuid NOT NULL,  -- FK added later
  event_type text NOT NULL CHECK (
    event_type IN (
      'instance_created', 'instance_started', 'node_evaluated', 'task_created',
      'task_assigned', 'task_started', 'task_completed', 'task_failed',
      'transition_evaluated', 'context_updated', 'instance_completed',
      'instance_failed', 'instance_paused', 'instance_resumed', 'error_occurred'
    )
  ),
  node_id text,
  task_id uuid,  -- FK added later
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_type text CHECK (actor_type IN ('SYSTEM', 'USER', 'SERVICE', 'AI_AGENT')),
  actor_id uuid,
  app_uuid uuid NOT NULL,  -- FK added later
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- STEP 2: Add indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_workflow_definitions_app_uuid ON workflow_definitions(app_uuid);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_active ON workflow_definitions(app_uuid, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_function_registry_app_uuid ON function_registry(app_uuid);
CREATE INDEX IF NOT EXISTS idx_function_registry_code ON function_registry(function_code, app_uuid, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_function_registry_implementation_type ON function_registry(implementation_type);

CREATE INDEX IF NOT EXISTS idx_workflow_engine_instances_app_uuid ON workflow_engine_instances(app_uuid);
CREATE INDEX IF NOT EXISTS idx_workflow_engine_instances_status ON workflow_engine_instances(status, app_uuid);
CREATE INDEX IF NOT EXISTS idx_workflow_engine_instances_stakeholder ON workflow_engine_instances(stakeholder_id) WHERE stakeholder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_engine_instances_definition ON workflow_engine_instances(workflow_definition_id);

CREATE INDEX IF NOT EXISTS idx_instance_tasks_app_uuid ON instance_tasks(app_uuid);
CREATE INDEX IF NOT EXISTS idx_instance_tasks_workflow_instance ON instance_tasks(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_instance_tasks_status ON instance_tasks(status, app_uuid);
CREATE INDEX IF NOT EXISTS idx_instance_tasks_assigned_user ON instance_tasks(assigned_user_id) WHERE assigned_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_instance_tasks_implementation_type ON instance_tasks(implementation_type);

CREATE INDEX IF NOT EXISTS idx_instance_context_app_uuid ON instance_context(app_uuid);
CREATE INDEX IF NOT EXISTS idx_instance_context_workflow_instance ON instance_context(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_instance_context_scope ON instance_context(workflow_instance_id, scope);
CREATE INDEX IF NOT EXISTS idx_instance_context_task ON instance_context(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_instance_context_key ON instance_context(workflow_instance_id, key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_history_app_uuid ON workflow_history(app_uuid);
CREATE INDEX IF NOT EXISTS idx_workflow_history_workflow_instance ON workflow_history(workflow_instance_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_history_event_type ON workflow_history(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_history_task ON workflow_history(task_id) WHERE task_id IS NOT NULL;

-- ============================================================================
-- STEP 3: Add foreign key constraints (only if referenced tables exist)
-- ============================================================================

-- Add FK to applications if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'applications') THEN
    -- workflow_definitions
    ALTER TABLE workflow_definitions
      DROP CONSTRAINT IF EXISTS workflow_definitions_app_uuid_fkey;
    ALTER TABLE workflow_definitions
      ADD CONSTRAINT workflow_definitions_app_uuid_fkey
      FOREIGN KEY (app_uuid) REFERENCES applications(uuid) ON DELETE CASCADE;

    -- function_registry
    ALTER TABLE function_registry
      DROP CONSTRAINT IF EXISTS function_registry_app_uuid_fkey;
    ALTER TABLE function_registry
      ADD CONSTRAINT function_registry_app_uuid_fkey
      FOREIGN KEY (app_uuid) REFERENCES applications(uuid) ON DELETE CASCADE;

    -- workflow_engine_instances
    ALTER TABLE workflow_engine_instances
      DROP CONSTRAINT IF EXISTS workflow_engine_instances_app_uuid_fkey;
    ALTER TABLE workflow_engine_instances
      ADD CONSTRAINT workflow_engine_instances_app_uuid_fkey
      FOREIGN KEY (app_uuid) REFERENCES applications(uuid) ON DELETE CASCADE;

    -- instance_tasks
    ALTER TABLE instance_tasks
      DROP CONSTRAINT IF EXISTS instance_tasks_app_uuid_fkey;
    ALTER TABLE instance_tasks
      ADD CONSTRAINT instance_tasks_app_uuid_fkey
      FOREIGN KEY (app_uuid) REFERENCES applications(uuid) ON DELETE CASCADE;

    -- instance_context
    ALTER TABLE instance_context
      DROP CONSTRAINT IF EXISTS instance_context_app_uuid_fkey;
    ALTER TABLE instance_context
      ADD CONSTRAINT instance_context_app_uuid_fkey
      FOREIGN KEY (app_uuid) REFERENCES applications(uuid) ON DELETE CASCADE;

    -- workflow_history
    ALTER TABLE workflow_history
      DROP CONSTRAINT IF EXISTS workflow_history_app_uuid_fkey;
    ALTER TABLE workflow_history
      ADD CONSTRAINT workflow_history_app_uuid_fkey
      FOREIGN KEY (app_uuid) REFERENCES applications(uuid) ON DELETE CASCADE;
  ELSE
    RAISE NOTICE 'Applications table not found - skipping app_uuid foreign keys';
  END IF;
END$$;

-- Add FK to stakeholders if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stakeholders') THEN
    ALTER TABLE workflow_engine_instances
      DROP CONSTRAINT IF EXISTS workflow_engine_instances_stakeholder_id_fkey;
    ALTER TABLE workflow_engine_instances
      ADD CONSTRAINT workflow_engine_instances_stakeholder_id_fkey
      FOREIGN KEY (stakeholder_id) REFERENCES stakeholders(id) ON DELETE CASCADE;
  ELSE
    RAISE NOTICE 'Stakeholders table not found - skipping stakeholder_id foreign key';
  END IF;
END$$;

-- Add FK to workflow_definitions
ALTER TABLE workflow_engine_instances
  DROP CONSTRAINT IF EXISTS workflow_engine_instances_workflow_definition_id_fkey;
ALTER TABLE workflow_engine_instances
  ADD CONSTRAINT workflow_engine_instances_workflow_definition_id_fkey
  FOREIGN KEY (workflow_definition_id) REFERENCES workflow_definitions(id) ON DELETE RESTRICT;

-- Add FK to workflow_engine_instances
ALTER TABLE instance_tasks
  DROP CONSTRAINT IF EXISTS instance_tasks_workflow_instance_id_fkey;
ALTER TABLE instance_tasks
  ADD CONSTRAINT instance_tasks_workflow_instance_id_fkey
  FOREIGN KEY (workflow_instance_id) REFERENCES workflow_engine_instances(id) ON DELETE CASCADE;

ALTER TABLE instance_context
  DROP CONSTRAINT IF EXISTS instance_context_workflow_instance_id_fkey;
ALTER TABLE instance_context
  ADD CONSTRAINT instance_context_workflow_instance_id_fkey
  FOREIGN KEY (workflow_instance_id) REFERENCES workflow_engine_instances(id) ON DELETE CASCADE;

ALTER TABLE workflow_history
  DROP CONSTRAINT IF EXISTS workflow_history_workflow_instance_id_fkey;
ALTER TABLE workflow_history
  ADD CONSTRAINT workflow_history_workflow_instance_id_fkey
  FOREIGN KEY (workflow_instance_id) REFERENCES workflow_engine_instances(id) ON DELETE CASCADE;

-- Add FK to instance_tasks
ALTER TABLE instance_context
  DROP CONSTRAINT IF EXISTS instance_context_task_id_fkey;
ALTER TABLE instance_context
  ADD CONSTRAINT instance_context_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES instance_tasks(id) ON DELETE CASCADE;

ALTER TABLE workflow_history
  DROP CONSTRAINT IF EXISTS workflow_history_task_id_fkey;
ALTER TABLE workflow_history
  ADD CONSTRAINT workflow_history_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES instance_tasks(id) ON DELETE SET NULL;

-- Add FK to auth.users (created_by fields) - conditional
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    -- workflow_definitions
    ALTER TABLE workflow_definitions
      DROP CONSTRAINT IF EXISTS workflow_definitions_created_by_fkey;
    ALTER TABLE workflow_definitions
      ADD CONSTRAINT workflow_definitions_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id);

    ALTER TABLE workflow_definitions
      DROP CONSTRAINT IF EXISTS workflow_definitions_updated_by_fkey;
    ALTER TABLE workflow_definitions
      ADD CONSTRAINT workflow_definitions_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES auth.users(id);

    -- function_registry
    ALTER TABLE function_registry
      DROP CONSTRAINT IF EXISTS function_registry_created_by_fkey;
    ALTER TABLE function_registry
      ADD CONSTRAINT function_registry_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id);

    ALTER TABLE function_registry
      DROP CONSTRAINT IF EXISTS function_registry_updated_by_fkey;
    ALTER TABLE function_registry
      ADD CONSTRAINT function_registry_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES auth.users(id);

    -- workflow_engine_instances
    ALTER TABLE workflow_engine_instances
      DROP CONSTRAINT IF EXISTS workflow_engine_instances_created_by_fkey;
    ALTER TABLE workflow_engine_instances
      ADD CONSTRAINT workflow_engine_instances_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id);

    ALTER TABLE workflow_engine_instances
      DROP CONSTRAINT IF EXISTS workflow_engine_instances_updated_by_fkey;
    ALTER TABLE workflow_engine_instances
      ADD CONSTRAINT workflow_engine_instances_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES auth.users(id);

    -- instance_tasks
    ALTER TABLE instance_tasks
      DROP CONSTRAINT IF EXISTS instance_tasks_created_by_fkey;
    ALTER TABLE instance_tasks
      ADD CONSTRAINT instance_tasks_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id);

    ALTER TABLE instance_tasks
      DROP CONSTRAINT IF EXISTS instance_tasks_assigned_user_id_fkey;
    ALTER TABLE instance_tasks
      ADD CONSTRAINT instance_tasks_assigned_user_id_fkey
      FOREIGN KEY (assigned_user_id) REFERENCES auth.users(id);

    -- instance_context
    ALTER TABLE instance_context
      DROP CONSTRAINT IF EXISTS instance_context_created_by_fkey;
    ALTER TABLE instance_context
      ADD CONSTRAINT instance_context_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id);
  ELSE
    RAISE NOTICE 'Auth users table not found - skipping user foreign keys';
  END IF;
END$$;

-- ============================================================================
-- STEP 4: Enable RLS
-- ============================================================================

ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE function_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_engine_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE instance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE instance_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Create RLS Policies (if stakeholders table exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stakeholders') THEN
    -- workflow_definitions policies
    DROP POLICY IF EXISTS workflow_definitions_admin_all ON workflow_definitions;
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

    DROP POLICY IF EXISTS workflow_definitions_user_select ON workflow_definitions;
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

    -- function_registry policies
    DROP POLICY IF EXISTS function_registry_admin_all ON function_registry;
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

    DROP POLICY IF EXISTS function_registry_user_select ON function_registry;
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

    -- workflow_engine_instances policies
    DROP POLICY IF EXISTS workflow_engine_instances_owner_select ON workflow_engine_instances;
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

    -- instance_tasks policies
    DROP POLICY IF EXISTS instance_tasks_user_select ON instance_tasks;
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

    DROP POLICY IF EXISTS instance_tasks_user_update ON instance_tasks;
    CREATE POLICY instance_tasks_user_update ON instance_tasks
      FOR UPDATE
      USING (assigned_user_id = auth.uid())
      WITH CHECK (assigned_user_id = auth.uid());

    -- instance_context policies
    DROP POLICY IF EXISTS instance_context_user_select ON instance_context;
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

    -- workflow_history policies
    DROP POLICY IF EXISTS workflow_history_user_select ON workflow_history;
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
  ELSE
    RAISE NOTICE 'Stakeholders table not found - skipping RLS policies';
  END IF;
END$$;

-- ============================================================================
-- STEP 6: Create triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_workflow_definitions_updated_at ON workflow_definitions;
CREATE TRIGGER update_workflow_definitions_updated_at
  BEFORE UPDATE ON workflow_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_function_registry_updated_at ON function_registry;
CREATE TRIGGER update_function_registry_updated_at
  BEFORE UPDATE ON function_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflow_engine_instances_updated_at ON workflow_engine_instances;
CREATE TRIGGER update_workflow_engine_instances_updated_at
  BEFORE UPDATE ON workflow_engine_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 7: Add table comments
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
