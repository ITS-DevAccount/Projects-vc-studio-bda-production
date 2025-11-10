-- ============================================================================
-- VERIFICATION QUERIES - Check Database State After Migration
-- ============================================================================

-- Query 1: Check if FK constraints to users table still exist
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE ccu.table_name = 'users'
    AND tc.constraint_type = 'FOREIGN KEY';

-- Expected: No rows returned (all FK constraints to users table should be dropped)

-- ============================================================================

-- Query 2: Check stakeholders.created_by column nullable status
SELECT
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'stakeholders'
    AND column_name = 'created_by';

-- Expected: is_nullable = 'YES'

-- ============================================================================

-- Query 3: Check nodes.created_by column nullable status
SELECT
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'nodes'
    AND column_name = 'created_by';

-- Expected: is_nullable = 'YES'

-- ============================================================================

-- Query 4: Check provision_stakeholder_v2 function source code
SELECT
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'provision_stakeholder_v2'
    AND n.nspname = 'public';

-- Expected: Function definition should NOT contain any references to created_by
-- Search the output for "created_by" - there should be ZERO occurrences

-- ============================================================================

-- Query 5: Check unique constraints on stakeholder_roles
SELECT
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'stakeholder_roles'
    AND constraint_type = 'UNIQUE';

-- Expected: Should include uq_stakeholder_roles_stakeholder_role_app

-- ============================================================================

-- Query 6: Check unique constraints on relationships
SELECT
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'relationships'
    AND constraint_type = 'UNIQUE';

-- Expected: Should include uq_relationships_from_to_type_app

-- ============================================================================
