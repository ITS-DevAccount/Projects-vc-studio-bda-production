-- Check which version of provision_stakeholder_v2 is currently in the database
SELECT
    CASE
        WHEN pg_get_functiondef(oid) LIKE '%ACCEPT_TERMS-%' THEN 'Has unique activity codes (GOOD - ready to test)'
        WHEN pg_get_functiondef(oid) LIKE '%ACCEPT_TERMS%' THEN 'Has fixed activity code (BAD - will cause duplicates)'
        ELSE 'Unknown version'
    END as version_status,
    LENGTH(pg_get_functiondef(oid)) as code_length
FROM pg_proc
WHERE proname = 'provision_stakeholder_v2'
  AND pronamespace = 'public'::regnamespace;
