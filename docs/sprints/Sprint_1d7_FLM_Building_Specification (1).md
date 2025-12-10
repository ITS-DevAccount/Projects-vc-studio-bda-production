# Sprint 1d.7 Instructions for Claude Code
## FLM Building Workflow - AI-Enabled Value Chain Model Creation

---

## Sprint Overview

**Sprint Name:** Sprint 1d.7: FLM Building Workflow  
**Objective:** Implement a multi-stage workflow enabling stakeholders to create Framework Level Mapping (FLM) documents through AI-assisted business analysis, producing structured L0-L2 Value Chain Model data.

**Phase:** Phase 1d - Workflow Management System (Final Sprint)  
**Duration:** Phased implementation (3 development phases)  
**Dependencies:** Sprint 1d.1 (Database), Sprint 1d.2 (Registry), Sprint 1d.3 (File System), Sprint 1d.4 (Workflow Operations), Sprint 1d.5 (Service Tasks), Sprint 1d.6 (Monitoring)

**Strategic Importance:** This sprint represents the critical inflection point where VCEF methodology meets systematic AI integration. It establishes the foundation for VC Studio as the tool for creating structured Value Chain Models — the "source of truth" for all downstream domain development.

---

## Development Phases

Sprint 1d.7 is structured as three sequential development phases to enable incremental testing and validation:

### Phase A — AI Interface Foundation
Build the foundational infrastructure for Claude API integration and prompt management.

### Phase B — Workflow Components  
Create the UI components and workflow building blocks for FLM creation.

### Phase C — FLM Assembly
Wire all components into the complete CREATE_FINANCE_MODEL workflow with document generation.

---

## Phase A: AI Interface Foundation

### A1: Claude API Integration Layer

**Objective:** Create a robust, configurable Claude API client supporting multiple models.

**Database Schema Extension:**

```sql
-- Prompt Templates Library
CREATE TABLE prompt_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_uuid UUID NOT NULL REFERENCES applications(app_uuid),
    
    -- Identification
    prompt_code TEXT UNIQUE NOT NULL,
    prompt_name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'FLM', 'AGM', 'DOCUMENT', 'ANALYSIS'
    
    -- Prompt Configuration
    system_prompt TEXT,
    user_prompt_template TEXT NOT NULL,
    
    -- Model Configuration
    default_llm_interface_id UUID REFERENCES llm_interfaces(id),
    temperature NUMERIC DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 4096,
    
    -- Input/Output Schema
    input_schema JSONB DEFAULT '{}',
    output_schema JSONB DEFAULT '{}',
    output_format TEXT DEFAULT 'json', -- 'json', 'markdown', 'text'
    
    -- Versioning
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prompt Execution Log
CREATE TABLE prompt_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Context
    prompt_template_id UUID REFERENCES prompt_templates(id),
    llm_interface_id UUID NOT NULL REFERENCES llm_interfaces(id),
    stakeholder_id UUID REFERENCES stakeholders(id),
    workflow_instance_id UUID REFERENCES workflow_instances(instance_id),
    task_id UUID REFERENCES instance_tasks(task_id),
    
    -- Request
    input_data JSONB NOT NULL,
    rendered_prompt TEXT,
    
    -- Response
    output_data JSONB,
    raw_response TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    error_message TEXT,
    
    -- Metrics
    tokens_input INTEGER,
    tokens_output INTEGER,
    cost_estimate NUMERIC,
    duration_ms INTEGER,
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_prompt_templates_code ON prompt_templates(prompt_code);
CREATE INDEX idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX idx_prompt_executions_stakeholder ON prompt_executions(stakeholder_id);
CREATE INDEX idx_prompt_executions_status ON prompt_executions(status);
```

**Claude API Client (`src/lib/ai/claude-client.ts`):**

```typescript
interface ClaudeClientConfig {
  apiKey: string;
  defaultModel: string;
  maxRetries: number;
  timeout: number;
}

interface PromptRequest {
  promptCode: string;
  inputData: Record<string, any>;
  modelOverride?: string;
  temperatureOverride?: number;
  maxTokensOverride?: number;
}

interface PromptResponse {
  success: boolean;
  data: any;
  rawResponse: string;
  tokensUsed: {
    input: number;
    output: number;
  };
  costEstimate: number;
  durationMs: number;
  error?: string;
}

class ClaudeClient {
  constructor(config: ClaudeClientConfig);
  
  // Execute a prompt from the library
  async executePrompt(request: PromptRequest): Promise<PromptResponse>;
  
  // Execute raw prompt (for testing)
  async executeRaw(
    systemPrompt: string,
    userPrompt: string,
    model?: string
  ): Promise<PromptResponse>;
  
  // Model selection
  selectModel(complexity: 'simple' | 'standard' | 'complex'): string;
  
  // Validation
  validateJsonOutput(output: string, schema: object): boolean;
}
```

**Model Selection Logic:**
- `simple` → `claude-haiku-4-5-20251001` (fast, low cost)
- `standard` → `claude-sonnet-4-5-20250929` (balanced - default)
- `complex` → `claude-opus-4-1-20250514` (complex reasoning)

Model can be overridden per-prompt execution.

### A2: Prompt Library Infrastructure

**Objective:** Create infrastructure for storing, retrieving, and executing prompts with variable substitution.

**Prompt Library Service (`src/lib/ai/prompt-library.ts`):**

```typescript
class PromptLibrary {
  // Retrieve and render a prompt
  async getPrompt(
    promptCode: string, 
    variables: Record<string, any>
  ): Promise<RenderedPrompt>;
  
  // Execute prompt with logging
  async executePrompt(
    promptCode: string,
    variables: Record<string, any>,
    context: ExecutionContext
  ): Promise<PromptResponse>;
  
  // Variable substitution
  renderTemplate(template: string, variables: Record<string, any>): string;
  
  // Schema validation
  validateInput(data: any, schema: object): ValidationResult;
  validateOutput(data: any, schema: object): ValidationResult;
}

interface ExecutionContext {
  stakeholderId?: string;
  workflowInstanceId?: string;
  taskId?: string;
  modelOverride?: string;
}
```

### A3: JSON Schema Validation

**Objective:** Validate LLM outputs against defined schemas to ensure structured data integrity.

**Validator Service (`src/lib/ai/schema-validator.ts`):**

```typescript
import Ajv from 'ajv';

class SchemaValidator {
  // Validate JSON against schema
  validate(data: any, schema: object): ValidationResult;
  
  // Extract JSON from LLM response (handles markdown code blocks)
  extractJson(response: string): any;
  
  // Repair common JSON issues from LLM output
  repairJson(malformedJson: string): string;
}

interface ValidationResult {
  valid: boolean;
  errors?: string[];
  data?: any;
}
```

### A4: Prompt Library CRUD (Admin Menu)

**Objective:** Create full CRUD interface for managing prompt templates, accessible from admin menu.

**Admin Menu Addition:**
```
Admin Dashboard
├── Stakeholders
├── Workflows
├── Services
├── AI Prompts  ← NEW
│   ├── Prompt Library
│   └── Prompt Test Harness
└── System
```

**Prompt Library UI (`/dashboard/admin/prompts`):**

**List View:**
- Table of all prompts with columns: Code, Name, Category, Model, Status, Last Updated
- Filter by category (FLM, AGM, DOCUMENT, ANALYSIS)
- Search by name/code
- Quick actions: Edit, Duplicate, Test, Deactivate

**Create/Edit Form (Standard Template):**

```typescript
interface PromptTemplateForm {
  // Identity
  promptCode: string;        // Auto-generated or manual, unique
  promptName: string;
  description: string;
  category: 'FLM' | 'AGM' | 'DOCUMENT' | 'ANALYSIS';
  
  // Prompt Content
  systemPrompt: string;      // Textarea with syntax highlighting
  userPromptTemplate: string; // Textarea with variable highlighting
  
  // Variables (extracted from template)
  variables: {
    name: string;
    type: 'string' | 'json' | 'number';
    required: boolean;
    description: string;
  }[];
  
  // Model Configuration
  defaultModel: 'sonnet' | 'opus' | 'haiku';
  temperature: number;       // Slider 0-1
  maxTokens: number;
  
  // Output Configuration
  outputFormat: 'json' | 'markdown' | 'text';
  outputSchema?: object;     // JSON Schema editor for JSON outputs
  
  // Status
  isActive: boolean;
  version: number;           // Auto-incremented on save
}
```

