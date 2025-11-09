# Point 3 Use Case: Onboarding → Workspace → Dashboard

**Purpose:** Define the complete happy-path flow from stakeholder onboarding through to user login and dashboard presentation

**Scope:** Single integrated use case demonstrating all Point 3 components working together

**Outcome:** User logs in and sees a fully functional dashboard with file system, core_config JSON rendering, roles/relationships display, and a simple workflow task

---

## Use Case Flow

### Phase 1: Onboarding Triggers Workspace Creation

**Actor:** Admin completing stakeholder onboarding

**Trigger:** Admin submits onboarding form with:
- Name: "Jane Smith"
- Email: jane@example.com
- Stakeholder Type: Individual
- Roles: ["investor", "service_provider"]
- App: BDA

**System Response:**

1. **Stakeholder Created** (via existing RPC function from Point 2)
   - stakeholder_id: `stk-jane-001`
   - auth_user_id: `auth-uuid-123`
   - core_config: (empty object `{}`)
   - Roles assigned: investor, service_provider

2. **Workspace Initialized**
   - Create root filesystem node:
     ```
     nodes table insert:
     {
       id: "node-jane-root",
       name: "Jane Smith Workspace",
       type: "folder",
       parent_id: null,
       owner_id: "stk-jane-001",
       file_storage_path: null,
       app_uuid: "bda-app-uuid"
     }
     ```

3. **core_config JSON Created and Stored**
   - Generate default dashboard configuration based on stakeholder roles
   - Store in `stakeholders.core_config`:
     ```json
     {
       "__meta": {
         "version": "1.0",
         "created_at": "2025-11-08T10:00:00Z",
         "stakeholder_id": "stk-jane-001",
         "roles": ["investor", "service_provider"]
       },
       "function_registry": [
         {
           "id": "file_view",
           "label": "File Explorer",
           "icon": "folder",
           "access_key": "READ_FILES_BASIC",
           "target_url": "/workspace/files"
         },
         {
           "id": "profile_view",
           "label": "My Profile",
           "icon": "user",
           "access_key": "READ_PROFILE",
           "target_url": "/workspace/profile"
         }
       ],
       "role_configurations": {
         "investor_service_provider": {
           "dashboard_name": "Workspace Dashboard",
           "menu_items": [
             "file_view",
             "profile_view"
           ],
           "widgets": [
             {
               "widget_id": "profile_card",
               "title": "My Profile",
               "component": "ProfileCard",
               "data_source": "stakeholder_metadata",
               "layout": {
                 "lg": "w-1/3",
                 "md": "w-full",
                 "sm": "w-full"
               }
             },
             {
               "widget_id": "roles_relationships",
               "title": "Roles & Relationships",
               "component": "RolesRelationshipsWidget",
               "data_source": "/api/stakeholder/roles-relationships",
               "layout": {
                 "lg": "w-2/3",
                 "md": "w-full",
                 "sm": "w-full"
               }
             },
             {
               "widget_id": "workflow_tasks",
               "title": "Workflow Tasks",
               "component": "WorkflowTasksWidget",
               "data_source": "/api/workflows/active-tasks",
               "layout": {
                 "lg": "w-full",
                 "md": "w-full",
                 "sm": "w-full"
               }
             }
           ]
         }
       }
     }
     ```

4. **Welcome Notification Created**
   - Insert into notifications table:
     ```
     {
       stakeholder_id: "stk-jane-001",
       notification_type: "welcome",
       title: "Welcome to the Workspace",
       message: "Your workspace has been created. Please review your profile and accept the terms.",
       is_read: false,
       created_at: now()
     }
     ```

