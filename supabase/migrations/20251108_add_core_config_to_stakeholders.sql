-- Add core_config column to stakeholders table
ALTER TABLE stakeholders
ADD COLUMN IF NOT EXISTS core_config jsonb DEFAULT '{}';

-- Add comment explaining the column
COMMENT ON COLUMN stakeholders.core_config IS 'JSON configuration defining dashboard widgets, menu items, and role-specific settings';
