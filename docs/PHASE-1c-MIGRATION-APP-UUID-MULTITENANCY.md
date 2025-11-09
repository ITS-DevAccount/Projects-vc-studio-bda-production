# Phase 1c Migration: Multi-Tenancy Column Addition
## Specification: Adding `app_uuid` to Roles, Relationships, Theme, and Related Tables

**Status:** Pre-Implementation Specification  
**Date:** November 9, 2025  
**Scope:** BDA Production Supabase Database  
**Risk Level:** HIGH - Affects core transaction function and RLS policies

---

## 1. Executive Summary

Your current RLS policies are **overly permissive**—authenticated users can see/modify ALL roles, relationships, and relationship_types records regardless of application context. Adding `app_uuid` columns enforces application-level data isolation, preventing users in one app from accessing another app's operational data.

**Key Changes:**
- Add `app_uuid` foreign key to 4 tables: `roles`, `relationship_types`, `relationships`, `stakeholder_roles`
- Add `app_uuid` to existing `site_settings` (already there, verify), `themes` (new column)
- Rewrite RLS policies to filter by `app_uuid`
- Update `provision_stakeholder_v2()` function to use `app_uuid`
- Create indexes for performance

**Deployment Risk:** Medium-High (RLS policy changes affect live data access)

---

## 2. Architecture Context

### Current State
```
User A (App 1) can see:
- All roles in database ❌
- All relationships in database ❌
- All relationship types in database ❌
```

### Desired State
```
User A (App 1) can see:
- Roles WHERE app_uuid = App_1_UUID ✓
- Relationships WHERE app_uuid = App_1_UUID ✓
- Relationship_types WHERE app_uuid = App_1_UUID ✓
```

### Tables Affected

| Table | Action | Reason | Dependencies |
|-------|--------|--------|--------------|
| `roles` | Add `app_uuid` | Ops isolation | stakeholder_roles FK |
| `relationship_types` | Add `app_uuid` | Ops isolation | relationships FK |
| `relationships` | Add `app_uuid` | Ops isolation | provision_stakeholder_v2() |
| `stakeholder_roles` | Add `app_uuid` | Ops isolation | stakeholders reference |
| `themes` | Add `app_uuid` | Multi-tenant branding | site_settings reference |
| `site_settings` | Verify `app_uuid` | Already multi-tenant | Base reference |

---

## 3. Implementation Steps

### Step 1: Verify Applications Table Structure

**Query to run first:**
```sql
SELECT app_uuid, app_code, app_name, status 
FROM site_settings 
WHERE key LIKE 'app%' OR config_type = 'application'
LIMIT 10;
```

**Expected output:**
Applications should have UUIDs we can reference. If not, we need to create an `applications` table first.

---

### Step 2: Create Migration File

**File location:** `/supabase/migrations/[TIMESTAMP]_add_app_uuid_multitenancy.sql`

**Migration content:**

```sql
-- ============================================================================
-- MIGRATION: Add app_uuid Multi-Tenancy Isolation
-- File: [TIMESTAMP]_add_app_uuid_multitenancy.sql
-- Purpose: Enforce application-level data segregation
-- Status: Requires RLS policy recreation
-- Rollback: Available via version control
-- ============================================================================

-- ============================================================================
-- STEP 1: Add app_uuid column to roles table
-- ============================================================================

ALTER TABLE roles ADD COLUMN app_uuid UUID NOT NULL DEFAULT uuid_generate_v4();
CREATE INDEX idx_roles_app_uuid ON roles(app_uuid);
ALTER TABLE roles ADD CONSTRAINT fk_roles_app_uuid FOREIGN KEY (app_uuid) REFERENCES site_settings(id);

-- ============================================================================
-- STEP 2: Add app_uuid column to relationship_types table
-- ============================================================================

ALTER TABLE relationship_types ADD COLUMN app_uuid UUID NOT NULL DEFAULT uuid_generate_v4();
CREATE INDEX idx_relationship_types_app_uuid ON relationship_types(app_uuid);
ALTER TABLE relationship_types ADD CONSTRAINT fk_relationship_types_app_uuid FOREIGN KEY (app_uuid) REFERENCES site_settings(id);

-- ============================================================================
-- STEP 3: Add app_uuid column to relationships table
-- ============================================================================

ALTER TABLE relationships ADD COLUMN app_uuid UUID NOT NULL DEFAULT uuid_generate_v4();
CREATE INDEX idx_relationships_app_uuid ON relationships(app_uuid);
ALTER TABLE relationships ADD CONSTRAINT fk_relationships_app_uuid FOREIGN KEY (app_uuid) REFERENCES site_settings(id);

-- ============================================================================
-- STEP 4: Add app_uuid column to stakeholder_roles table
-- ============================================================================

ALTER TABLE stakeholder_roles ADD COLUMN app_uuid UUID NOT NULL DEFAULT uuid_generate_v4();
CREATE INDEX idx_stakeholder_roles_app_uuid ON stakeholder_roles(app_uuid);
ALTER TABLE stakeholder_roles ADD CONSTRAINT fk_stakeholder_roles_app_uuid FOREIGN KEY (app_uuid) REFERENCES site_settings(id);

-- ============================================================================
-- STEP 5: Add app_uuid to themes (if exists)
-- ============================================================================

ALTER TABLE themes ADD COLUMN app_uuid UUID NOT NULL DEFAULT uuid_generate_v4();
CREATE INDEX idx_themes_app_uuid ON themes(app_uuid);
ALTER TABLE themes ADD CONSTRAINT fk_themes_app_uuid FOREIGN KEY (app_uuid) REFERENCES site_settings(id);

-- ============================================================================
-- VERIFICATION - Count rows affected
-- ============================================================================

SELECT 
    (SELECT COUNT(*) FROM roles) as total_roles,
    (SELECT COUNT(*) FROM relationship_types) as total_relationship_types,
    (SELECT COUNT(*) FROM relationships) as total_relationships,
    (SELECT COUNT(*) FROM stakeholder_roles) as total_stakeholder_roles,
    (SELECT COUNT(*) FROM themes) as total_themes;
```

