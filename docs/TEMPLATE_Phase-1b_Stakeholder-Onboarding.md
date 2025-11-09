# Phase 1b Template: Stakeholder Onboarding & Dashboard Reorganisation

**Template Status:** Reusable across ADA, BDA, PDA  
**Phase Focus:** User Experience - Onboarding workflows and multi-dashboard architecture  
**Duration:** 3-4 weeks  
**Prerequisites:** Phase 1a (multi-tenancy database completed)  

---

## Executive Summary

Phase 1b transforms Phase 1a's database foundation into user-facing functionality through two interconnected systems:

1. **Onboarding Application** - Multi-role stakeholder registration with capability-based workflows
2. **Dashboard Reorganisation** - Three segregated dashboards (Admin, Organisation, Individual) enabling appropriate access levels and information architecture

This phase operationalises stakeholder management and establishes role-based access patterns foundational to Phases 1c-1e.

---

## 1. Objectives

- [ ] Create stakeholder onboarding application supporting multi-role registration
- [ ] Implement investor-specific capabilities and relationship tracking
- [ ] Redesign dashboard architecture into three segregated views
- [ ] Build capability profile system with certification tracking
- [ ] Create application routing logic directing stakeholders to appropriate dashboards
- [ ] Establish audit trail for onboarding conversions and role changes

---

## 2. Scope & Deliverables

### Core Deliverables

| Component | Deliverable | Success Criteria |
|-----------|-------------|-----------------|
| **Onboarding App** | Multi-step registration UI | 4+ stakeholder roles with distinct workflows |
| **Admin Dashboard** | System-level operations view | Full stakeholder visibility, role management, audit access |
| **Organisation Dashboard** | Stakeholder network view | Relationships, capabilities, interaction history per organisation |
| **Individual Dashboard** | Personal stakeholder view | Capabilities, portfolio view, engagement notifications |
| **Capability System** | Proficiency tracking UI | Certification levels, renewal tracking, evidence capture |
| **Routing Logic** | Role-based dashboard navigation | Correct dashboard presented based on user role |

---

## 3. Architecture: Three-Dashboard Model

### 3.1 Dashboard Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    STAKEHOLDER LOGIN                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
         ┌──────────────────┼──────────────────┐
         ↓                  ↓                  ↓
    [ADMIN]          [ORGANISATION]      [INDIVIDUAL]
    Dashboard           Dashboard            Dashboard
    
ADMIN DASHBOARD
├─ All stakeholders (all apps, all domains)
├─ User role management
├─ Application registry
├─ Audit log viewer
├─ System configuration
└─ Cross-app reporting

ORGANISATION DASHBOARD
├─ Organisation's own record
├─ Direct relationships (suppliers, customers, partners)
├─ Organisation capabilities & certifications
├─ Sub-stakeholders (if parent company)
├─ Engagement pipeline
└─ Internal team management

INDIVIDUAL DASHBOARD
├─ Personal profile & CV
├─ Skills & certifications
├─ Relationships & network
├─ Opportunities & engagements
├─ Document portfolio
└─ Notification centre
```

### 3.2 Role-Based Access Control

| Role | Database Role | Dashboard Access | Key Permissions |
|------|---------------|------------------|-----------------|
| **super_admin** | Super Admin | Admin | All system functions, all apps |
| **domain_admin** | Domain Admin | Admin + Org | Manage domain, view cross-org data |
| **app_manager** | App Manager | Admin + Org | Manage single app, delegate access |
| **organisation** | Org User | Org + Ind | Manage own org, view members |
| **investor** | Investor | Org + Ind | Portfolio view, deal tracking |
| **individual** | Individual | Ind | Personal profile, network, opportunities |

### 3.3 Stakeholder Role Combinations

Key insight: A stakeholder can hold **multiple roles** simultaneously

**Example: Angel Investor at Investment Company**
- Role 1: Investor (portfolio tracking)
- Role 2: Organisation Admin (manages investment company record)
- Role 3: Individual (personal stakeholder profile)

**Example: Producer in Agricultural Cooperative**
- Role 1: Individual (personal capabilities, relationships)
- Role 2: Organisation Member (cooperative member)
- Role 3: Investor (owns shares in cooperative, tracks returns)

---

## 4. Phase 1b Components

### 4.1 Onboarding Application

#### Stage 1: Stakeholder Type Selection

```
"What type of stakeholder are you?"

