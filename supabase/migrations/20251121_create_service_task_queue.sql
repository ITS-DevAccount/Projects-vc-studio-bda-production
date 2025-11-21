-- Sprint 1d.5: Service Task Execution System
-- Migration 2/3: Create service_task_queue table

-- Service Task Queue Table
-- Holds pending SERVICE_TASK work tokens for background worker processing
CREATE TABLE IF NOT EXISTS service_task_queue (
  queue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_uuid UUID NOT NULL REFERENCES applications(app_uuid) ON DELETE CASCADE,

  -- Workflow context
  instance_id UUID NOT NULL REFERENCES workflow_instances(instance_id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES instance_tasks(task_id) ON DELETE CASCADE,
  service_config_id UUID NOT NULL REFERENCES service_configurations(service_config_id) ON DELETE CASCADE,

  -- Execution status
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),

  -- Input/Output data
  input_data JSONB, -- Input passed to service
  output_data JSONB, -- Response from service
  error_message TEXT, -- Error details if failed

  -- Retry configuration
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for queue processing
CREATE INDEX idx_queue_status ON service_task_queue(status);
CREATE INDEX idx_queue_status_pending ON service_task_queue(status, created_at) WHERE status = 'PENDING';
CREATE INDEX idx_queue_app_uuid ON service_task_queue(app_uuid);
CREATE INDEX idx_queue_instance ON service_task_queue(instance_id);
CREATE INDEX idx_queue_task ON service_task_queue(task_id);
CREATE INDEX idx_queue_service ON service_task_queue(service_config_id);
CREATE INDEX idx_queue_created ON service_task_queue(created_at);

-- RLS Policies
ALTER TABLE service_task_queue ENABLE ROW LEVEL SECURITY;

-- Users can view queue items for their app
CREATE POLICY queue_select_policy ON service_task_queue
  FOR SELECT
  USING (
    app_uuid = current_setting('app.current_app_uuid')::UUID
  );

-- System can insert queue items (via service role)
CREATE POLICY queue_insert_policy ON service_task_queue
  FOR INSERT
  WITH CHECK (
    app_uuid = current_setting('app.current_app_uuid')::UUID
  );

-- System can update queue items (via service role)
CREATE POLICY queue_update_policy ON service_task_queue
  FOR UPDATE
  USING (
    app_uuid = current_setting('app.current_app_uuid')::UUID
  );

-- Admin can delete queue items
CREATE POLICY queue_delete_policy ON service_task_queue
  FOR DELETE
  USING (
    app_uuid = current_setting('app.current_app_uuid')::UUID
    AND EXISTS (
      SELECT 1 FROM stakeholders
      WHERE id = auth.uid()
      AND stakeholders.app_uuid = current_setting('app.current_app_uuid')::UUID
      AND (core_config->'permissions'->>'is_admin')::boolean = TRUE
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER queue_updated_at_trigger
  BEFORE UPDATE ON service_task_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_queue_updated_at();

-- Function to get next pending task (for worker)
CREATE OR REPLACE FUNCTION get_next_pending_service_task()
RETURNS TABLE (
  queue_id UUID,
  instance_id UUID,
  task_id UUID,
  service_config_id UUID,
  input_data JSONB,
  retry_count INTEGER,
  max_retries INTEGER
) AS $$
BEGIN
  RETURN QUERY
  UPDATE service_task_queue
  SET status = 'RUNNING',
      last_attempt_at = NOW()
  WHERE service_task_queue.queue_id = (
    SELECT q.queue_id
    FROM service_task_queue q
    WHERE q.status = 'PENDING'
    AND (q.retry_count < q.max_retries OR q.max_retries = 0)
    ORDER BY q.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING
    service_task_queue.queue_id,
    service_task_queue.instance_id,
    service_task_queue.task_id,
    service_task_queue.service_config_id,
    service_task_queue.input_data,
    service_task_queue.retry_count,
    service_task_queue.max_retries;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE service_task_queue IS 'Queue of SERVICE_TASK work tokens awaiting background worker processing';
COMMENT ON COLUMN service_task_queue.status IS 'PENDING = awaiting execution, RUNNING = currently executing, COMPLETED = success, FAILED = max retries exceeded';
COMMENT ON FUNCTION get_next_pending_service_task IS 'Atomically fetches and locks next pending task for worker processing';
