# File System Database Schema Documentation

## Overview

The file system functionality in VC Studio BDA Production uses a hierarchical structure stored in the database. Files and folders are represented as "nodes" in a tree structure, with support for file storage in Supabase Storage.

## Core Tables

### 1. `nodes` Table

The primary table for the file system. Stores files, folders, and component references in a hierarchical structure.

#### Schema Definition

```sql
CREATE TABLE nodes (
    -- Primary Key
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Information
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('file', 'folder', 'component')),
    reference text UNIQUE DEFAULT ('NODE-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8)),
    
    -- Hierarchy
    parent_id uuid REFERENCES nodes(id) ON DELETE CASCADE,
    
    -- Ownership & Multi-tenancy
    owner_id uuid NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
    app_uuid uuid REFERENCES applications(uuid),
    
    -- File-specific fields (for type='file')
    file_storage_path text,  -- Path in Supabase Storage bucket 'workspace-files'
    size_bytes integer,
    mime_type text,
    
    -- Component-specific fields (for type='component')
    component_id uuid REFERENCES components_registry(id) ON DELETE SET NULL,
    component_config jsonb DEFAULT '{}',
    component_state jsonb DEFAULT '{}',
    
    -- Metadata
    description text,
    tags text[] DEFAULT '{}',
    is_shared boolean DEFAULT false,
    
    -- Workflow Integration
    associated_workflow_id uuid,
    activity_code text,
    
    -- Audit
    created_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Constraints
    CONSTRAINT unique_name_in_folder UNIQUE(parent_id, name, owner_id),
    CONSTRAINT nodes_file_storage_path_check CHECK (
        (type = 'file' AND file_storage_path IS NOT NULL) OR (type != 'file')
    ),
    CONSTRAINT nodes_component_id_check CHECK (
        (type = 'component' AND component_id IS NOT NULL) OR (type != 'component')
    )
);
```

#### Key Columns Explained

- **`id`**: Unique identifier for each node
- **`name`**: Display name of the file/folder/component
- **`type`**: One of `'file'`, `'folder'`, or `'component'`
- **`parent_id`**: References another node to create folder hierarchy (NULL for root level)
- **`owner_id`**: Links to `stakeholders` table - files belong to stakeholders, not directly to workspaces
- **`app_uuid`**: Links to `applications` table for multi-app support
- **`file_storage_path`**: For files, this is the path in Supabase Storage bucket `'workspace-files'`
- **`size_bytes`**: File size in bytes (only for type='file')
- **`mime_type`**: MIME type like 'application/pdf', 'image/png' (only for type='file')
- **`component_id`**: For component nodes, references `components_registry` table
- **`is_shared`**: Whether the node is shared with other users
- **`tags`**: Array of tags for categorization

#### Indexes

```sql
CREATE INDEX idx_nodes_owner ON nodes(owner_id);
CREATE INDEX idx_nodes_parent ON nodes(parent_id);
CREATE INDEX idx_nodes_app ON nodes(app_uuid);
CREATE INDEX idx_nodes_component_id ON nodes(component_id);
CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_nodes_created_at ON nodes(created_at DESC);
CREATE INDEX idx_nodes_workflow ON nodes(associated_workflow_id);
```

#### Row Level Security (RLS)

- **SELECT**: Users can see nodes they own OR nodes that are shared (`is_shared = true`)
- **INSERT**: Users can only create nodes they own, and must use their app_uuid
- **UPDATE**: Users can only update nodes they own
- **DELETE**: Users can only delete nodes they own

### 2. `node_shares` Table

Manages sharing of nodes between stakeholders.

```sql
CREATE TABLE node_shares (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id uuid NOT NULL REFERENCES nodes(id),
    shared_with_stakeholder_id uuid NOT NULL REFERENCES stakeholders(id),
    permission text NOT NULL CHECK (permission IN ('view', 'edit', 'admin')),
    shared_by uuid NOT NULL REFERENCES stakeholders(id),
    shared_at timestamptz DEFAULT now()
);
```

### 3. Supporting Tables

#### `stakeholders` Table
- **Purpose**: File ownership is tied to stakeholders, not directly to workspaces
- **Key Field**: `id` (referenced by `nodes.owner_id`)
- **Relationship**: Each stakeholder can own multiple nodes

#### `workspaces` Table
- **Purpose**: Workspaces are organizational containers
- **Key Fields**: `id`, `owner_stakeholder_id`, `app_uuid`
- **Note**: Files are filtered by workspace indirectly through stakeholder ownership and app context

#### `applications` Table
- **Purpose**: Multi-app support (BDA, ADA, PDA)
- **Key Field**: `uuid` (referenced by `nodes.app_uuid`)
- **Relationship**: Nodes are scoped to applications for multi-tenancy