┌─────────────────────────────────────────┐
│ ☐ Individual (Person)                   │
│   • Producer, consultant, investor      │
│                                         │
│ ☐ Organisation (Company)                │
│   • Enterprise, cooperative, startup    │
│                                         │
│ ☐ Collective (Group)                    │
│   • Producer group, consortium          │
└─────────────────────────────────────────┘
```

#### Stage 2: Type-Specific Registration

**For Individual:**
```
Name: ________________
Email: _______________
Phone: _______________
Bio: _________________
Professional Background: _____________

Skills & Certifications:
├─ Capability: [Dropdown]
├─ Proficiency: [Awareness | Beginner | Intermediate | Advanced | Expert]
├─ Certification: [Optional: upload evidence]
└─ [+ Add capability]
```

**For Organisation:**
```
Organisation Name: ________________
Registration Number: _______________
Industry: [Dropdown: Agriculture | Property | Business | Other]
Size: [Employees: Dropdown]
Website: ___________________________
Lead Contact: ______________________

Current Capabilities:
├─ [Checkbox matrix of capabilities]
└─ [+ Describe specific strengths]

Relationships Sought:
├─ [Checkbox: Suppliers | Customers | Partners | Investors]
└─ [+ Describe opportunities]
```

#### Stage 3: Role & Capability Declaration

```
Select your role(s) in this ecosystem:

☐ Producer (Agricultural Domain)
  ├─ Certification: [Organic | Fair Trade | Conventional]
  └─ Production: [Commodity list]

☐ Investor
  ├─ Investment Company: ___________
  ├─ Min Investment: _______________
  └─ Focus Sectors: [Checkboxes]

☐ Service Provider (Consultant, etc.)
  ├─ Expertise Area: [Dropdown]
  ├─ Years Experience: ___________
  └─ Certifications: [Upload]

☐ Administrator / Manager
  ├─ Represent Organisation: [Dropdown]
  └─ Management Authority: [Details]
```

#### Stage 4: Relationship Mapping

```
Tell us about your relationships:

Existing Relationships:
├─ Organisation: [Searchable dropdown]
├─ Relationship Type: [Supplier | Customer | Partner | Other]
├─ Relationship Strength: [Scale 1-10]
└─ [+ Add relationship]

Seeking Relationships:
├─ Looking for: [Dropdown: Suppliers | Buyers | Partners | Investors]
├─ Description: _________________
└─ [+ Add opportunity]
```

#### Stage 5: Verification & Confirmation

```
Verification Summary:

Your Profile:
├─ Name: [Review]
├─ Roles: [Review - comma separated]
├─ Capabilities: [Review - list with levels]
├─ Relationships: [Review - count and types]
└─ Email Confirmation: [pending]

Verification Steps:
├─ ☐ Email verification (check inbox)
├─ ☐ Identity verification (admin will review)
└─ ☐ Capability certification (if applicable)

[Confirm & Submit Registration]
```

### 4.2 Admin Dashboard

**Purpose:** System-level oversight and stakeholder management

#### Layout Structure

```
┌──────────────────────────────────────────────────────────┐
│  Navigation Bar: [Dashboard | Users | Apps | Audit | Config]
├──────────────────────────────────────────────────────────┤
│                                                          │
│  SEARCH & FILTERS                                        │
│  ┌────────────────────────────────────────────────────┐ │
│  │ [Search stakeholder] [Filter: Role] [Filter: Domain]  │
│  │ [Filter: Status] [Date Range] [Sort: Created/Updated]│
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  STAKEHOLDER REGISTRY TABLE                              │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Reference │ Name │ Type │ Roles │ Status │ Actions  │
│  ├────────────────────────────────────────────────────┤ │
│  │ STK-001  │ John │ Ind. │ Investor, │ Active │ [Edit] │
│  │          │      │      │ Individual │      │ [View] │
│  │          │      │      │           │        │ [Del] │
│  ├────────────────────────────────────────────────────┤ │
│  │ STK-002  │ ABC Co │ Org │ Org Admin │ Pending│ [View] │
│  │          │        │     │           │Verify  │ [Edit] │
│  │          │        │     │           │        │[Action]│
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  METRICS PANEL                                           │
│  ├─ Total Stakeholders: 1,247                            │
│  ├─ Pending Verification: 34                             │
│  ├─ Active Relationships: 892                            │
│  └─ Certifications Expiring: 12                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Key Features

