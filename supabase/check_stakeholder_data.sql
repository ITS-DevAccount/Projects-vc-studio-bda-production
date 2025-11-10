-- ============================================================================
-- Diagnostic Queries for Stakeholder: acme subsid 9
-- ============================================================================

-- Query 1: Check stakeholder roles
SELECT
    sr.id,
    sr.stakeholder_id,
    sr.role_id,
    sr.role_type,
    r.name as role_name,
    r.code as role_code,
    sr.app_uuid
FROM stakeholder_roles sr
LEFT JOIN roles r ON sr.role_id = r.id
WHERE sr.stakeholder_id = '665d0160-fabe-4dc2-88bd-72ca203ac2ee';

-- Expected: Should see producer role assigned

-- ============================================================================

-- Query 2: Check relationships
SELECT
    rel.id,
    rel.from_stakeholder_id,
    rel.to_stakeholder_id,
    rel.relationship_type_id,
    rt.name as relationship_type_name,
    rel.strength,
    rel.status
FROM relationships rel
LEFT JOIN relationship_types rt ON rel.relationship_type_id = rt.id
WHERE rel.from_stakeholder_id = '665d0160-fabe-4dc2-88bd-72ca203ac2ee'
   OR rel.to_stakeholder_id = '665d0160-fabe-4dc2-88bd-72ca203ac2ee';

-- Expected: May be empty if no relationships were specified

-- ============================================================================

-- Query 3: Check nodes (workspace folder)
SELECT
    id,
    name,
    type,
    parent_id,
    owner_id,
    app_uuid,
    created_at
FROM nodes
WHERE owner_id = '665d0160-fabe-4dc2-88bd-72ca203ac2ee';

-- Expected: Should see "My Workspace" folder

-- ============================================================================

-- Query 4: Check notifications
SELECT
    id,
    stakeholder_id,
    notification_type,
    title,
    message,
    is_read,
    created_at
FROM notifications
WHERE stakeholder_id = '665d0160-fabe-4dc2-88bd-72ca203ac2ee';

-- Expected: Should see welcome notification

-- ============================================================================

-- Query 5: Check workflow instance
SELECT
    wi.id,
    wi.instance_code,
    wi.stakeholder_id,
    wi.workflow_type,
    wi.status,
    wi.maturity_gate,
    wi.created_at
FROM workflow_instances wi
WHERE wi.stakeholder_id = '665d0160-fabe-4dc2-88bd-72ca203ac2ee';

-- Expected: Should see onboarding workflow

-- ============================================================================

-- Query 6: Check activities
SELECT
    a.id,
    a.workflow_instance_id,
    a.activity_code,
    a.activity_name,
    a.owner,
    a.status,
    a.due_date
FROM activities a
WHERE a.workflow_instance_id IN (
    SELECT id FROM workflow_instances
    WHERE stakeholder_id = '665d0160-fabe-4dc2-88bd-72ca203ac2ee'
);

-- Expected: Should see "Accept Terms & Conditions" activity

-- ============================================================================
