# ITS Comprehensive Architecture Update: Dashboard System, Knowledge Domain Layer, Workflow Overlays & Development Roadmap

**Document Status:** Master Planning Document (Integrated Architecture)  
**Version:** 2.0  
**Date:** November 2025  
**Purpose:** Synthesize dashboard architecture, AI design agents, knowledge domain layer, workflow overlays, and development roadmap for systematic VCEF/KDA implementation

---

## Executive Summary

This document integrates five critical architectural innovations into the existing Phase 1a-1e framework:

1. **Dashboard-as-Configuration System** - Stakeholder dashboards defined via JSON stored in core_config, enabling responsive device rendering and throttled self-service modifications
2. **AI Design Agents** - Claude-powered dashboard composition based on stakeholder profile, available data, and device constraints, integrated into VC Studio
3. **Knowledge Domain as Logical Layer** - Separated from application tier; contains vectors, prompts, core data, external feeds, and LLM interfaces
4. **Workflow Overlays** - Maturity-based progression (FLM → AGM → Full) with overlays stacking on shared VC Model foundation
5. **Development Roadmap** - vc-bda-production as template application, then cloning to ADA/PDA with domain customization

**Strategic Positioning:** Value-centric business architecture with AI as execution engine

---

## Part 1: Dashboard Architecture (Phase 1b Enhancement)

### 1.1 Core Concept: JSON-Based Dashboard Configuration

Each stakeholder's dashboard is defined via a JSON configuration stored within their core stakeholder record:

```json
{
  "stakeholders": {
    "id": "STK-20251108-0001",
    "auth_user_id": "uuid-from-auth",
    "stakeholder_type": "organisation",
    "roles": ["vc_client_finance", "investor"],
    "core_config": {
      "dashboard_layout": {
        "layout_type": "responsive",
        "sections": [
          {
            "id": "portfolio",
            "title": "Investment Portfolio",
            "size": "medium",
            "widgets": ["MetricsCard", "OpportunityPipeline"]
          },
          {
            "id": "network",
            "title": "Stakeholder Network",
            "size": "medium",
            "widgets": ["RelationshipGraph", "CapabilityMatrix"]
          }
        ],
        "breakpoints": {
          "desktop_hires": { "min_width": 1080, "columns": 4, "widget_max_size": "large" },
          "tablet_lowres": { "min_width": 720, "max_width": 1079, "columns": 3, "widget_max_size": "medium" },
          "mobile": { "max_width": 719, "columns": 2, "widget_max_size": "small" }
        }
      },
      "last_modified": "2025-11-08T14:30:00Z",
      "last_modified_by": "admin",
      "next_self_service_modification_allowed": null
    }
  }
}
```

**Architectural Advantages:**

- **Performance:** One stakeholder query + JSON render. No permission cascades or RLS circular references
- **Determinism:** Same configuration always produces same dashboard. Auditable, reproducible
- **Flexibility:** Users control their interface within governance constraints
- **Scalability:** Thousands of stakeholders with independent configurations

### 1.2 Modification Gates: Admin vs Self-Service

```typescript
// Modification logic
const canModifyDashboard = (stakeholder, requestedBy) => {
  const config = stakeholder.core_config
  
  // Admin changes: always allowed, clears self-service cooldown
  if (requestedBy.role === 'admin') {
    return {
      allowed: true,
      reason: "Admin override",
      clearCooldown: true // Reset next_self_service_modification_allowed
    }
  }
  
  // Self-service: check throttle
  if (requestedBy.stakeholder_id === stakeholder.id) {
    const nextAllowed = new Date(config.next_self_service_modification_allowed)
    if (nextAllowed > now) {
      return {
        allowed: false,
        reason: "Throttle in effect",
        minutesUntilAllowed: Math.ceil((nextAllowed - now) / 60000)
      }
    }
    return {
      allowed: true,
      reason: "Throttle expired",
      setNextCooldown: true // Set to now + 1 hour
    }
  }
}
```

**Throttling Strategy:**

- **Admin modifications:** Immediate, no cooldown, clear user cooldown timer
- **Self-service modifications:** Once per hour (configurable), throttle resets if admin intervenes
- **Rationale:** Admins need immediate fix capability; users get reasonable flexibility without thrashing

### 1.3 Responsive Widget System with Breakpoint Constraints

Each widget in the library declares its rendering capabilities:

```typescript
interface Widget {
  id: string // "MetricsCard", "RelationshipGraph", etc.
  minSize: "small" | "medium" | "large"
  maxSize: "small" | "medium" | "large"
  defaultSize: "small" | "medium" | "large"
  responsive: boolean
  dataSources: string[] // What fields it needs
}

// Example: MetricsCard
const MetricsCard: Widget = {
  id: "MetricsCard",
  minSize: "small",
  maxSize: "large",
  defaultSize: "medium",
  responsive: true,
  dataSources: ["capabilities", "relationships", "verification_status"]
}

// Example: RelationshipGraph (not responsive)
const RelationshipGraph: Widget = {
  id: "RelationshipGraph",
  minSize: "medium",
  maxSize: "large",
  defaultSize: "large",
  responsive: false,
  dataSources: ["relationships"]
}
```

**Rendering Logic:**

