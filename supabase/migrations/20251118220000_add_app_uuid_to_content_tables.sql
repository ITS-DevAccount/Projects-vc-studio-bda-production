-- ============================================================================
-- MIGRATION: Add app_uuid to Content Tables (Sprint 10d.1)
-- File: 20251118220000_add_app_uuid_to_content_tables.sql
-- Purpose: Add multi-tenancy support to page_settings, page_images, blog_posts, enquiries
-- Status: Implements Sprint 10d.1 requirements
-- ============================================================================

-- ============================================================================
-- STEP 1: Add app_uuid column to page_settings table
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== STEP 1: Adding app_uuid to page_settings table ===';

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'page_settings' AND column_name = 'app_uuid'
    ) THEN
        -- Add column as nullable first
        ALTER TABLE page_settings ADD COLUMN app_uuid UUID;
        RAISE NOTICE '✓ Added app_uuid column to page_settings';

        -- Backfill with current active app UUID
        UPDATE page_settings
        SET app_uuid = (
            SELECT app_uuid
            FROM site_settings
            WHERE is_active_app = true
            LIMIT 1
        )
        WHERE app_uuid IS NULL;
        RAISE NOTICE '✓ Backfilled app_uuid for existing page_settings';

        -- Now make it NOT NULL
        ALTER TABLE page_settings ALTER COLUMN app_uuid SET NOT NULL;
        RAISE NOTICE '✓ Set app_uuid as NOT NULL';

        -- Add foreign key constraint
        ALTER TABLE page_settings ADD CONSTRAINT fk_page_settings_app_uuid
            FOREIGN KEY (app_uuid) REFERENCES site_settings(app_uuid) ON DELETE CASCADE;
        RAISE NOTICE '✓ Added foreign key constraint';

        -- Create index
        CREATE INDEX idx_page_settings_app_uuid ON page_settings(app_uuid);
        RAISE NOTICE '✓ Created index on app_uuid';

        -- Add comment
        COMMENT ON COLUMN page_settings.app_uuid IS 'App-specific page settings - allows different apps to have different page configurations';
        RAISE NOTICE '✓ Added column comment';
    ELSE
        RAISE NOTICE '⚠ app_uuid column already exists on page_settings table';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Add app_uuid column to page_images table
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== STEP 2: Adding app_uuid to page_images table ===';

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'page_images' AND column_name = 'app_uuid'
    ) THEN
        -- Add column as nullable first
        ALTER TABLE page_images ADD COLUMN app_uuid UUID;
        RAISE NOTICE '✓ Added app_uuid column to page_images';

        -- Backfill with app_uuid from parent page_settings
        UPDATE page_images pi
        SET app_uuid = ps.app_uuid
        FROM page_settings ps
        WHERE pi.page_settings_id = ps.id
        AND pi.app_uuid IS NULL;
        RAISE NOTICE '✓ Backfilled app_uuid from page_settings';

        -- Now make it NOT NULL
        ALTER TABLE page_images ALTER COLUMN app_uuid SET NOT NULL;
        RAISE NOTICE '✓ Set app_uuid as NOT NULL';

        -- Add foreign key constraint
        ALTER TABLE page_images ADD CONSTRAINT fk_page_images_app_uuid
            FOREIGN KEY (app_uuid) REFERENCES site_settings(app_uuid) ON DELETE CASCADE;
        RAISE NOTICE '✓ Added foreign key constraint';

        -- Create index
        CREATE INDEX idx_page_images_app_uuid ON page_images(app_uuid);
        RAISE NOTICE '✓ Created index on app_uuid';

        -- Create composite index for common query pattern
        CREATE INDEX idx_page_images_settings_app
            ON page_images(page_settings_id, app_uuid);
        RAISE NOTICE '✓ Created composite index';

        -- Add comment
        COMMENT ON COLUMN page_images.app_uuid IS 'App-specific page image - allows different apps to have different gallery images';
        RAISE NOTICE '✓ Added column comment';
    ELSE
        RAISE NOTICE '⚠ app_uuid column already exists on page_images table';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Add app_uuid column to blog_posts table
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== STEP 3: Adding app_uuid to blog_posts table ===';

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'blog_posts' AND column_name = 'app_uuid'
    ) THEN
        -- Add column as nullable first
        ALTER TABLE blog_posts ADD COLUMN app_uuid UUID;
        RAISE NOTICE '✓ Added app_uuid column to blog_posts';

        -- Backfill with current active app UUID
        UPDATE blog_posts
        SET app_uuid = (
            SELECT app_uuid
            FROM site_settings
            WHERE is_active_app = true
            LIMIT 1
        )
        WHERE app_uuid IS NULL;
        RAISE NOTICE '✓ Backfilled app_uuid for existing blog_posts';

        -- Now make it NOT NULL
        ALTER TABLE blog_posts ALTER COLUMN app_uuid SET NOT NULL;
        RAISE NOTICE '✓ Set app_uuid as NOT NULL';

        -- Add foreign key constraint
        ALTER TABLE blog_posts ADD CONSTRAINT fk_blog_posts_app_uuid
            FOREIGN KEY (app_uuid) REFERENCES site_settings(app_uuid) ON DELETE CASCADE;
        RAISE NOTICE '✓ Added foreign key constraint';

        -- Create index
        CREATE INDEX idx_blog_posts_app_uuid ON blog_posts(app_uuid);
        RAISE NOTICE '✓ Created index on app_uuid';

        -- Create composite index for common query pattern (app + status)
        CREATE INDEX idx_blog_posts_app_status
            ON blog_posts(app_uuid, status);
        RAISE NOTICE '✓ Created composite index';

        -- Add comment
        COMMENT ON COLUMN blog_posts.app_uuid IS 'App-specific blog post - allows different apps to have different blog content';
        RAISE NOTICE '✓ Added column comment';
    ELSE
        RAISE NOTICE '⚠ app_uuid column already exists on blog_posts table';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Add app_uuid column to enquiries table
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== STEP 4: Adding app_uuid to enquiries table ===';

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'enquiries' AND column_name = 'app_uuid'
    ) THEN
        -- Add column as nullable first
        ALTER TABLE enquiries ADD COLUMN app_uuid UUID;
        RAISE NOTICE '✓ Added app_uuid column to enquiries';

        -- Backfill with current active app UUID
        UPDATE enquiries
        SET app_uuid = (
            SELECT app_uuid
            FROM site_settings
            WHERE is_active_app = true
            LIMIT 1
        )
        WHERE app_uuid IS NULL;
        RAISE NOTICE '✓ Backfilled app_uuid for existing enquiries';

        -- Now make it NOT NULL
        ALTER TABLE enquiries ALTER COLUMN app_uuid SET NOT NULL;
        RAISE NOTICE '✓ Set app_uuid as NOT NULL';

        -- Add foreign key constraint
        ALTER TABLE enquiries ADD CONSTRAINT fk_enquiries_app_uuid
            FOREIGN KEY (app_uuid) REFERENCES site_settings(app_uuid) ON DELETE CASCADE;
        RAISE NOTICE '✓ Added foreign key constraint';

        -- Create index
        CREATE INDEX idx_enquiries_app_uuid ON enquiries(app_uuid);
        RAISE NOTICE '✓ Created index on app_uuid';

        -- Create composite index for common query pattern (app + status)
        CREATE INDEX idx_enquiries_app_status
            ON enquiries(app_uuid, status);
        RAISE NOTICE '✓ Created composite index';

        -- Add comment
        COMMENT ON COLUMN enquiries.app_uuid IS 'App-specific enquiry - tracks which app the enquiry was submitted to';
        RAISE NOTICE '✓ Added column comment';
    ELSE
        RAISE NOTICE '⚠ app_uuid column already exists on enquiries table';
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Update RLS Policies for Multi-Tenant Access
-- ============================================================================

