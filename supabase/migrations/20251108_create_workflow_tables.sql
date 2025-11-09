-- Create workflow_instances table
CREATE TABLE IF NOT EXISTS workflow_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_code text UNIQUE NOT NULL,
  stakeholder_id uuid NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  workflow_type text, -- 'accept_terms', 'vc_client_finance', etc.
  status text DEFAULT 'active', -- 'active', 'completed', 'paused'
  maturity_gate text, -- 'FLM', 'AGM', 'Full'
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  app_uuid uuid REFERENCES applications(uuid)
);

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id uuid NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  activity_code text UNIQUE NOT NULL,
  activity_name text NOT NULL,
  status text DEFAULT 'pending', -- 'pending', 'in_progress', 'complete'
  owner text, -- 'client', 'admin', 'ai_agent'
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see their own workflow instances
CREATE POLICY workflow_instances_owner_access ON workflow_instances
  FOR SELECT USING (stakeholder_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid()));

-- RLS Policy: Users can see activities for their workflows
CREATE POLICY activities_owner_access ON activities
  FOR SELECT USING (
    workflow_instance_id IN (
      SELECT id FROM workflow_instances
      WHERE stakeholder_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    )
  );

-- RLS Policy: Users can update activities for their workflows
CREATE POLICY activities_owner_update ON activities
  FOR UPDATE USING (
    workflow_instance_id IN (
      SELECT id FROM workflow_instances
      WHERE stakeholder_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    )
  );

-- Create indexes for faster lookups
CREATE INDEX idx_workflow_instances_stakeholder ON workflow_instances(stakeholder_id);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX idx_activities_workflow ON activities(workflow_instance_id);
CREATE INDEX idx_activities_status ON activities(status);
