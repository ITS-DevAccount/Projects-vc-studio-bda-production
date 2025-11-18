# Sprint 10.1d.1: Code Updates Guide
## Inserting app_uuid & Filtering Queries

---

## Part 1: Get App UUID (Common Pattern)

**Every API route needs to get the current app's UUID.**

### Pattern A: From Environment Variable (Recommended)

```typescript
// lib/app.ts
export const getAppCode = () => {
    return process.env.NEXT_PUBLIC_SITE_CODE || 'VC_STUDIO';
};

export const getAppUuid = async (supabase: SupabaseClient) => {
    const appCode = getAppCode();
    
    const { data, error } = await supabase
        .from('applications')
        .select('id')
        .eq('app_code', appCode)
        .single();
    
    if (error) throw new Error(`App not found: ${appCode}`);
    
    return data.id;
};
```

**Usage in API routes:**

```typescript
// app/api/blog-posts/route.ts
import { getAppUuid } from '@/lib/app';

export async function POST(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    
    const { title, content } = await request.json();
    
    const { data, error } = await supabase
        .from('blog_posts')
        .insert({
            title,
            content,
            app_uuid: appUuid,  // ← Always add this
            // ... other fields
        })
        .select()
        .single();
    
    return Response.json(data);
}
```

---

## Part 2: INSERT Operations (13 Tables)

**For each table, add `app_uuid` when creating records.**

### Blog Posts

```typescript
// app/api/blog-posts/route.ts
export async function POST(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    
    const { title, slug, content, author_id } = await request.json();
    
    const { data, error } = await supabase
        .from('blog_posts')
        .insert({
            title,
            slug,
            content,
            author_id,
            app_uuid: appUuid,  // ← ALWAYS ADD
            status: 'draft',
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Enquiries

```typescript
// app/api/enquiries/route.ts
export async function POST(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    
    const { name, email, message } = await request.json();
    
    const { data, error } = await supabase
        .from('enquiries')
        .insert({
            name,
            email,
            message,
            app_uuid: appUuid,  // ← ALWAYS ADD
            status: 'new',
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Campaigns

```typescript
// app/api/campaigns/route.ts
export async function POST(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    
    const { name, description, start_date } = await request.json();
    
    const { data, error } = await supabase
        .from('campaigns')
        .insert({
            name,
            description,
            start_date,
            app_uuid: appUuid,  // ← ALWAYS ADD
            status: 'active',
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Notifications

```typescript
// app/api/notifications/route.ts
export async function POST(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    
    const { stakeholder_id, message, type } = await request.json();
    
    const { data, error } = await supabase
        .from('notifications')
        .insert({
            stakeholder_id,
            message,
            type,
            app_uuid: appUuid,  // ← ALWAYS ADD
            is_read: false,
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Interactions

```typescript
// app/api/interactions/route.ts
export async function POST(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    
    const { stakeholder_id, interaction_type, notes } = await request.json();
    
    const { data, error } = await supabase
        .from('interactions')
        .insert({
            stakeholder_id,
            interaction_type,
            notes,
            app_uuid: appUuid,  // ← ALWAYS ADD
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Workflow Instances

```typescript
// app/api/workflow-instances/route.ts
export async function POST(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    
    const { workflow_template_id, stakeholder_id } = await request.json();
    
    const { data, error } = await supabase
        .from('workflow_instances')
        .insert({
            workflow_template_id,
            stakeholder_id,
            app_uuid: appUuid,  // ← ALWAYS ADD
            status: 'active',
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Workflow Templates

```typescript
// app/api/workflow-templates/route.ts
export async function POST(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    
    const { name, description, definition } = await request.json();
    
    const { data, error } = await supabase
        .from('workflow_templates')
        .insert({
            name,
            description,
            definition,
            app_uuid: appUuid,  // ← ALWAYS ADD
            is_active: true,
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Workflow Steps

```typescript
// app/api/workflow-steps/route.ts
export async function POST(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    
    const { workflow_instance_id, step_name, step_order } = await request.json();
    
    const { data, error } = await supabase
        .from('workflow_steps')
        .insert({
            workflow_instance_id,
            step_name,
            step_order,
            app_uuid: appUuid,  // ← ALWAYS ADD
            status: 'pending',
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Instance Tasks

```typescript
// app/api/instance-tasks/route.ts
export async function POST(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    
    const { workflow_instance_id, task_description } = await request.json();
    
    const { data, error } = await supabase
        .from('instance_tasks')
        .insert({
            workflow_instance_id,
            task_description,
            app_uuid: appUuid,  // ← ALWAYS ADD
            status: 'pending',
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Instance Context

```typescript
// app/api/instance-context/route.ts
export async function POST(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    
    const { workflow_instance_id, context_data } = await request.json();
    
    const { data, error } = await supabase
        .from('instance_context')
        .insert({
            workflow_instance_id,
            context_data,
            app_uuid: appUuid,  // ← ALWAYS ADD
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Nodes

```typescript
// app/api/nodes/route.ts
export async function POST(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    
    const { node_name, parent_id } = await request.json();
    
    const { data, error } = await supabase
        .from('nodes')
        .insert({
            node_name,
            parent_id,
            app_uuid: appUuid,  // ← ALWAYS ADD
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### Node Shares

```typescript
// app/api/node-shares/route.ts
export async function POST(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    
    const { node_id, shared_with_stakeholder_id, permission } = await request.json();
    
    const { data, error } = await supabase
        .from('node_shares')
        .insert({
            node_id,
            shared_with_stakeholder_id,
            permission,
            app_uuid: appUuid,  // ← ALWAYS ADD
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

### VC Models

```typescript
// app/api/vc-models/route.ts
export async function POST(request: Request) {
    const supabase = createClient();
    const appUuid = await getAppUuid(supabase);
    
    const { stakeholder_id, model_data } = await request.json();
    
    const { data, error } = await supabase
        .from('vc_models')
        .insert({
            stakeholder_id,
            model_data,
            app_uuid: appUuid,  // ← ALWAYS ADD
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data);
}
```

---

## Summary: Insert Pattern

**For all 13 tables, the pattern is identical:**

```typescript
const appUuid = await getAppUuid(supabase);

await supabase
    .from('table_name')
    .insert({
        // ... your fields
        app_uuid: appUuid,  // ← ADD THIS ALWAYS
    });
```

**That's it for INSERT operations.**