-- ============================================================================
-- PAGE_SETTINGS RLS Policies
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== STEP 5a: Updating RLS policies for page_settings ===';

    -- Drop existing policies
    DROP POLICY IF EXISTS "page_settings_select_published" ON page_settings;
    DROP POLICY IF EXISTS "page_settings_select_all_auth" ON page_settings;
    DROP POLICY IF EXISTS "page_settings_insert_auth" ON page_settings;
    DROP POLICY IF EXISTS "page_settings_update_auth" ON page_settings;
    DROP POLICY IF EXISTS "page_settings_delete_auth" ON page_settings;

    -- Anonymous users can read published settings for any app
    CREATE POLICY "page_settings_select_published_anon" ON page_settings
    FOR SELECT TO anon
    USING (is_published = true);

    -- Authenticated users can read published settings for any app
    CREATE POLICY "page_settings_select_published_auth" ON page_settings
    FOR SELECT TO authenticated
    USING (is_published = true);

    -- Authenticated users can manage settings for their app
    CREATE POLICY "page_settings_all_own_app" ON page_settings
    FOR ALL TO authenticated
    USING (
        app_uuid IN (
            SELECT sr.app_uuid FROM stakeholder_roles sr
            JOIN stakeholders s ON s.id = sr.stakeholder_id
            WHERE s.auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        app_uuid IN (
            SELECT sr.app_uuid FROM stakeholder_roles sr
            JOIN stakeholders s ON s.id = sr.stakeholder_id
            WHERE s.auth_user_id = auth.uid()
        )
    );

    RAISE NOTICE '✓ Updated RLS policies for page_settings';
END $$;

-- ============================================================================
-- PAGE_IMAGES RLS Policies
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== STEP 5b: Updating RLS policies for page_images ===';

    -- Drop existing policies
    DROP POLICY IF EXISTS "page_images_select_published" ON page_images;
    DROP POLICY IF EXISTS "page_images_select_all_auth" ON page_images;
    DROP POLICY IF EXISTS "page_images_insert_auth" ON page_images;
    DROP POLICY IF EXISTS "page_images_update_auth" ON page_images;
    DROP POLICY IF EXISTS "page_images_delete_auth" ON page_images;

    -- Anonymous users can read active images for published pages
    CREATE POLICY "page_images_select_published_anon" ON page_images
    FOR SELECT TO anon
    USING (
        is_active = true AND
        EXISTS (
            SELECT 1 FROM page_settings ps
            WHERE ps.id = page_images.page_settings_id
            AND ps.is_published = true
        )
    );

    -- Authenticated users can read active images for published pages
    CREATE POLICY "page_images_select_published_auth" ON page_images
    FOR SELECT TO authenticated
    USING (
        is_active = true AND
        EXISTS (
            SELECT 1 FROM page_settings ps
            WHERE ps.id = page_images.page_settings_id
            AND ps.is_published = true
        )
    );

    -- Authenticated users can manage images for their app
    CREATE POLICY "page_images_all_own_app" ON page_images
    FOR ALL TO authenticated
    USING (
        app_uuid IN (
            SELECT sr.app_uuid FROM stakeholder_roles sr
            JOIN stakeholders s ON s.id = sr.stakeholder_id
            WHERE s.auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        app_uuid IN (
            SELECT sr.app_uuid FROM stakeholder_roles sr
            JOIN stakeholders s ON s.id = sr.stakeholder_id
            WHERE s.auth_user_id = auth.uid()
        )
    );

    RAISE NOTICE '✓ Updated RLS policies for page_images';
END $$;

-- ============================================================================
-- BLOG_POSTS RLS Policies
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== STEP 5c: Updating RLS policies for blog_posts ===';

    -- Drop existing policies
    DROP POLICY IF EXISTS "Enable read for all users" ON blog_posts;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON blog_posts;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON blog_posts;
    DROP POLICY IF EXISTS "Enable delete for authenticated users" ON blog_posts;

    -- Anonymous users can read published blog posts from any app
    CREATE POLICY "blog_posts_select_published_anon" ON blog_posts
    FOR SELECT TO anon
    USING (status = 'published');

    -- Authenticated users can read published blog posts from any app
    CREATE POLICY "blog_posts_select_published_auth" ON blog_posts
    FOR SELECT TO authenticated
    USING (status = 'published');

    -- Authenticated users can manage blog posts for their app
    CREATE POLICY "blog_posts_all_own_app" ON blog_posts
    FOR ALL TO authenticated
    USING (
        app_uuid IN (
            SELECT sr.app_uuid FROM stakeholder_roles sr
            JOIN stakeholders s ON s.id = sr.stakeholder_id
            WHERE s.auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        app_uuid IN (
            SELECT sr.app_uuid FROM stakeholder_roles sr
            JOIN stakeholders s ON s.id = sr.stakeholder_id
            WHERE s.auth_user_id = auth.uid()
        )
    );

    RAISE NOTICE '✓ Updated RLS policies for blog_posts';
END $$;

-- ============================================================================
-- ENQUIRIES RLS Policies
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== STEP 5d: Updating RLS policies for enquiries ===';

    -- Drop existing policies
    DROP POLICY IF EXISTS "Enable insert for all users" ON enquiries;
    DROP POLICY IF EXISTS "Enable read for authenticated users" ON enquiries;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON enquiries;
    DROP POLICY IF EXISTS "Enable delete for authenticated users" ON enquiries;

    -- Anonymous and authenticated users can submit enquiries to any app
    CREATE POLICY "enquiries_insert_all" ON enquiries
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

    -- Authenticated users can read enquiries for their app
    CREATE POLICY "enquiries_select_own_app" ON enquiries
    FOR SELECT TO authenticated
    USING (
        app_uuid IN (
            SELECT sr.app_uuid FROM stakeholder_roles sr
            JOIN stakeholders s ON s.id = sr.stakeholder_id
            WHERE s.auth_user_id = auth.uid()
        )
    );

    -- Authenticated users can update enquiries for their app
    CREATE POLICY "enquiries_update_own_app" ON enquiries
    FOR UPDATE TO authenticated
    USING (
        app_uuid IN (
            SELECT sr.app_uuid FROM stakeholder_roles sr
            JOIN stakeholders s ON s.id = sr.stakeholder_id
            WHERE s.auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        app_uuid IN (
            SELECT sr.app_uuid FROM stakeholder_roles sr
            JOIN stakeholders s ON s.id = sr.stakeholder_id
            WHERE s.auth_user_id = auth.uid()
        )
    );

    -- Authenticated users can delete enquiries for their app
    CREATE POLICY "enquiries_delete_own_app" ON enquiries
    FOR DELETE TO authenticated
    USING (
        app_uuid IN (
            SELECT sr.app_uuid FROM stakeholder_roles sr
            JOIN stakeholders s ON s.id = sr.stakeholder_id
            WHERE s.auth_user_id = auth.uid()
        )
    );

    RAISE NOTICE '✓ Updated RLS policies for enquiries';
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_page_settings_count INT;
    v_page_images_count INT;
    v_blog_posts_count INT;
    v_enquiries_count INT;
BEGIN
    RAISE NOTICE '=== VERIFICATION: Row counts ===';

    SELECT COUNT(*) INTO v_page_settings_count FROM page_settings;
    SELECT COUNT(*) INTO v_page_images_count FROM page_images;
    SELECT COUNT(*) INTO v_blog_posts_count FROM blog_posts;
    SELECT COUNT(*) INTO v_enquiries_count FROM enquiries;

    RAISE NOTICE 'Total page_settings: %', v_page_settings_count;
    RAISE NOTICE 'Total page_images: %', v_page_images_count;
    RAISE NOTICE 'Total blog_posts: %', v_blog_posts_count;
    RAISE NOTICE 'Total enquiries: %', v_enquiries_count;

    -- Verify all have app_uuid
    RAISE NOTICE '=== Verifying app_uuid columns ===';

    IF EXISTS (SELECT 1 FROM page_settings WHERE app_uuid IS NULL) THEN
        RAISE WARNING '⚠ Some page_settings records have NULL app_uuid';
    ELSE
        RAISE NOTICE '✓ All page_settings have app_uuid';
    END IF;

    IF EXISTS (SELECT 1 FROM page_images WHERE app_uuid IS NULL) THEN
        RAISE WARNING '⚠ Some page_images records have NULL app_uuid';
    ELSE
        RAISE NOTICE '✓ All page_images have app_uuid';
    END IF;

    IF EXISTS (SELECT 1 FROM blog_posts WHERE app_uuid IS NULL) THEN
        RAISE WARNING '⚠ Some blog_posts records have NULL app_uuid';
    ELSE
        RAISE NOTICE '✓ All blog_posts have app_uuid';
    END IF;

    IF EXISTS (SELECT 1 FROM enquiries WHERE app_uuid IS NULL) THEN
        RAISE WARNING '⚠ Some enquiries records have NULL app_uuid';
    ELSE
        RAISE NOTICE '✓ All enquiries have app_uuid';
    END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 20251118220000_add_app_uuid_to_content_tables.sql COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Changes applied:';
    RAISE NOTICE '1. Added app_uuid to page_settings, page_images, blog_posts, enquiries';
    RAISE NOTICE '2. Updated RLS policies for multi-tenant access';
    RAISE NOTICE '3. Created indexes for performance';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Update application code to pass app_uuid when creating records';
    RAISE NOTICE '2. Test landing page to verify data loads correctly';
    RAISE NOTICE '========================================';
END $$;