```typescript
// Desktop high-res: can use RelationshipGraph in large
// Tablet: RelationshipGraph in medium (responsive mode)
// Mobile: RelationshipGraph unavailable (minSize medium, only 2 columns, max small)

const renderDashboard = (stakeholder, deviceWidth) => {
  const config = stakeholder.core_config.dashboard_layout
  const breakpoint = getBreakpoint(deviceWidth, config.breakpoints)
  
  return config.sections.map(section => {
    const widgets = section.widgets
      .map(widgetId => getWidget(widgetId))
      .filter(widget => {
        // Widget must fit within breakpoint constraints
        return widget.maxSize >= breakpoint.widget_max_size
      })
    
    return {
      ...section,
      widgets: widgets,
      columns: breakpoint.columns
    }
  })
}
```

---

## Part 2: AI Design Agent Integration with VC Studio

### 2.1 Design Agent: Claude-Powered Dashboard Composition

VC Studio generates AI prompts that guide Claude through systematic dashboard design for each stakeholder profile:

**Design Agent Workflow:**

```
Input: Stakeholder profile (role, capabilities, relationships) + Device type + Domain context
  ↓
Claude analyzes via domain-specific prompt:
  1. What stakeholder role determines dashboard purpose?
  2. Which widgets from catalog are relevant?
  3. Which data is available to populate widgets?
  4. What device constraints apply?
  5. What's the logical section ordering?
  ↓
Output: Dashboard configuration JSON + rationale
  ↓
Store in core_config.dashboard_layout
```

### 2.2 VC Studio as Prompt Library Governance

VC Studio becomes the **authoritative source** for design prompts and vectors:

**VC Studio Functions:**

1. **Prompt Library Management**
   - Generate domain-specific prompts from VC Models
   - Version control (track prompt evolution)
   - Consistency validation (ensure prompts reference canonical taxonomies)

```yaml
# Domain-specific design prompt (BDA context)
prompt_id: "bda_dashboard_design_investor"
version: "1.0"
domain: "BDA"
stakeholder_role: "investor"
template: |
  You are designing a dashboard for {stakeholder_name}, an investor in VC-stage companies.
  
  Available widgets: {widget_catalog_json}
  Stakeholder profile: {stakeholder_profile_json}
  Device constraints: {device_breakpoints}
  
  Recommend a dashboard layout that:
  - Shows investment portfolio and deal pipeline (primary)
  - Displays relationship network (secondary)
  - Fits {device_type} constraints
  
  Return JSON: { "sections": [...], "rationale": "..." }
```

2. **Vector Store Management**
   - Embed VC model semantics into vector space
   - Generate domain-specific embeddings (ADA/PDA/BDA)
   - Maintain canonical reference vectors for all taxonomies

```python
# Vector generation from VC model
vc_model_vectors = {
    "ADA": {
        "commodities": VectorStore("agricultural_products"),
        "stakeholder_types": VectorStore("producer, buyer, aggregator, ..."),
        "capabilities": VectorStore("crop management, quality control, ...")
    },
    "BDA": {
        "stakeholder_types": VectorStore("individual, investor, service_provider, ..."),
        "capabilities": VectorStore("business_strategy, financial_analysis, ..."),
        "opportunity_types": VectorStore("investment, consulting, partnership, ...")
    }
}
```

3. **Core Data Registry**
   - Canonical definitions (stakeholder types, capability taxonomies, widget catalog)
   - Versioned, immutable snapshots
   - Referenced by design prompts

```json
{
  "core_data_registry": {
    "version": "1.0",
    "widget_catalog": [
      { "id": "MetricsCard", "category": "analytics", "complexity": "simple" },
      { "id": "RelationshipGraph", "category": "network", "complexity": "high" },
      { "id": "OpportunityPipeline", "category": "crm", "complexity": "high" },
      { "id": "CapabilityMatrix", "category": "skills", "complexity": "medium" },
      { "id": "TimelineView", "category": "workflow", "complexity": "medium" },
      { "id": "DocumentViewer", "category": "assets", "complexity": "simple" },
      { "id": "ActionQueue", "category": "tasks", "complexity": "simple" },
      { "id": "AlertCenter", "category": "notifications", "complexity": "simple" }
    ],
    "stakeholder_roles": {
      "BDA": ["vc_client_finance", "investor", "service_provider", "administrator"],
      "ADA": ["producer", "buyer", "aggregator", "service_provider"],
      "PDA": ["contractor", "project_manager", "client", "subcontractor"]
    },
    "capabilities": {
      "BDA": ["business_strategy", "financial_analysis", "market_research", "operations_management"],
      "ADA": ["crop_management", "quality_control", "supply_chain", "market_knowledge"]
    }
  }
}
```

### 2.3 Design Agent Integration Points

**1. On Stakeholder Onboarding:**

```typescript
// Phase 1b: Stakeholder created with initial onboarding
const onboardStakeholder = async (profile) => {
  // 1. Create stakeholder record
  const stakeholder = await db.stakeholders.create(profile)
  
  // 2. Call VC Studio Design Agent
  const designPrompt = await vcStudio.getDesignPrompt({
    domain: profile.domain, // "BDA", "ADA", "PDA"
    stakeholder_role: profile.primary_role,
    device_context: "desktop" // default
  })
  
  // 3. Claude designs dashboard
  const dashboardConfig = await claude.call({
    model: "claude-sonnet-4-20250514",
    messages: [{
      role: "user",
      content: designPrompt
    }]
  })
  
  // 4. Store config in core_config
  await db.stakeholders.update(stakeholder.id, {
    core_config: {
      dashboard_layout: dashboardConfig,
      last_modified_by: "design_agent"
    }
  })
}
```