**Standard Prompt Template (Pre-populated on Create):**

```json
{
  "promptCode": "NEW_PROMPT_001",
  "promptName": "New Prompt",
  "category": "FLM",
  "systemPrompt": "You are an expert business analyst working within the Value Chain Evolution Framework (VCEF). Your role is to [DESCRIBE ROLE]. You must output [FORMAT].",
  "userPromptTemplate": "Analyse the following input:\n\n{{input}}\n\nProvide your analysis covering:\n\n1. [ASPECT 1]\n2. [ASPECT 2]\n3. [ASPECT 3]\n\nOutput format:\n```json\n{\n  \"field1\": \"...\",\n  \"field2\": \"...\"\n}\n```",
  "defaultModel": "sonnet",
  "temperature": 0.7,
  "maxTokens": 4096,
  "outputFormat": "json",
  "isActive": false
}
```

**Variable Extraction:**
- Auto-detect `{{variableName}}` patterns in templates
- Prompt user to define type and description for each
- Validate all variables have definitions before activation

**Components:**
- `PromptLibraryPage.tsx` — Main list view
- `PromptTemplateForm.tsx` — Create/Edit form
- `PromptVariableEditor.tsx` — Variable definition interface
- `OutputSchemaEditor.tsx` — JSON Schema builder
- `PromptPreview.tsx` — Rendered prompt preview with sample data

### A5: Prompt Test Harness

**Objective:** Interactive testing interface for prompts before workflow integration.

**Test UI (`/dashboard/admin/prompts/test`):**
- Select prompt from library dropdown
- Auto-populate variable input fields from prompt definition
- JSON editor for complex variable inputs
- Model override selector
- Execute button with loading state
- Results panel showing:
  - Rendered prompt (what was sent)
  - Raw response
  - Parsed output (if JSON)
  - Validation result against schema
  - Token usage (input/output)
  - Cost estimate
  - Duration
- Save test case button (for regression testing)
- History of recent executions

---

## Phase B: Workflow Components

### B1: Dynamic JSON-to-Form Renderer

**Objective:** Dynamically generate input forms from JSON schemas produced by LLM.

**Component (`src/components/workflow/DynamicFormRenderer.tsx`):**

```typescript
interface DynamicFormRendererProps {
  schema: JSONSchema;
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

// Supported field types from JSON schema
type FieldType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'array' 
  | 'object'
  | 'enum'
  | 'textarea'
  | 'date'
  | 'currency';

// Schema to form mapping
const schemaTypeToComponent = {
  string: TextInput,
  number: NumberInput,
  boolean: Checkbox,
  enum: SelectDropdown,
  array: ArrayField,
  object: NestedForm,
  textarea: TextArea,
  date: DatePicker,
  currency: CurrencyInput
};
```

**Features:**
- Renders forms from any JSON schema
- Supports nested objects and arrays
- Field validation based on schema constraints
- Conditional field visibility
- Responsive layout

### B2: Review Gate UI

**Objective:** Create a standardised component for user/admin review at each workflow stage.

**Component (`src/components/workflow/ReviewGate.tsx`):**

```typescript
interface ReviewGateProps {
  title: string;
  description?: string;
  content: ReviewContent;
  contentType: 'json' | 'markdown' | 'document';
  
  // Routing
  allowedReviewers: ('client' | 'admin' | 'system')[];
  currentReviewer: string;
  
  // Actions
  onApprove: () => void;
  onRequestChanges: (feedback: string) => void;
  onReject: () => void;
  
  // Edit capability
  allowEdit?: boolean;
  onEdit?: (editedContent: any) => void;
}

interface ReviewContent {
  data: any;
  displayFormat?: 'raw' | 'formatted' | 'comparison';
  previousVersion?: any; // For showing diff
}
```

**Features:**
- Configurable routing (client/admin/system)
- Approve/Request Changes/Reject actions
- Inline editing capability
- Version comparison view
- Feedback capture

### B3: Workspace Dashboard Extension

**Objective:** Extend stakeholder workspace to display workflow components and FLM progress.

**Workspace Components:**
- `WorkflowLauncher.tsx` — Start new workflow (e.g., "Create Finance Model")
- `WorkflowProgressCard.tsx` — Show active workflow progress
- `FLMStatusDisplay.tsx` — Display current FLM completion status
- `DocumentList.tsx` — Show generated documents in file system

**Workspace Configuration (JSONB in stakeholder record):**

```typescript
interface WorkspaceConfig {
  // File system root
  fileSystemRoot: string;
  
  // Available workflows
  availableWorkflows: {
    workflowCode: string;
    displayName: string;
    description: string;
    icon: string;
  }[];
  
  // Active workflow instances
  activeWorkflows: {
    instanceId: string;
    workflowCode: string;
    currentStep: number;
    status: string;
  }[];
  
  // FLM Status
  flmStatus?: {
    hasL0: boolean;
    hasL1: boolean;
    hasL2: boolean;
    isApproved: boolean;
    lastUpdated: string;
  };
}
```

### B4: File System Integration

**Objective:** Integrate with existing file system (Sprint 1d.3) to store FLM documents, user uploads, and generated documents.

**File Structure for Stakeholder:**

```
/stakeholders/{stakeholder_id}/
  /uploads/                    ← USER-UPLOADED DOCUMENTS
    business_plan.pdf
    financial_model.xlsx
    pitch_deck_v1.pptx
    market_research.pdf
    team_bios.docx
  /flm/
    /drafts/
      bvs_draft.json
      dbs_draft.json
      l0_draft.json
      l1_draft.json
      l2_draft.json
    /approved/
      bvs_approved.json
      dbs_approved.json
      l0_approved.json
      l1_approved.json
      l2_approved.json
  /generated/                  ← AI-GENERATED DOCUMENTS
    business_blueprint.md
    one_pager.md
    pitch_deck.json
    messaging_framework.json
    website_proforma.json
```

**User Upload Capability:**

```typescript
interface FileUploadConfig {
  allowedTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/csv',
    'image/png',
    'image/jpeg'
  ];
  maxFileSize: '50MB';
  categorisation: {
    'business_plan': 'Business Plan',
    'financial_model': 'Financial Model',
    'pitch_deck': 'Pitch Deck',
    'market_research': 'Market Research',
    'team_info': 'Team Information',
    'legal': 'Legal Documents',
    'other': 'Other'
  };
}
```

**File Operations:**
- `uploadFile(stakeholderId, file, category)` — Upload to /uploads/
- `saveDraft(stakeholderId, documentType, data)` — Save draft to /flm/drafts/
- `approveDraft(stakeholderId, documentType)` — Move from /drafts/ to /approved/
- `saveGenerated(stakeholderId, documentType, data)` — Save to /generated/
- `getDocument(stakeholderId, path)` — Retrieve any document
- `listDocuments(stakeholderId, folder)` — List all documents in folder
- `deleteDocument(stakeholderId, path)` — Remove document (with audit)

**Upload UI Component (`src/components/files/FileUploader.tsx`):**
- Drag-and-drop zone
- File type validation
- Category selection
- Progress indicator
- Success/error feedback

### B5: Admin Stakeholder File Access

**Objective:** Enable admin users to view and contribute to any stakeholder's file system.

**Admin File Browser (`/dashboard/admin/stakeholders/[id]/files`):**

```typescript
interface AdminFileBrowserProps {
  stakeholderId: string;
  
