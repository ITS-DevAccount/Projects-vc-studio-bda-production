# FLM Component Suite - Development Specification

**Application:** vc-studio-bda-production  
**Sprint:** Phase 1d.7 - FLM Building Workflow  
**Execution Model:** Phased with Review Gates  
**Estimated Duration:** 11 days (phased execution)

---

## CRITICAL INSTRUCTIONS - READ FIRST

### 1. Reuse-First Approach (MANDATORY)

**Before writing ANY new code:**
- Search existing codebase for similar functionality
- Review Sprint completion reports (WS1-WS5, Sprint 1d.1-1d.6)
- Check component_registry table for reusable components
- Review existing database schema - do NOT recreate tables that exist
- Use existing patterns from workflow system, file system, prompt library

**Existing Infrastructure to Leverage:**

| Component | Location | Usage |
|-----------|----------|-------|
| **Workflow System** | Phase 1d.2-1d.4 | Use workflow_definitions, workflow_nodes, workflow_instances |
| **Prompt Library** | Phase 1d.5 | Use prompt_templates table and ClaudeClient |
| **JSON Schema Editor** | Existing | Reuse for all JSON editing needs |
| **File System** | Phase 1d.3 | Use existing file_system table and storage patterns |
| **Service Tasks** | Phase 1d.5 | Use service_task_queue for AI execution |
| **Review Gates** | Phase 1d.4 | Use USER_TASK with approval patterns |
| **Component Registry** | Phase 1d.2 | Register ALL new components here |
| **Supabase Auth** | Existing | Use existing auth patterns |
| **RLS Policies** | Existing | Follow established multi-tenancy patterns |

### 2. Component Registration (MANDATORY)

**Every component you create MUST be registered:**

```sql
INSERT INTO component_registry (
  component_code,
  component_name,
  component_type,
  description,
  app_uuid,
  metadata
) VALUES (
  'FLM_MODEL_DISPLAY',
  'FLM Model Display Component',
  'UI',
  'Displays FLM progress and navigation',
  (SELECT app_uuid FROM applications WHERE app_code = 'VC_STUDIO'),
  '{"phase": "1d.7", "reusable": true}'::jsonb
);
```

### 3. Documentation Review (MANDATORY)

**Before starting, review these files in the project:**
- `Sprint_1d7_FLM_Building_Specification.md` - Full context for this work
- `00-MASTER-INDEX_Phase-Templates.md` - Overall architecture patterns
- `Phase-1d_Workflow-Management-System_Specification.md` - Workflow patterns
- Database schema files in `/mnt/project/` - Understand existing tables

### 4. Execution Model

**PHASED EXECUTION WITH STOP POINTS:**

This is NOT a continuous build. After each phase:
1. Complete the phase deliverables
2. Run tests
3. Commit your work
4. **STOP and report completion**
5. Wait for approval before proceeding to next phase

**Do NOT proceed to the next phase without explicit approval.**

---

## FLM Component Suite Overview

### Purpose
Implement the Framework Level Mapping (FLM) methodology from VCEF as a modular component suite within VC Studio. Users create machine-readable Value Chain Models (VC Models) through AI-assisted generation with human confirmation at each step.

### Architecture Principles
1. Each FLM step = separate software component
2. JSON artefacts = source of truth
3. Human confirmation required between steps
4. AI generation scoped, versioned, auditable
5. Components reusable across domains (BDA/PDA/ADA)
6. **VC Model = parent container for all value chain components**
7. **FLM = versioned component within VC Model**
8. **Collaboration happens at VC Model level**

### VC Model Architecture

**VC Model = Strategic Asset (versioned, collaborative)**
```
VC Model (Parent Container)
  ├─ FLM (Foundation Layer Model - L0→L2) [versioned]
  ├─ AGM (Activity Group Models - L3→L6) [versioned, future]
  └─ Overlays (Financial, Operational, etc.) [future]
```

**FLM Hierarchy within VC Model:**
```
Business Value Summary (BVS)
  ↓
L0 Domain Definition
  ↓
L1 Sub-Domain / Pillar Definition (3-6 pillars)
  ↓
L2 Component / Capability Definition
  ↓
Business Blueprint (compiled document)
```

**Key Principles:**
- VC Model = strategic asset owned by stakeholder, supports collaboration
- FLM = versioned component within VC Model
- AGM = versioned component within VC Model (future)
- Collaboration happens at VC Model level
- Everyone works on "current" version
- Version snapshots preserve history

---

## PHASE 1: FLM Data Model
**Duration:** 2 days  
**Status:** START HERE

### Objective
Create database tables for FLM models and artefacts, ensuring integration with existing VC Studio infrastructure.

### Pre-Implementation Checklist
- [ ] Review existing database schema files
- [ ] Verify `workflow_definitions` table structure
- [ ] Verify `file_system` table structure
- [ ] Check if any FLM tables already exist

### Deliverables

#### 1.1 Database Tables

**Check first:** Do these tables already exist? If yes, modify rather than recreate.

```sql
-- VC Models table (Parent Container)
CREATE TABLE IF NOT EXISTS vc_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_code TEXT UNIQUE NOT NULL,
  
  -- Ownership
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  app_uuid UUID NOT NULL REFERENCES applications(uuid),
  
  -- Versioning
  is_current_version BOOLEAN DEFAULT true,
  version_number INTEGER DEFAULT 1,
  parent_version_id UUID REFERENCES vc_models(id), -- Links to previous version
  
  -- State
  status TEXT DEFAULT 'INITIATED' CHECK (status IN ('INITIATED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED')),
  
  -- Metadata
  model_name TEXT NOT NULL,
  description TEXT,
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure only one current version per model lineage
  UNIQUE(model_code, is_current_version) WHERE is_current_version = true
);

-- VC Model Collaborators (for multi-stakeholder collaboration)
CREATE TABLE IF NOT EXISTS vc_model_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vc_model_id UUID NOT NULL REFERENCES vc_models(id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'COLLABORATOR' CHECK (role IN ('OWNER', 'COLLABORATOR', 'REVIEWER', 'VIEWER')),
  permissions JSONB DEFAULT '{"can_edit": true, "can_approve": false, "can_delete": false}'::jsonb,
  added_by UUID REFERENCES users(id),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(vc_model_id, stakeholder_id)
);

-- FLM Models table (Component of VC Model)
CREATE TABLE IF NOT EXISTS flm_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Parent relationship
  vc_model_id UUID NOT NULL REFERENCES vc_models(id) ON DELETE CASCADE,
  
  -- State tracking
  status TEXT DEFAULT 'INITIATED' CHECK (status IN ('INITIATED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED')),
  current_step TEXT CHECK (current_step IN ('BVS', 'L0', 'L1', 'L2', 'BLUEPRINT')),
  
  -- Version tracking (within VC Model)
  flm_version INTEGER DEFAULT 1,
  
  -- Metadata
  description TEXT,
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One FLM per VC Model version
  UNIQUE(vc_model_id, flm_version)
);

-- FLM Artefacts table (stores JSON outputs)
CREATE TABLE IF NOT EXISTS flm_artefacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flm_model_id UUID NOT NULL REFERENCES flm_models(id) ON DELETE CASCADE,
  artefact_type TEXT NOT NULL CHECK (artefact_type IN ('BVS', 'L0', 'L1', 'L2', 'BLUEPRINT')),
  
  -- JSON storage (source of truth)
  artefact_json JSONB NOT NULL,
  
  -- State
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'CONFIRMED', 'SUPERSEDED')),
  version INTEGER DEFAULT 1,
  
  -- Document generation
  document_path TEXT, -- Path in file_system
  
  -- Audit
  created_by UUID REFERENCES users(id),
  confirmed_by UUID REFERENCES users(id),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(flm_model_id, artefact_type, version)
);

-- Source documents uploaded for context
CREATE TABLE IF NOT EXISTS flm_source_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flm_model_id UUID NOT NULL REFERENCES flm_models(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL, -- Reference to file_system
  document_type TEXT, -- 'business_plan', 'financial_model', 'market_research', etc.
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link to existing prompt_executions for audit trail
-- (Reuse existing prompt_executions table from Phase 1d.5)

-- Create indexes
CREATE INDEX idx_vc_models_stakeholder ON vc_models(stakeholder_id);
CREATE INDEX idx_vc_models_status ON vc_models(status);
CREATE INDEX idx_vc_models_current_version ON vc_models(is_current_version) WHERE is_current_version = true;
CREATE INDEX idx_vc_model_collaborators_stakeholder ON vc_model_collaborators(stakeholder_id);
CREATE INDEX idx_flm_models_vc_model ON flm_models(vc_model_id);
CREATE INDEX idx_flm_models_status ON flm_models(status);
CREATE INDEX idx_flm_artefacts_model ON flm_artefacts(flm_model_id);
CREATE INDEX idx_flm_artefacts_type_status ON flm_artefacts(artefact_type, status);
```

#### 1.2 RLS Policies