**2. When User Requests Dashboard Redesign:**

```typescript
const redesignDashboard = async (stakeholderId, deviceType) => {
  const stakeholder = await db.stakeholders.get(stakeholderId)
  
  // Check throttle
  const canModify = canUserModifyDashboard(stakeholder, deviceType)
  if (!canModify.allowed) {
    return { error: canModify.reason, minutesUntilAllowed: canModify.minutesUntilAllowed }
  }
  
  // Get design prompt
  const prompt = await vcStudio.getDesignPrompt({
    domain: stakeholder.domain,
    stakeholder_role: stakeholder.primary_role,
    device_type: deviceType,
    current_config: stakeholder.core_config.dashboard_layout
  })
  
  // Claude redesigns
  const newConfig = await claude.call({ ... })
  
  // Update with throttle
  await db.stakeholders.update(stakeholderId, {
    core_config: {
      ...stakeholder.core_config,
      dashboard_layout: newConfig,
      last_modified_by: "self_service",
      next_self_service_modification_allowed: now + 1 hour
    }
  })
}
```

**3. When Admin Overrides:**

```typescript
const adminOverrideDashboard = async (stakeholderId, newConfig, adminId) => {
  const stakeholder = await db.stakeholders.get(stakeholderId)
  
  // Admin change: immediate, no throttle
  await db.stakeholders.update(stakeholderId, {
    core_config: {
      ...stakeholder.core_config,
      dashboard_layout: newConfig,
      last_modified_by: "admin",
      next_self_service_modification_allowed: null // Clear user cooldown
    }
  })
  
  // Audit
  await db.audit_logs.create({
    action: "dashboard_override",
    stakeholder_id: stakeholderId,
    performed_by: adminId,
    details: { config_change: newConfig }
  })
}
```

---

## Part 3: Knowledge Domain as Logical Layer

### 3.1 Architectural Separation

Knowledge Domain operates as a **distinct logical layer** separate from application tier:

```
┌─────────────────────────────────────┐
│   Application Tier                  │
│ (vc-bda-production, vc-ada-prod, ...)
└──────────┬──────────────────────────┘
           │ MCP calls
           ↓
┌─────────────────────────────────────┐
│   Knowledge Domain (Logical Layer)  │
│  ┌─────────────────────────────────┐│
│  │ Vector Store (embeddings)        ││
│  │ ├─ Domain semantics             ││
│  │ └─ Stakeholder/capability vecs  ││
│  ├─ Prompt Library (versioned)      │
│  ├─ Core Data Registry             │
│  ├─ External Feeds                 │
│  │ ├─ Weather APIs                 │
│  │ ├─ IoT sensors                  │
│  │ └─ Satellite imagery            │
│  └─ LLM Interface (Claude API)     │
└─────────────────────────────────────┘
```

### 3.2 Knowledge Domain Components

**1. Vector Store (pgvector in Supabase)**

```sql
-- Vector storage for semantic reasoning
CREATE TABLE knowledge_domain.vectors (
  id uuid PRIMARY KEY,
  domain TEXT NOT NULL, -- "ADA", "BDA", "PDA"
  entity_type TEXT, -- "stakeholder_role", "capability", "widget", etc.
  entity_id TEXT,
  embedding vector(1536), -- Claude embedding dimension
  metadata jsonb, -- tags, version, source
  version TEXT,
  created_at timestamp
);

-- Semantic search example
SELECT entity_id, metadata
FROM knowledge_domain.vectors
WHERE domain = 'BDA'
  AND entity_type = 'capability'
  AND embedding <-> claude_embed('financial risk assessment') < 0.3
LIMIT 5;
```

**2. Prompt Library (Versioned)**

```sql
CREATE TABLE knowledge_domain.prompts (
  id uuid PRIMARY KEY,
  domain TEXT, -- "ADA", "BDA", "PDA"
  prompt_id TEXT UNIQUE, -- "bda_dashboard_design_investor"
  version TEXT, -- "1.0", "1.1", etc.
  template TEXT, -- Prompt with {placeholders}
  variables jsonb, -- {"stakeholder_profile": "object", ...}
  associated_vectors uuid[], -- Vector embeddings used
  created_at timestamp,
  deprecated_at timestamp
);

-- Get current prompt version
SELECT template, variables
FROM knowledge_domain.prompts
WHERE domain = 'BDA'
  AND prompt_id = 'bda_dashboard_design_investor'
  AND deprecated_at IS NULL
ORDER BY version DESC
LIMIT 1;
```

**3. Core Data Registry**

```sql
CREATE TABLE knowledge_domain.core_data (
  id uuid PRIMARY KEY,
  domain TEXT,
  registry_type TEXT, -- "widget_catalog", "stakeholder_roles", "capabilities", etc.
  registry_data jsonb, -- The actual reference data
  version TEXT,
  canonical BOOLEAN DEFAULT true,
  created_at timestamp
);
```

