# FLM Component Suite - Test Plan

**Project:** VC Studio - FLM Component Suite  
**Test Plan Version:** 1.0  
**Created:** January 2026  
**Status:** Ready for Execution

---

## Test Objectives

This test plan validates the FLM (Framework Level Mapping) Component Suite functionality, ensuring:
1. Data model integrity and versioning
2. UI component functionality and rendering
3. Workflow definition correctness
4. API route functionality and security
5. Multi-tenant isolation
6. End-to-end workflow execution

---

## Test Environment Setup

### Prerequisites
- ✅ Database migrations applied successfully
- ✅ All tables created with correct schema
- ✅ RLS policies enabled
- ✅ Component registry entries created
- ✅ Workflow definitions registered
- ✅ Prompt templates seeded
- ✅ Test user accounts available (2+ stakeholders)
- ✅ API authentication working
- ✅ File upload system functional

### Test Data Requirements
- Test stakeholder accounts (minimum 2)
- Test application UUID (VC_STUDIO)
- Sample business descriptions for BVS
- Sample documents for file upload testing

---

## Test Cases

### 1. Database Schema Tests

#### TC-DB-001: VC Models Table Structure
**Objective:** Verify VC Models table schema is correct

**Steps:**
1. Query `vc_models` table structure
2. Verify all columns exist: `id`, `model_code`, `stakeholder_id`, `app_uuid`, `model_name`, `description`, `status`, `version_number`, `is_current_version`, `parent_version_id`, `created_at`, `updated_at`
3. Verify foreign key constraints: `stakeholder_id` → `stakeholders(id)`, `app_uuid` → `applications(id)`
4. Verify check constraints: `status IN ('INITIATED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED')`
5. Verify indexes exist

**Expected Results:**
- ✅ All columns present with correct types
- ✅ Foreign keys enforced
- ✅ Check constraints working
- ✅ Indexes created

---

#### TC-DB-002: Create VC Model Function
**Objective:** Verify `create_vc_model` database function works

**Steps:**
1. Authenticate as test stakeholder
2. Call `create_vc_model(p_stakeholder_id, p_model_name, p_description, p_app_uuid)`
3. Verify VC Model created with correct `model_code` format (VC-YYYY-NNNN)
4. Verify `version_number = 1`, `is_current_version = true`
5. Verify owner added to `vc_model_collaborators` with role 'OWNER'
6. Verify root directory created in `nodes` table

**Expected Results:**
- ✅ Function executes successfully
- ✅ VC Model created with unique model_code
- ✅ Collaborator record created
- ✅ Root directory created

**Test Data:**
```sql
-- Test call
SELECT create_vc_model(
  'test-stakeholder-id',
  'Test VC Model',
  'Test description',
  'test-app-uuid'
);
```

---

#### TC-DB-003: Unique Current Version Constraint
**Objective:** Verify only one current version per model_code

**Steps:**
1. Create VC Model v1 with model_code 'VC-TEST-0001'
2. Create version 2 with same model_code
3. Verify v1 `is_current_version = false`
4. Verify v2 `is_current_version = true`
5. Attempt to create another current version with same model_code
6. Verify constraint violation

**Expected Results:**
- ✅ Only one current version per model_code
- ✅ Previous versions marked as non-current
- ✅ Constraint prevents duplicate current versions

---

#### TC-DB-004: RLS Policy Enforcement
**Objective:** Verify Row Level Security policies work correctly

**Steps:**
1. Authenticate as Stakeholder A
2. Create VC Model as Stakeholder A
3. Verify Stakeholder A can read/write VC Model
4. Authenticate as Stakeholder B
5. Attempt to read Stakeholder A's VC Model
6. Verify access denied (404 or empty result)
7. Add Stakeholder B as collaborator
8. Verify Stakeholder B can now read VC Model

**Expected Results:**
- ✅ Owners can access their VC Models
- ✅ Non-collaborators cannot access VC Models
- ✅ Collaborators can access shared VC Models
- ✅ RLS policies enforce access control

---

### 2. API Route Tests

#### TC-API-001: List VC Models
**Endpoint:** `GET /api/vc-models`

**Objective:** Verify listing of VC Models for authenticated user

**Steps:**
1. Authenticate as test stakeholder
2. Create 2 VC Models
3. Call `GET /api/vc-models`
4. Verify response contains only user's VC Models
5. Verify response format is correct
6. Verify pagination if implemented

