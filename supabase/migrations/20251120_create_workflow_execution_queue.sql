-- Sprint 1d.4 - Workflow Execution Queue
-- Purpose: Queue workflow resumption after task completion for async processing

-- Create workflow_execution_queue table
CREATE TABLE IF NOT EXISTS workflow_execution_queue (
  queue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_code TEXT NOT NULL,
  workflow_instance_id UUID NOT NULL,
  trigger_type TEXT NOT NULL, -- 'TASK_COMPLETED', 'MANUAL', 'SCHEDULED', etc.
  trigger_data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT fk_workflow_execution_queue_instance
    FOREIGN KEY (workflow_instance_id)
    REFERENCES workflow_instances (id)
    ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workflow_execution_queue_status
  ON workflow_execution_queue (status);

CREATE INDEX IF NOT EXISTS idx_workflow_execution_queue_instance
  ON workflow_execution_queue (workflow_instance_id);

CREATE INDEX IF NOT EXISTS idx_workflow_execution_queue_created
  ON workflow_execution_queue (created_at);

CREATE INDEX IF NOT EXISTS idx_workflow_execution_queue_app_code
  ON workflow_execution_queue (app_code);

-- RLS Policies
ALTER TABLE workflow_execution_queue ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select their app's queue items
CREATE POLICY workflow_execution_queue_select_policy
  ON workflow_execution_queue FOR SELECT
  TO authenticated
  USING (
    app_code IN (
      SELECT site_code FROM site_settings WHERE app_uuid = auth.uid()
    )
  );

-- Allow system to insert/update/delete queue items (will be done via service role)
-- For now, allow authenticated users to insert for testing
CREATE POLICY workflow_execution_queue_insert_policy
  ON workflow_execution_queue FOR INSERT
  TO authenticated
  WITH CHECK (
    app_code IN (
      SELECT site_code FROM site_settings WHERE app_uuid = auth.uid()
    )
  );

-- Comment the table
COMMENT ON TABLE workflow_execution_queue IS 'Queue for async workflow execution processing after task completion or other triggers';
COMMENT ON COLUMN workflow_execution_queue.trigger_type IS 'Type of event that triggered the queue item (TASK_COMPLETED, MANUAL, SCHEDULED)';
COMMENT ON COLUMN workflow_execution_queue.trigger_data IS 'Additional data about the trigger event (e.g., task_id, node_id)';
COMMENT ON COLUMN workflow_execution_queue.status IS 'Current status of the queue item (PENDING, PROCESSING, COMPLETED, FAILED)';
COMMENT ON COLUMN workflow_execution_queue.retry_count IS 'Number of times this queue item has been retried';
