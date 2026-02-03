# FLM Phase 1: Database Foundation - Build Specification

**Sprint:** FLM Component Suite - Phase 1  
**Duration:** 1 day  
**Execution Model:** Complete → Test → Stop → Report

---

## Objective

Update existing VC Studio database tables to support the FLM 8-stage workflow with file system as primary document storage and database for workflow metadata.

---

## Pre-Implementation Checklist

- [ ] Review current vc_models table structure
- [ ] Review current flm_models table structure
- [ ] Review current flm_artefacts table structure
- [ ] Review current flm_source_documents table (to be removed)
- [ ] Confirm file system directory structure implemented
- [ ] Backup database before schema changes

---

## Architecture Decisions

### File System vs Database

**File System (Primary Storage):**
- All .json files (compact, machine-readable)
- All .docx files (human-readable versions)
- All uploaded source documents
- Directory structure defined in vc_models creation

**Database (Workflow Metadata):**
- Workflow state tracking (current_step, status)
- Artefact metadata (version, confirmed_by, confirmed_at)
- Relationships and foreign keys
- Fast queries for workflow control

**Why This Works:**
- Single source of truth for documents (file system)
- Fast workflow queries (database indexes)
- Audit trail preserved (metadata in DB)
- No duplication between systems

---

## Database Changes

### 1. Update vc_models Table

**Add element inclusion flags:**

```sql
-- Add columns to track which elements are included in this VC Model
ALTER TABLE vc_models 
ADD COLUMN includes_flm boolean DEFAULT true,
ADD COLUMN includes_transitions boolean DEFAULT false,
ADD COLUMN includes_adg boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN vc_models.includes_flm IS 'Whether this VC Model includes Framework Level Mapping (BVS→L0→L1→L2→Blueprint)';
COMMENT ON COLUMN vc_models.includes_transitions IS 'Whether this VC Model includes Transition tools (Financial forecast, Org structure, etc.)';
COMMENT ON COLUMN vc_models.includes_adg IS 'Whether this VC Model includes Activity Group Models (L3→L6)';
```

**Expected Result:**
- ✅ Three new boolean columns added
- ✅ Default values set (FLM=true, others=false)
- ✅ Comments added for documentation

---

### 2. Update flm_models Table

**Expand current_step to include all 8 stages:**

```sql
-- Drop old constraint
ALTER TABLE flm_models 
DROP CONSTRAINT IF EXISTS flm_models_current_step_check;

-- Add new constraint with expanded stages
ALTER TABLE flm_models 
ADD CONSTRAINT flm_models_current_step_check 
CHECK (
  current_step = ANY(ARRAY[
    'BVS'::text,
    'PRELIMINARY_DBS'::text,
    'DBS_SCHEMA'::text,
    'DBS_COMPLETE'::text,
    'DBS_REVIEW'::text,
    'L0'::text,
    'L1'::text,
    'L2'::text,
    'BLUEPRINT'::text
  ])
);

-- Add comment explaining stage progression
COMMENT ON COLUMN flm_models.current_step IS 'Current workflow stage: BVS → PRELIMINARY_DBS → DBS_SCHEMA → DBS_COMPLETE → DBS_REVIEW → L0 → L1 → L2 → BLUEPRINT';
```

**Expected Result:**
- ✅ Old constraint dropped
- ✅ New constraint includes 9 valid stages
- ✅ Comment documents progression

---

### 3. Update flm_artefacts Table

**Expand artefact_type to match all stages:**

```sql
-- Drop old constraint
ALTER TABLE flm_artefacts 
DROP CONSTRAINT IF EXISTS flm_artefacts_artefact_type_check;

-- Add new constraint with expanded types
ALTER TABLE flm_artefacts 
ADD CONSTRAINT flm_artefacts_artefact_type_check 
CHECK (
  artefact_type = ANY(ARRAY[
    'BVS'::text,
    'PRELIMINARY_DBS'::text,
    'DBS_SCHEMA'::text,
    'DBS_COMPLETE'::text,
    'L0'::text,
    'L1'::text,
    'L2'::text,
    'BLUEPRINT'::text
  ])
);

-- Add comment explaining artefact types
COMMENT ON COLUMN flm_artefacts.artefact_type IS 'Type of FLM artefact stored. Each type has corresponding .json and .docx files in file system.';
COMMENT ON COLUMN flm_artefacts.document_path IS 'Path to human-readable .docx version in file system (e.g., /VC Models/[model-name]/Preliminaries/BVS/Business_Value_Summary.docx)';
```

**Note:** The `artefact_json` column stores the compact JSON. The `document_path` column points to the human-readable .docx in file system.

**Expected Result:**
- ✅ Old constraint dropped
- ✅ New constraint includes 8 artefact types
- ✅ Comments document dual-format approach

---

### 4. Remove flm_source_documents Table

**This table duplicates file system functionality:**

```sql
-- Drop table (CASCADE will remove foreign key references)
DROP TABLE IF EXISTS flm_source_documents CASCADE;
```

**Rationale:**
- Source documents stored in `/VC Models/[model-name]/Preliminaries/BVS/`
- File system already tracks uploaded files
- No need to duplicate file paths in database

**Expected Result:**
- ✅ Table dropped
- ✅ Foreign key constraints removed automatically

---

## VC Model Directory Structure

**This structure is created when vc_model is initialized:**

