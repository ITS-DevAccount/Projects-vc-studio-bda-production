-- =============================================================================
-- PHASE 1a: MULTI-APP FIELD EXTENSIONS (SAFE VERSION)
-- =============================================================================
-- Purpose: Extend existing tables for multi-app support
-- Target: Support independent applications (T2G, G2G, OCG, VC_STUDIO, BUILDBID)
-- Strategy: Non-breaking changes, backward compatible
-- Risk: LOW - All changes are additive
--
-- This version ONLY modifies tables that exist in your database:
--   - site_settings
--   - page_settings
--   - page_images
--
-- Safe to run: Multiple times (idempotent)
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- SECTION 1: EXTEND SITE_SETTINGS WITH APP METADATA
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== SECTION 1: Extending site_settings ===';

    -- Add app_uuid (unique identifier for each application)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_settings' AND column_name = 'app_uuid'
    ) THEN
        ALTER TABLE site_settings ADD COLUMN app_uuid UUID DEFAULT gen_random_uuid();
        RAISE NOTICE '✓ Added app_uuid column to site_settings';
    ELSE
        RAISE NOTICE '  app_uuid already exists in site_settings';
    END IF;

    -- Add site_code (human-readable code: T2G, VC_STUDIO, etc.)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_settings' AND column_name = 'site_code'
    ) THEN
        ALTER TABLE site_settings ADD COLUMN site_code TEXT;
        RAISE NOTICE '✓ Added site_code column to site_settings';
    ELSE
        RAISE NOTICE '  site_code already exists in site_settings';
    END IF;

    -- Add domain_code (group apps: ADA, BDA, PDA)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_settings' AND column_name = 'domain_code'
    ) THEN
        ALTER TABLE site_settings ADD COLUMN domain_code TEXT;
        RAISE NOTICE '✓ Added domain_code column to site_settings';
    ELSE
        RAISE NOTICE '  domain_code already exists in site_settings';
    END IF;

    -- Add is_active_app (allows multiple active apps)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_settings' AND column_name = 'is_active_app'
    ) THEN
        ALTER TABLE site_settings ADD COLUMN is_active_app BOOLEAN DEFAULT TRUE;
        RAISE NOTICE '✓ Added is_active_app column to site_settings';
    ELSE
        RAISE NOTICE '  is_active_app already exists in site_settings';
    END IF;
END $$;

-- Create unique constraint on app_uuid
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_site_settings_app_uuid'
    ) THEN
        ALTER TABLE site_settings ADD CONSTRAINT uq_site_settings_app_uuid UNIQUE (app_uuid);
        RAISE NOTICE '✓ Created unique constraint on site_settings.app_uuid';
    ELSE
        RAISE NOTICE '  Unique constraint on app_uuid already exists';
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_site_settings_app_uuid ON site_settings(app_uuid);
CREATE INDEX IF NOT EXISTS idx_site_settings_site_code ON site_settings(site_code);
CREATE INDEX IF NOT EXISTS idx_site_settings_domain_code ON site_settings(domain_code);
CREATE INDEX IF NOT EXISTS idx_site_settings_active_app ON site_settings(is_active_app);

-- Backfill existing data (assume current record is VC_STUDIO in BDA domain)
UPDATE site_settings
SET
    site_code = COALESCE(site_code, 'VC_STUDIO'),
    domain_code = COALESCE(domain_code, 'BDA'),
    is_active_app = COALESCE(is_active_app, true)
WHERE site_code IS NULL OR domain_code IS NULL;

RAISE NOTICE '✓ Backfilled site_settings with default values';

-- Drop old single-active trigger if it exists
DROP TRIGGER IF EXISTS ensure_single_active_site_settings_trigger ON site_settings;
RAISE NOTICE '✓ Dropped old single-active trigger (if it existed)';