**4. External Feeds Interface**

```typescript
// Knowledge Domain exposes unified interface to external data
const externalFeedsRegistry = {
  "weather": {
    provider: "open-meteo",
    endpoint: "https://api.open-meteo.com/v1/forecast",
    fields: ["temperature", "precipitation", "wind_speed"]
  },
  "market_prices": {
    provider: "custom_api",
    endpoint: "https://api.commodities.example.com/prices",
    fields: ["commodity", "price", "change_24h"]
  },
  "iot_sensors": {
    provider: "mqtt",
    endpoint: "mqtt://iot-broker.example.com",
    fields: ["sensor_id", "reading", "timestamp"]
  }
}

// Applications call via MCP
const getWeatherForecast = async (coordinates, daysAhead) => {
  const feed = externalFeedsRegistry.weather
  const response = await fetch(feed.endpoint, {
    params: {
      latitude: coordinates.lat,
      longitude: coordinates.lon,
      forecast_days: daysAhead,
      forecast_hours: 24
    }
  })
  return response.json()
}
```

### 3.3 Initial vs Enterprise Deployment

**Option 1 (Initial): Embedded in Supabase**

```
vc-bda-production (Supabase project)
├── Public schema (application tables)
├── Knowledge Domain schema (vectors, prompts, core_data)
└── LLM Interface (API functions calling Claude)
```

**Option 2 (Enterprise): Separate Microservice**

```
vc-bda-production → Knowledge Domain API → External services
                    (separate deployment)
                    ├── Vector store
                    ├── Prompt library
                    ├── External data feeds
                    └── Claude integration
```

**Migration Path:**

- Start: Embedded in Supabase (simpler deployment)
- Scale: Extract to separate service when latency becomes issue
- Replicate: Clients using your VC Model spin up their own Knowledge Domain instance

---

## Part 4: Workflow Overlays & Maturity Progression

### 4.1 Core Principle: Overlays on Shared Foundation

A single **VC Model** (FLM foundation) supports multiple **workflow overlays** stacked on top:

```
┌─────────────────────────────────┐
│  VC-Client Finance Overlay      │ (investor engagement workflow)
├─────────────────────────────────┤
│  HR/Recruitment Overlay         │ (hiring workflow)
├─────────────────────────────────┤
│  Operations Overlay             │ (process automation)
├─────────────────────────────────┤
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│   Shared FLM VC Model           │ (foundational business definition)
└─────────────────────────────────┘
```

Each overlay is a **separate workflow instance** (e.g., `VCCF-ClientRef123`) that:
- Reads from shared FLM data
- Executes domain-specific activities/tasks
- Stores outputs in client's filesystem
- Updates shared VC Model with new data (org structure, capabilities, etc.)

### 4.2 Maturity Progression: FLM → AGM → Full

**Stage 1: FLM (Financial-Legal-Market Layers)**

```
FLM Scope:
├── Financial layers (revenue, costs, unit economics)
├── Legal layers (entity structure, IP)
└── Market layers (customer, competitor, positioning)

Activities:
├── Create 2-page information sheet
├── Generate pitch deck (investor-focused)
├── Build investor CRM (manage engagement)
└── Raise capital

VC Studio Services Unlocked:
├── Investor matching (by geographic/sector/check size)
├── Pitch coaching (Clayton Christensen frameworks)
└── Due diligence support (legal/financial document preparation)

Workflow Instance: "VCCF-ClientRef123" (VC-Client Finance overlay)
```

**Stage 2: AGM (Add Operational + Governance Layers)**

*Triggered upon: Funding closed*

```
AGM Additions:
├── Operations layers (workflows, teams, KPIs)
├── Governance layers (board, decision rights)
├── Capability layers (what can/can't be done)
└── Relationships layers (suppliers, partners, investors)

Activities:
├── Business blueprint (operational definition)
├── MVP architecture (technical roadmap)
├── Org structure (teams, roles, skill requirements)
├── Capability inventory (what exists vs needed)
└── Investor relations (reporting, governance)

VC Studio Services Unlocked:
├── Development services (build MVP)
├── Capability mapping (skill gap analysis)
├── Team recruitment overlay (hiring workflow)
├── Pilot deployment (go-live planning)

Workflow Instances:
├── "VCCF-ClientRef123" (continues with expanded scope)
└── "HRRF-ClientRef123" (new HR/recruitment overlay)
```

**Stage 3: Full L0-L6 VC Model**

*Triggered upon: MVP operational*

```
Full Scope:
├── L0-L2: Knowledge creation (insights, decisions, designs)
├── L3-L6: Agentic execution (workflows, tasks, operations)

Activities:
├── AI integration (Claude-powered decision support)
├── External data feeds (weather, market, IoT)
├── Campaign management (scaled customer engagement)
├── Knowledge monetization (consulting/platform services)

VC Studio Services Unlocked:
├── Full VCEF consulting (transform across entire org)
├── AI capability deployment (design agents, workflow automation)
├── Methodology licensing (they can deploy to partners)
└── Scale-up advisory (multi-geography, sector expansion)

Workflow Instances:
├── "VCCF-ClientRef123" (evolves to full execution)
├── "HRRF-ClientRef123" (recruitment/talent mgmt)
├── "OPSRF-ClientRef123" (operational optimization)
└── "AIVRF-ClientRef123" (AI/knowledge monetization)
```

