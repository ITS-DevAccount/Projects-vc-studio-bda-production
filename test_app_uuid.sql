-- Test what getAppUuid would return with current site_settings
-- This simulates the query in getAppUuid function

-- This is what getAppUuid does:
SELECT
    app_uuid,
    site_code,
    domain_code,
    site_name,
    is_active_app,
    is_active
FROM site_settings
WHERE site_code = 'VC_STUDIO' OR is_active_app = true
LIMIT 1;

-- The problem: with multiple matching records, which one does it return?
-- PostgreSQL doesn't guarantee order without ORDER BY
