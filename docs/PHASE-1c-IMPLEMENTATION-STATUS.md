# Phase 1c Implementation Status

**Date:** 2025-11-09
**Status:** Database Layer Complete - Application Layer Pending
**Branch:** main

---

## ✅ COMPLETED: Database Layer

### 1. Migration Files Created

#### Migration 1: Add app_uuid Columns
**File:** `supabase/migrations/20251109142557_add_app_uuid_multitenancy.sql`

**Changes:**
- ✅ Added `app_uuid` column to `roles` table
- ✅ Added `app_uuid` column to `relationship_types` table
- ✅ Verified/updated `app_uuid` on `relationships` table (already existed from PHASE-1a)
- ✅ Added `app_uuid` column to `stakeholder_roles` table
- ✅ Added `app_uuid` column to `themes` table (if exists)
- ✅ Created foreign key constraints to `site_settings(app_uuid)`
- ✅ Created indexes for performance
- ✅ Backfilled existing records with current active app UUID
- ✅ Updated unique constraint on `stakeholder_roles` to include `app_uuid`

**Key Changes:**
```sql
-- Old constraint (WRONG):
UNIQUE(stakeholder_id, role_type)

-- New constraint (CORRECT):
UNIQUE(stakeholder_id, role_type, app_uuid)
```

#### Migration 2: RLS Policies
**File:** `supabase/migrations/20251109142558_rls_policies_multitenancy.sql`

**Changes:**
- ✅ Created helper function `get_user_app_uuids()` - returns apps user has access to
- ✅ Created helper function `is_user_admin()` - checks if user is admin
- ✅ Updated RLS policies for `roles` table (4 policies)
- ✅ Updated RLS policies for `relationship_types` table (4 policies)
- ✅ Updated RLS policies for `relationships` table (4 policies)
- ✅ Updated RLS policies for `stakeholder_roles` table (4 policies)
- ✅ Updated RLS policies for `themes` table (4 policies, if table exists)

**Security Model:**
- Users can only see/modify data in apps where they have stakeholder_roles assignments
- Admins can see/modify data across all apps
- All DELETE/UPDATE operations are filtered by `app_uuid`

#### Migration 3: Update provision_stakeholder_v2 Function
**File:** `supabase/migrations/20251109142559_update_provision_stakeholder_v2_app_uuid.sql`

**Changes:**
- ✅ Added `p_app_uuid` parameter (defaults to current active app)
- ✅ Updated `stakeholder_roles` INSERT to include `app_uuid`
- ✅ Updated `relationships` INSERT to include `app_uuid`
- ✅ Updated `nodes`, `notifications`, `workflows` to include `app_uuid` (if columns exist)
- ✅ Tracks `app_uuid` in `core_config.__meta`
- ✅ Returns `app_uuid_out` in result

---

### 2. Library Files Updated

#### File: `src/lib/db/roles.ts`
**Status:** ✅ Complete

**Changes:**
```typescript
// BEFORE
export async function listRolesForStakeholder(stakeholderId: string)
export async function assignRoles(stakeholderId: string, roleTypes: string[])
export async function removeRoles(stakeholderId: string, roleTypes: string[])

// AFTER
export async function listRolesForStakeholder(stakeholderId: string, appUuid: string)
export async function assignRoles(stakeholderId: string, roleTypes: string[], appUuid: string)
export async function removeRoles(stakeholderId: string, roleTypes: string[], appUuid: string)
```

**Security Improvements:**
- All queries now filter by `app_uuid`
- `assignRoles()` includes `app_uuid` in INSERT
- `removeRoles()` includes `app_uuid` in DELETE for security
- Updated unique constraint conflict resolution

#### File: `src/lib/db/relationships.ts`
**Status:** ✅ Complete

