-- Migration: Workspace database functions
-- Description: Core business logic functions for workspace provisioning and management
-- Created: 2024-12-16

-- ============================================================================
-- 1. PROVISION_WORKSPACE - Main workspace creation function
-- ============================================================================

CREATE OR REPLACE FUNCTION provision_workspace(
    p_workspace_name TEXT,
    p_owner_stakeholder_id UUID,
    p_app_uuid UUID,
    p_primary_role_code TEXT,
    p_template_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_workspace_id UUID;
    v_reference TEXT;
    v_dashboard_config_id UUID;
    v_file_structure_template_id UUID;
    v_business_services_config_id UUID;
    v_root_folder_id UUID;
    v_result JSONB;
    v_auth_user_id UUID;
    v_folders_created INTEGER := 0;
BEGIN
    -- Get auth_user_id for the stakeholder
    SELECT auth_user_id INTO v_auth_user_id
    FROM stakeholders
    WHERE id = p_owner_stakeholder_id;

    -- Generate unique workspace reference
    v_reference := 'WKS-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    WHILE EXISTS (SELECT 1 FROM workspaces WHERE reference = v_reference) LOOP
        v_reference := 'WKS-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    END LOOP;

    -- Get configuration IDs from template (if provided)
    IF p_template_id IS NOT NULL THEN
        SELECT
            dashboard_config_id,
            file_structure_template_id,
            business_services_config_id
        INTO
            v_dashboard_config_id,
            v_file_structure_template_id,
            v_business_services_config_id
        FROM workspace_templates
        WHERE id = p_template_id
        AND is_active = true;

        -- Update template usage count
        UPDATE workspace_templates
        SET usage_count = usage_count + 1,
            updated_at = NOW()
        WHERE id = p_template_id;
    END IF;

    -- Create workspace record
    INSERT INTO workspaces (
        reference,
        name,
        description,
        owner_stakeholder_id,
        app_uuid,
        primary_role_code,
        created_from_template_id,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_reference,
        p_workspace_name,
        p_description,
        p_owner_stakeholder_id,
        p_app_uuid,
        p_primary_role_code,
        p_template_id,
        'active',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_workspace_id;

    -- Create workspace configuration record
    INSERT INTO workspace_configurations (
        workspace_id,
        dashboard_config_id,
        file_structure_template_id,
        business_services_config_id,
        applied_by,
        applied_at,
        is_active
    ) VALUES (
        v_workspace_id,
        v_dashboard_config_id,
        v_file_structure_template_id,
        v_business_services_config_id,
        p_owner_stakeholder_id,
        NOW(),
        true
    );

    -- Grant owner access automatically
    INSERT INTO workspace_access_control (
        workspace_id,
        stakeholder_id,
        access_role,
        permissions,
        invitation_status,
        invited_at,
        accepted_at,
        granted_at
    ) VALUES (
        v_workspace_id,
        p_owner_stakeholder_id,
        'owner',
        jsonb_build_object(
            'can_edit_dashboard', true,
            'can_manage_files', true,
            'can_invite_users', true,
            'can_configure_services', true,
            'can_view_audit_logs', true,
            'can_delete_workspace', true
        ),
        'accepted',
        NOW(),
        NOW(),
        NOW()
    );

    -- Create root workspace folder in nodes table
    INSERT INTO nodes (
        name,
        type,
        parent_id,
        owner_id,
        app_uuid,
        description,
        created_by,
        tags,
        created_at
    ) VALUES (
        p_workspace_name || ' Files',
        'folder',
        NULL,
        p_owner_stakeholder_id,
        p_app_uuid,
        'Root folder for ' || p_workspace_name,
        v_auth_user_id,
        ARRAY['workspace', 'root', v_reference],
        NOW()
    )
    RETURNING id INTO v_root_folder_id;

    -- Apply file structure template (if provided)
    IF v_file_structure_template_id IS NOT NULL THEN
        SELECT (apply_file_structure_template(
            v_workspace_id,
            v_file_structure_template_id,
            v_root_folder_id
        )->'folders_created')::INTEGER INTO v_folders_created;
    END IF;

    -- Create audit log entry
    INSERT INTO audit_logs (
        action,
        stakeholder_id,
        workspace_id,
        details,
        created_at
    ) VALUES (
        'workspace_created',
        p_owner_stakeholder_id,
        v_workspace_id,
        jsonb_build_object(
            'workspace_reference', v_reference,
            'workspace_name', p_workspace_name,
            'template_id', p_template_id,
            'root_folder_id', v_root_folder_id,
            'folders_created', v_folders_created,
            'primary_role_code', p_primary_role_code
        ),
        NOW()
    );

    -- Build success result
    v_result := jsonb_build_object(
        'success', true,
        'workspace_id', v_workspace_id,
        'workspace_reference', v_reference,
        'root_folder_id', v_root_folder_id,
        'folders_created', v_folders_created,
        'message', 'Workspace provisioned successfully'
    );

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    -- Return error details
    RETURN jsonb_build_object(
        'success', false,
        'error_code', SQLSTATE,
        'message', SQLERRM,
        'detail', SQLSTATE || ': ' || SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION provision_workspace IS 'Provisions a new workspace with optional template, creates root folder, and grants owner access';

-- ============================================================================
-- 2. APPLY_FILE_STRUCTURE_TEMPLATE - Creates folder hierarchy from template
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_file_structure_template(
    p_workspace_id UUID,
    p_template_id UUID,
    p_parent_folder_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_template_structure JSONB;
    v_app_uuid UUID;
    v_owner_stakeholder_id UUID;
    v_auth_user_id UUID;
    v_folder JSONB;
    v_subfolder JSONB;
    v_folder_id UUID;
    v_created_count INTEGER := 0;
BEGIN
    -- Get workspace context
    SELECT app_uuid, owner_stakeholder_id
    INTO v_app_uuid, v_owner_stakeholder_id
    FROM workspaces
    WHERE id = p_workspace_id;

    -- Get auth_user_id
    SELECT auth_user_id INTO v_auth_user_id
    FROM stakeholders
    WHERE id = v_owner_stakeholder_id;

    -- Get template structure
    SELECT structure_definition
    INTO v_template_structure
    FROM workspace_file_structure_templates
    WHERE id = p_template_id;

    -- Validate template exists
    IF v_template_structure IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Template not found'
        );
    END IF;

    -- Iterate through root folders
    FOR v_folder IN SELECT * FROM jsonb_array_elements(v_template_structure->'root_folders')
    LOOP
        -- Create root folder
        INSERT INTO nodes (
            name,
            type,
            parent_id,
            owner_id,
            app_uuid,
            description,
            tags,
            created_by,
            created_at
        ) VALUES (
            v_folder->>'name',
            'folder',
            p_parent_folder_id,
            v_owner_stakeholder_id,
            v_app_uuid,
            v_folder->>'description',
            COALESCE(
                ARRAY(SELECT jsonb_array_elements_text(v_folder->'tags')),
                '{}'::TEXT[]
            ),
            v_auth_user_id,
            NOW()
        )
        RETURNING id INTO v_folder_id;

        v_created_count := v_created_count + 1;

        -- Create subfolders recursively (if present)
        IF v_folder ? 'subfolders' THEN
            FOR v_subfolder IN SELECT * FROM jsonb_array_elements(v_folder->'subfolders')
            LOOP
                INSERT INTO nodes (
                    name,
                    type,
                    parent_id,
                    owner_id,
                    app_uuid,
                    description,
                    tags,
                    created_by,
                    created_at
                ) VALUES (
                    v_subfolder->>'name',
                    'folder',
                    v_folder_id,
                    v_owner_stakeholder_id,
                    v_app_uuid,
                    v_subfolder->>'description',
                    COALESCE(
                        ARRAY(SELECT jsonb_array_elements_text(v_subfolder->'tags')),
                        '{}'::TEXT[]
                    ),
                    v_auth_user_id,
                    NOW()
                );

                v_created_count := v_created_count + 1;
            END LOOP;
        END IF;
    END LOOP;

    -- Update template usage count
    UPDATE workspace_file_structure_templates
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = p_template_id;

    -- Create audit log
    INSERT INTO audit_logs (
        action,
        stakeholder_id,
        workspace_id,
        details,
        created_at
    ) VALUES (
        'file_structure_initialized',
        v_owner_stakeholder_id,
        p_workspace_id,
        jsonb_build_object(
            'template_id', p_template_id,
            'folders_created', v_created_count,
            'parent_folder_id', p_parent_folder_id
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'folders_created', v_created_count,
        'parent_folder_id', p_parent_folder_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION apply_file_structure_template IS 'Creates hierarchical folder structure from template in nodes table';

-- ============================================================================
-- 3. MIGRATE_STAKEHOLDER_TO_WORKSPACE - Backwards compatibility migration
-- ============================================================================

CREATE OR REPLACE FUNCTION migrate_stakeholder_to_workspace(
    p_stakeholder_id UUID,
    p_app_uuid UUID,
    p_primary_role_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_workspace_exists BOOLEAN;
    v_workspace_id UUID;
    v_core_config JSONB;
    v_dashboard_config_id UUID;
    v_stakeholder_name TEXT;
    v_result JSONB;
BEGIN
    -- Check if workspace already exists
    SELECT EXISTS(
        SELECT 1 FROM workspaces
        WHERE owner_stakeholder_id = p_stakeholder_id
        AND app_uuid = p_app_uuid
        AND primary_role_code = p_primary_role_code
    ) INTO v_workspace_exists;

    IF v_workspace_exists THEN
        SELECT id INTO v_workspace_id
        FROM workspaces
        WHERE owner_stakeholder_id = p_stakeholder_id
        AND app_uuid = p_app_uuid
        AND primary_role_code = p_primary_role_code;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Workspace already exists',
            'workspace_id', v_workspace_id,
            'was_migrated', false
        );
    END IF;

    -- Get stakeholder name and core_config
    SELECT name, core_config
    INTO v_stakeholder_name, v_core_config
    FROM stakeholders
    WHERE id = p_stakeholder_id;

    -- Create dashboard configuration from existing core_config (if exists)
    IF v_core_config IS NOT NULL AND v_core_config != '{}'::JSONB THEN
        INSERT INTO workspace_dashboard_configurations (
            config_name,
            description,
            dashboard_config,
            created_by,
            app_uuid,
            is_default,
            version,
            is_active,
            created_at
        ) VALUES (
            v_stakeholder_name || ' - Migrated Config',
            'Auto-migrated from stakeholder core_config',
            v_core_config,
            p_stakeholder_id,
            p_app_uuid,
            false,
            '1.0',
            true,
            NOW()
        )
        RETURNING id INTO v_dashboard_config_id;
    END IF;

    -- Provision workspace using existing function
    v_result := provision_workspace(
        v_stakeholder_name || ' Workspace',
        p_stakeholder_id,
        p_app_uuid,
        p_primary_role_code,
        NULL, -- No template
        'Auto-migrated personal workspace'
    );

    -- Link dashboard config if created
    IF v_dashboard_config_id IS NOT NULL AND (v_result->>'success')::BOOLEAN THEN
        v_workspace_id := (v_result->>'workspace_id')::UUID;

        UPDATE workspace_configurations
        SET dashboard_config_id = v_dashboard_config_id,
            updated_at = NOW()
        WHERE workspace_id = v_workspace_id
        AND is_active = true;
    END IF;

    -- Add migration metadata to result
    v_result := v_result || jsonb_build_object(
        'was_migrated', true,
        'core_config_migrated', v_dashboard_config_id IS NOT NULL
    );

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION migrate_stakeholder_to_workspace IS 'Migrates existing stakeholder to workspace system, preserving core_config as dashboard configuration';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION provision_workspace TO authenticated;
GRANT EXECUTE ON FUNCTION apply_file_structure_template TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_stakeholder_to_workspace TO authenticated;