**Expected Results:**
- ✅ Returns 200 OK
- ✅ Returns array of VC Models
- ✅ Only returns VC Models user owns or collaborates on
- ✅ Response includes all required fields

**Test Data:**
```json
// Expected response structure
{
  "data": [
    {
      "id": "uuid",
      "model_code": "VC-2026-0001",
      "model_name": "Test Model",
      "status": "INITIATED",
      ...
    }
  ]
}
```

---

#### TC-API-002: Create VC Model
**Endpoint:** `POST /api/vc-models`

**Objective:** Verify VC Model creation via API

**Steps:**
1. Authenticate as test stakeholder
2. Call `POST /api/vc-models` with payload:
   ```json
   {
     "model_name": "Test VC Model",
     "description": "Test description"
   }
   ```
3. Verify response status 201 Created
4. Verify response contains created VC Model
5. Verify `model_code` generated correctly
6. Verify database record created

**Expected Results:**
- ✅ Returns 201 Created
- ✅ VC Model created in database
- ✅ model_code generated (format: VC-YYYY-NNNN)
- ✅ Owner added as collaborator
- ✅ Root directory created

**Validation:**
- Check `vc_models` table for new record
- Check `vc_model_collaborators` table for owner record
- Check `nodes` table for root directory

---

#### TC-API-003: Get VC Model
**Endpoint:** `GET /api/vc-models/[vcModelId]`

**Objective:** Verify retrieving single VC Model

**Steps:**
1. Create VC Model via API
2. Call `GET /api/vc-models/[vcModelId]`
3. Verify response status 200 OK
4. Verify response contains correct VC Model
5. Attempt to access VC Model owned by another stakeholder
6. Verify access denied (404 or 403)

**Expected Results:**
- ✅ Returns 200 OK for owned VC Models
- ✅ Returns correct VC Model data
- ✅ Returns 404 for non-existent VC Models
- ✅ Returns 404/403 for unauthorized access

---

#### TC-API-004: Update VC Model
**Endpoint:** `PUT /api/vc-models/[vcModelId]`

**Objective:** Verify VC Model updates

**Steps:**
1. Create VC Model
2. Call `PUT /api/vc-models/[vcModelId]` with updates:
   ```json
   {
     "model_name": "Updated Name",
     "description": "Updated description",
     "status": "IN_PROGRESS"
   }
   ```
3. Verify response status 200 OK
4. Verify database updated
5. Verify `updated_at` timestamp changed

**Expected Results:**
- ✅ Returns 200 OK
- ✅ Database record updated
- ✅ `updated_at` timestamp updated
- ✅ Only specified fields updated

---

#### TC-API-005: Delete VC Model
**Endpoint:** `DELETE /api/vc-models/[vcModelId]`

**Objective:** Verify VC Model deletion with cascade

**Steps:**
1. Create VC Model
2. Create FLM for VC Model
3. Create artefacts for FLM
4. Call `DELETE /api/vc-models/[vcModelId]`
5. Verify response status 200 OK
6. Verify VC Model deleted
7. Verify FLM deleted (CASCADE)
8. Verify artefacts deleted (CASCADE)
9. Verify collaborators deleted (CASCADE)

**Expected Results:**
- ✅ Returns 200 OK
- ✅ VC Model deleted
- ✅ Related records deleted via CASCADE
- ✅ No orphaned records

---

#### TC-API-006: Create FLM
**Endpoint:** `POST /api/vc-models/[vcModelId]/flm`

**Objective:** Verify FLM creation for VC Model

**Steps:**
1. Create VC Model
2. Call `POST /api/vc-models/[vcModelId]/flm`:
   ```json
   {
     "description": "Test FLM"
   }
   ```
3. Verify response status 201 Created
4. Verify FLM created in database
5. Verify `flm_version = 1`
6. Verify `status = 'INITIATED'`, `current_step = 'BVS'`

**Expected Results:**
- ✅ Returns 201 Created
- ✅ FLM created in `flm_models` table
- ✅ Correct version number assigned
- ✅ Correct initial status and step

---

#### TC-API-007: Get FLM Artefacts
**Endpoint:** `GET /api/vc-models/[vcModelId]/flm/[flmId]/artefacts`

**Objective:** Verify retrieving FLM artefacts

