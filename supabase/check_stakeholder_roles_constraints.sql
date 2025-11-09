-- Check constraints on stakeholder_roles table
SELECT
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'stakeholder_roles'::regclass
ORDER BY conname;

-- Also check indexes
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'stakeholder_roles'
ORDER BY indexname;
