-- ============================================================================
-- VC Studio BDA: Update component_suite constraint - CRM to CAMPAIGNS
-- Migration: Replace CRM with CAMPAIGNS in components_registry.component_suite
-- Description: Updates the CHECK constraint on component_suite column
-- Created: 2026-02-02
--
-- Builds the new constraint from actual distinct values in the table,
-- replacing CRM with CAMPAIGNS, so no existing rows are violated.
-- ============================================================================

DO $$
DECLARE
    r RECORD;
    v_values TEXT := '';
    v_sql TEXT;
BEGIN
    -- Step 1: Update any existing rows that have component_suite = 'CRM' to 'CAMPAIGNS'
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'components_registry' AND column_name = 'component_suite'
    ) THEN
        UPDATE components_registry SET component_suite = 'CAMPAIGNS' WHERE component_suite = 'CRM';
        RAISE NOTICE 'Updated component_suite: CRM -> CAMPAIGNS';
    END IF;

    -- Step 2: Drop the existing CHECK constraint on component_suite
    FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.components_registry'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%component_suite%'
    LOOP
        EXECUTE format('ALTER TABLE components_registry DROP CONSTRAINT IF EXISTS %I', r.conname);
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;

    -- Step 3: Build allowed values from distinct component_suite in table + CAMPAIGNS
    -- Collect distinct non-null values, ensure CAMPAIGNS is included
    SELECT COALESCE(
        string_agg(DISTINCT quote_literal(component_suite), ', ' ORDER BY quote_literal(component_suite)),
        ''
    ) INTO v_values
    FROM (
        SELECT component_suite FROM components_registry WHERE component_suite IS NOT NULL
        UNION
        SELECT 'CAMPAIGNS'::TEXT
    ) AS t;

    -- Add new CHECK constraint with values from actual data
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'components_registry' AND column_name = 'component_suite'
    ) THEN
        IF v_values = '' THEN
            -- No distinct values yet; use minimal set including CAMPAIGNS
            v_values := '''CAMPAIGNS'', ''FLM'', ''VC_MODELS'', ''WORKSPACE'', ''FILE_SYSTEM'', ''ADMIN'', ''UI_COMPONENT''';
        END IF;
        v_sql := format(
            'ALTER TABLE components_registry ADD CONSTRAINT components_registry_component_suite_check CHECK (component_suite IS NULL OR component_suite IN (%s))',
            v_values
        );
        EXECUTE v_sql;
        RAISE NOTICE 'Added components_registry_component_suite_check with values: %', v_values;
    END IF;
END $$;
