-- Sprint 1d.5: Service Task Execution System
-- Migration 1/3: Create service_configurations table

-- Service Configurations Table
-- Stores both REAL (external API) and MOCK (simulated) service definitions
CREATE TABLE IF NOT EXISTS service_configurations (
  service_config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_uuid UUID NOT NULL REFERENCES applications(app_uuid) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('REAL', 'MOCK')),

  -- For REAL services
  endpoint_url TEXT,
  http_method TEXT DEFAULT 'POST' CHECK (http_method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
  timeout_seconds INTEGER DEFAULT 30,
  max_retries INTEGER DEFAULT 3,
  authentication JSONB, -- { type: 'api_key' | 'bearer' | 'custom_header', api_key?, bearer_token?, headers? }

  -- For MOCK services
  mock_template_id TEXT, -- Reference to template in code
  mock_definition JSONB, -- { success_response: {}, error_scenarios: [] }

  -- Common fields
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,

  -- Audit fields
  created_by UUID REFERENCES stakeholders(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT service_name_unique_per_app UNIQUE (app_uuid, service_name),
  CONSTRAINT real_service_has_endpoint CHECK (
    service_type != 'REAL' OR endpoint_url IS NOT NULL
  ),
  CONSTRAINT mock_service_has_definition CHECK (
    service_type != 'MOCK' OR (mock_template_id IS NOT NULL OR mock_definition IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_service_config_app_uuid ON service_configurations(app_uuid);
CREATE INDEX idx_service_config_type ON service_configurations(service_type);
CREATE INDEX idx_service_config_active ON service_configurations(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_service_config_name ON service_configurations(service_name);

-- RLS Policies
ALTER TABLE service_configurations ENABLE ROW LEVEL SECURITY;

-- Admin can view all services for their app
CREATE POLICY service_config_select_policy ON service_configurations
  FOR SELECT
  USING (
    app_uuid = current_setting('app.current_app_uuid')::UUID
  );

-- Admin can insert services for their app
CREATE POLICY service_config_insert_policy ON service_configurations
  FOR INSERT
  WITH CHECK (
    app_uuid = current_setting('app.current_app_uuid')::UUID
    AND EXISTS (
      SELECT 1 FROM stakeholders
      WHERE id = auth.uid()
      AND stakeholders.app_uuid = current_setting('app.current_app_uuid')::UUID
      AND (core_config->'permissions'->>'is_admin')::boolean = TRUE
    )
  );

-- Admin can update services for their app
CREATE POLICY service_config_update_policy ON service_configurations
  FOR UPDATE
  USING (
    app_uuid = current_setting('app.current_app_uuid')::UUID
    AND EXISTS (
      SELECT 1 FROM stakeholders
      WHERE id = auth.uid()
      AND stakeholders.app_uuid = current_setting('app.current_app_uuid')::UUID
      AND (core_config->'permissions'->>'is_admin')::boolean = TRUE
    )
  );

-- Admin can delete services for their app
CREATE POLICY service_config_delete_policy ON service_configurations
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
CREATE OR REPLACE FUNCTION update_service_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER service_config_updated_at_trigger
  BEFORE UPDATE ON service_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_service_config_updated_at();

-- Comments
COMMENT ON TABLE service_configurations IS 'Service definitions for both REAL (external API) and MOCK (simulated) services';
COMMENT ON COLUMN service_configurations.service_type IS 'REAL = external API call, MOCK = simulated response';
COMMENT ON COLUMN service_configurations.authentication IS 'Authentication configuration for REAL services (API keys, headers, etc.)';
COMMENT ON COLUMN service_configurations.mock_definition IS 'Mock response definition with success_response and error_scenarios';