**Steps:**
1. Create VC Model and FLM
2. Create test artefacts (BVS, L0, L1)
3. Call `GET /api/vc-models/[vcModelId]/flm/[flmId]/artefacts`
4. Verify response contains all artefacts
5. Verify artefact data structure correct

**Expected Results:**
- ✅ Returns 200 OK
- ✅ Returns array of artefacts
- ✅ Artefacts include required fields
- ✅ JSON structure valid

---

#### TC-API-008: Update Artefact
**Endpoint:** `PUT /api/vc-models/[vcModelId]/flm/[flmId]/artefacts/[artefactId]`

**Objective:** Verify artefact updates

**Steps:**
1. Create VC Model, FLM, and artefact
2. Call `PUT /api/vc-models/[vcModelId]/flm/[flmId]/artefacts/[artefactId]`:
   ```json
   {
     "artefact_json": { "updated": "data" },
     "status": "PENDING_REVIEW"
   }
   ```
3. Verify response status 200 OK
4. Verify database updated
5. Verify JSON structure preserved

**Expected Results:**
- ✅ Returns 200 OK
- ✅ Artefact updated in database
- ✅ JSON structure valid
- ✅ Status updated correctly

---

#### TC-API-009: Confirm Artefact
**Endpoint:** `POST /api/vc-models/[vcModelId]/flm/[flmId]/artefacts/[artefactId]/confirm`

**Objective:** Verify artefact confirmation

**Steps:**
1. Create VC Model, FLM, and artefact with status 'PENDING_REVIEW'
2. Call `POST /api/vc-models/[vcModelId]/flm/[flmId]/artefacts/[artefactId]/confirm`
3. Verify response status 200 OK
4. Verify artefact status = 'CONFIRMED'
5. Verify `confirmed_by` and `confirmed_at` set

**Expected Results:**
- ✅ Returns 200 OK
- ✅ Status updated to 'CONFIRMED'
- ✅ `confirmed_by` = current user ID
- ✅ `confirmed_at` = current timestamp

---

### 3. UI Component Tests

#### TC-UI-001: FLM Model Display Component
**Component:** `FLMModelDisplay.tsx`

**Objective:** Verify component renders correctly

**Steps:**
1. Navigate to `/dashboard/admin/vc-model`
2. Expand "FLM Model Display" component
3. Verify component renders without errors
4. Verify props accepted correctly
5. Verify status display works
6. Verify step navigation display

**Expected Results:**
- ✅ Component renders without errors
- ✅ Status badges display correctly
- ✅ Step indicators visible
- ✅ Navigation elements functional

---

#### TC-UI-002: BVS Builder Component
**Component:** `BVSBuilder.tsx`

**Objective:** Verify BVS capture functionality

**Steps:**
1. Navigate to `/dashboard/admin/vc-model`
2. Expand "BVS Builder" component
3. Verify form fields render
4. Enter test BVS text
5. Verify file upload component visible
6. Verify save handler called (mock)
7. Verify generate DBS handler available

**Expected Results:**
- ✅ Form renders correctly
- ✅ Text input functional
- ✅ File upload component visible
- ✅ Handlers properly bound

---

#### TC-UI-003: DBS Form Component
**Component:** `DBSForm.tsx`

**Objective:** Verify dynamic form rendering

**Steps:**
1. Navigate to `/dashboard/admin/vc-model`
2. Expand "DBS Form" component
3. Verify form renders from schema
4. Verify no infinite loop errors (previously fixed)
5. Verify form fields render correctly
6. Verify save functionality

**Expected Results:**
- ✅ Form renders from JSON schema
- ✅ No console errors
- ✅ Form fields editable
- ✅ Save button functional

**Critical:** Verify no "Maximum update depth exceeded" error

---

#### TC-UI-004: L0/L1/L2 Builder Components
**Components:** `L0Builder.tsx`, `L1Builder.tsx`, `L2Builder.tsx`

**Objective:** Verify JSON editor components

**Steps:**
1. Navigate to `/dashboard/admin/vc-model`
2. Expand each builder component (L0, L1, L2)
3. Verify JSON editor renders
4. Verify JSON structure display
5. Verify edit functionality
6. Verify save handlers

**Expected Results:**
- ✅ Components render correctly
- ✅ JSON editor functional
- ✅ Data structure preserved
- ✅ Save functionality works