### 4.3 Gate Implementation in vc-bda-production

```typescript
// Phase 1d: Workflow gates based on VC model maturity
interface WorkflowGate {
  gate_id: string
  min_vc_model_level: "FLM" | "AGM" | "Full"
  workflow_type: string
  required_fields: string[]
  unlocked_activities: string[]
  vc_studio_services: string[]
}

const workflowGates: WorkflowGate[] = [
  {
    gate_id: "gate_vc_client_finance_fLM",
    min_vc_model_level: "FLM",
    workflow_type: "vc_client_finance",
    required_fields: ["market_analysis", "financial_model", "legal_structure"],
    unlocked_activities: [
      "create_information_sheet",
      "generate_pitch_deck",
      "setup_investor_crm"
    ],
    vc_studio_services: ["investor_matching", "pitch_coaching"]
  },
  {
    gate_id: "gate_team_recruitment_agm",
    min_vc_model_level: "AGM",
    workflow_type: "team_recruitment",
    required_fields: ["org_structure", "capability_requirements", "funding_available"],
    unlocked_activities: [
      "design_job_advert",
      "post_to_job_boards",
      "screen_candidates",
      "schedule_interviews"
    ],
    vc_studio_services: ["recruitment_agency_integration", "hiring_coaching"]
  }
]

// Check gate status
const getAvailableWorkflows = async (stakeholder) => {
  const vcModel = await db.vc_models.get(stakeholder.vc_model_id)
  const maturityLevel = assessVCModelMaturity(vcModel) // "FLM", "AGM", "Full"
  
  return workflowGates.filter(gate => {
    // Check if user's VC model meets gate requirements
    return compareMaturityLevels(maturityLevel, gate.min_vc_model_level) >= 0
  })
}
```

---

## Part 5: VC-Client Finance Workflow: Concrete Example

### 5.1 Complete Workflow Instance

**Trigger:** New client onboarded with role "vc_client_finance"

**Workflow Instance Creation:**

```json
{
  "workflow_instance_id": "VCCF-ClientRef-2025-001",
  "client_stakeholder_id": "STK-20251108-0001",
  "domain": "BDA",
  "workflow_type": "vc_client_finance",
  "status": "active",
  "vc_model_id": "VC-CLIENTNAME-2025",
  "created_at": "2025-11-08T10:00:00Z",
  "maturity_gate": "FLM",
  "activities": [
    {
      "activity_id": "VCCF-001-001",
      "activity_name": "Create 2-Page Information Sheet",
      "status": "pending",
      "owner": "client",
      "due_date": "2025-11-15",
      "output_path": "/VCCF-ClientRef-2025-001/activities/information-sheet/"
    },
    {
      "activity_id": "VCCF-001-002",
      "activity_name": "Generate Pitch Deck",
      "status": "pending",
      "owner": "ai_agent",
      "depends_on": ["VCCF-001-001"],
      "output_path": "/VCCF-ClientRef-2025-001/activities/pitch-deck/"
    },
    {
      "activity_id": "VCCF-001-003",
      "activity_name": "Investor CRM Setup",
      "status": "pending",
      "owner": "admin",
      "output_path": "/VCCF-ClientRef-2025-001/activities/investor-crm/"
    },
    {
      "activity_id": "VCCF-001-004",
      "activity_name": "Investor Matching & Outreach",
      "status": "pending",
      "owner": "ai_agent",
      "depends_on": ["VCCF-001-002", "VCCF-001-003"],
      "output_path": "/VCCF-ClientRef-2025-001/activities/investor-matching/"
    }
  ]
}
```

### 5.2 Activity Execution: Design Agent Integration

**Activity 1: Create Information Sheet**

```
Owner: Client (self-service)
Process:
1. Client fills form with key business details
2. Form stored in filesystem
3. Triggers activity completion check
4. If complete, workflow moves to next activity

Output: /VCCF-ClientRef-2025-001/activities/information-sheet/form-submission.json
```

**Activity 2: Generate Pitch Deck** *(AI-Driven)*

```
Owner: AI Agent (Claude)
Process:
1. Workflow detects "information sheet" complete
2. Retrieves information sheet from filesystem
3. Gets design prompt from VC Studio: "BDA pitch deck design prompt"
4. Calls Claude with:
   - Design prompt (versioned from VC Studio)
   - Information sheet data
   - Investor vector context from Knowledge Domain
   - Company vectors from Knowledge Domain
5. Claude generates PowerPoint structure (JSON)
6. Next.js component converts JSON → Vercel-hosted HTML/PDF
7. Stores in filesystem
8. Triggers notifications (client & admin)
9. Sets activity status to "complete"
10. Unlocks activity 3 & 4

Output: /VCCF-ClientRef-2025-001/activities/pitch-deck/presentation.json
        /VCCF-ClientRef-2025-001/activities/pitch-deck/presentation.pdf
```

**Activity 3: Investor CRM Setup**

```
Owner: Admin (platform)
Process:
1. Admin reviews client details
2. Creates investor list in CRM
3. Configures investor outreach campaign
4. Stores in filesystem + CRM database

Output: /VCCF-ClientRef-2025-001/activities/investor-crm/investor-list.csv
        CRM database: campaigns, investor_records
```

