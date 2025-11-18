-- Debug script to identify where the error occurs
-- Run this first to verify the applications table

-- Step 1: Check if applications table exists
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'applications';

-- Step 2: Check if applications table has app_code column
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'applications' 
AND column_name = 'app_code';

-- Step 3: Try to create applications table if it doesn't exist
CREATE TABLE IF NOT EXISTS applications (
    app_code TEXT PRIMARY KEY,
    app_name TEXT NOT NULL,
    app_uuid UUID,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Verify the table was created
SELECT * FROM applications LIMIT 1;

-- Step 5: Insert default application
INSERT INTO applications (app_code, app_name, description, is_active)
VALUES ('VC_STUDIO', 'VC Studio', 'Default application for workflow management', true)
ON CONFLICT (app_code) DO NOTHING;

-- Step 6: Verify the data
SELECT * FROM applications;

