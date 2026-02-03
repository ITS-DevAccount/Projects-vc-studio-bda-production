-- ============================================================================
-- BuildBid: Extend Campaign Types Table
-- Migration: Add multi-tenancy, role restrictions, lifecycle management
-- Description: Extends campaign_types table with app_uuid, role restrictions,
--              lifecycle fields, and audit tracking
-- Created: 2025-01-15
-- ============================================================================

-- Add new columns to campaign_types table
ALTER TABLE public.campaign_types
  ADD COLUMN IF NOT EXISTS app_uuid uuid REFERENCES applications(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS role_uuid uuid REFERENCES roles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_role_specific boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cloned_from_id uuid REFERENCES campaign_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES stakeholders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES stakeholders(id) ON DELETE SET NULL;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_campaign_types_app_uuid ON public.campaign_types(app_uuid);
CREATE INDEX IF NOT EXISTS idx_campaign_types_role_uuid ON public.campaign_types(role_uuid);
CREATE INDEX IF NOT EXISTS idx_campaign_types_active ON public.campaign_types(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_campaign_types_cloned_from ON public.campaign_types(cloned_from_id);

-- Drop old unique constraint on code if it exists
-- Note: This might be a constraint, not just an index
DO $$ 
BEGIN
    -- Try to drop as constraint first
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'campaign_types_code_key'
    ) THEN
        ALTER TABLE public.campaign_types DROP CONSTRAINT IF EXISTS campaign_types_code_key;
    END IF;
    
    -- Also try to drop as index if it exists separately
    DROP INDEX IF EXISTS campaign_types_code_key;
END $$;

-- Create new unique constraint that includes app_uuid and only applies to active types
CREATE UNIQUE INDEX IF NOT EXISTS campaign_types_app_code_key 
  ON public.campaign_types(app_uuid, code) 
  WHERE is_active = true;

-- Create or replace function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_campaign_types_updated_at ON public.campaign_types;

-- Create trigger for updated_at
CREATE TRIGGER update_campaign_types_updated_at 
  BEFORE UPDATE ON public.campaign_types 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON COLUMN public.campaign_types.app_uuid IS 
  'Multi-tenancy: Links campaign type to specific application (BuildBid, VC Studio, etc.)';
COMMENT ON COLUMN public.campaign_types.role_uuid IS 
  'If set, this campaign type is only available to stakeholders with this role. NULL means available to all roles in the app.';
COMMENT ON COLUMN public.campaign_types.is_role_specific IS 
  'Quick filter flag: true if role_uuid is set, false if available to all roles';
COMMENT ON COLUMN public.campaign_types.is_active IS 
  'Soft delete flag: false = archived, not visible in dropdowns';
COMMENT ON COLUMN public.campaign_types.cloned_from_id IS 
  'If this type was cloned, references the parent campaign type';
COMMENT ON COLUMN public.campaign_types.owner_id IS 
  'Stakeholder who created/owns this campaign type';
COMMENT ON COLUMN public.campaign_types.updated_at IS 
  'Timestamp of last modification';
COMMENT ON COLUMN public.campaign_types.updated_by IS 
  'Stakeholder who last modified this campaign type';

-- Update existing campaign_types to have app_uuid (BuildBid)
-- This assumes BuildBid app_uuid is cca44f46-d406-4235-8384-4bfa16d3dbbb
UPDATE public.campaign_types
SET app_uuid = 'cca44f46-d406-4235-8384-4bfa16d3dbbb'
WHERE app_uuid IS NULL
  AND EXISTS (
    SELECT 1 FROM applications 
    WHERE id = 'cca44f46-d406-4235-8384-4bfa16d3dbbb'
  );

-- Set is_active = true for existing records
UPDATE public.campaign_types
SET is_active = true
WHERE is_active IS NULL;

-- Set is_role_specific = false for existing records
UPDATE public.campaign_types
SET is_role_specific = false
WHERE is_role_specific IS NULL;

