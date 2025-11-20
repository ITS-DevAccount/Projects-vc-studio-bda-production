-- Add instance_name to workflow_instances table
-- Sprint 1d.4: Allow naming individual workflow instances

ALTER TABLE workflow_instances
ADD COLUMN IF NOT EXISTS instance_name TEXT;

-- Create index for searching by instance name
CREATE INDEX IF NOT EXISTS idx_workflow_instances_instance_name
  ON workflow_instances (instance_name);

-- Add comment
COMMENT ON COLUMN workflow_instances.instance_name IS 'User-provided name for this workflow instance to distinguish it from other instances of the same template (e.g., "John Smith Onboarding", "ACME Corp Contract")';
