# Phase 1c Specification: Component Registry & File System Architecture
## Building the Configurable Desktop with Dynamic Widget Loading

**Status:** Implementation Ready  
**Phase:** 1c (VC Components & File System)  
**Duration:** 4-5 weeks  
**Prerequisites:** Phase 1a (database), Phase 1b (stakeholders operational)  
**Dependency:** Multi-tenancy migration (app_uuid) must be completed first

---

## Executive Summary

Phase 1c operationalizes the dashboard as a configurable, data-driven UI system. Instead of hard-coded components, we build:

1. **Component Registry** — Database table defining all available widgets/functionality
2. **Nodes as Component Instances** — File system hierarchy + component configuration storage
3. **Dynamic Dashboard Renderer** — Loads menu items from core_config JSON, renders components via registry lookup
4. **File System Components** — File Explorer, Upload, Folder Creator as first-class registry entries

Result: **Add/remove/configure dashboard functionality by editing JSON and database entries—no code changes needed.**

---

## 1. Database Architecture

### 1.1 Components Registry Table

Defines all available components/widgets in the system.

```sql
CREATE TABLE components_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Component Identity
    component_code TEXT UNIQUE NOT NULL,  -- e.g., 'file_explorer', 'workflow_tasks', 'vc_pyramid'
    component_name TEXT NOT NULL,          -- Display name: 'File Explorer'
    description TEXT,                      -- What this component does
    
    -- UI & Navigation
    icon_name TEXT,                        -- 'folder', 'upload', 'layers', etc. (lucide-react icon)
    route_path TEXT,                       -- e.g., '/workspace/files', '/workspace/workflows'
    widget_component_name TEXT NOT NULL,   -- React component name: 'FileExplorer', 'WorkflowTasks'
    
    -- Access Control
    required_permissions TEXT[] DEFAULT '{}',  -- e.g., ['READ_FILES', 'WRITE_FILES']
    required_role_codes TEXT[] DEFAULT '{}',   -- e.g., ['admin', 'producer']
    min_proficiency_level TEXT DEFAULT 'awareness', -- Capability requirement
    
    -- Functional Configuration
    supports_params BOOLEAN DEFAULT true,       -- Can accept dynamic parameters
    default_params JSONB DEFAULT '{}',          -- Default configuration
    parameters_schema JSONB DEFAULT '{}',       -- JSON Schema for validation
    
    -- File System Integration
    creates_nodes BOOLEAN DEFAULT false,        -- If true, component creates file system nodes
    node_type_created TEXT,                     -- 'file' or 'folder' (if creates_nodes=true)
    
    -- UI Behaviour
    launch_in_modal BOOLEAN DEFAULT false,      -- Opens in modal vs. main workspace
    launch_in_sidebar BOOLEAN DEFAULT false,    -- Opens in sidebar panel
    supports_full_screen BOOLEAN DEFAULT true,  -- Can expand to full screen
    
    -- State & Data Fetching
    data_fetch_query TEXT,  -- SQL or API endpoint for initial data load
    realtime_updates BOOLEAN DEFAULT false,     -- WebSocket/subscription for live updates
    
    -- Monitoring & Governance
    is_active BOOLEAN DEFAULT true,
    is_beta BOOLEAN DEFAULT false,
    version TEXT DEFAULT '1.0',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    app_uuid UUID NOT NULL REFERENCES site_settings(id)  -- Multi-tenancy
);

-- Indexes
CREATE INDEX idx_components_registry_code ON components_registry(component_code);
CREATE INDEX idx_components_registry_active ON components_registry(is_active);
CREATE INDEX idx_components_registry_app ON components_registry(app_uuid);

-- RLS: Authenticated users can see active components for their app
ALTER TABLE components_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "components_registry_select" ON components_registry
    FOR SELECT USING (
        is_active = true 
        AND app_uuid IN (
            SELECT app_uuid FROM stakeholders 
            WHERE auth_user_id = auth.uid()
        )
    );
```

---

### 1.2 Nodes Table Extension

Extend existing nodes table to support component instances + file system.

