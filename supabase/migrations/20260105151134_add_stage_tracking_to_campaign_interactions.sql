-- ============================================================================
-- BuildBid: Add Stage Tracking to campaign_interactions
-- Description: Adds stage tracking fields to campaign_interactions table
--              for the two-table interaction system
-- ============================================================================

-- Add stage tracking columns
ALTER TABLE campaign_interactions 
  ADD COLUMN IF NOT EXISTS stage_name text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  ADD COLUMN IF NOT EXISTS opened_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS closed_at timestamp with time zone;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_interactions_stage_name 
  ON campaign_interactions(stage_name);

CREATE INDEX IF NOT EXISTS idx_interactions_status 
  ON campaign_interactions(status);

CREATE INDEX IF NOT EXISTS idx_interactions_opportunity_stage 
  ON campaign_interactions(opportunity_id, stage_name);

-- Add comments
COMMENT ON COLUMN campaign_interactions.stage_name IS 'Which funnel stage this interaction represents';
COMMENT ON COLUMN campaign_interactions.status IS 'open (current stage) or closed (historical)';
COMMENT ON COLUMN campaign_interactions.opened_at IS 'When stage started';
COMMENT ON COLUMN campaign_interactions.closed_at IS 'When stage completed';
