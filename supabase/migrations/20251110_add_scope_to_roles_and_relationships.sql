-- ============================================================================
-- Add Scope Feature to Roles Only
-- File: 20251110_add_scope_to_roles_and_relationships.sql
-- Purpose: Allow roles to be "general" (app-wide) or "specific" (limited to certain stakeholders)
-- Note: Relationships are kept flexible and can apply to any stakeholder
-- ============================================================================

-- ============================================================================
-- ROLES TABLE - Add scope columns
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== Adding scope to roles table ===';
END $$;

-- Add scope enum column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'roles' AND column_name = 'scope'
    ) THEN
        ALTER TABLE roles ADD COLUMN scope TEXT DEFAULT 'general'
            CHECK (scope IN ('general', 'specific'));
        RAISE NOTICE '✓ Added scope column to roles';
    ELSE
        RAISE NOTICE '⚠ scope column already exists in roles';
    END IF;
END $$;

-- Add specific_stakeholder_id column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'roles' AND column_name = 'specific_stakeholder_id'
    ) THEN
        ALTER TABLE roles ADD COLUMN specific_stakeholder_id UUID
            REFERENCES stakeholders(id) ON DELETE CASCADE;
        RAISE NOTICE '✓ Added specific_stakeholder_id column to roles';

        -- Add constraint: if scope is 'specific', specific_stakeholder_id must be set
        ALTER TABLE roles ADD CONSTRAINT check_roles_scope_stakeholder
            CHECK (
                (scope = 'general' AND specific_stakeholder_id IS NULL) OR
                (scope = 'specific' AND specific_stakeholder_id IS NOT NULL)
            );
        RAISE NOTICE '✓ Added scope constraint to roles';
    ELSE
        RAISE NOTICE '⚠ specific_stakeholder_id column already exists in roles';
    END IF;
END $$;

-- Create index for specific stakeholder lookups
CREATE INDEX IF NOT EXISTS idx_roles_specific_stakeholder ON roles(specific_stakeholder_id)
    WHERE specific_stakeholder_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_roles_scope ON roles(scope);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Scope Migration COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Changes applied to:';
    RAISE NOTICE '- roles (scope, specific_stakeholder_id)';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Usage:';
    RAISE NOTICE '- scope = ''general'': Available to all (app-wide)';
    RAISE NOTICE '- scope = ''specific'': Limited to specific_stakeholder_id';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Relationships remain flexible - any relationship type';
    RAISE NOTICE 'can be applied to any stakeholder.';
    RAISE NOTICE '========================================';
END $$;