5. **Simple Accept Workflow Instance Created**
   - Create workflow_instance:
     ```
     {
       id: "workflow-accept-001",
       instance_code: "WELCOME-jane-001",
       stakeholder_id: "stk-jane-001",
       workflow_type: "accept_terms",
       status: "active",
       maturity_gate: "FLM"
     }
     ```
   - Create single activity:
     ```
     {
       id: "activity-accept-001",
       workflow_instance_id: "workflow-accept-001",
       activity_code: "WELCOME-jane-001-001",
       activity_name: "Accept Terms & Conditions",
       status: "pending",
       owner: "client",
       due_date: now() + 7 days
     }
     ```

6. **Audit Logged**
   - Insert into audit_logs:
     ```
     {
       action: "onboarding_complete",
       stakeholder_id: "stk-jane-001",
       performed_by: "admin-id",
       details: {
         workspace_created: "node-jane-root",
         workflow_instance_id: "workflow-accept-001",
         roles_assigned: ["investor", "service_provider"]
       }
     }
     ```

---

### Phase 2: User Logs In and Sees Dashboard

**Actor:** Jane Smith (newly onboarded stakeholder)

**Trigger:** User logs in via Supabase Auth

**System Response:**

1. **Authentication**
   - Supabase auth returns user session
   - auth.uid = "auth-uuid-123"

2. **Fetch Stakeholder Record**
   - Query: `SELECT * FROM stakeholders WHERE auth_user_id = 'auth-uuid-123'`
   - Result: stakeholder_id = "stk-jane-001", core_config = (the JSON from Phase 1, step 3)
   - RLS enforces: User can only see their own stakeholder record

3. **Render Dashboard**
   - Next.js component receives stakeholder object + core_config
   - **Sidebar Menu:**
     - Parse function_registry for items in role_configurations.investor_service_provider.menu_items
     - Render "File Explorer" and "My Profile" links
     - Check access_keys (READ_FILES_BASIC, READ_PROFILE) — user has both
   
   - **Main Content Area - Widgets:**
     - **Widget 1: ProfileCard** (lg: w-1/3)
       - Displays: Name, Email, Stakeholder Type, Roles
       - Data: From stakeholder object directly
     
     - **Widget 2: RolesRelationshipsWidget** (lg: w-2/3)
       - Displays: All assigned roles, any existing relationships
       - Data: Fetches `/api/stakeholder/roles-relationships`
       - Shows: Role descriptions, relationship types, connected stakeholders (if any)
     
     - **Widget 3: WorkflowTasksWidget** (lg: w-full)
       - Displays: Active workflow tasks
       - Data: Fetches `/api/workflows/active-tasks`
       - Shows: "Accept Terms & Conditions" task (from workflow created in Phase 1, step 5)
       - User can click to complete task

4. **File System Sidebar (Secondary)**
   - Fetch root node: `SELECT * FROM nodes WHERE owner_id = 'stk-jane-001' AND parent_id IS NULL`
   - Result: "Jane Smith Workspace" folder (node-jane-root)
   - Display in File Explorer view (when user clicks "File Explorer" menu item)

5. **Notifications Display**
   - Fetch welcome notification: `SELECT * FROM notifications WHERE stakeholder_id = 'stk-jane-001' AND is_read = false`
   - Display notification banner: "Welcome to the Workspace" with link to accept workflow task

---

## Data Structures

### Stakeholders Table Update
```sql
ALTER TABLE stakeholders ADD COLUMN core_config jsonb DEFAULT '{}';

-- Example record:
INSERT INTO stakeholders (id, auth_user_id, name, email, stakeholder_type_id, core_config, app_uuid) 
VALUES (
  'stk-jane-001',
  'auth-uuid-123',
  'Jane Smith',
  'jane@example.com',
  1, -- Individual type
  '{...core_config JSON...}',
  'bda-app-uuid'
);
```

### Nodes Table (File System)
```sql
CREATE TABLE nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('file', 'folder')),
  parent_id uuid REFERENCES nodes(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  file_storage_path text, -- Only for type='file', references Supabase Storage path
  size_bytes integer,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  app_uuid uuid NOT NULL REFERENCES applications(uuid),
  UNIQUE(parent_id, name, owner_id) -- Prevent duplicate names in same folder
);

-- RLS Policy: Users can only see their own nodes
CREATE POLICY nodes_owner_access ON nodes
  FOR SELECT USING (owner_id = auth.uid());
```

