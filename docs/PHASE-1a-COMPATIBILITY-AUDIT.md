# PHASE 1a: Multi-App Compatibility Audit Report

**Project**: VC Studio - PostgreSQL KDA Baseline
**Audit Date**: 2025-11-04
**Auditor**: Database Architecture Review
**Scope**: Multi-application compatibility assessment for expansion from single-app (VC_STUDIO/BDA) to multi-app system (T2G/G2G/OCG for ADA, BUILDBID for PDA)

---

## Executive Summary

### Current State
The existing PostgreSQL schema was designed for a single application (VC Studio). The database contains branding, content, and operational tables that currently lack application isolation mechanisms.

### Target State
Support multiple independent applications sharing the same database infrastructure:
- **ADA (Advise Domain Architecture)**: T2G, G2G, OCG applications
- **BDA (Build Domain Architecture)**: VC_STUDIO application
- **PDA (Plan Domain Architecture)**: BUILDBID application

### Key Findings
- **3 tables deployed and audited** in repository: site_settings, page_settings, page_images
- **8 tables mentioned** in user context: enquiries, blog_posts, stakeholders, relationships, functions_registry, notifications, workflows, campaigns, interactions, audit_log
- **HIGH RISK**: enquiries, blog_posts, notifications lack application isolation
- **MEDIUM RISK**: page_settings, page_images need app context
- **LOW RISK**: site_settings can become app registry with minimal changes
- **ALL AMENDMENTS**: Non-breaking (backward compatible)

### Risk Assessment
| Risk Level | Count | Tables |
|------------|-------|--------|
| HIGH | 3 | enquiries, blog_posts, notifications |
| MEDIUM | 2 | page_settings, page_images |
| LOW | 6 | site_settings, stakeholders, relationships, functions_registry, workflows, campaigns, interactions, audit_log |

---

## Table-by-Table Audit

### 1. SITE_SETTINGS (Deployed - Audited)

**Purpose**: Stores site branding, theme configuration, and styling
**Current Schema**: Has `site_name`, `is_active`, styling fields
**Multi-App Ready**: NO (but easily converted)

#### Current State
```sql
CREATE TABLE site_settings (
  id UUID PRIMARY KEY,
  site_name VARCHAR(200) NOT NULL DEFAULT 'VC Studio',
  site_tagline TEXT,
  logo_url TEXT,
  -- 30+ branding/styling fields
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### Problem Analysis
- **Missing app identifier**: No `app_uuid`, `site_code`, or `domain_code`
- **Single active record**: Trigger ensures only one active setting (not scalable)
- **No app metadata**: Cannot distinguish between T2G, G2G, OCG, VC_STUDIO, BUILDBID
- **Current query pattern**: `WHERE is_active = true` returns single app only

#### Multi-App Requirements
- Add `app_uuid` (primary app identifier)
- Add `site_code` (human-readable: 'T2G', 'VC_STUDIO', 'BUILDBID')
- Add `domain_code` (group apps: 'ADA', 'BDA', 'PDA')
- Add `is_active_app` (replace single-active constraint)
- Modify trigger to allow multiple active apps

#### Required Amendments
```sql
-- Add app identification fields
ALTER TABLE site_settings ADD COLUMN app_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE site_settings ADD COLUMN site_code TEXT;
ALTER TABLE site_settings ADD COLUMN domain_code TEXT;
ALTER TABLE site_settings ADD COLUMN is_active_app BOOLEAN DEFAULT TRUE;

-- Create unique constraint on app_uuid
ALTER TABLE site_settings ADD CONSTRAINT uq_site_settings_app_uuid UNIQUE (app_uuid);

-- Create indexes
CREATE INDEX idx_site_settings_app_uuid ON site_settings(app_uuid);
CREATE INDEX idx_site_settings_site_code ON site_settings(site_code);
CREATE INDEX idx_site_settings_domain_code ON site_settings(domain_code);

-- Backfill existing data (assume current is VC_STUDIO/BDA)
UPDATE site_settings
SET site_code = 'VC_STUDIO',
    domain_code = 'BDA',
    is_active_app = true
WHERE site_code IS NULL;

-- Drop old single-active trigger
DROP TRIGGER IF EXISTS ensure_single_active_site_settings_trigger ON site_settings;

