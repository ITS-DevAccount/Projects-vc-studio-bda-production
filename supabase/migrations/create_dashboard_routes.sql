-- Create dashboard_routes table to map stakeholder types and roles to dashboard paths

-- =============================================================================
-- DASHBOARD_ROUTES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS dashboard_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stakeholder_type_id UUID NOT NULL REFERENCES stakeholder_types(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    route_path TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE (stakeholder_type_id, role_id)
);

-- Ensure only one default (role_id IS NULL) route per stakeholder type
CREATE UNIQUE INDEX IF NOT EXISTS uniq_dashboard_routes_type_default
    ON dashboard_routes(stakeholder_type_id)
    WHERE role_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_dashboard_routes_role_id ON dashboard_routes(role_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_routes_priority ON dashboard_routes(priority);
CREATE INDEX IF NOT EXISTS idx_dashboard_routes_active ON dashboard_routes(is_active);

-- =============================================================================
-- DEFAULT DATA SEEDING (stakeholder types and routes)
-- =============================================================================

ALTER TABLE stakeholder_types
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE stakeholder_types
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Ensure baseline stakeholder types exist
INSERT INTO stakeholder_types (code, label, description, is_active)
VALUES
    ('admin', 'Administrator', 'Administrative users with elevated access', true),
    ('individual', 'Individual', 'Individual stakeholders', true),
    ('organisation', 'Organisation', 'Organisation stakeholders', true)
ON CONFLICT (code) DO UPDATE
SET
    label = EXCLUDED.label,
    description = COALESCE(EXCLUDED.description, stakeholder_types.description),
    is_active = true;

-- Upsert default dashboard routes for stakeholder types
INSERT INTO dashboard_routes (stakeholder_type_id, route_path, description, priority, is_active)
SELECT st.id, '/dashboard', 'Administrator dashboard', 0, true
FROM stakeholder_types st
WHERE st.code = 'admin'
ON CONFLICT (stakeholder_type_id, role_id)
DO UPDATE SET route_path = EXCLUDED.route_path,
              description = EXCLUDED.description,
              is_active = EXCLUDED.is_active,
              priority = EXCLUDED.priority;

INSERT INTO dashboard_routes (stakeholder_type_id, route_path, description, priority, is_active)
SELECT st.id, '/dashboard/stakeholder', 'Default individual stakeholder dashboard', 10, true
FROM stakeholder_types st
WHERE st.code = 'individual'
ON CONFLICT (stakeholder_type_id, role_id)
DO UPDATE SET route_path = EXCLUDED.route_path,
              description = EXCLUDED.description,
              is_active = EXCLUDED.is_active,
              priority = EXCLUDED.priority;

INSERT INTO dashboard_routes (stakeholder_type_id, route_path, description, priority, is_active)
SELECT st.id, '/dashboard/stakeholder', 'Default organisation stakeholder dashboard', 10, true
FROM stakeholder_types st
WHERE st.code = 'organisation'
ON CONFLICT (stakeholder_type_id, role_id)
DO UPDATE SET route_path = EXCLUDED.route_path,
              description = EXCLUDED.description,
              is_active = EXCLUDED.is_active,
              priority = EXCLUDED.priority;

-- Example role-specific route for organisation suppliers (can be adjusted via UI later)
INSERT INTO dashboard_routes (stakeholder_type_id, role_id, route_path, description, priority, is_active)
SELECT st.id, r.id, '/dashboard/stakeholder/organisation-supplier', 'Organisation supplier dashboard', 5, true
FROM stakeholder_types st
JOIN roles r ON r.code = 'producer'
WHERE st.code = 'organisation'
ON CONFLICT (stakeholder_type_id, role_id)
DO UPDATE SET route_path = EXCLUDED.route_path,
              description = EXCLUDED.description,
              is_active = EXCLUDED.is_active,
              priority = EXCLUDED.priority;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE dashboard_routes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view dashboard routes
CREATE POLICY "Authenticated users can view dashboard routes" ON dashboard_routes
    FOR SELECT TO authenticated
    USING (is_active = true);

-- Allow elevated admin roles to manage dashboard routes via backend
CREATE POLICY "Admins can manage dashboard routes" ON dashboard_routes
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM users u
            WHERE u.auth_user_id = auth.uid()
            AND u.role = ANY (ARRAY['super_admin', 'domain_admin', 'manager'])
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM users u
            WHERE u.auth_user_id = auth.uid()
            AND u.role = ANY (ARRAY['super_admin', 'domain_admin', 'manager'])
        )
    );

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

SELECT 'dashboard_routes count' AS label, COUNT(*) AS count FROM dashboard_routes;

SELECT 
    st.code AS stakeholder_type,
    r.code AS role_code,
    dr.route_path,
    dr.priority,
    dr.is_active
FROM dashboard_routes dr
LEFT JOIN stakeholder_types st ON st.id = dr.stakeholder_type_id
LEFT JOIN roles r ON r.id = dr.role_id
ORDER BY st.code, dr.priority, r.code;