1. **Stakeholder Management**
   - View all stakeholders across all apps/domains
   - Edit stakeholder records (admin override)
   - Assign/revoke roles
   - Verify certifications
   - Manage status (active/inactive/suspended)

2. **Role Management**
   - Assign multiple roles to stakeholders
   - Define role permissions per domain
   - Audit role change history

3. **Audit Access**
   - View all system changes
   - Filter by user, table, timestamp
   - Export audit logs for compliance

4. **Relationship Validation**
   - Admin can verify relationships between stakeholders
   - Approve pending relationships
   - Manage relationship strength assignments

### 4.3 Organisation Dashboard

**Purpose:** Multi-stakeholder organisation management

#### Layout Structure

```
┌──────────────────────────────────────────────────────────┐
│ [Org Logo] Organisation Name                  [Settings] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ TABS: [Overview] [Members] [Relationships] [Capabilities]
│       [Opportunities] [Audit] [Settings]                 │
│                                                          │
│ OVERVIEW TAB                                             │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Organisation Profile                               │  │
│ ├─ Name: ABC Cooperative Ltd                         │  │
│ ├─ Status: Active (Verified)                         │  │
│ ├─ Size: 250+ employees                              │  │
│ ├─ Capabilities: [Quality Mgmt] [Supply Chain] [Tech]│  │
│ ├─ Primary Relationships: 45 suppliers, 18 customers │  │
│ └─ Certifications: ISO9001, Fair Trade, Organic      │  │
│                                                          │
│ MEMBERS SECTION                                         │
│ ├─ Total Members: 8                                     │
│ ├─ Administrators: 2                                    │
│ ├─ Investors: 1                                        │
│ └─ Team Members: 5                                     │
│                                                          │
│ RECENT RELATIONSHIPS                                    │
│ ├─ Supplier: Green Inputs Ltd (3 months)              │
│ ├─ Customer: Global Foods Inc (6 months)              │
│ └─ [+ View all relationships]                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Key Sections

1. **Members Management**
   - Add/remove team members
   - Assign roles within organisation
   - Track member capabilities
   - View member interaction history

2. **Relationships**
   - Display all directional relationships
   - Relationship strength visualization
   - Interaction frequency tracking
   - Pending relationship requests

3. **Capabilities**
   - View organisation capabilities
   - Certification status
   - Renewal tracking
   - Capability gap analysis

4. **Opportunities Pipeline**
   - Leads (sourcing/selling opportunities)
   - Qualified prospects
   - Active engagements
   - Closed deals tracking

### 4.4 Individual Dashboard

**Purpose:** Personal stakeholder profile and engagement view

#### Layout Structure

```
┌──────────────────────────────────────────────────────────┐
│ [Avatar] John Smith - Producer               [Settings]  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ TABS: [Profile] [Skills] [Network] [Opportunities]      │
│       [Portfolio] [Messages] [Activity]                  │
│                                                          │
│ PROFILE TAB                                              │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Personal Information                               │  │
│ ├─ Email: john@example.com (Verified)               │  │
│ ├─ Phone: +254-7XX-XXXXX (Verified)                │  │
│ ├─ Bio: Organic cocoa producer, 15+ years...        │  │
│ └─ Location: Kilifi, Kenya                          │  │
│                                                      │  │
│ Role(s): ☑ Producer ☑ Investor ☑ Organisation Admin│  │
│                                                      │  │
│ SKILLS & CERTIFICATIONS                             │  │
│ ├─ Organic Farming (Advanced, Certified)            │  │
│ ├─ Quality Management (Intermediate)                 │  │
│ └─ [+ Add skill]                                    │  │
│                                                      │  │
│ NETWORK OVERVIEW                                    │  │
│ ├─ Direct Relationships: 23                         │  │
│ ├─ Indirect (through organisations): 127           │  │
│ └─ [View network graph]                            │  │
│                                                      │  │
└────────────────────────────────────────────────────────┘
```

#### Key Features

1. **Professional Profile**
   - Customisable bio and CV
   - Verification badges
   - Skills endorsements (peer network)

2. **Skills & Certifications**
   - Self-declared capabilities
   - Certification evidence
   - Renewal reminders
   - Proficiency level tracking

3. **Network Visualisation**
   - Relationship graph (visual network mapping)
   - Direct vs indirect connections
   - Relationship strength indicators

4. **Opportunities**
   - Personalised opportunity feed
   - Deal tracking
   - Investment portfolio (if investor)

---

## 5. Implementation Architecture

### 5.1 Component Structure

```
src/
├─ components/
│  ├─ onboarding/
│  │  ├─ StakeholderTypeSelector.tsx
│  │  ├─ RegistrationForm.tsx
│  │  ├─ RoleSelector.tsx
│  │  ├─ RelationshipMapper.tsx
│  │  └─ VerificationSummary.tsx
│  │
│  ├─ dashboards/
│  │  ├─ AdminDashboard.tsx
│  │  │  ├─ StakeholderRegistry.tsx
│  │  │  ├─ RoleManagement.tsx
│  │  │  ├─ AuditViewer.tsx
│  │  │  └─ SystemMetrics.tsx
│  │  │
│  │  ├─ OrganisationDashboard.tsx
│  │  │  ├─ OrgProfile.tsx
│  │  │  ├─ MembersManager.tsx
│  │  │  ├─ RelationshipViewer.tsx
│  │  │  └─ CapabilityTracker.tsx
│  │  │
│  │  └─ IndividualDashboard.tsx
│  │     ├─ ProfileCard.tsx
│  │     ├─ SkillsTracker.tsx
│  │     ├─ NetworkGraph.tsx
│  │     └─ OpportunityFeed.tsx
│  │
│  └─ common/
│     ├─ RoleRenderer.tsx
│     ├─ CapabilityMatrix.tsx
│     ├─ RelationshipCard.tsx
│     └─ VerificationBadge.tsx
│
├─ lib/
│  ├─ roles/
│  │  ├─ roleDefinitions.ts (role permissions)
│  │  ├─ dashboardRouter.ts (role → dashboard mapping)
│  │  └─ permissionCheck.ts
│  │
│  └─ onboarding/
│     ├─ stakeholderService.ts
│     ├─ roleAssigner.ts
│     └─ verificationFlow.ts
│
└─ types/
   ├─ stakeholder.types.ts
   ├─ role.types.ts
   └─ dashboard.types.ts