```sql
-- RLS for vc_models
ALTER TABLE vc_models ENABLE ROW LEVEL SECURITY;

-- Owner access
CREATE POLICY vc_models_owner_access ON vc_models
  USING (stakeholder_id = current_setting('app.current_stakeholder_id')::uuid);

-- Collaborator access (via vc_model_collaborators)
CREATE POLICY vc_models_collaborator_access ON vc_models
  USING (
    EXISTS (
      SELECT 1 FROM vc_model_collaborators
      WHERE vc_model_collaborators.vc_model_id = vc_models.id
      AND vc_model_collaborators.stakeholder_id = current_setting('app.current_stakeholder_id')::uuid
    )
  );

-- Tenant isolation
CREATE POLICY vc_models_tenant_isolation ON vc_models
  USING (app_uuid = current_setting('app.current_app_uuid')::uuid);

-- Admin override
CREATE POLICY vc_models_admin_access ON vc_models
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS for vc_model_collaborators
ALTER TABLE vc_model_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY vc_model_collaborators_access ON vc_model_collaborators
  USING (
    -- Can see collaborators if you have access to the VC Model
    EXISTS (
      SELECT 1 FROM vc_models
      WHERE vc_models.id = vc_model_collaborators.vc_model_id
      AND (
        vc_models.stakeholder_id = current_setting('app.current_stakeholder_id')::uuid
        OR EXISTS (
          SELECT 1 FROM vc_model_collaborators AS vmc
          WHERE vmc.vc_model_id = vc_models.id
          AND vmc.stakeholder_id = current_setting('app.current_stakeholder_id')::uuid
        )
      )
    )
  );

-- RLS for flm_models (inherits access from parent vc_model)
ALTER TABLE flm_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY flm_models_vc_model_access ON flm_models
  USING (
    EXISTS (
      SELECT 1 FROM vc_models
      WHERE vc_models.id = flm_models.vc_model_id
      AND (
        -- Owner access
        vc_models.stakeholder_id = current_setting('app.current_stakeholder_id')::uuid
        -- OR collaborator access
        OR EXISTS (
          SELECT 1 FROM vc_model_collaborators
          WHERE vc_model_collaborators.vc_model_id = vc_models.id
          AND vc_model_collaborators.stakeholder_id = current_setting('app.current_stakeholder_id')::uuid
        )
      )
    )
  );

-- Admin override for FLM
CREATE POLICY flm_models_admin_access ON flm_models
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Similar policies for flm_artefacts (inherits from flm_models → vc_models)
ALTER TABLE flm_artefacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY flm_artefacts_access ON flm_artefacts
  USING (
    EXISTS (
      SELECT 1 FROM flm_models
      JOIN vc_models ON vc_models.id = flm_models.vc_model_id
      WHERE flm_models.id = flm_artefacts.flm_model_id
      AND (
        vc_models.stakeholder_id = current_setting('app.current_stakeholder_id')::uuid
        OR EXISTS (
          SELECT 1 FROM vc_model_collaborators
          WHERE vc_model_collaborators.vc_model_id = vc_models.id
          AND vc_model_collaborators.stakeholder_id = current_setting('app.current_stakeholder_id')::uuid
        )
      )
    )
  );

-- Similar for flm_source_documents
ALTER TABLE flm_source_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY flm_source_documents_access ON flm_source_documents
  USING (
    EXISTS (
      SELECT 1 FROM flm_models
      JOIN vc_models ON vc_models.id = flm_models.vc_model_id
      WHERE flm_models.id = flm_source_documents.flm_model_id
      AND (
        vc_models.stakeholder_id = current_setting('app.current_stakeholder_id')::uuid
        OR EXISTS (
          SELECT 1 FROM vc_model_collaborators
          WHERE vc_model_collaborators.vc_model_id = vc_models.id
          AND vc_model_collaborators.stakeholder_id = current_setting('app.current_stakeholder_id')::uuid
        )
      )
    )
  );
```

#### 1.3 Database Functions

```sql
-- Sequence for generating model codes
CREATE SEQUENCE IF NOT EXISTS vc_model_sequence START 1;

-- Function to create new VC Model
CREATE OR REPLACE FUNCTION create_vc_model(
  p_stakeholder_id UUID,
  p_model_name TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_model_id UUID;
  v_model_code TEXT;
  v_app_uuid UUID;
BEGIN
  -- Get app_uuid from current context
  v_app_uuid := current_setting('app.current_app_uuid')::uuid;
  
  -- Generate unique model code
  v_model_code := 'VC-' || to_char(NOW(), 'YYYY') || '-' || 
                  LPAD(nextval('vc_model_sequence')::text, 4, '0');
  
  -- Insert VC model
  INSERT INTO vc_models (
    model_code,
    stakeholder_id,
    app_uuid,
    model_name,
    description,
    status,
    is_current_version,
    version_number,
    created_by
  ) VALUES (
    v_model_code,
    p_stakeholder_id,
    v_app_uuid,
    p_model_name,
    p_description,
    'INITIATED',
    true,
    1,
    auth.uid()
  ) RETURNING id INTO v_model_id;
  
  -- Add creator as owner in collaborators
  INSERT INTO vc_model_collaborators (
    vc_model_id,
    stakeholder_id,
    role,
    permissions,
    added_by
  ) VALUES (
    v_model_id,
    p_stakeholder_id,
    'OWNER',
    '{"can_edit": true, "can_approve": true, "can_delete": true}'::jsonb,
    auth.uid()
  );
  
  -- Create root directory in file_system
  INSERT INTO file_system (
    stakeholder_id,
    path,
    path_type,
    metadata
  ) VALUES (
    p_stakeholder_id,
    '/' || v_model_code || '/',
    'vc_model_root',
    jsonb_build_object('vc_model_id', v_model_id)
  );
  
  RETURN v_model_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create new FLM within VC Model
CREATE OR REPLACE FUNCTION create_flm_model(
  p_vc_model_id UUID,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_flm_id UUID;
  v_flm_version INTEGER;
BEGIN
  -- Get next FLM version for this VC Model
  SELECT COALESCE(MAX(flm_version), 0) + 1
  INTO v_flm_version
  FROM flm_models
  WHERE vc_model_id = p_vc_model_id;
  
  -- Insert FLM model
  INSERT INTO flm_models (
    vc_model_id,
    status,
    current_step,
    flm_version,
    description,
    created_by
  ) VALUES (
    p_vc_model_id,
    'INITIATED',
    'BVS',
    v_flm_version,
    p_description,
    auth.uid()
  ) RETURNING id INTO v_flm_id;
  
  RETURN v_flm_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add collaborator to VC Model
CREATE OR REPLACE FUNCTION add_vc_model_collaborator(
  p_vc_model_id UUID,
  p_stakeholder_id UUID,
  p_role TEXT DEFAULT 'COLLABORATOR',
  p_permissions JSONB DEFAULT '{"can_edit": true, "can_approve": false, "can_delete": false}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_collaborator_id UUID;
BEGIN
  -- Check if user has permission to add collaborators (must be owner or have appropriate permissions)
  IF NOT EXISTS (
    SELECT 1 FROM vc_model_collaborators
    WHERE vc_model_id = p_vc_model_id
    AND stakeholder_id = current_setting('app.current_stakeholder_id')::uuid
    AND (role = 'OWNER' OR (permissions->>'can_edit')::boolean = true)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to add collaborators';
  END IF;
  
  -- Insert collaborator
  INSERT INTO vc_model_collaborators (
    vc_model_id,
    stakeholder_id,
    role,
    permissions,
    added_by
  ) VALUES (
    p_vc_model_id,
    p_stakeholder_id,
    p_role,
    p_permissions,
    auth.uid()
  ) RETURNING id INTO v_collaborator_id;
  
  RETURN v_collaborator_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create new version of VC Model
CREATE OR REPLACE FUNCTION create_vc_model_version(
  p_parent_vc_model_id UUID,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_new_model_id UUID;
  v_parent_model vc_models%ROWTYPE;
  v_new_version INTEGER;
BEGIN
  -- Get parent model
  SELECT * INTO v_parent_model
  FROM vc_models
  WHERE id = p_parent_vc_model_id;
  
  -- Calculate new version number
  v_new_version := v_parent_model.version_number + 1;
  
  -- Mark parent as not current
  UPDATE vc_models
  SET is_current_version = false
  WHERE id = p_parent_vc_model_id;
  
  -- Create new version
  INSERT INTO vc_models (
    model_code,
    stakeholder_id,
    app_uuid,
    model_name,
    description,
    status,
    is_current_version,
    version_number,
    parent_version_id,
    created_by
  ) VALUES (
    v_parent_model.model_code,
    v_parent_model.stakeholder_id,
    v_parent_model.app_uuid,
    v_parent_model.model_name,
    COALESCE(p_description, v_parent_model.description || ' (v' || v_new_version || ')'),
    'INITIATED',
    true,
    v_new_version,
    p_parent_vc_model_id,
    auth.uid()
  ) RETURNING id INTO v_new_model_id;
  
  -- Copy collaborators from parent
  INSERT INTO vc_model_collaborators (vc_model_id, stakeholder_id, role, permissions, added_by)
  SELECT v_new_model_id, stakeholder_id, role, permissions, auth.uid()
  FROM vc_model_collaborators
  WHERE vc_model_id = p_parent_vc_model_id;
  
  RETURN v_new_model_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Testing Phase 1

- [ ] VC Models table created without errors
- [ ] VC Model collaborators table created
- [ ] FLM Models table created and references VC Models
- [ ] All other tables created correctly
- [ ] RLS policies prevent cross-tenant access
- [ ] RLS policies support collaboration (collaborators can access VC Models)
- [ ] `create_vc_model()` function works
- [ ] `create_flm_model()` function works with vc_model_id
- [ ] `add_vc_model_collaborator()` function works
- [ ] `create_vc_model_version()` function creates new version correctly
- [ ] File system directory created for new VC model
- [ ] Foreign key constraints validated
- [ ] Version control works (only one current version per model_code)

### Component Registration

```sql
INSERT INTO component_registry (component_code, component_name, component_type, description, app_uuid)
VALUES 
('VC_DATA_MODEL', 'VC Model Data Model', 'DATABASE', 'Database schema for VC Models with versioning and collaboration', 
 (SELECT app_uuid FROM applications WHERE app_code = 'VC_STUDIO')),
