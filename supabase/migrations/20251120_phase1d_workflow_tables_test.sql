-- Minimal test to identify the issue
-- Run this first to see if basic table creation works

-- Test 1: Create a simple table with app_code
CREATE TABLE IF NOT EXISTS test_workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_code TEXT NOT NULL,
    workflow_code TEXT NOT NULL,
    name TEXT NOT NULL
);

-- Test 2: Try to create an index
CREATE INDEX IF NOT EXISTS idx_test_app_code ON test_workflow_definitions(app_code);

-- Test 3: Try to create a unique constraint
ALTER TABLE test_workflow_definitions
    ADD CONSTRAINT test_unique UNIQUE (app_code, workflow_code);

-- If this works, the issue is elsewhere in the migration
SELECT 'Test completed successfully' as result;

