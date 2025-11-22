-- Diagnostic SQL to check why roles and relationship_types are not accessible
-- Run this in Supabase SQL Editor

-- 1. Check if site_settings table has the required columns
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'site_settings'
AND column_name IN ('app_uuid', 'site_code', 'domain_code', 'site_name', 'is_active_app', 'is_active')
ORDER BY column_name;

-- 2. Check if site_settings has any data
SELECT
    id,
    site_name,
    app_uuid,
    site_code,
    domain_code,
    is_active_app,
    is_active
FROM site_settings
LIMIT 5;

-- 3. Check RLS policies on site_settings
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'site_settings';

-- 4. Check if roles table has app_uuid column
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'roles'
AND column_name = 'app_uuid';

-- 5. Check if relationship_types table has app_uuid column
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'relationship_types'
AND column_name = 'app_uuid';

-- 6. Check if there are any roles in the database
SELECT COUNT(*) as role_count FROM roles;

-- 7. Check if there are any relationship_types in the database
SELECT COUNT(*) as relationship_type_count FROM relationship_types;
