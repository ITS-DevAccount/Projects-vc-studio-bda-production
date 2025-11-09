-- ============================================================================
-- RLS POLICIES: Multi-Tenancy Application Isolation
-- File: 20251109142558_rls_policies_multitenancy.sql
-- Purpose: Enforce app-level data isolation via Row Level Security
-- Dependencies: 20251109142557_add_app_uuid_multitenancy.sql
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Get apps for current user
-- ============================================================================

-- This function returns the app_uuids that the current authenticated user has access to
-- via their stakeholder_roles assignments
CREATE OR REPLACE FUNCTION public.get_user_app_uuids()
RETURNS SETOF UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT DISTINCT sr.app_uuid
    FROM stakeholder_roles sr
    INNER JOIN stakeholders s ON s.id = sr.stakeholder_id
    WHERE s.auth_user_id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_user_app_uuids() IS
'Returns app_uuids that the current user has access to via stakeholder_roles';

-- ============================================================================
-- HELPER FUNCTION: Check if user is admin
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM users u
        WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('super_admin', 'domain_admin', 'admin')
    );
$$;

COMMENT ON FUNCTION public.is_user_admin() IS
'Returns true if the current user has an admin role';

-- ============================================================================
-- ROLES TABLE RLS POLICIES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== Updating RLS policies for roles table ===';
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "anon_users_select_active_roles" ON roles;
DROP POLICY IF EXISTS "authenticated_users_select_roles" ON roles;
DROP POLICY IF EXISTS "authenticated_users_insert_roles" ON roles;
DROP POLICY IF EXISTS "authenticated_users_update_roles" ON roles;
DROP POLICY IF EXISTS "authenticated_users_delete_roles" ON roles;
DROP POLICY IF EXISTS "roles_admin_select" ON roles;
DROP POLICY IF EXISTS "roles_admin_insert" ON roles;
DROP POLICY IF EXISTS "roles_admin_update" ON roles;
DROP POLICY IF EXISTS "roles_admin_delete" ON roles;

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Users can see roles for apps they belong to, admins see all
CREATE POLICY "roles_select_policy" ON roles
    FOR SELECT USING (
        is_user_admin()
        OR
        app_uuid IN (SELECT get_user_app_uuids())
    );

-- Policy: INSERT - Only admins can create roles
CREATE POLICY "roles_insert_policy" ON roles
    FOR INSERT WITH CHECK (
        is_user_admin()
    );

-- Policy: UPDATE - Only admins can update roles
CREATE POLICY "roles_update_policy" ON roles
    FOR UPDATE USING (
        is_user_admin()
    ) WITH CHECK (
        is_user_admin()
    );

-- Policy: DELETE - Only admins can delete roles
CREATE POLICY "roles_delete_policy" ON roles
    FOR DELETE USING (
        is_user_admin()
    );

-- ============================================================================
-- RELATIONSHIP_TYPES TABLE RLS POLICIES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== Updating RLS policies for relationship_types table ===';
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "anon_users_select_relationship_types" ON relationship_types;
DROP POLICY IF EXISTS "authenticated_users_select_relationship_types" ON relationship_types;
DROP POLICY IF EXISTS "authenticated_users_insert_relationship_types" ON relationship_types;
DROP POLICY IF EXISTS "authenticated_users_update_relationship_types" ON relationship_types;
DROP POLICY IF EXISTS "authenticated_users_delete_relationship_types" ON relationship_types;
DROP POLICY IF EXISTS "relationship_types_select" ON relationship_types;
DROP POLICY IF EXISTS "relationship_types_insert" ON relationship_types;
DROP POLICY IF EXISTS "relationship_types_update" ON relationship_types;
DROP POLICY IF EXISTS "relationship_types_delete" ON relationship_types;

-- Enable RLS
ALTER TABLE relationship_types ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Users can see relationship types for apps they belong to, admins see all
CREATE POLICY "relationship_types_select_policy" ON relationship_types
    FOR SELECT USING (
        is_user_admin()
        OR
        app_uuid IN (SELECT get_user_app_uuids())
    );

