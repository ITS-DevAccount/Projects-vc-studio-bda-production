-- ============================================================================
-- MIGRATION: Add app_uuid Multi-Tenancy Isolation
-- File: 20251109142557_add_app_uuid_multitenancy.sql
-- Purpose: Enforce application-level data segregation
-- Status: Requires RLS policy recreation
-- Rollback: Available via version control
-- ============================================================================

-- ============================================================================
-- STEP 1: Add app_uuid column to roles table
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== STEP 1: Adding app_uuid to roles table ===';

    -- Add column as nullable first
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'roles' AND column_name = 'app_uuid'
    ) THEN
        ALTER TABLE roles ADD COLUMN app_uuid UUID;
        RAISE NOTICE '✓ Added app_uuid column to roles';

        -- Backfill with current active app UUID
        UPDATE roles
        SET app_uuid = (
            SELECT app_uuid
            FROM site_settings
            WHERE is_active_app = true
            LIMIT 1
        )
        WHERE app_uuid IS NULL;
        RAISE NOTICE '✓ Backfilled app_uuid for existing roles';

        -- Now make it NOT NULL
        ALTER TABLE roles ALTER COLUMN app_uuid SET NOT NULL;
        RAISE NOTICE '✓ Set app_uuid as NOT NULL';

        -- Add foreign key constraint
        ALTER TABLE roles ADD CONSTRAINT fk_roles_app_uuid
            FOREIGN KEY (app_uuid) REFERENCES site_settings(app_uuid) ON DELETE CASCADE;
        RAISE NOTICE '✓ Added foreign key constraint';

        -- Create index
        CREATE INDEX idx_roles_app_uuid ON roles(app_uuid);
        RAISE NOTICE '✓ Created index on app_uuid';
    ELSE
        RAISE NOTICE '⚠ app_uuid column already exists on roles table';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Add app_uuid column to relationship_types table
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== STEP 2: Adding app_uuid to relationship_types table ===';

    -- Add column as nullable first
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'relationship_types' AND column_name = 'app_uuid'
    ) THEN
        ALTER TABLE relationship_types ADD COLUMN app_uuid UUID;
        RAISE NOTICE '✓ Added app_uuid column to relationship_types';

        -- Backfill with current active app UUID
        UPDATE relationship_types
        SET app_uuid = (
            SELECT app_uuid
            FROM site_settings
            WHERE is_active_app = true
            LIMIT 1
        )
        WHERE app_uuid IS NULL;
        RAISE NOTICE '✓ Backfilled app_uuid for existing relationship_types';

        -- Now make it NOT NULL
        ALTER TABLE relationship_types ALTER COLUMN app_uuid SET NOT NULL;
        RAISE NOTICE '✓ Set app_uuid as NOT NULL';

        -- Add foreign key constraint
        ALTER TABLE relationship_types ADD CONSTRAINT fk_relationship_types_app_uuid
            FOREIGN KEY (app_uuid) REFERENCES site_settings(app_uuid) ON DELETE CASCADE;
        RAISE NOTICE '✓ Added foreign key constraint';

        -- Create index
        CREATE INDEX idx_relationship_types_app_uuid ON relationship_types(app_uuid);
        RAISE NOTICE '✓ Created index on app_uuid';
    ELSE
        RAISE NOTICE '⚠ app_uuid column already exists on relationship_types table';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Verify/Update relationships table (already has app_uuid from PHASE-1a)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== STEP 3: Verifying relationships table app_uuid ===';

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'relationships' AND column_name = 'app_uuid'
    ) THEN
        RAISE NOTICE '✓ relationships table already has app_uuid column (from PHASE-1a)';

        -- Ensure existing records have app_uuid
        UPDATE relationships
        SET app_uuid = (
            SELECT app_uuid
            FROM site_settings
            WHERE is_active_app = true
            LIMIT 1
        )
        WHERE app_uuid IS NULL;

        -- Check if we need to add NOT NULL constraint
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'relationships'
            AND column_name = 'app_uuid'
            AND is_nullable = 'YES'
        ) THEN
            ALTER TABLE relationships ALTER COLUMN app_uuid SET NOT NULL;
            RAISE NOTICE '✓ Set app_uuid as NOT NULL on relationships';
        END IF;

        -- Ensure foreign key constraint exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_name = 'relationships'
            AND constraint_name = 'fk_relationships_app_uuid'
        ) THEN
            ALTER TABLE relationships ADD CONSTRAINT fk_relationships_app_uuid
                FOREIGN KEY (app_uuid) REFERENCES site_settings(app_uuid) ON DELETE CASCADE;
            RAISE NOTICE '✓ Added foreign key constraint';
        END IF;

        -- Ensure index exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'relationships'
            AND indexname = 'idx_relationships_app_uuid'
        ) THEN
            CREATE INDEX idx_relationships_app_uuid ON relationships(app_uuid);
            RAISE NOTICE '✓ Created index on app_uuid';
        END IF;
    ELSE
        RAISE NOTICE '⚠ relationships table missing app_uuid - adding it now';

        ALTER TABLE relationships ADD COLUMN app_uuid UUID;

        UPDATE relationships
        SET app_uuid = (
            SELECT app_uuid
            FROM site_settings
            WHERE is_active_app = true
            LIMIT 1
        )
        WHERE app_uuid IS NULL;

        ALTER TABLE relationships ALTER COLUMN app_uuid SET NOT NULL;

        ALTER TABLE relationships ADD CONSTRAINT fk_relationships_app_uuid
            FOREIGN KEY (app_uuid) REFERENCES site_settings(app_uuid) ON DELETE CASCADE;

        CREATE INDEX idx_relationships_app_uuid ON relationships(app_uuid);

        RAISE NOTICE '✓ Added app_uuid to relationships table';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Add app_uuid column to stakeholder_roles table
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== STEP 4: Adding app_uuid to stakeholder_roles table ===';

    -- Add column as nullable first
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'stakeholder_roles' AND column_name = 'app_uuid'
    ) THEN
        ALTER TABLE stakeholder_roles ADD COLUMN app_uuid UUID;
        RAISE NOTICE '✓ Added app_uuid column to stakeholder_roles';

        -- Backfill with current active app UUID
        UPDATE stakeholder_roles
        SET app_uuid = (
            SELECT app_uuid
            FROM site_settings
            WHERE is_active_app = true
            LIMIT 1
        )
        WHERE app_uuid IS NULL;
        RAISE NOTICE '✓ Backfilled app_uuid for existing stakeholder_roles';

        -- Now make it NOT NULL
        ALTER TABLE stakeholder_roles ALTER COLUMN app_uuid SET NOT NULL;
        RAISE NOTICE '✓ Set app_uuid as NOT NULL';

        -- Add foreign key constraint
        ALTER TABLE stakeholder_roles ADD CONSTRAINT fk_stakeholder_roles_app_uuid
            FOREIGN KEY (app_uuid) REFERENCES site_settings(app_uuid) ON DELETE CASCADE;
        RAISE NOTICE '✓ Added foreign key constraint';

        -- Create index
        CREATE INDEX idx_stakeholder_roles_app_uuid ON stakeholder_roles(app_uuid);
        RAISE NOTICE '✓ Created index on app_uuid';

        -- Create composite index for common query pattern
        CREATE INDEX idx_stakeholder_roles_stakeholder_app
            ON stakeholder_roles(stakeholder_id, app_uuid);
        RAISE NOTICE '✓ Created composite index';

        -- Drop old unique constraint
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_name = 'stakeholder_roles'
            AND constraint_name = 'stakeholder_roles_stakeholder_id_role_type_key'
        ) THEN
            ALTER TABLE stakeholder_roles
                DROP CONSTRAINT stakeholder_roles_stakeholder_id_role_type_key;
            RAISE NOTICE '✓ Dropped old unique constraint';
        END IF;

        -- Create new unique constraint with app_uuid
        ALTER TABLE stakeholder_roles
            ADD CONSTRAINT uq_stakeholder_roles_stakeholder_role_app
            UNIQUE(stakeholder_id, role_type, app_uuid);
        RAISE NOTICE '✓ Created new unique constraint with app_uuid';

    ELSE
        RAISE NOTICE '⚠ app_uuid column already exists on stakeholder_roles table';
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Add app_uuid to themes table (if it exists)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== STEP 5: Adding app_uuid to themes table (if exists) ===';

    -- Check if themes table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'themes'
    ) THEN
        -- Add column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'themes' AND column_name = 'app_uuid'
        ) THEN
            ALTER TABLE themes ADD COLUMN app_uuid UUID;
            RAISE NOTICE '✓ Added app_uuid column to themes';

            -- Backfill with current active app UUID
            UPDATE themes
            SET app_uuid = (
                SELECT app_uuid
                FROM site_settings
                WHERE is_active_app = true
                LIMIT 1
            )
            WHERE app_uuid IS NULL;
            RAISE NOTICE '✓ Backfilled app_uuid for existing themes';

            -- Now make it NOT NULL
            ALTER TABLE themes ALTER COLUMN app_uuid SET NOT NULL;
            RAISE NOTICE '✓ Set app_uuid as NOT NULL';

            -- Add foreign key constraint
            ALTER TABLE themes ADD CONSTRAINT fk_themes_app_uuid
                FOREIGN KEY (app_uuid) REFERENCES site_settings(app_uuid) ON DELETE CASCADE;
            RAISE NOTICE '✓ Added foreign key constraint';

            -- Create index
            CREATE INDEX idx_themes_app_uuid ON themes(app_uuid);
            RAISE NOTICE '✓ Created index on app_uuid';
        ELSE
            RAISE NOTICE '⚠ app_uuid column already exists on themes table';
        END IF;
    ELSE
        RAISE NOTICE '⚠ themes table does not exist - skipping';
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Add comment to app_uuid columns
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== STEP 6: Adding column comments ===';

    -- Add comments to document purpose
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'app_uuid') THEN
        COMMENT ON COLUMN roles.app_uuid IS 'App-specific role definition - allows different apps to have different role configurations';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'relationship_types' AND column_name = 'app_uuid') THEN
        COMMENT ON COLUMN relationship_types.app_uuid IS 'App-specific relationship type - allows different apps to define different relationship taxonomies';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'relationships' AND column_name = 'app_uuid') THEN
        COMMENT ON COLUMN relationships.app_uuid IS 'App-specific relationship - stakeholder relationships are scoped to each application';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stakeholder_roles' AND column_name = 'app_uuid') THEN
        COMMENT ON COLUMN stakeholder_roles.app_uuid IS 'App-specific role assignment - allows same stakeholder to have different roles in different apps';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'themes' AND column_name = 'app_uuid') THEN
        COMMENT ON COLUMN themes.app_uuid IS 'App-specific theme - allows each application to have its own branding';
    END IF;

    RAISE NOTICE '✓ Added column comments';