**Activity 4: Investor Matching & Outreach** *(AI-Driven)*

```
Owner: AI Agent (Claude)
Process:
1. Both activities 2 & 3 complete
2. Retrieves investor list + pitch deck
3. Gets VC matching vectors from Knowledge Domain
4. Claude analyzes:
   - Company profile vs investor thesis
   - Geographic focus match
   - Check size fit
   - Industry sector alignment
5. Claude ranks investors by fit
6. Generates personalized outreach emails per investor
7. Schedules sends via CRM
8. Stores recommendations + emails in filesystem
9. Creates CRM opportunities for each investor

Output: /VCCF-ClientRef-2025-001/activities/investor-matching/rankings.json
        /VCCF-ClientRef-2025-001/activities/investor-matching/emails/{investor_id}.md
        CRM database: opportunities, interactions
```

### 5.3 Dashboard Integration for VC-Client

Client's dashboard auto-populated from workflow instance:

```json
{
  "dashboard_layout": {
    "sections": [
      {
        "id": "vc_workflow_status",
        "title": "VC Engagement Progress",
        "widgets": [
          {
            "id": "WorkflowTimeline",
            "data_source": "VCCF-ClientRef-2025-001",
            "shows": ["activities", "completion_status", "next_milestones"]
          }
        ]
      },
      {
        "id": "pitch_documents",
        "title": "Pitch Materials",
        "widgets": [
          {
            "id": "DocumentViewer",
            "data_source": "/VCCF-ClientRef-2025-001/activities/pitch-deck/",
            "shows": ["presentation.pdf", "presentation.json"]
          }
        ]
      },
      {
        "id": "investor_pipeline",
        "title": "Investor Pipeline",
        "widgets": [
          {
            "id": "OpportunityPipeline",
            "data_source": "CRM:campaigns:VCCF-ClientRef-2025-001",
            "shows": ["investor_matches", "outreach_status", "interaction_history"]
          }
        ]
      }
    ]
  }
}
```

---

## Part 6: Development Roadmap: vc-bda-production as Template

### 6.1 Strategic Approach: Template First, Replicate After

**Phase 1: vc-bda-production (Weeks 1-15)**

Build the complete, fully-featured BDA application as **template**:

```
Week 1-3:   Phase 1a (Multi-tenancy database)
Week 2-5:   Phase 1b (Onboarding + Dashboard system with JSON config)
Week 4-8:   Phase 1c (VC model components + File system)
Week 6-10:  Phase 1d (CRM + Workflow orchestration)
Week 8-15:  Phase 1e (LLM integration + Design agents + Knowledge Domain)

Deliverable: Fully operational vc-bda-production with all features
```

**Phase 2: Replication Strategy (Weeks 15-24)**

Clone vc-bda-production → vc-ada-production & vc-pda-production:

```
Week 15:  Clone vc-bda-production codebase
Week 15-17: Domain customization
  └─ ADA: Agricultural widgets, commodities catalog, producer capabilities
  └─ PDA: Property widgets, compliance frameworks, tender management

Week 17: Deploy ada_kda + pda_kda Supabase instances
Week 18-24: Parallel features development
  └─ Domain-specific services (ADA: weather APIs, commodity prices)
  └─ Domain-specific Knowledge Domain content (vectors, prompts)
```

### 6.2 Phase 1b: Dashboard System Implementation (Enhanced for JSON Config)

**New Elements Added to Phase 1b:**

1. **stakeholders.core_config column** (jsonb)
   - Stores dashboard layout configuration
   - Includes modification timestamps and throttle state
   - Database migration script

2. **Dashboard Configuration Components**
   - DashboardRenderer.tsx (reads core_config, renders responsive layout)
   - WidgetLibrary.tsx (7-8 standardized widgets with size constraints)
   - DashboardEditor.tsx (user-facing UI for self-service modifications)
   - AdminDashboardOverride.tsx (admin override interface)

3. **Design Agent Integration**
   - DashboardDesignAgent API endpoint
   - VC Studio prompt fetching
   - Claude API call orchestration
   - Config persistence

4. **Throttle Logic**
   - Modification gate check on dashboard change requests
   - Throttle enforcement (1 hour default)
   - Admin override flow
   - Audit trail

**New Files/Folders:**

```
src/
├── app/
│   └── dashboard/
│       ├── renderer/
│       │   ├── DashboardRenderer.tsx (main renderer)
│       │   ├── WidgetLibrary.tsx (7-8 widgets with constraints)
│       │   └── ResponsiveLayout.tsx (CSS Grid logic)
│       ├── editor/
│       │   ├── DashboardEditor.tsx (user modification UI)
│       │   └── ThrottleIndicator.tsx (countdown timer)
│       └── admin/
│           └── DashboardOverride.tsx (admin control)
│
├── api/
│   └── dashboard/
│       ├── design-agent/route.ts (Claude design orchestration)
│       ├── config/route.ts (save/load configuration)
│       └── throttle-check/route.ts (gate enforcement)
│
└── lib/
    ├── dashboard/
    │   ├── widgetDefinitions.ts (widget catalog with constraints)
    │   ├── designAgentPrompts.ts (VC Studio integration)
    │   └── throttleLogic.ts (modification gate logic)
    └── types/
        └── dashboard.types.ts
```

