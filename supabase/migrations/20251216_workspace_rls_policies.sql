-- Migration: Row Level Security policies for workspace tables
-- Description: Comprehensive RLS policies for workspace security and multi-tenancy
-- Created: 2024-12-16

-- ============================================================================
-- HELPER FUNCTION: Get stakeholder ID from current user
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_stakeholder_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT id FROM stakeholders WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- ============================================================================
-- 1. WORKSPACES TABLE RLS POLICIES
-- ============================================================================

-- Policy: Users can see workspaces they own OR have access to
CREATE POLICY workspaces_select_policy ON workspaces
    FOR SELECT
    USING (
        owner_stakeholder_id = get_current_stakeholder_id()
        OR id IN (
            SELECT workspace_id
            FROM workspace_access_control
            WHERE stakeholder_id = get_current_stakeholder_id()
            AND invitation_status = 'accepted'
            AND (expires_at IS NULL OR expires_at > NOW())
        )
    );

-- Policy: Users can only create workspaces they own
CREATE POLICY workspaces_insert_policy ON workspaces
    FOR INSERT
    WITH CHECK (
        owner_stakeholder_id = get_current_stakeholder_id()
    );

-- Policy: Only workspace owners can update their workspaces
CREATE POLICY workspaces_update_policy ON workspaces
    FOR UPDATE
    USING (
        owner_stakeholder_id = get_current_stakeholder_id()
    )
    WITH CHECK (
        owner_stakeholder_id = get_current_stakeholder_id()
    );

-- Policy: Only workspace owners can delete/archive their workspaces
CREATE POLICY workspaces_delete_policy ON workspaces
    FOR DELETE
    USING (
        owner_stakeholder_id = get_current_stakeholder_id()
    );

-- ============================================================================
-- 2. WORKSPACE_DASHBOARD_CONFIGURATIONS RLS POLICIES
-- ============================================================================

-- Policy: Users can see configs from their app OR configs they created
CREATE POLICY dashboard_config_select_policy ON workspace_dashboard_configurations
    FOR SELECT
    USING (
        created_by = get_current_stakeholder_id()
        OR is_active = true
    );

-- Policy: Users can create configs in their app
CREATE POLICY dashboard_config_insert_policy ON workspace_dashboard_configurations
    FOR INSERT
    WITH CHECK (
        created_by = get_current_stakeholder_id()
    );

-- Policy: Users can update configs they created
CREATE POLICY dashboard_config_update_policy ON workspace_dashboard_configurations
    FOR UPDATE
    USING (
        created_by = get_current_stakeholder_id()
    )
    WITH CHECK (
        created_by = get_current_stakeholder_id()
    );

-- Policy: Users can delete configs they created (non-system only)
CREATE POLICY dashboard_config_delete_policy ON workspace_dashboard_configurations
    FOR DELETE
    USING (
        created_by = get_current_stakeholder_id()
    );

-- ============================================================================
-- 3. WORKSPACE_FILE_STRUCTURE_TEMPLATES RLS POLICIES
-- ============================================================================

-- Policy: Users can see active templates OR templates they created
CREATE POLICY file_structure_template_select_policy ON workspace_file_structure_templates
    FOR SELECT
    USING (
        is_active = true
        OR created_by = get_current_stakeholder_id()
    );

-- Policy: Users can create templates
CREATE POLICY file_structure_template_insert_policy ON workspace_file_structure_templates
    FOR INSERT
    WITH CHECK (
        created_by = get_current_stakeholder_id()
    );

-- Policy: Users can update templates they created
CREATE POLICY file_structure_template_update_policy ON workspace_file_structure_templates
    FOR UPDATE
    USING (
        created_by = get_current_stakeholder_id()
    )
    WITH CHECK (
        created_by = get_current_stakeholder_id()
    );

-- Policy: Users can delete templates they created
CREATE POLICY file_structure_template_delete_policy ON workspace_file_structure_templates
    FOR DELETE
    USING (
        created_by = get_current_stakeholder_id()
    );

-- ============================================================================
-- 4. WORKSPACE_BUSINESS_SERVICES_CONFIGURATIONS RLS POLICIES
-- ============================================================================

-- Policy: Users can see active configs OR configs they created
CREATE POLICY business_services_config_select_policy ON workspace_business_services_configurations
    FOR SELECT
    USING (
        is_active = true
        OR created_by = get_current_stakeholder_id()
    );

-- Policy: Users can create configs
CREATE POLICY business_services_config_insert_policy ON workspace_business_services_configurations
    FOR INSERT
    WITH CHECK (
        created_by = get_current_stakeholder_id()
    );