-- =============================================================================
-- SECTION 2: FIX PAGE_SETTINGS FOR MULTI-APP
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== SECTION 2: Extending page_settings ===';

    -- Add app_uuid column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'page_settings' AND column_name = 'app_uuid'
    ) THEN
        ALTER TABLE page_settings ADD COLUMN app_uuid UUID REFERENCES site_settings(app_uuid);
        CREATE INDEX idx_page_settings_app_uuid ON page_settings(app_uuid);
        RAISE NOTICE '✓ Added app_uuid to page_settings';
    ELSE
        RAISE NOTICE '  app_uuid already exists in page_settings';
    END IF;

    -- Drop old unique constraint on page_name (if exists)
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'page_settings_page_name_key'
    ) THEN
        ALTER TABLE page_settings DROP CONSTRAINT page_settings_page_name_key;
        RAISE NOTICE '✓ Dropped old page_name unique constraint';
    ELSE
        RAISE NOTICE '  Old page_name constraint does not exist';
    END IF;

    -- Add composite unique constraint (app_uuid, page_name)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_page_settings_app_page'
    ) THEN
        ALTER TABLE page_settings ADD CONSTRAINT uq_page_settings_app_page UNIQUE (app_uuid, page_name);
        RAISE NOTICE '✓ Created composite unique constraint on (app_uuid, page_name)';
    ELSE
        RAISE NOTICE '  Composite unique constraint already exists';
    END IF;

    -- Backfill existing pages to VC_STUDIO
    UPDATE page_settings
    SET app_uuid = (SELECT app_uuid FROM site_settings WHERE site_code = 'VC_STUDIO' LIMIT 1)
    WHERE app_uuid IS NULL;

    -- Make app_uuid NOT NULL after backfill
    ALTER TABLE page_settings ALTER COLUMN app_uuid SET NOT NULL;

    RAISE NOTICE '✓ Backfilled page_settings with VC_STUDIO app_uuid';
END $$;

-- =============================================================================
-- SECTION 3: FIX PAGE_IMAGES FOR MULTI-APP
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== SECTION 3: Extending page_images ===';

    -- Add app_uuid column (denormalized from page_settings for performance)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'page_images' AND column_name = 'app_uuid'
    ) THEN
        ALTER TABLE page_images ADD COLUMN app_uuid UUID REFERENCES site_settings(app_uuid);
        CREATE INDEX idx_page_images_app_uuid ON page_images(app_uuid);
        RAISE NOTICE '✓ Added app_uuid to page_images';
    ELSE
        RAISE NOTICE '  app_uuid already exists in page_images';
    END IF;

    -- Backfill from parent page_settings
    UPDATE page_images pi
    SET app_uuid = ps.app_uuid
    FROM page_settings ps
    WHERE pi.page_settings_id = ps.id
      AND pi.app_uuid IS NULL;

    RAISE NOTICE '✓ Backfilled page_images app_uuid from page_settings';

    -- Create or replace trigger to auto-sync app_uuid from page_settings
    CREATE OR REPLACE FUNCTION sync_page_images_app_uuid()
    RETURNS TRIGGER AS $func$
    BEGIN
        SELECT app_uuid INTO NEW.app_uuid
        FROM page_settings
        WHERE id = NEW.page_settings_id;
        RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS sync_page_images_app_uuid_trigger ON page_images;
    CREATE TRIGGER sync_page_images_app_uuid_trigger
        BEFORE INSERT OR UPDATE ON page_images
        FOR EACH ROW
        EXECUTE FUNCTION sync_page_images_app_uuid();

    RAISE NOTICE '✓ Created trigger to auto-sync page_images.app_uuid';
END $$;

-- =============================================================================
-- SECTION 4: OPTIONAL TABLES (ONLY IF THEY EXIST)
-- =============================================================================

-- enquiries table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'enquiries'
    ) THEN
        RAISE NOTICE '=== SECTION 4a: Extending enquiries ===';

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'enquiries' AND column_name = 'app_uuid'
        ) THEN
            ALTER TABLE enquiries ADD COLUMN app_uuid UUID REFERENCES site_settings(app_uuid);
            CREATE INDEX idx_enquiries_app_uuid ON enquiries(app_uuid);

            UPDATE enquiries
            SET app_uuid = (SELECT app_uuid FROM site_settings WHERE site_code = 'VC_STUDIO' LIMIT 1)
            WHERE app_uuid IS NULL;

            RAISE NOTICE '✓ Added app_uuid to enquiries and backfilled';
        ELSE
            RAISE NOTICE '  app_uuid already exists in enquiries';
        END IF;
    ELSE
        RAISE NOTICE '  enquiries table does not exist - skipping';
    END IF;
