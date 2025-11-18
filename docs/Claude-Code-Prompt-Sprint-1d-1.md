# Sprint 1d.1: Database Schema Implementation
## Cursor Prompt (Copy & Paste)

---

**You are implementing Sprint 1d.1 of the Phase 1d Workflow Management System using Cursor.**

## Task Summary

Create the complete PostgreSQL database schema for workflow orchestration. This is the foundational database layer for the workflow engine, registry, and audit system.

**Branch name:** `feature/1d-1-database-schema`

**Deliverable:** Single SQL migration file in `supabase/migrations/` directory with complete workflow schema

---

## What to Build

### 6 Database Tables

1. **workflow_definitions** - Workflow blueprints (outer JSON)
   - id, app_code, workflow_code, name, description, model_structure (JSONB), version, status, l4_operation_code, created_at, created_by, updated_at, updated_by, is_active

2. **workflow_instances** - Runtime instances (state machine)
   - id, app_code, workflow_definition_id, workflow_code, current_node_id, input_data (JSONB), status, error_message, initiated_by, initiated_at, completed_at, suspended_at, created_at, updated_at, is_active

3. **instance_tasks** - Work tokens for individual tasks
   - id, app_code, workflow_instance_id, workflow_code, function_code, node_id, task_type, status, input_data (JSONB), output_data (JSONB), assigned_to, assigned_at, started_at, completed_at, error_message, created_at, updated_at, is_active

4. **instance_context** - Workflow execution data (accumulated)
   - id, app_code, workflow_instance_id, context_data (JSONB), version (INTEGER), updated_at, created_at

5. **workflow_history** - Immutable audit log
   - id, app_code, workflow_instance_id, event_type, node_id, task_id, from_node_id, to_node_id, description, metadata (JSONB), actor_id, event_timestamp, created_at

6. **function_registry** - Execution contracts for all functions
   - id, app_code, function_code, implementation_type, endpoint_or_path, input_schema (JSONB), output_schema (JSONB), ui_widget_id, ui_definitions (JSONB), description, version, tags (TEXT[]), timeout_seconds, retry_count, is_active, created_at, created_by, updated_at, updated_by

---

## Constraints & Relationships

**workflow_definitions**
- PRIMARY KEY: id
- UNIQUE: (app_code, workflow_code, version)
- CHECK: status IN ('DRAFT', 'ACTIVE', 'DEPRECATED')
- FK: app_code → applications.app_code

**workflow_instances**
- PRIMARY KEY: id
- CHECK: status IN ('RUNNING', 'COMPLETED', 'SUSPENDED', 'ERROR')
- FK: app_code → applications.app_code
- FK: workflow_definition_id → workflow_definitions.id

**instance_tasks**
- PRIMARY KEY: id
- CHECK: status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')
- CHECK: task_type IN ('USER_TASK', 'SERVICE_TASK', 'AI_AGENT_TASK')
- FK: app_code → applications.app_code
- FK: workflow_instance_id → workflow_instances.id
- FK: function_code → function_registry.function_code

**instance_context**
- PRIMARY KEY: id
- UNIQUE: (workflow_instance_id, version)
- FK: app_code → applications.app_code
- FK: workflow_instance_id → workflow_instances.id

**workflow_history**
- PRIMARY KEY: id
- CHECK: event_type IN ('INSTANCE_CREATED', 'NODE_ENTERED', 'TASK_CREATED', 'TASK_COMPLETED', 'TASK_FAILED', 'TRANSITION', 'INSTANCE_COMPLETED', 'INSTANCE_SUSPENDED')
- FK: app_code → applications.app_code
- FK: workflow_instance_id → workflow_instances.id
- FK: task_id → instance_tasks.id

**function_registry**
- PRIMARY KEY: id
- UNIQUE: (app_code, function_code)
- CHECK: implementation_type IN ('USER_TASK', 'SERVICE_TASK', 'AI_AGENT_TASK')
- FK: app_code → applications.app_code (allow NULL for shared functions)

---

## Indexes Required

