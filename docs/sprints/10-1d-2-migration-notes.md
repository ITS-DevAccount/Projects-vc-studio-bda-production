# Sprint 10.1d.2: Registry Consolidation - Migration Notes
**Date:** 2025-11-18
**Sprint:** Registry Consolidation & Management
**Migration File:** `20251118215158_10_1d_2_registry_consolidation.sql`

---

## Migration Overview

This migration consolidates registry structures by:
1. Adding `registry_type` field to components_registry
2. Removing duplicate `function_registry` from core_config JSON
3. Adding audit fields for soft deletes
4. Creating RLS policies for admin management
5. Creating helper function for component usage checking

---

## Pre-Migration Checklist

Before running this migration, ensure:

- ✅ Sprint 10.1d.1 (Multi-Tenancy) is complete
- ✅ `applications` table exists with VC_STUDIO seeded
- ✅ `components_registry` table exists (from Phase 1c)
- ✅ `stakeholders.core_config` JSONB column exists
- ✅ Database backup created
- ✅ All stakeholders have valid core_config JSON

---

## Migration Steps

### Step 1: Add registry_type Column

**Purpose:** Future extensibility (UI_COMPONENT, AI_FUNCTION, WORKFLOW_TASK, ADMIN_TOOL)

```sql
ALTER TABLE components_registry
ADD COLUMN registry_type TEXT DEFAULT 'UI_COMPONENT'
CHECK (registry_type IN ('UI_COMPONENT', 'AI_FUNCTION', 'WORKFLOW_TASK', 'ADMIN_TOOL'));

CREATE INDEX idx_components_registry_type ON components_registry(registry_type);
```

**Result:**
- All existing components default to 'UI_COMPONENT'
- Index created for efficient filtering

### Step 2: Migrate core_config JSON

**Purpose:** Remove duplicate `function_registry` data

**Before:**
```json
{
  "__meta": { "version": "1.0" },
  "function_registry": [ ... ],  ← REMOVED
  "role_configurations": { ... }
}
```

**After:**
```json
{
  "__meta": { "version": "2.0" },  ← VERSION BUMPED
  "role_configurations": { ... }
}
```

**Migration Logic:**
```sql
-- Create backup table
CREATE TABLE stakeholders_core_config_backup_YYYYMMDD_HHMMSS AS
SELECT id, name, email, core_config as old_core_config, NOW() as backup_timestamp
FROM stakeholders
WHERE core_config IS NOT NULL AND core_config::text LIKE '%function_registry%';

-- Remove function_registry from core_config
UPDATE stakeholders
SET core_config = (
    SELECT jsonb_set(
        core_config - 'function_registry',
        '{__meta,version}',
        '"2.0"'
    )
),
updated_at = NOW()
WHERE core_config IS NOT NULL AND core_config::text LIKE '%function_registry%';
```

**Backup Table:**
- Name: `stakeholders_core_config_backup_YYYYMMDD_HHMMSS`
- Contains: id, name, email, old_core_config, backup_timestamp
- Purpose: Rollback capability

### Step 3: Add Audit Fields

**Purpose:** Support soft deletes and audit trail

```sql
ALTER TABLE components_registry
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE components_registry
ADD COLUMN last_modified_by UUID REFERENCES users(id);
```

**Usage:**
- `deleted_at`: Set when component is soft deleted (NULL = active)
- `last_modified_by`: Tracks who made last change

### Step 4: Create RLS Policies

**Purpose:** Admin-only CRUD access to registry

**Policies Created:**
1. `registry_admin_insert` - Admins can create components for their app
2. `registry_admin_update` - Admins can update components in their app
3. `registry_admin_delete` - Admins can delete components in their app

**Policy Logic:**
```sql
CREATE POLICY "registry_admin_insert" ON components_registry
FOR INSERT WITH CHECK (
    app_uuid IN (SELECT s.app_uuid FROM stakeholders s WHERE s.auth_user_id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM stakeholder_roles sr
        JOIN stakeholders s ON s.id = sr.stakeholder_id
        WHERE s.auth_user_id = auth.uid() AND sr.role_type = 'admin'
    )
);
```

### Step 5: Create Helper Function

**Purpose:** Check component usage before deletion