### 6.3 Phase 1e: AI Design Agent & Knowledge Domain (New)

**Significant Enhancement to Phase 1e:**

Traditional Phase 1e has Claude integration for narrow tasks. Enhanced Phase 1e adds:

1. **Design Agent Framework**
   - Orchestrates Claude for dashboard composition
   - Integrates with VC Studio prompt library
   - Stores outputs in core_config

2. **Knowledge Domain Infrastructure**
   - pgvector setup for embeddings
   - Prompt versioning system
   - Core data registry
   - External feed interfaces
   - MCP integration

3. **Workflow Overlay System**
   - Workflow instance creation
   - Activity sequencing
   - Dependency management
   - Output storage in filesystem
   - Maturity gate logic

**New Files/Folders:**

```
src/
├── lib/
│   ├── knowledge-domain/
│   │   ├── vectorStore.ts (pgvector interface)
│   │   ├── promptLibrary.ts (VC Studio sync)
│   │   ├── externalFeeds.ts (weather, market data, IoT)
│   │   └── coreDataRegistry.ts
│   │
│   ├── design-agent/
│   │   ├── dashboardDesigner.ts (Claude orchestration)
│   │   ├── promptGenerator.ts (template filling)
│   │   └── configPersistence.ts
│   │
│   └── workflows/
│       ├── overlayEngine.ts (stacking logic)
│       ├── maturityGates.ts (FLM/AGM/Full)
│       ├── activitySequencer.ts (dependency resolution)
│       └── outputManagement.ts (filesystem + CRM)
│
└── api/
    ├── workflows/
    │   ├── instances/route.ts (create/read workflow instances)
    │   ├── activities/[activity_id]/route.ts (activity updates)
    │   └── gates/check/route.ts (maturity gate validation)
    │
    └── knowledge-domain/
        ├── vectors/search/route.ts (semantic search)
        ├── prompts/[domain]/route.ts (get versioned prompts)
        └── external-feeds/[feed_type]/route.ts (external data)
```

### 6.4 Integration Points: VC Studio ↔ Applications

**VC Studio generates → Applications consume:**

```
VC Studio (Authoring)
├── Creates VC Model (L0-L6)
├── Generates Prompts (versioned)
├── Creates Vectors (embeddings)
└── Publishes Core Data Registry

    ↓ (API/Export)

vc-bda-production
├── Fetches prompts on demand
├── Loads vectors for semantic search
├── Reads core data for validation
└── Calls Claude with VC Studio context

    ↓ (Clone/Deploy)

vc-ada-production, vc-pda-production
├── Same architectural pattern
├── Domain-specific customization
├── Same prompt + vector infrastructure (domain-filtered)
```

### 6.5 Implementation Timeline (Refined)

**Weeks 1-6: Phase 1a + Phase 1b (Dashboard JSON Config)**

- Database: Multi-tenancy, RLS, core_config column
- Components: 3 dashboards + JSON renderer + widget library
- Design agent scaffolding (not yet integrated)
- Testing: Multi-user, role-based rendering, responsive layouts

**Weeks 4-10: Phase 1c (VC Model + File System)**

*Overlaps with 1b*

- VC model hierarchy (L0-L6 structure per domain)
- File system implementation
- Activity output specifications
- Workflow model definitions
- Testing: End-to-end VC model navigation

**Weeks 8-15: Phase 1d + Phase 1e (CRM + AI + Knowledge Domain)**

*Overlaps with 1c*

- CRM schema + campaign management UI
- Workflow orchestration engine
- Maturity gates + overlay system
- pgvector setup + prompt library sync
- Design agent integration
- External API interfaces
- Testing: Full workflow execution, design agent recommendations

**Weeks 15-24: Clone to ADA/PDA + Parallel Development**

- vc-ada-production: Agricultural customization
- vc-pda-production: Property customization
- Domain-specific vectors + prompts
- Domain-specific external feeds (weather for ADA, compliance for PDA)

---

## Part 7: Strategic Alignment & Value Positioning

### 7.1 Value-Centric Architecture Principle

Every component serves the core principle: **Value-centric business architecture with AI as execution engine**

```
Layer 1: Value Definition (VC Model - VCEF)
  ↓ What creates value in this business?
  ↓ How do we systematically optimize it?

Layer 2: Information Architecture (KDA - Knowledge Domain)
  ↓ What data, insights, and prompts guide value creation?
  ↓ How do we make them available to decision-makers?

Layer 3: Execution (Workflows + AI Agents)
  ↓ How do we systematically execute value-creation activities?
  ↓ How do we augment human judgment with AI insights?

Layer 4: User Experience (Dashboards + Interfaces)
  ↓ What does value-creation look like to the stakeholder?
  ↓ How do we present it in context?
```

### 7.2 Differentiation vs. Competitors

| Aspect | Traditional AI Consultancy | ITS (VCEF/KDA) |
|--------|---------------------------|----------------|
| **Approach** | Deploy AI tools randomly | Define value chain systematically, then AI |
| **Dashboard** | Static, IT-managed | Dynamic, user-configurable, AI-designed |
| **Knowledge** | Scattered, unversioned | Structured, vectorized, versioned |
| **Workflows** | Manual, ad-hoc | Systematic, agentic, self-optimizing |
| **Scalability** | New engagement = rebuild | New domain = clone, customize |
| **Defensibility** | Consulting hours | Methodology + IP (vectors, prompts) |

