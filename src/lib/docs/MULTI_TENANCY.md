# Multi-Tenancy Architecture Guide

## Overview

VC Studio implements a multi-tenant architecture where each application instance is isolated by `app_uuid`. The `app_uuid` is initialized from the `applications` table using an `app_code` from environment variables, then provided globally via React Context.

## Architecture Flow

```
App Starts → Read NEXT_PUBLIC_APP_CODE → Query applications table → Get app_uuid → Store in Context → All queries filter by app_uuid
```

## Initialization Pattern

### 1. Environment Configuration

**IMPORTANT**: Create a `.env.local` file in the project root with:

```bash
NEXT_PUBLIC_APP_CODE=VC_STUDIO
```

**Note**: The `.env.local` file is gitignored for security. You must create it manually.

**Important**: The `app_code` value must match an existing record in the `applications` table. Common values:
- `VC_STUDIO` - Default VC Studio application
- `vc-studio-bda` - Alternative naming convention (if configured in database)

### 2. App Context Initialization

On app mount, `AppContext` automatically:

1. Reads `NEXT_PUBLIC_APP_CODE` from environment variables
2. Queries `applications` table: `SELECT id as app_uuid FROM applications WHERE app_code = $1 LIMIT 1`
3. Stores `app_uuid` in React Context
4. Shows loading screen during initialization
5. Shows error screen if `app_code` not found

### 3. Using app_uuid Throughout the App

All components can access `app_uuid` via the `useAppUuid()` hook:

```tsx
import { useAppUuid } from '@/hooks/useAppData'

function MyComponent() {
  const app_uuid = useAppUuid()
  
  // Use app_uuid in queries
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('app_uuid', app_uuid)
    .eq('status', 'published')
}
```

## Available Hooks

### `useAppUuid()`

Returns the current `app_uuid` from AppContext.

```tsx
import { useAppUuid } from '@/hooks/useAppData'

const app_uuid = useAppUuid()
```

### `usePageSettings(pageSlug)`

Fetches page settings for a specific page slug, automatically filtered by `app_uuid`.

```tsx
import { usePageSettings } from '@/hooks/useAppData'

function MyPage() {
  const { settings, loading, error } = usePageSettings('home')
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  
  return <div>{settings?.title}</div>
}
```

**Query**: `SELECT * FROM page_settings WHERE app_uuid = ? AND slug = ?`

### `useSiteSettings()`

Fetches active site settings, automatically filtered by `app_uuid`.

```tsx
import { useSiteSettings } from '@/hooks/useAppData'

function SettingsDisplay() {
  const { settings, loading, error } = useSiteSettings()
  
  // settings contains the active site_settings record
}
```

**Query**: `SELECT * FROM site_settings WHERE app_uuid = ? AND is_active = true ORDER BY updated_at DESC LIMIT 1`

### `useBlogPosts()`

Fetches published blog posts, automatically filtered by `app_uuid`.

```tsx
import { useBlogPosts } from '@/hooks/useAppData'

function BlogList() {
  const { posts, loading, error } = useBlogPosts()
  
  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>{post.title}</article>
      ))}
    </div>
  )
}
```

**Query**: `SELECT * FROM blog_posts WHERE app_uuid = ? AND status = 'published'`

## Creating App-Aware Queries

### Pattern 1: Using Hooks (Recommended)

Use the provided hooks which automatically handle `app_uuid`:

```tsx
import { useAppUuid } from '@/hooks/useAppData'

function MyComponent() {
  const app_uuid = useAppUuid()
  const [data, setData] = useState([])
  
  useEffect(() => {
    if (!app_uuid) return
    
    supabase
      .from('my_table')
      .select('*')
      .eq('app_uuid', app_uuid)
      .then(({ data }) => setData(data))
  }, [app_uuid])
}
```

### Pattern 2: Using Helper Functions

Use the helper functions from `@/lib/supabase/app-helpers`:

```tsx
import { queryWithApp, insertWithApp, updateWithApp, deleteWithApp } from '@/lib/supabase/app-helpers'
import { useAppUuid } from '@/hooks/useAppData'

function MyComponent() {
  const app_uuid = useAppUuid()
  
  // Query with app filtering
  const { data } = await queryWithApp('my_table', app_uuid)
    .select('*')
    .eq('status', 'active')
  
  // Insert with app_uuid automatically included
  await insertWithApp('my_table', app_uuid, {
    title: 'New Item',
    content: 'Content here'
  })
  
  // Update with app_uuid security check
  await updateWithApp('my_table', app_uuid, recordId, {
    title: 'Updated Title'
  })
  
  // Delete with app_uuid security check
  await deleteWithApp('my_table', app_uuid, recordId)
}
```