END $$;

-- ============================================================================
-- VERIFICATION - Count rows affected
-- ============================================================================

DO $$
DECLARE
    v_roles_count INT;
    v_relationship_types_count INT;
    v_relationships_count INT;
    v_stakeholder_roles_count INT;
    v_themes_count INT;
BEGIN
    RAISE NOTICE '=== VERIFICATION: Row counts ===';

    SELECT COUNT(*) INTO v_roles_count FROM roles;
    SELECT COUNT(*) INTO v_relationship_types_count FROM relationship_types;
    SELECT COUNT(*) INTO v_relationships_count FROM relationships;
    SELECT COUNT(*) INTO v_stakeholder_roles_count FROM stakeholder_roles;

    -- Check if themes exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'themes') THEN
        SELECT COUNT(*) INTO v_themes_count FROM themes;
    ELSE
        v_themes_count := 0;
    END IF;

    RAISE NOTICE 'Total roles: %', v_roles_count;
    RAISE NOTICE 'Total relationship_types: %', v_relationship_types_count;
    RAISE NOTICE 'Total relationships: %', v_relationships_count;
    RAISE NOTICE 'Total stakeholder_roles: %', v_stakeholder_roles_count;
    RAISE NOTICE 'Total themes: %', v_themes_count;

    -- Verify all have app_uuid
    RAISE NOTICE '=== Verifying app_uuid columns ===';

    IF EXISTS (SELECT 1 FROM roles WHERE app_uuid IS NULL) THEN
        RAISE WARNING '⚠ Some roles records have NULL app_uuid';
    ELSE
        RAISE NOTICE '✓ All roles have app_uuid';
    END IF;

    IF EXISTS (SELECT 1 FROM relationship_types WHERE app_uuid IS NULL) THEN
        RAISE WARNING '⚠ Some relationship_types records have NULL app_uuid';
    ELSE
        RAISE NOTICE '✓ All relationship_types have app_uuid';
    END IF;

    IF EXISTS (SELECT 1 FROM relationships WHERE app_uuid IS NULL) THEN
        RAISE WARNING '⚠ Some relationships records have NULL app_uuid';
    ELSE
        RAISE NOTICE '✓ All relationships have app_uuid';
    END IF;

    IF EXISTS (SELECT 1 FROM stakeholder_roles WHERE app_uuid IS NULL) THEN
        RAISE WARNING '⚠ Some stakeholder_roles records have NULL app_uuid';
    ELSE
        RAISE NOTICE '✓ All stakeholder_roles have app_uuid';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'themes') THEN
        IF EXISTS (SELECT 1 FROM themes WHERE app_uuid IS NULL) THEN
            RAISE WARNING '⚠ Some themes records have NULL app_uuid';
        ELSE
            RAISE NOTICE '✓ All themes have app_uuid';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 20251109142557_add_app_uuid_multitenancy.sql COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Apply RLS policies from rls_policies_multitenancy.sql';
    RAISE NOTICE '2. Update provision_stakeholder_v2 function';
    RAISE NOTICE '3. Update application code to pass app_uuid';
    RAISE NOTICE '========================================';
END $$;
