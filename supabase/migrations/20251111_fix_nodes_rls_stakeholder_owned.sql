-- ============================================================================
-- Fix Nodes RLS - Stakeholder-Owned Documents
-- File: 20251111_fix_nodes_rls_stakeholder_owned.sql
-- Purpose: Remove app_uuid check - nodes are stakeholder-owned across apps
-- ============================================================================

-- Nodes are owned by stakeholders and can be used across multiple apps
-- No app_uuid scoping needed - stakeholder ownership is the primary security boundary

DROP POLICY IF EXISTS nodes_owner_insert ON nodes;

CREATE POLICY "nodes_owner_insert" ON nodes
    FOR INSERT WITH CHECK (
        owner_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Nodes RLS Policy Fixed';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Removed app_uuid check from INSERT policy';
    RAISE NOTICE '✓ Nodes are stakeholder-owned (owner_id)';
    RAISE NOTICE '✓ Can be used across multiple apps';
    RAISE NOTICE '========================================';
END $$;
