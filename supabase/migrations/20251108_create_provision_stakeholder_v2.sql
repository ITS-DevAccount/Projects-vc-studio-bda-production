-- Create a new function with different name to avoid any caching issues
CREATE OR REPLACE FUNCTION provision_stakeholder_v2(
    p_stakeholder JSONB,
    p_role_codes TEXT[] DEFAULT NULL,
    p_primary_role_id UUID DEFAULT NULL,
    p_relationships JSONB DEFAULT NULL,
    p_auth_user_id UUID DEFAULT NULL,
    p_invite_email TEXT DEFAULT NULL,
    p_is_user BOOLEAN DEFAULT FALSE,
    p_created_by UUID DEFAULT NULL
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
BEGIN
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
            SELECT id INTO v_role_id FROM roles WHERE code = v_role_code;
            IF v_role_id IS NOT NULL THEN
                INSERT INTO stakeholder_roles (stakeholder_id, role_id, role_type)
                VALUES (v_stakeholder_id, v_role_id, v_role_code)
                ON CONFLICT (stakeholder_id, role_id) DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- Process relationships
    IF p_relationships IS NOT NULL THEN
        FOR v_relationship IN SELECT * FROM jsonb_array_elements(p_relationships) LOOP
            INSERT INTO relationships (from_stakeholder_id, to_stakeholder_id, relationship_type_id, strength, status)
            VALUES (
                v_stakeholder_id,
                (v_relationship->>'to_stakeholder_id')::UUID,
                (v_relationship->>'relationship_type_id')::UUID,
                COALESCE((v_relationship->>'strength')::INTEGER, 5),
                'active'
            )
            ON CONFLICT (from_stakeholder_id, to_stakeholder_id, relationship_type_id) DO NOTHING;
        END LOOP;
    END IF;

    -- Generate core_config
    v_role_config_key := COALESCE(array_to_string(p_role_codes, '_'), 'default');
    v_core_config := jsonb_build_object(
        '__meta', jsonb_build_object('version', '1.0', 'created_at', NOW()::text, 'stakeholder_id', v_stakeholder_id::text, 'roles', to_jsonb(p_role_codes)),
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

    -- Create workspace node
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'nodes') THEN
        INSERT INTO nodes (name, type, parent_id, owner_id) VALUES ('My Workspace', 'folder', NULL, v_stakeholder_id);
    END IF;

    -- Create welcome notification
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'notifications') THEN
        INSERT INTO notifications (stakeholder_id, notification_type, title, message, is_read)
        VALUES (v_stakeholder_id, 'welcome', 'Welcome!', 'Welcome to your workspace!', false);
    END IF;

    -- Create workflow
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'workflow_instances') THEN
        INSERT INTO workflow_instances (instance_code, stakeholder_id, workflow_type, status, maturity_gate)
        VALUES ('WELCOME-' || SUBSTRING(v_stakeholder_id::text FROM 1 FOR 8), v_stakeholder_id, 'onboarding', 'active', 'initiated')
        RETURNING id INTO v_workflow_instance_id;

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
        'message_out', 'Success'
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'stakeholder_out_id', NULL,
            'reference_out', NULL,
            'success_out', false,
            'message_out', SQLERRM
        );
END;
$$;