-- Policy: INSERT - Only admins can create relationship types
CREATE POLICY "relationship_types_insert_policy" ON relationship_types
    FOR INSERT WITH CHECK (
        is_user_admin()
    );

-- Policy: UPDATE - Only admins can update relationship types
CREATE POLICY "relationship_types_update_policy" ON relationship_types
    FOR UPDATE USING (
        is_user_admin()
    ) WITH CHECK (
        is_user_admin()
    );

-- Policy: DELETE - Only admins can delete relationship types
CREATE POLICY "relationship_types_delete_policy" ON relationship_types
    FOR DELETE USING (
        is_user_admin()
    );

-- ============================================================================
-- RELATIONSHIPS TABLE RLS POLICIES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== Updating RLS policies for relationships table ===';
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "anon_users_insert_relationships" ON relationships;
DROP POLICY IF EXISTS "authenticated_users_select_relationships" ON relationships;
DROP POLICY IF EXISTS "authenticated_users_insert_relationships" ON relationships;
DROP POLICY IF EXISTS "authenticated_users_update_relationships" ON relationships;
DROP POLICY IF EXISTS "authenticated_users_delete_relationships" ON relationships;
DROP POLICY IF EXISTS "relationships_select" ON relationships;
DROP POLICY IF EXISTS "relationships_insert" ON relationships;
DROP POLICY IF EXISTS "relationships_update" ON relationships;
DROP POLICY IF EXISTS "relationships_delete" ON relationships;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON relationships;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON relationships;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON relationships;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON relationships;

-- Enable RLS
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Users can see relationships in apps they belong to
CREATE POLICY "relationships_select_policy" ON relationships
    FOR SELECT USING (
        app_uuid IN (SELECT get_user_app_uuids())
    );

-- Policy: INSERT - Users can create relationships in apps they belong to
CREATE POLICY "relationships_insert_policy" ON relationships
    FOR INSERT WITH CHECK (
        app_uuid IN (SELECT get_user_app_uuids())
    );

-- Policy: UPDATE - Users can update relationships in apps they belong to
CREATE POLICY "relationships_update_policy" ON relationships
    FOR UPDATE USING (
        app_uuid IN (SELECT get_user_app_uuids())
    ) WITH CHECK (
        app_uuid IN (SELECT get_user_app_uuids())
    );

-- Policy: DELETE - Users can delete relationships in apps they belong to
CREATE POLICY "relationships_delete_policy" ON relationships
    FOR DELETE USING (
        app_uuid IN (SELECT get_user_app_uuids())
    );

-- ============================================================================
-- STAKEHOLDER_ROLES TABLE RLS POLICIES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== Updating RLS policies for stakeholder_roles table ===';
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "anon_users_insert_stakeholder_roles" ON stakeholder_roles;
DROP POLICY IF EXISTS "authenticated_users_insert_stakeholder_roles" ON stakeholder_roles;
DROP POLICY IF EXISTS "Stakeholders can view own roles" ON stakeholder_roles;
DROP POLICY IF EXISTS "Authenticated users can manage stakeholder roles" ON stakeholder_roles;
DROP POLICY IF EXISTS "stakeholder_roles_select" ON stakeholder_roles;
DROP POLICY IF EXISTS "stakeholder_roles_insert" ON stakeholder_roles;
DROP POLICY IF EXISTS "stakeholder_roles_update" ON stakeholder_roles;
DROP POLICY IF EXISTS "stakeholder_roles_delete" ON stakeholder_roles;
DROP POLICY IF EXISTS "stakeholder_roles_select_policy" ON stakeholder_roles;
DROP POLICY IF EXISTS "stakeholder_roles_insert_policy" ON stakeholder_roles;
DROP POLICY IF EXISTS "stakeholder_roles_update_policy" ON stakeholder_roles;
DROP POLICY IF EXISTS "stakeholder_roles_delete_policy" ON stakeholder_roles;

