-- Sprint 1d.5: Service Task Execution System
-- Migration 3/3: Create service_execution_logs table
-- FINAL CORRECTED: Proper foreign key references to actual table structures
-- References: applications(id), workflow_instances(id), instance_tasks(id)

-- Service Execution Logs Table
-- Comprehensive audit trail for all service calls (success and failure)
CREATE TABLE IF NOT EXISTS service_execution_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,

  -- Workflow context - CORRECTED foreign key references
  instance_id UUID REFERENCES workflow_instances(id) ON DELETE SET NULL,
  task_id UUID REFERENCES instance_tasks(id) ON DELETE SET NULL,
  service_config_id UUID REFERENCES service_configurations(service_config_id) ON DELETE SET NULL,
  service_name TEXT NOT NULL, -- Denormalized for querying after service deletion

  -- Execution details
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'TIMEOUT', 'ERROR')),
  request_data JSONB, -- Input sent to service
  response_data JSONB, -- Response received from service
  error_message TEXT, -- Error details if failed

  -- Performance metrics
  execution_time_ms INTEGER, -- Time taken to execute service call
  http_status_code INTEGER, -- HTTP status code for REAL services

  -- Retry tracking
  retry_attempt INTEGER DEFAULT 0, -- Which retry attempt (0 = first try)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for querying and analytics
CREATE INDEX idx_logs_app_id ON service_execution_logs(app_id);
CREATE INDEX idx_logs_service_config ON service_execution_logs(service_config_id);
CREATE INDEX idx_logs_service_name ON service_execution_logs(service_name);
CREATE INDEX idx_logs_instance ON service_execution_logs(instance_id);
CREATE INDEX idx_logs_task ON service_execution_logs(task_id);
CREATE INDEX idx_logs_status ON service_execution_logs(status);
CREATE INDEX idx_logs_created ON service_execution_logs(created_at DESC);
CREATE INDEX idx_logs_app_status_created ON service_execution_logs(app_id, status, created_at DESC);

-- RLS Policies
ALTER TABLE service_execution_logs ENABLE ROW LEVEL SECURITY;

-- Users can view logs for their app
CREATE POLICY logs_select_policy ON service_execution_logs
  FOR SELECT
  USING (
    app_id = current_setting('app.current_app_id')::UUID
  );

-- System can insert logs (via service role)
CREATE POLICY logs_insert_policy ON service_execution_logs
  FOR INSERT
  WITH CHECK (
    app_id = current_setting('app.current_app_id')::UUID
  );

-- Admin can delete old logs
CREATE POLICY logs_delete_policy ON service_execution_logs
  FOR DELETE
  USING (
    app_id = current_setting('app.current_app_id')::UUID
  );

-- Function to log service execution
CREATE OR REPLACE FUNCTION log_service_execution(
  p_app_id UUID,
  p_instance_id UUID,
  p_task_id UUID,
  p_service_config_id UUID,
  p_service_name TEXT,
  p_status TEXT,
  p_request_data JSONB,
  p_response_data JSONB,
  p_error_message TEXT,
  p_execution_time_ms INTEGER,
  p_http_status_code INTEGER,
  p_retry_attempt INTEGER
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO service_execution_logs (
    app_id,
    instance_id,
    task_id,
    service_config_id,
    service_name,
    status,
    request_data,
    response_data,
    error_message,
    execution_time_ms,
    http_status_code,
    retry_attempt
  ) VALUES (
    p_app_id,
    p_instance_id,
    p_task_id,
    p_service_config_id,
    p_service_name,
    p_status,
    p_request_data,
    p_response_data,
    p_error_message,
    p_execution_time_ms,
    p_http_status_code,
    p_retry_attempt
  )
  RETURNING log_id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get service execution statistics
CREATE OR REPLACE FUNCTION get_service_execution_stats(
  p_app_id UUID,
  p_service_config_id UUID DEFAULT NULL,
  p_days_back INTEGER DEFAULT 7
) RETURNS TABLE (
  total_executions BIGINT,
  successful_executions BIGINT,
  failed_executions BIGINT,
  average_execution_time_ms NUMERIC,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_executions,
    COUNT(*) FILTER (WHERE status = 'SUCCESS')::BIGINT AS successful_executions,
    COUNT(*) FILTER (WHERE status IN ('FAILED', 'TIMEOUT', 'ERROR'))::BIGINT AS failed_executions,
    ROUND(AVG(execution_time_ms)::NUMERIC, 2) AS average_execution_time_ms,
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'SUCCESS')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100),
      2
    ) AS success_rate
  FROM service_execution_logs
  WHERE app_id = p_app_id
    AND (p_service_config_id IS NULL OR service_config_id = p_service_config_id)
    AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE service_execution_logs IS 'Audit trail of all service executions (REAL and MOCK) with performance metrics';
COMMENT ON COLUMN service_execution_logs.status IS 'SUCCESS = completed successfully, FAILED = execution failed, TIMEOUT = exceeded timeout, ERROR = unexpected error';
COMMENT ON COLUMN service_execution_logs.execution_time_ms IS 'Time taken for service call in milliseconds';
COMMENT ON COLUMN service_execution_logs.instance_id IS 'References workflow_instances(id) - the workflow instance that triggered this service call';
COMMENT ON COLUMN service_execution_logs.task_id IS 'References instance_tasks(id) - the specific task that triggered this service call';
COMMENT ON FUNCTION log_service_execution IS 'Helper function to create service execution log entry';
COMMENT ON FUNCTION get_service_execution_stats IS 'Calculate execution statistics for a service over specified time period';
