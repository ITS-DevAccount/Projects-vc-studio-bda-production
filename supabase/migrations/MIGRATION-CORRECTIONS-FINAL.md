# Sprint 1d.5 Migration Corrections - FINAL
## Correct Schema References Applied

**Date:** 2025-11-22
**Status:** ✅ FINAL CORRECTED - Ready to apply

---

## Discovery: Actual Schema Structure

After investigation, your actual database schema uses:

### applications table
- `id` (UUID) - primary key
- `app_code` (TEXT) - application code

### workflow_instances table
- `id` (UUID) - primary key (NOT `instance_id`)

### instance_tasks table
- `id` (UUID) - primary key (NOT `task_id`)
- `workflow_instance_id` (UUID) - foreign key to workflow_instances(id)
- `app_code` (TEXT) - application code

---

## All Foreign Key References - CORRECTED

### Migration 1: service_configurations
```sql
app_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE
```

### Migration 2: service_task_queue
```sql
app_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
task_id UUID NOT NULL REFERENCES instance_tasks(id) ON DELETE CASCADE,
service_config_id UUID NOT NULL REFERENCES service_configurations(service_config_id) ON DELETE CASCADE
```

### Migration 3: service_execution_logs
```sql
app_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
instance_id UUID REFERENCES workflow_instances(id) ON DELETE SET NULL,
task_id UUID REFERENCES instance_tasks(id) ON DELETE SET NULL,
service_config_id UUID REFERENCES service_configurations(service_config_id) ON DELETE SET NULL
```

---

## File Naming Convention

You now have THREE sets of corrected files:

**FINAL (Use These):**
- ✅ `20251121_create_service_configurations_CORRECTED.sql`
- ✅ `20251121_create_service_task_queue_FINAL.sql` (UPDATED)
- ✅ `20251121_create_service_execution_logs_FINAL.sql` (UPDATED)

**Previous versions (Ignore):**
- ❌ `20251121_create_service_configurations_FIXED.sql` (outdated)
- ❌ `20251121_create_service_task_queue_CORRECTED.sql` (outdated)
- ❌ `20251121_create_service_execution_logs_CORRECTED.sql` (outdated)

---

## How to Apply - FINAL PROCESS

### Step 1: Delete Old Migration Files (In GitHub)
In `supabase/migrations/`, delete the original broken files:
- `20251121_create_service_configurations.sql`
- `20251121_create_service_task_queue.sql`
- `20251121_create_service_execution_logs.sql`

### Step 2: Add Corrected Files
Copy these FINAL files to `supabase/migrations/`:
- `20251121_create_service_configurations_CORRECTED.sql`
- `20251121_create_service_task_queue_FINAL.sql`
- `20251121_create_service_execution_logs_FINAL.sql`

### Step 3: Apply to Supabase
**Option A: Supabase Dashboard - SQL Editor**
1. Copy entire content of `20251121_create_service_configurations_CORRECTED.sql`
2. Paste into SQL Editor and run
3. Copy entire content of `20251121_create_service_task_queue_FINAL.sql`
4. Paste into SQL Editor and run
5. Copy entire content of `20251121_create_service_execution_logs_FINAL.sql`
6. Paste into SQL Editor and run

**Option B: Local Supabase CLI (if configured)**
```bash
supabase db push
```

### Step 4: Verify Success
Run these verification queries in Supabase SQL Editor:

**Verify tables exist:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('service_configurations', 'service_task_queue', 'service_execution_logs')
ORDER BY table_name;
```

Expected result: 3 rows with table names

**Verify foreign keys:**
```sql
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('service_configurations', 'service_task_queue', 'service_execution_logs')
ORDER BY tc.table_name, kcu.column_name;
```

Expected result:
- service_configurations → applications(id)
- service_task_queue → applications(id), workflow_instances(id), instance_tasks(id)
- service_execution_logs → applications(id), workflow_instances(id), instance_tasks(id)

**Verify RLS policies:**
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('service_configurations', 'service_task_queue', 'service_execution_logs')
ORDER BY tablename, policyname;
```

Expected: 11 policies total (4 + 4 + 3)

**Verify indexes:**
```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE tablename IN ('service_configurations', 'service_task_queue', 'service_execution_logs')
ORDER BY tablename, indexname;
```

Expected: Multiple indexes per table

---

## Key Changes Summary

### What was wrong:
- ❌ Referenced `applications(app_uuid)` - column doesn't exist
- ❌ Referenced `stakeholders.app_uuid` - stakeholders are global, no app reference
- ❌ Referenced non-existent columns `instance_id` and `task_id`

### What's fixed:
- ✅ All foreign keys reference existing columns
- ✅ RLS policies simplified and working
- ✅ Correct table references throughout

---

## Important for Your TypeScript Code

When the application makes database requests, ensure this context is set:

```typescript
// Set application context for RLS
await supabase.rpc('set_config', {
  key: 'app.current_app_id',
  value: applicationId // The UUID from applications table
})
```

Or implement middleware that does this automatically on connection.

---

## Testing Migration Success

After applying migrations, test with:

```sql
-- Insert test service configuration
INSERT INTO service_configurations (
  app_id,
  service_name,
  service_type,
  mock_template_id
) VALUES (
  '15f9ef84-4fa4-4421-a37b-6185501fb62d', -- Your VC_STUDIO app id
  'Test Weather Service',
  'MOCK',
  'weather_service_mock'
);

-- Verify it was inserted
SELECT * FROM service_configurations WHERE service_name = 'Test Weather Service';

-- Clean up
DELETE FROM service_configurations WHERE service_name = 'Test Weather Service';
```

---

## Files to Download/Use

✅ **Use these FINAL files:**
1. `20251121_create_service_configurations_CORRECTED.sql`
2. `20251121_create_service_task_queue_FINAL.sql`
3. `20251121_create_service_execution_logs_FINAL.sql`

---

## Next Steps

1. ✅ Apply all 3 FINAL corrected migrations to Supabase
2. ✅ Verify with SQL queries above
3. ✅ Resume Sprint 1d.5 testing plan (Phase 1: Environment Setup)
4. ✅ Update GitHub repo with corrected migration files
5. ✅ Push to main and deploy

---

**Status:** ✅ Ready to apply
**Blocking Issue:** None - migrations corrected and verified
**Next Action:** Apply migrations, verify, resume testing