```sql
CREATE OR REPLACE FUNCTION check_component_usage(p_component_code TEXT)
RETURNS TABLE(
    stakeholder_id UUID,
    stakeholder_name TEXT,
    stakeholder_email TEXT,
    role_config_key TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.name, s.email, role_key::TEXT
    FROM stakeholders s,
    jsonb_each(s.core_config->'role_configurations') as role_configs(role_key, role_config)
    WHERE role_config->'menu_items' @> jsonb_build_array(
        jsonb_build_object('component_code', p_component_code)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage:**
```sql
SELECT * FROM check_component_usage('file_explorer');
```

**Returns:**
- stakeholder_id, name, email, role_config_key for stakeholders using the component
- Empty result = safe to delete

---

## Verification Queries

### 1. Check registry_type Column

```sql
SELECT
    registry_type,
    COUNT(*) as count
FROM components_registry
WHERE deleted_at IS NULL
GROUP BY registry_type;
```

**Expected Result:**
```
registry_type  | count
---------------|------
UI_COMPONENT   | 5
```

### 2. Check core_config Migration

```sql
-- Check version updated
SELECT
    COUNT(*) as migrated_count
FROM stakeholders
WHERE core_config->>'__meta'->>'version' = '2.0';

-- Check function_registry removed
SELECT
    COUNT(*) as remaining_count
FROM stakeholders
WHERE core_config::text LIKE '%function_registry%';
```

**Expected Result:**
- migrated_count > 0 (stakeholders migrated)
- remaining_count = 0 (no function_registry left)

### 3. Check Backup Table

```sql
SELECT
    table_name
FROM information_schema.tables
WHERE table_name LIKE 'stakeholders_core_config_backup_%'
ORDER BY table_name DESC
LIMIT 1;
```

**Expected Result:**
- Backup table exists with timestamp

### 4. Check RLS Policies

```sql
SELECT
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'components_registry'
AND policyname LIKE 'registry_admin_%';
```

**Expected Result:**
```
policyname              | cmd
------------------------|--------
registry_admin_insert   | INSERT
registry_admin_update   | UPDATE
registry_admin_delete   | DELETE
```

### 5. Check Helper Function

```sql
SELECT
    proname,
    pronargs
FROM pg_proc
WHERE proname = 'check_component_usage';
```

**Expected Result:**
- Function exists with 1 argument

---

## Rollback Procedure

If migration needs to be reversed:

### 1. Restore core_config from Backup

```sql
-- Find latest backup table
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE 'stakeholders_core_config_backup_%'
ORDER BY table_name DESC
LIMIT 1;

-- Restore core_config
UPDATE stakeholders s
SET core_config = b.old_core_config
FROM stakeholders_core_config_backup_YYYYMMDD_HHMMSS b
WHERE s.id = b.id;
```

### 2. Remove New Columns (Optional)

```sql
ALTER TABLE components_registry DROP COLUMN IF EXISTS registry_type;
ALTER TABLE components_registry DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE components_registry DROP COLUMN IF EXISTS last_modified_by;
```

### 3. Drop RLS Policies (Optional)

```sql
DROP POLICY IF EXISTS registry_admin_insert ON components_registry;
DROP POLICY IF EXISTS registry_admin_update ON components_registry;
DROP POLICY IF EXISTS registry_admin_delete ON components_registry;
```

### 4. Drop Helper Function (Optional)

```sql
DROP FUNCTION IF EXISTS check_component_usage(TEXT);
```

---

## Post-Migration Testing

### Test 1: API Routes

```bash
# Test list components
curl -X GET http://localhost:3000/api/registry \
  -H "Authorization: Bearer <token>"

# Expected: List of components with registry_type field
```

### Test 2: Menu Items API

```bash
# Test menu items fetches from components_registry
curl -X GET http://localhost:3000/api/dashboard/menu-items \
  -H "Authorization: Bearer <token>"

# Expected: Menu items with labels from database
```

### Test 3: Dashboard Access

```
1. Navigate to: /dashboard/admin/registry
2. Expected: See list of all components
3. Click "Create Component"
4. Expected: Modal opens with form
5. Create a test component
6. Expected: Component appears in list
```

### Test 4: Component Usage Check

```sql
-- Test with existing component
SELECT * FROM check_component_usage('file_explorer');

