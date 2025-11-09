-- TEMPORARY: Disable RLS on relationships table for testing
-- WARNING: This should only be used for local development/testing
-- Re-enable with proper policies before production deployment

ALTER TABLE relationships DISABLE ROW LEVEL SECURITY;

-- Also disable on related tables for testing
ALTER TABLE stakeholders DISABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholder_roles DISABLE ROW LEVEL SECURITY;

-- To re-enable later, run:
-- ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE stakeholder_roles ENABLE ROW LEVEL SECURITY;
