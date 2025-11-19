-- ============================================================================
-- Ensure Applications Table Exists (Pre-requisite for Workflow Engine)
-- ============================================================================

-- Create applications table if it doesn't exist
CREATE TABLE IF NOT EXISTS applications (
  uuid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'applications'
    AND policyname = 'applications_select_all'
  ) THEN
    CREATE POLICY applications_select_all ON applications
      FOR SELECT USING (true);
  END IF;
END$$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_applications_is_active ON applications(is_active);

-- Add a default application if none exists
INSERT INTO applications (uuid, name, description)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Default Application',
  'Default application for development'
WHERE NOT EXISTS (SELECT 1 FROM applications LIMIT 1);