**Changes:**
```typescript
// BEFORE
export interface ListParams {
  // ... no appUuid
}
export async function getRelationship(id: string)
export async function createRelationship(payload: Record<string, any>)
export async function updateRelationship(id: string, payload: Record<string, any>)
export async function deleteRelationship(id: string)

// AFTER
export interface ListParams {
  appUuid: string; // Required parameter
  // ...
}
export async function getRelationship(id: string, appUuid: string)
export async function createRelationship(payload: Record<string, any>, appUuid: string)
export async function updateRelationship(id: string, payload: Record<string, any>, appUuid: string)
export async function deleteRelationship(id: string, appUuid: string)
```

**Security Improvements:**
- `listRelationships()` always filters by `app_uuid`
- `getRelationship()` validates relationship belongs to app
- `createRelationship()` automatically sets `app_uuid`
- `updateRelationship()` validates before updating
- `deleteRelationship()` validates before deleting

#### File: `src/lib/db/stakeholders.ts`
**Status:** ✅ No Changes Needed

**Rationale:**
- Stakeholders are global entities (no `app_uuid` column)
- Same stakeholder can participate in multiple apps
- App membership is determined by `stakeholder_roles` table

---

## ⏳ PENDING: Application Layer

### 3. API Routes Need Updates (13 files)

**Pattern for all API routes:**
1. Get `appUuid` from request context/headers
2. Pass `appUuid` to library functions
3. Validate `appUuid` exists

#### Stakeholder Roles API Routes (4 files)

1. **`src/app/api/stakeholders/[id]/roles/route.ts`**
   - GET: Add `appUuid` parameter to `listRolesForStakeholder()`
   - POST/PUT: Add `appUuid` parameter to `assignRoles()`
   - DELETE: Add `appUuid` parameter to `removeRoles()`

2. **`src/app/api/roles/assign/route.ts`**
   - POST: Add `appUuid` parameter to `assignRoles()`

3. **`src/app/api/roles/route.ts`**
   - GET: Filter roles by `appUuid`
   - POST: Include `appUuid` when creating roles

4. **`src/app/api/roles/[id]/route.ts`**
   - GET/PUT/DELETE: Include `appUuid` filter

#### Relationships API Routes (2 files)

5. **`src/app/api/relationships/route.ts`**
   - GET: Add `appUuid` to `listRelationships()` params
   - POST: Add `appUuid` parameter to `createRelationship()`

6. **`src/app/api/relationships/[id]/route.ts`**
   - GET: Add `appUuid` parameter to `getRelationship()`
   - PUT: Add `appUuid` parameter to `updateRelationship()`
   - DELETE: Add `appUuid` parameter to `deleteRelationship()`

#### Stakeholder Types API Routes (2 files)

7. **`src/app/api/stakeholder-types/route.ts`**
   - No changes needed (reference table - global)

8. **`src/app/api/stakeholder-types/[id]/roles/route.ts`**
   - Review - may need `appUuid` filtering

#### Relationship Types API Routes (2 files)

9. **`src/app/api/relationship-types/route.ts`**
   - GET: Filter by `appUuid`
   - POST: Include `appUuid` when creating

10. **`src/app/api/relationship-types/[id]/route.ts`**
    - GET/PUT/DELETE: Include `appUuid` filter

#### Stakeholder API Routes (3 files)

11. **`src/app/api/stakeholders/route.ts`**
    - No changes to stakeholders themselves (global)
    - But may need to join with stakeholder_roles for app filtering

12. **`src/app/api/stakeholders/[id]/route.ts`**
    - No changes needed

13. **`src/app/api/stakeholders/create-user/route.ts`**
    - Add `appUuid` parameter when calling `provision_stakeholder_v2()`

---

### 4. Page Components Need Updates (13 files)

**Pattern for all pages:**
1. Import and use `useAppUuid()` hook
2. Pass `appUuid` to all API calls
3. Handle loading state while getting `appUuid`

#### Admin Stakeholder Pages (6 files)

14. **`src/app/dashboard/admin/stakeholders/page.tsx`**
    - Add `useAppUuid()` hook
    - May need to filter stakeholders by app membership

15. **`src/app/dashboard/admin/stakeholders/create/page.tsx`**
    - Add `useAppUuid()` hook
    - Pass `appUuid` when creating stakeholder

