-- ============================================================================
-- Update provision_stakeholder_v2 to support app_uuid multi-tenancy
-- File: 20251109142559_update_provision_stakeholder_v2_app_uuid.sql
-- Purpose: Add app_uuid parameter and use it when creating stakeholder_roles and relationships
-- Dependencies: 20251109142557_add_app_uuid_multitenancy.sql
-- ============================================================================

-- Drop all existing versions of provision_stakeholder_v2
DROP FUNCTION IF EXISTS provision_stakeholder_v2(JSONB, TEXT[], UUID, JSONB, UUID, TEXT, BOOLEAN, UUID);
DROP FUNCTION IF EXISTS provision_stakeholder_v2(JSONB, TEXT[], UUID, JSONB, UUID, TEXT, BOOLEAN, UUID, UUID);
DROP FUNCTION IF EXISTS provision_stakeholder_v2;

-- Create new version with app_uuid parameter
CREATE FUNCTION provision_stakeholder_v2(
    p_stakeholder JSONB,
    p_role_codes TEXT[] DEFAULT NULL,
    p_primary_role_id UUID DEFAULT NULL,
    p_relationships JSONB DEFAULT NULL,
    p_auth_user_id UUID DEFAULT NULL,
    p_invite_email TEXT DEFAULT NULL,
    p_is_user BOOLEAN DEFAULT FALSE,
    p_created_by UUID DEFAULT NULL,
    p_app_uuid UUID DEFAULT NULL  -- NEW PARAMETER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stakeholder_id UUID;
    v_reference TEXT;
    v_stakeholder_type_id UUID;
    v_role_code TEXT;
    v_role_id UUID;
    v_relationship JSONB;
    v_core_config JSONB;
    v_role_config_key TEXT;
    v_workflow_instance_id UUID;
    v_result JSONB;
    v_app_uuid UUID;
BEGIN
    -- Get app_uuid - use provided value or get current active app
    v_app_uuid := COALESCE(
        p_app_uuid,
        (SELECT app_uuid FROM site_settings WHERE is_active_app = true LIMIT 1)
    );

    -- Validate we have an app_uuid
    IF v_app_uuid IS NULL THEN
        RAISE EXCEPTION 'No app_uuid provided and no active app found in site_settings';
    END IF;

    v_stakeholder_type_id := (p_stakeholder->>'stakeholder_type_id')::UUID;

    -- Generate reference
    v_reference := 'STK-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    WHILE EXISTS (SELECT 1 FROM stakeholders WHERE reference = v_reference) LOOP
        v_reference := 'STK-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    END LOOP;

    -- Insert stakeholder (no app_uuid - stakeholders are global)
    INSERT INTO stakeholders (
        reference, name, stakeholder_type_id, primary_role_id, email, phone,
        country, city, status, is_verified, auth_user_id, invite_email, is_user, created_by
    ) VALUES (
        v_reference,
        p_stakeholder->>'name',
        v_stakeholder_type_id,
        COALESCE(p_primary_role_id, (p_stakeholder->>'primary_role_id')::UUID),
        p_stakeholder->>'email',
        p_stakeholder->>'phone',
        p_stakeholder->>'country',
        p_stakeholder->>'city',
        COALESCE(p_stakeholder->>'status', 'active'),
        COALESCE((p_stakeholder->>'is_verified')::BOOLEAN, FALSE),
        COALESCE(p_auth_user_id, (p_stakeholder->>'auth_user_id')::UUID),
        COALESCE(p_invite_email, p_stakeholder->>'invite_email'),
        COALESCE(p_is_user, COALESCE((p_stakeholder->>'is_user')::BOOLEAN, FALSE)),
        COALESCE(p_created_by, (p_stakeholder->>'created_by')::UUID)
    )
    RETURNING id INTO v_stakeholder_id;

    -- Process roles (NOW WITH app_uuid)
    IF p_role_codes IS NOT NULL AND array_length(p_role_codes, 1) > 0 THEN
        FOREACH v_role_code IN ARRAY p_role_codes LOOP
            -- Get role_id from roles table for this app
            SELECT id INTO v_role_id
            FROM roles
            WHERE code = v_role_code
            AND app_uuid = v_app_uuid;

            IF v_role_id IS NOT NULL THEN
                -- Insert with app_uuid
                INSERT INTO stakeholder_roles (stakeholder_id, role_id, role_type, app_uuid)
                VALUES (v_stakeholder_id, v_role_id, v_role_code, v_app_uuid)
                ON CONFLICT (stakeholder_id, role_type, app_uuid) DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- Process relationships (NOW WITH app_uuid)
    IF p_relationships IS NOT NULL THEN
        FOR v_relationship IN SELECT * FROM jsonb_array_elements(p_relationships) LOOP
            INSERT INTO relationships (
                from_stakeholder_id,
                to_stakeholder_id,
                relationship_type_id,
                strength,
                status,
                app_uuid  -- NEW COLUMN
            )
            VALUES (
                v_stakeholder_id,
                (v_relationship->>'to_stakeholder_id')::UUID,
                (v_relationship->>'relationship_type_id')::UUID,
                COALESCE((v_relationship->>'strength')::INTEGER, 5),
                'active',
                v_app_uuid  -- NEW VALUE
            )
            ON CONFLICT (from_stakeholder_id, to_stakeholder_id, relationship_type_id, app_uuid) DO NOTHING;
        END LOOP;
    END IF;

    -- Generate core_config
    v_role_config_key := COALESCE(array_to_string(p_role_codes, '_'), 'default');
    v_core_config := jsonb_build_object(
        '__meta', jsonb_build_object(
            'version', '1.0',
            'created_at', NOW()::text,
            'stakeholder_id', v_stakeholder_id::text,
            'roles', to_jsonb(p_role_codes),
            'app_uuid', v_app_uuid::text  -- NEW: Track which app this config was created for
        ),
        'function_registry', jsonb_build_array(
            jsonb_build_object('id', 'file_view', 'name', 'File View', 'description', 'View workspace files', 'icon', 'folder', 'enabled', true),
            jsonb_build_object('id', 'profile_view', 'name', 'Profile', 'description', 'View and manage profile', 'icon', 'user', 'enabled', true)
        ),
        'role_configurations', jsonb_build_object(
            v_role_config_key, jsonb_build_object(
                'dashboard_name', 'Workspace Dashboard',
                'menu_items', jsonb_build_array('file_view', 'profile_view'),
                'widgets', jsonb_build_array(
                    jsonb_build_object('component', 'ProfileCard', 'props', jsonb_build_object(), 'layout', jsonb_build_object('class', 'w-full')),
                    jsonb_build_object('component', 'RolesRelationshipsWidget', 'props', jsonb_build_object(), 'layout', jsonb_build_object('class', 'w-1/3')),
                    jsonb_build_object('component', 'WorkflowTasksWidget', 'props', jsonb_build_object(), 'layout', jsonb_build_object('class', 'w-2/3'))
                )
            )
        )
    );

    -- Update with core_config
    UPDATE stakeholders SET core_config = v_core_config WHERE id = v_stakeholder_id;

    -- Create workspace node (if nodes table exists and has app_uuid)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'nodes') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nodes' AND column_name = 'app_uuid') THEN
            INSERT INTO nodes (name, type, parent_id, owner_id, app_uuid)
            VALUES ('My Workspace', 'folder', NULL, v_stakeholder_id, v_app_uuid);
        ELSE
            INSERT INTO nodes (name, type, parent_id, owner_id)
            VALUES ('My Workspace', 'folder', NULL, v_stakeholder_id);
        END IF;
    END IF;

    -- Create welcome notification (if notifications table exists and has app_uuid)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'notifications') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'app_uuid') THEN
            INSERT INTO notifications (stakeholder_id, notification_type, title, message, is_read, app_uuid)
            VALUES (v_stakeholder_id, 'welcome', 'Welcome!', 'Welcome to your workspace!', false, v_app_uuid);
        ELSE
            INSERT INTO notifications (stakeholder_id, notification_type, title, message, is_read)
            VALUES (v_stakeholder_id, 'welcome', 'Welcome!', 'Welcome to your workspace!', false);
        END IF;
    END IF;

    -- Create workflow (if workflow_instances table exists and has app_uuid)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'workflow_instances') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_instances' AND column_name = 'app_uuid') THEN
            INSERT INTO workflow_instances (instance_code, stakeholder_id, workflow_type, status, maturity_gate, app_uuid)
            VALUES ('WELCOME-' || SUBSTRING(v_stakeholder_id::text FROM 1 FOR 8), v_stakeholder_id, 'onboarding', 'active', 'initiated', v_app_uuid)
            RETURNING id INTO v_workflow_instance_id;
        ELSE
            INSERT INTO workflow_instances (instance_code, stakeholder_id, workflow_type, status, maturity_gate)
            VALUES ('WELCOME-' || SUBSTRING(v_stakeholder_id::text FROM 1 FOR 8), v_stakeholder_id, 'onboarding', 'active', 'initiated')
            RETURNING id INTO v_workflow_instance_id;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'activities') THEN
            INSERT INTO activities (workflow_instance_id, activity_code, activity_name, owner, status, due_date)
            VALUES (v_workflow_instance_id, 'ACCEPT_TERMS', 'Accept Terms & Conditions', 'stakeholder', 'pending', NOW() + INTERVAL '7 days');
        END IF;
    END IF;

    -- Build and return result
    v_result := jsonb_build_object(
        'stakeholder_out_id', v_stakeholder_id,
        'reference_out', v_reference,
        'success_out', true,
        'message_out', 'Success',
        'app_uuid_out', v_app_uuid  -- NEW: Return the app_uuid used
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'stakeholder_out_id', NULL,
            'reference_out', NULL,
            'success_out', false,
            'message_out', SQLERRM,
            'app_uuid_out', NULL
        );
END;
$$;

COMMENT ON FUNCTION provision_stakeholder_v2 IS
'Provisions a new stakeholder with roles, relationships, and workspace for a specific application.
Parameters:
- p_app_uuid: UUID of the application (defaults to current active app if not provided)
All stakeholder_roles and relationships are created with this app_uuid.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'provision_stakeholder_v2 Updated for Multi-Tenancy';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Changes:';
    RAISE NOTICE '- Added p_app_uuid parameter (defaults to active app)';
    RAISE NOTICE '- stakeholder_roles now include app_uuid';
    RAISE NOTICE '- relationships now include app_uuid';
    RAISE NOTICE '- core_config tracks app_uuid in __meta';
    RAISE NOTICE '- nodes, notifications, workflows include app_uuid if column exists';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next step: Update application code to use new library functions';
    RAISE NOTICE '========================================';
END $$;