---

#### TC-UI-005: Status Badge Component
**Component:** `ArtefactStatusBadge.tsx`

**Objective:** Verify status badge displays

**Steps:**
1. Navigate to `/dashboard/admin/vc-model`
2. Expand "Status Badge" component
3. Verify all statuses display correctly:
   - DRAFT (gray)
   - PENDING_REVIEW (yellow)
   - CONFIRMED (green)
   - SUPERSEDED (gray)
4. Verify color coding correct

**Expected Results:**
- ✅ All statuses render
- ✅ Color coding correct
- ✅ Badge styling appropriate

---

### 4. Workflow Tests

#### TC-WF-001: Workflow Definition Exists
**Objective:** Verify BUILD_FLM workflow registered

**Steps:**
1. Query `workflow_definitions` table
2. Verify `BUILD_FLM` workflow exists
3. Verify workflow structure correct
4. Verify 13 workflow nodes exist
5. Verify node sequence correct

**Expected Results:**
- ✅ Workflow exists with code 'BUILD_FLM'
- ✅ 13 nodes created
- ✅ Node sequence: START_BVS → ... → COMPLETE_FLM
- ✅ Node types correct (USER_TASK, SERVICE_TASK)

**SQL Validation:**
```sql
SELECT * FROM workflow_definitions WHERE workflow_code = 'BUILD_FLM';
SELECT * FROM workflow_nodes WHERE workflow_code = 'BUILD_FLM' ORDER BY sequence_number;
```

---

#### TC-WF-002: Workflow Node Structure
**Objective:** Verify workflow node structure

**Steps:**
1. Query workflow nodes for BUILD_FLM
2. Verify each node has required fields:
   - `node_code`, `node_name`, `node_type`
   - `sequence_number`, `workflow_code`
   - `config` (JSONB)
3. Verify USER_TASK nodes have review gate config
4. Verify SERVICE_TASK nodes have prompt config

**Expected Results:**
- ✅ All nodes have required fields
- ✅ Node types correct
- ✅ Sequence numbers correct
- ✅ Config JSON valid

---

### 5. Prompt Template Tests

#### TC-PT-001: Prompt Templates Exist
**Objective:** Verify all FLM prompts registered

**Steps:**
1. Query `prompt_templates` table
2. Verify all 5 FLM prompts exist:
   - BVS_TO_DBS
   - DBS_TO_L0
   - L0_TO_L1
   - L1_TO_L2
   - FLM_TO_BLUEPRINT
3. Verify prompt structure correct
4. Verify input/output schemas valid JSON

**Expected Results:**
- ✅ All 5 prompts exist
- ✅ Prompt text present
- ✅ Input/output schemas valid
- ✅ Category = 'FLM'

**SQL Validation:**
```sql
SELECT prompt_code, prompt_name, category 
FROM prompt_templates 
WHERE category = 'FLM';
```

---

#### TC-PT-002: Prompt Schema Validation
**Objective:** Verify prompt schemas are valid JSON Schema

**Steps:**
1. Retrieve each prompt template
2. Parse `input_schema` JSON
3. Parse `output_schema` JSON
4. Verify JSON Schema structure valid
5. Verify required fields present

**Expected Results:**
- ✅ All schemas valid JSON
- ✅ JSON Schema format correct
- ✅ Required fields defined
- ✅ Schema structure appropriate

---

### 6. Integration Tests

#### TC-INT-001: Component Registration
**Objective:** Verify all components registered correctly

**Steps:**
1. Query `components_registry` table
2. Verify all FLM components registered:
   - FLMModelDisplay
   - BVSBuilder
   - DBSForm
   - L0Builder, L1Builder, L2Builder
   - BlueprintGenerator
   - ArtefactStatusBadge
   - ArtefactVersionHistory
   - SourceDocUploader
3. Verify `default_params` contains metadata
4. Verify `route_path` configured

**Expected Results:**
- ✅ All components registered
- ✅ Metadata present in default_params
- ✅ Route paths configured
- ✅ Component codes unique

**SQL Validation:**
```sql
SELECT component_code, component_name, route_path 
FROM components_registry 
WHERE component_code LIKE 'FLM_%' OR component_code LIKE 'BVS_%' 
  OR component_code LIKE 'DBS_%' OR component_code LIKE 'L0_%' 
  OR component_code LIKE 'L1_%' OR component_code LIKE 'L2_%' 
  OR component_code LIKE 'BLUEPRINT_%';
```