```sql
-- If nodes table doesn't exist yet, create it:
CREATE TABLE nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- File System Identity
    reference TEXT UNIQUE NOT NULL DEFAULT ('NODE-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(uuid_generate_v4()::text, 1, 8)),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('file', 'folder', 'component')),  -- Added 'component' type
    
    -- Hierarchy
    parent_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
    
    -- File Content (for type='file')
    file_storage_path TEXT,  -- Supabase Storage path (e.g., 'stk-123/documents/report.pdf')
    size_bytes INTEGER,
    mime_type TEXT,
    
    -- Component Instance (for type='component')
    component_id UUID REFERENCES components_registry(id) ON DELETE SET NULL,
    component_config JSONB DEFAULT '{}',  -- Instance-specific parameters
    component_state JSONB DEFAULT '{}',   -- Runtime state (last opened, last position, etc.)
    
    -- File System Metadata
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    is_shared BOOLEAN DEFAULT false,
    
    -- Workflow Integration
    associated_workflow_id UUID,  -- If this node is part of a workflow instance
    activity_code TEXT,           -- Which VCEF activity created/uses this node
    
    -- Timestamps
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Multi-tenancy
    app_uuid UUID NOT NULL REFERENCES site_settings(id),
    
    -- Constraints
    UNIQUE(parent_id, name, owner_id),  -- Prevent duplicate names in same folder
    CHECK (
        -- If type='file', file_storage_path must be set
        (type = 'file' AND file_storage_path IS NOT NULL)
        OR (type != 'file')
    ),
    CHECK (
        -- If type='component', component_id must be set
        (type = 'component' AND component_id IS NOT NULL)
        OR (type != 'component')
    )
);

-- Indexes
CREATE INDEX idx_nodes_parent_id ON nodes(parent_id);
CREATE INDEX idx_nodes_owner_id ON nodes(owner_id);
CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_nodes_component_id ON nodes(component_id);
CREATE INDEX idx_nodes_app_uuid ON nodes(app_uuid);
CREATE INDEX idx_nodes_created_at ON nodes(created_at DESC);

-- RLS: Users see only their nodes (or shared nodes)
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nodes_owner_access" ON nodes
    FOR SELECT USING (
        owner_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
        OR is_shared = true
    );

CREATE POLICY "nodes_owner_insert" ON nodes
    FOR INSERT WITH CHECK (
        owner_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
        AND app_uuid IN (
            SELECT app_uuid FROM stakeholders WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "nodes_owner_update" ON nodes
    FOR UPDATE USING (
        owner_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    ) WITH CHECK (
        owner_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    );

CREATE POLICY "nodes_owner_delete" ON nodes
    FOR DELETE USING (
        owner_id = (SELECT id FROM stakeholders WHERE auth_user_id = auth.uid())
    );
```

---

## 2. Core Configuration (core_config) JSON Structure

The `stakeholders.core_config` JSON defines the dashboard layout per role.

### 2.1 Schema

