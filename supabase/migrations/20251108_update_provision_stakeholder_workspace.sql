-- Update provision_stakeholder function to create workspace, core_config, notifications, and workflow

DROP FUNCTION IF EXISTS public.provision_stakeholder(
    JSONB, TEXT[], UUID, JSONB, UUID, TEXT, BOOLEAN, UUID
);

CREATE OR REPLACE FUNCTION public.provision_stakeholder(
    p_stakeholder JSONB,
    p_role_codes TEXT[] DEFAULT ARRAY[]::TEXT[],
    p_primary_role_id UUID DEFAULT NULL,
    p_relationships JSONB DEFAULT '[]'::JSONB,
    p_auth_user_id UUID DEFAULT NULL,
    p_invite_email TEXT DEFAULT NULL,
    p_is_user BOOLEAN DEFAULT FALSE,
    p_created_by UUID DEFAULT NULL,
    p_app_uuid UUID DEFAULT NULL
)
RETURNS TABLE (stakeholder_out_id UUID, is_new BOOLEAN) AS $$
DECLARE
    v_stakeholder_id UUID;
    v_existing BOOLEAN := FALSE;
    v_name TEXT;
    v_type UUID;
    v_email TEXT;
    v_phone TEXT;
    v_website TEXT;
    v_country TEXT;
    v_region TEXT;
    v_city TEXT;
    v_industry TEXT;
    v_sector TEXT;
    v_status TEXT;
    v_is_verified BOOLEAN;
    v_core_config JSONB;
    v_role_config_key TEXT;
    v_workspace_node_id UUID;
    v_workflow_id UUID;
    v_activity_id UUID;
    v_instance_code TEXT;
    v_activity_code TEXT;
    rec_role RECORD;
    rec_relationship RECORD;
