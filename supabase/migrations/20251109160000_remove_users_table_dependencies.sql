-- ============================================================================
-- Remove Legacy Users Table Dependencies
-- File: 20251109160000_remove_users_table_dependencies.sql
-- Purpose: Remove all references to local users table, use auth.users instead
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop Foreign Key Constraints Referencing users Table
-- ============================================================================

-- Drop FK on stakeholders.created_by
ALTER TABLE stakeholders DROP CONSTRAINT IF EXISTS stakeholders_created_by_fkey;

-- Drop FK on nodes.created_by
ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_created_by_fkey;

-- Drop FK on components_registry.created_by
ALTER TABLE components_registry DROP CONSTRAINT IF EXISTS components_registry_created_by_fkey;

-- Check for any other FKs (will show in notices)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT
            tc.table_name,
            tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE ccu.table_name = 'users'
        AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        RAISE NOTICE 'Dropping FK: %.%', r.table_name, r.constraint_name;
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: Make created_by Columns Nullable
-- ============================================================================

ALTER TABLE stakeholders ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE nodes ALTER COLUMN created_by DROP NOT NULL;

-- ============================================================================
-- STEP 3: Add Required Unique Constraints (if missing)
-- ============================================================================

-- stakeholder_roles unique constraint
ALTER TABLE stakeholder_roles
DROP CONSTRAINT IF EXISTS uq_stakeholder_roles_stakeholder_role_app CASCADE;

ALTER TABLE stakeholder_roles
ADD CONSTRAINT uq_stakeholder_roles_stakeholder_role_app
UNIQUE(stakeholder_id, role_type, app_uuid);

-- relationships unique constraint
ALTER TABLE relationships
DROP CONSTRAINT IF EXISTS uq_relationships_from_to_type_app CASCADE;

ALTER TABLE relationships
ADD CONSTRAINT uq_relationships_from_to_type_app
UNIQUE(from_stakeholder_id, to_stakeholder_id, relationship_type_id, app_uuid);

-- ============================================================================
-- STEP 4: Replace provision_stakeholder_v2 Function (Complete)
-- ============================================================================

DROP FUNCTION IF EXISTS provision_stakeholder_v2(JSONB, TEXT[], UUID, JSONB, UUID, TEXT, BOOLEAN, UUID, UUID);

