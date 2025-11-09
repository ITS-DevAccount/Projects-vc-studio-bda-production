-- Check what versions of provision_stakeholder exist in the database
SELECT
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'provision_stakeholder'
  AND n.nspname = 'public';
