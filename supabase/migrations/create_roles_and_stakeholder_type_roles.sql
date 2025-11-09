-- Create roles table and link roles to stakeholder types
-- This allows us to define which roles are available for which stakeholder types

-- =============================================================================
-- ROLES TABLE - Define available roles
-- =============================================================================

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert BDA roles
INSERT INTO roles (code, label, description, is_active) VALUES
('individual', 'Individual', 'Individual stakeholder role', true),
('investor', 'Investor', 'Investor stakeholder role', true),
('producer', 'Producer/Service Provider', 'Producer or service provider role', true),
('administrator', 'Administrator', 'Administrator role', true)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- STAKEHOLDER_TYPE_ROLES TABLE - Link roles to stakeholder types
-- =============================================================================

CREATE TABLE IF NOT EXISTS stakeholder_type_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stakeholder_type_id UUID NOT NULL REFERENCES stakeholder_types(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(stakeholder_type_id, role_id)
);

-- Default role assignments (you can customize these)
-- Individual: Can be individual, investor, producer
INSERT INTO stakeholder_type_roles (stakeholder_type_id, role_id, is_default)
SELECT st.id, r.id, r.code = 'individual'
FROM stakeholder_types st
CROSS JOIN roles r
WHERE st.code = 'individual' AND r.code IN ('individual', 'investor', 'producer')
ON CONFLICT DO NOTHING;

-- Company: Can be investor, producer, administrator
INSERT INTO stakeholder_type_roles (stakeholder_type_id, role_id, is_default)
SELECT st.id, r.id, r.code = 'producer'
FROM stakeholder_types st
CROSS JOIN roles r
WHERE st.code = 'company' AND r.code IN ('investor', 'producer', 'administrator')
ON CONFLICT DO NOTHING;

-- Cooperative: Can be investor, producer, administrator
INSERT INTO stakeholder_type_roles (stakeholder_type_id, role_id, is_default)
SELECT st.id, r.id, r.code = 'producer'
FROM stakeholder_types st
CROSS JOIN roles r
WHERE st.code = 'cooperative' AND r.code IN ('investor', 'producer', 'administrator')
ON CONFLICT DO NOTHING;

-- NGO: Can be investor, producer, administrator
INSERT INTO stakeholder_type_roles (stakeholder_type_id, role_id, is_default)
SELECT st.id, r.id, r.code = 'producer'
FROM stakeholder_types st
CROSS JOIN roles r
WHERE st.code = 'ngo' AND r.code IN ('investor', 'producer', 'administrator')
ON CONFLICT DO NOTHING;

-- Government: Can be administrator, producer
INSERT INTO stakeholder_type_roles (stakeholder_type_id, role_id, is_default)
SELECT st.id, r.id, r.code = 'administrator'
FROM stakeholder_types st
CROSS JOIN roles r
WHERE st.code = 'government' AND r.code IN ('administrator', 'producer')
ON CONFLICT DO NOTHING;

-- Association: Can be investor, producer, administrator
INSERT INTO stakeholder_type_roles (stakeholder_type_id, role_id, is_default)
SELECT st.id, r.id, r.code = 'producer'
FROM stakeholder_types st
CROSS JOIN roles r
WHERE st.code = 'association' AND r.code IN ('investor', 'producer', 'administrator')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- UPDATE STAKEHOLDER_ROLES TABLE - Change role_type to reference roles table
-- =============================================================================

-- First, we need to update the stakeholder_roles table to use role_id instead of role_type
-- But we'll keep it backward compatible for now by using both

-- Add role_id column if it doesn't exist
ALTER TABLE stakeholder_roles 
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE CASCADE;

-- Migrate existing role_type values to role_id
UPDATE stakeholder_roles sr
SET role_id = r.id
FROM roles r
WHERE sr.role_type = r.code
AND sr.role_id IS NULL;

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(code);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active);
CREATE INDEX IF NOT EXISTS idx_stakeholder_type_roles_stakeholder_type_id ON stakeholder_type_roles(stakeholder_type_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_type_roles_role_id ON stakeholder_type_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_roles_role_id ON stakeholder_roles(role_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholder_type_roles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view active roles
CREATE POLICY "Authenticated users can view roles" ON roles
    FOR SELECT TO authenticated
    USING (is_active = true);

-- Allow authenticated users to manage stakeholder type roles
CREATE POLICY "Authenticated users can manage stakeholder type roles" ON stakeholder_type_roles
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT 
    'roles' as table_name,
    COUNT(*) as count
FROM roles
UNION ALL
SELECT 
    'stakeholder_type_roles' as table_name,
    COUNT(*) as count
FROM stakeholder_type_roles;

SELECT 
    st.code as stakeholder_type,
    r.code as role_code,
    r.label as role_label,
    str.is_default
FROM stakeholder_type_roles str
JOIN stakeholder_types st ON st.id = str.stakeholder_type_id
JOIN roles r ON r.id = str.role_id
ORDER BY st.code, r.code;