CREATE OR REPLACE FUNCTION provision_stakeholder_v2(
    p_stakeholder JSONB,
    p_role_codes TEXT[] DEFAULT NULL,
    p_primary_role_id UUID DEFAULT NULL,
    p_relationships JSONB DEFAULT NULL,
    p_auth_user_id UUID DEFAULT NULL,
    p_invite_email TEXT DEFAULT NULL,
    p_is_user BOOLEAN DEFAULT FALSE,
    p_created_by UUID DEFAULT NULL,
    p_app_uuid UUID DEFAULT NULL
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
    v_function_registry JSONB;
    v_menu_items JSONB;
    v_component RECORD;
BEGIN
    -- ========================================================================
    -- STEP 1: Validate Prerequisites
    -- ========================================================================

    v_app_uuid := COALESCE(
        p_app_uuid,
        (SELECT app_uuid FROM site_settings WHERE is_active_app = true LIMIT 1)
    );

    IF v_app_uuid IS NULL THEN
        RAISE EXCEPTION 'No app_uuid provided and no active app found in site_settings';
    END IF;

    v_stakeholder_type_id := (p_stakeholder->>'stakeholder_type_id')::UUID;

    IF NOT EXISTS (SELECT 1 FROM stakeholder_types WHERE id = v_stakeholder_type_id) THEN
        RAISE EXCEPTION 'Invalid stakeholder_type_id: %', v_stakeholder_type_id;
    END IF;

    IF p_role_codes IS NOT NULL AND array_length(p_role_codes, 1) > 0 THEN
        FOREACH v_role_code IN ARRAY p_role_codes LOOP
            IF NOT EXISTS (SELECT 1 FROM roles WHERE code = v_role_code AND app_uuid = v_app_uuid) THEN
                RAISE EXCEPTION 'Role % does not exist for app %', v_role_code, v_app_uuid;
            END IF;
        END LOOP;
    END IF;

    -- ========================================================================
    -- STEP 2: Generate Unique Reference
    -- ========================================================================

    v_reference := 'STK-' || to_char(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    FOR i IN 1..10 LOOP
        EXIT WHEN NOT EXISTS (SELECT 1 FROM stakeholders WHERE reference = v_reference);
        v_reference := 'STK-' || to_char(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    END LOOP;

    IF EXISTS (SELECT 1 FROM stakeholders WHERE reference = v_reference) THEN
        RAISE EXCEPTION 'Failed to generate unique reference after 10 attempts';
    END IF;

    -- ========================================================================
    -- STEP 3: Create Stakeholder (NO created_by reference)
    -- ========================================================================

    INSERT INTO stakeholders (
        reference,
        name,
        stakeholder_type_id,
        primary_role_id,
        email,
        phone,
        country,
        city,
        status,
        is_verified,
        auth_user_id,
        invite_email,
        is_user
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
        p_auth_user_id,
        COALESCE(p_invite_email, p_stakeholder->>'invite_email'),
        COALESCE(p_is_user, COALESCE((p_stakeholder->>'is_user')::BOOLEAN, FALSE))
    )
    RETURNING id INTO v_stakeholder_id;

    -- ========================================================================
    -- STEP 4: Assign Roles
    -- ========================================================================

    IF p_role_codes IS NOT NULL AND array_length(p_role_codes, 1) > 0 THEN
        FOREACH v_role_code IN ARRAY p_role_codes LOOP
            SELECT id INTO v_role_id
            FROM roles
            WHERE code = v_role_code AND app_uuid = v_app_uuid;

            INSERT INTO stakeholder_roles (stakeholder_id, role_id, role_type, app_uuid)
            VALUES (v_stakeholder_id, v_role_id, v_role_code, v_app_uuid);
        END LOOP;
    END IF;

    -- ========================================================================
    -- STEP 5: Create Relationships
    -- ========================================================================

    IF p_relationships IS NOT NULL THEN
        FOR v_relationship IN SELECT * FROM jsonb_array_elements(p_relationships) LOOP
            IF NOT EXISTS (
                SELECT 1 FROM stakeholders
                WHERE id = (v_relationship->>'to_stakeholder_id')::UUID
            ) THEN
                RAISE EXCEPTION 'to_stakeholder_id % does not exist', v_relationship->>'to_stakeholder_id';
            END IF;

            INSERT INTO relationships (
                from_stakeholder_id,
                to_stakeholder_id,
                relationship_type_id,
                strength,
                status,
                app_uuid
            ) VALUES (
                v_stakeholder_id,
                (v_relationship->>'to_stakeholder_id')::UUID,
                (v_relationship->>'relationship_type_id')::UUID,
                COALESCE((v_relationship->>'strength')::INTEGER, 5),
                'active',
                v_app_uuid
            );
        END LOOP;
    END IF;

    -- ========================================================================
    -- STEP 6: Generate Core Config from Components Registry
    -- ========================================================================

    v_function_registry := jsonb_build_array();

    FOR v_component IN
        SELECT component_code, component_name, icon_name
        FROM components_registry
        WHERE app_uuid = v_app_uuid AND is_active = true
        ORDER BY component_code
    LOOP
        v_function_registry := v_function_registry || jsonb_build_object(
            'id', v_component.component_code,
            'label', v_component.component_name,
            'icon', COALESCE(v_component.icon_name, 'circle'),
            'component_code', v_component.component_code,
            'access_key', 'READ_' || UPPER(v_component.component_code)
        );
    END LOOP;

    v_menu_items := jsonb_build_array();

    FOR v_component IN
        SELECT component_code, component_name
        FROM components_registry
        WHERE app_uuid = v_app_uuid AND is_active = true
        ORDER BY
            CASE component_code
                WHEN 'file_explorer' THEN 1
                WHEN 'file_uploader' THEN 2
                WHEN 'folder_creator' THEN 3
                WHEN 'workflow_tasks' THEN 4
                WHEN 'vc_pyramid' THEN 5
                ELSE 99
            END
        LIMIT 5
    LOOP
        v_menu_items := v_menu_items || jsonb_build_object(
            'label', v_component.component_name,
            'component_id', v_component.component_code,
            'position', jsonb_array_length(v_menu_items) + 1,
            'is_default', (v_component.component_code = 'file_explorer')
        );
    END LOOP;

    v_role_config_key := COALESCE(array_to_string(p_role_codes, '_'), 'default');

    v_core_config := jsonb_build_object(
        '__meta', jsonb_build_object(
            'version', '1.0',
            'created_at', NOW()::text,
            'stakeholder_id', v_stakeholder_id::text,
            'roles', to_jsonb(COALESCE(p_role_codes, ARRAY['producer'])),
            'app_uuid', v_app_uuid::text
        ),
        'function_registry', v_function_registry,
        'role_configurations', jsonb_build_object(
            v_role_config_key, jsonb_build_object(
                'dashboard_name', 'Workspace Dashboard',
                'menu_items', v_menu_items,
                'workspace_layout', jsonb_build_object(
                    'sidebar_width', '250px',
                    'theme', 'light',
                    'show_notifications', true,
                    'default_component', 'file_explorer'
                ),
                'widgets', jsonb_build_array()
            )
        )
    );

    UPDATE stakeholders
    SET core_config = v_core_config
    WHERE id = v_stakeholder_id;

    -- ========================================================================
    -- STEP 7: Create Workspace Node (NO created_by reference)
    -- ========================================================================

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'nodes') THEN
        INSERT INTO nodes (name, type, parent_id, owner_id, app_uuid)
        VALUES ('My Workspace', 'folder', NULL, v_stakeholder_id, v_app_uuid);
    END IF;

    -- ========================================================================
    -- STEP 8: Create Welcome Notification
    -- ========================================================================

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'notifications') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'app_uuid') THEN
            INSERT INTO notifications (stakeholder_id, notification_type, title, message, is_read, app_uuid)
            VALUES (v_stakeholder_id, 'welcome', 'Welcome!', 'Welcome to your workspace!', false, v_app_uuid);
        END IF;
    END IF;

    -- ========================================================================
    -- STEP 9: Create Onboarding Workflow
    -- ========================================================================

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'workflow_instances') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_instances' AND column_name = 'app_uuid') THEN
            INSERT INTO workflow_instances (instance_code, stakeholder_id, workflow_type, status, maturity_gate, app_uuid)
            VALUES (
                'ONBOARD-' || SUBSTRING(v_stakeholder_id::text FROM 1 FOR 8),
                v_stakeholder_id,
                'onboarding',
                'active',
                'initiated',
                v_app_uuid
            )
            RETURNING id INTO v_workflow_instance_id;

            IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'activities') THEN
                INSERT INTO activities (
                    workflow_instance_id,
                    activity_code,
                    activity_name,
                    owner,
                    status,
                    due_date
                ) VALUES (
                    v_workflow_instance_id,
                    'ACCEPT_TERMS',
                    'Accept Terms & Conditions',
                    'stakeholder',
                    'pending',
                    NOW() + INTERVAL '7 days'
                );
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- STEP 10: Return Success Result
    -- ========================================================================

    v_result := jsonb_build_object(
        'stakeholder_out_id', v_stakeholder_id,
        'reference_out', v_reference,
        'success_out', true,
        'message_out', 'Stakeholder provisioned successfully',
        'app_uuid_out', v_app_uuid,
        'core_config_generated', true,
        'components_count', jsonb_array_length(v_function_registry),
        'roles_assigned', array_length(p_role_codes, 1),
        'relationships_created', CASE WHEN p_relationships IS NULL THEN 0 ELSE jsonb_array_length(p_relationships) END
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Provision failed - all changes rolled back: %', SQLERRM;

        RETURN jsonb_build_object(
            'stakeholder_out_id', NULL,
            'reference_out', NULL,
            'success_out', false,
            'message_out', SQLERRM,
            'app_uuid_out', NULL,
            'error_detail', SQLSTATE
        );
END;
$$;

COMMENT ON FUNCTION provision_stakeholder_v2 IS
'Phase 1c: Fully transactional stakeholder provisioning.
No dependencies on local users table - uses auth.users only.
All operations succeed or all roll back on any error.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration Complete: Removed users table dependencies';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Dropped all FK constraints to users table';
    RAISE NOTICE '✓ Made created_by columns nullable';
    RAISE NOTICE '✓ Added required unique constraints';
    RAISE NOTICE '✓ Updated provision_stakeholder_v2 function';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Ready to test stakeholder creation';
    RAISE NOTICE '========================================';
END $$;