BEGIN
    IF p_stakeholder IS NULL THEN
        RAISE EXCEPTION 'Stakeholder payload is required';
    END IF;

    v_name := NULLIF(trim(p_stakeholder->>'name'), '');
    v_type := NULLIF(p_stakeholder->>'stakeholder_type_id', '')::UUID;
    v_email := NULLIF(trim(p_stakeholder->>'email'), '');
    v_phone := NULLIF(trim(p_stakeholder->>'phone'), '');
    v_website := NULLIF(trim(p_stakeholder->>'website'), '');
    v_country := NULLIF(trim(p_stakeholder->>'country'), '');
    v_region := NULLIF(trim(p_stakeholder->>'region'), '');
    v_city := NULLIF(trim(p_stakeholder->>'city'), '');
    v_industry := NULLIF(trim(p_stakeholder->>'industry'), '');
    v_sector := NULLIF(trim(p_stakeholder->>'sector'), '');
    v_status := COALESCE(NULLIF(trim(p_stakeholder->>'status'), ''), 'active');
    v_is_verified := COALESCE((p_stakeholder->>'is_verified')::BOOLEAN, FALSE);

    IF v_name IS NULL OR v_type IS NULL THEN
        RAISE EXCEPTION 'Stakeholder name and stakeholder_type_id are required';
    END IF;

    IF p_stakeholder ? 'id' THEN
        v_stakeholder_id := NULLIF(p_stakeholder->>'id', '')::UUID;
    END IF;

    IF v_stakeholder_id IS NOT NULL THEN
        SELECT TRUE INTO v_existing
        FROM stakeholders AS s
        WHERE s.id = v_stakeholder_id
        FOR UPDATE;
    END IF;

    IF NOT v_existing AND v_email IS NOT NULL THEN
        SELECT s.id INTO v_stakeholder_id
        FROM stakeholders AS s
        WHERE lower(s.email) = lower(v_email)
        LIMIT 1
        FOR UPDATE;

        IF FOUND THEN
            v_existing := TRUE;
        END IF;
    END IF;

    -- Generate core_config JSON based on roles
    v_role_config_key := array_to_string(p_role_codes, '_');
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
                'label', 'File Explorer',
                'icon', 'folder',
                'access_key', 'READ_FILES_BASIC',
                'target_url', '/workspace/files'
            ),
            jsonb_build_object(
                'id', 'profile_view',
                'label', 'My Profile',
                'icon', 'user',
                'access_key', 'READ_PROFILE',
                'target_url', '/workspace/profile'
            )
        ),
        'role_configurations', jsonb_build_object(
            v_role_config_key, jsonb_build_object(
                'dashboard_name', 'Workspace Dashboard',
                'menu_items', jsonb_build_array('file_view', 'profile_view'),
                'widgets', jsonb_build_array(
                    jsonb_build_object(
                        'widget_id', 'profile_card',
                        'title', 'My Profile',
                        'component', 'ProfileCard',
                        'data_source', 'stakeholder_metadata',
                        'layout', jsonb_build_object(
                            'lg', 'w-1/3',
                            'md', 'w-full',
                            'sm', 'w-full'
                        )
                    ),
                    jsonb_build_object(
                        'widget_id', 'roles_relationships',
                        'title', 'Roles & Relationships',
                        'component', 'RolesRelationshipsWidget',
                        'data_source', '/api/stakeholder/roles-relationships',
                        'layout', jsonb_build_object(
                            'lg', 'w-2/3',
                            'md', 'w-full',
                            'sm', 'w-full'
                        )
                    ),
                    jsonb_build_object(
                        'widget_id', 'workflow_tasks',
                        'title', 'Workflow Tasks',
                        'component', 'WorkflowTasksWidget',
                        'data_source', '/api/workflows/active-tasks',
                        'layout', jsonb_build_object(
                            'lg', 'w-full',
                            'md', 'w-full',
                            'sm', 'w-full'
                        )
                    )
                )
            )
        )
    );

    IF NOT v_existing THEN
        v_stakeholder_id := COALESCE(v_stakeholder_id, gen_random_uuid());

        INSERT INTO stakeholders (
            id,
            name,
            stakeholder_type_id,
            email,
            phone,
            website,
            industry,
            sector,
            country,
            region,
            city,
            status,
            is_verified,
            primary_role_id,
            auth_user_id,
            invite_email,
            is_user,
            created_by,
            core_config,
            app_uuid
        ) VALUES (
            v_stakeholder_id,
            v_name,
            v_type,
            v_email,
            v_phone,
            v_website,
            v_industry,
            v_sector,
            v_country,
            v_region,
            v_city,
            v_status,
            v_is_verified,
            p_primary_role_id,
            p_auth_user_id,
            p_invite_email,
            COALESCE(p_is_user, FALSE),
            p_created_by,
            v_core_config,
            p_app_uuid
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            stakeholder_type_id = EXCLUDED.stakeholder_type_id,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            website = EXCLUDED.website,
            industry = EXCLUDED.industry,
            sector = EXCLUDED.sector,
            country = EXCLUDED.country,
            region = EXCLUDED.region,
            city = EXCLUDED.city,
            status = EXCLUDED.status,
            is_verified = EXCLUDED.is_verified,
            primary_role_id = EXCLUDED.primary_role_id,
            auth_user_id = COALESCE(EXCLUDED.auth_user_id, stakeholders.auth_user_id),
            invite_email = COALESCE(EXCLUDED.invite_email, stakeholders.invite_email),
            is_user = EXCLUDED.is_user,
            core_config = EXCLUDED.core_config,
            app_uuid = COALESCE(EXCLUDED.app_uuid, stakeholders.app_uuid),
            updated_at = NOW();

        v_existing := FALSE;

        -- Create workspace root node
        v_workspace_node_id := gen_random_uuid();
        INSERT INTO nodes (
            id,
            name,
            type,
            parent_id,
            owner_id,
            file_storage_path,
            app_uuid
        ) VALUES (
            v_workspace_node_id,
            v_name || ' Workspace',
            'folder',
            NULL,
            v_stakeholder_id,
            NULL,
            p_app_uuid
        );

        -- Create welcome notification
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
            'Welcome to the Workspace',
            'Your workspace has been created. Please review your profile and accept the terms.',
            FALSE,
            p_app_uuid
        );

        -- Create workflow instance
        v_workflow_id := gen_random_uuid();
        v_instance_code := 'WELCOME-' || substring(v_stakeholder_id::text, 1, 8);
        INSERT INTO workflow_instances (
            id,
            instance_code,
            stakeholder_id,
            workflow_type,
            status,
            maturity_gate,
            app_uuid
        ) VALUES (
            v_workflow_id,
            v_instance_code,
            v_stakeholder_id,
            'accept_terms',
            'active',
            'FLM',
            p_app_uuid
        );

        -- Create workflow activity
        v_activity_id := gen_random_uuid();
        v_activity_code := v_instance_code || '-001';
        INSERT INTO activities (
            id,
            workflow_instance_id,
            activity_code,
            activity_name,
            status,
            owner,
            due_date
        ) VALUES (
            v_activity_id,
            v_workflow_id,
            v_activity_code,
            'Accept Terms & Conditions',
            'pending',
            'client',
            NOW() + INTERVAL '7 days'
        );

        -- Create audit log entry
        INSERT INTO audit_logs (
            action,
            stakeholder_id,
            performed_by,
            details,
            app_uuid
        ) VALUES (
            'onboarding_complete',
            v_stakeholder_id,
            p_created_by,
            jsonb_build_object(
                'workspace_created', v_workspace_node_id,
                'workflow_instance_id', v_workflow_id,
                'roles_assigned', to_jsonb(p_role_codes)
            ),
            p_app_uuid
        );
    ELSE
        UPDATE stakeholders AS s SET
            name = v_name,
            stakeholder_type_id = v_type,
            email = COALESCE(v_email, s.email),
            phone = COALESCE(v_phone, s.phone),
            website = COALESCE(v_website, s.website),
            industry = COALESCE(v_industry, s.industry),
            sector = COALESCE(v_sector, s.sector),
            country = COALESCE(v_country, s.country),
            region = COALESCE(v_region, s.region),
            city = COALESCE(v_city, s.city),
            status = COALESCE(v_status, s.status),
            is_verified = v_is_verified,
            primary_role_id = COALESCE(p_primary_role_id, s.primary_role_id),
            auth_user_id = COALESCE(p_auth_user_id, s.auth_user_id),
            invite_email = COALESCE(p_invite_email, s.invite_email),
            is_user = COALESCE(p_is_user, s.is_user),
            core_config = v_core_config,
            app_uuid = COALESCE(p_app_uuid, s.app_uuid),
            updated_at = NOW()
        WHERE s.id = v_stakeholder_id;
    END IF;

    -- Roles management
    IF p_role_codes IS NULL OR array_length(p_role_codes, 1) = 0 THEN
        DELETE FROM stakeholder_roles AS sr WHERE sr.stakeholder_id = v_stakeholder_id;
    ELSE
        FOR rec_role IN
            SELECT r.id, r.code
            FROM roles AS r
            WHERE r.code = ANY (p_role_codes)
        LOOP
            INSERT INTO stakeholder_roles (stakeholder_id, role_type, role_id)
            VALUES (v_stakeholder_id, rec_role.code, rec_role.id)
            ON CONFLICT (stakeholder_id, role_type)
            DO UPDATE SET role_id = EXCLUDED.role_id;
        END LOOP;

        DELETE FROM stakeholder_roles AS sr
        WHERE sr.stakeholder_id = v_stakeholder_id
          AND sr.role_type <> ALL (p_role_codes);
    END IF;

    IF p_primary_role_id IS NOT NULL THEN
        UPDATE stakeholders AS s
        SET primary_role_id = p_primary_role_id
        WHERE s.id = v_stakeholder_id;
    END IF;

    -- Relationships
    IF p_relationships IS NOT NULL AND jsonb_typeof(p_relationships) = 'array' THEN
        FOR rec_relationship IN
            SELECT
                NULLIF(rel->>'id', '')::UUID AS id,
                NULLIF(rel->>'to_stakeholder_id', '')::UUID AS to_stakeholder_id,
                NULLIF(rel->>'relationship_type_id', '')::UUID AS relationship_type_id,
                CASE WHEN rel ? 'strength' THEN (rel->>'strength')::INT ELSE NULL END AS strength,
                COALESCE(NULLIF(rel->>'status', ''), 'active') AS status
            FROM jsonb_array_elements(p_relationships) AS rel
        LOOP
            IF rec_relationship.to_stakeholder_id IS NULL OR rec_relationship.relationship_type_id IS NULL THEN
                CONTINUE;
            END IF;

            IF rec_relationship.id IS NOT NULL THEN
                INSERT INTO relationships AS rel_table (
                    id,
                    from_stakeholder_id,
                    to_stakeholder_id,
                    relationship_type_id,
                    strength,
                    status
                ) VALUES (
                    rec_relationship.id,
                    v_stakeholder_id,
                    rec_relationship.to_stakeholder_id,
                    rec_relationship.relationship_type_id,
                    rec_relationship.strength,
                    rec_relationship.status
                )
                ON CONFLICT (id) DO UPDATE SET
                    to_stakeholder_id = EXCLUDED.to_stakeholder_id,
                    relationship_type_id = EXCLUDED.relationship_type_id,
                    strength = EXCLUDED.strength,
                    status = EXCLUDED.status,
                    updated_at = NOW();
            ELSE
                IF NOT EXISTS (
                    SELECT 1
                    FROM relationships AS rel_table
                    WHERE rel_table.from_stakeholder_id = v_stakeholder_id
                      AND rel_table.to_stakeholder_id = rec_relationship.to_stakeholder_id
                      AND rel_table.relationship_type_id = rec_relationship.relationship_type_id
                ) THEN
                    INSERT INTO relationships AS rel_table (
                        id,
                        from_stakeholder_id,
                        to_stakeholder_id,
                        relationship_type_id,
                        strength,
                        status
                    ) VALUES (
                        gen_random_uuid(),
                        v_stakeholder_id,
                        rec_relationship.to_stakeholder_id,
                        rec_relationship.relationship_type_id,
                        rec_relationship.strength,
                        rec_relationship.status
                    );
                END IF;
            END IF;
        END LOOP;
    END IF;

    stakeholder_out_id := v_stakeholder_id;
    is_new := NOT v_existing;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION public.provision_stakeholder(JSONB, TEXT[], UUID, JSONB, UUID, TEXT, BOOLEAN, UUID, UUID)
IS 'Creates or updates a stakeholder with workspace, core_config, notifications, and workflow within a single transaction.';
