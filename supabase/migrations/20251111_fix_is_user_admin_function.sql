-- ============================================================================
-- Fix is_user_admin() Function
-- File: 20251111_fix_is_user_admin_function.sql
-- Purpose: Update is_user_admin() to check stakeholder_roles instead of users table
-- ============================================================================

-- The previous is_user_admin() function checked the local 'users' table which
-- was removed/deprecated. Admin status should be determined by stakeholder_roles
-- with role_type = 'administrator'

-- ============================================================================
-- STEP 1: Drop function with CASCADE to remove dependent policies
-- ============================================================================

DROP FUNCTION IF EXISTS public.is_user_admin() CASCADE;

-- ============================================================================
-- STEP 2: Recreate is_user_admin() function with correct implementation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    -- Check if current authenticated user is admin via stakeholder_type OR stakeholder_roles
    SELECT EXISTS (
        SELECT 1
        FROM stakeholders s
        LEFT JOIN stakeholder_types st ON st.id = s.stakeholder_type_id
        LEFT JOIN stakeholder_roles sr ON sr.stakeholder_id = s.id
        WHERE s.auth_user_id = auth.uid()
        AND (
            st.code = 'admin'  -- Stakeholder type is "admin"
            OR sr.role_type = 'administrator'  -- OR has administrator role
        )
    );
$$;

COMMENT ON FUNCTION public.is_user_admin() IS
'Returns true if the current user is an admin.
Checks both: stakeholder_type.code = ''admin'' OR stakeholder_roles.role_type = ''administrator''.
No longer depends on deprecated users table.';

-- ============================================================================
-- STEP 3: Recreate all RLS policies that were dropped by CASCADE
-- ============================================================================

-- ROLES TABLE POLICIES
CREATE POLICY "roles_select_policy" ON roles
    FOR SELECT USING (
        is_user_admin()
        OR
        app_uuid IN (SELECT get_user_app_uuids())
    );

CREATE POLICY "roles_insert_policy" ON roles

    FOR INSERT WITH CHECK (
        is_user_admin()
    );

CREATE POLICY "roles_update_policy" ON roles
    FOR UPDATE USING (
        is_user_admin()
    ) WITH CHECK (
        is_user_admin()
    );

CREATE POLICY "roles_delete_policy" ON roles
    FOR DELETE USING (
        is_user_admin()
    );

-- RELATIONSHIP_TYPES TABLE POLICIES
CREATE POLICY "relationship_types_select_policy" ON relationship_types
    FOR SELECT USING (
        is_user_admin()
        OR
        app_uuid IN (SELECT get_user_app_uuids())
    );

CREATE POLICY "relationship_types_insert_policy" ON relationship_types
    FOR INSERT WITH CHECK (
        is_user_admin()
    );

CREATE POLICY "relationship_types_update_policy" ON relationship_types
    FOR UPDATE USING (
        is_user_admin()
    ) WITH CHECK (
        is_user_admin()
    );

CREATE POLICY "relationship_types_delete_policy" ON relationship_types
    FOR DELETE USING (
        is_user_admin()
    );

-- STAKEHOLDER_ROLES TABLE POLICIES
CREATE POLICY "stakeholder_roles_select_policy" ON stakeholder_roles
    FOR SELECT USING (
        app_uuid IN (SELECT get_user_app_uuids())
        OR
        is_user_admin()
    );

CREATE POLICY "stakeholder_roles_insert_policy" ON stakeholder_roles
    FOR INSERT WITH CHECK (
        app_uuid IN (SELECT get_user_app_uuids())
        OR
        is_user_admin()
    );

CREATE POLICY "stakeholder_roles_update_policy" ON stakeholder_roles
    FOR UPDATE USING (
        app_uuid IN (SELECT get_user_app_uuids())
        OR
        is_user_admin()
    ) WITH CHECK (
        app_uuid IN (SELECT get_user_app_uuids())
        OR
        is_user_admin()
    );

CREATE POLICY "stakeholder_roles_delete_policy" ON stakeholder_roles
    FOR DELETE USING (
        app_uuid IN (SELECT get_user_app_uuids())
        OR
        is_user_admin()
    );

-- THEMES TABLE POLICIES (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'themes') THEN
        EXECUTE 'CREATE POLICY "themes_select_policy" ON themes
            FOR SELECT USING (
                app_uuid IN (SELECT get_user_app_uuids())
                OR
                is_user_admin()
            )';

        EXECUTE 'CREATE POLICY "themes_insert_policy" ON themes
            FOR INSERT WITH CHECK (
                is_user_admin()
            )';

        EXECUTE 'CREATE POLICY "themes_update_policy" ON themes
            FOR UPDATE USING (
                is_user_admin()
            ) WITH CHECK (
                is_user_admin()
            )';

        EXECUTE 'CREATE POLICY "themes_delete_policy" ON themes
            FOR DELETE USING (
                is_user_admin()
            )';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Function Updated: is_user_admin()';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Now checks stakeholder_roles table';
    RAISE NOTICE '✓ Looks for role_type = ''administrator''';
    RAISE NOTICE '✓ No longer depends on users table';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Admins can now assign roles via RLS';
    RAISE NOTICE '========================================';
END $$;
