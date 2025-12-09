# CTA Button Configuration System - Outline Specification

**Document Type:** Outline Specification (For Review)  
**Application:** vc-studio-bda-production  
**Date:** December 2025  
**Status:** Ready for Review & Approval  

---

## 1. Introduction

The CTA Button Configuration System provides a database-driven mechanism for managing call-to-action buttons across the VC Studio platform and beyond. Rather than hardcoding button text, links, and styling into frontend components, this system stores CTA definitions in Supabase, enabling non-technical stakeholders to modify button content, test variations, and track conversion performance without code deployment.

**Core Architecture Principle:** Strict separation between button definition (what the button is) and button placement (where it appears). This enables the same CTA to be embedded across multiple interfaces—homepages, email templates, PDFs, external integrations—all pulling from a single source of truth.

**Core Purpose:** Enable dynamic, database-driven CTA management with multi-interface embedding capability across all VC Studio applications (BDA, PDA, ADA) and beyond.

---

## 2. Features of the Function

### 2.1 Core Features

**Button Definition (What)**
- **Database-Driven Configuration** – CTA definitions stored in Supabase `cta_buttons` table
- **Multi-Tenancy Support** – Each app_uuid maintains isolated CTA sets (BDA, PDA, ADA)
- **Flexible Button Properties** – Support label, href, variant (primary/secondary), icon, analytics tracking
- **Admin Management UI** – Dashboard page for CRUD operations on CTA buttons
- **Reusable Across Interfaces** – Single CTA embedded in web pages, email templates, PDFs, APIs

**Button Placement (Where)**
- **Page Editor Integration** – Page editor manages placement: which CTA appears where on a page
- **Placement-Agnostic Component** – `<CTAButton />` component accepts button_id, renders button definition
- **Multi-Interface Support** – Same placement pattern works in web pages, email renderers, PDF generators
- **No Hardcoded Buttons** – All button references via CTA ID or placement config

### 2.2 Extensibility Points
- Optional `target_audience` field for segment-specific CTAs (future A/B testing)
- Optional `analytics_event` field for conversion tracking integration
- Support for button icon/image assets (Cloudinary integration)
- Email template rendering mode (text-only fallback for email clients)

---

## 3. Benefits

### Business Benefits
- **No-Code Updates** – Marketing team updates button text/links via admin UI without engineering involvement
- **Faster Iteration** – Test CTA variations by updating database, measure performance before committing to code
- **Consistency** – Single source of truth prevents duplicate CTA definitions across codebase, email templates, PDFs
- **Multi-Interface Reuse** – Same button embedded in web pages, emails, PDFs, reducing maintenance burden
- **Scalability** – Same infrastructure supports BDA, PDA, ADA domain applications and future extensions

### Technical Benefits
- **Separation of Concerns** – Button definition (database) strictly separated from placement logic (page/email/PDF renderers)
- **Audit Trail** – All CTA changes tracked (creation, updates, who/when)
- **Multi-Domain Reuse** – CTA component pattern applies across all domains and interfaces
- **Future-Proof** – Foundation for A/B testing, analytics, personalization, and embeddable button widgets

---

## 4. Implementation Details

### 4.1 Database Schema

**Table 1: cta_buttons** (Button Definitions)
```sql
CREATE TABLE cta_buttons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_uuid uuid NOT NULL REFERENCES apps(app_uuid) ON DELETE CASCADE,
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'primary',
  icon_name TEXT,
  analytics_event TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT unique_cta_label UNIQUE(app_uuid, label)
);
```

**Key Fields:**
- `label` – Button text (unique per app_uuid)
- `href` – Button destination URL
- `variant` – Styling variant (primary, secondary)
- `icon_name` – Icon identifier (e.g., 'arrow-right', 'check')
- `analytics_event` – Event name for tracking (e.g., 'hero_signup_clicked')

**Table 2: page_cta_placements** (Placement Configuration in Page Editor)
```sql
CREATE TABLE page_cta_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  cta_button_id uuid NOT NULL REFERENCES cta_buttons(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_placement_per_page UNIQUE(page_id, section, sort_order)
);
```