```
workflow_definitions:
  - (app_code, status)
  - (app_code, workflow_code, version)

workflow_instances:
  - (app_code, status)
  - (app_code, initiated_at DESC)
  - (current_node_id)

instance_tasks:
  - (app_code, status)
  - (app_code, assigned_to, status)
  - (workflow_instance_id, node_id)

instance_context:
  - (app_code, workflow_instance_id)
  - (workflow_instance_id, version DESC)

workflow_history:
  - (app_code, workflow_instance_id, event_timestamp)
  - (app_code, event_timestamp DESC)

function_registry:
  - (app_code, is_active)
  - (app_code, implementation_type)
```

---

## Row-Level Security

Enable RLS on all 6 tables:

```
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE instance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE instance_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE function_registry ENABLE ROW LEVEL SECURITY;
```

Create policy for each table (example pattern):

```sql
CREATE POLICY "app_isolation" ON workflow_definitions
  USING (app_code = auth.jwt() ->> 'app_code')
  WITH CHECK (app_code = auth.jwt() ->> 'app_code');
```

Apply identical policy to all 6 tables. For function_registry, also allow app_code = NULL (shared functions).

---

## Multi-Tenancy Verification

Every table must have:
- `app_code TEXT NOT NULL` column
- Foreign key constraint: `app_code → applications.app_code`
- RLS policy enforcing `app_code = auth.jwt() ->> 'app_code'`
- Included in primary lookup indexes

---

## Deliverable

**Single SQL migration file:**
- Location: `supabase/migrations/`
- Naming: `20251120_phase1d_workflow_tables.sql` (use today's date)
- Content: All 6 CREATE TABLE statements + indexes + RLS policies
- Style: Well-commented, section headers, idempotent

**File must:**
- Be valid PostgreSQL syntax
- Run without errors on Supabase
- Include inline comments explaining each table's purpose
- Be idempotent (can run multiple times safely)

---

## Success Criteria (Verify Before Pushing)

- [ ] All 6 tables created successfully
- [ ] All columns present with correct data types
- [ ] All PRIMARY KEY constraints applied
- [ ] All UNIQUE constraints applied
- [ ] All CHECK constraints applied
- [ ] All FOREIGN KEY constraints applied
- [ ] All indexes created
- [ ] RLS policies enabled and correct
- [ ] app_code in all tables with proper FK and RLS
- [ ] SQL file is well-commented and clear

---

## Git Instructions (Local Cursor Workflow)

1. Create feature branch locally: `git checkout -b feature/1d-1-database-schema`
2. Use Cursor to create SQL file: `supabase/migrations/20251120_phase1d_workflow_tables.sql`
3. Implement all 6 tables and indexes (this specification)
4. Add clear comments throughout SQL
5. Run migration locally against Supabase development instance (verify it works)
6. Fix any issues immediately in Cursor
7. When complete and tested, commit: `git add . && git commit -m "Sprint 1d.1: Workflow Management System database schema - 6 core tables with multi-tenancy and RLS"`
8. Push to feature branch: `git push origin feature/1d-1-database-schema`

---

## What NOT to Do

- Don't create API endpoints (that's Sprint 1d.2)
- Don't create UI components (that's Sprint 1d.4)
- Don't write TypeScript/React code
- Don't add application logic or triggers
- Don't create test files

**Just the database schema. That's it.**

---

## Workflow with Cursor

1. Open this entire prompt in Cursor
2. Create the feature branch: `git checkout -b feature/1d-1-database-schema`
3. Create SQL migration file in `supabase/migrations/20251120_phase1d_workflow_tables.sql`
4. Use Cursor's inline editing to implement the SQL schema
5. Test locally: Run migrations against your Supabase development instance
6. Fix any issues directly in Cursor
7. When tested and working, commit and push to feature branch
8. I'll pull the branch locally and do final verification with full testing

---

## Questions?

If anything is unclear, ask for clarification in Cursor before implementing. Otherwise, proceed with the SQL migration file.

When complete, tested, and pushed to feature branch, I'll bring it down locally and run comprehensive tests.