```json
{
  "__meta": {
    "version": "1.0",
    "created_at": "2025-11-09T10:00:00Z",
    "stakeholder_id": "stk-jane-001",
    "roles": ["producer", "investor"],
    "app_uuid": "bda-app-uuid-123"
  },

  "function_registry": [
    {
      "id": "file_explorer",
      "label": "Files",
      "icon": "folder",
      "component_code": "file_explorer",
      "access_key": "READ_FILES_BASIC"
    },
    {
      "id": "workflow_tasks",
      "label": "My Tasks",
      "icon": "check-circle",
      "component_code": "workflow_tasks",
      "access_key": "READ_WORKFLOWS"
    },
    {
      "id": "vc_pyramid",
      "label": "VC Model",
      "icon": "layers",
      "component_code": "vc_pyramid",
      "access_key": "READ_VC_MODEL"
    },
    {
      "id": "upload_file",
      "label": "Upload",
      "icon": "upload",
      "component_code": "file_uploader",
      "access_key": "WRITE_FILES"
    },
    {
      "id": "create_folder",
      "label": "New Folder",
      "icon": "folder-plus",
      "component_code": "folder_creator",
      "access_key": "WRITE_FILES"
    }
  ],

  "role_configurations": {
    "producer": {
      "dashboard_name": "Producer Dashboard",
      
      "menu_items": [
        {
          "label": "Files",
          "component_id": "file_explorer",
          "position": 1,
          "is_default": true
        },
        {
          "label": "My Tasks",
          "component_id": "workflow_tasks",
          "position": 2
        },
        {
          "label": "VC Model",
          "component_id": "vc_pyramid",
          "position": 3
        },
        {
          "label": "Upload",
          "component_id": "upload_file",
          "position": 4
        }
      ],

      "workspace_layout": {
        "sidebar_width": "250px",
        "theme": "light",
        "show_notifications": true,
        "default_component": "file_explorer"
      },

      "widgets": [
        {
          "id": "quick_stats",
          "component_code": "quick_stats_card",
          "position": "header",
          "params": {
            "show_file_count": true,
            "show_workflow_count": true
          }
        },
        {
          "id": "recent_activity",
          "component_code": "activity_timeline",
          "position": "footer",
          "params": {
            "limit": 5
          }
        }
      ]
    },

    "admin": {
      "dashboard_name": "Admin Dashboard",

      "menu_items": [
        {
          "label": "Users",
          "component_id": "admin_users",
          "position": 1
        },
        {
          "label": "Files",
          "component_id": "file_explorer",
          "position": 2
        },
        {
          "label": "Audit Logs",
          "component_id": "audit_logs",
          "position": 3
        },
        {
          "label": "Components",
          "component_id": "admin_components",
          "position": 4
        }
      ],

      "workspace_layout": {
        "sidebar_width": "280px",
        "theme": "dark",
        "show_notifications": true
      }
    }
  }
}
```

---

## 3. File System Components Breakdown

### 3.1 Component Registry Entries (Seed Data)

```sql
-- File Explorer Component
INSERT INTO components_registry (
    component_code, component_name, description, icon_name, route_path,
    widget_component_name, required_permissions, required_role_codes,
    supports_params, default_params, creates_nodes, is_active, app_uuid
) VALUES (
    'file_explorer',
    'File Explorer',
    'Browse and manage files and folders',
    'folder',
    '/workspace/files',
    'FileExplorer',
    '{"READ_FILES"}',
    '{}',
    true,
    '{"show_thumbnails": true, "sort_by": "name"}',
    false,
    true,
    'bda-app-uuid'
);

-- File Uploader Component
INSERT INTO components_registry (
    component_code, component_name, description, icon_name, route_path,
    widget_component_name, required_permissions, required_role_codes,
    supports_params, default_params, creates_nodes, node_type_created,
    launch_in_modal, is_active, app_uuid
) VALUES (
    'file_uploader',
    'Upload Files',
    'Upload files to workspace',
    'upload',
    '/workspace/upload',
    'FileUploader',
    '{"WRITE_FILES"}',
    '{}',
    true,
    '{"max_file_size_mb": 100, "allowed_types": ["pdf", "docx", "xlsx", "jpg", "png"]}',
    true,
    'file',
    true,
    true,
    'bda-app-uuid'
);

-- Folder Creator Component
INSERT INTO components_registry (
    component_code, component_name, description, icon_name, route_path,
    widget_component_name, required_permissions, required_role_codes,
    supports_params, creates_nodes, node_type_created,
    launch_in_modal, is_active, app_uuid
) VALUES (
    'folder_creator',
    'Create Folder',
    'Create new folders in workspace',
    'folder-plus',
    '/workspace/create-folder',
    'FolderCreator',
    '{"WRITE_FILES"}',
    '{}',
    true,
    true,
    'folder',
    true,
    true,
    'bda-app-uuid'
);

-- Workflow Tasks Component
INSERT INTO components_registry (
    component_code, component_name, description, icon_name, route_path,
    widget_component_name, required_permissions, required_role_codes,
    supports_params, default_params, realtime_updates, is_active, app_uuid
) VALUES (
    'workflow_tasks',
    'My Tasks',
    'View and manage workflow tasks',
    'check-circle',
    '/workspace/workflows',
    'WorkflowTasksWidget',
    '{"READ_WORKFLOWS"}',
    '{}',
    true,
    '{"show_completed": false, "group_by": "due_date"}',
    true,
    true,
    'bda-app-uuid'
);

-- VC Model Pyramid Component
INSERT INTO components_registry (
    component_code, component_name, description, icon_name, route_path,
    widget_component_name, required_permissions, required_role_codes,
    supports_params, default_params, is_active, app_uuid
) VALUES (
    'vc_pyramid',
    'VC Model',
    'Interactive VC model pyramid (FLM/AGM)',
    'layers',
    '/workspace/vc-model',
    'VCModelPyramid',
    '{"READ_VC_MODEL"}',
    '{}',
    true,
    '{"show_transitions": true, "editable": true}',
    true,
    'bda-app-uuid'
);
```