-- Enable RLS
ALTER TABLE stakeholder_roles ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Users can see stakeholder roles in apps they belong to
CREATE POLICY "stakeholder_roles_select_policy" ON stakeholder_roles
    FOR SELECT USING (
        app_uuid IN (SELECT get_user_app_uuids())
        OR
        is_user_admin()
    );

-- Policy: INSERT - Users can assign roles in apps they belong to, or admins can assign anywhere
CREATE POLICY "stakeholder_roles_insert_policy" ON stakeholder_roles
    FOR INSERT WITH CHECK (
        app_uuid IN (SELECT get_user_app_uuids())
        OR
        is_user_admin()
    );

-- Policy: UPDATE - Users can update roles in apps they belong to, or admins can update anywhere
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

-- Policy: DELETE - Users can remove roles in apps they belong to, or admins can remove anywhere
CREATE POLICY "stakeholder_roles_delete_policy" ON stakeholder_roles
    FOR DELETE USING (
        app_uuid IN (SELECT get_user_app_uuids())
        OR
        is_user_admin()
    );

-- ============================================================================
-- THEMES TABLE RLS POLICIES (if table exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'themes') THEN
        RAISE NOTICE '=== Updating RLS policies for themes table ===';

        -- Drop existing policies
        EXECUTE 'DROP POLICY IF EXISTS "themes_select" ON themes';
        EXECUTE 'DROP POLICY IF EXISTS "themes_insert" ON themes';
        EXECUTE 'DROP POLICY IF EXISTS "themes_update" ON themes';
        EXECUTE 'DROP POLICY IF EXISTS "themes_delete" ON themes';
        EXECUTE 'DROP POLICY IF EXISTS "themes_select_policy" ON themes';
        EXECUTE 'DROP POLICY IF EXISTS "themes_insert_policy" ON themes';
        EXECUTE 'DROP POLICY IF EXISTS "themes_update_policy" ON themes';
        EXECUTE 'DROP POLICY IF EXISTS "themes_delete_policy" ON themes';

        -- Enable RLS
        EXECUTE 'ALTER TABLE themes ENABLE ROW LEVEL SECURITY';

        -- Policy: SELECT - Users can see themes for apps they belong to
        EXECUTE 'CREATE POLICY "themes_select_policy" ON themes
            FOR SELECT USING (
                app_uuid IN (SELECT get_user_app_uuids())
                OR
                is_user_admin()
            )';

        -- Policy: INSERT - Only admins can create themes
        EXECUTE 'CREATE POLICY "themes_insert_policy" ON themes
            FOR INSERT WITH CHECK (
                is_user_admin()
            )';

        -- Policy: UPDATE - Only admins can update themes
        EXECUTE 'CREATE POLICY "themes_update_policy" ON themes
            FOR UPDATE USING (
                is_user_admin()
            ) WITH CHECK (
                is_user_admin()
            )';

        -- Policy: DELETE - Only admins can delete themes
        EXECUTE 'CREATE POLICY "themes_delete_policy" ON themes
            FOR DELETE USING (
                is_user_admin()
            )';

        RAISE NOTICE '✓ Updated RLS policies for themes table';
    ELSE
        RAISE NOTICE '⚠ themes table does not exist - skipping RLS policies';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS Policies Migration COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Policies updated for:';
    RAISE NOTICE '- roles (4 policies)';
    RAISE NOTICE '- relationship_types (4 policies)';
    RAISE NOTICE '- relationships (4 policies)';
    RAISE NOTICE '- stakeholder_roles (4 policies)';
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'themes') THEN
        RAISE NOTICE '- themes (4 policies)';
    END IF;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Helper functions created:';
    RAISE NOTICE '- get_user_app_uuids()';
    RAISE NOTICE '- is_user_admin()';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next step: Update provision_stakeholder_v2 function';
    RAISE NOTICE '========================================';
END $$;