16. **`src/app/dashboard/admin/stakeholders/[id]/view/page.tsx`**
    - Add `useAppUuid()` hook
    - Filter displayed roles/relationships by app

17. **`src/app/dashboard/admin/stakeholders/[id]/edit/page.tsx`**
    - Add `useAppUuid()` hook
    - Pass `appUuid` when updating

18. **`src/app/dashboard/admin/stakeholders/[id]/roles/page.tsx`**
    - Add `useAppUuid()` hook
    - Pass `appUuid` to all role assignment calls

19. **`src/app/dashboard/admin/stakeholders/[id]/relationships/page.tsx`**
    - Add `useAppUuid()` hook
    - Pass `appUuid` to all relationship calls

#### Blog/Content Pages (3 files - from STEP-3-PROGRESS.md)

20. **`src/app/dashboard/pages/editor/page.tsx`**
    - Add `useAppUuid()` hook
    - Filter page_settings by `app_uuid`
    - Filter page_images DELETE by `app_uuid`

21. **`src/app/dashboard/blog/new/page.tsx`**
    - Add `useAppUuid()` hook
    - Include `app_uuid` in blog_posts INSERT

22. **`src/app/blog/[id]/page.tsx`**
    - Add `useAppUuid()` hook
    - Filter blog_posts SELECT by `app_uuid`

#### Landing/Settings Pages (4 files - from STEP-3-PROGRESS.md)

23. **`src/app/page.tsx` (Landing Page)**
    - Add `useAppUuid()` hook
    - Filter page_settings, blog_posts by `app_uuid`
    - Include `app_uuid` in enquiries INSERT

24. **`src/app/dashboard/settings/branding/page.tsx`**
    - Add `useApp()` hook (needs site_code, not just uuid)
    - Filter site_settings by `site_code`

25. **`src/app/dashboard/page.tsx`**
    - Already updated ✅ (from STEP-3-PROGRESS.md)

26. **`src/app/dashboard/blog/[id]/page.tsx`**
    - Already updated ✅ (from STEP-3-PROGRESS.md)

#### Hooks (1 file - from STEP-3-PROGRESS.md)

27. **`src/hooks/useTheme.ts`**
    - Add `useApp()` hook (needs site_code)
    - Filter site_settings SELECT by `site_code`
    - Filter realtime subscription by `site_code`

---

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] Review all migration files
- [ ] Backup production database
- [ ] Document current active `app_uuid` value
- [ ] Test migrations on local/dev database first

### Deployment Steps

1. **Run Migrations**
   ```bash
   # Run in order:
   supabase migration up  # Runs all pending migrations
   ```

2. **Verify Migration Success**
   ```sql
   -- Check columns exist
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name IN ('roles', 'relationship_types', 'relationships', 'stakeholder_roles')
   AND column_name = 'app_uuid';

   -- Check no NULL values
   SELECT COUNT(*) FROM roles WHERE app_uuid IS NULL;
   SELECT COUNT(*) FROM relationship_types WHERE app_uuid IS NULL;
   SELECT COUNT(*) FROM relationships WHERE app_uuid IS NULL;
   SELECT COUNT(*) FROM stakeholder_roles WHERE app_uuid IS NULL;
   ```

3. **Update Application Code**
   - Deploy updated library files (✅ Complete)
   - Update and deploy API routes (⏳ Pending)
   - Update and deploy page components (⏳ Pending)

4. **Test End-to-End**
   - Create new stakeholder with `app_uuid`
   - Assign roles in specific app
   - Create relationships in specific app
   - Verify data isolation between apps

---

## 🚨 Breaking Changes

### API Function Signatures Changed

All code calling these functions must be updated:

**roles.ts:**
```typescript
// OLD (will break)
await listRolesForStakeholder(stakeholderId)
await assignRoles(stakeholderId, roleTypes)
await removeRoles(stakeholderId, roleTypes)

// NEW (required)
await listRolesForStakeholder(stakeholderId, appUuid)
await assignRoles(stakeholderId, roleTypes, appUuid)
await removeRoles(stakeholderId, roleTypes, appUuid)
```

