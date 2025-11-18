-- ============================================================================
-- SPRINT 10.1d.1: DATABASE SCHEMA IMPLEMENTATION
-- File: Migration Script - Applications Registry & Multi-Tenancy
-- Purpose: Create applications table, add app_uuid to 13 app-specific tables
-- Status: Ready for Supabase execution
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE APPLICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_code TEXT UNIQUE NOT NULL,
    app_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_app_code ON applications(app_code);

-- Seed with VC Studio
INSERT INTO applications (app_code, app_name)
VALUES ('VC_STUDIO', 'VC Studio')
ON CONFLICT (app_code) DO NOTHING;

-- Get the UUID (will be used for all backfills below)
-- SELECT id FROM applications WHERE app_code = 'VC_STUDIO';

-- ============================================================================
-- PART 2: ADD app_uuid TO 13 APP-SPECIFIC TABLES
-- ============================================================================

-- ============================================================================
-- TABLE 1: blog_posts
-- ============================================================================

ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS app_uuid UUID;

CREATE INDEX IF NOT EXISTS idx_blog_posts_app_uuid ON blog_posts(app_uuid);

UPDATE blog_posts 
SET app_uuid = (SELECT id FROM applications WHERE app_code = 'VC_STUDIO')
WHERE app_uuid IS NULL;

ALTER TABLE blog_posts
ADD CONSTRAINT IF NOT EXISTS fk_blog_posts_app_uuid
FOREIGN KEY (app_uuid) REFERENCES applications(id) ON DELETE CASCADE;

ALTER TABLE blog_posts
ALTER COLUMN app_uuid SET NOT NULL;

-- ============================================================================
-- TABLE 2: enquiries
-- ============================================================================

ALTER TABLE enquiries 
ADD COLUMN IF NOT EXISTS app_uuid UUID;

CREATE INDEX IF NOT EXISTS idx_enquiries_app_uuid ON enquiries(app_uuid);

UPDATE enquiries 
SET app_uuid = (SELECT id FROM applications WHERE app_code = 'VC_STUDIO')
WHERE app_uuid IS NULL;

ALTER TABLE enquiries
ADD CONSTRAINT IF NOT EXISTS fk_enquiries_app_uuid
FOREIGN KEY (app_uuid) REFERENCES applications(id) ON DELETE CASCADE;

ALTER TABLE enquiries
ALTER COLUMN app_uuid SET NOT NULL;

-- ============================================================================
-- TABLE 3: campaigns
-- ============================================================================

ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS app_uuid UUID;

CREATE INDEX IF NOT EXISTS idx_campaigns_app_uuid ON campaigns(app_uuid);

UPDATE campaigns 
SET app_uuid = (SELECT id FROM applications WHERE app_code = 'VC_STUDIO')
WHERE app_uuid IS NULL;

ALTER TABLE campaigns
ADD CONSTRAINT IF NOT EXISTS fk_campaigns_app_uuid
FOREIGN KEY (app_uuid) REFERENCES applications(id) ON DELETE CASCADE;

ALTER TABLE campaigns
ALTER COLUMN app_uuid SET NOT NULL;

-- ============================================================================
-- TABLE 4: notifications
-- ============================================================================

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS app_uuid UUID;

CREATE INDEX IF NOT EXISTS idx_notifications_app_uuid ON notifications(app_uuid);

UPDATE notifications 
SET app_uuid = (SELECT id FROM applications WHERE app_code = 'VC_STUDIO')
WHERE app_uuid IS NULL;

ALTER TABLE notifications
ADD CONSTRAINT IF NOT EXISTS fk_notifications_app_uuid
FOREIGN KEY (app_uuid) REFERENCES applications(id) ON DELETE CASCADE;

ALTER TABLE notifications
ALTER COLUMN app_uuid SET NOT NULL;

-- ============================================================================
-- TABLE 5: interactions
-- ============================================================================

ALTER TABLE interactions 
ADD COLUMN IF NOT EXISTS app_uuid UUID;

CREATE INDEX IF NOT EXISTS idx_interactions_app_uuid ON interactions(app_uuid);

UPDATE interactions 
SET app_uuid = (SELECT id FROM applications WHERE app_code = 'VC_STUDIO')
WHERE app_uuid IS NULL;

