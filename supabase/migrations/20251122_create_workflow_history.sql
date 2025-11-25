-- ============================================================================
-- SPRINT 1d.6: CREATE WORKFLOW_HISTORY TABLE FOR AUDIT LOGGING
-- Purpose: Track all workflow execution events for monitoring, audit, and compliance
-- ============================================================================

-- Create workflow_history table
CREATE TABLE IF NOT EXISTS workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_uuid UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Related entities
  node_id TEXT,
  task_id UUID,
  user_id UUID,
  stakeholder_id UUID,

  -- Event details
  event_data JSONB DEFAULT '{}'::jsonb,
  previous_state JSONB,
  new_state JSONB,

  -- Additional metadata
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_workflow_history_instance_id
  ON workflow_history(workflow_instance_id);

CREATE INDEX IF NOT EXISTS idx_workflow_history_event_type
  ON workflow_history(event_type);

CREATE INDEX IF NOT EXISTS idx_workflow_history_event_timestamp
  ON workflow_history(event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_history_app_uuid
  ON workflow_history(app_uuid);

CREATE INDEX IF NOT EXISTS idx_workflow_history_task_id
  ON workflow_history(task_id) WHERE task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_history_node_id
  ON workflow_history(node_id) WHERE node_id IS NOT NULL;

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_workflow_history_event_data
  ON workflow_history USING GIN (event_data);

CREATE INDEX IF NOT EXISTS idx_workflow_history_metadata
  ON workflow_history USING GIN (metadata);

-- Enable RLS
ALTER TABLE workflow_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: App isolation
DROP POLICY IF EXISTS "workflow_history_app_isolation" ON workflow_history;
CREATE POLICY "workflow_history_app_isolation" ON workflow_history
  FOR ALL
  USING (
    app_uuid = (SELECT id FROM applications WHERE app_code = current_setting('app.current_app_code', true))
  );

-- Add comments for documentation
COMMENT ON TABLE workflow_history IS 'Audit trail for all workflow execution events - immutable log for compliance and monitoring';
COMMENT ON COLUMN workflow_history.event_type IS 'Event type: INSTANCE_CREATED, NODE_TRANSITION, TASK_CREATED, TASK_ASSIGNED, TASK_STARTED, TASK_COMPLETED, TASK_FAILED, TASK_RETRIED, SERVICE_CALLED, SERVICE_RESPONSE, WORKFLOW_COMPLETED, WORKFLOW_FAILED, WORKFLOW_PAUSED, WORKFLOW_RESUMED, CONTEXT_UPDATED';
COMMENT ON COLUMN workflow_history.event_data IS 'Event-specific data (task input/output, service request/response, etc.)';
COMMENT ON COLUMN workflow_history.previous_state IS 'State before the event (for audit trail)';
COMMENT ON COLUMN workflow_history.new_state IS 'State after the event (for audit trail)';

-- Create helper function to log workflow events
CREATE OR REPLACE FUNCTION log_workflow_event(
  p_app_uuid UUID,
  p_workflow_instance_id UUID,
  p_event_type TEXT,
  p_node_id TEXT DEFAULT NULL,
  p_task_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_stakeholder_id UUID DEFAULT NULL,
  p_event_data JSONB DEFAULT '{}'::jsonb,
  p_previous_state JSONB DEFAULT NULL,
  p_new_state JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO workflow_history (
    app_uuid,
    workflow_instance_id,
    event_type,
    node_id,
    task_id,
    user_id,
    stakeholder_id,
    event_data,
    previous_state,
    new_state,
    error_message,
    metadata
  ) VALUES (
    p_app_uuid,
    p_workflow_instance_id,
    p_event_type,
    p_node_id,
    p_task_id,
    p_user_id,
    p_stakeholder_id,
    p_event_data,
    p_previous_state,
    p_new_state,
    p_error_message,
    p_metadata
  ) RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Verification
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Migration Complete: workflow_history table created';
    RAISE NOTICE '   - Table: workflow_history';
    RAISE NOTICE '   - Indexes: 8 indexes created for fast queries';
    RAISE NOTICE '   - RLS: App isolation policy enabled';
    RAISE NOTICE '   - Helper function: log_workflow_event()';
    RAISE NOTICE '';
END $$;