```

### 5.2 Routing Logic

```typescript
// Role-based dashboard router
const getDashboardPath = (user: User): string => {
  const roles = user.roles // ['super_admin', 'investor', 'individual']
  
  // Priority: admin > manager > organisation > individual
  if (roles.includes('super_admin')) return '/dashboard/admin'
  if (roles.includes('domain_admin')) return '/dashboard/admin'
  if (roles.includes('app_manager')) return '/dashboard/admin'
  if (roles.includes('organisation')) return '/dashboard/organisation'
  if (roles.includes('investor')) return '/dashboard/organisation' // investor sees org view
  return '/dashboard/individual'
}
```

### 5.3 Multi-Role Capabilities

```typescript
// Investor with multiple roles
const investor = {
  id: 'STK-001',
  name: 'Jane Smith',
  roles: [
    { role: 'investor', organisation: 'Global Ventures Inc' },
    { role: 'organisation', stakeholder_id: 'ORG-002' },
    { role: 'individual' }
  ],
  capabilities: [
    { capability: 'Investment Analysis', level: 'Expert' },
    { capability: 'Business Strategy', level: 'Advanced' }
  ]
}
```

---

## 6. Implementation Tasks

### Phase 1b Deliverables Checklist

**Onboarding Application:**
- [ ] Build stakeholder type selector UI (3 types)
- [ ] Create type-specific registration forms
- [ ] Implement role multi-selector with capability declarations
- [ ] Build relationship mapping interface
- [ ] Create verification summary & email confirmation
- [ ] Implement onboarding workflow state management
- [ ] Create database submission logic with transaction handling
- [ ] Build stakeholder reference auto-generation (STK-YYYYMMDD-XXXX)

**Admin Dashboard:**
- [ ] Build stakeholder registry table with search/filter
- [ ] Implement role assignment UI
- [ ] Create audit log viewer with advanced filters
- [ ] Build system metrics panel
- [ ] Implement stakeholder record editor (admin override)
- [ ] Create bulk actions (export, role assignment, status changes)
- [ ] Build relationship verification workflows

**Organisation Dashboard:**
- [ ] Create organisation profile display
- [ ] Build members management interface
- [ ] Implement relationship viewer with directional indicators
- [ ] Create capability tracker with certification status
- [ ] Build opportunities pipeline view
- [ ] Implement organisation settings/configuration

**Individual Dashboard:**
- [ ] Create profile card with verification badges
- [ ] Build skills/certifications manager
- [ ] Implement network relationship graph (visual)
- [ ] Create opportunity feed with personalisation
- [ ] Build portfolio view for investors
- [ ] Implement notification centre

**Routing & Navigation:**
- [ ] Implement dashboard router (role → correct dashboard)
- [ ] Build multi-role handler (user with multiple roles can switch)
- [ ] Create main navigation with role-aware menu
- [ ] Implement logout/role switching UI
- [ ] Build permission guard middleware

**Testing:**
- [ ] Registration workflow end-to-end test (all stakeholder types)
- [ ] Multi-role stakeholder dashboard switching
- [ ] Admin override and verification workflows
- [ ] Data isolation between users (cross-app visibility)
- [ ] Load testing dashboard with 100+ relationships

**Documentation:**
- [ ] User guide for onboarding process
- [ ] Administrator guide for dashboard
- [ ] API documentation for onboarding endpoints
- [ ] Database schema extensions for Phase 1b

---

## 7. Success Criteria

- [ ] Stakeholders can complete onboarding in <5 minutes
- [ ] New stakeholders have verified email & phone
- [ ] Investor stakeholders can declare investment criteria
- [ ] Multi-role stakeholders can switch dashboards
- [ ] Admin has complete visibility across all stakeholders
- [ ] All dashboard views load in <1 second (100+ relationships)
- [ ] Audit trail captures all onboarding actions
- [ ] Role-based access control prevents cross-stakeholder data viewing

---

## 8. Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| Complex multi-role logic | Test all role combinations before deployment |
| Slow dashboard rendering | Implement pagination, virtual scrolling for large datasets |
| Registration drop-off | Keep onboarding to <5 steps, mobile-optimized |
| Audit log bloat | Archive logs >90 days to separate table |
| Role permission conflicts | Centralise permission matrix in `roleDefinitions.ts` |

---

## 9. Next Phase Dependency

Phase 1b → **Phase 1c (VC Model Components & File System)**

Phase 1c requires:
- Completed stakeholder onboarding
- Working multi-dashboard navigation
- Stakeholder records with verified roles
- Capability tracking operational

---

## Template Outputs

Use this template to create domain-specific Phase 1b artifacts:

**For ADA Domain:** Phase-1b_ADA_Stakeholder-Onboarding.md  
**For BDA Domain:** Phase-1b_BDA_Stakeholder-Onboarding.md  
**For PDA Domain:** Phase-1b_PDA_Stakeholder-Onboarding.md  

Each domain variant customises:
- Domain-specific stakeholder types (Producer, Broker, Buyer, etc.)
- Domain-specific capabilities and certifications
- Domain-specific relationship types
- Domain-specific dashboard sections