-- Create new multi-app-aware trigger (optional - allow multiple active)
-- Or modify to: "only one active per site_code" if needed
```

#### Breaking vs Non-Breaking
- **NON-BREAKING**: New columns are nullable/have defaults
- **NON-BREAKING**: Existing queries still work (backward compatible)
- **NON-BREAKING**: `WHERE is_active = true` still returns results
- **ENHANCEMENT**: New queries can now filter by `site_code` or `app_uuid`

#### Risk Level: LOW
- Simple field additions
- No data loss
- Existing functionality preserved
- Easy rollback (drop columns if needed)

#### Example Queries

**Current Query (Single App)**
```sql
SELECT * FROM site_settings WHERE is_active = true;
```

**Multi-App Query (New)**
```sql
-- By site code
SELECT * FROM site_settings
WHERE site_code = 'T2G' AND is_active_app = true;

-- By app UUID
SELECT * FROM site_settings
WHERE app_uuid = $1 AND is_active_app = true;

-- By domain (all ADA apps)
SELECT * FROM site_settings
WHERE domain_code = 'ADA' AND is_active_app = true;
```

---

### 2. PAGE_SETTINGS (Deployed - Audited)

**Purpose**: Stores page content configuration (hero, info, gallery sections)
**Current Schema**: Has `page_name` (unique), `is_published`, content fields
**Multi-App Ready**: NO

#### Current State
```sql
CREATE TABLE page_settings (
  id UUID PRIMARY KEY,
  page_name VARCHAR(100) NOT NULL UNIQUE, -- 'home', 'about', 'contact'
  hero_video_url TEXT,
  hero_title TEXT NOT NULL DEFAULT 'Value Chain Studio',
  hero_subtitle TEXT,
  -- 15+ content fields
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### Problem Analysis
- **No app isolation**: `page_name` is globally unique across all apps
- **Data collision**: If T2G creates 'home' page, VC_STUDIO cannot
- **Wrong assumption**: Assumes single app owns all pages
- **Current query**: `WHERE page_name = 'home'` returns any app's home page

#### Multi-App Requirements
- Add `app_uuid` foreign key to site_settings
- Change unique constraint from `page_name` to `(app_uuid, page_name)`
- Each app can have its own 'home', 'about', 'contact' pages

#### Required Amendments
```sql
-- Add app_uuid column
ALTER TABLE page_settings ADD COLUMN app_uuid UUID REFERENCES site_settings(app_uuid);

-- Create index
CREATE INDEX idx_page_settings_app_uuid ON page_settings(app_uuid);

-- Drop old unique constraint
ALTER TABLE page_settings DROP CONSTRAINT page_settings_page_name_key;

-- Add new composite unique constraint
ALTER TABLE page_settings ADD CONSTRAINT uq_page_settings_app_page
  UNIQUE (app_uuid, page_name);

-- Backfill existing data (assign to VC_STUDIO)
UPDATE page_settings
SET app_uuid = (SELECT app_uuid FROM site_settings WHERE site_code = 'VC_STUDIO' LIMIT 1)
WHERE app_uuid IS NULL;

-- Make app_uuid NOT NULL after backfill
ALTER TABLE page_settings ALTER COLUMN app_uuid SET NOT NULL;
```

#### Breaking vs Non-Breaking
- **NON-BREAKING**: New column added with nullable default
- **NON-BREAKING**: Backfill assigns existing pages to VC_STUDIO
- **BREAKING (Minor)**: Unique constraint change (but no existing conflicts expected)
- **NON-BREAKING**: Existing queries work but should be updated

#### Risk Level: MEDIUM
- Structural change (unique constraint)
- Requires backfill step
- Application code should be updated to pass app context
- Low risk of data conflicts (single app currently)

#### Example Queries

**Current Query (Single App)**
```sql
SELECT * FROM page_settings WHERE page_name = 'home' AND is_published = true;
```

**Multi-App Query (New - Recommended)**
```sql
-- By app UUID (best performance)
SELECT * FROM page_settings
WHERE app_uuid = $1 AND page_name = 'home' AND is_published = true;

-- By site code (requires join)
SELECT ps.* FROM page_settings ps
JOIN site_settings ss ON ps.app_uuid = ss.app_uuid
WHERE ss.site_code = 'T2G'
  AND ps.page_name = 'home'
  AND ps.is_published = true;
```

---

### 3. PAGE_IMAGES (Deployed - Audited)

**Purpose**: Gallery images for pages (one-to-many with page_settings)
**Current Schema**: Has `page_settings_id` FK, `display_order`, image fields
**Multi-App Ready**: INHERITS from page_settings

#### Current State
```sql
CREATE TABLE page_images (
  id UUID PRIMARY KEY,
  page_settings_id UUID NOT NULL REFERENCES page_settings(id) ON DELETE CASCADE,
  cloudinary_url TEXT NOT NULL,
  public_id TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### Problem Analysis
- **Indirect isolation**: Relies on page_settings having app_uuid
- **Cascade dependency**: If page_settings gets app isolation, images inherit it
- **Query complexity**: Requires join to filter by app
- **Current state**: Works once page_settings is fixed

#### Multi-App Requirements
- **Option A**: Do nothing (rely on FK cascade from page_settings)
- **Option B**: Add direct `app_uuid` column for query performance
- **Recommendation**: Option B (denormalization for performance)

#### Required Amendments
```sql
-- Option B: Add direct app_uuid for query performance
ALTER TABLE page_images ADD COLUMN app_uuid UUID REFERENCES site_settings(app_uuid);

-- Create index
CREATE INDEX idx_page_images_app_uuid ON page_images(app_uuid);

-- Backfill from parent page_settings
UPDATE page_images pi
SET app_uuid = ps.app_uuid
FROM page_settings ps
WHERE pi.page_settings_id = ps.id
  AND pi.app_uuid IS NULL;

-- Optional: Create trigger to auto-sync app_uuid from page_settings
CREATE OR REPLACE FUNCTION sync_page_images_app_uuid()
RETURNS TRIGGER AS $$
BEGIN
  SELECT app_uuid INTO NEW.app_uuid
  FROM page_settings
  WHERE id = NEW.page_settings_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_page_images_app_uuid_trigger
  BEFORE INSERT OR UPDATE ON page_images
  FOR EACH ROW
  EXECUTE FUNCTION sync_page_images_app_uuid();
```

#### Breaking vs Non-Breaking
- **NON-BREAKING**: New column is optional
- **NON-BREAKING**: FK cascade ensures data integrity
- **NON-BREAKING**: Trigger auto-populates for new records
- **ENHANCEMENT**: Better query performance (no join needed)

#### Risk Level: MEDIUM
- Depends on page_settings changes
- Denormalization adds complexity
- Trigger adds overhead (but minimal)

#### Example Queries

**Current Query (Single App)**
```sql
SELECT * FROM page_images
WHERE page_settings_id = $1
  AND is_active = true
ORDER BY display_order;
```

**Multi-App Query (Option A - Join)**
```sql
SELECT pi.* FROM page_images pi
JOIN page_settings ps ON pi.page_settings_id = ps.id
WHERE ps.app_uuid = $1
  AND pi.is_active = true
ORDER BY pi.display_order;
```

**Multi-App Query (Option B - Direct)**
```sql
SELECT * FROM page_images
WHERE app_uuid = $1
  AND is_active = true
ORDER BY display_order;
```

---

### 4. ENQUIRIES (Not in Repo - User Context)

**Purpose**: Contact form submissions
**Current Schema**: Unknown (assumed: name, email, message, status, created_at)
**Multi-App Ready**: NO (assumed based on user description)

#### Expected Current State
```sql
-- Assumed structure
CREATE TABLE enquiries (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new', -- 'new', 'in_progress', 'resolved'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Problem Analysis
- **No app isolation**: All enquiries in single queue
- **Support nightmare**: Can't tell which app enquiry came from
- **Reporting impossible**: Can't generate per-app metrics
- **Routing broken**: Support team can't filter by app

#### Multi-App Requirements
- Add `app_uuid` foreign key
- Each app has isolated enquiry queue
- Support team can filter/route by app

#### Required Amendments
```sql
ALTER TABLE enquiries ADD COLUMN app_uuid UUID REFERENCES site_settings(app_uuid);
CREATE INDEX idx_enquiries_app_uuid ON enquiries(app_uuid);

-- Backfill strategy (choose one):
-- Option 1: Assign all to VC_STUDIO
UPDATE enquiries
SET app_uuid = (SELECT app_uuid FROM site_settings WHERE site_code = 'VC_STUDIO' LIMIT 1)
WHERE app_uuid IS NULL;

-- Option 2: Leave NULL for historical (pre-multi-app) enquiries
-- Option 3: Manual assignment based on email domain or other heuristics
```

#### Breaking vs Non-Breaking
- **NON-BREAKING**: New optional column
- **NON-BREAKING**: Existing queries work (but unfiltered)
- **ENHANCEMENT**: New queries can filter by app

#### Risk Level: HIGH
- Critical business data (customer enquiries)
- Must not lose or misroute enquiries
- Support processes need updating
- Application code MUST pass app context

#### Example Queries

**Current Query (Single App - Broken for Multi-App)**
```sql
SELECT * FROM enquiries WHERE status = 'new' ORDER BY created_at DESC;
```

**Multi-App Query (Required)**
```sql
SELECT * FROM enquiries
WHERE app_uuid = $1 AND status = 'new'
ORDER BY created_at DESC;

-- Admin view (all apps)
SELECT e.*, ss.site_code, ss.site_name
FROM enquiries e
LEFT JOIN site_settings ss ON e.app_uuid = ss.app_uuid
WHERE status = 'new'
ORDER BY created_at DESC;
```

---

### 5. BLOG_POSTS (Not in Repo - User Context)

**Purpose**: Content library / blog articles
**Current Schema**: Unknown (assumed: title, slug, content, author, published_at)
**Multi-App Ready**: NO (assumed based on user description)

#### Expected Current State
```sql
-- Assumed structure
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  author_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Problem Analysis
- **No app isolation**: All posts in single library
- **Slug collision**: If T2G creates 'about-us', VC_STUDIO cannot
- **Content mixing**: Apps might display each other's content
- **SEO issues**: Duplicate slugs across apps break routing

#### Multi-App Requirements
- Add `app_uuid` foreign key
- Change unique constraint from `slug` to `(app_uuid, slug)`
- Each app has isolated content library

#### Required Amendments
```sql
ALTER TABLE blog_posts ADD COLUMN app_uuid UUID REFERENCES site_settings(app_uuid);
CREATE INDEX idx_blog_posts_app_uuid ON blog_posts(app_uuid);

-- Drop old unique constraint
ALTER TABLE blog_posts DROP CONSTRAINT blog_posts_slug_key;

-- Add composite unique constraint
ALTER TABLE blog_posts ADD CONSTRAINT uq_blog_posts_app_slug
  UNIQUE (app_uuid, slug);

-- Backfill (assign to VC_STUDIO or per-post decision)
UPDATE blog_posts
SET app_uuid = (SELECT app_uuid FROM site_settings WHERE site_code = 'VC_STUDIO' LIMIT 1)
WHERE app_uuid IS NULL;

ALTER TABLE blog_posts ALTER COLUMN app_uuid SET NOT NULL;
```

#### Breaking vs Non-Breaking
- **NON-BREAKING**: New column with nullable default
- **BREAKING (Minor)**: Unique constraint change
- **NON-BREAKING**: Backfill preserves existing data

#### Risk Level: HIGH
- Content data (valuable business asset)
- SEO implications (slug routing)
- Application code must filter by app
- RSS feeds, sitemaps need updating

#### Example Queries

**Current Query (Single App - Broken)**
```sql
SELECT * FROM blog_posts
WHERE status = 'published'
ORDER BY published_at DESC
LIMIT 10;
```

**Multi-App Query (Required)**
```sql
SELECT * FROM blog_posts
WHERE app_uuid = $1 AND status = 'published'
ORDER BY published_at DESC
LIMIT 10;

-- By slug (must include app context)
SELECT * FROM blog_posts
WHERE app_uuid = $1 AND slug = $2;
```

---

### 6. NOTIFICATIONS (Not in Repo - User Context)

**Purpose**: System messages/notifications to users
**Current Schema**: Unknown (assumed: user_id, message, type, read_at)
**Multi-App Ready**: NO (assumed)

#### Expected Current State
```sql
-- Assumed structure
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  notification_type TEXT NOT NULL, -- 'info', 'warning', 'success', 'error'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Problem Analysis
- **No app context**: Can't tell which app sent notification
- **User confusion**: Multi-app users see mixed notifications
- **Filtering broken**: Can't show only T2G notifications in T2G UI
- **Audit trail incomplete**: Can't trace notification origin

#### Multi-App Requirements
- Add `app_uuid` foreign key
- Users can filter notifications by app
- System can send app-specific notifications

#### Required Amendments
```sql
ALTER TABLE notifications ADD COLUMN app_uuid UUID REFERENCES site_settings(app_uuid);
CREATE INDEX idx_notifications_app_uuid ON notifications(app_uuid);
CREATE INDEX idx_notifications_user_app ON notifications(user_id, app_uuid);

-- Backfill: Leave NULL for historical notifications (pre-multi-app era)
-- OR assign to VC_STUDIO if all are from current app
```

#### Breaking vs Non-Breaking
- **NON-BREAKING**: New optional column (NULL allowed)
- **NON-BREAKING**: Historical notifications remain accessible
- **ENHANCEMENT**: New notifications must include app_uuid

#### Risk Level: HIGH
- User-facing feature
- Must not break notification display
- Application code must pass app context for new notifications

#### Example Queries

**Current Query (Single App - Broken)**
```sql
SELECT * FROM notifications
WHERE user_id = $1 AND read_at IS NULL
ORDER BY created_at DESC;
```

**Multi-App Query (Required)**
```sql
-- User's notifications for specific app
SELECT * FROM notifications
WHERE user_id = $1 AND app_uuid = $2 AND read_at IS NULL
ORDER BY created_at DESC;

-- User's notifications across all apps (dashboard view)
SELECT n.*, ss.site_code, ss.site_name
FROM notifications n
LEFT JOIN site_settings ss ON n.app_uuid = ss.app_uuid
WHERE user_id = $1 AND read_at IS NULL
ORDER BY created_at DESC;
```

---

### 7. STAKEHOLDERS (Not in Repo - User Context)

**Purpose**: People/organizations in system
**Current Schema**: Unknown (assumed: name, email, type, organization)
**Multi-App Ready**: LIKELY YES (if designed as shared registry)

#### Expected Current State
```sql
-- Assumed structure
CREATE TABLE stakeholders (
  id UUID PRIMARY KEY,
  stakeholder_type TEXT NOT NULL, -- 'individual', 'organization'
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  organization_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Analysis
- **Shared entity**: Stakeholders likely exist across multiple apps
- **User context**: A person can be stakeholder in T2G AND VC_STUDIO
- **Design decision**: Should stakeholders be app-specific or global?

#### Multi-App Strategy: GLOBAL REGISTRY + RELATIONSHIPS

**Recommendation**: Keep stakeholders as global registry, use `relationships` table to link stakeholders to apps.

```sql
-- Stakeholders table: NO CHANGES NEEDED (global registry)
-- Use relationships table to track "stakeholder is member of app"

-- Verify relationships table supports this:
-- relationship_types: ('user_in_application', 'User in Application', 'Stakeholder is a member of this app', false)
```

#### Required Amendments
```sql
-- NO CHANGES to stakeholders table
-- Add relationship type if doesn't exist

INSERT INTO relationship_types (code, label, description, is_bidirectional)
VALUES ('user_in_application', 'User in Application', 'Stakeholder is a member of this app', false)
ON CONFLICT (code) DO NOTHING;

-- Example: Link stakeholder to app
INSERT INTO relationships (
  from_stakeholder_id,
  to_stakeholder_id, -- or use app_uuid as synthetic stakeholder
  relationship_type_code
) VALUES (
  $stakeholder_uuid,
  $app_uuid, -- or site_settings.id if using as stakeholder
  'user_in_application'
);
```

#### Breaking vs Non-Breaking
- **NON-BREAKING**: No schema changes
- **NON-BREAKING**: Existing functionality preserved
- **ENHANCEMENT**: New relationship pattern

#### Risk Level: LOW
- No schema changes
- Existing data preserved
- Flexible design (supports both global and app-specific models)

#### Example Queries

**Global Stakeholders**
```sql
SELECT * FROM stakeholders WHERE email = $1;
```

**App-Specific Stakeholders**
```sql
-- Stakeholders in specific app (via relationships)
SELECT s.* FROM stakeholders s
JOIN relationships r ON s.id = r.from_stakeholder_id
WHERE r.to_stakeholder_id = $app_uuid
  AND r.relationship_type_code = 'user_in_application';
```

---

### 8. RELATIONSHIPS (Not in Repo - User Context)

**Purpose**: M2M relationships between stakeholders
**Current Schema**: Unknown (assumed: from_id, to_id, type, metadata)
**Multi-App Ready**: YES (if flexible design)

#### Expected Current State
```sql
-- Assumed structure
CREATE TABLE relationships (
  id UUID PRIMARY KEY,
  from_stakeholder_id UUID REFERENCES stakeholders(id),
  to_stakeholder_id UUID REFERENCES stakeholders(id),
  relationship_type_code TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Analysis
- **Flexible design**: Can represent any relationship
- **App context optional**: Relationships can be app-specific or global
- **Metadata field**: Can store `app_uuid` in JSONB if needed

#### Multi-App Strategy: ADD OPTIONAL app_uuid

```sql
-- Option 1: Add app_uuid column for app-specific relationships
ALTER TABLE relationships ADD COLUMN app_uuid UUID REFERENCES site_settings(app_uuid);
CREATE INDEX idx_relationships_app_uuid ON relationships(app_uuid);

-- Option 2: Use metadata JSONB (already exists)
-- Store app context in metadata: {"app_uuid": "..."}
```

#### Required Amendments
```sql
-- Add optional app_uuid
ALTER TABLE relationships ADD COLUMN app_uuid UUID REFERENCES site_settings(app_uuid);
CREATE INDEX idx_relationships_app_uuid ON relationships(app_uuid);

-- Add composite index for app-filtered queries
CREATE INDEX idx_relationships_from_app ON relationships(from_stakeholder_id, app_uuid);
CREATE INDEX idx_relationships_to_app ON relationships(to_stakeholder_id, app_uuid);

-- No backfill needed (NULL = global relationship)
```

#### Breaking vs Non-Breaking
- **NON-BREAKING**: New optional column
- **NON-BREAKING**: NULL means global relationship
- **ENHANCEMENT**: App-specific relationships now possible

#### Risk Level: LOW
- Simple field addition
- Flexible design preserved
- No data loss

---

### 9. FUNCTIONS_REGISTRY (Not in Repo - User Context)

**Purpose**: Business functions/capabilities registry
**Current Schema**: Unknown (assumed: name, description, category, is_active)
**Multi-App Ready**: VERIFY

#### Expected Current State
```sql
-- Assumed structure
CREATE TABLE functions_registry (
  id UUID PRIMARY KEY,
  function_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Analysis
- **Business logic**: Functions might be shared or app-specific
- **Design decision**: Are functions global capabilities or app-specific features?
- **Example**: "Weather API" might be used by multiple apps

#### Multi-App Strategy: DUAL-MODE (Global + App-Specific)

```sql
-- Add optional app_uuid
ALTER TABLE functions_registry ADD COLUMN app_uuid UUID REFERENCES site_settings(app_uuid);
CREATE INDEX idx_functions_registry_app_uuid ON functions_registry(app_uuid);

-- NULL = global function (available to all apps)
-- UUID = app-specific function
```

#### Required Amendments
```sql
-- Add app context (optional)
ALTER TABLE functions_registry ADD COLUMN app_uuid UUID REFERENCES site_settings(app_uuid);
CREATE INDEX idx_functions_registry_app_uuid ON functions_registry(app_uuid);

-- Add external API fields (Phase 1e prep)
ALTER TABLE functions_registry ADD COLUMN is_external_api BOOLEAN DEFAULT FALSE;
ALTER TABLE functions_registry ADD COLUMN api_endpoint TEXT;
ALTER TABLE functions_registry ADD COLUMN api_method TEXT; -- 'GET', 'POST', etc.
ALTER TABLE functions_registry ADD COLUMN api_headers JSONB;
ALTER TABLE functions_registry ADD COLUMN api_auth_type TEXT; -- 'none', 'api_key', 'oauth'
ALTER TABLE functions_registry ADD COLUMN api_timeout INTEGER DEFAULT 30000; -- milliseconds

-- Create indexes
CREATE INDEX idx_functions_registry_is_external ON functions_registry(is_external_api);
```

#### Breaking vs Non-Breaking
- **NON-BREAKING**: All new columns optional
- **NON-BREAKING**: NULL app_uuid = global function
- **ENHANCEMENT**: Supports external API integration (Phase 1e)

#### Risk Level: LOW
- Field additions only
- Flexible design
- Prepares for external API integration

---

### 10. WORKFLOWS (Not in Repo - User Context)

**Purpose**: Process automation definitions
**Current Schema**: Unknown (assumed: name, trigger_type, actions, is_active)
**Multi-App Ready**: VERIFY

#### Analysis
- **App-specific logic**: Workflows are likely app-specific
- **Trigger context**: Workflow triggers need app context
- **Action scope**: Actions should execute within app context

#### Required Amendments
```sql
ALTER TABLE workflows ADD COLUMN app_uuid UUID REFERENCES site_settings(app_uuid);
CREATE INDEX idx_workflows_app_uuid ON workflows(app_uuid);

-- Make app_uuid required for new workflows
-- Backfill existing workflows to VC_STUDIO
UPDATE workflows
SET app_uuid = (SELECT app_uuid FROM site_settings WHERE site_code = 'VC_STUDIO' LIMIT 1)
WHERE app_uuid IS NULL;

ALTER TABLE workflows ALTER COLUMN app_uuid SET NOT NULL;
```

#### Risk Level: MEDIUM
- Business logic affected
- Trigger system needs updating
- Requires testing

---

### 11. CAMPAIGNS (Not in Repo - User Context)

**Purpose**: Marketing/engagement campaigns
**Current Schema**: Unknown (assumed: name, type, start_date, end_date, status)
**Multi-App Ready**: VERIFY

#### Analysis
- **App-specific**: Campaigns are definitely app-specific
- **Audience isolation**: Each app's campaigns target their own users

#### Required Amendments
```sql
ALTER TABLE campaigns ADD COLUMN app_uuid UUID REFERENCES site_settings(app_uuid);
CREATE INDEX idx_campaigns_app_uuid ON campaigns(app_uuid);

UPDATE campaigns
SET app_uuid = (SELECT app_uuid FROM site_settings WHERE site_code = 'VC_STUDIO' LIMIT 1)
WHERE app_uuid IS NULL;

ALTER TABLE campaigns ALTER COLUMN app_uuid SET NOT NULL;
```

#### Risk Level: MEDIUM
- Marketing data
- Audience targeting must be correct
- Reporting needs app context

---

### 12. INTERACTIONS (Not in Repo - User Context)

**Purpose**: Communication log between system and stakeholders
**Current Schema**: Unknown (assumed: stakeholder_id, interaction_type, notes, timestamp)
**Multi-App Ready**: VERIFY

#### Analysis
- **App-specific**: Interactions happen within app context
- **Audit trail**: Must preserve which app interaction occurred in

#### Required Amendments
```sql
ALTER TABLE interactions ADD COLUMN app_uuid UUID REFERENCES site_settings(app_uuid);
CREATE INDEX idx_interactions_app_uuid ON interactions(app_uuid);
CREATE INDEX idx_interactions_stakeholder_app ON interactions(stakeholder_id, app_uuid);

-- Allow NULL for historical interactions (pre-multi-app)
```

#### Risk Level: MEDIUM
- Historical data preservation important
- Reporting must distinguish app context

---

### 13. AUDIT_LOG (Not in Repo - User Context)

**Purpose**: System change tracking
**Current Schema**: Unknown (assumed: user_id, table_name, action, old_value, new_value, timestamp)
**Multi-App Ready**: VERIFY

#### Analysis
- **Audit integrity**: Must track which app change occurred in
- **Compliance**: Audit logs must be accurate and complete

#### Required Amendments
```sql
ALTER TABLE audit_log ADD COLUMN app_uuid UUID REFERENCES site_settings(app_uuid);
CREATE INDEX idx_audit_log_app_uuid ON audit_log(app_uuid);
CREATE INDEX idx_audit_log_table_app ON audit_log(table_name, app_uuid);

-- Allow NULL (system-level changes have no app context)
```

#### Risk Level: LOW
- Audit system (should not break)
- NULL = system-level change
- UUID = app-specific change

---

## Migration Strategy

### Phase 1: Non-Breaking Field Additions
1. Add `app_uuid` columns to all tables (nullable)
2. Add `site_code`, `domain_code` to site_settings
3. Add external API fields to functions_registry
4. Create indexes

**Risk**: NONE (backward compatible)

### Phase 2: Data Backfill
1. Assign existing data to VC_STUDIO app
2. Verify data integrity
3. Test queries with new fields

**Risk**: LOW (data preservation, verify backfill)

### Phase 3: Constraint Updates
1. Make `app_uuid` NOT NULL where required
2. Update unique constraints (page_settings, blog_posts)
3. Create composite indexes

**Risk**: MEDIUM (structural changes, test thoroughly)

### Phase 4: Application Code Updates
1. Update queries to include app context
2. Add app_uuid to all insert statements
3. Test multi-app scenarios

**Risk**: MEDIUM (application changes, requires QA)

### Phase 5: RLS Policy Updates
1. Update RLS policies to enforce app isolation
2. Test security boundaries
3. Verify users can only access their app's data

**Risk**: HIGH (security critical, test extensively)

---

## Verification Checklist

### Pre-Migration
- [ ] Backup database
- [ ] Document current row counts per table
- [ ] Export critical data (enquiries, blog_posts)
- [ ] Test rollback procedure

### Post-Migration Phase 1
- [ ] Verify all columns added successfully
- [ ] Check indexes created
- [ ] Confirm no data loss (row counts match)
- [ ] Test existing queries still work

### Post-Migration Phase 2
- [ ] Verify backfill completed (no NULL app_uuids where required)
- [ ] Check data assigned to correct apps
- [ ] Test app-filtered queries return correct results
- [ ] Verify relationships/audit_log handle NULL appropriately

### Post-Migration Phase 3
- [ ] Verify constraints in place
- [ ] Test unique constraints (try creating duplicate slugs per app)
- [ ] Check FK integrity
- [ ] Verify indexes used in query plans

### Post-Migration Phase 4
- [ ] Test application queries with app context
- [ ] Verify UI filters by app correctly
- [ ] Check API endpoints return app-specific data
- [ ] Test multi-app user experience

### Post-Migration Phase 5
- [ ] Verify RLS policies enforce app isolation
- [ ] Test cross-app security boundaries
- [ ] Audit user access patterns
- [ ] Confirm no data leakage between apps

---

## Recommendations

### Immediate Actions (Phase 1a)
1. **Execute PHASE-1a-Field-Extensions.sql** (non-breaking amendments)
2. **Backfill site_settings** with app metadata (VC_STUDIO = BDA)
3. **Test existing application** to ensure backward compatibility
4. **Document app_uuid** in developer guidelines

### Short-Term Actions (Phase 1b-1d)
1. **Update application code** to pass app context
2. **Migrate queries** to include app_uuid filtering
3. **Create app registry UI** for managing applications
4. **Test multi-app scenarios** with T2G, G2G, OCG data

### Long-Term Actions (Phase 2+)
1. **Implement RLS policies** for true multi-tenancy
2. **Create app-switching UI** for admin users
3. **Build cross-app analytics** dashboard
4. **Document multi-app architecture** for team

### Monitoring & Alerts
1. **Track app_uuid NULL** occurrences (should decrease)
2. **Monitor query performance** after index additions
3. **Alert on cross-app data access** attempts
4. **Audit app isolation** in production

---

## Appendix A: Risk Matrix

| Table | Risk Level | Impact | Effort | Breaking Change |
|-------|------------|--------|--------|-----------------|
| site_settings | LOW | Medium | Low | NO |
| page_settings | MEDIUM | High | Medium | MINOR (constraint) |
| page_images | MEDIUM | Medium | Medium | NO |
| enquiries | HIGH | Critical | Low | NO (but must update code) |
| blog_posts | HIGH | High | Medium | MINOR (constraint) |
| notifications | HIGH | High | Low | NO |
| stakeholders | LOW | Low | None | NO (use relationships) |
| relationships | LOW | Low | Low | NO |
| functions_registry | LOW | Medium | Low | NO |
| workflows | MEDIUM | High | Medium | NO |
| campaigns | MEDIUM | High | Medium | NO |
| interactions | MEDIUM | Medium | Low | NO |
| audit_log | LOW | Low | Low | NO |

---

## Appendix B: SQL Verification Queries

```sql
-- Check all tables have app_uuid
SELECT
  tablename,
  EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name = tablename AND column_name = 'app_uuid'
  ) AS has_app_uuid
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'site_settings', 'page_settings', 'page_images',
    'enquiries', 'blog_posts', 'notifications',
    'workflows', 'campaigns', 'interactions', 'audit_log',
    'functions_registry', 'relationships'
  );

-- Check for NULL app_uuids (should be minimal after backfill)
SELECT
  'site_settings' AS table_name,
  COUNT(*) FILTER (WHERE app_uuid IS NULL) AS null_count,
  COUNT(*) AS total_count
FROM site_settings
UNION ALL
SELECT 'page_settings', COUNT(*) FILTER (WHERE app_uuid IS NULL), COUNT(*) FROM page_settings
UNION ALL
SELECT 'page_images', COUNT(*) FILTER (WHERE app_uuid IS NULL), COUNT(*) FROM page_images
UNION ALL
SELECT 'enquiries', COUNT(*) FILTER (WHERE app_uuid IS NULL), COUNT(*) FROM enquiries
UNION ALL
SELECT 'blog_posts', COUNT(*) FILTER (WHERE app_uuid IS NULL), COUNT(*) FROM blog_posts
UNION ALL
SELECT 'notifications', COUNT(*) FILTER (WHERE app_uuid IS NULL), COUNT(*) FROM notifications;

-- Verify app registry
SELECT
  site_code,
  domain_code,
  site_name,
  is_active_app,
  app_uuid
FROM site_settings
ORDER BY domain_code, site_code;

-- Check indexes exist
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%app_uuid%'
ORDER BY tablename, indexname;
```

---

**End of Audit Report**
**Status**: Ready for Phase 1a Implementation
**Next Step**: Execute PHASE-1a-Field-Extensions.sql