---

## 4. RLS Policy Updates

### Current Problem Policies

**Before (WRONG):**
```sql
CREATE POLICY "authenticated_users_select_roles" ON roles
    FOR SELECT USING (true);  -- Anyone can see ALL roles!
```

**After (CORRECT):**
```sql
CREATE POLICY "authenticated_users_select_roles" ON roles
    FOR SELECT USING (
        app_uuid IN (
            SELECT app_uuid FROM stakeholders 
            WHERE auth_user_id = auth.uid()
        )
    );
```

### Complete RLS Policy Refresh Script

**File:** `rls_policies_multitenancy.sql`

```sql
-- ============================================================================
-- RLS POLICIES: Multi-Tenancy Application Isolation
-- ============================================================================

-- ===== ROLES TABLE =====

DROP POLICY IF EXISTS "anon_users_select_active_roles" ON roles;
DROP POLICY IF EXISTS "authenticated_users_select_roles" ON roles;
DROP POLICY IF EXISTS "authenticated_users_insert_roles" ON roles;
DROP POLICY IF EXISTS "authenticated_users_update_roles" ON roles;
DROP POLICY IF EXISTS "authenticated_users_delete_roles" ON roles;

-- Only admins can see roles for their app
CREATE POLICY "roles_admin_select" ON roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin')
        )
        OR
        app_uuid IN (
            SELECT app_uuid FROM stakeholders 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "roles_admin_insert" ON roles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin')
        )
    );

CREATE POLICY "roles_admin_update" ON roles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin')
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin')
        )
    );

CREATE POLICY "roles_admin_delete" ON roles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin')
        )
    );

-- ===== RELATIONSHIP_TYPES TABLE =====

DROP POLICY IF EXISTS "anon_users_select_relationship_types" ON relationship_types;
DROP POLICY IF EXISTS "authenticated_users_select_relationship_types" ON relationship_types;
DROP POLICY IF EXISTS "authenticated_users_insert_relationship_types" ON relationship_types;
DROP POLICY IF EXISTS "authenticated_users_update_relationship_types" ON relationship_types;
DROP POLICY IF EXISTS "authenticated_users_delete_relationship_types" ON relationship_types;

CREATE POLICY "relationship_types_select" ON relationship_types
    FOR SELECT USING (
        app_uuid IN (
            SELECT app_uuid FROM stakeholders 
            WHERE auth_user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin')
        )
    );

CREATE POLICY "relationship_types_insert" ON relationship_types
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin')
        )
    );

CREATE POLICY "relationship_types_update" ON relationship_types
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin')
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin')
        )
    );

CREATE POLICY "relationship_types_delete" ON relationship_types
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin')
        )
    );

-- ===== RELATIONSHIPS TABLE =====

DROP POLICY IF EXISTS "anon_users_insert_relationships" ON relationships;
DROP POLICY IF EXISTS "authenticated_users_select_relationships" ON relationships;
DROP POLICY IF EXISTS "authenticated_users_insert_relationships" ON relationships;
DROP POLICY IF EXISTS "authenticated_users_update_relationships" ON relationships;
DROP POLICY IF EXISTS "authenticated_users_delete_relationships" ON relationships;

CREATE POLICY "relationships_select" ON relationships
    FOR SELECT USING (
        app_uuid IN (
            SELECT app_uuid FROM stakeholders 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "relationships_insert" ON relationships
    FOR INSERT WITH CHECK (
        app_uuid IN (
            SELECT app_uuid FROM stakeholders 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "relationships_update" ON relationships
    FOR UPDATE USING (
        app_uuid IN (
            SELECT app_uuid FROM stakeholders 
            WHERE auth_user_id = auth.uid()
        )
    ) WITH CHECK (
        app_uuid IN (
            SELECT app_uuid FROM stakeholders 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "relationships_delete" ON relationships
    FOR DELETE USING (
        app_uuid IN (
            SELECT app_uuid FROM stakeholders 
            WHERE auth_user_id = auth.uid()
        )
    );

-- ===== STAKEHOLDER_ROLES TABLE =====

DROP POLICY IF EXISTS "anon_users_insert_stakeholder_roles" ON stakeholder_roles;
DROP POLICY IF EXISTS "authenticated_users_insert_stakeholder_roles" ON stakeholder_roles;
DROP POLICY IF EXISTS "Stakeholders can view own roles" ON stakeholder_roles;
DROP POLICY IF EXISTS "Authenticated users can manage stakeholder roles" ON stakeholder_roles;

CREATE POLICY "stakeholder_roles_select" ON stakeholder_roles
    FOR SELECT USING (
        app_uuid IN (
            SELECT app_uuid FROM stakeholders 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "stakeholder_roles_insert" ON stakeholder_roles
    FOR INSERT WITH CHECK (
        app_uuid IN (
            SELECT app_uuid FROM stakeholders 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "stakeholder_roles_update" ON stakeholder_roles
    FOR UPDATE USING (
        app_uuid IN (
            SELECT app_uuid FROM stakeholders 
            WHERE auth_user_id = auth.uid()
        )
    ) WITH CHECK (
        app_uuid IN (
            SELECT app_uuid FROM stakeholders 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "stakeholder_roles_delete" ON stakeholder_roles
    FOR DELETE USING (
        app_uuid IN (
            SELECT app_uuid FROM stakeholders 
            WHERE auth_user_id = auth.uid()
        )
    );

-- ===== THEMES TABLE =====

DROP POLICY IF EXISTS "themes_select" ON themes;
DROP POLICY IF EXISTS "themes_insert" ON themes;
DROP POLICY IF EXISTS "themes_update" ON themes;
DROP POLICY IF EXISTS "themes_delete" ON themes;

CREATE POLICY "themes_select" ON themes
    FOR SELECT USING (
        app_uuid IN (
            SELECT app_uuid FROM site_settings 
            WHERE id = auth.uid()::uuid OR is_active = true
        )
    );

CREATE POLICY "themes_insert" ON themes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin')
        )
    );

CREATE POLICY "themes_update" ON themes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin')
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin')
        )
    );

CREATE POLICY "themes_delete" ON themes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role IN ('super_admin', 'domain_admin')
        )
    );
```

