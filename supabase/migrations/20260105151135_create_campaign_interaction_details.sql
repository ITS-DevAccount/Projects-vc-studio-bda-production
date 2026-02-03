-- ============================================================================
-- BuildBid: Create campaign_interaction_details Table
-- Description: Individual activities logged within a stage interaction
--              Multiple details per interaction (planned and actual activities)
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_interaction_details (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  interaction_id uuid NOT NULL REFERENCES campaign_interactions(id) ON DELETE CASCADE,
  
  -- Planned Activity
  planned_action_type text CHECK (planned_action_type IN ('email', 'call', 'meeting', 'demo')),
  planned_action_date timestamp with time zone,
  planned_notes text,
  
  -- Actual Activity
  actual_action_type text CHECK (actual_action_type IN ('email', 'call', 'meeting', 'demo')),
  actual_action_date timestamp with time zone,
  actual_notes text,
  
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'cancelled')),
  
  created_by uuid REFERENCES stakeholders(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_interaction_details_interaction 
  ON campaign_interaction_details(interaction_id);

CREATE INDEX IF NOT EXISTS idx_interaction_details_status 
  ON campaign_interaction_details(status);

CREATE INDEX IF NOT EXISTS idx_interaction_details_planned_date 
  ON campaign_interaction_details(planned_action_date);

-- Add comments
COMMENT ON TABLE campaign_interaction_details IS 'Individual activities logged within a stage interaction';
COMMENT ON COLUMN campaign_interaction_details.planned_action_type IS 'Type of planned activity (email, call, meeting, demo)';
COMMENT ON COLUMN campaign_interaction_details.actual_action_type IS 'Type of actual activity that occurred';
COMMENT ON COLUMN campaign_interaction_details.status IS 'planned, completed, or cancelled';
