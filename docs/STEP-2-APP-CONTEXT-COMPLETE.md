# Step 2: App Context Provider - COMPLETE ✅

**Date**: 2025-11-04
**Status**: App context infrastructure ready
**Next Step**: Update queries to use app context

---

## What Was Created

### 1. App Context Provider
**File**: `src/contexts/AppContext.tsx`

Provides app context throughout the application:
```typescript
const { app_uuid, site_code, domain_code, site_name } = useApp()
```

Features:
- Loads app metadata from `site_settings` table
- Uses `NEXT_PUBLIC_SITE_CODE` environment variable
- Provides React context to all components
- Includes loading state
- Fallback to VC_STUDIO if loading fails

---

### 2. Helper Functions
**File**: `src/lib/supabase/app-helpers.ts`

Utility functions for multi-app queries:

```typescript
// Get current app UUID
const appUuid = await getCurrentAppUuid()

// Get full app context
const app = await getAppContext()

// Query with app filtering
const posts = await queryWithApp('blog_posts', appUuid)
  .select('*')
  .eq('status', 'published')

// Insert with app_uuid
await insertWithApp('blog_posts', appUuid, { title, content })

// Update with app security
await updateWithApp('blog_posts', appUuid, postId, { title: 'New' })

// Delete with app security
await deleteWithApp('blog_posts', appUuid, postId)
```

---

### 3. Root Layout Updated
**File**: `src/app/layout.tsx`

Added `AppProvider` to wrap the entire application:
```tsx
<AppProvider>
  <ThemeProvider>
    <AuthProviderWrapper>
      {children}
    </AuthProviderWrapper>
  </ThemeProvider>
</AppProvider>
```

---

### 4. Environment Configuration
**File**: `.env.local`

Added multi-app configuration:
```bash
NEXT_PUBLIC_SITE_CODE=VC_STUDIO
```

**File**: `.env.example`

Updated with documentation for all available apps:
- VC_STUDIO (BDA)
- T2G, G2G, OCG (ADA)
- BUILDBID (PDA)

---

## How to Use

### In Client Components

```typescript
'use client'
import { useApp, useAppUuid } from '@/contexts/AppContext'

export function MyComponent() {
  // Get full context
  const { app_uuid, site_code, site_name } = useApp()

  // Or just get UUID
  const appUuid = useAppUuid()

  // Use in queries
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('app_uuid', appUuid)

  return <div>Current App: {site_name}</div>
}
```

### In Server Components

```typescript
import { getAppContext, getCurrentAppUuid } from '@/lib/supabase/app-helpers'

export async function ServerComponent() {
  const appUuid = await getCurrentAppUuid()

  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('app_uuid', appUuid)

  return <div>...</div>
}
```

### Using Helper Functions

```typescript
import { insertWithApp, updateWithApp, deleteWithApp } from '@/lib/supabase/app-helpers'
import { useAppUuid } from '@/contexts/AppContext'

export function BlogEditor() {
  const appUuid = useAppUuid()

  async function createPost(data) {
    // Automatically includes app_uuid
    await insertWithApp('blog_posts', appUuid, {
      title: data.title,
      content: data.content
    })
  }

  async function updatePost(postId, data) {
    // Automatically includes app_uuid in WHERE (security)
    await updateWithApp('blog_posts', appUuid, postId, data)
  }

  async function deletePost(postId) {
    // Automatically includes app_uuid in WHERE (security)
    await deleteWithApp('blog_posts', appUuid, postId)
  }
}
```

---

## Testing

### Test Current App Loads

1. Start dev server: `npm run dev`
2. Open browser console
3. Should see no errors loading app context
4. Check network tab - should see query to `site_settings` table

### Test Different Apps

1. Change `.env.local`:
   ```bash
   NEXT_PUBLIC_SITE_CODE=T2G
   ```
2. Restart dev server
3. App should try to load T2G app (will fail until you create T2G in database)

### Add Test App to Database

```sql
-- Add T2G app to database for testing
INSERT INTO site_settings (
  site_code, domain_code, site_name, is_active_app,
  -- ... copy branding fields from VC_STUDIO
) VALUES (
  'T2G', 'ADA', 'Tech2Go', true,
  -- ... branding values
);
```

---

## What's Next (Step 3)

Now that app context is available, we need to update all queries in these files:

### High Priority (Security Risk)
- [ ] `src/app/dashboard/page.tsx` - Add app_uuid to DELETE queries
- [ ] `src/app/dashboard/blog/[id]/page.tsx` - Add app_uuid to UPDATE queries
- [ ] `src/app/dashboard/pages/editor/page.tsx` - Add app_uuid to DELETE/UPDATE queries

### High Priority (Functionality)
- [ ] `src/app/page.tsx` - Add app_uuid filters
- [ ] `src/app/dashboard/blog/new/page.tsx` - Add app_uuid to INSERT
- [ ] `src/app/dashboard/settings/branding/page.tsx` - Add site_code filter

### Medium Priority
- [ ] `src/app/blog/[id]/page.tsx` - Add app_uuid filter
- [ ] `src/hooks/useTheme.ts` - Add site_code filter

---

## Architecture Notes

### Why Environment Variable?

We use `NEXT_PUBLIC_SITE_CODE` because:
1. **Simple**: One environment variable determines entire app behavior
2. **Deploy-time**: Can deploy same codebase as different apps
3. **Clear**: Easy to see which app you're running
4. **Secure**: Can't be changed by users

### Why Not Hostname-Based?

We could detect app from hostname (`t2g.example.com`), but:
- More complex (need middleware)
- Harder to test locally
- Environment variable is simpler for now
- Can add hostname detection later if needed

### Future: Hostname Detection

If you want to support multiple apps on different domains:

```typescript
// middleware.ts
export function middleware(req: Request) {
  const hostname = req.headers.get('host')
  const hostnameMap = {
    't2g.vcstudio.com': 'T2G',
    'vcstudio.com': 'VC_STUDIO',
    'buildbid.com': 'BUILDBID'
  }
  const siteCode = hostnameMap[hostname] || 'VC_STUDIO'
  // Store in headers or cookies
}
```

---

## Summary

✅ **App context provider created** - Provides app_uuid throughout app
✅ **Helper functions created** - Safe multi-app query utilities
✅ **Root layout updated** - AppProvider wrapping entire app
✅ **Environment configured** - NEXT_PUBLIC_SITE_CODE controls which app

**Current Status**: Infrastructure ready, queries not yet updated
**Next Step**: Update 9 files to use app context in queries

---

**Ready to proceed to Step 3: Update Database Queries**