---

## 5. Update provision_stakeholder_v2() Function

**Current code (partial):**
```sql
INSERT INTO stakeholder_roles (stakeholder_id, role_id, role_type)
VALUES (v_stakeholder_id, v_role_id, v_role_code);
```

**Updated code:**
```sql
INSERT INTO stakeholder_roles (stakeholder_id, role_id, role_type, app_uuid)
VALUES (v_stakeholder_id, v_role_id, v_role_code, p_app_uuid);
```

**Full function signature addition:**
```sql
CREATE FUNCTION provision_stakeholder_v2(
    p_stakeholder JSONB,
    p_role_codes TEXT[] DEFAULT NULL,
    p_primary_role_id UUID DEFAULT NULL,
    p_relationships JSONB DEFAULT NULL,
    p_auth_user_id UUID DEFAULT NULL,
    p_invite_email TEXT DEFAULT NULL,
    p_is_user BOOLEAN DEFAULT FALSE,
    p_created_by UUID DEFAULT NULL,
    p_app_uuid UUID DEFAULT NULL  -- NEW PARAMETER
)
```

---

## 6. Deployment Plan

### Phase 1: Pre-Deployment (Testing)

```
1. Create migration file in /supabase/migrations/
2. Test migration locally (if possible)
3. Backup Supabase database
4. Export current data to CSV for rollback
5. Document app_uuid values for each application
```

