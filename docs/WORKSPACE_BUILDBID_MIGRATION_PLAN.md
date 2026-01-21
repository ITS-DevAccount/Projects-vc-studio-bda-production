# Workspace Functionality - BuildBid Migration Plan

**Project:** BuildBid Application
**Source:** VC Studio Workspace Implementation
**Estimated Duration:** 2-3 days
**Complexity:** LOW-MEDIUM
**Document Version:** 1.0

---

## Executive Summary

This document outlines the process for migrating the complete workspace functionality from VC Studio to BuildBid. Since both codebases are structurally identical, most of the work involves:

1. **Copying files** (85% of the code is reusable as-is)
2. **Creating BuildBid-specific seed data** (templates, configurations)
3. **Minor integration adjustments** (navigation paths, role names)
4. **Testing** (ensuring everything works in BuildBid context)

**Key Insight:** The workspace system was designed to be app-agnostic through the `app_uuid` pattern, meaning the same code serves multiple applications with data isolation.

---

## Table of Contents

1. [Reusability Analysis](#reusability-analysis)
2. [Migration Steps](#migration-steps)
3. [BuildBid-Specific Customizations](#buildbid-specific-customizations)
4. [File Migration Checklist](#file-migration-checklist)
5. [Seed Data Requirements](#seed-data-requirements)
6. [Integration Points](#integration-points)
7. [Testing Strategy](#testing-strategy)
8. [Timeline](#timeline)

---

## Reusability Analysis

### What's 100% Reusable (No Changes Needed)

#### ✅ Database Schema (10 migration files)
All migrations are app-agnostic and will work identically:

1. `20251215_create_workspaces_table.sql` ✅
2. `20251215_create_workspace_configurations_tables.sql` ✅
3. `20251215_create_workspace_configurations_junction.sql` ✅
4. `20251215_create_workspace_templates_table.sql` ✅
5. `20251215_create_workspace_access_control_table.sql` ✅
6. `20251215_extend_audit_logs_for_workspaces.sql` ✅
7. `20251216_workspace_rls_policies.sql` ✅
8. `20251216_workspace_functions.sql` ✅
9. `20251216_workspace_triggers.sql` ✅

**Why:** All tables use `app_uuid` for multi-tenancy. RLS policies filter by app automatically.

**Action:** Copy files as-is to BuildBid migrations folder.

#### ✅ TypeScript Types (1 file)
- `src/lib/types/workspace.ts` - 100% reusable

**Why:** Type definitions are app-agnostic.

**Action:** Copy file as-is.

#### ✅ API Routes (7 files)
All API endpoints filter by `app_uuid` automatically:

1. `src/app/api/workspaces/route.ts` ✅
2. `src/app/api/workspaces/[workspace_id]/route.ts` ✅
3. `src/app/api/workspaces/templates/route.ts` ✅
4. `src/app/api/workspaces/templates/[template_id]/route.ts` ✅
5. `src/app/api/workspaces/[workspace_id]/access/route.ts` ✅
6. `src/app/api/workspaces/[workspace_id]/access/[access_id]/route.ts` ✅
7. `src/app/api/workspaces/[workspace_id]/configurations/route.ts` ✅

**Why:** APIs use Supabase RLS which filters by authenticated user's app context.

**Action:** Copy files as-is.

#### ✅ Frontend Components (6 components)

1. `src/components/workspace/WorkspaceList.tsx` ✅
2. `src/components/workspace/WorkspaceCreationWizard.tsx` ✅
3. `src/components/workspace/WorkspaceAccessManager.tsx` ✅
4. `src/components/workspace/WorkspaceConfigurationPanel.tsx` ✅
5. `src/components/workspace/WorkspaceFileExplorer.tsx` ✅
6. `src/components/workspace/WorkspaceSwitcher.tsx` ✅

**Why:** Components use APIs that automatically filter by app.

**Action:** Copy files as-is.

#### ✅ Context (1 file)
- `src/contexts/WorkspaceContext.tsx` ✅

**Why:** App-agnostic state management.

**Action:** Copy file as-is.

#### ✅ Pages (2 files)
1. `src/app/workspace/page.tsx` ✅
2. `src/app/workspace/[workspace_id]/page.tsx` ✅

**Why:** UI templates work for any app.

**Action:** Copy files as-is.

#### ✅ Helper Utilities (1 file)
- `src/lib/utils/workspace-helpers.ts` ✅

**Why:** App-agnostic helper functions.

**Action:** Copy file as-is.

### Summary: Reusability
- **100% Reusable (copy as-is):** 28 files
- **Needs Customization:** 2 files (seed data + migration script)
- **Needs Integration:** 3-5 files (navigation components)
- **Total Reusability:** ~85%

---

## Migration Steps

### Step 1: Database Migrations (Day 1 Morning)

**Duration:** 2-3 hours

#### 1.1 Copy Core Migrations
```bash
# In BuildBid project
cd buildbid-project/supabase/migrations/

# Copy first 9 migrations (schema, RLS, functions)
cp vc-studio-project/supabase/migrations/20251215_create_workspaces_table.sql .
cp vc-studio-project/supabase/migrations/20251215_create_workspace_configurations_tables.sql .
cp vc-studio-project/supabase/migrations/20251215_create_workspace_configurations_junction.sql .
cp vc-studio-project/supabase/migrations/20251215_create_workspace_templates_table.sql .
cp vc-studio-project/supabase/migrations/20251215_create_workspace_access_control_table.sql .
cp vc-studio-project/supabase/migrations/20251215_extend_audit_logs_for_workspaces.sql .
cp vc-studio-project/supabase/migrations/20251216_workspace_rls_policies.sql .
cp vc-studio-project/supabase/migrations/20251216_workspace_functions.sql .
cp vc-studio-project/supabase/migrations/20251216_workspace_triggers.sql .
```

#### 1.2 Create BuildBid Seed Data
Create new file: `20251217_seed_buildbid_workspace_templates.sql`

**Content:** See [BuildBid Seed Data section](#buildbid-seed-data)

#### 1.3 Run Migrations
```bash
# Apply migrations in order
supabase db push
# or
npm run migrate
```

#### 1.4 Verify
```sql
-- Check tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'workspace%';

-- Check BuildBid templates
SELECT * FROM workspace_templates
WHERE app_uuid = (SELECT id FROM applications WHERE app_code = 'BUILDBID');
```

### Step 2: TypeScript & Utilities (Day 1 Morning)

**Duration:** 30 minutes

```bash
# Copy type definitions
cp vc-studio-project/src/lib/types/workspace.ts buildbid-project/src/lib/types/

# Copy helper utilities
cp vc-studio-project/src/lib/utils/workspace-helpers.ts buildbid-project/src/lib/utils/
```

### Step 3: API Routes (Day 1 Afternoon)

**Duration:** 1 hour

```bash
# Create workspaces API directory structure
mkdir -p buildbid-project/src/app/api/workspaces/templates
mkdir -p buildbid-project/src/app/api/workspaces/[workspace_id]/access/[access_id]
mkdir -p buildbid-project/src/app/api/workspaces/[workspace_id]/configurations

# Copy all API routes
cp vc-studio-project/src/app/api/workspaces/route.ts buildbid-project/src/app/api/workspaces/
cp vc-studio-project/src/app/api/workspaces/[workspace_id]/route.ts buildbid-project/src/app/api/workspaces/[workspace_id]/
cp vc-studio-project/src/app/api/workspaces/templates/route.ts buildbid-project/src/app/api/workspaces/templates/
cp vc-studio-project/src/app/api/workspaces/templates/[template_id]/route.ts buildbid-project/src/app/api/workspaces/templates/[template_id]/
cp vc-studio-project/src/app/api/workspaces/[workspace_id]/access/route.ts buildbid-project/src/app/api/workspaces/[workspace_id]/access/
cp vc-studio-project/src/app/api/workspaces/[workspace_id]/access/[access_id]/route.ts buildbid-project/src/app/api/workspaces/[workspace_id]/access/[access_id]/
cp vc-studio-project/src/app/api/workspaces/[workspace_id]/configurations/route.ts buildbid-project/src/app/api/workspaces/[workspace_id]/configurations/
```

**Verify:**
```bash
# Test API endpoints
curl http://localhost:3000/api/workspaces/templates
```

### Step 4: Frontend Components (Day 1 Afternoon)

**Duration:** 1-2 hours

```bash
# Create workspace components directory
mkdir -p buildbid-project/src/components/workspace

# Copy all components
cp vc-studio-project/src/components/workspace/WorkspaceList.tsx buildbid-project/src/components/workspace/
cp vc-studio-project/src/components/workspace/WorkspaceCreationWizard.tsx buildbid-project/src/components/workspace/
cp vc-studio-project/src/components/workspace/WorkspaceAccessManager.tsx buildbid-project/src/components/workspace/
cp vc-studio-project/src/components/workspace/WorkspaceConfigurationPanel.tsx buildbid-project/src/components/workspace/
cp vc-studio-project/src/components/workspace/WorkspaceFileExplorer.tsx buildbid-project/src/components/workspace/
cp vc-studio-project/src/components/workspace/WorkspaceSwitcher.tsx buildbid-project/src/components/workspace/

# Copy context
cp vc-studio-project/src/contexts/WorkspaceContext.tsx buildbid-project/src/contexts/
```

### Step 5: Pages (Day 1 Afternoon)

**Duration:** 30 minutes

```bash
# Create workspace pages directory
mkdir -p buildbid-project/src/app/workspace/[workspace_id]

# Copy pages
cp vc-studio-project/src/app/workspace/page.tsx buildbid-project/src/app/workspace/
cp vc-studio-project/src/app/workspace/[workspace_id]/page.tsx buildbid-project/src/app/workspace/[workspace_id]/
```

### Step 6: Integration (Day 2)

**Duration:** 3-4 hours

This requires finding BuildBid's equivalent components and integrating WorkspaceSwitcher.

#### 6.1 Find BuildBid Navigation Components

```bash
# Search for header/navigation in BuildBid
cd buildbid-project
find . -name "*Header*.tsx" -o -name "*Navigation*.tsx" -o -name "*Menu*.tsx"
```

#### 6.2 Integrate WorkspaceSwitcher

**If BuildBid has AdminHeader (same as VC Studio):**
```typescript
// buildbid-project/src/components/admin/AdminHeader.tsx
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher'

// Add to header
<div className="flex items-center gap-4">
  <div>
    <h1>BuildBid Admin</h1>
    <p>{email}</p>
  </div>
  <WorkspaceSwitcher />
</div>
```

**If BuildBid has different navigation:**
- Identify the main navigation component
- Add WorkspaceSwitcher in appropriate location
- Follow the pattern from VC Studio integration

#### 6.3 Add Workspaces Menu Item

Find BuildBid's main menu component and add:
```typescript
{ id: 'workspaces', label: 'Workspaces', href: '/workspace' }
```

#### 6.4 Integrate with FileExplorer

**If BuildBid has same FileExplorer structure:**
```bash
cp vc-studio-project/src/components/workspace/FileExplorer.tsx buildbid-project/src/components/workspace/
```

**If BuildBid has different FileExplorer:**
- Add workspace context import
- Add workspace_id filtering to API calls
- Follow VC Studio pattern

#### 6.5 Update Dashboard Menu Items API

**Find BuildBid's dashboard menu-items endpoint:**
```bash
find buildbid-project/src/app/api -name "*menu-items*"
```

**Apply the same changes as VC Studio:**
- Check for active workspace
- Load dashboard config from workspace if available
- Fall back to core_config

### Step 7: Migration Script (Day 2)

**Duration:** 1 hour

#### 7.1 Copy and Customize Migration Script

```bash
cp vc-studio-project/src/scripts/migrate-stakeholders-to-workspaces.ts buildbid-project/src/scripts/migrate-buildbid-stakeholders-to-workspaces.ts
```

#### 7.2 Update App Code

```typescript
// Change app code from VC_STUDIO to BUILDBID
const { data: app, error: appError } = await supabase
  .from('applications')
  .select('id')
  .eq('app_code', 'BUILDBID')  // Changed from 'VC_STUDIO'
  .single();
```

#### 7.3 Test Migration Script

```bash
# Dry run first (if you add dry-run mode)
node --loader ts-node/esm src/scripts/migrate-buildbid-stakeholders-to-workspaces.ts --dry-run

# Actual migration
node --loader ts-node/esm src/scripts/migrate-buildbid-stakeholders-to-workspaces.ts
```

### Step 8: Testing (Day 2-3)

**Duration:** 4-6 hours

See [Testing Strategy section](#testing-strategy)

---

## BuildBid-Specific Customizations

### 1. Seed Data (MUST CUSTOMIZE)

The only major customization needed is BuildBid-specific templates and configurations.

#### BuildBid Roles
Based on typical BuildBid workflows:
- `contractor` - Building contractors
- `producer` - Project producers
- `administrator` - System administrators
- `consultant` - External consultants
- `viewer` - Read-only users

#### Dashboard Configurations Needed

**Contractor Dashboard:**
```json
{
  "role_configurations": {
    "contractor": {
      "dashboard_name": "Contractor Dashboard",
      "menu_items": [
        "project_overview",
        "file_explorer",
        "bid_management",
        "workflow_tasks",
        "schedule_view"
      ],
      "workspace_layout": {
        "sidebar_width": "250px",
        "theme": "light"
      },
      "widgets": ["upcoming_deadlines", "recent_bids"]
    }
  }
}
```

**Producer Dashboard:**
```json
{
  "role_configurations": {
    "producer": {
      "dashboard_name": "Producer Dashboard",
      "menu_items": [
        "project_pipeline",
        "file_explorer",
        "contractor_management",
        "budget_tracker",
        "workflow_tasks"
      ],
      "workspace_layout": {
        "sidebar_width": "280px",
        "theme": "light"
      },
      "widgets": ["project_status", "budget_overview"]
    }
  }
}
```

#### File Structure Templates Needed

**Construction Project Structure:**
```json
{
  "name": "Construction Project",
  "description": "Standard construction project structure",
  "folders": [
    {
      "name": "Bids",
      "description": "Bid documents and proposals",
      "folders": [
        {"name": "Submitted", "folders": []},
        {"name": "In Progress", "folders": []},
        {"name": "Archived", "folders": []}
      ]
    },
    {
      "name": "Contracts",
      "description": "Contract documents",
      "folders": []
    },
    {
      "name": "Plans",
      "description": "Project plans and blueprints",
      "folders": [
        {"name": "Architectural", "folders": []},
        {"name": "Structural", "folders": []},
        {"name": "MEP", "folders": []}
      ]
    },
    {
      "name": "Permits",
      "description": "Building permits and approvals",
      "folders": []
    },
    {
      "name": "Reports",
      "description": "Progress reports and documentation",
      "folders": [
        {"name": "Daily Reports", "folders": []},
        {"name": "Inspections", "folders": []},
        {"name": "Safety", "folders": []}
      ]
    }
  ]
}
```

**Bid Management Structure:**
```json
{
  "name": "Bid Management",
  "description": "Bid preparation and submission",
  "folders": [
    {"name": "RFPs", "description": "Request for Proposals", "folders": []},
    {"name": "Cost Estimates", "folders": []},
    {"name": "Proposals", "folders": []},
    {"name": "Awards", "folders": []}
  ]
}
```

#### Workspace Templates Needed

1. **"BuildBid Contractor Workspace"** (featured)
   - Contractor dashboard config
   - Construction project file structure
   - Bid management workflows

2. **"BuildBid Producer Workspace"** (featured)
   - Producer dashboard config
   - Project pipeline structure
   - Budget tracking workflows

3. **"BuildBid Administrator Workspace"**
   - Admin dashboard config
   - Administrative file structure
   - User management workflows

### 2. Integration Points (MAY NEED ADJUSTMENT)

#### Navigation Paths
If BuildBid uses different routing:

**VC Studio:**
- `/dashboard/admin`
- `/dashboard/stakeholder`

**BuildBid (if different):**
- `/dashboard/contractor`
- `/dashboard/producer`

**Adjustment:** Update WorkspaceSwitcher navigation logic if needed.

#### Component Names
If BuildBid uses different component codes:

**VC Studio:**
- `file_explorer`
- `workflow_tasks`
- `vc_pyramid`

**BuildBid:**
- `project_overview`
- `bid_management`
- `schedule_view`

**Adjustment:** Update component_id mappings in dashboard configs.

#### Role Codes
Ensure role codes match BuildBid's stakeholder_roles table:

```sql
-- Check existing BuildBid roles
SELECT DISTINCT role_type FROM stakeholder_roles
WHERE app_uuid = (SELECT id FROM applications WHERE app_code = 'BUILDBID');
```

---

## File Migration Checklist

### Database Migrations
- [ ] `20251215_create_workspaces_table.sql`
- [ ] `20251215_create_workspace_configurations_tables.sql`
- [ ] `20251215_create_workspace_configurations_junction.sql`
- [ ] `20251215_create_workspace_templates_table.sql`
- [ ] `20251215_create_workspace_access_control_table.sql`
- [ ] `20251215_extend_audit_logs_for_workspaces.sql`
- [ ] `20251216_workspace_rls_policies.sql`
- [ ] `20251216_workspace_functions.sql`
- [ ] `20251216_workspace_triggers.sql`
- [ ] `20251217_seed_buildbid_workspace_templates.sql` (NEW)

### TypeScript & Utilities
- [ ] `src/lib/types/workspace.ts`
- [ ] `src/lib/utils/workspace-helpers.ts`

### API Routes
- [ ] `src/app/api/workspaces/route.ts`
- [ ] `src/app/api/workspaces/[workspace_id]/route.ts`
- [ ] `src/app/api/workspaces/templates/route.ts`
- [ ] `src/app/api/workspaces/templates/[template_id]/route.ts`
- [ ] `src/app/api/workspaces/[workspace_id]/access/route.ts`
- [ ] `src/app/api/workspaces/[workspace_id]/access/[access_id]/route.ts`
- [ ] `src/app/api/workspaces/[workspace_id]/configurations/route.ts`

### Frontend Components
- [ ] `src/components/workspace/WorkspaceList.tsx`
- [ ] `src/components/workspace/WorkspaceCreationWizard.tsx`
- [ ] `src/components/workspace/WorkspaceAccessManager.tsx`
- [ ] `src/components/workspace/WorkspaceConfigurationPanel.tsx`
- [ ] `src/components/workspace/WorkspaceFileExplorer.tsx`
- [ ] `src/components/workspace/WorkspaceSwitcher.tsx`

### Context & Pages
- [ ] `src/contexts/WorkspaceContext.tsx`
- [ ] `src/app/workspace/page.tsx`
- [ ] `src/app/workspace/[workspace_id]/page.tsx`

### Scripts
- [ ] `src/scripts/migrate-buildbid-stakeholders-to-workspaces.ts` (CUSTOMIZE)

### Integration (IDENTIFY & MODIFY)
- [ ] BuildBid header/navigation component
- [ ] BuildBid menu component
- [ ] BuildBid file explorer component
- [ ] BuildBid dashboard menu-items API
- [ ] BuildBid stakeholder dashboard page

---

## Seed Data Requirements

### Complete BuildBid Seed Data SQL

Create file: `supabase/migrations/20251217_seed_buildbid_workspace_templates.sql`

```sql
-- Seed BuildBid Workspace Templates
-- Get BuildBid app UUID

DO $$
DECLARE
  v_app_uuid UUID;
  v_contractor_dashboard_id UUID;
  v_producer_dashboard_id UUID;
  v_admin_dashboard_id UUID;
  v_construction_template_id UUID;
  v_bid_template_id UUID;
  v_project_pipeline_template_id UUID;
BEGIN
  -- Get BuildBid application UUID
  SELECT id INTO v_app_uuid FROM applications WHERE app_code = 'BUILDBID';

  IF v_app_uuid IS NULL THEN
    RAISE EXCEPTION 'BuildBid application not found';
  END IF;

  -- Create Dashboard Configurations

  -- 1. Contractor Dashboard
  INSERT INTO workspace_dashboard_configurations (
    app_uuid,
    configuration_name,
    description,
    configuration_data,
    version
  ) VALUES (
    v_app_uuid,
    'BuildBid Contractor Dashboard',
    'Default dashboard configuration for contractors',
    '{
      "role_configurations": {
        "contractor": {
          "dashboard_name": "Contractor Dashboard",
          "menu_items": [
            "project_overview",
            "file_explorer",
            "bid_management",
            "workflow_tasks",
            "schedule_view"
          ],
          "workspace_layout": {
            "sidebar_width": "250px",
            "theme": "light",
            "show_notifications": true,
            "default_component": "project_overview"
          },
          "widgets": [
            {"type": "upcoming_deadlines", "position": 1},
            {"type": "recent_bids", "position": 2}
          ]
        }
      }
    }'::jsonb,
    1
  ) RETURNING id INTO v_contractor_dashboard_id;

  -- 2. Producer Dashboard
  INSERT INTO workspace_dashboard_configurations (
    app_uuid,
    configuration_name,
    description,
    configuration_data,
    version
  ) VALUES (
    v_app_uuid,
    'BuildBid Producer Dashboard',
    'Default dashboard configuration for producers',
    '{
      "role_configurations": {
        "producer": {
          "dashboard_name": "Producer Dashboard",
          "menu_items": [
            "project_pipeline",
            "file_explorer",
            "contractor_management",
            "budget_tracker",
            "workflow_tasks"
          ],
          "workspace_layout": {
            "sidebar_width": "280px",
            "theme": "light",
            "show_notifications": true,
            "default_component": "project_pipeline"
          },
          "widgets": [
            {"type": "project_status", "position": 1},
            {"type": "budget_overview", "position": 2}
          ]
        }
      }
    }'::jsonb,
    1
  ) RETURNING id INTO v_producer_dashboard_id;

  -- 3. Administrator Dashboard
  INSERT INTO workspace_dashboard_configurations (
    app_uuid,
    configuration_name,
    description,
    configuration_data,
    version
  ) VALUES (
    v_app_uuid,
    'BuildBid Administrator Dashboard',
    'Default dashboard configuration for administrators',
    '{
      "role_configurations": {
        "administrator": {
          "dashboard_name": "Administrator Dashboard",
          "menu_items": [
            "file_explorer",
            "user_management",
            "workflow_tasks",
            "system_settings"
          ],
          "workspace_layout": {
            "sidebar_width": "250px",
            "theme": "light",
            "show_notifications": true,
            "default_component": "file_explorer"
          },
          "widgets": []
        }
      }
    }'::jsonb,
    1
  ) RETURNING id INTO v_admin_dashboard_id;

  -- Create File Structure Templates

  -- 1. Construction Project Structure
  INSERT INTO workspace_file_structure_templates (
    app_uuid,
    template_name,
    description,
    structure_data,
    applicable_roles
  ) VALUES (
    v_app_uuid,
    'Construction Project Structure',
    'Standard folder structure for construction projects',
    '{
      "name": "Construction Project",
      "description": "Root folder for construction project",
      "folders": [
        {
          "name": "Bids",
          "description": "Bid documents and proposals",
          "folders": [
            {"name": "Submitted", "description": "Submitted bids", "folders": []},
            {"name": "In Progress", "description": "Bids in preparation", "folders": []},
            {"name": "Archived", "description": "Historical bids", "folders": []}
          ]
        },
        {
          "name": "Contracts",
          "description": "Contract documents and agreements",
          "folders": []
        },
        {
          "name": "Plans",
          "description": "Project plans and blueprints",
          "folders": [
            {"name": "Architectural", "description": "Architectural drawings", "folders": []},
            {"name": "Structural", "description": "Structural plans", "folders": []},
            {"name": "MEP", "description": "Mechanical, Electrical, Plumbing", "folders": []}
          ]
        },
        {
          "name": "Permits",
          "description": "Building permits and approvals",
          "folders": []
        },
        {
          "name": "Reports",
          "description": "Progress reports and documentation",
          "folders": [
            {"name": "Daily Reports", "description": "Daily progress reports", "folders": []},
            {"name": "Inspections", "description": "Inspection reports", "folders": []},
            {"name": "Safety", "description": "Safety reports and incidents", "folders": []}
          ]
        },
        {
          "name": "Photos",
          "description": "Project photography",
          "folders": [
            {"name": "Progress", "folders": []},
            {"name": "Completion", "folders": []}
          ]
        }
      ]
    }'::jsonb,
    ARRAY['contractor', 'producer', 'administrator']
  ) RETURNING id INTO v_construction_template_id;

  -- 2. Bid Management Structure
  INSERT INTO workspace_file_structure_templates (
    app_uuid,
    template_name,
    description,
    structure_data,
    applicable_roles
  ) VALUES (
    v_app_uuid,
    'Bid Management Structure',
    'Folder structure for bid preparation and submission',
    '{
      "name": "Bid Management",
      "description": "Root folder for bid management",
      "folders": [
        {
          "name": "RFPs",
          "description": "Request for Proposals",
          "folders": []
        },
        {
          "name": "Cost Estimates",
          "description": "Project cost estimates",
          "folders": []
        },
        {
          "name": "Proposals",
          "description": "Bid proposals",
          "folders": [
            {"name": "Drafts", "folders": []},
            {"name": "Final", "folders": []}
          ]
        },
        {
          "name": "Awards",
          "description": "Awarded contracts",
          "folders": []
        },
        {
          "name": "Reference Materials",
          "description": "Reference documents and templates",
          "folders": []
        }
      ]
    }'::jsonb,
    ARRAY['contractor', 'producer']
  ) RETURNING id INTO v_bid_template_id;

  -- 3. Project Pipeline Structure
  INSERT INTO workspace_file_structure_templates (
    app_uuid,
    template_name,
    description,
    structure_data,
    applicable_roles
  ) VALUES (
    v_app_uuid,
    'Project Pipeline Structure',
    'Folder structure for managing project pipeline',
    '{
      "name": "Project Pipeline",
      "description": "Root folder for project pipeline",
      "folders": [
        {
          "name": "Opportunities",
          "description": "Potential projects",
          "folders": []
        },
        {
          "name": "Active Projects",
          "description": "Currently active projects",
          "folders": []
        },
        {
          "name": "Completed Projects",
          "description": "Finished projects",
          "folders": []
        },
        {
          "name": "Templates",
          "description": "Project templates and standards",
          "folders": []
        }
      ]
    }'::jsonb,
    ARRAY['producer', 'administrator']
  ) RETURNING id INTO v_project_pipeline_template_id;

  -- Create Business Services Configurations

  INSERT INTO workspace_business_services_configurations (
    app_uuid,
    configuration_name,
    description,
    services_data
  ) VALUES
  (
    v_app_uuid,
    'BuildBid Contractor Workflows',
    'Standard workflows for contractors',
    '{
      "workflows": [
        {
          "name": "bid_submission",
          "description": "Bid submission and approval workflow",
          "steps": ["prepare", "review", "submit", "follow_up"]
        },
        {
          "name": "project_execution",
          "description": "Project execution workflow",
          "steps": ["planning", "execution", "monitoring", "completion"]
        }
      ],
      "notifications": {
        "bid_awarded": {"enabled": true, "channels": ["email", "in_app"]},
        "deadline_reminder": {"enabled": true, "channels": ["email", "in_app"]}
      }
    }'::jsonb
  ),
  (
    v_app_uuid,
    'BuildBid Producer Workflows',
    'Standard workflows for producers',
    '{
      "workflows": [
        {
          "name": "project_initiation",
          "description": "New project setup workflow",
          "steps": ["planning", "budgeting", "contractor_selection", "kickoff"]
        },
        {
          "name": "contractor_evaluation",
          "description": "Contractor bid evaluation",
          "steps": ["review", "scoring", "selection", "award"]
        }
      ],
      "notifications": {
        "new_bid_received": {"enabled": true, "channels": ["email"]},
        "project_milestone": {"enabled": true, "channels": ["email", "in_app"]}
      }
    }'::jsonb
  );

  -- Create Workspace Templates

  -- 1. BuildBid Contractor Workspace (Featured)
  INSERT INTO workspace_templates (
    app_uuid,
    template_name,
    description,
    dashboard_config_id,
    file_structure_template_id,
    business_services_config_id,
    is_featured,
    category,
    icon_name
  ) VALUES (
    v_app_uuid,
    'BuildBid Contractor Workspace',
    'Complete workspace for contractors with bid management and project tracking',
    v_contractor_dashboard_id,
    v_construction_template_id,
    (SELECT id FROM workspace_business_services_configurations WHERE configuration_name = 'BuildBid Contractor Workflows'),
    true,
    'contractor',
    'hammer'
  );

  -- 2. BuildBid Producer Workspace (Featured)
  INSERT INTO workspace_templates (
    app_uuid,
    template_name,
    description,
    dashboard_config_id,
    file_structure_template_id,
    business_services_config_id,
    is_featured,
    category,
    icon_name
  ) VALUES (
    v_app_uuid,
    'BuildBid Producer Workspace',
    'Complete workspace for producers with project pipeline and contractor management',
    v_producer_dashboard_id,
    v_project_pipeline_template_id,
    (SELECT id FROM workspace_business_services_configurations WHERE configuration_name = 'BuildBid Producer Workflows'),
    true,
    'producer',
    'briefcase'
  );

  -- 3. BuildBid Administrator Workspace
  INSERT INTO workspace_templates (
    app_uuid,
    template_name,
    description,
    dashboard_config_id,
    file_structure_template_id,
    is_featured,
    category,
    icon_name
  ) VALUES (
    v_app_uuid,
    'BuildBid Administrator Workspace',
    'Administrative workspace for system management',
    v_admin_dashboard_id,
    v_construction_template_id,
    false,
    'administration',
    'shield'
  );

  -- 4. BuildBid Bid Management Workspace
  INSERT INTO workspace_templates (
    app_uuid,
    template_name,
    description,
    dashboard_config_id,
    file_structure_template_id,
    business_services_config_id,
    is_featured,
    category,
    icon_name
  ) VALUES (
    v_app_uuid,
    'BuildBid Bid Management Workspace',
    'Focused workspace for bid preparation and submission',
    v_contractor_dashboard_id,
    v_bid_template_id,
    (SELECT id FROM workspace_business_services_configurations WHERE configuration_name = 'BuildBid Contractor Workflows'),
    false,
    'contractor',
    'file-text'
  );

  RAISE NOTICE 'BuildBid workspace templates seeded successfully';
  RAISE NOTICE 'Created % dashboard configs', 3;
  RAISE NOTICE 'Created % file structure templates', 3;
  RAISE NOTICE 'Created % workspace templates', 4;

END $$;
```

---

## Integration Points

### 1. BuildBid Navigation Components

**Identify:**
```bash
cd buildbid-project
grep -r "AdminHeader\|Navigation\|Menu" src/components/
```

**Expected Components:**
- `src/components/admin/AdminHeader.tsx` or similar
- `src/components/admin/AdminMenu.tsx` or similar

**Integration Required:**
1. Import WorkspaceSwitcher
2. Add to header/navigation
3. Add "Workspaces" menu item

### 2. BuildBid Dashboard System

**Identify:**
```bash
grep -r "dashboard.*menu.*items\|core_config" src/app/api/
```

**Expected Files:**
- `src/app/api/dashboard/menu-items/route.ts` or similar

**Integration Required:**
1. Add workspace config check
2. Load from workspace_dashboard_configurations if available
3. Fall back to stakeholders.core_config

### 3. BuildBid FileExplorer

**Identify:**
```bash
find src/components -name "*FileExplorer*" -o -name "*FileBrowser*"
```

**Integration Required:**
1. Add WorkspaceContext usage
2. Add workspace_id filtering to API calls
3. Wrap in WorkspaceProvider

### 4. BuildBid Stakeholder Dashboard

**Identify:**
```bash
find src/app/dashboard -name "page.tsx"
```

**Integration Required:**
1. Import WorkspaceSwitcher
2. Add to sidebar/header
3. Wrap in WorkspaceProvider

---

## Testing Strategy

### Day 2-3: Comprehensive Testing

#### 1. Database Testing (1 hour)

```sql
-- Verify all tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'workspace%';

-- Check RLS policies
SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename LIKE 'workspace%';

-- Test provision_workspace function
SELECT * FROM provision_workspace(
  'Test BuildBid Workspace',
  (SELECT id FROM stakeholders LIMIT 1),
  (SELECT id FROM applications WHERE app_code = 'BUILDBID'),
  'contractor',
  (SELECT id FROM workspace_templates WHERE template_name = 'BuildBid Contractor Workspace'),
  'Test workspace for contractor'
);

-- Verify workspace created
SELECT * FROM workspaces ORDER BY created_at DESC LIMIT 1;

-- Check file structure applied
SELECT * FROM nodes WHERE workspace_id = (SELECT id FROM workspaces ORDER BY created_at DESC LIMIT 1);
```

#### 2. API Testing (2 hours)

Test all endpoints with BuildBid context:

```bash
# Get BuildBid app token
TOKEN="your-buildbid-user-token"

# List templates
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/workspaces/templates

# Create workspace
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My BuildBid Workspace",
    "primary_role_code": "contractor",
    "template_id": "template-uuid"
  }' \
  http://localhost:3000/api/workspaces

# List workspaces
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/workspaces

# Get workspace details
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/workspaces/{workspace-id}

# Invite user
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "access_role": "collaborator"
  }' \
  http://localhost:3000/api/workspaces/{workspace-id}/access
```

#### 3. Frontend Testing (2 hours)

**Manual Testing Checklist:**

- [ ] Navigate to `/workspace` page
- [ ] Click "Create Workspace"
- [ ] Fill in workspace details
- [ ] Select BuildBid template
- [ ] Submit and verify creation
- [ ] Check file structure created
- [ ] Verify dashboard loads
- [ ] Test WorkspaceSwitcher
- [ ] Invite collaborator
- [ ] Test collaborator access
- [ ] Update workspace settings
- [ ] Test workspace switching
- [ ] Verify files filter by workspace

#### 4. Migration Testing (1 hour)

```bash
# Run migration script
node --loader ts-node/esm src/scripts/migrate-buildbid-stakeholders-to-workspaces.ts

# Verify results
# Check migration output for:
# - Total stakeholders processed
# - Successful migrations
# - Skipped (already exists)
# - Failed migrations

# Query database
SELECT
  s.name,
  s.reference,
  w.name as workspace_name,
  w.reference as workspace_ref
FROM stakeholders s
LEFT JOIN workspaces w ON w.owner_stakeholder_id = s.id
WHERE w.app_uuid = (SELECT id FROM applications WHERE app_code = 'BUILDBID')
ORDER BY s.created_at;
```

#### 5. Integration Testing (1-2 hours)

Test full user flows:

**Contractor Flow:**
1. Login as BuildBid contractor
2. Navigate to dashboard
3. See WorkspaceSwitcher in navigation
4. Create new workspace from "BuildBid Contractor Workspace" template
5. Verify folder structure created
6. Upload file to workspace
7. Invite collaborator
8. Switch between workspaces
9. Verify files filtered correctly

**Producer Flow:**
1. Login as BuildBid producer
2. Create workspace from "BuildBid Producer Workspace" template
3. Verify different dashboard layout
4. Test file management
5. Invite contractor to workspace
6. Test permission management

#### 6. Cross-App Isolation Testing (30 minutes)

**Critical:** Verify BuildBid and VC Studio workspaces are isolated:

```sql
-- User should only see their app's workspaces
-- Login as VC Studio user
SELECT * FROM workspaces;
-- Should only show VC Studio workspaces

-- Login as BuildBid user
SELECT * FROM workspaces;
-- Should only show BuildBid workspaces

-- Verify RLS prevents cross-app access
-- Try to access BuildBid workspace from VC Studio user (should fail)
```

---

## Timeline

### Day 1: Core Migration (6-8 hours)

**Morning (4 hours):**
- [ ] Copy database migrations (30 min)
- [ ] Create BuildBid seed data (2 hours)
- [ ] Run migrations (30 min)
- [ ] Verify database (30 min)
- [ ] Copy TypeScript types (15 min)
- [ ] Copy utilities (15 min)

**Afternoon (4 hours):**
- [ ] Copy API routes (1 hour)
- [ ] Test API endpoints (30 min)
- [ ] Copy frontend components (1 hour)
- [ ] Copy context (15 min)
- [ ] Copy pages (30 min)
- [ ] Initial build test (30 min)

### Day 2: Integration & Testing (6-8 hours)

**Morning (4 hours):**
- [ ] Identify BuildBid navigation (30 min)
- [ ] Integrate WorkspaceSwitcher (1 hour)
- [ ] Add workspaces menu item (30 min)
- [ ] Integrate FileExplorer (1 hour)
- [ ] Update dashboard routing (1 hour)

**Afternoon (4 hours):**
- [ ] Copy and customize migration script (1 hour)
- [ ] Database testing (1 hour)
- [ ] API testing (1 hour)
- [ ] Frontend testing (1 hour)

### Day 3: Final Testing & Deployment (4-6 hours)

**All Day:**
- [ ] Integration testing (2 hours)
- [ ] Cross-app isolation testing (1 hour)
- [ ] Bug fixes (1-2 hours)
- [ ] Run migration script (1 hour)
- [ ] Final verification (1 hour)

**Total Estimated Time:** 16-22 hours (2-3 days)

---

## Risk Assessment

### Low Risk ✅
- Database schema (100% reusable)
- API routes (100% reusable)
- Frontend components (100% reusable)
- TypeScript types (100% reusable)

### Medium Risk ⚠️
- Navigation integration (depends on BuildBid structure)
- Dashboard routing (depends on existing implementation)
- FileExplorer integration (depends on component structure)

### Mitigation Strategies

**If BuildBid structure is different:**
1. Use VC Studio implementation as reference
2. Follow same patterns
3. Test incrementally
4. Ask for help if stuck

**If components don't exist:**
1. Copy VC Studio components
2. Adjust styling to match BuildBid
3. Update imports

**If integration is complex:**
1. Start with minimal integration
2. Add WorkspaceSwitcher to one location first
3. Expand gradually

---

## Success Criteria

### ✅ Complete When:

1. **Database:**
   - [ ] All 10 migrations run successfully
   - [ ] BuildBid templates created
   - [ ] RLS policies working

2. **API:**
   - [ ] All 7 endpoints accessible
   - [ ] Returns BuildBid data only
   - [ ] Proper app_uuid filtering

3. **Frontend:**
   - [ ] Workspace pages load
   - [ ] Can create BuildBid workspace
   - [ ] Can select BuildBid templates
   - [ ] WorkspaceSwitcher visible

4. **Integration:**
   - [ ] Navigation includes workspaces
   - [ ] FileExplorer filters by workspace
   - [ ] Dashboard loads workspace config

5. **Migration:**
   - [ ] All BuildBid stakeholders migrated
   - [ ] No errors in migration
   - [ ] Workspaces created correctly

6. **Testing:**
   - [ ] All manual tests pass
   - [ ] No console errors
   - [ ] Cross-app isolation verified

---

## Conclusion

Migrating the workspace functionality to BuildBid is **straightforward** because:

1. **85% of code is reusable** without changes
2. **App-agnostic architecture** designed for multi-tenancy
3. **Main work is seed data** (BuildBid-specific templates)
4. **Integration follows same patterns** as VC Studio

**Estimated Effort:** 2-3 days vs 18-22 days for initial development

**Complexity:** LOW-MEDIUM

**Risk:** LOW

The workspace system was designed from the ground up to support multiple applications with data isolation, making this migration much simpler than building from scratch.

---

**Next Steps:**

1. Review this plan
2. Confirm BuildBid codebase structure matches VC Studio
3. Schedule 2-3 day migration window
4. Execute migration following this plan
5. Test thoroughly
6. Deploy to production

