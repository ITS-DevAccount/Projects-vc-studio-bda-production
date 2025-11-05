-- =============================================================================
-- VERIFICATION QUERIES FOR PHASE 1a MIGRATION
-- =============================================================================
-- Run these queries to verify the multi-app migration completed successfully
-- =============================================================================

-- 1. Check site_settings has app metadata
SELECT
    '1. Site Settings App Metadata' AS check_name,
    site_code,
    domain_code,
    site_name,
    app_uuid,
    is_active_app
FROM site_settings;

-- 2. Check which tables now have app_uuid column
SELECT
    '2. Tables with app_uuid column' AS check_name,
    table_name
FROM information_schema.columns
WHERE column_name = 'app_uuid'
  AND table_schema = 'public'
ORDER BY table_name;

-- 3. Check for NULL app_uuids in critical tables
SELECT
    '3. NULL app_uuid counts (should be 0 for most)' AS check_name,
    'site_settings' AS table_name,
    COUNT(*) FILTER (WHERE app_uuid IS NULL) AS null_count,
    COUNT(*) AS total_count
FROM site_settings
UNION ALL
SELECT '3. NULL app_uuid counts', 'page_settings',
    COUNT(*) FILTER (WHERE app_uuid IS NULL), COUNT(*)
FROM page_settings
UNION ALL
SELECT '3. NULL app_uuid counts', 'page_images',
    COUNT(*) FILTER (WHERE app_uuid IS NULL), COUNT(*)
FROM page_images
UNION ALL
SELECT '3. NULL app_uuid counts', 'blog_posts',
    COUNT(*) FILTER (WHERE app_uuid IS NULL), COUNT(*)
FROM blog_posts
UNION ALL
SELECT '3. NULL app_uuid counts', 'enquiries',
    COUNT(*) FILTER (WHERE app_uuid IS NULL), COUNT(*)
FROM enquiries
UNION ALL
SELECT '3. NULL app_uuid counts', 'workflows',
    COUNT(*) FILTER (WHERE app_uuid IS NULL), COUNT(*)
FROM workflows
UNION ALL
SELECT '3. NULL app_uuid counts', 'campaigns',
    COUNT(*) FILTER (WHERE app_uuid IS NULL), COUNT(*)
FROM campaigns;

-- 4. Verify indexes were created
SELECT
    '4. App UUID Indexes' AS check_name,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%app_uuid%'
ORDER BY tablename, indexname;

-- 5. Check composite unique constraints
SELECT
    '5. Composite Unique Constraints' AS check_name,
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname LIKE '%app%'
  AND contype = 'u'
ORDER BY table_name;

-- 6. Verify page_images trigger exists
SELECT
    '6. Page Images Sync Trigger' AS check_name,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'sync_page_images_app_uuid_trigger';

-- 7. Check relationship type was added
SELECT
    '7. User In Application Relationship Type' AS check_name,
    code,
    label,
    description,
    is_bidirectional
FROM relationship_types
WHERE code = 'user_in_application';

-- 8. Sample data check - verify backfill worked
SELECT
    '8. Sample Data - Page Settings' AS check_name,
    ps.page_name,
    ps.app_uuid,
    ss.site_code
FROM page_settings ps
LEFT JOIN site_settings ss ON ps.app_uuid = ss.app_uuid
LIMIT 5;

-- 9. Sample data check - blog posts
SELECT
    '9. Sample Data - Blog Posts' AS check_name,
    bp.title,
    bp.slug,
    bp.app_uuid,
    ss.site_code
FROM blog_posts bp
LEFT JOIN site_settings ss ON bp.app_uuid = ss.app_uuid
LIMIT 5;

-- 10. Summary of all tables and their app_uuid status
SELECT
    '10. Complete Table Summary' AS check_name,
    t.tablename AS table_name,
    CASE
        WHEN c.column_name IS NOT NULL THEN '✓ Has app_uuid'
        ELSE '✗ No app_uuid'
    END AS app_uuid_status,
    pg_size_pretty(pg_total_relation_size(t.schemaname||'.'||t.tablename)) AS table_size
FROM pg_tables t
LEFT JOIN information_schema.columns c
    ON t.tablename = c.table_name
    AND c.column_name = 'app_uuid'
    AND c.table_schema = 'public'
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE 'sql_%'
ORDER BY
    CASE WHEN c.column_name IS NOT NULL THEN 0 ELSE 1 END,
    t.tablename;

-- =============================================================================
-- VERIFICATION COMPLETE
-- =============================================================================
-- Review the results above to ensure:
--   ✓ site_settings has site_code, domain_code, app_uuid
--   ✓ 20+ tables have app_uuid column
--   ✓ No NULL app_uuids in critical tables (page_settings, blog_posts, etc.)
--   ✓ Indexes created on app_uuid columns
--   ✓ Composite unique constraints exist (page_settings, blog_posts)
--   ✓ Trigger exists for page_images
--   ✓ user_in_application relationship type exists
-- =============================================================================
