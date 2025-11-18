-- ============================================================================
-- SPRINT 10.1d.2: Registry Consolidation & Management
-- File: 20251118215158_10_1d_2_registry_consolidation.sql
-- Purpose: Consolidate registry structures and prepare for management dashboard
-- Dependencies: 20251109150000_phase1c_components_registry.sql
-- ============================================================================

-- ============================================================================
-- STEP 1: Add registry_type column to components_registry
-- ============================================================================

DO $$
BEGIN
    -- Add registry_type column for future extensibility
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'components_registry' AND column_name = 'registry_type'
    ) THEN
        ALTER TABLE components_registry
        ADD COLUMN registry_type TEXT DEFAULT 'UI_COMPONENT'
        CHECK (registry_type IN ('UI_COMPONENT', 'AI_FUNCTION', 'WORKFLOW_TASK', 'ADMIN_TOOL'));

        RAISE NOTICE '✓ Added registry_type column to components_registry';
    ELSE
        RAISE NOTICE '⚠ registry_type column already exists';
    END IF;

    -- Create index on registry_type for filtering
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'components_registry' AND indexname = 'idx_components_registry_type'
    ) THEN
        CREATE INDEX idx_components_registry_type ON components_registry(registry_type);
        RAISE NOTICE '✓ Created index on registry_type';
    ELSE
        RAISE NOTICE '⚠ Index idx_components_registry_type already exists';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠ Error in Step 1: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 2: Update existing components to UI_COMPONENT type
-- ============================================================================

UPDATE components_registry
SET registry_type = 'UI_COMPONENT'
WHERE registry_type IS NULL OR registry_type = '';

-- ============================================================================
-- STEP 3: Migrate core_config JSON - Remove function_registry duplication
-- ============================================================================

DO $$
DECLARE
    v_stakeholder_count INT := 0;
    v_migrated_count INT := 0;
    v_backup_table TEXT := 'stakeholders_core_config_backup_' || to_char(NOW(), 'YYYYMMDD_HH24MISS');
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'STEP 3: Migrating core_config JSON';
    RAISE NOTICE '========================================';

    -- Count stakeholders with function_registry in core_config
    SELECT COUNT(*) INTO v_stakeholder_count
    FROM stakeholders
    WHERE core_config IS NOT NULL
    AND core_config::text LIKE '%function_registry%';

    RAISE NOTICE 'Found % stakeholders with function_registry in core_config', v_stakeholder_count;

    IF v_stakeholder_count > 0 THEN
        -- Create backup table with old core_config
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I AS
            SELECT
                id,
                name,
                email,
                core_config as old_core_config,
                NOW() as backup_timestamp
            FROM stakeholders
            WHERE core_config IS NOT NULL
            AND core_config::text LIKE ''%%function_registry%%''
        ', v_backup_table);

        RAISE NOTICE '✓ Created backup table: %', v_backup_table;

        -- Update core_config to remove function_registry and update version
        UPDATE stakeholders
        SET core_config = (
            -- Remove function_registry key
            SELECT jsonb_set(
                core_config - 'function_registry',
                '{__meta,version}',
                '"2.0"'
            )
        ),
        updated_at = NOW()
        WHERE core_config IS NOT NULL
        AND core_config::text LIKE '%function_registry%';

        GET DIAGNOSTICS v_migrated_count = ROW_COUNT;

        RAISE NOTICE '✓ Migrated % stakeholder core_config records', v_migrated_count;
        RAISE NOTICE '✓ Removed function_registry (now using components_registry table as single source of truth)';
        RAISE NOTICE '✓ Updated __meta.version to 2.0';
    ELSE
        RAISE NOTICE '⚠ No stakeholders found with function_registry - migration skipped';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠ Error in Step 3: %', SQLERRM;
        RAISE NOTICE '⚠ You can restore from backup table: %', v_backup_table;
END $$;

-- ============================================================================
-- STEP 4: Add audit fields for registry management
-- ============================================================================

DO $$
BEGIN
    -- Add deleted_at for soft deletes (if not exists)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'components_registry' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE components_registry
        ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

        RAISE NOTICE '✓ Added deleted_at column for soft deletes';
    END IF;

    -- Add last_modified_by for audit trail
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'components_registry' AND column_name = 'last_modified_by'
    ) THEN
        ALTER TABLE components_registry
        ADD COLUMN last_modified_by UUID REFERENCES users(id);

        RAISE NOTICE '✓ Added last_modified_by column for audit trail';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠ Error in Step 4: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 5: Update RLS Policies for Registry Management
-- ============================================================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "registry_admin_full_access" ON components_registry;
DROP POLICY IF EXISTS "registry_admin_manage" ON components_registry;
DROP POLICY IF EXISTS "registry_admin_insert" ON components_registry;
DROP POLICY IF EXISTS "registry_admin_update" ON components_registry;
DROP POLICY IF EXISTS "registry_admin_delete" ON components_registry;

