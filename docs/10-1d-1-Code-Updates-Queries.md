# Sprint 10.1d.1: Query Filtering Guide
## Reading Records with app_uuid Filter

---

## Pattern: Always Filter by app_uuid on Read

**Every SELECT query must filter by the current app's UUID.**

---

## Common Queries

### Blog Posts: List All

```typescript
// app/api/blog-posts/route.ts
export async function GET(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    
    const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('app_uuid', appUuid)  // ← FILTER BY APP
        .eq('status', 'published')
        .order('created_at', { ascending: false });
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Blog Posts: Get Single Post

```typescript
export async function GET(request: Request, { params }: { params: { id: string } }) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    
    const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', params.id)
        .eq('app_uuid', appUuid)  // ← FILTER BY APP
        .single();
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Enquiries: List All

```typescript
export async function GET(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    
    const { data, error } = await supabase
        .from('enquiries')
        .select('*')
        .eq('app_uuid', appUuid)  // ← FILTER BY APP
        .order('created_at', { ascending: false });
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Enquiries: By Status

```typescript
export async function GET(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'new';
    
    const { data, error } = await supabase
        .from('enquiries')
        .select('*')
        .eq('app_uuid', appUuid)  // ← FILTER BY APP
        .eq('status', status)
        .order('created_at', { ascending: false });
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Campaigns: List All Active

```typescript
export async function GET(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    
    const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('app_uuid', appUuid)  // ← FILTER BY APP
        .eq('status', 'active')
        .order('start_date', { ascending: false });
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Notifications: List User's Notifications

```typescript
export async function GET(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    const { searchParams } = new URL(request.url);
    const stakeholderId = searchParams.get('stakeholder_id');
    
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('app_uuid', appUuid)  // ← FILTER BY APP
        .eq('stakeholder_id', stakeholderId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Interactions: List by Stakeholder

```typescript
export async function GET(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    const { searchParams } = new URL(request.url);
    const stakeholderId = searchParams.get('stakeholder_id');
    
    const { data, error } = await supabase
        .from('interactions')
        .select('*')
        .eq('app_uuid', appUuid)  // ← FILTER BY APP
        .eq('stakeholder_id', stakeholderId)
        .order('created_at', { ascending: false });
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Workflow Instances: List Active

```typescript
export async function GET(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    
    const { data, error } = await supabase
        .from('workflow_instances')
        .select('*')
        .eq('app_uuid', appUuid)  // ← FILTER BY APP
        .eq('status', 'active')
        .order('created_at', { ascending: false });
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Workflow Instances: Get Single

```typescript
export async function GET(request: Request, { params }: { params: { id: string } }) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    
    const { data, error } = await supabase
        .from('workflow_instances')
        .select('*')
        .eq('id', params.id)
        .eq('app_uuid', appUuid)  // ← FILTER BY APP
        .single();
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Workflow Templates: List All

```typescript
export async function GET(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    
    const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('app_uuid', appUuid)  // ← FILTER BY APP
        .eq('is_active', true)
        .order('name');
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Workflow Steps: List by Instance

```typescript
export async function GET(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    const { searchParams } = new URL(request.url);
    const workflowInstanceId = searchParams.get('workflow_instance_id');
    
    const { data, error } = await supabase
        .from('workflow_steps')
        .select('*')
        .eq('app_uuid', appUuid)  // ← FILTER BY APP
        .eq('workflow_instance_id', workflowInstanceId)
        .order('step_order');
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Instance Tasks: List Pending

```typescript
export async function GET(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    
    const { data, error } = await supabase
        .from('instance_tasks')
        .select('*')
        .eq('app_uuid', appUuid)  // ← FILTER BY APP
        .eq('status', 'pending')
        .order('created_at');
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Instance Context: Get Latest for Workflow

```typescript
export async function GET(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    const { searchParams } = new URL(request.url);
    const workflowInstanceId = searchParams.get('workflow_instance_id');
    
    const { data, error } = await supabase
        .from('instance_context')
        .select('*')
        .eq('app_uuid', appUuid)  // ← FILTER BY APP
        .eq('workflow_instance_id', workflowInstanceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Nodes: List Hierarchy

```typescript
export async function GET(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parent_id');
    
    const { data, error } = await supabase
        .from('nodes')
        .select('*')
        .eq('app_uuid', appUuid)  // ← FILTER BY APP
        .eq('parent_id', parentId || null)
        .order('node_name');
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Node Shares: List for Node

```typescript
export async function GET(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('node_id');
    
    const { data, error } = await supabase
        .from('node_shares')
        .select('*')
        .eq('app_uuid', appUuid)  // ← FILTER BY APP
        .eq('node_id', nodeId)
        .order('created_at');
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### VC Models: List by Stakeholder

```typescript
export async function GET(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    const { searchParams } = new URL(request.url);
    const stakeholderId = searchParams.get('stakeholder_id');
    
    const { data, error } = await supabase
        .from('vc_models')
        .select('*')
        .eq('app_uuid', appUuid)  // ← FILTER BY APP
        .eq('stakeholder_id', stakeholderId)
        .order('created_at', { ascending: false });
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

---

## UPDATE Operations

**Always include app_uuid in WHERE clause for safety:**

```typescript
// Update a blog post
const { data, error } = await supabase
    .from('blog_posts')
    .update({ title: 'New Title', updated_at: new Date().toISOString() })
    .eq('id', postId)
    .eq('app_uuid', appUuid)  // ← SAFETY FILTER
    .select()
    .single();
```

---

## DELETE Operations

**Always include app_uuid in WHERE clause for safety:**

```typescript
// Delete a blog post
const { data, error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', postId)
    .eq('app_uuid', appUuid)  // ← SAFETY FILTER
    .select();
```

---

## Summary: Query Filtering Pattern

**For all SELECT, UPDATE, DELETE operations:**

```typescript
const appUuid = await getAppUuid(supabase);

await supabase
    .from('table_name')
    .select('*')
    .eq('app_uuid', appUuid)  // ← ALWAYS ADD THIS FILTER
    .eq('other_column', someValue)  // Optional: other filters
```

**That's it. Consistent pattern across all 13 tables.**
