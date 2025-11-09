-- ============================================================================
-- PHASE 1C: Seed Component Registry Data
-- File: 20251109150001_phase1c_seed_components.sql
-- Purpose: Insert 5 file system components into components_registry
-- Dependencies: 20251109150000_phase1c_components_registry.sql
-- ============================================================================

-- Get the active app_uuid (assumes VC Studio BDA is the current app)
DO $$
DECLARE
    v_app_uuid UUID;
BEGIN
    -- Get the active app UUID
    SELECT app_uuid INTO v_app_uuid
    FROM site_settings
    WHERE is_active_app = true
    LIMIT 1;

    IF v_app_uuid IS NULL THEN
        RAISE EXCEPTION 'No active app found in site_settings. Cannot seed components.';
    END IF;

    RAISE NOTICE 'Using app_uuid: %', v_app_uuid;

    -- ============================================================================
    -- Component 1: File Explorer
    -- ============================================================================

    INSERT INTO components_registry (
        component_code,
        component_name,
        description,
        icon_name,
        route_path,
        widget_component_name,
        required_permissions,
        required_role_codes,
        supports_params,
        default_params,
        creates_nodes,
        is_active,
        app_uuid,
        version
    ) VALUES (
        'file_explorer',
        'File Explorer',
        'Browse and manage files and folders in your workspace',
        'folder',
        '/workspace/files',
        'FileExplorer',
        '{"READ_FILES"}',
        '{}',
        true,
        '{"show_thumbnails": true, "sort_by": "name", "view_mode": "grid"}',
        false,
        true,
        v_app_uuid,
        '1.0'
    )
    ON CONFLICT (component_code) DO UPDATE
    SET
        component_name = EXCLUDED.component_name,
        description = EXCLUDED.description,
        updated_at = NOW();

    RAISE NOTICE '✓ Inserted/Updated: file_explorer';

    -- ============================================================================
    -- Component 2: File Uploader
    -- ============================================================================

    INSERT INTO components_registry (
        component_code,
        component_name,
        description,
        icon_name,
        route_path,
        widget_component_name,
        required_permissions,
        required_role_codes,
        supports_params,
        default_params,
        creates_nodes,
        node_type_created,
        launch_in_modal,
        is_active,
        app_uuid,
        version
    ) VALUES (
        'file_uploader',
        'Upload Files',
        'Upload documents, images, and other files to your workspace',
        'upload',
        '/workspace/upload',
        'FileUploader',
        '{"WRITE_FILES"}',
        '{}',
        true,
        '{"max_file_size_mb": 100, "allowed_types": ["pdf", "docx", "xlsx", "jpg", "png", "csv", "txt"], "show_progress": true}',
        true,
        'file',
        true,
        true,
        v_app_uuid,
        '1.0'
    )
    ON CONFLICT (component_code) DO UPDATE
    SET
        component_name = EXCLUDED.component_name,
        description = EXCLUDED.description,
        updated_at = NOW();

    RAISE NOTICE '✓ Inserted/Updated: file_uploader';

    -- ============================================================================
    -- Component 3: Folder Creator
    -- ============================================================================

    INSERT INTO components_registry (
        component_code,
        component_name,
        description,
        icon_name,
        route_path,
        widget_component_name,
        required_permissions,
        required_role_codes,
        supports_params,
        default_params,
        creates_nodes,
        node_type_created,
        launch_in_modal,
        is_active,
        app_uuid,
        version
    ) VALUES (
        'folder_creator',
        'Create Folder',
        'Create new folders to organize your workspace',
        'folder-plus',
        '/workspace/create-folder',
        'FolderCreator',
        '{"WRITE_FILES"}',
        '{}',
        true,
        '{"allow_nested": true, "max_depth": 10}',
        true,
        'folder',
        true,
        true,
        v_app_uuid,
        '1.0'
    )
    ON CONFLICT (component_code) DO UPDATE
    SET
        component_name = EXCLUDED.component_name,
        description = EXCLUDED.description,
        updated_at = NOW();

    RAISE NOTICE '✓ Inserted/Updated: folder_creator';

    -- ============================================================================
    -- Component 4: Workflow Tasks Widget
    -- ============================================================================

    INSERT INTO components_registry (
        component_code,
        component_name,
        description,
        icon_name,
        route_path,
        widget_component_name,
        required_permissions,
        required_role_codes,
        supports_params,
        default_params,
        realtime_updates,
        is_active,
        app_uuid,
        version
    ) VALUES (
        'workflow_tasks',
        'My Tasks',
        'View and manage your workflow tasks and activities',
        'check-circle',
        '/workspace/workflows',
        'WorkflowTasksWidget',
        '{"READ_WORKFLOWS"}',
        '{}',
        true,
        '{"show_completed": false, "group_by": "due_date", "show_overdue_only": false}',
        true,
        true,
        v_app_uuid,
        '1.0'
    )
    ON CONFLICT (component_code) DO UPDATE
    SET
        component_name = EXCLUDED.component_name,
        description = EXCLUDED.description,
        updated_at = NOW();

    RAISE NOTICE '✓ Inserted/Updated: workflow_tasks';

    -- ============================================================================
    -- Component 5: VC Model Pyramid
    -- ============================================================================

    INSERT INTO components_registry (
        component_code,
        component_name,
        description,
        icon_name,
        route_path,
        widget_component_name,
        required_permissions,
        required_role_codes,
        supports_params,
        default_params,
        supports_full_screen,
        is_active,
        app_uuid,
        version
    ) VALUES (
        'vc_pyramid',
        'VC Model',
        'Interactive VC model pyramid visualization (FLM/AGM layers)',
        'layers',
        '/workspace/vc-model',
        'VCModelPyramid',
        '{"READ_VC_MODEL"}',
        '{}',
        true,
        '{"show_transitions": true, "editable": true, "show_legend": true, "zoom_enabled": true}',
        true,
        true,
        v_app_uuid,
        '1.0'
    )
    ON CONFLICT (component_code) DO UPDATE
    SET
        component_name = EXCLUDED.component_name,
        description = EXCLUDED.description,
        updated_at = NOW();

    RAISE NOTICE '✓ Inserted/Updated: vc_pyramid';

    -- ============================================================================
    -- VERIFICATION
    -- ============================================================================

    DECLARE
        v_component_count INT;
    BEGIN
        SELECT COUNT(*) INTO v_component_count
        FROM components_registry
        WHERE app_uuid = v_app_uuid;

        RAISE NOTICE '========================================';
        RAISE NOTICE 'Total components for app: %', v_component_count;
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Phase 1c Step 2 (Seed Components) COMPLETE';
        RAISE NOTICE '========================================';
    END;
END $$;