('FLM_DATA_MODEL', 'FLM Data Model', 'DATABASE', 'Database schema for FLM models and artefacts within VC Models', 
 (SELECT app_uuid FROM applications WHERE app_code = 'VC_STUDIO'));
```

### Commit Message
```
feat(flm): Add VC Model and FLM data models with versioning and collaboration

- Created vc_models table as parent container for VC Models
- Created vc_model_collaborators table for multi-stakeholder collaboration
- Created flm_models table linked to vc_models with versioning support
- Created flm_artefacts table with JSONB storage
- Created flm_source_documents table
- Added RLS policies for multi-tenancy and collaboration
- Added create_vc_model() database function
- Added create_flm_model() database function (links to VC Model)
- Added add_vc_model_collaborator() function
- Added create_vc_model_version() function for version control
- Registered VC_DATA_MODEL and FLM_DATA_MODEL components
```

### 🛑 STOP POINT 1
**Report completion of Phase 1. Wait for approval before proceeding to Phase 2.**

---

## PHASE 2: FLM UI Components
**Duration:** 3 days  
**Status:** WAIT FOR APPROVAL

### Objective
Build React components for FLM workflow, reusing existing VC Studio patterns and components.

### Pre-Implementation Checklist
- [ ] Review existing component patterns in codebase
- [ ] Locate and understand JSON Schema Editor component
- [ ] Review existing form components and patterns
- [ ] Check shadcn/ui component usage patterns
- [ ] Understand existing workspace navigation structure

### Component Architecture

```
src/components/flm/
├── FLMModelDisplay.tsx        -- Main navigation/progress display
├── StartModelButton.tsx       -- Creates new FLM model
├── BVSBuilder.tsx             -- Business Value Summary capture
├── DBSForm.tsx                -- Generated form for Domain Business Summary
├── L0Builder.tsx              -- L0 Domain Definition
├── L1Builder.tsx              -- L1 Pillar Definition
├── L2Builder.tsx              -- L2 Capability Matrix
├── BlueprintGenerator.tsx     -- Final blueprint compilation
├── ArtefactStatusBadge.tsx    -- Status indicator component
├── ArtefactVersionHistory.tsx -- Version tracking UI
└── SourceDocUploader.tsx      -- Document upload component
```

### Deliverables

#### 2.1 FLM Model Display Component

**Purpose:** Main control surface showing FLM progress and navigation within a VC Model.

**Key Features:**
- Display VC Model context (model name, version, collaborators)
- Display FLM status (BVS → L0 → L1 → L2 → Blueprint)
- Show artefact status badges (Draft / Pending Review / Confirmed)
- Enable/disable step buttons based on guardrails
- Activity feed showing recent actions
- Navigation to step components
- Version history access

**Reuse:**
- Existing progress tracker patterns
- shadcn/ui Card, Badge, Button components
- Existing navigation patterns

**Implementation Notes:**
```typescript
// This is a DISPLAY component only
// Does NOT generate content
// Does NOT contain business logic
// Reads from vc_models, flm_models, and flm_artefacts tables
// Provides navigation to step components
// Shows collaboration info from vc_model_collaborators

interface FLMModelDisplayProps {
  vcModelId: string;        // Parent VC Model
  flmModelId: string;       // FLM component
  stakeholderId: string;
}

// Key state to track:
// - VC Model context (name, version, collaborators)
// - Current FLM step
// - Each artefact's status
// - Guardrails (which steps are locked)
// - Recent activity log
// - Collaboration status
```

#### 2.2 BVS Builder Component

**Purpose:** Capture natural language business description.

**Key Features:**
- Rich text editor for business description
- File upload for supporting documents (reuse existing file upload component)
- Submit button triggers AI generation of DBS schema
- Preview generated JSON schema

**Reuse:**
- Existing file upload component from file system
- Existing rich text editor if available
- shadcn/ui Textarea, Button, Card

**Workflow:**
1. User enters natural language business description
2. User uploads optional supporting docs
3. Click "Generate DBS Schema" → triggers SERVICE_TASK
4. AI generates DBS schema (structure for next form)
5. Display schema preview
6. User confirms → BVS status = CONFIRMED

#### 2.3 DBS Form Component

**Purpose:** Dynamically rendered form from AI-generated schema.

**CRITICAL:** Reuse existing JSON Schema-driven form renderer if it exists.

**Key Features:**
- Render form fields from JSON Schema
- Validation based on schema rules
- Pre-fill values where AI extracted them
- Save draft functionality
- Submit for review

**Reuse:**
- Existing dynamic form renderer (check for this!)
- React Hook Form + Zod validation patterns
- shadcn/ui form components

#### 2.4 L0/L1/L2 Builder Components

**Purpose:** Display and edit AI-generated FLM layers.

**Pattern:** All three follow similar structure:
1. Display AI-generated content
2. Allow human editing
3. Validation before confirmation
4. Submit for review

**Reuse:**
- JSON Schema Editor component (CRITICAL - check this exists)
- Form validation patterns
- Review gate patterns from Phase 1d.4

**Specific to each:**
- **L0:** Domain analysis with market context
- **L1:** 3-6 pillars with unit economics
- **L2:** Capability matrix with value anchors

#### 2.5 Supporting Components

**ArtefactStatusBadge:**
```typescript
// Simple status indicator
type Status = 'DRAFT' | 'PENDING_REVIEW' | 'CONFIRMED' | 'SUPERSEDED';

const statusColors = {
  DRAFT: 'gray',
  PENDING_REVIEW: 'yellow',
  CONFIRMED: 'green',
  SUPERSEDED: 'red'
};
```

**SourceDocUploader:**
- Reuse existing file upload component
- Link to flm_source_documents table
- Display uploaded files with metadata

### Component Registration

```sql
-- Register each component
INSERT INTO component_registry (component_code, component_name, component_type, description, app_uuid, metadata) VALUES
('FLM_MODEL_DISPLAY', 'FLM Model Display', 'UI', 'Main FLM progress and navigation display', 
 (SELECT app_uuid FROM applications WHERE app_code = 'VC_STUDIO'), '{"reusable": true, "phase": "1d.7"}'::jsonb),
 
('FLM_BVS_BUILDER', 'BVS Builder Component', 'UI', 'Business Value Summary capture interface',
 (SELECT app_uuid FROM applications WHERE app_code = 'VC_STUDIO'), '{"reusable": true, "phase": "1d.7"}'::jsonb),
 
('FLM_DBS_FORM', 'DBS Form Component', 'UI', 'Dynamic form from AI-generated schema',
 (SELECT app_uuid FROM applications WHERE app_code = 'VC_STUDIO'), '{"reusable": true, "phase": "1d.7"}'::jsonb),
 
('FLM_L0_BUILDER', 'L0 Domain Builder', 'UI', 'L0 domain definition interface',
 (SELECT app_uuid FROM applications WHERE app_code = 'VC_STUDIO'), '{"reusable": true, "phase": "1d.7"}'::jsonb),
 
('FLM_L1_BUILDER', 'L1 Pillar Builder', 'UI', 'L1 pillar definition interface',
 (SELECT app_uuid FROM applications WHERE app_code = 'VC_STUDIO'), '{"reusable": true, "phase": "1d.7"}'::jsonb),
 
('FLM_L2_BUILDER', 'L2 Capability Builder', 'UI', 'L2 capability matrix interface',
 (SELECT app_uuid FROM applications WHERE app_code = 'VC_STUDIO'), '{"reusable": true, "phase": "1d.7"}'::jsonb);
