-- Completely remove all versions of provision_stakeholder function and recreate
-- Drop all possible versions of the function
DROP FUNCTION IF EXISTS provision_stakeholder(jsonb,text[],uuid,jsonb,uuid,text,boolean,uuid,uuid) CASCADE;
DROP FUNCTION IF EXISTS provision_stakeholder(jsonb,text[],uuid,jsonb,uuid,text,boolean,uuid) CASCADE;
DROP FUNCTION IF EXISTS provision_stakeholder(jsonb,text[],uuid,jsonb,uuid,text,boolean) CASCADE;
DROP FUNCTION IF EXISTS provision_stakeholder(jsonb) CASCADE;
DROP FUNCTION IF EXISTS provision_stakeholder CASCADE;

-- Create the new version with JSONB return type
CREATE FUNCTION provision_stakeholder(
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
    v_auth_user_id UUID;
    v_invite_email TEXT;
    v_is_user BOOLEAN;
    v_created_by UUID;
    v_role_code TEXT;
    v_role_id UUID;
    v_primary_role_id UUID;
    v_relationship JSONB;
    v_to_stakeholder_id UUID;
    v_relationship_type_id UUID;
    v_strength INTEGER;
    v_bidirectional BOOLEAN;
    v_core_config JSONB;
    v_role_config_key TEXT;
    v_welcome_message TEXT;
    v_workspace_node_id UUID;
    v_notification_id UUID;
    v_workflow_instance_id UUID;
    v_activity_id UUID;
    v_temp_password TEXT;
BEGIN
    v_stakeholder_type_id := (p_stakeholder->>'stakeholder_type_id')::UUID;
    v_auth_user_id := COALESCE(p_auth_user_id, (p_stakeholder->>'auth_user_id')::UUID);
    v_invite_email := COALESCE(p_invite_email, p_stakeholder->>'invite_email');
    v_is_user := COALESCE(p_is_user, COALESCE((p_stakeholder->>'is_user')::BOOLEAN, FALSE));
    v_created_by := COALESCE(p_created_by, (p_stakeholder->>'created_by')::UUID);
    v_primary_role_id := COALESCE(p_primary_role_id, (p_stakeholder->>'primary_role_id')::UUID);
    v_stakeholder_id := (p_stakeholder->>'id')::UUID;

    -- Generate reference if not provided
    IF p_stakeholder->>'reference' IS NULL OR p_stakeholder->>'reference' = '' THEN
        v_reference := 'STK-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    ELSE
        v_reference := p_stakeholder->>'reference';
    END IF;

    -- Ensure reference uniqueness
    WHILE EXISTS (SELECT 1 FROM stakeholders WHERE reference = v_reference) LOOP
        v_reference := 'STK-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    END LOOP;

    -- Validate stakeholder_type_id
    IF NOT EXISTS (SELECT 1 FROM stakeholder_types WHERE id = v_stakeholder_type_id) THEN
        RETURN jsonb_build_object(
            'stakeholder_out_id', NULL,
            'reference_out', v_reference,
            'success_out', FALSE,
            'message_out', 'Invalid stakeholder_type_id: ' || v_stakeholder_type_id::TEXT
        );
    END IF;

    -- Insert or update stakeholder (WITHOUT app_uuid column)
    INSERT INTO stakeholders (
        id,
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
        is_user,
        created_by
    ) VALUES (
        COALESCE(v_stakeholder_id, gen_random_uuid()),
        v_reference,
        p_stakeholder->>'name',
        v_stakeholder_type_id,
        v_primary_role_id,
        p_stakeholder->>'email',
        p_stakeholder->>'phone',
        p_stakeholder->>'country',
        p_stakeholder->>'city',
        COALESCE(p_stakeholder->>'status', 'active'),
        COALESCE((p_stakeholder->>'is_verified')::BOOLEAN, FALSE),
        v_auth_user_id,
        v_invite_email,
        v_is_user,
        v_created_by
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        stakeholder_type_id = EXCLUDED.stakeholder_type_id,
        primary_role_id = COALESCE(EXCLUDED.primary_role_id, stakeholders.primary_role_id),
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        country = EXCLUDED.country,
        city = EXCLUDED.city,
        status = EXCLUDED.status,
        is_verified = EXCLUDED.is_verified,
        auth_user_id = COALESCE(EXCLUDED.auth_user_id, stakeholders.auth_user_id),
        invite_email = EXCLUDED.invite_email,
        is_user = EXCLUDED.is_user,
        updated_at = NOW()
    RETURNING id, reference INTO v_stakeholder_id, v_reference;

    -- Process roles
    IF p_role_codes IS NOT NULL AND array_length(p_role_codes, 1) > 0 THEN
        FOREACH v_role_code IN ARRAY p_role_codes LOOP
            SELECT id INTO v_role_id FROM roles WHERE code = v_role_code;

            IF v_role_id IS NOT NULL THEN
                INSERT INTO stakeholder_roles (
                    stakeholder_id,
                    role_id,
                    role_type
                ) VALUES (
                    v_stakeholder_id,
                    v_role_id,
                    v_role_code
                )
                ON CONFLICT (stakeholder_id, role_id) DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- Process relationships
    IF p_relationships IS NOT NULL THEN
        FOR v_relationship IN SELECT * FROM jsonb_array_elements(p_relationships) LOOP
            v_to_stakeholder_id := (v_relationship->>'to_stakeholder_id')::UUID;
            v_relationship_type_id := (v_relationship->>'relationship_type_id')::UUID;
            v_strength := COALESCE((v_relationship->>'strength')::INTEGER, 5);
            v_bidirectional := COALESCE((v_relationship->>'bidirectional')::BOOLEAN, FALSE);

            IF v_to_stakeholder_id IS NOT NULL AND v_relationship_type_id IS NOT NULL THEN
                INSERT INTO relationships (
                    from_stakeholder_id,
                    to_stakeholder_id,
                    relationship_type_id,
                    strength,
                    status
                ) VALUES (
                    v_stakeholder_id,
                    v_to_stakeholder_id,
                    v_relationship_type_id,
                    v_strength,
                    'active'
                )
                ON CONFLICT (from_stakeholder_id, to_stakeholder_id, relationship_type_id) DO UPDATE SET
                    strength = EXCLUDED.strength,
                    status = 'active',
                    updated_at = NOW();

                IF v_bidirectional THEN
                    INSERT INTO relationships (
                        from_stakeholder_id,
                        to_stakeholder_id,
                        relationship_type_id,
                        strength,
                        status
                    ) VALUES (
                        v_to_stakeholder_id,
                        v_stakeholder_id,
                        v_relationship_type_id,
                        v_strength,
                        'active'
                    )
                    ON CONFLICT (from_stakeholder_id, to_stakeholder_id, relationship_type_id) DO UPDATE SET
                        strength = EXCLUDED.strength,
                        status = 'active',
                        updated_at = NOW();
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- Generate core_config JSON
    IF p_role_codes IS NOT NULL AND array_length(p_role_codes, 1) > 0 THEN
        v_role_config_key := array_to_string(p_role_codes, '_');
    ELSE
        v_role_config_key := 'default';
    END IF;

    v_core_config := jsonb_build_object(
        '__meta', jsonb_build_object(
            'version', '1.0',
            'created_at', NOW()::text,
            'stakeholder_id', COALESCE(v_stakeholder_id, gen_random_uuid())::text,
            'roles', to_jsonb(p_role_codes)
        ),
        'function_registry', jsonb_build_array(
            jsonb_build_object(
                'id', 'file_view',
                'name', 'File View',
                'description', 'View workspace files',
                'icon', 'folder',
                'enabled', true
            ),
            jsonb_build_object(
                'id', 'profile_view',
                'name', 'Profile',
                'description', 'View and manage profile',
                'icon', 'user',
                'enabled', true
            )
        ),
        'role_configurations', jsonb_build_object(
            v_role_config_key, jsonb_build_object(
                'dashboard_name', 'Workspace Dashboard',
                'menu_items', jsonb_build_array('file_view', 'profile_view'),
                'widgets', jsonb_build_array(
                    jsonb_build_object(
                        'component', 'ProfileCard',
                        'props', jsonb_build_object(),
                        'layout', jsonb_build_object(
                            'class', 'w-full'
                        )
                    ),
                    jsonb_build_object(
                        'component', 'RolesRelationshipsWidget',
                        'props', jsonb_build_object(),
                        'layout', jsonb_build_object(
                            'class', 'w-1/3'
                        )
                    ),
                    jsonb_build_object(
                        'component', 'WorkflowTasksWidget',
                        'props', jsonb_build_object(),
                        'layout', jsonb_build_object(
                            'class', 'w-2/3'
                        )
                    )
                )
            )
        )
    );

    -- Update stakeholder with core_config
    UPDATE stakeholders
    SET core_config = v_core_config,
        updated_at = NOW()
    WHERE id = v_stakeholder_id;

    -- Create workspace node (if nodes table exists)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'nodes') THEN
        INSERT INTO nodes (
            name,
            type,
            parent_id,
            owner_id,
            app_uuid
        ) VALUES (
            'My Workspace',
            'folder',
            NULL,
            v_stakeholder_id,
            p_app_uuid
        )
        RETURNING id INTO v_workspace_node_id;
    END IF;

    -- Create welcome notification (if notifications table exists)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'notifications') THEN
        v_welcome_message := 'Welcome to your workspace! Complete the tasks in your dashboard to get started.';

        INSERT INTO notifications (
            stakeholder_id,
            notification_type,
            title,
            message,
            is_read,
            app_uuid
        ) VALUES (
            v_stakeholder_id,
            'welcome',
            'Welcome!',
            v_welcome_message,
            false,
            p_app_uuid
        )
        RETURNING id INTO v_notification_id;
    END IF;

    -- Create workflow instance (if workflow_instances table exists)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'workflow_instances') THEN
        INSERT INTO workflow_instances (
            instance_code,
            stakeholder_id,
            workflow_type,
            status,
            maturity_gate,
            app_uuid
        ) VALUES (
            'WELCOME-' || SUBSTRING(v_stakeholder_id::text FROM 1 FOR 8),
            v_stakeholder_id,
            'onboarding',
            'active',
            'initiated',
            p_app_uuid
        )
        RETURNING id INTO v_workflow_instance_id;

        -- Create welcome activity (check if app_uuid column exists first)
        IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'activities') THEN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'activities' AND column_name = 'app_uuid'
            ) THEN
                INSERT INTO activities (
                    workflow_instance_id,
                    activity_code,
                    activity_name,
                    owner,
                    status,
                    due_date,
                    app_uuid
                ) VALUES (
                    v_workflow_instance_id,
                    'ACCEPT_TERMS',
                    'Accept Terms & Conditions',
                    'stakeholder',
                    'pending',
                    NOW() + INTERVAL '7 days',
                    p_app_uuid
                )
                RETURNING id INTO v_activity_id;
            ELSE
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
                )
                RETURNING id INTO v_activity_id;
            END IF;
        END IF;
    END IF;

    -- Return success
    RETURN jsonb_build_object(
        'stakeholder_out_id', v_stakeholder_id,
        'reference_out', v_reference,
        'success_out', TRUE,
        'message_out', 'Stakeholder provisioned successfully with workspace'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'stakeholder_out_id', v_stakeholder_id,
            'reference_out', v_reference,
            'success_out', FALSE,
            'message_out', 'Error: ' || SQLERRM
        );
END;
$$;
