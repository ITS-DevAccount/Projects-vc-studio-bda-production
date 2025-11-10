-- ============================================================================
-- FORCE FIX: Drop All Users Table Dependencies
-- Run this if verification shows FK constraints still exist
-- ============================================================================

-- Drop specific FK constraints
ALTER TABLE stakeholders DROP CONSTRAINT IF EXISTS stakeholders_created_by_fkey CASCADE;
ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_created_by_fkey CASCADE;
ALTER TABLE components_registry DROP CONSTRAINT IF EXISTS components_registry_created_by_fkey CASCADE;

-- Dynamic drop of any remaining FKs to users table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT
            tc.table_name,
            tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE ccu.table_name = 'users'
        AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        RAISE NOTICE 'Dropping FK: %.%', r.table_name, r.constraint_name;
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I CASCADE', r.table_name, r.constraint_name);
    END LOOP;
END $$;

-- Make columns nullable
ALTER TABLE stakeholders ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE nodes ALTER COLUMN created_by DROP NOT NULL;

-- Add required unique constraints
ALTER TABLE stakeholder_roles
DROP CONSTRAINT IF EXISTS uq_stakeholder_roles_stakeholder_role_app CASCADE;

ALTER TABLE stakeholder_roles
ADD CONSTRAINT uq_stakeholder_roles_stakeholder_role_app
UNIQUE(stakeholder_id, role_type, app_uuid);

ALTER TABLE relationships
DROP CONSTRAINT IF EXISTS uq_relationships_from_to_type_app CASCADE;

ALTER TABLE relationships
ADD CONSTRAINT uq_relationships_from_to_type_app
UNIQUE(from_stakeholder_id, to_stakeholder_id, relationship_type_id, app_uuid);

-- Force drop and recreate function
DROP FUNCTION IF EXISTS provision_stakeholder_v2(JSONB, TEXT[], UUID, JSONB, UUID, TEXT, BOOLEAN, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS provision_stakeholder_v2 CASCADE;

-- Recreate function without created_by dependencies
-- (Copy the complete function from migration 20251109160000_remove_users_table_dependencies.sql lines 73-391)

RAISE NOTICE '✓ Constraints dropped, columns made nullable';
RAISE NOTICE '✓ Unique constraints added';
RAISE NOTICE 'Now run the provision_stakeholder_v2 function creation from migration 20251109160000';