ALTER TABLE interactions
ADD CONSTRAINT IF NOT EXISTS fk_interactions_app_uuid
FOREIGN KEY (app_uuid) REFERENCES applications(id) ON DELETE CASCADE;

ALTER TABLE interactions
ALTER COLUMN app_uuid SET NOT NULL;

-- ============================================================================
-- TABLE 6: workflow_instances
-- ============================================================================

ALTER TABLE workflow_instances 
ADD COLUMN IF NOT EXISTS app_uuid UUID;

CREATE INDEX IF NOT EXISTS idx_workflow_instances_app_uuid ON workflow_instances(app_uuid);

UPDATE workflow_instances 
SET app_uuid = (SELECT id FROM applications WHERE app_code = 'VC_STUDIO')
WHERE app_uuid IS NULL;

ALTER TABLE workflow_instances
ADD CONSTRAINT IF NOT EXISTS fk_workflow_instances_app_uuid
FOREIGN KEY (app_uuid) REFERENCES applications(id) ON DELETE CASCADE;

ALTER TABLE workflow_instances
ALTER COLUMN app_uuid SET NOT NULL;

-- ============================================================================
-- TABLE 7: workflow_templates
-- ============================================================================

ALTER TABLE workflow_templates 
ADD COLUMN IF NOT EXISTS app_uuid UUID;

CREATE INDEX IF NOT EXISTS idx_workflow_templates_app_uuid ON workflow_templates(app_uuid);

UPDATE workflow_templates 
SET app_uuid = (SELECT id FROM applications WHERE app_code = 'VC_STUDIO')
WHERE app_uuid IS NULL;

ALTER TABLE workflow_templates
ADD CONSTRAINT IF NOT EXISTS fk_workflow_templates_app_uuid
FOREIGN KEY (app_uuid) REFERENCES applications(id) ON DELETE CASCADE;

ALTER TABLE workflow_templates
ALTER COLUMN app_uuid SET NOT NULL;

-- ============================================================================
-- TABLE 8: workflow_steps
-- ============================================================================

ALTER TABLE workflow_steps 
ADD COLUMN IF NOT EXISTS app_uuid UUID;

CREATE INDEX IF NOT EXISTS idx_workflow_steps_app_uuid ON workflow_steps(app_uuid);

UPDATE workflow_steps 
SET app_uuid = (SELECT id FROM applications WHERE app_code = 'VC_STUDIO')
WHERE app_uuid IS NULL;

ALTER TABLE workflow_steps
ADD CONSTRAINT IF NOT EXISTS fk_workflow_steps_app_uuid
FOREIGN KEY (app_uuid) REFERENCES applications(id) ON DELETE CASCADE;

ALTER TABLE workflow_steps
ALTER COLUMN app_uuid SET NOT NULL;

-- ============================================================================
-- TABLE 9: instance_tasks
-- ============================================================================

ALTER TABLE instance_tasks 
ADD COLUMN IF NOT EXISTS app_uuid UUID;

CREATE INDEX IF NOT EXISTS idx_instance_tasks_app_uuid ON instance_tasks(app_uuid);

UPDATE instance_tasks 
SET app_uuid = (SELECT id FROM applications WHERE app_code = 'VC_STUDIO')
WHERE app_uuid IS NULL;

ALTER TABLE instance_tasks
ADD CONSTRAINT IF NOT EXISTS fk_instance_tasks_app_uuid
FOREIGN KEY (app_uuid) REFERENCES applications(id) ON DELETE CASCADE;

ALTER TABLE instance_tasks
ALTER COLUMN app_uuid SET NOT NULL;

-- ============================================================================
-- TABLE 10: instance_context
-- ============================================================================

ALTER TABLE instance_context 
ADD COLUMN IF NOT EXISTS app_uuid UUID;

CREATE INDEX IF NOT EXISTS idx_instance_context_app_uuid ON instance_context(app_uuid);

UPDATE instance_context 
SET app_uuid = (SELECT id FROM applications WHERE app_code = 'VC_STUDIO')
WHERE app_uuid IS NULL;

ALTER TABLE instance_context
ADD CONSTRAINT IF NOT EXISTS fk_instance_context_app_uuid
FOREIGN KEY (app_uuid) REFERENCES applications(id) ON DELETE CASCADE;