## Example: Adding a New Multi-Tenant Page

Here's a complete example of creating a new page that respects multi-tenancy:

```tsx
'use client'

import { useAppUuid } from '@/hooks/useAppData'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function MyNewPage() {
  const app_uuid = useAppUuid()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (!app_uuid) {
      setLoading(false)
      return
    }
    
    async function fetchItems() {
      const { data, error } = await supabase
        .from('my_table')
        .select('*')
        .eq('app_uuid', app_uuid) // CRITICAL: Always filter by app_uuid
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        setItems(data)
      }
      setLoading(false)
    }
    
    fetchItems()
  }, [app_uuid])
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      <h1>My Items</h1>
      {items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  )
}
```

## Database Schema

### applications Table

The `applications` table is the source of truth for app identification:

```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- This is the app_uuid
  app_code TEXT UNIQUE NOT NULL,                  -- Used in NEXT_PUBLIC_APP_CODE
  app_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### App-Scoped Tables

All app-scoped tables should have an `app_uuid` column that references `applications.id`:

- `blog_posts.app_uuid`
- `page_settings.app_uuid`
- `site_settings.app_uuid`
- `enquiries.app_uuid`
- `notifications.app_uuid`
- etc.

## Migration Guide

### From Old Pattern (site_settings)

**Old Pattern**:
```tsx
// Used NEXT_PUBLIC_SITE_CODE
const siteCode = process.env.NEXT_PUBLIC_SITE_CODE
const { data } = await supabase
  .from('site_settings')
  .select('app_uuid')
  .eq('site_code', siteCode)
```

**New Pattern**:
```tsx
// Uses NEXT_PUBLIC_APP_CODE
const appCode = process.env.NEXT_PUBLIC_APP_CODE
const { data } = await supabase
  .from('applications')
  .select('id')
  .eq('app_code', appCode)
```

### Steps to Migrate

1. **Update Environment Variable**:
   - Change `NEXT_PUBLIC_SITE_CODE` to `NEXT_PUBLIC_APP_CODE` in `.env.local`
   - Ensure the value matches an `app_code` in the `applications` table

2. **Update Code**:
   - Replace all references to `NEXT_PUBLIC_SITE_CODE` with `NEXT_PUBLIC_APP_CODE`
   - Update queries from `site_settings` to `applications` table
   - Use `id` from `applications` as `app_uuid` (not `app_uuid` from `site_settings`)

3. **Verify Queries**:
   - Ensure all queries filter by `app_uuid` from the context
   - Test with different `NEXT_PUBLIC_APP_CODE` values to verify isolation

## Best Practices

1. **Always Filter by app_uuid**: Never query app-scoped tables without filtering by `app_uuid`
2. **Use Hooks**: Prefer using `useAppUuid()` hook over accessing context directly
3. **Wait for Initialization**: Check if `app_uuid` exists before making queries
4. **Use Helper Functions**: Use `queryWithApp()`, `insertWithApp()`, etc. for type safety
5. **Error Handling**: Handle cases where `app_uuid` might be empty (during loading or errors)

## Troubleshooting

### app_uuid is empty

- Check that `NEXT_PUBLIC_APP_CODE` is set in `.env.local`
- Verify the `app_code` exists in the `applications` table
- Check browser console for initialization errors

### Queries returning wrong data

- Ensure all queries include `.eq('app_uuid', app_uuid)`
- Verify the `app_uuid` is being passed correctly
- Check that tables have `app_uuid` column and indexes

### Loading state never ends

- Check network tab for failed requests to `applications` table
- Verify Supabase connection is working
- Check that `applications` table exists and has data

## Security Considerations

- **Never trust client-side app_uuid**: Always validate on server-side for sensitive operations
- **Use RLS policies**: Implement Row Level Security policies that filter by `app_uuid`
- **Helper functions**: Use `updateWithApp()` and `deleteWithApp()` which include `app_uuid` in WHERE clauses to prevent cross-app operations