  // Permissions
  canView: boolean;      // Always true for admin
  canUpload: boolean;    // Admin can add documents
  canDelete: boolean;    // Admin can remove documents
  canDownload: boolean;  // Admin can download documents
}
```

**Features:**
- Browse full stakeholder file tree
- View document contents (preview for PDF, images)
- Upload documents on behalf of stakeholder
- Download documents
- View document metadata (uploaded by, date, category)
- Audit trail of all admin file actions

**Admin Upload Logging:**
```sql
-- Track admin contributions to stakeholder files
INSERT INTO file_audit_log (
  stakeholder_id,
  file_path,
  action,           -- 'upload', 'delete', 'view', 'download'
  performed_by,     -- user_id of admin
  performed_at,
  metadata
) VALUES (...);
```

**Navigation from Admin Stakeholder View:**
```
Admin → Stakeholders → [Stakeholder Name]
├── Profile
├── Files  ← NEW TAB
│   ├── Uploads (user documents)
│   ├── FLM (drafts/approved)
│   └── Generated (AI documents)
├── Workflows
└── Activity
```

### B6: VC Model Viewer

**Objective:** Create a visual component displaying the FLM structure, accessible from stakeholder workspace and admin views.

**Stakeholder Workspace Placement:**
```
Stakeholder Workspace
├── Overview
├── VC Model  ← NEW TAB (shows FLM viewer)
├── Documents
├── Workflows
└── Settings
```

**VC Model Viewer Component (`src/components/flm/VCModelViewer.tsx`):**

```typescript
interface VCModelViewerProps {
  stakeholderId: string;
  viewMode: 'stakeholder' | 'admin';
  
  // Display options
  showDrafts: boolean;      // Show draft status indicators
  showCompletion: boolean;  // Show completion percentage
  expandedByDefault: boolean;
}
```

**Visual Structure:**

```
┌─────────────────────────────────────────────────────────────┐
│  VC MODEL: [Business Name]                    Status: 80%   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  L0 DOMAIN                                          ✓       │
│  ├─ Market Context                                          │
│  │   TAM: £2.5B | SAM: £450M | SOM: £45M                   │
│  ├─ Competitive Landscape                                   │
│  │   3 direct competitors identified                        │
│  ├─ Regulatory Environment                                  │
│  │   Food safety, Import/Export                            │
│  └─ Customer Profile                                        │
│      B2B: Coffee shops | B2C: Online retail                │
│                                                             │
│  L1 BUSINESS PILLARS                                ✓       │
│  ├─ [SOURCING] Green Coffee Procurement                     │
│  │   Value: 35% of margin                                   │
│  ├─ [PRODUCTION] Roasting Operations                        │
│  │   Value: 25% of margin                                   │
│  ├─ [SALES] B2B & B2C Channels                             │
│  │   Value: 30% of margin                                   │
│  └─ [OPERATIONS] Support & Logistics                        │
│      Value: 10% of margin                                   │
│                                                             │
│  L2 CAPABILITIES                                    ◐       │
│  ├─ SOURCING                                                │
│  │   ├─ Supplier Management          ✓                      │
│  │   ├─ Quality Control              ✓                      │
│  │   └─ Import Logistics             ○ (not started)        │
│  ├─ PRODUCTION                                              │
│  │   ├─ Roasting Process             ✓                      │
│  │   └─ Packaging                    ✓                      │
│  └─ ... (expandable)                                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [View Full Detail]  [Export]  [Edit] (if permitted)        │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Hierarchical tree view of L0 → L1 → L2
- Completion status indicators (✓ complete, ◐ partial, ○ not started)
- Expandable/collapsible sections
- Key metrics display at each level
- Click-through to detailed view
- Export to PDF/JSON
- Edit link (for users with permission, launches workflow)