END $$;

-- blog_posts table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'blog_posts'
    ) THEN
        RAISE NOTICE '=== SECTION 4b: Extending blog_posts ===';

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'blog_posts' AND column_name = 'app_uuid'
        ) THEN
            ALTER TABLE blog_posts ADD COLUMN app_uuid UUID REFERENCES site_settings(app_uuid);
            CREATE INDEX idx_blog_posts_app_uuid ON blog_posts(app_uuid);

            -- Drop old unique constraint on slug
            IF EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'blog_posts_slug_key'
            ) THEN
                ALTER TABLE blog_posts DROP CONSTRAINT blog_posts_slug_key;
            END IF;

            -- Add composite unique constraint
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'uq_blog_posts_app_slug'
            ) THEN
                ALTER TABLE blog_posts ADD CONSTRAINT uq_blog_posts_app_slug UNIQUE (app_uuid, slug);
            END IF;

            UPDATE blog_posts
            SET app_uuid = (SELECT app_uuid FROM site_settings WHERE site_code = 'VC_STUDIO' LIMIT 1)
            WHERE app_uuid IS NULL;

            ALTER TABLE blog_posts ALTER COLUMN app_uuid SET NOT NULL;

            RAISE NOTICE '✓ Added app_uuid to blog_posts and backfilled';
        ELSE
            RAISE NOTICE '  app_uuid already exists in blog_posts';
        END IF;
    ELSE
        RAISE NOTICE '  blog_posts table does not exist - skipping';
    END IF;
END $$;

-- notifications table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'notifications'
    ) THEN
        RAISE NOTICE '=== SECTION 4c: Extending notifications ===';

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'notifications' AND column_name = 'app_uuid'
        ) THEN
            ALTER TABLE notifications ADD COLUMN app_uuid UUID REFERENCES site_settings(app_uuid);
            CREATE INDEX idx_notifications_app_uuid ON notifications(app_uuid);

            -- Only create composite index if user_id exists
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'notifications' AND column_name = 'user_id'
            ) THEN
                CREATE INDEX IF NOT EXISTS idx_notifications_user_app ON notifications(user_id, app_uuid);
                RAISE NOTICE '✓ Created composite index on (user_id, app_uuid)';
            END IF;

            RAISE NOTICE '✓ Added app_uuid to notifications';
        ELSE
            RAISE NOTICE '  app_uuid already exists in notifications';
        END IF;
    ELSE
        RAISE NOTICE '  notifications table does not exist - skipping';
    END IF;
END $$;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== VERIFICATION ===';
    RAISE NOTICE 'Run the following queries manually to verify the migration:';
    RAISE NOTICE '';
    RAISE NOTICE '1. Check site_settings columns:';
    RAISE NOTICE '   SELECT site_code, domain_code, site_name, app_uuid FROM site_settings;';
    RAISE NOTICE '';
    RAISE NOTICE '2. Check page_settings has app_uuid:';
    RAISE NOTICE '   SELECT page_name, app_uuid FROM page_settings;';
    RAISE NOTICE '';
    RAISE NOTICE '3. Check page_images has app_uuid:';
    RAISE NOTICE '   SELECT id, app_uuid FROM page_images LIMIT 5;';
    RAISE NOTICE '';
    RAISE NOTICE '4. Check for NULL app_uuids:';
    RAISE NOTICE '   SELECT COUNT(*) FROM page_settings WHERE app_uuid IS NULL;';
    RAISE NOTICE '   SELECT COUNT(*) FROM page_images WHERE app_uuid IS NULL;';
END $$;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

SELECT
    '✓ Migration completed successfully!' AS status,
    'Run verification queries above to confirm' AS next_step;

-- Display summary
SELECT
    'site_settings' AS table_name,
    COUNT(*) AS total_rows,
    COUNT(DISTINCT app_uuid) AS unique_apps
FROM site_settings
UNION ALL
SELECT
    'page_settings',
    COUNT(*),
    COUNT(DISTINCT app_uuid)
FROM page_settings
UNION ALL
SELECT
    'page_images',
    COUNT(*),
    COUNT(DISTINCT app_uuid)
FROM page_images;
