# Dashboard Nav Responsive Implementation - Report

**Date Completed:** 2026-01-31  
**Status:** ✅ COMPLETED  
**Feature:** Responsive Dashboard Navigation (Ring Menu + Burger) & Config Update Workflow

**Amendment (2026-02-01):** Ring menu updated to match admin style—horizontal tab bar (not floating circular menu). Burger menu moved to top right on mobile.

**Amendment (2026-02-01, part 2):** Top bar layout refined: Dashboard name | Status (from component) | Stakeholder + Logout. Added `DashboardStatusContext` for components to display status. Stakeholder shown in full with label above. Logout link in top bar via `topBarRightSlot`.

---

## Executive Summary

This implementation delivers a responsive dashboard navigation system that replaces the fixed sidebar with a **ring menu** on desktop and a **burger menu** with slide-out drawer on mobile. It also introduces a **standard config update workflow** using a JSON source file and SQL generator, and resolves the **structure mismatch** between the menu-items API and existing seed data.

**Key Achievements:**
- Responsive dashboard nav: horizontal tab bar (ring menu, admin style) on desktop + burger drawer on mobile
- Top bar layout: Dashboard name | Status (component-driven) | Stakeholder + Logout
- Component status: `DashboardStatusContext` allows active components to display status; resets on component change
- Shared `DashboardNavMenu` component used by both dashboard pages
- Config update workflow: edit JSON → generate SQL → apply to DB
- API backward compatibility for both `role_configurations` and top-level `menu_items` structures
- Migration to normalize existing `dashboard_config` rows to canonical structure

---

## Context

### Problem Statement

1. **Poor responsive behaviour:** The dashboard sidebar took up a majority of the screen on mobile devices.
2. **No config update workflow:** `workspace_dashboard_configurations.dashboard_config` was only editable via migrations or admin UI; no standard file for per-row updates.
3. **Structure mismatch:** The menu-items API expected `role_configurations[roleCode]`, but seed data used top-level `menu_items` and `workspace_layout`, causing fallback to default menu items.

### Solution Overview

- **Option A:** Create a shared `DashboardNavMenu` component with ring menu on desktop and burger + slide-out drawer on mobile.
- **Config workflow:** JSON file (`config/dashboard_configurations.json`) + SQL generator script for per-row updates.
- **Mismatch resolution:** API accepts both structures; migration normalizes existing data to `role_configurations`.

---

## Deliverables

### 1. DashboardNavMenu Component

**Location:** `src/components/dashboard/DashboardNavMenu.tsx`

| Feature | Implementation |
|---------|----------------|
| **Desktop – Ring menu** | Horizontal tab bar below header (matches admin menu style). Configurable via `workspace_layout.menu_style: "ring"`. |
| **Desktop – Sidebar** | Traditional sidebar layout. Configurable via `workspace_layout.menu_style: "sidebar"`. |
| **Mobile** | Burger icon on **top right**; tap opens slide-out drawer with full menu. Always burger mode on mobile. |
| **Breakpoint** | `md` (768px) – ring/sidebar above, burger below. |
| **Props** | `menuItems`, `activeComponent`, `onMenuClick`, `dashboardName`, `role`, `workspaceLayout`, optional `headerSlot`, `footerSlot`, `topBarRightSlot`, `stakeholderName`. |

**Top bar layout (ring mode, desktop):**

| Position | Content |
|----------|---------|
| **Left** | Dashboard name |
| **Center** | Status (from active component via `DashboardStatusContext`). Label "Status" above. Nothing shown when component has not set a value. Resets on component change. |
| **Right** | Stakeholder (label "Stakeholder" above in lighter font, full name) + Logout link (`topBarRightSlot`) |

**Config fields in `workspace_layout`:**
- `menu_style`: `"ring"` | `"sidebar"` (default: `"ring"`)
- `menu_style_mobile`: `"burger"` (default)
- `sidebar_width`: Used when `menu_style` is `"sidebar"`

### 2. DashboardStatusContext (Component Status)

**Location:** `src/contexts/DashboardStatusContext.tsx`

Allows active components to display a status value in the top bar center. Status resets when the user switches components.

| Feature | Implementation |
|---------|----------------|
| **Provider** | `DashboardStatusProvider` wraps dashboard content; accepts `activeComponent` prop to reset status on change |
| **Hook** | `useDashboardStatus()` – components call `setStatus(value)` to display; `setStatus(null)` to clear |
| **Optional hook** | `useDashboardStatusOptional()` – for consumers outside provider (e.g. `DashboardNavMenu`) |
| **Display** | Label "Status" above value; nothing shown when component has not set a value |

**Usage in components:**

```tsx
import { useDashboardStatus } from '@/contexts/DashboardStatusContext';

function MyComponent() {
  const { setStatus } = useDashboardStatus();
  
  useEffect(() => {
    setStatus('Editing document X');
    return () => setStatus(null); // Clear on unmount
  }, [documentId]);
}
```

### 3. Dashboard Pages Updated

| Page | Path | Changes |
|------|------|---------|
| **Stakeholder Dashboard** | `src/app/dashboard/stakeholder/page.tsx` | Replaced inline sidebar with `DashboardNavMenu`; added WorkspaceSwitcher; `DashboardStatusProvider` with `activeComponent`; `topBarRightSlot` for Logout in top bar; `footerSlot` for drawer/sidebar. |
| **Workspace Dashboard** | `src/app/workspace/dashboard/page.tsx` | Replaced inline sidebar with `DashboardNavMenu`; `DashboardStatusProvider` with `activeComponent`; simpler footer slot. |