ALTER TABLE instance_context
ALTER COLUMN app_uuid SET NOT NULL;

-- ============================================================================
-- TABLE 11: nodes
-- ============================================================================

ALTER TABLE nodes 
ADD COLUMN IF NOT EXISTS app_uuid UUID;

CREATE INDEX IF NOT EXISTS idx_nodes_app_uuid ON nodes(app_uuid);

UPDATE nodes 
SET app_uuid = (SELECT id FROM applications WHERE app_code = 'VC_STUDIO')
WHERE app_uuid IS NULL;

ALTER TABLE nodes
ADD CONSTRAINT IF NOT EXISTS fk_nodes_app_uuid
FOREIGN KEY (app_uuid) REFERENCES applications(id) ON DELETE CASCADE;

ALTER TABLE nodes
ALTER COLUMN app_uuid SET NOT NULL;

-- ============================================================================
-- TABLE 12: node_shares
-- ============================================================================

ALTER TABLE node_shares 
ADD COLUMN IF NOT EXISTS app_uuid UUID;

CREATE INDEX IF NOT EXISTS idx_node_shares_app_uuid ON node_shares(app_uuid);

UPDATE node_shares 
SET app_uuid = (SELECT id FROM applications WHERE app_code = 'VC_STUDIO')
WHERE app_uuid IS NULL;

ALTER TABLE node_shares
ADD CONSTRAINT IF NOT EXISTS fk_node_shares_app_uuid
FOREIGN KEY (app_uuid) REFERENCES applications(id) ON DELETE CASCADE;

ALTER TABLE node_shares
ALTER COLUMN app_uuid SET NOT NULL;