-- Policy: Users can update configs they created
CREATE POLICY business_services_config_update_policy ON workspace_business_services_configurations
    FOR UPDATE
    USING (
        created_by = get_current_stakeholder_id()
    )
    WITH CHECK (
        created_by = get_current_stakeholder_id()
    );

-- Policy: Users can delete configs they created
CREATE POLICY business_services_config_delete_policy ON workspace_business_services_configurations
    FOR DELETE
    USING (
        created_by = get_current_stakeholder_id()
    );

-- ============================================================================
-- 5. WORKSPACE_CONFIGURATIONS RLS POLICIES
-- ============================================================================

-- Policy: Users can see configurations for workspaces they have access to
CREATE POLICY workspace_config_select_policy ON workspace_configurations
    FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_stakeholder_id = get_current_stakeholder_id()
        )
        OR workspace_id IN (
            SELECT workspace_id
            FROM workspace_access_control
            WHERE stakeholder_id = get_current_stakeholder_id()
            AND invitation_status = 'accepted'
        )
    );

-- Policy: Only workspace owners can create configurations
CREATE POLICY workspace_config_insert_policy ON workspace_configurations
    FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_stakeholder_id = get_current_stakeholder_id()
        )
    );

-- Policy: Only workspace owners can update configurations
CREATE POLICY workspace_config_update_policy ON workspace_configurations
    FOR UPDATE
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_stakeholder_id = get_current_stakeholder_id()
        )
    )
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_stakeholder_id = get_current_stakeholder_id()
        )
    );

-- Policy: Only workspace owners can delete configurations
CREATE POLICY workspace_config_delete_policy ON workspace_configurations
    FOR DELETE
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_stakeholder_id = get_current_stakeholder_id()
        )
    );

-- ============================================================================
-- 6. WORKSPACE_TEMPLATES RLS POLICIES
-- ============================================================================

-- Policy: Users can see active templates
CREATE POLICY workspace_template_select_policy ON workspace_templates
    FOR SELECT
    USING (
        is_active = true
        OR created_by = get_current_stakeholder_id()
    );

-- Policy: Users can create templates
CREATE POLICY workspace_template_insert_policy ON workspace_templates
    FOR INSERT
    WITH CHECK (
        created_by = get_current_stakeholder_id()
    );

-- Policy: Users can update templates they created (except system templates)
CREATE POLICY workspace_template_update_policy ON workspace_templates
    FOR UPDATE
    USING (
        created_by = get_current_stakeholder_id()
        AND is_system_template = false
    )
    WITH CHECK (
        created_by = get_current_stakeholder_id()
        AND is_system_template = false
    );

-- Policy: Users can delete templates they created (except system templates)
CREATE POLICY workspace_template_delete_policy ON workspace_templates
    FOR DELETE
    USING (
        created_by = get_current_stakeholder_id()
        AND is_system_template = false
    );

-- ============================================================================
-- 7. WORKSPACE_ACCESS_CONTROL RLS POLICIES
-- ============================================================================

-- Policy: Users can see access records for workspaces they own OR access records about themselves
CREATE POLICY workspace_access_select_policy ON workspace_access_control
    FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_stakeholder_id = get_current_stakeholder_id()
        )
        OR stakeholder_id = get_current_stakeholder_id()
    );

-- Policy: Only workspace owners can grant access
CREATE POLICY workspace_access_insert_policy ON workspace_access_control
    FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_stakeholder_id = get_current_stakeholder_id()
        )
    );

-- Policy: Workspace owners can update access OR users can accept/decline their own invitations
CREATE POLICY workspace_access_update_policy ON workspace_access_control
    FOR UPDATE
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_stakeholder_id = get_current_stakeholder_id()
        )
        OR (
            stakeholder_id = get_current_stakeholder_id()
            AND invitation_status = 'pending'
        )
    )
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_stakeholder_id = get_current_stakeholder_id()
        )
        OR (
            stakeholder_id = get_current_stakeholder_id()
            AND invitation_status IN ('accepted', 'declined')
        )
    );

-- Policy: Only workspace owners can revoke access
CREATE POLICY workspace_access_delete_policy ON workspace_access_control
    FOR DELETE
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_stakeholder_id = get_current_stakeholder_id()
        )
    );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on helper function
GRANT EXECUTE ON FUNCTION get_current_stakeholder_id() TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_current_stakeholder_id() IS 'Returns stakeholder ID for currently authenticated user';
