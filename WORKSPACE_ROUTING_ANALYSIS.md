# Workspace Routing Analysis

## Menu rendering location

**Primary UI pages**
- `src/app/workspace/dashboard/page.tsx`
- `src/app/dashboard/stakeholder/page.tsx`

These pages fetch menu items and render the sidebar, then render the active component in the main panel.

```tsx
// src/app/workspace/dashboard/page.tsx
const ActiveComponentToRender = COMPONENT_MAP[activeComponent];
...
{config.menu_items
  .sort((a, b) => a.position - b.position)
  .map((item) => (
    <button
      key={item.component_id}
      onClick={() => handleMenuClick(item.component_id)}
    >
      <span className="font-medium">{item.label}</span>
    </button>
  ))}
```

```tsx
// src/app/dashboard/stakeholder/page.tsx
const ActiveComponentToRender = COMPONENT_MAP[activeComponent];
...
config.menu_items
  .sort((a, b) => a.position - b.position)
  .map((item) => (
    <button
      key={item.component_id}
      onClick={() => handleMenuClick(item.component_id)}
    >
      <span className="font-medium">{item.label}</span>
    </button>
  ))
```

## Routing logic

**Status: Hardcoded (component map + state), not dynamic routing.**

The dashboard pages do not use `route_path` from the registry and do not navigate via Next.js routes. Instead they set `activeComponent` and look up a React component from a local map.

```tsx
// src/app/workspace/dashboard/page.tsx
const COMPONENT_MAP: Record<string, React.ComponentType<any>> = {
  'file_explorer': FileExplorer,
  'file_uploader': FileUploader,
  'folder_creator': FolderCreator,
  'workflow_tasks': WorkflowTasksWidget,
  'vc_pyramid': VCModelPyramid,
};
```

```tsx
// src/app/dashboard/stakeholder/page.tsx
const COMPONENT_MAP: Record<string, React.ComponentType<any>> = {
  'file_explorer': FileExplorer,
  'file_uploader': FileUploader,
  'folder_creator': FolderCreator,
  'workflow_tasks': WorkflowTasksWidget,
  'vc_pyramid': VCModelPyramid,
  'file_view': FileExplorer,
  'profile_view': FileExplorer,
};
```

## Component resolution

**Status: Hardcoded.**

Component resolution is done locally via `COMPONENT_MAP` in the dashboard pages. There is no dynamic import or registry-backed resolver for workspace menu components.

Related, but separate: widget rendering in `src/components/dashboard/DashboardRenderer.tsx` uses a hardcoded widget map:

```tsx
// src/components/dashboard/DashboardRenderer.tsx
const WIDGET_COMPONENTS: Record<string, React.ComponentType<any>> = {
  ProfileCard,
  RolesRelationshipsWidget,
  WorkflowTasksWidget,
};
```

## Registry integration

**Status: Partial.**

Menu items are enriched from `components_registry` in the API, but the UI ignores `route_path` and only uses `component_id` to select from the hardcoded maps.

```ts
// src/app/api/dashboard/menu-items/route.ts
const { data: componentsData } = await supabase
  .from('components_registry')
  .select('component_code, component_name, icon_name, route_path')
  .in('component_code', componentCodes)
  .eq('app_uuid', stakeholderRoles.app_uuid)
  .eq('is_active', true)
  .is('deleted_at', null);
...
return {
  label: overrideLabel || registryEntry?.component_name || defaultLabel,
  component_id: componentCode,
  component_code: componentCode,
  icon_name: registryEntry?.icon_name || null,
  route_path: registryEntry?.route_path || null,
  position,
  is_default: isDefault
};
```

There is also an endpoint to fetch a single registry entry:
`src/app/api/components/[component_code]/route.ts`

## What needs to be fixed (if any)

- **If routing should be dynamic**: The sidebar should navigate to `route_path` (from `components_registry`) instead of only setting `activeComponent`, or the component resolution should be driven by a registry-backed resolver (with fallback to the local map).
- **If component mapping should be registry-driven**: Introduce a centralized resolver (e.g., `src/lib/componentMap.ts`) that keys off `component_code` from the registry and can be reused in both dashboard pages.
- **If the component registry is the source of truth**: The UI needs to use `route_path` for navigation or load components based on registry metadata rather than hardcoded maps.