---

## 4. Dashboard Rendering Logic

### 4.1 Next.js Component Loader (Pseudocode)

```typescript
// /app/workspace/dashboard/page.tsx

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

// Dynamic component imports
import FileExplorer from '@/components/workspace/FileExplorer';
import FileUploader from '@/components/workspace/FileUploader';
import FolderCreator from '@/components/workspace/FolderCreator';
import WorkflowTasksWidget from '@/components/workspace/WorkflowTasksWidget';
import VCModelPyramid from '@/components/workspace/VCModelPyramid';

const COMPONENT_MAP = {
  'file_explorer': FileExplorer,
  'file_uploader': FileUploader,
  'folder_creator': FolderCreator,
  'workflow_tasks': WorkflowTasksWidget,
  'vc_pyramid': VCModelPyramid,
};

export default function DashboardPage() {
  const { stakeholder } = useAuth();
  const [coreConfig, setCoreConfig] = useState(null);
  const [activeComponent, setActiveComponent] = useState(null);
  const [componentParams, setComponentParams] = useState({});

  useEffect(() => {
    if (!stakeholder) return;

    // Fetch core_config from stakeholders table
    const fetchDashboardConfig = async () => {
      const { data, error } = await supabase
        .from('stakeholders')
        .select('core_config')
        .eq('id', stakeholder.id)
        .single();

      if (!error && data) {
        setCoreConfig(data.core_config);
        // Set default component from config
        const defaultComponent = data.core_config.role_configurations[stakeholder.role]
          ?.menu_items.find(item => item.is_default)?.component_id;
        setActiveComponent(defaultComponent || 'file_explorer');
      }
    };

    fetchDashboardConfig();
  }, [stakeholder]);

  const handleMenuItemClick = (componentId) => {
    setActiveComponent(componentId);
  };

  if (!coreConfig) return <div>Loading...</div>;

  const menuItems = coreConfig.role_configurations[stakeholder.role]?.menu_items || [];
  const ComponentToRender = COMPONENT_MAP[activeComponent];

  return (
    <div className="flex h-screen">
      {/* Sidebar: Menu Items */}
      <aside className="w-64 bg-gray-100 p-4">
        <h2 className="font-bold mb-4">Menu</h2>
        <nav>
          {menuItems.map(item => (
            <button
              key={item.component_id}
              onClick={() => handleMenuItemClick(item.component_id)}
              className={`w-full text-left p-2 rounded mb-2 ${
                activeComponent === item.component_id ? 'bg-blue-500 text-white' : 'bg-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Workspace: Active Component */}
      <main className="flex-1 p-6">
        {ComponentToRender ? (
          <ComponentToRender params={componentParams} />
        ) : (
          <div>Component not found</div>
        )}
      </main>
    </div>
  );
}
```

### 4.2 Component Lookup Flow

```
User clicks menu item "Files"
    ↓
handleMenuItemClick('file_explorer')
    ↓
setActiveComponent('file_explorer')
    ↓
COMPONENT_MAP['file_explorer'] → FileExplorer component
    ↓
<FileExplorer params={componentParams} /> renders in <main>
```

---

## 5. File System Operations

### 5.1 Create File (Upload)

```sql
-- When file uploaded via FileUploader component:

INSERT INTO nodes (
    name, type, parent_id, owner_id, file_storage_path, size_bytes,
    component_id, mime_type, created_by, app_uuid
) VALUES (
    'report.pdf',
    'file',
    'node-folder-123',  -- parent folder
    'stk-jane-001',     -- owner
    'stk-jane-001/documents/report.pdf',  -- Storage path
    1024000,
    NULL,  -- file doesn't have a component_id
    'application/pdf',
    'user-uuid-123',
    'bda-app-uuid'
);
```

### 5.2 Create Folder

```sql
INSERT INTO nodes (
    name, type, parent_id, owner_id, created_by, app_uuid
) VALUES (
    'My Projects',
    'folder',
    'node-root-123',  -- parent (root workspace)
    'stk-jane-001',
    'user-uuid-123',
    'bda-app-uuid'
);
```

### 5.3 Create Component Instance (Dashboard Menu Item)

```sql
-- When admin adds "VC Pyramid" widget to producer dashboard:

