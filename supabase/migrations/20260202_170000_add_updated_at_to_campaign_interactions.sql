-- ============================================================================
-- BuildBid: Add updated_at column to campaign_interactions
-- Description: Adds updated_at column to campaign_interactions table to fix
--              trigger errors when updating interactions
-- ============================================================================

-- Add updated_at column if it doesn't exist
ALTER TABLE campaign_interactions 
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create or replace trigger function for updated_at (if triggers are being used)
-- Note: Only create trigger if a generic trigger function exists
DO $$
BEGIN
  -- Check if the generic update_updated_at_column function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_updated_at_column' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    -- Drop existing trigger if it exists
    DROP TRIGGER IF EXISTS update_campaign_interactions_updated_at ON campaign_interactions;
    
    -- Create trigger to auto-update updated_at
    CREATE TRIGGER update_campaign_interactions_updated_at
      BEFORE UPDATE ON campaign_interactions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN campaign_interactions.updated_at IS 'Timestamp when the interaction record was last updated';