```

### Testing Phase 2

- [ ] All components render without errors
- [ ] Navigation between steps works
- [ ] Status badges display correctly
- [ ] File upload works (reusing existing system)
- [ ] Form validation works (DBS Form)
- [ ] Components registered in component_registry
- [ ] Components follow existing design patterns
- [ ] TypeScript types properly defined

### Commit Message
```
feat(flm): Add FLM UI components with reusable patterns

- FLM Model Display with progress tracking
- BVS Builder with file upload integration
- DBS Form with dynamic schema rendering (reuses existing)
- L0/L1/L2 Builders with JSON editing (reuses existing)
- Supporting components (status badges, version history)
- All components registered in component_registry
```

### 🛑 STOP POINT 2
**Report completion of Phase 2. Wait for approval before proceeding to Phase 3.**

---

## PHASE 3: FLM Workflow Definition
**Duration:** 2 days  
**Status:** WAIT FOR APPROVAL

### Objective
Register BUILD_FLM workflow in existing workflow system, define all workflow nodes and transitions.

### Pre-Implementation Checklist
- [ ] Review workflow_definitions table structure
- [ ] Review workflow_nodes table structure
- [ ] Review existing workflow examples
- [ ] Understand SERVICE_TASK configuration from Phase 1d.5
- [ ] Understand USER_TASK patterns from Phase 1d.4

### Workflow Architecture

**Workflow Code:** `BUILD_FLM`  
**Type:** Reusable across all stakeholder types  
**Trigger:** User clicks "Build VC Model" in workspace

### Workflow Nodes

```typescript
// Workflow structure
const BUILD_FLM_NODES = [
  // 1. BVS Capture (Human)
  {
    nodeCode: 'CAPTURE_BVS',
    nodeType: 'USER_TASK',
    nodeName: 'Capture Business Value Summary',
    component: 'FLM_BVS_BUILDER',
    config: {
      fields: ['business_description', 'supporting_documents'],
      validation: { min_length: 100 }
    }
  },
  
  // 2. Generate DBS Schema (AI)
  {
    nodeCode: 'GENERATE_DBS_SCHEMA',
    nodeType: 'SERVICE_TASK',
    nodeName: 'Generate DBS Schema',
    config: {
      serviceType: 'CLAUDE_PROMPT',
      promptCode: 'BVS_TO_DBS',
      inputMapping: {
        bvs: '{{tasks.CAPTURE_BVS.output.business_description}}',
        documents: '{{tasks.CAPTURE_BVS.output.supporting_documents}}'
      },
      outputPath: '/flm/generated/dbs_schema.json'
    }
  },
  
  // 3. Complete DBS Form (Human)
  {
    nodeCode: 'COMPLETE_DBS',
    nodeType: 'USER_TASK',
    nodeName: 'Complete Domain Business Summary',
    component: 'FLM_DBS_FORM',
    config: {
      schemaSource: '{{tasks.GENERATE_DBS_SCHEMA.output}}',
      prefillSource: '{{tasks.GENERATE_DBS_SCHEMA.output.prefill}}'
    }
  },
  
  // 4. Review DBS (Human - Review Gate)
  {
    nodeCode: 'REVIEW_DBS',
    nodeType: 'USER_TASK',
    nodeName: 'Review DBS',
    component: 'REVIEW_GATE',
    config: {
      reviewType: 'APPROVAL',
      actions: ['APPROVE', 'REQUEST_CHANGES', 'REJECT'],
      routingLogic: 'stakeholder', // Route to stakeholder
      dataToReview: '{{tasks.COMPLETE_DBS.output}}'
    }
  },
  
  // 5. Generate L0 (AI)
  {
    nodeCode: 'GENERATE_L0',
    nodeType: 'SERVICE_TASK',
    nodeName: 'Generate L0 Domain Study',
    config: {
      serviceType: 'CLAUDE_PROMPT',
      promptCode: 'DBS_TO_L0',
      inputMapping: {
        bvs: '{{tasks.CAPTURE_BVS.output}}',
        dbs: '{{tasks.COMPLETE_DBS.output}}'
      },
      outputPath: '/flm/approved/l0.json'
    }
  },
  
  // 6. Review L0 (Human)
  {
    nodeCode: 'REVIEW_L0',
    nodeType: 'USER_TASK',
    nodeName: 'Review L0 Domain',
    component: 'FLM_L0_BUILDER',
    config: {
      artefactSource: '{{tasks.GENERATE_L0.output}}',
      allowEdit: true
    }
  },
  
  // 7. Generate L1 (AI)
  {
    nodeCode: 'GENERATE_L1',
    nodeType: 'SERVICE_TASK',
    nodeName: 'Generate L1 Pillars',
    config: {
      serviceType: 'CLAUDE_PROMPT',
      promptCode: 'L0_TO_L1',
      inputMapping: {
        bvs: '{{tasks.CAPTURE_BVS.output}}',
        dbs: '{{tasks.COMPLETE_DBS.output}}',
        l0: '{{tasks.REVIEW_L0.output}}'
      },
      outputPath: '/flm/approved/l1.json',
      constraints: {
        min_pillars: 3,
        max_pillars: 6
      }
    }
  },
  
  // 8. Review L1 (Human)
  {
    nodeCode: 'REVIEW_L1',
    nodeType: 'USER_TASK',
    nodeName: 'Review L1 Pillars',
    component: 'FLM_L1_BUILDER',
    config: {
      artefactSource: '{{tasks.GENERATE_L1.output}}',
      allowEdit: true,
      validation: {
        require_unit_economics: true
      }
    }
  },
  
  // 9. Generate L2 (AI)
  {
    nodeCode: 'GENERATE_L2',
    nodeType: 'SERVICE_TASK',
    nodeName: 'Generate L2 Capabilities',
    config: {
      serviceType: 'CLAUDE_PROMPT',
      promptCode: 'L1_TO_L2',
      inputMapping: {
        bvs: '{{tasks.CAPTURE_BVS.output}}',
        dbs: '{{tasks.COMPLETE_DBS.output}}',
        l0: '{{tasks.REVIEW_L0.output}}',
        l1: '{{tasks.REVIEW_L1.output}}'
      },
      outputPath: '/flm/approved/l2.json'
    }
  },
  
  // 10. Review L2 (Human)
  {
    nodeCode: 'REVIEW_L2',
    nodeType: 'USER_TASK',
    nodeName: 'Review L2 Capabilities',
    component: 'FLM_L2_BUILDER',
    config: {
      artefactSource: '{{tasks.GENERATE_L2.output}}',
      allowEdit: true
    }
  },
  
  // 11. Final Approval (Human)
  {
    nodeCode: 'FINAL_APPROVAL',
    nodeType: 'USER_TASK',
    nodeName: 'Final FLM Approval',
    component: 'REVIEW_GATE',
    config: {
      reviewType: 'FINAL_APPROVAL',
      actions: ['APPROVE', 'REQUEST_CHANGES'],
      summaryData: {
        bvs: '{{tasks.CAPTURE_BVS.output}}',
        dbs: '{{tasks.COMPLETE_DBS.output}}',
        l0: '{{tasks.REVIEW_L0.output}}',
        l1: '{{tasks.REVIEW_L1.output}}',
        l2: '{{tasks.REVIEW_L2.output}}'
      }
    }
  },
  
  // 12. Generate Blueprint (AI)
  {
    nodeCode: 'GENERATE_BLUEPRINT',
    nodeType: 'SERVICE_TASK',
    nodeName: 'Generate Business Blueprint',
    config: {
      serviceType: 'CLAUDE_PROMPT',
      promptCode: 'FLM_TO_BLUEPRINT',
      inputMapping: {
        flm: {
          bvs: '{{tasks.CAPTURE_BVS.output}}',
          dbs: '{{tasks.COMPLETE_DBS.output}}',
          l0: '{{tasks.REVIEW_L0.output}}',
          l1: '{{tasks.REVIEW_L1.output}}',
          l2: '{{tasks.REVIEW_L2.output}}'
        }
      },
      outputPath: '/flm/blueprint/business_blueprint.md'
    }
  },
  
  // 13. Complete
  {
    nodeCode: 'FLM_COMPLETE',
    nodeType: 'END',
    nodeName: 'FLM Complete',
    config: {
      finalActions: [
        'UPDATE_FLM_MODEL_STATUS_COMPLETED',
        'GENERATE_COMPLETION_NOTIFICATION'
      ]
    }
  }
];
```

### Workflow Transitions

```sql
-- Define transitions between nodes
INSERT INTO workflow_transitions (
  workflow_definition_id,
  from_node_code,
  to_node_code,
  condition,
  priority
) VALUES
  -- BVS → Generate DBS
  (workflow_id, 'CAPTURE_BVS', 'GENERATE_DBS_SCHEMA', 'task_completed', 1),
  
  -- DBS Schema → Complete DBS
  (workflow_id, 'GENERATE_DBS_SCHEMA', 'COMPLETE_DBS', 'task_completed', 1),
  
  -- Complete DBS → Review DBS
  (workflow_id, 'COMPLETE_DBS', 'REVIEW_DBS', 'task_completed', 1),
  
  -- Review DBS branching
  (workflow_id, 'REVIEW_DBS', 'GENERATE_L0', 'action = APPROVE', 1),
  (workflow_id, 'REVIEW_DBS', 'COMPLETE_DBS', 'action = REQUEST_CHANGES', 2),
  
  -- L0 flow
  (workflow_id, 'GENERATE_L0', 'REVIEW_L0', 'task_completed', 1),
  (workflow_id, 'REVIEW_L0', 'GENERATE_L1', 'confirmed = true', 1),
  
  -- L1 flow
  (workflow_id, 'GENERATE_L1', 'REVIEW_L1', 'task_completed', 1),
  (workflow_id, 'REVIEW_L1', 'GENERATE_L2', 'confirmed = true', 1),
  
  -- L2 flow
  (workflow_id, 'GENERATE_L2', 'REVIEW_L2', 'task_completed', 1),
  (workflow_id, 'REVIEW_L2', 'FINAL_APPROVAL', 'confirmed = true', 1),
  
  -- Final approval branching
  (workflow_id, 'FINAL_APPROVAL', 'GENERATE_BLUEPRINT', 'action = APPROVE', 1),
  (workflow_id, 'FINAL_APPROVAL', 'REVIEW_L2', 'action = REQUEST_CHANGES', 2),
  
  -- Complete
  (workflow_id, 'GENERATE_BLUEPRINT', 'FLM_COMPLETE', 'task_completed', 1);
