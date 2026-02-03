-- ============================================================================
-- BuildBid: Add next_follow_up_date to campaign_opportunities
-- Migration: Add next_follow_up_date field for tracking scheduled follow-ups
-- Description: Adds next_follow_up_date DATE field to campaign_opportunities table
-- Created: 2026-01-01
-- ============================================================================

-- Add next_follow_up_date column to campaign_opportunities
ALTER TABLE campaign_opportunities
ADD COLUMN IF NOT EXISTS next_follow_up_date DATE;

-- Add index for filtering by follow-up date
CREATE INDEX IF NOT EXISTS idx_campaign_opportunities_next_follow_up_date 
ON campaign_opportunities(next_follow_up_date);

-- Comment on column
COMMENT ON COLUMN campaign_opportunities.next_follow_up_date IS 
'Next scheduled follow-up date for this opportunity. Used for filtering and scheduling actions.';