#### `components_registry` Table
- **Purpose**: Registry of available components
- **Key Field**: `id` (referenced by `nodes.component_id` for type='component')
- **Relationship**: Component nodes reference registered components

## File Storage

### Supabase Storage Bucket

Files are stored in Supabase Storage, not directly in the database:

- **Bucket Name**: `workspace-files`
- **Storage Path Format**: `{stakeholder.reference}/files/{timestamp}-{filename}`
- **Example**: `STK-20250115-abc12345/files/1705123456789-document.pdf`

The `nodes.file_storage_path` column stores the path within this bucket.

## API Endpoints

### `/api/nodes` (GET)
- Lists nodes for the current stakeholder
- Filters by `parent_id` (null for root level)
- Returns nodes ordered by type (folders first) then name

### `/api/nodes` (POST)
- Creates a new node (file/folder/component)
- Requires: `name`, `type`
- For files: requires `file_storage_path`, optional `size_bytes`, `mime_type`
- For components: requires `component_id`
- Automatically sets `owner_id` from authenticated stakeholder

### `/api/nodes/[parent_id]` (GET)
- Gets children of a specific folder
- Used by FileExplorer component for navigation

## Component Integration

### FileExplorer Component
- **Location**: `src/components/workspace/FileExplorer.tsx`
- **Uses**: `nodes` table via `/api/nodes` endpoints
- **Context**: `FileSystemContext` for navigation state

### FileUploader Component
- **Location**: `src/components/workspace/FileUploader.tsx`
- **Process**:
  1. Uploads file to Supabase Storage bucket `workspace-files`
  2. Creates node record in `nodes` table with `file_storage_path`
  3. Links to current stakeholder via `owner_id`

### FileSystemContext
- **Location**: `src/contexts/FileSystemContext.tsx`
- **Purpose**: Manages navigation state (current path, parent folder)
- **State**: Tracks breadcrumb navigation through folder hierarchy

## Workspace Integration

While nodes don't have a direct `workspace_id` column, they can be filtered by workspace through:

1. **Stakeholder Ownership**: Nodes belong to stakeholders, and stakeholders can belong to workspaces
2. **App Context**: Nodes have `app_uuid` which links to applications
3. **Workspace Access**: The FileExplorer component can filter nodes by workspace context

The `FileExplorer` component accepts a `workspace_id` query parameter, but the actual filtering happens at the application level through stakeholder ownership and app_uuid.

## Data Flow

### Creating a File

1. User uploads file via `FileUploader` component
2. File is uploaded to Supabase Storage: `workspace-files/{stakeholder.reference}/files/{timestamp}-{filename}`
3. Node record created in `nodes` table:
   - `type = 'file'`
   - `file_storage_path` = storage path
   - `owner_id` = current stakeholder's ID
   - `parent_id` = current folder (or null for root)
   - `size_bytes`, `mime_type` from file metadata

### Creating a Folder

1. User creates folder via `FolderCreator` component
2. Node record created in `nodes` table:
   - `type = 'folder'`
   - `parent_id` = current folder (or null for root)
   - `owner_id` = current stakeholder's ID

### Navigating Folders

1. User clicks folder in `FileExplorer`
2. `FileSystemContext` updates `currentParentId`
3. New API call: `GET /api/nodes?parent_id={folderId}`
4. Returns children nodes (files and subfolders)

## Relationships Diagram

```
applications (app_uuid)
    ↓
nodes (app_uuid)
    ↓
stakeholders (owner_id)
    ↓
workspaces (owner_stakeholder_id)

nodes (parent_id) → nodes (id)  [self-referential for folder hierarchy]
nodes (component_id) → components_registry (id)  [for component nodes]
```

## Important Notes

1. **Ownership Model**: Files belong to **stakeholders**, not directly to workspaces. This allows stakeholders to access their files across different workspaces.

2. **Multi-App Support**: The `app_uuid` column ensures nodes are scoped to specific applications (BDA, ADA, PDA).

3. **Storage Separation**: Actual file content is stored in Supabase Storage, while metadata (name, size, path, etc.) is in the `nodes` table.

4. **Hierarchy**: The `parent_id` self-referential relationship creates the folder tree structure.

5. **Sharing**: Nodes can be shared via the `is_shared` flag and `node_shares` table for granular permissions.

6. **Component Integration**: Nodes can represent UI components (type='component') that reference the `components_registry` table.

## Migration History

Key migrations that created/modified the nodes table:
- `20251108_create_nodes_table.sql` - Initial creation
- `20251109150000_phase1c_components_registry.sql` - Added component support, metadata fields
- `20251111_fix_nodes_rls_stakeholder_owned.sql` - Fixed RLS policies for stakeholder ownership
- `10-1d-1-Migration-Script.sql` - Added app_uuid support for multi-tenancy