```

### Guardrails (Enforced by Orchestrator)

```typescript
// Workflow engine must enforce these rules
const FLM_GUARDRAILS = {
  GENERATE_L0: {
    requires: ['REVIEW_DBS.approved'],
    blocks: ['BVS not confirmed']
  },
  GENERATE_L1: {
    requires: ['REVIEW_L0.confirmed'],
    blocks: ['L0 not confirmed']
  },
  GENERATE_L2: {
    requires: ['REVIEW_L1.confirmed'],
    blocks: ['L1 not confirmed']
  },
  GENERATE_BLUEPRINT: {
    requires: ['FINAL_APPROVAL.approved'],
    blocks: ['L2 not confirmed']
  }
};
```

### Integration with Existing Systems

**Leverages:**
1. **Workflow Engine** (Phase 1d.3) - State machine and task orchestration
2. **Service Task Queue** (Phase 1d.5) - AI prompt execution
3. **Review Gates** (Phase 1d.4) - Approval workflow patterns
4. **File System** (Phase 1d.3) - Document storage
5. **Prompt Library** (Phase 1d.5) - AI prompt templates

### Testing Phase 3

- [ ] Workflow registered in workflow_definitions
- [ ] All nodes created in workflow_nodes
- [ ] Transitions defined correctly
- [ ] Workflow can be instantiated
- [ ] State transitions work correctly
- [ ] Guardrails block invalid progressions
- [ ] SERVICE_TASKs queue to service_task_queue
- [ ] USER_TASKs create proper activity assignments

### Commit Message
```
feat(flm): Add BUILD_FLM workflow definition