### Notifications Table (Welcome Message)
```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id uuid NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  notification_type text, -- 'welcome', 'workflow', 'file_shared', etc.
  title text NOT NULL,
  message text,
  is_read boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  app_uuid uuid REFERENCES applications(uuid)
);

-- RLS Policy: Users see only their notifications
CREATE POLICY notifications_owner_access ON notifications
  FOR SELECT USING (stakeholder_id = auth.uid());
```

### Workflow & Activity Tables (Simple Accept Task)
```sql
CREATE TABLE workflow_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_code text UNIQUE NOT NULL,
  stakeholder_id uuid NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  workflow_type text, -- 'accept_terms', 'vc_client_finance', etc.
  status text DEFAULT 'active', -- 'active', 'completed', 'paused'
  maturity_gate text, -- 'FLM', 'AGM', 'Full'
  created_at timestamp DEFAULT now(),
  app_uuid uuid REFERENCES applications(uuid)
);

CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id uuid NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  activity_code text UNIQUE NOT NULL,
  activity_name text NOT NULL,
  status text DEFAULT 'pending', -- 'pending', 'in_progress', 'complete'
  owner text, -- 'client', 'admin', 'ai_agent'
  due_date timestamp,
  created_at timestamp DEFAULT now()
);
```

---

## Component Requirements

### 1. DashboardRenderer Component
```typescript
// components/dashboard/DashboardRenderer.tsx
export function DashboardRenderer({ stakeholder }) {
  const { core_config } = stakeholder
  const { role_configurations } = core_config
  
  // Determine which role config to use (simplified: use first matching)
  const roleConfig = Object.values(role_configurations)[0]
  
  return (
    <>
      {/* Sidebar Menu */}
      <Sidebar menuItems={roleConfig.menu_items} functionRegistry={core_config.function_registry} />
      
      {/* Main Content */}
      <main className="lg:ml-64 pt-16">
        <h1>{roleConfig.dashboard_name}</h1>
        
        {/* Widgets Grid */}
        <div className="grid grid-cols-12 gap-6">
          {roleConfig.widgets.map(widget => (
            <div key={widget.widget_id} className={`col-span-${getColSpan(widget.layout, deviceWidth)}`}>
              <WidgetRenderer widget={widget} stakeholder={stakeholder} />
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
```

### 2. ProfileCard Widget
```typescript
// components/widgets/ProfileCard.tsx
export function ProfileCard({ stakeholder }) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">My Profile</h3>
      <div className="space-y-2">
        <p><strong>Name:</strong> {stakeholder.name}</p>
        <p><strong>Email:</strong> {stakeholder.email}</p>
        <p><strong>Type:</strong> {stakeholder.stakeholder_type}</p>
      </div>
    </div>
  )
}
```