**Key Fields:**
- `page_id` – Which page this CTA appears on
- `cta_button_id` – Which CTA button to display
- `section` – Where on page (hero, body, footer, sidebar)
- `sort_order` – Display order within section

### 4.2 API Endpoints

**CTA Button Definition Endpoints (Admin)**

**GET `/api/cta-buttons`**
- List all CTA buttons for current app_uuid
- Returns: `{ cta_buttons: CTAButton[] }`

**GET `/api/cta-buttons/[id]`**
- Get single CTA button details
- Returns: `{ cta_button: CTAButton }`

**POST `/api/cta-buttons`**
- Create new CTA button
- Body: `{ label, href, variant, icon_name, analytics_event }`
- Admin-only
- Returns: `{ cta_button: CTAButton }`

**PUT `/api/cta-buttons/[id]`**
- Update CTA button
- Admin-only
- Returns: `{ cta_button: CTAButton }`

**DELETE `/api/cta-buttons/[id]`**
- Delete CTA button
- Admin-only
- Returns: `{ success: boolean }`

**Page Placement Endpoints (Page Editor)**

**GET `/api/pages/[id]/cta-placements`**
- List CTAs assigned to a page
- Returns: `{ placements: PageCTAPlacement[] }`

**POST `/api/pages/[id]/cta-placements`**
- Assign CTA to page section
- Body: `{ cta_button_id, section, sort_order }`
- Returns: `{ placement: PageCTAPlacement }`

**DELETE `/api/pages/[id]/cta-placements/[placement_id]`**
- Remove CTA from page
- Returns: `{ success: boolean }`

### 4.3 Frontend Components

**`<CTAButton />`** component (Reusable, Multi-Interface)
- Props: `id: string` (CTA button ID) OR `button_id: string`
- Optional: `className` for custom styling
- Renders button with label, href, icon from database definition
- Works in web pages, email templates, PDFs (renders as HTML/text/link)
- No placement logic—just renders the button definition

**Page Editor Integration**
- Add "CTA Placements" section to page editor
- Shows list of CTAs assigned to this page with section/sort_order
- Dropdown to select which CTA to add
- Drag-to-reorder functionality
- Delete individual placements
- Page render component queries placements and renders via `<CTAButton id={placement.cta_button_id} />`

**Email Template Integration** (Future)
- Email renderer queries page_cta_placements
- Renders as clickable links (text mode) or button-like links (HTML mode)

**PDF Generator Integration** (Future)
- PDF renderer queries page_cta_placements
- Renders as text links or QR codes

### 4.4 Admin UI

**Page 1: `/dashboard/admin/cta-buttons`** (CTA Button Management)
- Accessible from Content menu as card ("CTA Buttons")
- Table showing all CTA buttons with edit/delete actions
- Form to create new CTA (label, href, variant, icon_name, analytics_event)
- Search/filter by label
- Edit existing CTA inline or via modal

**Page 2: Page Editor Enhancement** (Placement Management)
- Within existing page editor (`/dashboard/pages/editor`), add "CTA Placements" section
- Show all CTAs currently assigned to this page
- Dropdown to select available CTA buttons to add
- Drag-to-reorder CTAs by sort_order
- Delete individual CTA placements
- Preview how page renders with selected CTAs

---

## 5. Instructions to Coding Agent (Claude Code)

### Phase 1: Database & API (Priority 1)

1. **Create Migrations**
   - File: `supabase/migrations/[timestamp]_create_cta_buttons_table.sql`
   - Create `cta_buttons` table with schema above
   - Create `page_cta_placements` table (references both pages and cta_buttons)
   - Add RLS policies: Admin-only access to cta_buttons; page-owner access to placements
   - Create indexes on (app_uuid, is_active) for cta_buttons and (page_id, cta_button_id) for placements

