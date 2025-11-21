-- Sprint 1d.5: Service Task Execution System
-- Migration 3/3: Create service_execution_logs table

-- Service Execution Logs Table
-- Comprehensive audit trail for all service calls (success and failure)
CREATE TABLE IF NOT EXISTS service_execution_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_uuid UUID NOT NULL REFERENCES applications(app_uuid) ON DELETE CASCADE,

  -- Workflow context
  instance_id UUID REFERENCES workflow_instances(instance_id) ON DELETE SET NULL,
  task_id UUID REFERENCES instance_tasks(task_id) ON DELETE SET NULL,
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
CREATE INDEX idx_logs_app_uuid ON service_execution_logs(app_uuid);
CREATE INDEX idx_logs_service_config ON service_execution_logs(service_config_id);
CREATE INDEX idx_logs_service_name ON service_execution_logs(service_name);
CREATE INDEX idx_logs_instance ON service_execution_logs(instance_id);
CREATE INDEX idx_logs_task ON service_execution_logs(task_id);
CREATE INDEX idx_logs_status ON service_execution_logs(status);
CREATE INDEX idx_logs_created ON service_execution_logs(created_at DESC);
CREATE INDEX idx_logs_app_status_created ON service_execution_logs(app_uuid, status, created_at DESC);

-- RLS Policies
ALTER TABLE service_execution_logs ENABLE ROW LEVEL SECURITY;

-- Users can view logs for their app
CREATE POLICY logs_select_policy ON service_execution_logs
  FOR SELECT
  USING (
    app_uuid = current_setting('app.current_app_uuid')::UUID
  );

-- System can insert logs (via service role)
CREATE POLICY logs_insert_policy ON service_execution_logs
  FOR INSERT
  WITH CHECK (
    app_uuid = current_setting('app.current_app_uuid')::UUID
  );

-- Admin can delete old logs
CREATE POLICY logs_delete_policy ON service_execution_logs
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

-- Function to log service execution
CREATE OR REPLACE FUNCTION log_service_execution(
  p_app_uuid UUID,
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
    app_uuid,
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
    p_app_uuid,
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
  p_app_uuid UUID,
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
  WHERE app_uuid = p_app_uuid
    AND (p_service_config_id IS NULL OR service_config_id = p_service_config_id)
    AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE service_execution_logs IS 'Audit trail of all service executions (REAL and MOCK) with performance metrics';
COMMENT ON COLUMN service_execution_logs.status IS 'SUCCESS = completed successfully, FAILED = execution failed, TIMEOUT = exceeded timeout, ERROR = unexpected error';
COMMENT ON COLUMN service_execution_logs.execution_time_ms IS 'Time taken for service call in milliseconds';
COMMENT ON FUNCTION log_service_execution IS 'Helper function to create service execution log entry';
COMMENT ON FUNCTION get_service_execution_stats IS 'Calculate execution statistics for a service over specified time period';