- Registered BUILD_FLM workflow with 13 nodes
- Defined workflow transitions with branching logic
- Integrated with existing workflow engine
- Added guardrails for step progression
- Connected to service task queue for AI execution
- Integrated with review gate patterns
```

### 🛑 STOP POINT 3
**Report completion of Phase 3. Wait for approval before proceeding to Phase 4.**

---

## PHASE 4: FLM Prompt Templates
**Duration:** 2 days  
**Status:** WAIT FOR APPROVAL

### Objective
Create AI prompt templates for FLM generation steps, register in existing prompt library.

### Pre-Implementation Checklist
- [ ] Review existing prompt_templates table structure
- [ ] Review existing prompts for patterns
- [ ] Understand variable substitution syntax
- [ ] Review VCEF methodology documents for context

### Prompt Templates

#### 4.1 Prompt: BVS_TO_DBS

**Purpose:** Generate DBS schema from natural language business description.

```sql
INSERT INTO prompt_templates (
  prompt_code,
  prompt_name,
  category,
  system_prompt,
  user_prompt_template,
  default_model,
  temperature,
  max_tokens,
  output_format,
  output_schema,
  is_active
) VALUES (
  'BVS_TO_DBS',
  'Business Value Summary to Domain Business Summary Schema',
  'FLM',
  'You are a business analyst expert in the Value Chain Evolution Framework (VCEF). Your role is to analyze natural language business descriptions and create structured data requirements for comprehensive business documentation.

Your output must be valid JSON with two parts:
1. "schema": A JSON Schema defining the structured business data fields needed
2. "prefill": Pre-populated values you can infer from the business description

The schema should capture:
- Business identity (name, legal structure, location, registration)
- Product/service details (what they offer, how it''s delivered)
- Target market and customer segments
- Supply chain and sourcing
- Revenue model and pricing
- Key differentiators and competitive advantages
- Growth intentions and timeline
- Team and key personnel
- Current status and traction

Be comprehensive but focused. Only include fields that are relevant to this specific business.',
  
  'Analyze the following Business Value Summary and create a Domain Business Summary schema.

Business Value Summary:
{{bvs}}

{{#if documents}}
Supporting Documents:
{{#each documents}}
- {{this.filename}}: {{this.summary}}
{{/each}}
{{/if}}

Create a JSON response following this exact structure:

```json
{
  "schema": {
    "type": "object",
    "required": ["business_name", "business_description"],
    "properties": {
      "business_name": {
        "type": "string",
        "title": "Business Name"
      },
      "legal_structure": {
        "type": "string",
        "title": "Legal Structure",
        "enum": ["Sole Trader", "Partnership", "Limited Company", "LLP", "Other"]
      },
      // ... additional fields based on BVS analysis
    }
  },
  "prefill": {
    "business_name": "...",
    "business_description": "..."
    // ... values extracted from BVS
  }
}
```

Output ONLY the JSON, no markdown formatting or explanations.',
  
  'claude-sonnet-4-5-20250929',
  0.7,
  4096,
  'json',
  '{
    "type": "object",
    "required": ["schema", "prefill"],
    "properties": {
      "schema": {"type": "object"},
      "prefill": {"type": "object"}
    }
  }'::jsonb,
  true
);
```

#### 4.2 Prompt: DBS_TO_L0

**Purpose:** Generate L0 Domain Study from completed DBS.

```sql
INSERT INTO prompt_templates (
  prompt_code,
  prompt_name,
  category,
  system_prompt,
  user_prompt_template,
  default_model,
  temperature,
  max_tokens,
  output_format,
  output_schema,
  is_active
) VALUES (
  'DBS_TO_L0',
  'Domain Business Summary to L0 Domain Study',
  'FLM',
  'You are a strategic business analyst creating L0 Domain Studies for the Value Chain Evolution Framework (VCEF).

The L0 Domain Study defines the comprehensive business operating domain with:
1. **Domain Definition** - Clear statement of what domain this business operates in
2. **Market Context** - Market size, growth trends, key dynamics
3. **Competitive Landscape** - Major players, market structure, barriers to entry
4. **Value Proposition** - How this business creates and delivers value
5. **Domain Boundaries** - What is in scope vs out of scope
6. **Success Factors** - Critical factors for success in this domain
7. **Risk Factors** - Key risks and challenges
8. **Domain Evolution** - How the domain is changing, technology trends

Your analysis must be strategic, evidence-based, and specific to this business context.',
  
  'Create an L0 Domain Study based on the following information:

Business Value Summary:
{{bvs}}

Domain Business Summary:
{{dbs}}

Analyze this business and create a comprehensive L0 Domain Study covering:

1. Domain Definition (2-3 sentences clearly defining the operating domain)
2. Market Context (market size, growth rate, key trends)
3. Competitive Landscape (market structure, key players, positioning)
4. Value Proposition (how value is created and delivered)
5. Domain Boundaries (what''s included/excluded)
6. Success Factors (3-5 critical success factors)
7. Risk Factors (3-5 key risks)
8. Domain Evolution (trends, technology changes, future outlook)

Output as JSON following this structure:

```json
{
  "domain_definition": "...",
  "market_context": {
    "market_size": "...",
    "growth_rate": "...",
    "key_trends": ["...", "..."]
  },
  "competitive_landscape": {
    "market_structure": "...",
    "key_players": ["...", "..."],
    "positioning": "..."
  },
  "value_proposition": "...",
  "domain_boundaries": {
    "in_scope": ["...", "..."],
    "out_of_scope": ["...", "..."]
  },
  "success_factors": ["...", "...", "..."],
  "risk_factors": ["...", "...", "..."],
  "domain_evolution": {
    "current_trends": ["...", "..."],
    "technology_impact": "...",
    "future_outlook": "..."
  }
}
```',
  
  'claude-sonnet-4-5-20250929',
  0.7,
  6000,
  'json',
  '{
    "type": "object",
    "required": ["domain_definition", "market_context", "value_proposition"],
    "properties": {
      "domain_definition": {"type": "string"},
      "market_context": {"type": "object"},
      "competitive_landscape": {"type": "object"},
      "value_proposition": {"type": "string"},
      "domain_boundaries": {"type": "object"},
      "success_factors": {"type": "array"},
      "risk_factors": {"type": "array"},
      "domain_evolution": {"type": "object"}
    }
  }'::jsonb,
  true
);
```

#### 4.3 Prompt: L0_TO_L1

**Purpose:** Generate L1 Pillars (3-6 sub-domains) from L0 Domain.

```sql
INSERT INTO prompt_templates (
  prompt_code,
  prompt_name,
  category,
  system_prompt,
  user_prompt_template,
  default_model,
  temperature,
  max_tokens,
  output_format,
  output_schema,
  is_active
) VALUES (
  'L0_TO_L1',
  'L0 Domain to L1 Pillars',
  'FLM',
  'You are a business architect defining L1 Pillars (sub-domains) for the Value Chain Evolution Framework.

L1 Pillars represent the major functional areas or sub-domains of the business. Each pillar must:
1. Be strategically distinct from other pillars
2. Have clear unit economics (revenue generation and/or cost structure)
3. Be manageable as a semi-independent business unit
4. Contribute directly to the overall value proposition

You must define 3-6 pillars. Fewer than 3 means insufficient decomposition. More than 6 means over-fragmentation.

For each pillar provide:
- **Pillar Name** - Clear, descriptive name
- **Pillar Purpose** - What this pillar does and why it exists
- **Value Creation** - How this pillar creates value
- **Unit Economics** - Revenue model and cost structure
- **Key Metrics** - 3-5 KPIs to measure this pillar
- **Dependencies** - Dependencies on other pillars or external factors',
  
  'Based on the following L0 Domain Study, define the L1 Pillars for this business:

Business Value Summary:
{{bvs}}

Domain Business Summary:
{{dbs}}

L0 Domain Study:
{{l0}}

Define 3-6 L1 Pillars that decompose this business domain into strategic sub-domains.

Output as JSON:

```json
{
  "pillar_count": 4,
  "pillars": [
    {
      "pillar_code": "P1",
      "pillar_name": "...",
      "pillar_purpose": "...",
      "value_creation": "...",
      "unit_economics": {
        "revenue_model": "...",
        "cost_structure": "...",
        "margin_profile": "..."
      },
      "key_metrics": ["...", "...", "..."],
      "dependencies": ["...", "..."]
    },
    // ... 2-5 more pillars
  ],
  "pillar_interactions": [
    {
      "from_pillar": "P1",
      "to_pillar": "P2",
      "interaction_type": "provides_input",
      "description": "..."
    }
  ]
}
```

CRITICAL: Output between 3-6 pillars. No more, no less.',
  
  'claude-sonnet-4-5-20250929',
  0.8,
  8000,
  'json',
  '{
    "type": "object",
    "required": ["pillar_count", "pillars"],
    "properties": {
      "pillar_count": {"type": "integer", "minimum": 3, "maximum": 6},
      "pillars": {
        "type": "array",
        "minItems": 3,
        "maxItems": 6,
        "items": {"type": "object"}
      },
      "pillar_interactions": {"type": "array"}
    }
  }'::jsonb,
  true
);
```

#### 4.4 Prompt: L1_TO_L2

**Purpose:** Generate L2 Capability Matrix from L1 Pillars.

```sql
INSERT INTO prompt_templates (
  prompt_code,
  prompt_name,
  category,
  system_prompt,
  user_prompt_template,
  default_model,
  temperature,
  max_tokens,
  output_format,
  output_schema,
  is_active
) VALUES (
  'L1_TO_L2',
  'L1 Pillars to L2 Capabilities',
  'FLM',
  'You are a business capabilities analyst defining L2 Capabilities for the Value Chain Evolution Framework.

L2 Capabilities are the specific functional capabilities required within each L1 Pillar. Each capability must:
1. Be operationally specific
2. Have clear inputs and outputs
3. Be measurable
4. Map to value creation
5. Be technology-enableable

For each pillar, define 4-8 capabilities. Each capability should include:
- **Capability Name** - Clear, action-oriented name
- **Capability Purpose** - What this capability does
- **Inputs** - What this capability consumes
- **Outputs** - What this capability produces
- **Value Anchor** - How this maps to value creation (cost reduction, revenue generation, risk mitigation)
- **Current Maturity** - Current state (manual, semi-automated, automated)
- **Target Maturity** - Desired future state
- **Technology Enablers** - Systems/tools that enable this capability',
  
  'Based on the L1 Pillars, define the L2 Capabilities for each pillar:

Business Value Summary:
{{bvs}}

Domain Business Summary:
{{dbs}}

L0 Domain Study:
{{l0}}

L1 Pillars:
{{l1}}

For each pillar, define 4-8 specific capabilities.

Output as JSON:

```json
{
  "capabilities_by_pillar": [
    {
      "pillar_code": "P1",
      "pillar_name": "...",
      "capabilities": [
        {
          "capability_code": "P1_C1",
          "capability_name": "...",
          "capability_purpose": "...",
          "inputs": ["...", "..."],
          "outputs": ["...", "..."],
          "value_anchor": {
            "type": "revenue_generation | cost_reduction | risk_mitigation",
            "impact": "high | medium | low",
            "description": "..."
          },
          "current_maturity": "manual | semi_automated | automated",
          "target_maturity": "semi_automated | automated | ai_enabled",
          "technology_enablers": ["...", "..."]
        },
        // ... 3-7 more capabilities for this pillar
      ]
    },
    // ... capabilities for other pillars
  ],
  "cross_pillar_capabilities": [
    // Optional: capabilities that span multiple pillars
  ]
}
```',
  
  'claude-opus-4-1-20250514', -- Use Opus for complex analysis
  0.8,
  10000,
  'json',
  '{
    "type": "object",
    "required": ["capabilities_by_pillar"],
    "properties": {
      "capabilities_by_pillar": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["pillar_code", "capabilities"],
          "properties": {
            "capabilities": {
              "type": "array",
              "minItems": 4,
              "maxItems": 8
            }
          }
        }
      }
    }
  }'::jsonb,
  true
);
```

#### 4.5 Prompt: FLM_TO_BLUEPRINT

**Purpose:** Compile complete Business Blueprint document.

```sql
INSERT INTO prompt_templates (
  prompt_code,
  prompt_name,
  category,
  system_prompt,
  user_prompt_template,
  default_model,
  temperature,
  max_tokens,
  output_format,
  is_active
) VALUES (
  'FLM_TO_BLUEPRINT',
  'FLM to Business Blueprint',
  'FLM',
  'You are a business documentation specialist compiling comprehensive Business Blueprints from FLM data.

A Business Blueprint is an executive-level document (15-25 pages) that provides a complete view of:
1. Executive Summary
2. Business Overview (from BVS/DBS)
3. Domain Analysis (from L0)
4. Strategic Architecture (from L1 Pillars)
5. Capability Framework (from L2)
6. Implementation Roadmap
7. Value Realization Plan
8. Risk Management Framework
9. Success Metrics

Write in professional business English. Use clear section headers. Be comprehensive but concise. Focus on strategic value, not technical detail.',
  
  'Compile a Business Blueprint from the following FLM data:

Business Value Summary:
{{bvs}}

Domain Business Summary:
{{dbs}}

L0 Domain Study:
{{l0}}

L1 Pillars:
{{l1}}

L2 Capabilities:
{{l2}}

Create a comprehensive Business Blueprint document (markdown format) covering:

# Business Blueprint: [Business Name]

## Executive Summary
- Business overview
- Strategic positioning
- Value proposition
- Key opportunities
- Investment case (if relevant)

## 1. Business Overview
(Synthesize from BVS and DBS)

## 2. Domain Analysis
(From L0 - market context, competitive landscape, domain boundaries)

## 3. Strategic Architecture
(From L1 - pillars, unit economics, value creation)

## 4. Capability Framework
(From L2 - capabilities by pillar, value anchors, maturity path)

## 5. Implementation Roadmap
(Suggest phasing based on capability dependencies)

## 6. Value Realization
(Financial impact, ROI projections, timeline)

## 7. Risk Management
(Key risks from L0, mitigation strategies)

## 8. Success Metrics
(KPIs across pillars, measurement framework)

## Appendices
- Detailed capability definitions
- Pillar interaction map
- Technology enabler catalog

Output as markdown.',
  
  'claude-opus-4-1-20250514', -- Use Opus for document generation
  0.7,
  16000,
  'markdown',
  true
);
```

### Testing Phase 4

- [ ] All prompts inserted into prompt_templates
- [ ] Prompts can be retrieved via prompt library service
- [ ] Variable substitution works correctly
- [ ] Test harness can execute prompts with sample data
- [ ] JSON output validates against schemas
- [ ] Prompt execution logs to prompt_executions table

### Commit Message
```
feat(flm): Add FLM prompt templates to prompt library