-- ============================================================================
-- TABLE 13: vc_models (if exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vc_models') THEN
        ALTER TABLE vc_models 
        ADD COLUMN IF NOT EXISTS app_uuid UUID;

        CREATE INDEX IF NOT EXISTS idx_vc_models_app_uuid ON vc_models(app_uuid);

        UPDATE vc_models 
        SET app_uuid = (SELECT id FROM applications WHERE app_code = 'VC_STUDIO')
        WHERE app_uuid IS NULL;

        ALTER TABLE vc_models
        ADD CONSTRAINT IF NOT EXISTS fk_vc_models_app_uuid
        FOREIGN KEY (app_uuid) REFERENCES applications(id) ON DELETE CASCADE;

        ALTER TABLE vc_models
        ALTER COLUMN app_uuid SET NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- PART 3: ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL APP-SPECIFIC TABLES
-- ============================================================================

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE instance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE instance_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_shares ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES (BASIC - Can be refined later)
-- ============================================================================

-- Blog Posts: Allow authenticated users to read/write their app's blog posts
DROP POLICY IF EXISTS "blog_posts_app_isolation" ON blog_posts;
CREATE POLICY "blog_posts_app_isolation" ON blog_posts
    FOR ALL
    USING (
        -- User's app must match the record's app
        app_uuid = (SELECT id FROM applications WHERE app_code = current_setting('app.current_app_code', true))
    );

-- Enquiries: App isolation
DROP POLICY IF EXISTS "enquiries_app_isolation" ON enquiries;
CREATE POLICY "enquiries_app_isolation" ON enquiries
    FOR ALL
    USING (
        app_uuid = (SELECT id FROM applications WHERE app_code = current_setting('app.current_app_code', true))
    );

-- Campaigns: App isolation
DROP POLICY IF EXISTS "campaigns_app_isolation" ON campaigns;
CREATE POLICY "campaigns_app_isolation" ON campaigns
    FOR ALL
    USING (
        app_uuid = (SELECT id FROM applications WHERE app_code = current_setting('app.current_app_code', true))
    );

-- Notifications: App isolation
DROP POLICY IF EXISTS "notifications_app_isolation" ON notifications;
CREATE POLICY "notifications_app_isolation" ON notifications
    FOR ALL
    USING (
        app_uuid = (SELECT id FROM applications WHERE app_code = current_setting('app.current_app_code', true))
    );

-- Interactions: App isolation
DROP POLICY IF EXISTS "interactions_app_isolation" ON interactions;
CREATE POLICY "interactions_app_isolation" ON interactions
    FOR ALL
    USING (
        app_uuid = (SELECT id FROM applications WHERE app_code = current_setting('app.current_app_code', true))
    );

-- Workflow Instances: App isolation
DROP POLICY IF EXISTS "workflow_instances_app_isolation" ON workflow_instances;
CREATE POLICY "workflow_instances_app_isolation" ON workflow_instances
    FOR ALL
    USING (
        app_uuid = (SELECT id FROM applications WHERE app_code = current_setting('app.current_app_code', true))
    );

-- Workflow Templates: App isolation
DROP POLICY IF EXISTS "workflow_templates_app_isolation" ON workflow_templates;
CREATE POLICY "workflow_templates_app_isolation" ON workflow_templates
    FOR ALL
    USING (
        app_uuid = (SELECT id FROM applications WHERE app_code = current_setting('app.current_app_code', true))
    );

-- Workflow Steps: App isolation
DROP POLICY IF EXISTS "workflow_steps_app_isolation" ON workflow_steps;
CREATE POLICY "workflow_steps_app_isolation" ON workflow_steps
    FOR ALL
    USING (
        app_uuid = (SELECT id FROM applications WHERE app_code = current_setting('app.current_app_code', true))
    );

-- Instance Tasks: App isolation
DROP POLICY IF EXISTS "instance_tasks_app_isolation" ON instance_tasks;
CREATE POLICY "instance_tasks_app_isolation" ON instance_tasks
    FOR ALL
    USING (
        app_uuid = (SELECT id FROM applications WHERE app_code = current_setting('app.current_app_code', true))
    );

-- Instance Context: App isolation
DROP POLICY IF EXISTS "instance_context_app_isolation" ON instance_context;
CREATE POLICY "instance_context_app_isolation" ON instance_context
    FOR ALL
    USING (
        app_uuid = (SELECT id FROM applications WHERE app_code = current_setting('app.current_app_code', true))
    );

-- Nodes: App isolation
DROP POLICY IF EXISTS "nodes_app_isolation" ON nodes;
CREATE POLICY "nodes_app_isolation" ON nodes
    FOR ALL
    USING (
        app_uuid = (SELECT id FROM applications WHERE app_code = current_setting('app.current_app_code', true))
    );

-- Node Shares: App isolation
DROP POLICY IF EXISTS "node_shares_app_isolation" ON node_shares;
CREATE POLICY "node_shares_app_isolation" ON node_shares
    FOR ALL
    USING (
        app_uuid = (SELECT id FROM applications WHERE app_code = current_setting('app.current_app_code', true))
    );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify applications table created
SELECT COUNT(*) as applications_count FROM applications;

-- Verify all 13 tables have app_uuid column
SELECT 
    table_name,
    CASE WHEN column_name = 'app_uuid' THEN 'YES' ELSE 'NO' END as has_app_uuid
FROM information_schema.columns
WHERE table_name IN (
    'blog_posts', 'enquiries', 'campaigns', 'notifications', 'interactions',
    'workflow_instances', 'workflow_templates', 'workflow_steps', 'instance_tasks',
    'instance_context', 'nodes', 'node_shares', 'vc_models'
)
AND column_name = 'app_uuid'
ORDER BY table_name;

-- Verify all app_uuid columns are NOT NULL
SELECT 
    table_name,
    is_nullable
FROM information_schema.columns
WHERE column_name = 'app_uuid'
AND table_schema = 'public'
ORDER BY table_name;

-- Verify foreign keys
SELECT 
    constraint_name,
    table_name,
    column_name
FROM information_schema.key_column_usage
WHERE constraint_name LIKE 'fk_%app_uuid%'
ORDER BY table_name;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SPRINT 10.1d.1: DATABASE SCHEMA IMPLEMENTATION COMPLETE';
    RAISE NOTICE '✅ Applications table created with VC_STUDIO seeded';
    RAISE NOTICE '✅ 13 app-specific tables have app_uuid column';
    RAISE NOTICE '✅ All app_uuid columns NOT NULL';
    RAISE NOTICE '✅ Foreign keys to applications(id) created';
    RAISE NOTICE '✅ RLS policies enabled for app isolation';
    RAISE NOTICE '✅ Ready for code updates and query filtering';
    RAISE NOTICE '';
END $$;