```
/VC Models/[model-name]/
├── Preliminaries/
│   ├── BVS/
│   │   ├── business_description.txt
│   │   ├── bvs.json
│   │   ├── Business_Value_Summary.docx
│   │   └── [uploaded-source-docs]
│   └── DBS/
│       ├── drafts/
│       │   └── preliminary_dbs.json
│       ├── preliminary_dbs_confirmed.json
│       ├── Preliminary_Business_Summary.docx
│       ├── dbs_schema.json
│       ├── dbs_complete.json
│       ├── dbs_approved.json
│       └── Domain_Business_Summary.docx
├── FLM/
│   ├── L0/
│   │   ├── l0.json
│   │   └── L0_Domain_Study.docx
│   ├── L1/
│   │   ├── l1.json
│   │   └── L1_Strategic_Pillars.docx
│   └── L2/
│       ├── l2.json
│       └── L2_Capability_Matrix.docx
├── Transitions/
│   └── [financial forecasts, org charts, etc.]
├── AGM/              (future - L3→L6)
├── Overlays/         (future)
└── Blueprints/
    ├── blueprint.json
    └── Business_Blueprint.docx
```

**Note:** This structure is defined in the vc_model creation function and should be created automatically.

---

## Stage-to-File Mapping

| Stage | JSON File | DOCX File | Directory |
|-------|-----------|-----------|-----------|
| BVS | bvs.json | Business_Value_Summary.docx | /Preliminaries/BVS/ |
| PRELIMINARY_DBS | preliminary_dbs.json | Preliminary_Business_Summary.docx | /Preliminaries/DBS/ |
| DBS_SCHEMA | dbs_schema.json | - | /Preliminaries/DBS/ |
| DBS_COMPLETE | dbs_complete.json | Domain_Business_Summary.docx | /Preliminaries/DBS/ |
| DBS_REVIEW | dbs_approved.json | - | /Preliminaries/DBS/approved/ |
| L0 | l0.json | L0_Domain_Study.docx | /FLM/L0/ |
| L1 | l1.json | L1_Strategic_Pillars.docx | /FLM/L1/ |
| L2 | l2.json | L2_Capability_Matrix.docx | /FLM/L2/ |
| BLUEPRINT | blueprint.json | Business_Blueprint.docx | /Blueprints/ |

---

## Verification SQL Queries

**After applying changes, run these to verify:**

```sql
-- 1. Check vc_models columns added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'vc_models' 
  AND column_name IN ('includes_flm', 'includes_transitions', 'includes_adg');

-- 2. Check flm_models constraint updated
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'flm_models_current_step_check';

-- 3. Check flm_artefacts constraint updated
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'flm_artefacts_artefact_type_check';

-- 4. Verify flm_source_documents dropped
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'flm_source_documents';
-- Should return 0 rows

-- 5. Test inserting a vc_model with elements
INSERT INTO vc_models (
  model_code, stakeholder_id, app_uuid, model_name,
  includes_flm, includes_transitions, includes_adg
) VALUES (
  'TEST-2026-0001',
  (SELECT id FROM stakeholders LIMIT 1),
  (SELECT app_uuid FROM applications WHERE app_code = 'VC_STUDIO'),
  'Test Model',
  true, true, false
) RETURNING *;
```

---

## Testing Checklist

- [ ] All SQL scripts execute without errors
- [ ] vc_models has 3 new boolean columns
- [ ] flm_models current_step accepts all 9 stages
- [ ] flm_artefacts artefact_type accepts all 8 types
- [ ] flm_source_documents table no longer exists
- [ ] Can insert test vc_model with element flags
- [ ] Can insert test flm_model with new stages
- [ ] Can insert test flm_artefacts with new types
- [ ] All constraints validate correctly
- [ ] All comments added to columns

---

## Rollback Plan

**If issues occur, rollback with:**

```sql
-- Rollback vc_models
ALTER TABLE vc_models 
DROP COLUMN IF EXISTS includes_flm,
DROP COLUMN IF EXISTS includes_transitions,
DROP COLUMN IF EXISTS includes_adg;

-- Rollback flm_models (restore old constraint)
ALTER TABLE flm_models DROP CONSTRAINT IF EXISTS flm_models_current_step_check;
ALTER TABLE flm_models ADD CONSTRAINT flm_models_current_step_check 
CHECK (current_step = ANY(ARRAY['BVS'::text, 'L0'::text, 'L1'::text, 'L2'::text, 'BLUEPRINT'::text]));

-- Rollback flm_artefacts (restore old constraint)
ALTER TABLE flm_artefacts DROP CONSTRAINT IF EXISTS flm_artefacts_artefact_type_check;
ALTER TABLE flm_artefacts ADD CONSTRAINT flm_artefacts_artefact_type_check 
CHECK (artefact_type = ANY(ARRAY['BVS'::text, 'L0'::text, 'L1'::text, 'L2'::text, 'BLUEPRINT'::text]));

-- Recreate flm_source_documents if needed (from backup)
```

---

## Commit Message

```
feat(flm): Update database schema for 8-stage FLM workflow

- Add element flags to vc_models (includes_flm, includes_transitions, includes_adg)
- Expand flm_models.current_step to include all 8 workflow stages
- Expand flm_artefacts.artefact_type to match all stages
- Remove flm_source_documents table (file system handles uploads)
- Add documentation comments to modified columns
- File system is now primary storage for documents
- Database stores workflow metadata only
```

---

## 🛑 STOP POINT 1

**After completing Phase 1:**
1. Run all verification queries
2. Complete testing checklist
3. Commit changes with message above
4. **REPORT COMPLETION** with verification results
5. **WAIT FOR APPROVAL** before proceeding to Phase 2 (UI Components)

---

## Next Phase Preview

**Phase 2: UI Components** will build:
- FLMModelDisplay (progress tracker)
- BVSBuilder (Stage 1)
- PreliminaryDBSReview (Stage 2b)
- DBSForm (Stage 3)
- L0/L1/L2 Builders (Stages 5-7)
- Supporting components (status badges, version history)

**Phase 2 will NOT begin until Phase 1 is approved.**