### Phase 2: Migration Execution

```
Step A: Run migration script
  - Add app_uuid columns
  - Create foreign keys
  - Create indexes

Step B: Verify data integrity
  - COUNT all tables
  - Check for NULL app_uuid values (should be zero)
  - Verify FK constraints

Step C: Deploy RLS policies
  - Drop old policies
  - Create new multi-tenancy policies
  - Test access as User from App A (should only see App A data)
  
Step D: Update provision_stakeholder_v2() function
  - Add p_app_uuid parameter
  - Update INSERT statements
  - Deploy new function
  - Test onboarding with app_uuid context
```

### Phase 3: Validation

```
Test matrix:
┌─────────────────────┬─────────────┬────────────────────┐
│ User Type           │ App Context │ Expected Access    │
├─────────────────────┼─────────────┼────────────────────┤
│ App A Stakeholder   │ App A       │ ✓ See App A data   │
│ App A Stakeholder   │ App B       │ ✗ Cannot see       │
│ Super Admin         │ Any         │ ✓ See all data     │
│ Domain Admin        │ App A       │ ✓ See App A data   │
└─────────────────────┴─────────────┴────────────────────┘
```

---

## 7. Rollback Plan

**If migration fails:**

```sql
-- Option 1: Rollback via version control
-- Use Supabase UI to rollback to previous migration

-- Option 2: Manual rollback
ALTER TABLE roles DROP COLUMN app_uuid;
ALTER TABLE relationship_types DROP COLUMN app_uuid;
ALTER TABLE relationships DROP COLUMN app_uuid;
ALTER TABLE stakeholder_roles DROP COLUMN app_uuid;
ALTER TABLE themes DROP COLUMN app_uuid;

-- Re-apply old RLS policies
-- (scripts provided in separate file)
```

---

## 8. Testing Checklist

- [ ] Migration runs without errors
- [ ] All `app_uuid` columns populated with valid UUIDs
- [ ] Foreign key constraints validated
- [ ] Indexes created and queryable
- [ ] App A user can SELECT roles for App A only
- [ ] App A user cannot INSERT/UPDATE/DELETE App B data
- [ ] Onboarding still works with new app_uuid parameter
- [ ] Dashboard rendering unaffected
- [ ] Widgets still function properly

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| RLS policy errors block data access | HIGH | Test in staging first, have rollback ready |
| `provision_stakeholder_v2()` fails | HIGH | Maintain old function, test new one separately |
| Performance degradation from new indexes | MEDIUM | Monitor query times post-deployment |
| Existing data gets mixed app_uuid | LOW | DEFAULT uuid_generate_v4() ensures uniqueness |

---

## 10. Success Criteria

✓ All 5 tables have `app_uuid` columns  
✓ All RLS policies enforce app isolation  
✓ `provision_stakeholder_v2()` accepts app_uuid parameter  
✓ Onboarding works end-to-end  
✓ Users cannot access data from other apps  
✓ Dashboards and widgets render without errors  
✓ Database performance unchanged (< 5% variance)

---

## 11. Claude Code Instructions

**Tell Claude Code:**

```
Run this migration to add app_uuid multi-tenancy isolation:

1. Create file: /supabase/migrations/[TIMESTAMP]_add_app_uuid_multitenancy.sql
   Content: [Provide STEP 1-5 from Section 3]

2. Deploy migration via Supabase CLI:
   supabase migration up

3. Create RLS policy file: /supabase/policies/rls_multitenancy.sql
   Content: [Provide entire script from Section 4]

4. Deploy RLS policies:
   - Copy each policy into Supabase SQL editor
   - Verify no errors

5. Update provision_stakeholder_v2():
   - Add p_app_uuid parameter
   - Update stakeholder_roles INSERT to include app_uuid
   - Redeploy function

6. Test onboarding:
   - Create test stakeholder with app_uuid parameter
   - Verify it appears in dashboard
   - Verify users from other apps cannot see it

DO NOT make changes to RLS policies without my approval.
DO NOT drop any existing columns.
DO NOT proceed until I confirm each step.
```

---

## 12. Next Steps

1. **Review this spec** with app_uuid values for your applications
2. **Confirm file paths** match your project structure
3. **Run migration** once approved
4. **Monitor RLS policy access** for 24 hours
5. **Proceed to Phase 1d** (CRM Workflows) once validated

---

**Prepared by:** Claude (AI Assistant)  
**For:** Ian Peter, ITS Group  
**Project:** vc-bda-production Phase 1c  
**Status:** Ready for Implementation Review