- BVS_TO_DBS: Generate DBS schema from business description
- DBS_TO_L0: Generate domain study from structured data
- L0_TO_L1: Generate 3-6 pillars with unit economics
- L1_TO_L2: Generate 4-8 capabilities per pillar
- FLM_TO_BLUEPRINT: Compile comprehensive business blueprint
- All prompts include output schemas and validation
```

### 🛑 STOP POINT 4
**Report completion of Phase 4. Wait for approval before proceeding to Phase 5.**

---

## PHASE 5: Integration & End-to-End Testing
**Duration:** 2 days  
**Status:** WAIT FOR APPROVAL

### Objective
Wire all components together, test complete FLM workflow end-to-end, fix integration issues.

### Integration Points

#### 5.1 Workspace Integration

**Add VC Model Management to Workspace:**

```typescript
// app/dashboard/workspace/page.tsx

// Add "Create VC Model" action
<WorkspaceSection title="Value Chain Models">
  <CreateVCModelButton
    stakeholderId={stakeholder.id}
    onSuccess={(vcModelId) => router.push(`/dashboard/workspace/vc-models/${vcModelId}`)}
  />
  
  {existingVCModels.map(vcModel => (
    <VCModelCard
      key={vcModel.id}
      vcModel={vcModel}
      collaborators={vcModel.collaborators}
      onClick={() => router.push(`/dashboard/workspace/vc-models/${vcModel.id}`)}
    >
      {/* Show FLM status within VC Model card */}
      {vcModel.flm && (
        <FLMStatusBadge 
          status={vcModel.flm.status}
          currentStep={vcModel.flm.current_step}
        />
      )}
    </VCModelCard>
  ))}
</WorkspaceSection>
```

**VC Model Detail Page Structure:**

```typescript
// app/dashboard/workspace/vc-models/[vcModelId]/page.tsx