-- Expected: Returns stakeholders using file_explorer
```

---

## Known Issues & Solutions

### Issue 1: Stakeholders with NULL core_config

**Symptom:** Migration skips stakeholders with NULL core_config

**Solution:** These stakeholders weren't using function_registry anyway, no action needed

### Issue 2: Malformed JSON in core_config

**Symptom:** JSON parsing error during migration

**Solution:**
```sql
-- Find malformed JSON
SELECT id, name, core_config
FROM stakeholders
WHERE core_config IS NOT NULL
AND NOT (core_config::text ~ '^{.*}$');

-- Fix manually or contact stakeholder
```

### Issue 3: Menu Items Still Reference Old Structure

**Symptom:** menu_items contain full objects instead of component_code

**Solution:** API handles both formats (backward compatible):
```typescript
// Handles both:
{ "component_code": "file_explorer" }  // New format
{ "label": "Files", "component_id": "file_explorer" }  // Old format
```

---

## Performance Impact

### Database Queries

**Before:**
- No database query for component metadata (from JSON)

**After:**
- 1 query to fetch component metadata per menu load
- Minimal impact: <10ms for typical dashboard (5-10 components)

**Optimization:**
- Components cached in Map for duration of request
- Single query fetches all needed components at once

### Storage

**Reduced:**
- Removed function_registry from each stakeholder's core_config
- Estimated savings: ~500 bytes per stakeholder

**Added:**
- registry_type column: ~10 bytes per component
- deleted_at, last_modified_by: ~20 bytes per component

**Net Impact:** Negligible (~30 bytes per component, one-time)

---

## API Endpoint Documentation

### GET /api/registry

**Purpose:** List all components in registry

**Query Parameters:**
- `registry_type` (optional): Filter by type (UI_COMPONENT, AI_FUNCTION, etc.)
- `is_active` (optional): Filter by status (true/false)
- `search` (optional): Search by code/name/description
- `page` (default: 1): Page number
- `page_size` (default: 50): Items per page

**Response:**
```json
{
  "data": [...],
  "count": 5,
  "page": 1,
  "page_size": 50
}
```

### POST /api/registry

**Purpose:** Create new component (admin only)

**Request Body:**
```json
{
  "component_code": "custom_widget",
  "component_name": "Custom Widget",
  "widget_component_name": "CustomWidget",
  "registry_type": "UI_COMPONENT",
  "is_active": true
}
```

### GET /api/registry/[code]

**Purpose:** Get single component by code

**Response:**
```json
{
  "id": "uuid",
  "component_code": "file_explorer",
  "component_name": "File Explorer",
  ...
}
```

### PATCH /api/registry/[code]

**Purpose:** Update component (admin only)

**Request Body:**
```json
{
  "component_name": "Updated Name",
  "is_active": false
}
```

### DELETE /api/registry/[code]

**Purpose:** Soft delete component (admin only)

**Behavior:**
- Checks usage via `check_component_usage()`
- Returns 409 if component is in use
- Sets `deleted_at` and `is_active=false`

### GET /api/registry/[code]/usage

**Purpose:** Check component usage

**Response:**
```json
{
  "component_code": "file_explorer",
  "usage_count": 3,
  "usage": [
    {
      "stakeholder_id": "uuid",
      "stakeholder_name": "John Doe",
      "stakeholder_email": "john@example.com",
      "role_config_key": "producer"
    }
  ],
  "can_delete": false
}
```

---

## Next Steps

After migration completes:

1. ✅ Test all API endpoints
2. ✅ Test Registry Management Dashboard
3. ✅ Verify RLS policies work (test as non-admin)
4. ✅ Check menu items still load correctly
5. ✅ Test component creation/update/delete
6. ✅ Verify soft delete prevents deletion of in-use components

---

## Support & Troubleshooting

### Contact

- **Migration Issues:** Check migration logs in database
- **API Issues:** Check Next.js logs
- **Dashboard Issues:** Check browser console

### Logs Location

- Database migration logs: PostgreSQL logs
- API logs: Next.js console output
- Client logs: Browser DevTools console

---

**Migration Created By:** AI Assistant (Claude Code)
**Migration Date:** 2025-11-18
**Status:** ✅ Ready for Deployment