**Admin View Enhancements:**
- View any stakeholder's VC Model
- See workflow status (which step they're on)
- Add admin notes/comments
- Quick actions (approve pending items, send reminder)

**Integration with Workspace:**
- VC Model tab shows viewer if FLM exists
- Shows "Create Your VC Model" CTA if no FLM
- Progress indicator on workspace overview card

---

## Phase C: FLM Assembly

### C0: Integration with Existing Infrastructure

**Critical Principle:** Sprint 1d.7 builds on existing infrastructure from earlier sprints. All workflow functionality must use the established patterns.

**Existing Components to Leverage:**

| Component | Sprint | Usage in 1d.7 |
|-----------|--------|---------------|
| `workflow_definitions` table | 1d.2 | Register FLM and Finance workflows |
| `workflow_nodes` table | 1d.2 | Define all workflow steps |
| `workflow_transitions` table | 1d.2 | Define flow between steps |
| `workflow_instances` table | 1d.3 | Create instances when user starts workflow |
| `instance_tasks` table | 1d.3 | Track task completion |
| `service_configurations` table | 1d.5 | Register Claude as a service |
| `service_task_queue` table | 1d.5 | Queue AI prompt executions |
| Workflow Engine | 1d.3 | Orchestrate workflow progression |
| Service Task Worker | 1d.5 | Execute AI prompts asynchronously |
| File System | 1d.3 | Store all FLM documents |
| Review/Approval patterns | 1d.4 | USER_TASK with approval actions |

**New Tables (1d.7 specific):**
- `prompt_templates` — Prompt library (Phase A)
- `prompt_executions` — Execution logging (Phase A)
- `file_audit_log` — Track admin file access (Phase B)

**Service Configuration for Claude:**

```sql
-- Register Claude as a service in existing service_configurations table
INSERT INTO service_configurations (
  app_uuid,
  service_name,
  service_type,
  description,
  is_active
) VALUES (
  (SELECT app_uuid FROM applications WHERE app_code = 'VC_STUDIO'),
  'Claude AI - Prompt Execution',
  'REAL',
  'Execute prompts from prompt library via Claude API',
  true
);
```

**Workflow Registration Pattern:**
All workflows registered via existing `workflow_definitions` table and built using Workflow Builder UI or SQL migration.

### C1: Workflow Split Strategy

**Two Separate Workflows:**

1. **BUILD_FLM** — Creates the Value Chain Model (L0-L2)
   - Reusable across ALL stakeholder types
   - MVP template for any business
   - Output: Complete FLM in file system

2. **GENERATE_FINANCE_DOCS** — Creates investment documents
   - Specific to investment-seeking stakeholders
   - Requires completed FLM as prerequisite
   - Output: Blueprint, One-Pager, Pitch Deck, etc.

**Why Split:**
- FLM is universally applicable (consultants, operators, investors all need it)
- Finance documents are context-specific
- Allows independent testing and iteration
- Enables future workflow variations (e.g., GENERATE_OPERATIONAL_DOCS, GENERATE_COMPLIANCE_DOCS)

### C2: Workflow 1 — BUILD_FLM

**Workflow Code:** `BUILD_FLM`  
**Purpose:** Guide any stakeholder through FLM creation (L0-L2)  
**Reusability:** Template for all stakeholder types

**Registration (using existing workflow_definitions):**

```sql
INSERT INTO workflow_definitions (
  app_uuid,
  workflow_code,
  workflow_name,
  description,
  workflow_type,
  is_active,
  config
) VALUES (
  (SELECT app_uuid FROM applications WHERE app_code = 'VC_STUDIO'),
  'BUILD_FLM',
  'Build Framework Level Model',
  'Create L0-L2 Value Chain Model for any business',
  'SEQUENTIAL',
  true,
  '{
    "reusable": true,
    "stakeholderTypes": ["all"],
    "prerequisiteWorkflows": [],
    "outputFolder": "/flm"
  }'
);
```

**Workflow Nodes (registered in workflow_nodes):**

```
START
  │
  ▼
CAPTURE_BVS (USER_TASK)
  │ User enters natural language business description
  ▼
GENERATE_DBS_SCHEMA (SERVICE_TASK → Claude)
  │ AI generates structured data requirements
  ▼
COMPLETE_DBS (USER_TASK)
  │ User fills dynamic form from schema
  ▼
REVIEW_DBS (USER_TASK + Review Gate)
  │ Approve / Request Changes
  │ ◄──── (loop back if changes requested)
  ▼
GENERATE_L0 (SERVICE_TASK → Claude)
  │ AI generates domain study
  ▼
REVIEW_L0 (USER_TASK + Review Gate)
  │ Approve / Request Changes
  │ Define pillars (3-6) and unit economics
  │ ◄──── (loop back if changes requested)
  ▼
GENERATE_L1 (SERVICE_TASK → Claude)
  │ AI generates pillar definitions
  ▼
REVIEW_L1 (USER_TASK + Review Gate)
  │ Approve / Request Changes
  │ ◄──── (loop back if changes requested)
  ▼
GENERATE_L2 (SERVICE_TASK → Claude)
  │ AI generates capabilities matrix
  ▼
REVIEW_L2 (USER_TASK + Review Gate)
  │ Final review of complete FLM
  │ ◄──── (loop back if changes requested)
  ▼
COMMIT_FLM (SYSTEM_TASK)
  │ Move all drafts to approved folder
  ▼
END
```

**Node Configurations:**

```typescript
const BUILD_FLM_NODES = [
  {
    nodeCode: 'CAPTURE_BVS',
    nodeType: 'USER_TASK',
    nodeName: 'Business Value Summary',
    sequence: 1,
    config: {
      taskType: 'form',
      formConfig: {
        fields: [{
          name: 'bvs',
          type: 'textarea',
          label: 'Describe your business',
          placeholder: 'What does your business do? Who do you serve? How do you create value?',
          helpText: 'Example: I want to sell roasted coffee. I buy from wholesalers or direct from source countries. I roast in-house in the UK. I sell to coffee shops and online.',
          validation: { minLength: 50, maxLength: 2000, required: true }
        }]
      },
      outputPath: '/flm/drafts/bvs_draft.json'
    }
  },
  {
    nodeCode: 'GENERATE_DBS_SCHEMA',
    nodeType: 'SERVICE_TASK',
    nodeName: 'Generate Business Data Schema',
    sequence: 2,
    config: {
      serviceType: 'CLAUDE_PROMPT',
      promptCode: 'BVS_TO_DBS',
      inputMapping: {
        bvs: '{{tasks.CAPTURE_BVS.output.bvs}}'
      },
      outputPath: '/flm/drafts/dbs_schema.json'
    }
  },
  {
    nodeCode: 'COMPLETE_DBS',
    nodeType: 'USER_TASK',
    nodeName: 'Complete Business Summary',
    sequence: 3,
    config: {
      taskType: 'dynamic_form',
      schemaSource: '{{tasks.GENERATE_DBS_SCHEMA.output.schema}}',
      prefillSource: '{{tasks.GENERATE_DBS_SCHEMA.output.prefill}}',
      outputPath: '/flm/drafts/dbs_draft.json'
    }
  },
  {
    nodeCode: 'REVIEW_DBS',
    nodeType: 'USER_TASK',
    nodeName: 'Review Business Summary',
    sequence: 4,
    config: {
      taskType: 'review_gate',
      reviewConfig: {
        contentSource: '{{tasks.COMPLETE_DBS.output}}',
        routing: ['client', 'admin'],
        actions: ['approve', 'request_changes'],
        allowEdit: true
      },
      onApprove: 'GENERATE_L0',
      onRequestChanges: 'COMPLETE_DBS'
    }
  },
  {
    nodeCode: 'GENERATE_L0',
    nodeType: 'SERVICE_TASK',
    nodeName: 'Generate Domain Study (L0)',
    sequence: 5,
    config: {
      serviceType: 'CLAUDE_PROMPT',
      promptCode: 'DBS_TO_L0',
      inputMapping: {
        bvs: '{{tasks.CAPTURE_BVS.output.bvs}}',
        dbs: '{{tasks.COMPLETE_DBS.output}}'
      },
      outputPath: '/flm/drafts/l0_draft.json'
    }
  },
  {
    nodeCode: 'REVIEW_L0',
    nodeType: 'USER_TASK',
    nodeName: 'Review Domain Study & Define Pillars',
    sequence: 6,
    config: {
      taskType: 'review_gate',
      reviewConfig: {
        contentSource: '{{tasks.GENERATE_L0.output}}',
        routing: ['client', 'admin'],
        actions: ['approve', 'request_changes'],
        allowEdit: true,
        additionalInputs: {
          pillars: {
            type: 'array',
            label: 'Business Pillars',
            minItems: 3,
            maxItems: 6,
            itemSchema: {
              code: { type: 'string', label: 'Pillar Code' },
              name: { type: 'string', label: 'Pillar Name' },
              description: { type: 'string', label: 'Description' }
            },
            suggestFromAI: true,
            aiSuggestionPrompt: 'SUGGEST_PILLARS'
          },
          unitEconomics: {
            type: 'object',
            label: 'Unit Economics',
            fields: {
              sellPrice: { type: 'currency', label: 'Sell Price' },
              originationCost: { type: 'currency', label: 'Origination Cost' },
              grossMargin: { type: 'percentage', label: 'Gross Margin', calculated: true },
              monthlyVolume: { type: 'number', label: 'Monthly Volume' }
            }
          }
        }
      },
      onApprove: 'GENERATE_L1',
      onRequestChanges: 'GENERATE_L0'
    }
  },
  {
    nodeCode: 'GENERATE_L1',
    nodeType: 'SERVICE_TASK',
    nodeName: 'Generate Business Pillars (L1)',
    sequence: 7,
    config: {
      serviceType: 'CLAUDE_PROMPT',
      promptCode: 'L0_TO_L1',
      inputMapping: {
        l0: '{{tasks.GENERATE_L0.output}}',
        pillars: '{{tasks.REVIEW_L0.output.pillars}}',
        unitEconomics: '{{tasks.REVIEW_L0.output.unitEconomics}}'
      },
      outputPath: '/flm/drafts/l1_draft.json'
    }
  },
  {
    nodeCode: 'REVIEW_L1',
    nodeType: 'USER_TASK',
    nodeName: 'Review Business Pillars',
    sequence: 8,
    config: {
      taskType: 'review_gate',
      reviewConfig: {
        contentSource: '{{tasks.GENERATE_L1.output}}',
        routing: ['client', 'admin'],
        actions: ['approve', 'request_changes'],
        allowEdit: true
      },
      onApprove: 'GENERATE_L2',
      onRequestChanges: 'GENERATE_L1'
    }
  },
  {
    nodeCode: 'GENERATE_L2',
    nodeType: 'SERVICE_TASK',
    nodeName: 'Generate Capabilities Matrix (L2)',
    sequence: 9,
    config: {
      serviceType: 'CLAUDE_PROMPT',
      promptCode: 'L1_TO_L2',
      inputMapping: {
        bvs: '{{tasks.CAPTURE_BVS.output.bvs}}',
        dbs: '{{tasks.COMPLETE_DBS.output}}',
        l0: '{{tasks.GENERATE_L0.output}}',
        l1: '{{tasks.GENERATE_L1.output}}'
      },
      outputPath: '/flm/drafts/l2_draft.json'
    }
  },
  {
    nodeCode: 'REVIEW_L2',
    nodeType: 'USER_TASK',
    nodeName: 'Final FLM Review',
    sequence: 10,
    config: {
      taskType: 'review_gate',
      reviewConfig: {
        displayAll: [
          { label: 'Business Value Summary', source: '{{tasks.CAPTURE_BVS.output}}' },
          { label: 'Domain Business Summary', source: '{{tasks.COMPLETE_DBS.output}}' },
          { label: 'L0 Domain Study', source: '{{tasks.GENERATE_L0.output}}' },
          { label: 'L1 Business Pillars', source: '{{tasks.GENERATE_L1.output}}' },
          { label: 'L2 Capabilities', source: '{{tasks.GENERATE_L2.output}}' }
        ],
        routing: ['client'],
        actions: ['approve', 'request_changes'],
        allowEdit: false
      },
      onApprove: 'COMMIT_FLM',
      onRequestChanges: 'REVIEW_L1'
    }
  },
  {
    nodeCode: 'COMMIT_FLM',
    nodeType: 'SYSTEM_TASK',
    nodeName: 'Commit FLM to Storage',
    sequence: 11,
    config: {
      action: 'commit_flm',
      operations: [
        { from: '/flm/drafts/bvs_draft.json', to: '/flm/approved/bvs.json' },
        { from: '/flm/drafts/dbs_draft.json', to: '/flm/approved/dbs.json' },
        { from: '/flm/drafts/l0_draft.json', to: '/flm/approved/l0.json' },
        { from: '/flm/drafts/l1_draft.json', to: '/flm/approved/l1.json' },
        { from: '/flm/drafts/l2_draft.json', to: '/flm/approved/l2.json' }
      ],
      updateStakeholderConfig: {
        'flmStatus.isApproved': true,
        'flmStatus.approvedAt': '{{NOW}}'
      }
    }
  }
];
```

### C3: Workflow 2 — GENERATE_FINANCE_DOCS

**Workflow Code:** `GENERATE_FINANCE_DOCS`  
**Purpose:** Generate investment documentation from completed FLM  
**Prerequisite:** BUILD_FLM must be completed

**Registration:**

```sql
INSERT INTO workflow_definitions (
  app_uuid,
  workflow_code,
  workflow_name,
  description,
  workflow_type,
  is_active,
  config
) VALUES (
  (SELECT app_uuid FROM applications WHERE app_code = 'VC_STUDIO'),
  'GENERATE_FINANCE_DOCS',
  'Generate Investment Documents',
  'Create investment documentation from completed FLM',
  'SEQUENTIAL',
  true,
  '{
    "reusable": false,
    "stakeholderTypes": ["investment_seeking"],
    "prerequisiteWorkflows": ["BUILD_FLM"],
    "prerequisiteCheck": "flmStatus.isApproved === true",
    "outputFolder": "/generated"
  }'
);
```

**Workflow Nodes:**

```
START
  │
  ▼
CHECK_FLM_COMPLETE (GATEWAY)
  │ Verify FLM exists and is approved
  │ ──── (fail) ──── REDIRECT_TO_FLM
  ▼
UPLOAD_FINANCIAL_MODEL (USER_TASK)
  │ User uploads financial model (xlsx/pdf)
  │ Or uses simple calculator
  ▼
DEFINE_INVESTOR_PROFILE (USER_TASK)
  │ Target investor type, stage, sector preferences
  ▼
GENERATE_BLUEPRINT (SERVICE_TASK → Claude)
  │ AI generates comprehensive business blueprint
  ▼
REVIEW_BLUEPRINT (USER_TASK + Review Gate)
  │ Approve / Request Changes
  ▼
GENERATE_ONE_PAGER (SERVICE_TASK → Claude)
  │ AI generates visual summary structure
  ▼
REVIEW_ONE_PAGER (USER_TASK + Review Gate)
  │ Approve / Request Changes
  ▼
GENERATE_PITCH_DECK (SERVICE_TASK → Claude)
  │ AI generates pitch deck structure based on investor profile
  ▼
REVIEW_PITCH_DECK (USER_TASK + Review Gate)
  │ Approve / Request Changes
  ▼
COMMIT_FINANCE_DOCS (SYSTEM_TASK)
  │ Move all to /generated folder
  ▼
END
```

**Key Node Configurations:**

```typescript
const FINANCE_DOC_NODES = [
  {
    nodeCode: 'CHECK_FLM_COMPLETE',
    nodeType: 'GATEWAY',
    nodeName: 'Verify FLM Complete',
    config: {
      gatewayType: 'exclusive',
      conditions: [
        {
          expression: '{{stakeholder.config.flmStatus.isApproved}} === true',
          targetNode: 'UPLOAD_FINANCIAL_MODEL'
        },
        {
          expression: 'default',
          targetNode: 'REDIRECT_TO_FLM'
        }
      ]
    }
  },
  {
    nodeCode: 'REDIRECT_TO_FLM',
    nodeType: 'SYSTEM_TASK',
    nodeName: 'FLM Required',
    config: {
      action: 'show_message',
      message: 'Please complete your Framework Level Model before generating investment documents.',
      suggestedWorkflow: 'BUILD_FLM',
      terminateWorkflow: true
    }
  },
  {
    nodeCode: 'UPLOAD_FINANCIAL_MODEL',
    nodeType: 'USER_TASK',
    nodeName: 'Financial Model',
    config: {
      taskType: 'file_upload_or_calculator',
      uploadConfig: {
        acceptedTypes: ['xlsx', 'csv', 'pdf'],
        category: 'financial_model',
        required: false
      },
      calculatorConfig: {
        enabled: true,
        fields: {
          monthlyRevenue: { type: 'currency', label: 'Monthly Revenue' },
          monthlyExpenses: { type: 'currency', label: 'Monthly Expenses' },
          runway: { type: 'number', label: 'Runway (months)' },
          fundingRequired: { type: 'currency', label: 'Funding Required' }
        }
      },
      outputPath: '/generated/financial_summary.json'
    }
  },
  {
    nodeCode: 'DEFINE_INVESTOR_PROFILE',
    nodeType: 'USER_TASK',
    nodeName: 'Target Investor Profile',
    config: {
      taskType: 'form',
      formConfig: {
        fields: [
          {
            name: 'investorType',
            type: 'select',
            label: 'Investor Type',
            options: ['Angel', 'Seed VC', 'Series A VC', 'Family Office', 'Corporate', 'Crowdfunding']
          },
          {
            name: 'investmentStage',
            type: 'select',
            label: 'Investment Stage',
            options: ['Pre-seed', 'Seed', 'Series A', 'Growth']
          },
          {
            name: 'sectorFocus',
            type: 'multiselect',
            label: 'Sector Focus',
            options: ['AgTech', 'FoodTech', 'B2B SaaS', 'Consumer', 'Deep Tech', 'Climate']
          },
          {
            name: 'geographyFocus',
            type: 'multiselect',
            label: 'Geography',
            options: ['UK', 'Europe', 'US', 'Global']
          },
          {
            name: 'keyMessages',
            type: 'textarea',
            label: 'Key Messages to Emphasise',
            placeholder: 'What aspects of your business should be highlighted?'
          }
        ]
      },
      outputPath: '/generated/investor_profile.json'
    }
  },
  {
    nodeCode: 'GENERATE_BLUEPRINT',
    nodeType: 'SERVICE_TASK',
    nodeName: 'Generate Business Blueprint',
    config: {
      serviceType: 'CLAUDE_PROMPT',
      promptCode: 'FLM_TO_BLUEPRINT',
      inputMapping: {
        flm: {
          bvs: '{{files./flm/approved/bvs.json}}',
          dbs: '{{files./flm/approved/dbs.json}}',
          l0: '{{files./flm/approved/l0.json}}',
          l1: '{{files./flm/approved/l1.json}}',
          l2: '{{files./flm/approved/l2.json}}'
        },
        financialSummary: '{{tasks.UPLOAD_FINANCIAL_MODEL.output}}',
        investorProfile: '{{tasks.DEFINE_INVESTOR_PROFILE.output}}'
      },
      outputPath: '/generated/drafts/business_blueprint.md'
    }
  },
  {
    nodeCode: 'GENERATE_PITCH_DECK',
    nodeType: 'SERVICE_TASK',
    nodeName: 'Generate Pitch Deck',
    config: {
      serviceType: 'CLAUDE_PROMPT',
      promptCode: 'FLM_TO_PITCH_DECK',
      inputMapping: {
        flm: '{{flm}}',
        investorProfile: '{{tasks.DEFINE_INVESTOR_PROFILE.output}}',
        blueprint: '{{tasks.GENERATE_BLUEPRINT.output}}'
      },
      deckLibraryEnabled: true,
      outputPath: '/generated/drafts/pitch_deck.json'
    }
  }
];
```

### C4: Prompt Definitions

**Prompt 1: BVS_TO_DBS**

```json
{
  "prompt_code": "BVS_TO_DBS",
  "prompt_name": "Business Value Summary to Domain Business Summary",
  "category": "FLM",
  "system_prompt": "You are a business analyst expert in the Value Chain Evolution Framework (VCEF). Your role is to analyse natural language business descriptions and create structured data requirements for comprehensive business documentation. You must output valid JSON only.",
  
  "user_prompt_template": "Analyse the following Business Value Summary (BVS) and create a Domain Business Summary (DBS) schema.\n\nBVS:\n{{bvs}}\n\nCreate a JSON response with two parts:\n1. 'schema': A JSON Schema defining the structured business data fields needed to fully document this business\n2. 'prefill': Pre-populated values you can infer from the BVS\n\nThe schema should capture:\n- Business identity (name, legal structure, location)\n- Product/service details\n- Target market and customer segments\n- Supply chain / sourcing\n- Revenue model\n- Key differentiators\n- Growth intentions\n\nOutput format:\n```json\n{\n  \"schema\": { ... JSON Schema ... },\n  \"prefill\": { ... pre-populated values ... }\n}\n```",
  
  "output_format": "json",
  "output_schema": {
    "type": "object",
    "required": ["schema", "prefill"],
    "properties": {
      "schema": { "type": "object" },
      "prefill": { "type": "object" }
    }
  }
}
```

**Prompt 2: DBS_TO_L0**

```json
{
  "prompt_code": "DBS_TO_L0",
  "prompt_name": "Domain Business Summary to L0 Domain Study",
  "category": "FLM",
  "system_prompt": "You are a strategic business analyst creating L0 Domain Studies for the Value Chain Evolution Framework (VCEF). L0 represents the broadest context in which a business operates. You must output comprehensive, structured JSON.",
  
  "user_prompt_template": "Create an L0 Domain Study based on the following business information.\n\nBusiness Value Summary:\n{{bvs}}\n\nDomain Business Summary:\n{{dbs}}\n\nGenerate a comprehensive L0 Domain Study covering:\n\n1. **Market Context**\n   - Total Addressable Market (TAM)\n   - Serviceable Addressable Market (SAM)\n   - Serviceable Obtainable Market (SOM)\n   - Market trends and growth drivers\n   - Market maturity stage\n\n2. **Competitive Landscape**\n   - Key competitors (direct and indirect)\n   - Competitive positioning\n   - Barriers to entry\n   - Differentiation opportunities\n\n3. **Regulatory Environment**\n   - Relevant regulations and compliance requirements\n   - Certifications required\n   - Jurisdictional considerations\n\n4. **Customer Analysis**\n   - Primary customer segments\n   - Customer personas\n   - Pain points and needs\n   - Buying behaviour\n\n5. **Stakeholder Ecosystem**\n   - Key supplier relationships\n   - Distribution channels\n   - Strategic partners\n   - Industry associations\n\n6. **Value Proposition**\n   - Core offering definition\n   - Unique selling points\n   - Value delivery mechanism\n\n7. **Risk Factors**\n   - Market risks\n   - Operational risks\n   - Competitive risks\n\nOutput as structured JSON with clear sections.",
  
  "output_format": "json",
  "max_tokens": 8192
}
```

**Prompt 3: L0_TO_L1**

```json
{
  "prompt_code": "L0_TO_L1",
  "prompt_name": "L0 Domain Study to L1 Business Pillars",
  "category": "FLM",
  "system_prompt": "You are creating L1 Sub-Domain definitions for VCEF. L1 represents the major business segments aligned with strategic objectives. Each pillar should represent a distinct value creation area that can be decomposed into capabilities (L2).",
  
  "user_prompt_template": "Create L1 Business Pillar definitions based on the following:\n\nL0 Domain Study:\n{{l0}}\n\nDefined Pillars:\n{{pillars}}\n\nUnit Economics:\n{{unitEconomics}}\n\nFor each pillar, create a comprehensive definition including:\n\n1. **Pillar Identity**\n   - Code (e.g., 'SOURCING', 'PRODUCTION', 'SALES')\n   - Name\n   - Description\n   - Strategic objective\n\n2. **Value Contribution**\n   - How this pillar contributes to overall value chain\n   - Revenue attribution (if applicable)\n   - Cost attribution\n   - Key metrics\n\n3. **Operational Scope**\n   - Primary activities\n   - Key processes\n   - Resource requirements\n   - Technology needs\n\n4. **Dependencies**\n   - Upstream dependencies (inputs from other pillars)\n   - Downstream dependencies (outputs to other pillars)\n   - External dependencies\n\n5. **Success Factors**\n   - Critical success factors\n   - Key performance indicators\n   - Risk factors\n\nOutput as structured JSON array of pillar definitions.",
  
  "output_format": "json",
  "max_tokens": 8192
}
```

**Prompt 4: L1_TO_L2**

```json
{
  "prompt_code": "L1_TO_L2",
  "prompt_name": "L1 Business Pillars to L2 Capabilities Matrix",
  "category": "FLM",
  "system_prompt": "You are creating L2 Component/Capability definitions for VCEF. L2 represents the functional capabilities required to deliver each L1 sub-domain. These capabilities form the strategic foundation applicable across all businesses.",
  
  "user_prompt_template": "Create an L2 Capabilities Matrix based on the complete FLM context:\n\nBusiness Value Summary:\n{{bvs}}\n\nDomain Business Summary:\n{{dbs}}\n\nL0 Domain Study:\n{{l0}}\n\nL1 Business Pillars:\n{{l1}}\n\nFor each L1 pillar, define the L2 capabilities required. Use these standard capability categories as a framework:\n\n**Standard Capability Categories:**\n1. Core Operations (what delivers the product/service)\n2. Customer Acquisition & Retention\n3. Supply Chain / Sourcing\n4. Financial Management\n5. Technology & Systems\n6. People & Organisation\n7. Compliance & Governance\n\nFor each capability, define:\n\n1. **Capability Identity**\n   - Code\n   - Name\n   - Parent pillar (L1 reference)\n   - Description\n\n2. **Functional Requirements**\n   - What this capability must accomplish\n   - Inputs required\n   - Outputs produced\n\n3. **Maturity Assessment**\n   - Current state (if known)\n   - Target state\n   - Gap analysis\n\n4. **Resource Requirements**\n   - Human resources\n   - Technology requirements\n   - Financial requirements\n\n5. **AI Opportunity**\n   - Potential for AI enhancement\n   - Suggested AI applications\n   - Human-AI collaboration model\n\nOutput as structured JSON with capabilities grouped by L1 pillar.",
  
  "output_format": "json",
  "max_tokens": 12000
}
```

### C3: MVP Document Generation Prompts

**Prompt: FLM_TO_BLUEPRINT**

```json
{
  "prompt_code": "FLM_TO_BLUEPRINT",
  "prompt_name": "FLM to Business Blueprint",
  "category": "DOCUMENT",
  "system_prompt": "You are creating a comprehensive Business Blueprint document from a complete Framework Level Mapping (FLM). The Blueprint should be suitable for investors, partners, and internal stakeholders. Output in Markdown format.",
  
  "user_prompt_template": "Create a Business Blueprint document from the following FLM:\n\n{{flm}}\n\nThe Business Blueprint should include:\n\n1. **Executive Summary** (1 page)\n2. **Business Overview**\n   - Vision and Mission\n   - Value Proposition\n   - Business Model\n3. **Market Analysis** (from L0)\n   - Market Opportunity\n   - Competitive Landscape\n   - Target Customers\n4. **Strategic Framework** (from L1)\n   - Business Pillars\n   - Strategic Objectives\n   - Value Chain Overview\n5. **Operational Capabilities** (from L2)\n   - Core Capabilities\n   - Technology Strategy\n   - Resource Requirements\n6. **Financial Overview**\n   - Revenue Model\n   - Unit Economics\n   - Investment Requirements\n7. **Growth Strategy**\n   - Milestones\n   - Scaling Approach\n8. **Risk Assessment**\n9. **Investment Proposition** (if applicable)\n   - Funding Requirements\n   - Use of Funds\n   - Investor Profile\n\nOutput as well-structured Markdown.",
  
  "output_format": "markdown",
  "max_tokens": 16000
}
```

**Prompt: FLM_TO_ONE_PAGER**

```json
{
  "prompt_code": "FLM_TO_ONE_PAGER",
  "prompt_name": "FLM to One-Page Visual Summary",
  "category": "DOCUMENT",
  "system_prompt": "Create a compelling one-page visual summary suitable for initial investor or partner engagement. The output should be structured for easy conversion to a designed document.",
  
  "user_prompt_template": "Create a One-Page Visual Summary from the following FLM:\n\n{{flm}}\n\nStructure the one-pager with these sections:\n\n1. **Header**\n   - Company name and tagline\n   - Logo placeholder\n\n2. **The Problem** (2-3 bullet points)\n\n3. **The Solution** (2-3 bullet points)\n\n4. **Market Opportunity**\n   - TAM/SAM/SOM figures\n   - Key statistic\n\n5. **Business Model**\n   - How you make money (simple diagram description)\n   - Unit economics summary\n\n6. **Traction / Milestones**\n   - Key achievements or planned milestones\n\n7. **Team** (placeholder section)\n\n8. **The Ask**\n   - Investment sought\n   - Use of funds summary\n\n9. **Contact**\n\nOutput as structured JSON for layout purposes.",
  
  "output_format": "json",
  "max_tokens": 4096
}
```

**Prompt: FLM_TO_PITCH_DECK**

```json
{
  "prompt_code": "FLM_TO_PITCH_DECK",
  "prompt_name": "FLM to Pitch Deck Structure",
  "category": "DOCUMENT",
  "system_prompt": "Create a comprehensive pitch deck structure with slide-by-slide content. The deck should be adaptable based on investor profile.",
  
  "user_prompt_template": "Create a Pitch Deck from the following FLM:\n\n{{flm}}\n\nInvestor Profile (if provided):\n{{investorProfile}}\n\nCreate a 12-15 slide pitch deck with the following structure:\n\n1. **Title Slide**\n2. **Problem**\n3. **Solution**\n4. **Market Opportunity**\n5. **Product/Service**\n6. **Business Model**\n7. **Traction**\n8. **Competition**\n9. **Go-to-Market Strategy**\n10. **Team**\n11. **Financials**\n12. **Investment Ask**\n13. **Use of Funds**\n14. **Milestones / Roadmap**\n15. **Contact / Q&A**\n\nFor each slide provide:\n- Slide title\n- Key message (one sentence)\n- Bullet points (3-5)\n- Suggested visual (chart type, diagram description)\n- Speaker notes\n\nOutput as structured JSON array of slides.",
  
  "output_format": "json",
  "max_tokens": 12000
}
```

### C4: Financial Model Handling

**Options for Financial Model in MVP:**

1. **Upload Existing** — User uploads Excel/CSV file, stored in file system
2. **Template Generation** — Provide downloadable template pre-populated with FLM data
3. **Simple Calculator** — Basic revenue/cost calculator based on unit economics

**Implementation for MVP:**

```typescript
interface FinancialModelConfig {
  approach: 'upload' | 'template' | 'calculator';
  
  // For upload
  acceptedFormats: ['xlsx', 'csv', 'pdf'];
  
  // For template
  templateUrl: string;
  prefillFromFLM: boolean;
  
  // For calculator
  calculatorFields: {
    revenue: { sellPrice: number; volume: number; };
    costs: { fixed: number; variable: number; };
    projectionYears: number;
  };
}
```

**MVP Decision:** Implement `upload` initially with `template` as enhancement.

---

## File Structure

```
src/
├── lib/
│   ├── ai/
│   │   ├── claude-client.ts
│   │   ├── prompt-library.ts
│   │   ├── schema-validator.ts
│   │   └── types.ts
│   ├── flm/
│   │   ├── flm-service.ts
│   │   ├── flm-storage.ts
│   │   └── flm-types.ts
│   ├── files/
│   │   ├── file-service.ts          # Extended for user uploads
│   │   └── file-audit.ts            # Admin file access logging
│   └── workflow/
│       ├── build-flm-definition.ts
│       └── finance-docs-definition.ts
├── components/
│   ├── ai/
│   │   ├── PromptLibraryList.tsx
│   │   ├── PromptTemplateForm.tsx
│   │   ├── PromptVariableEditor.tsx
│   │   ├── OutputSchemaEditor.tsx
│   │   └── PromptTestHarness.tsx
│   ├── files/
│   │   ├── FileUploader.tsx
│   │   ├── FileBrowser.tsx
│   │   └── AdminFileBrowser.tsx
│   ├── flm/
│   │   ├── VCModelViewer.tsx        # NEW: FLM visualisation
│   │   ├── BVSCapture.tsx
│   │   ├── DBSForm.tsx
│   │   ├── L0Review.tsx
│   │   ├── L1PillarEditor.tsx
│   │   ├── L2CapabilitiesView.tsx
│   │   └── FLMApproval.tsx
│   └── workflow/
│       ├── DynamicFormRenderer.tsx
│       ├── ReviewGate.tsx
│       └── WorkflowProgressIndicator.tsx
├── app/
│   └── dashboard/
│       ├── admin/
│       │   ├── prompts/              # NEW: Prompt Library CRUD
│       │   │   ├── page.tsx          # List view
│       │   │   ├── [id]/
│       │   │   │   └── page.tsx      # Edit view
│       │   │   ├── new/
│       │   │   │   └── page.tsx      # Create view
│       │   │   └── test/
│       │   │       └── page.tsx      # Test harness
│       │   └── stakeholders/
│       │       └── [id]/
│       │           └── files/
│       │               └── page.tsx  # Admin file browser
│       └── workspace/
│           ├── page.tsx
│           ├── vc-model/             # NEW: VC Model Viewer
│           │   └── page.tsx
│           ├── documents/            # User file management
│           │   └── page.tsx
│           └── workflows/
│               └── [instanceId]/
│                   └── page.tsx
└── supabase/
    └── migrations/
        ├── 20251126_create_prompt_templates.sql
        ├── 20251126_create_prompt_executions.sql
        ├── 20251126_create_file_audit_log.sql
        └── 20251126_register_flm_workflows.sql
```

---

## Success Criteria

### Phase A: AI Interface Foundation
- [ ] Claude API client connects and executes prompts
- [ ] All three models selectable and functional
- [ ] **Prompt Library CRUD functional:**
  - [ ] List view shows all prompts with filtering
  - [ ] Create form uses standard template
  - [ ] Edit form preserves all data
  - [ ] Variable extraction works automatically
  - [ ] Output schema editor functional
  - [ ] Duplicate prompt works
  - [ ] Deactivate/activate works
- [ ] JSON schema validation catches malformed output
- [ ] Test harness allows interactive prompt testing
- [ ] Execution logging captures all calls with metrics

### Phase B: Workflow Components
- [ ] Dynamic form renderer generates forms from any JSON schema
- [ ] Review gate component handles approve/changes/reject flow
- [ ] Routing to client or admin works correctly
- [ ] **File system enhancements:**
  - [ ] User can upload documents (PDF, XLSX, DOCX, etc.)
  - [ ] File categorisation works
  - [ ] Admin can view any stakeholder's files
  - [ ] Admin can upload to stakeholder's file system
  - [ ] File audit log captures all admin actions
- [ ] **VC Model Viewer:**
  - [ ] Displays FLM hierarchy (L0→L1→L2)
  - [ ] Shows completion status indicators
  - [ ] Accessible from stakeholder workspace
  - [ ] Accessible from admin stakeholder view
  - [ ] Export to JSON/PDF works
- [ ] Workspace displays available workflows and progress

### Phase C: FLM Assembly
- [ ] **BUILD_FLM workflow:**
  - [ ] Registered in workflow_definitions table
  - [ ] All nodes registered in workflow_nodes
  - [ ] Executes end-to-end
  - [ ] BVS capture collects natural language input
  - [ ] DBS schema generated dynamically from BVS
  - [ ] L0 generated with comprehensive domain analysis
  - [ ] L1 pillars defined with unit economics (3-6 pillars)
  - [ ] L2 capabilities matrix complete
  - [ ] Review gates pause workflow for approval
  - [ ] FLM commits from draft to approved on final approval
  - [ ] Reusable across stakeholder types
- [ ] **GENERATE_FINANCE_DOCS workflow:**
  - [ ] Prerequisite check for completed FLM works
  - [ ] Financial model upload functional
  - [ ] Investor profile capture works
  - [ ] Business Blueprint generated
  - [ ] One-Pager generated
  - [ ] Pitch Deck structure generated (library-based)
- [ ] **Integration with existing components:**
  - [ ] Uses workflow_definitions table
  - [ ] Uses workflow_nodes table
  - [ ] Uses service_configurations for Claude
  - [ ] Uses service_task_queue for AI execution
  - [ ] Uses existing file system infrastructure

### Code Quality
- [ ] TypeScript types properly defined throughout
- [ ] Error handling comprehensive
- [ ] API routes secure with proper auth checks
- [ ] Multi-tenancy isolation maintained
- [ ] Logging sufficient for debugging
- [ ] Comments on complex logic
- [ ] All new tables have appropriate indexes
- [ ] RLS policies in place for new tables

---

## Testing Scenarios

### Scenario 1: Prompt Library CRUD
1. Login as admin
2. Navigate to Admin → AI Prompts
3. View list of existing prompts
4. Click "Create New Prompt"
5. Verify standard template pre-populates
6. Fill in prompt details with variables
7. Verify variables auto-extracted from template
8. Define output schema
9. Save prompt (inactive)
10. Navigate to Test Harness
11. Select new prompt
12. Fill test variables
13. Execute and verify output
14. Return to prompt, activate it
15. Edit prompt, verify changes save
16. Duplicate prompt, verify copy created

### Scenario 2: BUILD_FLM Workflow (Happy Path)
1. Login as stakeholder
2. Navigate to workspace
3. Verify "Build VC Model" workflow available
4. Launch BUILD_FLM workflow
5. Enter BVS: Coffee roasting business description
6. Submit, verify SERVICE_TASK queued
7. Wait for DBS schema generation
8. Complete DBS form with business details
9. Submit for review
10. Approve DBS at review gate
11. Wait for L0 generation
12. Review L0 domain study
13. Define 4 pillars (Sourcing, Production, Sales, Operations)
14. Enter unit economics
15. Approve L0 at review gate
16. Wait for L1 generation
17. Review L1 pillar definitions
18. Approve L1 at review gate
19. Wait for L2 generation
20. Review L2 capabilities matrix
21. Final approval of complete FLM
22. Verify all documents in /flm/approved folder
23. Verify VC Model Viewer shows complete FLM

### Scenario 3: GENERATE_FINANCE_DOCS Workflow
1. Complete Scenario 2 first (FLM exists)
2. Navigate to workspace
3. Launch "Generate Investment Documents"
4. Verify prerequisite check passes
5. Upload financial model (xlsx)
6. Define investor profile (Seed VC, AgTech, UK)
7. Wait for Blueprint generation
8. Review and approve Blueprint
9. Wait for One-Pager generation
10. Review and approve One-Pager
11. Wait for Pitch Deck generation
12. Review and approve Pitch Deck
13. Verify all documents in /generated folder

### Scenario 4: Finance Docs Without FLM (Prerequisite Check)
1. Login as NEW stakeholder (no FLM)
2. Navigate to workspace
3. Attempt to launch "Generate Investment Documents"
4. Verify workflow shows "FLM Required" message
5. Verify redirect to BUILD_FLM workflow suggested

### Scenario 5: Review Gate Rejection and Loop
1. Start BUILD_FLM workflow
2. Complete steps 1-8 from Scenario 2
3. At L0 review, click "Request Changes"
4. Enter feedback: "Need more detail on competitive landscape"
5. Verify workflow returns to appropriate regeneration step
6. Verify L0 regenerated
7. Approve and continue

### Scenario 6: Admin File Access
1. Complete Scenario 2 as stakeholder
2. Login as admin
3. Navigate to Admin → Stakeholders → [Stakeholder]
4. Click "Files" tab
5. Browse /uploads, /flm, /generated folders
6. Upload a document on behalf of stakeholder
7. Verify file appears in stakeholder's file system
8. Verify audit log captures admin action
9. Download a document
10. Verify audit log captures download

### Scenario 7: User Document Upload
1. Login as stakeholder
2. Navigate to workspace → Documents
3. Upload business_plan.pdf
4. Select category: "Business Plan"
5. Verify file in /uploads folder
6. Upload financial_model.xlsx
7. Verify categorised correctly
8. Launch GENERATE_FINANCE_DOCS
9. Verify uploaded financial model available for selection

### Scenario 8: VC Model Viewer
1. Complete BUILD_FLM workflow
2. Navigate to workspace → VC Model tab
3. Verify L0 section displays with key data
4. Verify L1 pillars displayed with value contribution
5. Verify L2 capabilities expandable
6. Click "Export to JSON"
7. Verify download contains complete FLM
8. Login as admin
9. View same stakeholder's VC Model
10. Verify identical view available

### Scenario 9: Model Selection Override
1. Navigate to admin Prompt Test Harness
2. Select DBS_TO_L0 prompt
3. Execute with default model (Sonnet)
4. Note token usage and cost
5. Re-execute with Opus model
6. Compare output quality and cost
7. Re-execute with Haiku
8. Compare speed and cost
9. Update prompt default to Opus
10. Verify new default used

---

## Implementation Recommendations

### Phasing

**Phase A (3-4 hours):**
1. Database migrations for prompt tables
2. Claude client implementation
3. Prompt library service
4. Schema validator
5. Test harness UI

**Phase B (4-5 hours):**
1. Dynamic form renderer component
2. Review gate component
3. File system integration for FLM
4. Workspace dashboard updates

**Phase C (5-6 hours):**
1. Workflow definition registration
2. BVS capture component
3. DBS form integration
4. L0/L1/L2 review components
5. Approval and commit logic
6. Document generation prompts
7. End-to-end testing

**Total Estimated Time:** 12-15 hours across multiple sessions

### Key Decisions

1. **Model selection configurable per-prompt** — allows cost/quality optimisation
2. **Review gates mandatory at each stage** — maintains human oversight
3. **Routing configurable (client/admin)** — flexibility for different deployment scenarios
4. **Draft → Approved folder structure** — clear document lifecycle
5. **FLM not versioned until approved** — overwrites during creation, version control deferred
6. **Financial model via upload for MVP** — template generation as enhancement
7. **Pitch deck library for dynamic assembly** — future enhancement for investor profiling

---

## Environment Variables Required

```env
# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Model IDs (optional overrides)
CLAUDE_DEFAULT_MODEL=claude-sonnet-4-5-20250929
CLAUDE_OPUS_MODEL=claude-opus-4-1-20250514
CLAUDE_HAIKU_MODEL=claude-haiku-4-5-20251001

# API Configuration
CLAUDE_MAX_RETRIES=3
CLAUDE_TIMEOUT_MS=60000
```

---

## Next Steps After Completion

1. **Local testing:** Complete all scenarios
2. **Prompt refinement:** Iterate on prompt quality based on outputs
3. **Vectorisation planning:** Design pgvector integration for RAG
4. **Document generation enhancement:** Add PDF export, template formatting
5. **Pitch deck library:** Build audience-specific slide variations
6. **AGM extension:** Plan L3-L6 workflow building on FLM foundation

---

## Handoff Instructions

1. **Create feature branch:** `feature/1d-7-flm-building`
2. **Implement Phase A first** — get AI infrastructure working
3. **Test AI with harness** before proceeding to Phase B
4. **Implement Phase B** — build components independently
5. **Implement Phase C** — wire everything together
6. **Test all scenarios** end-to-end
7. **Commit with clear messages:**
   - "feat: Add Claude API client and prompt library infrastructure"
   - "feat: Add prompt templates table and execution logging"
   - "feat: Add dynamic form renderer component"
   - "feat: Add review gate component with routing"
   - "feat: Add FLM workflow definition"
   - "feat: Add FLM creation components (BVS, DBS, L0, L1, L2)"
   - "feat: Add document generation prompts"
   - "test: Add FLM workflow end-to-end tests"
8. **Push to feature branch**
9. User will fetch, pull, build, test locally
10. When ready, merge to main

---

**Document Version:** 1.0  
**Created:** November 2025  
**Sprint:** Phase 1d.7 - FLM Building Workflow  
**Target Audience:** Claude Code AI Agent  
**Estimated Implementation Time:** 12-15 hours (phased)  
**Priority:** Critical (establishes VC Studio core functionality)