### 3. RolesRelationshipsWidget
```typescript
// components/widgets/RolesRelationshipsWidget.tsx
export function RolesRelationshipsWidget({ stakeholder }) {
  const [rolesRelationships, setRolesRelationships] = useState(null)
  
  useEffect(() => {
    fetch(`/api/stakeholder/roles-relationships?stakeholder_id=${stakeholder.id}`)
      .then(r => r.json())
      .then(data => setRolesRelationships(data))
  }, [stakeholder.id])
  
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Roles & Relationships</h3>
      
      <div className="mb-4">
        <h4 className="font-semibold text-gray-700">Roles</h4>
        <ul className="list-disc pl-5">
          {rolesRelationships?.roles?.map(role => (
            <li key={role.id}>{role.role_name}</li>
          ))}
        </ul>
      </div>
      
      <div>
        <h4 className="font-semibold text-gray-700">Relationships</h4>
        {rolesRelationships?.relationships?.length === 0 ? (
          <p className="text-gray-500">No relationships yet.</p>
        ) : (
          <ul className="list-disc pl-5">
            {rolesRelationships?.relationships?.map(rel => (
              <li key={rel.id}>{rel.related_stakeholder_name} ({rel.relationship_type})</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

### 4. WorkflowTasksWidget
```typescript
// components/widgets/WorkflowTasksWidget.tsx
export function WorkflowTasksWidget({ stakeholder }) {
  const [tasks, setTasks] = useState(null)
  
  useEffect(() => {
    fetch(`/api/workflows/active-tasks?stakeholder_id=${stakeholder.id}`)
      .then(r => r.json())
      .then(data => setTasks(data))
  }, [stakeholder.id])
  
  const handleCompleteTask = async (activityId) => {
    await fetch(`/api/workflows/activities/${activityId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'complete' })
    })
    // Refresh tasks
  }
  
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Workflow Tasks</h3>
      <ul className="space-y-3">
        {tasks?.map(task => (
          <li key={task.id} className="flex justify-between items-center border-b pb-2">
            <div>
              <p className="font-medium">{task.activity_name}</p>
              <p className="text-sm text-gray-500">Due: {new Date(task.due_date).toLocaleDateString()}</p>
            </div>
            <button 
              onClick={() => handleCompleteTask(task.id)}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Accept
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

## API Endpoints Required

### 1. GET /api/stakeholder/roles-relationships
**Purpose:** Fetch roles and relationships for a stakeholder

**Query Params:** `stakeholder_id`

**Response:**
```json
{
  "roles": [
    { "id": "role-1", "role_name": "Investor" },
    { "id": "role-2", "role_name": "Service Provider" }
  ],
  "relationships": [
    { "id": "rel-1", "related_stakeholder_name": "Acme Corp", "relationship_type": "partner" }
  ]
}
```

### 2. GET /api/workflows/active-tasks
**Purpose:** Fetch pending workflow tasks for a stakeholder

**Query Params:** `stakeholder_id`

**Response:**
```json
[
  {
    "id": "activity-accept-001",
    "activity_name": "Accept Terms & Conditions",
    "due_date": "2025-11-15T00:00:00Z",
    "workflow_instance_code": "WELCOME-jane-001"
  }
]
```

### 3. PATCH /api/workflows/activities/:activityId
**Purpose:** Update activity status (mark as complete)

**Body:**
```json
{
  "status": "complete"
}
```

**Response:** Updated activity record

---

## Testing Acceptance Criteria

- [ ] Onboarding completes successfully, creates stakeholder + workspace + core_config + workflow
- [ ] core_config JSON stored correctly in stakeholders table
- [ ] File system root node created for stakeholder
- [ ] Welcome notification created and queryable
- [ ] User logs in and dashboard renders without errors
- [ ] Dashboard menu shows correct items for user's roles
- [ ] ProfileCard displays correct stakeholder information
- [ ] RolesRelationshipsWidget displays roles and any relationships
- [ ] WorkflowTasksWidget displays "Accept Terms" task
- [ ] User can click "Accept" button to complete task
- [ ] Dashboard responds correctly to different screen sizes (lg/md/sm)
- [ ] RLS policies enforce data isolation (user only sees own records)
- [ ] Audit logs capture onboarding and user actions

---

## Implementation Notes for Claude Code

1. **Start with happy path only:** Assume valid inputs, don't over-engineer error handling yet
2. **Use existing db functions:** Reuse RPC from Point 2 for stakeholder creation
3. **Focus on core_config JSON:** This is the heart of Point 3—get this rendering correctly
4. **Widgets are simple initially:** ProfileCard and RolesRelationshipsWidget just display data (no editing)
5. **File system is read-only initially:** Create root node, display in File Explorer, no uploads yet
6. **Test with real login:** Ensure RLS policies work end-to-end

---

**Use Case Status:** Ready for Claude Code implementation

**Next Phase:** Once this works, integrate with full function_registry and build out widget library (Point 4)