INSERT INTO nodes (
    name, type, parent_id, owner_id, component_id, component_config,
    created_by, app_uuid
) VALUES (
    'VC Pyramid Widget',
    'component',
    NULL,  -- Components don't sit in folder hierarchy
    'stk-jane-001',
    (SELECT id FROM components_registry WHERE component_code = 'vc_pyramid'),
    '{"show_transitions": true, "editable": false}',
    'user-admin-456',
    'bda-app-uuid'
);
```

---

## 6. API Routes (Next.js)

### 6.1 Fetch Menu Items

```typescript
// /app/api/dashboard/menu-items/route.ts

export async function GET(req: Request) {
  const stakeholder = await getCurrentStakeholder();
  
  const { data: stakeholderData, error } = await supabase
    .from('stakeholders')
    .select('core_config')
    .eq('id', stakeholder.id)
    .single();

  const menuItems = stakeholderData.core_config
    .role_configurations[stakeholder.role]
    .menu_items;

  return Response.json(menuItems);
}
```

### 6.2 Fetch Component Config

```typescript
// /app/api/components/[component_code]/route.ts

export async function GET(req: Request, { params }) {
  const { data, error } = await supabase
    .from('components_registry')
    .select('*')
    .eq('component_code', params.component_code)
    .single();

  return Response.json(data);
}
```

### 6.3 Create Node (File/Folder/Component)

```typescript
// /app/api/nodes/route.ts

export async function POST(req: Request) {
  const body = await req.json();
  const stakeholder = await getCurrentStakeholder();

  const { data, error } = await supabase
    .from('nodes')
    .insert([
      {
        name: body.name,
        type: body.type,  // 'file', 'folder', or 'component'
        parent_id: body.parent_id,
        owner_id: stakeholder.id,
        component_id: body.component_id || null,
        component_config: body.component_config || {},
        file_storage_path: body.file_storage_path || null,
        app_uuid: stakeholder.app_uuid,
        created_by: stakeholder.auth_user_id,
      }
    ])
    .select();

  return Response.json(data);
}
```

---

## 7. Testing Scenarios

### 7.1 Multi-Device Dashboard Rendering

```
Scenario: Producer logs in from mobile
  ✓ core_config loads with 'producer' role config
  ✓ Menu items render in responsive sidebar
  ✓ FileExplorer component displays in mobile layout
  ✓ FileUploader modal opens on mobile (touch-friendly)
  
Scenario: Same producer on desktop
  ✓ Same dashboard, responsive layout adjusts
  ✓ All 4 menu items visible
  ✓ Sidebar doesn't collapse
```

### 7.2 Add Component to Dashboard

```
Scenario: Admin adds "VC Pyramid" to producer role
  1. Admin creates node with type='component'
  2. core_config updated with new menu_item
  3. Producer logs in → sees "VC Model" in menu
  4. Clicks → VCModelPyramid component loads
```

### 7.3 Permission Enforcement

```
Scenario: Producer tries to access admin-only component
  1. core_config doesn't include component in producer menu_items
  2. If URL accessed directly, RLS policy blocks node access
  3. FileExplorer component checks permission before rendering
