-- ============================================================================
-- PHASE 1C: Update provision_stakeholder_v2 for Dynamic Core Config
-- File: 20251109150002_phase1c_update_provision_stakeholder.sql
-- Purpose: Generate core_config from components_registry instead of hard-coding
-- Dependencies: 20251109150001_phase1c_seed_components.sql
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS provision_stakeholder_v2(JSONB, TEXT[], UUID, JSONB, UUID, TEXT, BOOLEAN, UUID, UUID);

-- Create updated version that builds core_config from components_registry
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
    -- Get app_uuid
    v_app_uuid := COALESCE(
        p_app_uuid,
        (SELECT app_uuid FROM site_settings WHERE is_active_app = true LIMIT 1)
    );

    IF v_app_uuid IS NULL THEN
        RAISE EXCEPTION 'No app_uuid provided and no active app found';
    END IF;

    v_stakeholder_type_id := (p_stakeholder->>'stakeholder_type_id')::UUID;

    -- Generate reference
    v_reference := 'STK-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    WHILE EXISTS (SELECT 1 FROM stakeholders WHERE reference = v_reference) LOOP
        v_reference := 'STK-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    END LOOP;

    -- Insert stakeholder
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

    -- Process roles
    IF p_role_codes IS NOT NULL AND array_length(p_role_codes, 1) > 0 THEN
        FOREACH v_role_code IN ARRAY p_role_codes LOOP
            SELECT id INTO v_role_id
            FROM roles
            WHERE code = v_role_code
            AND app_uuid = v_app_uuid;

            IF v_role_id IS NOT NULL THEN
                INSERT INTO stakeholder_roles (stakeholder_id, role_id, role_type, app_uuid)
                VALUES (v_stakeholder_id, v_role_id, v_role_code, v_app_uuid)
                ON CONFLICT (stakeholder_id, role_type, app_uuid) DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- Process relationships
    IF p_relationships IS NOT NULL THEN
        FOR v_relationship IN SELECT * FROM jsonb_array_elements(p_relationships) LOOP
            INSERT INTO relationships (
                from_stakeholder_id,
                to_stakeholder_id,
                relationship_type_id,
                strength,
                status,
                app_uuid
            )
            VALUES (
                v_stakeholder_id,
                (v_relationship->>'to_stakeholder_id')::UUID,
                (v_relationship->>'relationship_type_id')::UUID,
                COALESCE((v_relationship->>'strength')::INTEGER, 5),
                'active',
                v_app_uuid
            )
            ON CONFLICT (from_stakeholder_id, to_stakeholder_id, relationship_type_id, app_uuid) DO NOTHING;
        END LOOP;
    END IF;

    -- =====================================================================
    -- PHASE 1C: Generate core_config from components_registry
    -- =====================================================================

    -- Build function_registry from active components
    v_function_registry := jsonb_build_array();

    FOR v_component IN
        SELECT component_code, component_name, icon_name, route_path
        FROM components_registry
        WHERE app_uuid = v_app_uuid
        AND is_active = true
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

    -- Build menu_items from active components (default for producer role)
    v_menu_items := jsonb_build_array();

    FOR v_component IN
        SELECT component_code, component_name, icon_name
        FROM components_registry
        WHERE app_uuid = v_app_uuid
        AND is_active = true
        ORDER BY
            CASE component_code
                WHEN 'file_explorer' THEN 1
                WHEN 'file_uploader' THEN 2
                WHEN 'folder_creator' THEN 3
                WHEN 'workflow_tasks' THEN 4
                WHEN 'vc_pyramid' THEN 5
                ELSE 99
            END
        LIMIT 5  -- Show first 5 components
    LOOP
        v_menu_items := v_menu_items || jsonb_build_object(
            'label', v_component.component_name,
            'component_id', v_component.component_code,
            'position', jsonb_array_length(v_menu_items) + 1,
            'is_default', (v_component.component_code = 'file_explorer')
        );
    END LOOP;

    -- Build role configuration key
    v_role_config_key := COALESCE(array_to_string(p_role_codes, '_'), 'producer');

    -- Generate full core_config
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

    -- Update stakeholder with generated core_config
    UPDATE stakeholders SET core_config = v_core_config WHERE id = v_stakeholder_id;

    -- Create workspace node (Phase 1c requirement)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'nodes') THEN
        INSERT INTO nodes (name, type, parent_id, owner_id, app_uuid, created_by)
        VALUES ('My Workspace', 'folder', NULL, v_stakeholder_id, v_app_uuid, COALESCE(p_created_by, p_auth_user_id));
    END IF;

    -- Create welcome notification (if table exists)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'notifications') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'app_uuid') THEN
            INSERT INTO notifications (stakeholder_id, notification_type, title, message, is_read, app_uuid)
            VALUES (v_stakeholder_id, 'welcome', 'Welcome!', 'Welcome to your workspace!', false, v_app_uuid);
        END IF;
    END IF;

    -- Create workflow (if table exists)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'workflow_instances') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_instances' AND column_name = 'app_uuid') THEN
            INSERT INTO workflow_instances (instance_code, stakeholder_id, workflow_type, status, maturity_gate, app_uuid)
            VALUES ('WELCOME-' || SUBSTRING(v_stakeholder_id::text FROM 1 FOR 8), v_stakeholder_id, 'onboarding', 'active', 'initiated', v_app_uuid)
            RETURNING id INTO v_workflow_instance_id;

            IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'activities') THEN
                INSERT INTO activities (workflow_instance_id, activity_code, activity_name, owner, status, due_date)
                VALUES (v_workflow_instance_id, 'ACCEPT_TERMS', 'Accept Terms & Conditions', 'stakeholder', 'pending', NOW() + INTERVAL '7 days');
            END IF;
        END IF;
    END IF;

    -- Build and return result
    v_result := jsonb_build_object(
        'stakeholder_out_id', v_stakeholder_id,
        'reference_out', v_reference,
        'success_out', true,
        'message_out', 'Success - Phase 1c provision complete',
        'app_uuid_out', v_app_uuid,
        'core_config_generated', true,
        'components_count', jsonb_array_length(v_function_registry)
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
'Phase 1c: Provisions stakeholder with dynamically generated core_config from components_registry.
The function loads all active components for the app and creates:
1. function_registry from components_registry
2. menu_items from active components
3. Default workspace folder in nodes table
Parameters:
- p_app_uuid: UUID of the application (defaults to current active app)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Phase 1c: provision_stakeholder_v2 Updated';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ core_config now generated from components_registry';
    RAISE NOTICE '✓ function_registry built from active components';
    RAISE NOTICE '✓ menu_items built from components (max 5)';
    RAISE NOTICE '✓ Workspace folder created in nodes table';
    RAISE NOTICE '========================================';
END $$;
