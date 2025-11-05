-- Create stakeholder_roles table for mapping stakeholders to role types
-- Based on Phase 1b specification: stakeholder_roles table maps stakeholder_id to role_type

-- =============================================================================
-- STAKEHOLDER_ROLES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS stakeholder_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
    role_type TEXT NOT NULL CHECK (role_type IN ('individual', 'investor', 'producer', 'administrator')),
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one role type per stakeholder (no duplicates)
    UNIQUE(stakeholder_id, role_type)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_stakeholder_roles_stakeholder_id ON stakeholder_roles(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_roles_role_type ON stakeholder_roles(role_type);
CREATE INDEX IF NOT EXISTS idx_stakeholder_roles_assigned_by ON stakeholder_roles(assigned_by);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE stakeholder_roles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage stakeholder roles
CREATE POLICY "Authenticated users can manage stakeholder roles" ON stakeholder_roles
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Stakeholders can view their own roles
CREATE POLICY "Stakeholders can view own roles" ON stakeholder_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM stakeholders s
            WHERE s.id = stakeholder_roles.stakeholder_id
            AND s.auth_user_id = auth.uid()
        )
    );

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'stakeholder_roles';

SELECT 
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'stakeholder_roles';