Both pages apply responsive top padding: `pt-14` on mobile (header only), `pt-28` in ring mode on desktop (header + tab bar).

### 4. Config Update Workflow

| Artifact | Location | Purpose |
|----------|----------|---------|
| **Config source** | `config/dashboard_configurations.json` | Source of truth; key = `config_name`, value = full `dashboard_config` JSONB. Uses `role_configurations` structure. |
| **SQL generator** | `scripts/generate-dashboard-config-sql.js` | Reads JSON, outputs `UPDATE` statements per row. |
| **Generated SQL** | `config/dashboard_config_updates.sql` | Output file; run via Supabase SQL editor. |
| **README** | `config/README.md` | Usage instructions. |

**Usage:**
1. Edit `config/dashboard_configurations.json`
2. Run: `node scripts/generate-dashboard-config-sql.js`
3. Execute `config/dashboard_config_updates.sql` in Supabase SQL editor

### 4. API Backward Compatibility

**Location:** `src/app/api/dashboard/menu-items/route.ts`

- If `role_configurations[roleCode]` exists → use it.
- Else if top-level `menu_items` exists → use top-level structure (legacy).
- Ensures existing seed data works without migration.

### 6. Migration – Normalize Role Structure

**Location:** `supabase/migrations/20260131130000_normalize_dashboard_config_role_structure.sql`

- Converts rows with top-level `menu_items` to `role_configurations`.
- Derives role codes from `workspace_templates.applicable_roles` where templates reference the config.
- Fallback mapping by `config_name` for VC Studio Investor, Administrator, Individual.
- Idempotent: skips rows that already have `role_configurations`.

---

## Files Created

| File | Description |
|------|-------------|
| `src/components/dashboard/DashboardNavMenu.tsx` | Shared responsive nav component |
| `src/contexts/DashboardStatusContext.tsx` | Context for component status display; resets on component change |
| `config/dashboard_configurations.json` | Config source for per-row updates |
| `config/dashboard_config_updates.sql` | Generated SQL (output of script) |
| `config/README.md` | Config workflow usage |
| `scripts/generate-dashboard-config-sql.js` | SQL generator script |
| `supabase/migrations/20260131130000_normalize_dashboard_config_role_structure.sql` | Role structure normalization migration |

---

## Files Modified

| File | Changes |
|------|---------|
| `src/app/dashboard/stakeholder/page.tsx` | Use `DashboardNavMenu`; remove inline sidebar; add `DashboardStatusProvider`; add `topBarRightSlot` for Logout |
| `src/app/workspace/dashboard/page.tsx` | Use `DashboardNavMenu`; remove inline sidebar; add `DashboardStatusProvider` |
| `src/app/api/dashboard/menu-items/route.ts` | Add fallback for top-level `menu_items` structure |
| `src/components/dashboard/DashboardNavMenu.tsx` | Top bar layout: Dashboard name \| Status \| Stakeholder + Logout; add `topBarRightSlot`; stakeholder with label; component status from context |

---

## Config Structure Reference

**Canonical structure (role_configurations):**

```json
{
  "role_configurations": {
    "investor": {
      "menu_items": [
        { "label": "Portfolio", "component_id": "vc_pyramid", "position": 1, "is_default": true }
      ],
      "dashboard_name": "Portfolio",
      "workspace_layout": {
        "sidebar_width": "250px",
        "menu_style": "ring",
        "menu_style_mobile": "burger"
      },
      "widgets": []
    }
  }
}
```

**Legacy structure (still supported by API):**

```json
{
  "menu_items": [...],
  "dashboard_name": "...",
  "workspace_layout": {...},
  "widgets": []
}
```

---

## Next Steps

1. **Run migration:** Apply `20260131130000_normalize_dashboard_config_role_structure.sql` via `supabase db push` or manually.
2. **Apply config updates (optional):** Run `config/dashboard_config_updates.sql` in Supabase SQL editor to set `menu_style: "ring"` and `menu_style_mobile: "burger"` on existing configs.
3. **Use sidebar on desktop:** Set `"menu_style": "sidebar"` in `workspace_layout` in the config file.
4. **Add new configs:** Add entries to `config/dashboard_configurations.json`, run the generator, and apply the SQL.
5. **Component status:** Use `useDashboardStatus().setStatus(value)` in workspace components (e.g. FileExplorer, VCModelPyramid) to display context in the top bar center.

---

## Appendix: Component Props

```typescript
interface DashboardNavMenuProps {
  menuItems: DashboardNavMenuItem[];
  activeComponent: string;
  onMenuClick: (componentId: string) => void;
  dashboardName: string;
  role: string;
  workspaceLayout?: {
    sidebar_width?: string;
    theme?: string;
    show_notifications?: boolean;
    default_component?: string;
    menu_style?: 'ring' | 'sidebar';
    menu_style_mobile?: 'burger';
  };
  headerSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
  /** Used in top bar when in ring mode. Falls back to footerSlot if not provided. */
  topBarRightSlot?: React.ReactNode;
  stakeholderName?: string;
}
```

## Appendix: DashboardStatusContext

```typescript
interface DashboardStatusContextType {
  status: string | null;
  setStatus: (value: string | null) => void;
}

function DashboardStatusProvider({ children, activeComponent }: {
  children: React.ReactNode;
  activeComponent?: string;  // Resets status when this changes
});

function useDashboardStatus(): DashboardStatusContextType;
function useDashboardStatusOptional(): DashboardStatusContextType | { status: null; setStatus: () => void };
```