### 7.3 Revenue Models Enabled

1. **Consulting:** VCEF implementation + VC model creation (£50k-£500k+ per client)
2. **Overlay Services:** VC-Client Finance, Team Recruitment, Ops Optimization (£10k-£50k per overlay per year)
3. **Methodology Licensing:** Clients deploy on their own infrastructure (£100k-£1M per year)
4. **Platform-as-a-Service:** Hosted Knowledge Domain + applications (£500-£5k per client per month)

---

## Part 8: Implementation Priorities & Dependencies

### 8.1 Critical Path

```
MANDATORY SEQUENCE:
1. Phase 1a (Multi-tenancy) ← Foundation
2. Phase 1b with JSON dashboard config ← User access + new architecture
3. Phase 1c (VC Model + File System) ← Structure for activities
4. Phase 1d (CRM + Workflows) ← Orchestration engine
5. Phase 1e (AI + Design Agent + Knowledge Domain) ← Intelligence layer
```

### 8.2 Parallel Workstreams (After Phase 1a)

- **Workstream A:** Phase 1b dashboard system (Weeks 2-6)
- **Workstream B:** Phase 1c VC model + file system (Weeks 4-10)
- **Workstream C:** VC Studio prompt library authoring (Weeks 6-15)
- **Workstream D:** Knowledge Domain infrastructure (Weeks 8-15)

### 8.3 Dependencies Check

| Phase | Depends On | Status |
|-------|-----------|--------|
| 1b Dashboard JSON | 1a Multi-tenancy | ✓ Ready |
| 1b Design Agent | 1b Dashboard + 1c VC Model | ⚠ Partial (VC Model in progress) |
| 1d Workflows | 1a, 1b, 1c complete | ⚠ Partial (1c needed first) |
| 1e AI Integration | 1a, 1b, 1c, 1d complete | ⚠ Requires 1d foundations |
| Clone to ADA/PDA | 1a-1e complete on BDA | — After BDA complete |

---

## Part 9: Success Criteria & Validation

### 9.1 Phase 1b: Dashboard System

- [ ] Stakeholder core_config stores JSON dashboard definition
- [ ] Dashboard renderer correctly applies responsive breakpoints (desktop/tablet/mobile)
- [ ] Widgets render within declared size constraints
- [ ] Self-service modification throttled to once per hour (configurable)
- [ ] Admin override immediately updates config and clears user throttle
- [ ] Design agent recommends appropriate widgets for stakeholder role
- [ ] Multi-role stakeholders can switch between dashboards
- [ ] Audit trail captures all modifications (who, when, what changed)

### 9.2 Phase 1e: AI Integration & Knowledge Domain

- [ ] pgvector embeddings created and queryable for each domain
- [ ] Prompt library versioned and retrievable per domain/role
- [ ] Design agent successfully generates dashboard configs via Claude
- [ ] Workflow instances execute multi-activity sequences
- [ ] Maturity gates correctly restrict workflows (FLM vs AGM vs Full)
- [ ] Activities store outputs in correct filesystem paths
- [ ] External feeds (weather, market data) successfully integrated
- [ ] VC Model → dashboard rendering chain works end-to-end

### 9.3 Clone Validation (ADA/PDA)

- [ ] Clone deployed with domain-specific customization
- [ ] All Phase 1a-1e features functional in new domain
- [ ] Domain-specific widgets rendering correctly
- [ ] Domain-specific vectors searchable
- [ ] Domain-specific prompts generating correct recommendations

---

## Part 10: Next Steps

### Immediate (This Week)

1. **Review this document** with development team
2. **Finalize Phase 1b spec** with focus on JSON dashboard config
3. **Identify VC Studio design prompt templates** to be generated

### Week 2-3

1. **Begin Phase 1b development** (dashboard JSON config + renderer)
2. **Design Phase 1e architecture** (Knowledge Domain + pgvector schema)
3. **Spec Phase 1d enhancement** (workflow overlays + maturity gates)

### Week 4+

1. **Complete Phase 1a-1b** on vc-bda-production
2. **Begin Phase 1c** (VC model + file system)
3. **Prepare VC Studio integration** (prompt library authoring)
4. **Plan clone strategy** for ADA/PDA

---

## Summary: The Complete Architecture

When fully implemented:

✓ **vc-bda-production** = Proof-of-concept template application  
✓ **Dashboard system** = JSON-configured, AI-designed, responsive  
✓ **Knowledge Domain** = Systematic source of truth (vectors, prompts, data)  
✓ **Workflow overlays** = Modular, stackable business processes  
✓ **AI integration** = Claude-powered design and execution  
✓ **Scalability** = Clone architecture, domain customize, deploy

**Strategic Result:** VCEF/KDA becomes genuinely executable, defensible, scalable methodology. Organizations don't consult; they deploy.

---

**Document Version:** 2.0 (November 2025)  
**Status:** Ready for implementation planning  
**Next Review:** Bi-weekly during Phase 1b-1e development