---

#### TC-INT-002: Admin Menu Integration
**Objective:** Verify VC Model menu item appears

**Steps:**
1. Navigate to `/dashboard/admin`
2. Verify "VC Model" menu item appears
3. Click "VC Model" menu item
4. Verify redirects to `/dashboard/admin/vc-model`
5. Verify "Foundation Layer Model" card displays
6. Verify all components listed

**Expected Results:**
- ✅ Menu item visible
- ✅ Navigation works
- ✅ Page loads correctly
- ✅ All components accessible

---

### 7. Security Tests

#### TC-SEC-001: Authentication Required
**Objective:** Verify all API routes require authentication

**Steps:**
1. Call each API route without authentication token
2. Verify all return 401 Unauthorized
3. Test with invalid token
4. Verify 401 returned

**Expected Results:**
- ✅ All routes return 401 without auth
- ✅ Invalid tokens rejected
- ✅ No data leaked

**Routes to Test:**
- GET /api/vc-models
- POST /api/vc-models
- GET /api/vc-models/[vcModelId]
- PUT /api/vc-models/[vcModelId]
- DELETE /api/vc-models/[vcModelId]
- GET /api/vc-models/[vcModelId]/flm
- POST /api/vc-models/[vcModelId]/flm
- All artefact routes

---

#### TC-SEC-002: RLS Policy Enforcement
**Objective:** Verify RLS prevents unauthorized access

**Steps:**
1. Create VC Model as Stakeholder A
2. Authenticate as Stakeholder B
3. Attempt to access Stakeholder A's VC Model via API
4. Verify 404 or empty result (not 403 to avoid info leakage)
5. Verify no data returned
6. Add Stakeholder B as collaborator
7. Verify Stakeholder B can now access

**Expected Results:**
- ✅ Unauthorized access prevented
- ✅ No data leakage
- ✅ Collaborators can access
- ✅ RLS policies working

---

#### TC-SEC-003: SQL Injection Prevention
**Objective:** Verify parameterized queries used

**Steps:**
1. Review API route code
2. Verify all database queries use parameterized queries
3. Verify no string concatenation in SQL
4. Test with malicious input (SQL injection attempts)
5. Verify queries safe

**Expected Results:**
- ✅ All queries parameterized
- ✅ No SQL injection possible
- ✅ Supabase client handles escaping

---

### 8. Performance Tests

#### TC-PERF-001: Database Query Performance
**Objective:** Verify queries perform acceptably

**Steps:**
1. Create 100 VC Models
2. Create 100 FLM Models
3. Create 500 artefacts
4. Measure query times:
   - List VC Models
   - Get VC Model with FLM
   - Get artefacts for FLM
5. Verify queries complete within acceptable time (< 1 second)

**Expected Results:**
- ✅ Queries complete within 1 second
- ✅ Indexes utilized
- ✅ No full table scans

---

#### TC-PERF-002: Component Rendering Performance
**Objective:** Verify UI components render quickly

**Steps:**
1. Load `/dashboard/admin/vc-model` page
2. Measure page load time
3. Expand each component
4. Measure component render time
5. Verify no performance issues

**Expected Results:**
- ✅ Page loads within 2 seconds
- ✅ Components render quickly
- ✅ No lag or stuttering

---

## Test Execution Checklist

### Pre-Testing
- [ ] Database migrations applied
- [ ] Test data prepared
- [ ] Test accounts created
- [ ] API authentication working
- [ ] Environment configured

### Phase 1: Database Tests
- [ ] TC-DB-001: VC Models Table Structure
- [ ] TC-DB-002: Create VC Model Function
- [ ] TC-DB-003: Unique Current Version Constraint
- [ ] TC-DB-004: RLS Policy Enforcement

### Phase 2: API Tests
- [ ] TC-API-001: List VC Models
- [ ] TC-API-002: Create VC Model
- [ ] TC-API-003: Get VC Model
- [ ] TC-API-004: Update VC Model
- [ ] TC-API-005: Delete VC Model
- [ ] TC-API-006: Create FLM
- [ ] TC-API-007: Get FLM Artefacts
- [ ] TC-API-008: Update Artefact
- [ ] TC-API-009: Confirm Artefact