**relationships.ts:**
```typescript
// OLD (will break)
await listRelationships({ stakeholderId })
await getRelationship(id)
await createRelationship(payload)
await updateRelationship(id, payload)
await deleteRelationship(id)

// NEW (required)
await listRelationships({ stakeholderId, appUuid })
await getRelationship(id, appUuid)
await createRelationship(payload, appUuid)
await updateRelationship(id, payload, appUuid)
await deleteRelationship(id, appUuid)
```

---

## 📊 Testing Plan

### Unit Tests

- [ ] Test `get_user_app_uuids()` function returns correct apps
- [ ] Test `is_user_admin()` function identifies admins correctly
- [ ] Test RLS policies block cross-app access
- [ ] Test `provision_stakeholder_v2()` with `app_uuid` parameter

### Integration Tests

- [ ] Create stakeholder in App A
- [ ] Assign roles in App A and App B to same stakeholder
- [ ] Verify stakeholder can only see App A roles when logged into App A
- [ ] Verify stakeholder can see App B roles when logged into App B
- [ ] Create relationships in App A
- [ ] Verify relationships not visible in App B
- [ ] Verify DELETE operations respect `app_uuid` filtering

### Performance Tests

- [ ] Measure query performance before/after migration
- [ ] Verify indexes are being used (EXPLAIN ANALYZE)
- [ ] Monitor slow query log after deployment

---

## 🔐 Security Validation

### RLS Policy Tests

Run as different users to verify policies:

```sql
-- As App A user
SET ROLE app_a_user;
SELECT * FROM roles;  -- Should only see App A roles
SELECT * FROM relationships;  -- Should only see App A relationships

-- As App B user
SET ROLE app_b_user;
SELECT * FROM roles;  -- Should only see App B roles
SELECT * FROM relationships;  -- Should only see App B relationships

-- As super_admin
SET ROLE super_admin;
SELECT * FROM roles;  -- Should see ALL roles
SELECT * FROM relationships;  -- Should see ALL relationships
```

### DELETE/UPDATE Security Tests

```sql
-- As App A user, try to delete App B data
DELETE FROM relationships WHERE id = '<app_b_relationship_id>';
-- Expected: 0 rows deleted (RLS blocks it)

-- As App A user, try to update App B data
UPDATE relationships SET status = 'inactive' WHERE id = '<app_b_relationship_id>';
-- Expected: 0 rows updated (RLS blocks it)
```

---

## 📝 Next Steps

1. **Update API Routes** (Highest Priority)
   - Start with relationships API routes
   - Then roles API routes
   - Test each route after updating

2. **Update Page Components**
   - Start with admin stakeholder pages
   - Then blog/content pages
   - Finally landing/settings pages

3. **End-to-End Testing**
   - Create test app_uuid for second app
   - Test stakeholder working across both apps
   - Verify complete data isolation

4. **Documentation**
   - Update STEP-3-PROGRESS.md when each file is completed
   - Update CHANGELOG.md with migration notes
   - Create testing checklist

---

## 📚 Reference

**Architecture Decisions:**
- Stakeholders are GLOBAL (no app_uuid)
- Stakeholder_roles are APP-SPECIFIC (has app_uuid)
- Relationships are APP-SPECIFIC (has app_uuid)
- Roles (master table) are APP-SPECIFIC (has app_uuid)
- Relationship_types (master table) are APP-SPECIFIC (has app_uuid)

**Foreign Key:**
```sql
FOREIGN KEY (app_uuid) REFERENCES site_settings(app_uuid) ON DELETE CASCADE
```

**RLS Pattern:**
```sql
-- For user data access
USING (app_uuid IN (SELECT get_user_app_uuids()))

-- For admin operations
USING (is_user_admin())
```

---

**Status:** Database layer complete, application layer updates in progress
**Next Review:** After API routes are updated
**Estimated Completion:** TBD pending API and page updates
