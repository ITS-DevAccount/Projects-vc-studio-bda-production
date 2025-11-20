-- ============================================================================
-- SPRINT 1d.4: Add definition JSONB column to workflow_templates
-- Purpose: Store workflow structure (nodes, transitions, conditions) as JSON
-- Decision: Use JSONB column instead of workflow_steps table for faster queries
-- ============================================================================

-- Add definition column to workflow_templates
ALTER TABLE workflow_templates
ADD COLUMN IF NOT EXISTS definition JSONB DEFAULT '{
  "nodes": [],
  "transitions": [],
  "metadata": {}
}'::jsonb;

-- Add index for definition queries (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_workflow_templates_definition
ON workflow_templates USING GIN (definition);

-- Add comment for documentation
COMMENT ON COLUMN workflow_templates.definition IS 'Workflow structure: nodes (tasks, gateways, events), transitions (arrows with conditions), and metadata';

-- Verification query
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Migration Complete: workflow_templates.definition column added';
    RAISE NOTICE '   - Column type: JSONB';
    RAISE NOTICE '   - Default value: {"nodes": [], "transitions": [], "metadata": {}}';
    RAISE NOTICE '   - GIN index created for fast JSON queries';
    RAISE NOTICE '';
END $$;