### Phase 3: UI Tests
- [ ] TC-UI-001: FLM Model Display Component
- [ ] TC-UI-002: BVS Builder Component
- [ ] TC-UI-003: DBS Form Component
- [ ] TC-UI-004: L0/L1/L2 Builder Components
- [ ] TC-UI-005: Status Badge Component

### Phase 4: Workflow Tests
- [ ] TC-WF-001: Workflow Definition Exists
- [ ] TC-WF-002: Workflow Node Structure

### Phase 5: Prompt Tests
- [ ] TC-PT-001: Prompt Templates Exist
- [ ] TC-PT-002: Prompt Schema Validation

### Phase 6: Integration Tests
- [ ] TC-INT-001: Component Registration
- [ ] TC-INT-002: Admin Menu Integration

### Phase 7: Security Tests
- [ ] TC-SEC-001: Authentication Required
- [ ] TC-SEC-002: RLS Policy Enforcement
- [ ] TC-SEC-003: SQL Injection Prevention

### Phase 8: Performance Tests
- [ ] TC-PERF-001: Database Query Performance
- [ ] TC-PERF-002: Component Rendering Performance

---

## Test Data

### Sample VC Model
```json
{
  "model_name": "Artisan Coffee Roasters VC Model",
  "description": "Complete value chain model for specialty coffee roasting business"
}
```

### Sample BVS
```
We are a specialty coffee roasting company that sources premium 
green beans from smallholder farms in Colombia and Ethiopia. 
We roast in small batches using traditional methods and sell 
directly to consumers through our online store and local cafes. 
Our focus is on quality, sustainability, and building relationships 
with coffee growers.
```

### Sample Test Accounts
- Stakeholder A: `stakeholder-a@test.com`
- Stakeholder B: `stakeholder-b@test.com`

---

## Test Tools

### API Testing
- **Tool:** Postman / Insomnia / cURL
- **Environment:** Development/Staging
- **Authentication:** Bearer tokens from Supabase Auth

### Database Testing
- **Tool:** Supabase SQL Editor
- **Queries:** SQL validation queries

### UI Testing
- **Tool:** Browser (Chrome/Firefox)
- **DevTools:** Console for error checking
- **Browser:** Manual testing

---

## Defect Tracking

### Defect Severity Levels
- **Critical:** System crash, data loss, security breach
- **High:** Major functionality broken, incorrect results
- **Medium:** Minor functionality issues, UI problems
- **Low:** Cosmetic issues, improvements

### Defect Reporting Template
```
**Defect ID:** TC-XXX-YYY
**Severity:** Critical/High/Medium/Low
**Description:** [Clear description of issue]
**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]
**Expected Result:** [What should happen]
**Actual Result:** [What actually happens]
**Environment:** [Browser/OS/Version]
**Screenshots:** [If applicable]
```

---

## Test Completion Criteria

### Definition of Done
- ✅ All test cases executed
- ✅ All critical and high severity defects resolved
- ✅ Medium severity defects documented
- ✅ Test results documented
- ✅ Test report generated
- ✅ Sign-off from stakeholders

### Test Report Requirements
- Test execution summary
- Pass/fail statistics
- Defect summary
- Risk assessment
- Recommendations

---

## Risk Assessment

### High Risk Areas
1. **RLS Policy Enforcement:** Multi-tenant isolation critical
2. **Data Integrity:** Version control must work correctly
3. **Workflow Execution:** Complex workflow dependencies
4. **AI Integration:** Prompt execution reliability

### Mitigation Strategies
- Comprehensive RLS testing
- Database constraint validation
- Workflow structure verification
- Prompt schema validation
- Integration testing with mock services

---

## Test Schedule

### Estimated Duration
- **Database Tests:** 2 hours
- **API Tests:** 4 hours
- **UI Tests:** 3 hours
- **Workflow Tests:** 1 hour
- **Prompt Tests:** 1 hour
- **Integration Tests:** 2 hours
- **Security Tests:** 2 hours
- **Performance Tests:** 2 hours
- **Total:** ~17 hours

### Recommended Approach
1. Start with database and API tests (foundation)
2. Move to UI component tests
3. Test workflows and prompts
4. Integration testing
5. Security validation
6. Performance testing
7. Final regression testing

---

**Test Plan Version:** 1.0  
**Last Updated:** January 2026  
**Status:** Ready for Execution