export default async function VCModelPage({ params }: { params: { vcModelId: string } }) {
  const { vcModelId } = params;
  
  // Fetch VC Model and components
  const vcModel = await fetchVCModel(vcModelId);
  const flmModel = await fetchFLMForVCModel(vcModelId);
  const collaborators = await fetchCollaborators(vcModelId);
  
  return (
    <div className="container mx-auto py-8">
      {/* VC Model Header */}
      <VCModelHeader 
        vcModel={vcModel}
        collaborators={collaborators}
      />
      
      {/* Component Tabs */}
      <Tabs defaultValue="flm">
        <TabsList>
          <TabsTrigger value="flm">FLM (Foundation Layer)</TabsTrigger>
          <TabsTrigger value="agm" disabled>AGM (Activity Groups)</TabsTrigger>
          <TabsTrigger value="overlays" disabled>Overlays</TabsTrigger>
        </TabsList>
        
        <TabsContent value="flm">
          {flmModel ? (
            <FLMModelDisplay
              vcModelId={vcModelId}
              flmModelId={flmModel.id}
              stakeholderId={stakeholder.id}
            />
          ) : (
            <StartFLMButton
              vcModelId={vcModelId}
              onSuccess={(flmId) => setFlmModel(flmId)}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

#### 5.2 FLM Workflow Page

**FLM workflow operates within VC Model context:**

```typescript
// app/dashboard/workspace/vc-models/[vcModelId]/flm/page.tsx

export default async function FLMWorkflowPage({ 
  params 
}: { 
  params: { vcModelId: string } 
}) {
  const { vcModelId } = params;
  
  // Fetch parent VC Model
  const vcModel = await fetchVCModel(vcModelId);
  
  // Fetch FLM model for this VC Model
  const flmModel = await fetchFLMForVCModel(vcModelId);
  
  if (!flmModel) {
    // No FLM exists yet, show creation interface
    return <StartFLMInterface vcModelId={vcModelId} />;
  }
  
  // Fetch artefacts and workflow instance
  const artefacts = await fetchArtefacts(flmModel.id);
  const workflowInstance = await fetchWorkflowInstance(flmModel.workflow_instance_id);
  
  return (
    <div className="container mx-auto py-8">
      {/* Breadcrumb showing VC Model context */}
      <Breadcrumb>
        <BreadcrumbItem href="/dashboard/workspace">Workspace</BreadcrumbItem>
        <BreadcrumbItem href={`/dashboard/workspace/vc-models/${vcModelId}`}>
          {vcModel.model_name}
        </BreadcrumbItem>
        <BreadcrumbItem>FLM Builder</BreadcrumbItem>
      </Breadcrumb>
      
      <FLMModelDisplay
        vcModelId={vcModelId}
        flmModelId={flmModel.id}
        model={flmModel}
        artefacts={artefacts}
        workflowInstance={workflowInstance}
      />
      
      {/* Render appropriate step component based on current step */}
      {renderCurrentStepComponent(flmModel.current_step, vcModel, flmModel, artefacts)}
    </div>
  );
}

function renderCurrentStepComponent(
  currentStep: string, 
  vcModel: VCModel,
  flmModel: FLMModel, 
  artefacts: Artefact[]
) {
  switch(currentStep) {
    case 'BVS':
      return <BVSBuilder vcModelId={vcModel.id} flmModelId={flmModel.id} />;
    case 'DBS':
      const dbsSchema = artefacts.find(a => a.artefact_type === 'DBS_SCHEMA');
      return <DBSForm vcModelId={vcModel.id} flmModelId={flmModel.id} schema={dbsSchema?.artefact_json} />;
    case 'L0':
      return <L0Builder vcModelId={vcModel.id} flmModelId={flmModel.id} artefact={artefacts.find(a => a.artefact_type === 'L0')} />;
    case 'L1':
      return <L1Builder vcModelId={vcModel.id} flmModelId={flmModel.id} artefact={artefacts.find(a => a.artefact_type === 'L1')} />;
    case 'L2':
      return <L2Builder vcModelId={vcModel.id} flmModelId={flmModel.id} artefact={artefacts.find(a => a.artefact_type === 'L2')} />;
    case 'BLUEPRINT':
      return <BlueprintGenerator vcModelId={vcModel.id} flmModelId={flmModel.id} />;
    default:
      return <div>Unknown step</div>;
  }
}
```

#### 5.3 API Routes

**Create necessary API routes:**

**VC Model Routes:**
```typescript
// app/api/vc-models/route.ts - Create new VC Model, list user's VC Models
// app/api/vc-models/[id]/route.ts - Get/update/delete VC Model
// app/api/vc-models/[id]/collaborators/route.ts - Get/add collaborators
// app/api/vc-models/[id]/collaborators/[collaboratorId]/route.ts - Update/remove collaborator
// app/api/vc-models/[id]/versions/route.ts - List versions, create new version
```

**FLM Routes (within VC Model context):**
```typescript
// app/api/vc-models/[vcModelId]/flm/route.ts - Create FLM for VC Model
// app/api/vc-models/[vcModelId]/flm/[flmId]/route.ts - Get/update FLM
// app/api/vc-models/[vcModelId]/flm/[flmId]/artefacts/route.ts - Get artefacts
// app/api/vc-models/[vcModelId]/flm/[flmId]/artefacts/[artefactId]/route.ts - Update artefact
// app/api/vc-models/[vcModelId]/flm/[flmId]/artefacts/[artefactId]/confirm/route.ts - Confirm artefact
```

### End-to-End Testing Scenarios

#### Scenario 1: Complete Happy Path

**Test:** Create VC Model with FLM from start to finish for coffee roasting business

1. Login as stakeholder
2. Navigate to workspace
3. Click "Create VC Model"
4. Enter model name: "Artisan Coffee Roasters VC Model"
5. Submit → Verify VC Model created with model_code
6. Navigate to VC Model detail page
7. Click "Build FLM" (Foundation Layer Model)
8. Enter BVS: "We are a specialty coffee roasting company..."
9. Upload supporting document (optional)
10. Submit BVS → Verify SERVICE_TASK queued
11. Wait for DBS schema generation
12. Complete DBS form with business details
13. Submit for review → Approve DBS
14. Wait for L0 generation
15. Review L0 → Confirm
16. Wait for L1 generation (verify 3-6 pillars)
17. Review L1 → Confirm
18. Wait for L2 generation (verify 4-8 capabilities per pillar)
19. Review L2 → Confirm
20. Final approval
21. Wait for Blueprint generation
22. Verify Business Blueprint document created
23. Verify FLM status = COMPLETED
24. Verify VC Model status = COMPLETED

**Expected Results:**
- [ ] VC Model created successfully
- [ ] FLM created within VC Model
- [ ] Complete workflow executes without errors
- [ ] All artefacts saved correctly in flm_artefacts table
- [ ] All documents saved in file_system under VC Model directory
- [ ] Workflow transitions correctly at each step
- [ ] Guardrails prevent skipping steps
- [ ] AI outputs validate against schemas
- [ ] Final blueprint is comprehensive and well-formatted
- [ ] VC Model shows FLM completion status

#### Scenario 2: Request Changes Flow

**Test:** Request changes during DBS review

1. Start FLM workflow
2. Complete BVS and generate DBS schema
3. Complete DBS form
4. Submit for review → Click "Request Changes"
5. Verify workflow returns to COMPLETE_DBS step
6. Make corrections
7. Re-submit → Approve
8. Verify workflow continues to L0

**Expected Results:**
- [ ] Review gate allows changes request
- [ ] Workflow returns to correct step
- [ ] Previous data preserved for editing
- [ ] After approval, workflow continues normally

#### Scenario 3: Multi-Tenant Isolation

**Test:** Verify different stakeholders can't access each other's VC Models

1. Create VC Model as Stakeholder A
2. Note vc_model_id
3. Logout and login as Stakeholder B
4. Attempt to access Stakeholder A's VC Model
5. Verify access denied

**Expected Results:**
- [ ] RLS policies prevent cross-stakeholder access
- [ ] API returns 403 or 404 for unauthorized access
- [ ] No data leakage between tenants
- [ ] FLM artefacts also inaccessible

#### Scenario 4: Collaboration Workflow

**Test:** Verify multi-stakeholder collaboration on VC Model

1. Login as Stakeholder A (Owner)
2. Create VC Model "Joint Venture Model"
3. Start FLM and complete BVS
4. Add Stakeholder B as collaborator with COLLABORATOR role
5. Logout and login as Stakeholder B
6. Navigate to shared VC Models
7. Verify VC Model visible to Stakeholder B
8. Open VC Model and continue FLM (complete DBS)
9. Logout and login as Stakeholder A
10. Verify DBS completion visible
11. Continue workflow to completion

**Expected Results:**
- [ ] Collaborator can be added successfully
- [ ] Collaborator can access shared VC Model
- [ ] Collaborator can view and edit FLM components (based on permissions)
- [ ] Changes visible to all collaborators
- [ ] Owner retains full control
- [ ] Collaborator list shows all stakeholders with roles

#### Scenario 5: Version Control

**Test:** Verify VC Model versioning works correctly

1. Login as stakeholder
2. Create and complete VC Model v1 (with FLM)
3. Click "Create New Version"
4. Verify new VC Model created with version_number = 2
5. Verify parent_version_id points to v1
6. Verify v1 marked as is_current_version = false
7. Verify v2 marked as is_current_version = true
8. Verify collaborators copied to v2
9. Make changes to v2 FLM
10. Verify v1 remains unchanged

**Expected Results:**
- [ ] New version created correctly
- [ ] Version lineage tracked via parent_version_id
- [ ] Only one current version per model_code
- [ ] Version history browsable
- [ ] Collaborators copied to new version
- [ ] Old versions read-only (archived)

#### Scenario 6: Component Reusability

**Test:** Verify components registered and reusable

1. Query component_registry for FLM components
2. Verify all components registered with correct metadata
3. Verify component_type = 'UI' for UI components
4. Verify reusable flag set correctly

**Expected Results:**
- [ ] All FLM components in registry
- [ ] Metadata includes phase, domain, reusability
- [ ] Components discoverable by other systems

#### Scenario 7: Workflow Recovery

**Test:** Verify workflow can resume after interruption

1. Start FLM workflow
2. Complete BVS and DBS
3. Close browser/logout during L0 review
4. Login again
5. Navigate to FLM model
6. Verify workflow state preserved
7. Continue from L0 review

**Expected Results:**
- [ ] Workflow state persists correctly
- [ ] All completed artefacts remain
- [ ] User can continue from interruption point
- [ ] No data loss

### Integration Testing Checklist

**Data Flow:**
- [ ] BVS input → DBS schema generation works
- [ ] DBS form → L0 generation works
- [ ] L0 → L1 generation works (3-6 pillars)
- [ ] L1 → L2 generation works (4-8 capabilities/pillar)
- [ ] Complete FLM → Blueprint generation works

**Component Integration:**
- [ ] FLMModelDisplay shows correct status
- [ ] Step components receive correct data
- [ ] JSON editor works for all artefact types
- [ ] File upload works for source documents
- [ ] Review gates route correctly

**Workflow Integration:**
- [ ] Workflow engine progresses correctly
- [ ] SERVICE_TASKs execute via service_task_queue
- [ ] USER_TASKs create activity assignments
- [ ] Transitions respect guardrails
- [ ] Workflow history logs all events

**System Integration:**
- [ ] Prompt library loads prompts correctly
- [ ] Claude client executes prompts successfully
- [ ] File system stores documents correctly
- [ ] RLS policies enforce access control
- [ ] Notifications work (if implemented)

### Performance Testing

**Load Testing:**
- [ ] Create 10 concurrent FLM workflows
- [ ] Verify database performance acceptable
- [ ] Verify AI service queue handles load
- [ ] Check for resource bottlenecks

### Documentation Updates

- [ ] Update component registry with all FLM components
- [ ] Document FLM workflow in system documentation
- [ ] Create user guide for FLM process
- [ ] Document API endpoints
- [ ] Update architecture diagrams

### Commit Message
```
feat(flm): Complete FLM integration and end-to-end testing

- Integrated FLM workflow into workspace
- Created FLM model page with step routing
- Added all necessary API routes
- Completed end-to-end testing (5 scenarios)
- Verified component reusability
- Verified multi-tenant isolation
- Verified workflow recovery
- Updated documentation
```

### 🛑 STOP POINT 5
**Report completion of Phase 5. FLM Component Suite is complete and ready for production use.**

---

## Success Criteria (Overall)

### Functional Requirements
- [ ] Users can create VC Models from workspace
- [ ] Users can add collaborators to VC Models
- [ ] Users can create FLM within VC Model
- [ ] BVS capture works with file upload
- [ ] DBS schema generates correctly from BVS
- [ ] DBS form renders dynamically from schema
- [ ] L0 domain study generates with market analysis
- [ ] L1 generates 3-6 pillars with unit economics
- [ ] L2 generates 4-8 capabilities per pillar with value anchors
- [ ] Business Blueprint compiles from complete FLM
- [ ] Review gates work at each step with approval/changes flow
- [ ] All artefacts stored as JSON in database
- [ ] All documents stored in file system under VC Model directory
- [ ] Workflow state persists and recovers correctly
- [ ] Collaboration works (multiple stakeholders can work on same VC Model)
- [ ] Version control works (can create new versions of VC Models)
- [ ] Version history browsable

### Technical Requirements
- [ ] All components registered in component_registry
- [ ] Workflow uses existing workflow_definitions system
- [ ] Prompts use existing prompt_templates system
- [ ] AI execution uses existing service_task_queue
- [ ] File storage uses existing file_system
- [ ] RLS policies enforce multi-tenant isolation
- [ ] No duplicate functionality created
- [ ] TypeScript types properly defined throughout
- [ ] Error handling comprehensive
- [ ] Logging sufficient for debugging

### Quality Requirements
- [ ] All phases tested independently
- [ ] End-to-end testing completed successfully
- [ ] Multi-tenant isolation verified
- [ ] Component reusability verified
- [ ] Performance acceptable under load
- [ ] Code follows existing patterns
- [ ] Documentation complete

### Reusability Requirements
- [ ] Components work across BDA/PDA/ADA domains
- [ ] Workflow definition reusable for different business types
- [ ] Prompts can be customized per domain
- [ ] Architecture supports overlays (Phase 2)
- [ ] Architecture supports AGM (Phase 3+)

---

## Post-Implementation

### Immediate Next Steps
1. User acceptance testing with real stakeholders
2. Gather feedback on AI-generated content quality
3. Refine prompts based on output quality
4. Monitor performance and optimize if needed

### Future Enhancements
1. **Embedding Generation** - Generate embeddings for confirmed artefacts (RAG support)
2. **AGM Integration** - Extend to Activity Group Models (L3-L6)
3. **Overlay System** - Add overlay capabilities (financial, operational, technical)
4. **Domain Customization** - PDA and ADA specific prompts and workflows
5. **AI Model Selection** - Allow users to choose AI model per step
6. **Advanced Collaboration** - Real-time collaborative editing, comments, change tracking
7. **Version Comparison** - Visual diff between different versions of artefacts
8. **Template Library** - Pre-built FLM templates for common business types
9. **Export Options** - PDF export, PowerPoint generation from FLM
10. **Integration APIs** - API endpoints for third-party integrations

---

## Contact & Support

**Developer:** Cursor AI Agent  
**Reviewer:** Ian Peter  
**Project:** VC Studio - Phase 1d.7  
**Repository:** vc-studio-bda-production

**For questions or issues during implementation:**
- Stop at the current phase stop point
- Document the issue clearly
- Request clarification before proceeding

---

**Document Version:** 1.0  
**Created:** January 2026  
**Status:** Ready for Phased Implementation  
**Execution Model:** Phase-by-phase with review gates