```

---

## 8. Implementation Checklist

- [ ] Create `components_registry` table with RLS
- [ ] Extend `nodes` table with component fields (component_id, component_config)
- [ ] Seed 5 file system components (file_explorer, uploader, folder_creator, workflow_tasks, vc_pyramid)
- [ ] Create API routes: menu-items, components/[code], nodes CRUD
- [ ] Build DashboardPage component with dynamic loader
- [ ] Build FileExplorer component
- [ ] Build FileUploader component (with Supabase Storage integration)
- [ ] Build FolderCreator component
- [ ] Test multi-device rendering
- [ ] Test permission enforcement
- [ ] Update provision_stakeholder_v2() to create default workspace node
- [ ] Test role-switching dashboard updates

---

## 9. Success Criteria

✓ Dashboard loads with dynamic menu from core_config  
✓ Menu items are configurable via JSON  
✓ New components added to registry appear in menu automatically  
✓ File upload creates both Storage entry + nodes record  
✓ Folder creation works end-to-end  
✓ Component instances store configuration in component_config  
✓ Permissions enforced via RLS  
✓ Multi-role stakeholders see different dashboards  
✓ All components render in <1 second  

---

## 10. Claude Code Instructions

**Pass this to Claude Code for Phase 1c implementation:**

```
Phase 1c: Component Registry & File System Architecture

PREREQUISITES:
- Multi-tenancy migration (app_uuid) completed
- stakeholders.core_config JSON field exists
- provision_stakeholder_v2() working

STEP 1: Create Database Tables
  File: /supabase/migrations/[TIMESTAMP]_phase1c_components_registry.sql
  
  1a. Create components_registry table with all fields from Section 1.1
  1b. Extend nodes table with component fields (Section 1.2)
  1c. Enable RLS policies on both tables
  1d. Create indexes for performance

STEP 2: Seed Component Data
  File: /supabase/migrations/[TIMESTAMP]_phase1c_seed_components.sql
  
  2a. Insert 5 file system components (from Section 3.1):
      - file_explorer
      - file_uploader
      - folder_creator
      - workflow_tasks
      - vc_pyramid
  2b. For each component, set icon_name, route_path, widget_component_name

STEP 3: Create API Routes
  Location: /app/api/
  
  3a. GET /api/dashboard/menu-items
      Returns menu items from stakeholder.core_config for current role
  
  3b. GET /api/components/[component_code]
      Returns component registry entry + default params
  
  3c. POST /api/nodes
      Creates new node (file/folder/component)
      Input: { name, type, parent_id, component_id, component_config }
  
  3d. GET /api/nodes/[parent_id]
      Returns children of folder (for FileExplorer)

STEP 4: Build Components
  Location: /app/components/workspace/
  
  4a. DashboardPage.tsx
      - Fetch core_config from stakeholders table
      - Render menu sidebar with menu_items
      - Dynamic component loader (COMPONENT_MAP)
      - Handle menu item click to switch active component
  
  4b. FileExplorer.tsx
      - Fetch nodes where type='file' or 'folder'
      - Display as grid/list
      - Show file size, created_at
      - Handle folder click to navigate
      - Show download link for files (signed URL)
  
  4c. FileUploader.tsx
      - Modal form
      - File input with drag-drop
      - Upload to Supabase Storage
      - Create nodes entry
      - Show progress bar
  
  4d. FolderCreator.tsx
      - Modal with text input for folder name
      - POST to /api/nodes with type='folder'
      - Refresh parent folder view

STEP 5: Update provision_stakeholder_v2()
  
  5a. After stakeholder created, create root workspace node:
      INSERT INTO nodes (name, type, owner_id, app_uuid)
      VALUES ('My Workspace', 'folder', v_stakeholder_id, p_app_uuid)
  
  5b. Generate default core_config with menu_items from components_registry
      (All active components with appropriate role access)

STEP 6: Testing
  
  6a. Create test stakeholder via onboarding
  6b. Login → Dashboard loads
  6c. Click File Explorer → FileExplorer component renders
  6d. Click Upload → FileUploader modal opens
  6e. Upload file → appears in file explorer
  6f. Create folder → appears in file explorer
  6g. Switch role → Dashboard menu updates

DO NOT:
- Hard-code any components in JSX
- Make menu_items static
- Skip RLS policy testing
- Deploy without backup of current database

DEPLOY CHECKLIST:
- [ ] All migrations run successfully
- [ ] All API routes tested with Postman/curl
- [ ] Components render without errors
- [ ] File upload creates Storage + nodes entry
- [ ] RLS prevents cross-user access
- [ ] Multi-role stakeholder sees correct dashboard
```

---

**Document prepared by:** Claude (AI Assistant)  
**For:** Ian Peter, ITS Group  
**Project:** vc-bda-production Phase 1c  
**Status:** Ready for Claude Code Implementation