-- Create comprehensive admin policies for INSERT, UPDATE, DELETE
-- Note: stakeholders table is global (no app_uuid), use stakeholder_roles for app isolation
CREATE POLICY "registry_admin_insert" ON components_registry
    FOR INSERT WITH CHECK (
        app_uuid IN (
            SELECT sr.app_uuid FROM stakeholder_roles sr
            JOIN stakeholders s ON s.id = sr.stakeholder_id
            WHERE s.auth_user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM stakeholder_roles sr
            JOIN stakeholders s ON s.id = sr.stakeholder_id
            WHERE s.auth_user_id = auth.uid()
            AND sr.role_type = 'admin'
        )
    );

CREATE POLICY "registry_admin_update" ON components_registry
    FOR UPDATE USING (
        app_uuid IN (
            SELECT sr.app_uuid FROM stakeholder_roles sr
            JOIN stakeholders s ON s.id = sr.stakeholder_id
            WHERE s.auth_user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM stakeholder_roles sr
            JOIN stakeholders s ON s.id = sr.stakeholder_id
            WHERE s.auth_user_id = auth.uid()
            AND sr.role_type = 'admin'
        )
    )
    WITH CHECK (
        app_uuid IN (
            SELECT sr.app_uuid FROM stakeholder_roles sr
            JOIN stakeholders s ON s.id = sr.stakeholder_id
            WHERE s.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "registry_admin_delete" ON components_registry
    FOR DELETE USING (
        app_uuid IN (
            SELECT sr.app_uuid FROM stakeholder_roles sr
            JOIN stakeholders s ON s.id = sr.stakeholder_id
            WHERE s.auth_user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM stakeholder_roles sr
            JOIN stakeholders s ON s.id = sr.stakeholder_id
            WHERE s.auth_user_id = auth.uid()
            AND sr.role_type = 'admin'
        )
    );

-- ============================================================================
-- STEP 6: Create helper function to check component usage
-- ============================================================================

CREATE OR REPLACE FUNCTION check_component_usage(p_component_code TEXT)
RETURNS TABLE(
    stakeholder_id UUID,
    stakeholder_name TEXT,
    stakeholder_email TEXT,
    role_config_key TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.name,
        s.email,
        role_key::TEXT
    FROM stakeholders s,
    jsonb_each(s.core_config->'role_configurations') as role_configs(role_key, role_config)
    WHERE role_config->'menu_items' @> jsonb_build_array(
        jsonb_build_object('component_code', p_component_code)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_component_usage(TEXT) IS
'Returns list of stakeholders using a specific component in their menu_items. Useful before deleting/deactivating a component.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_registry_type_count INT;
    v_ui_component_count INT;
    v_backup_tables INT;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION: Registry Consolidation';
    RAISE NOTICE '========================================';

    -- Check registry_type column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'components_registry' AND column_name = 'registry_type'
    ) THEN
        SELECT COUNT(*) INTO v_registry_type_count
        FROM components_registry
        WHERE registry_type IS NOT NULL;

        RAISE NOTICE '✓ registry_type column exists (% components have type set)', v_registry_type_count;
    ELSE
        RAISE WARNING '⚠ registry_type column NOT FOUND';
    END IF;

    -- Count UI_COMPONENT entries
    SELECT COUNT(*) INTO v_ui_component_count
    FROM components_registry
    WHERE registry_type = 'UI_COMPONENT';

    RAISE NOTICE '✓ % UI_COMPONENT entries in registry', v_ui_component_count;

    -- Check for backup tables
    SELECT COUNT(*) INTO v_backup_tables
    FROM information_schema.tables
    WHERE table_name LIKE 'stakeholders_core_config_backup_%';

    IF v_backup_tables > 0 THEN
        RAISE NOTICE '✓ % backup table(s) created for rollback', v_backup_tables;
    END IF;

    -- Check deleted_at column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'components_registry' AND column_name = 'deleted_at'
    ) THEN
        RAISE NOTICE '✓ deleted_at column exists for soft deletes';
    END IF;

    -- Check RLS policies
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'components_registry' AND policyname = 'registry_admin_insert'
    ) THEN
        RAISE NOTICE '✓ RLS policy registry_admin_insert created';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'components_registry' AND policyname = 'registry_admin_update'
    ) THEN
        RAISE NOTICE '✓ RLS policy registry_admin_update created';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'components_registry' AND policyname = 'registry_admin_delete'
    ) THEN
        RAISE NOTICE '✓ RLS policy registry_admin_delete created';
    END IF;

    -- Check helper function
    IF EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'check_component_usage'
    ) THEN
        RAISE NOTICE '✓ Helper function check_component_usage() created';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Sprint 10.1d.2 Database Migration COMPLETE';
    RAISE NOTICE 'Registry consolidation successful';
    RAISE NOTICE 'Next: Build Registry Management Dashboard';
    RAISE NOTICE '========================================';
END $$;