2. **Create API Routes for CTA Definition**
   - `src/app/api/cta-buttons/route.ts` – GET (list), POST (create)
   - `src/app/api/cta-buttons/[id]/route.ts` – GET (fetch), PUT (update), DELETE (delete)
   - Validate: label uniqueness, href format, admin authorization
   - Return standardized error responses

3. **Create API Routes for Page Placements**
   - `src/app/api/pages/[id]/cta-placements/route.ts` – GET (list), POST (assign)
   - `src/app/api/pages/[id]/cta-placements/[placement_id]/route.ts` – DELETE (remove)
   - Validate: page exists, CTA exists, sort_order uniqueness within section
   - Return standardized error responses

4. **Create TypeScript Types**
   - File: `src/lib/types/cta.ts`
   - `CTAButton` interface
   - `PageCTAPlacement` interface
   - `CreateCTAInput` interface
   - `UpdateCTAInput` interface
   - `PlacementInput` interface

### Phase 2: Frontend Components (Priority 2)

5. **Create CTAButton Component**
   - File: `src/components/cta/CTAButton.tsx`
   - Props: `id: string`, optional `className`
   - Fetches button definition from `/api/cta-buttons/[id]` on mount
   - Renders as anchor tag with label, href, icon (if provided)
   - Loading/error states
   - Works with CSS/Tailwind classes

6. **Integrate into Page Editor**
   - File: `src/app/dashboard/pages/editor/page.tsx` (modify existing)
   - Add "CTA Placements" section below existing content editor
   - Component that queries `/api/pages/[id]/cta-placements`
   - Show list of assigned CTAs with section/sort_order
   - Dropdown to add new CTA (queries `/api/cta-buttons`)
   - Drag-to-reorder functionality (optional: use react-dnd or similar)
   - Delete button per placement
   - Preview panel showing page with CTAs rendered

### Phase 3: Admin UI (Priority 3)

7. **Create CTA Button Management Page**
   - File: `src/app/dashboard/admin/cta-buttons/page.tsx`
   - Table listing all CTA buttons (label, href, variant, is_active)
   - Create/Edit/Delete forms (modal or inline)
   - Search by label
   - Edit button triggers modal form with prepopulated data
   - Delete with confirmation

8. **Add to Admin Menu**
   - File: `src/components/admin/AdminMenu.tsx` (modify existing)
   - Add "CTA Buttons" link to navigation

9. **Add to Content Menu (Home Page)**
   - File: `src/app/dashboard/admin/page.tsx` (Content tab)
   - Add card: "CTA Buttons – Manage call-to-action buttons"
   - Card links to `/dashboard/admin/cta-buttons`
   - Follows same design as existing "Pages" and "Blog Posts" cards

### Success Criteria
- ✅ CTA buttons configurable via admin UI (create/edit/delete)
- ✅ Page editor can assign CTAs to specific sections
- ✅ `<CTAButton />` component renders button definition correctly
- ✅ Multiple CTAs can be assigned to same page
- ✅ Sort order respected when rendering multiple CTAs per section
- ✅ Multi-tenancy isolation enforced (app_uuid)
- ✅ CTA can be embedded in any interface via ID reference
- ✅ Admin menu includes CTA management option
- ✅ No hardcoded button definitions remain on homepage

---

## 6. Review Checklist

- [ ] Separation between button definition (cta_buttons) and placement (page_cta_placements) is clear?
- [ ] Architecture supports embedding CTAs in web pages, emails, PDFs?
- [ ] Database schema aligns with existing app_uuid multi-tenancy pattern?
- [ ] API endpoints follow existing naming conventions?
- [ ] Page editor integration is practical and fits existing workflow?
- [ ] CTA card placement on Content menu makes sense?
- [ ] Component design matches current component patterns?
- [ ] Admin UI integrates cleanly with existing dashboard?
- [ ] Ready to proceed to full Claude Code specification document?

---

**Next Step:** Once approved, create `CTA_BUTTON_CONFIG_CLAUDE_CODE_SPEC.md` for agent implementation.
