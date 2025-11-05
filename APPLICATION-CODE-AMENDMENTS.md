# Application Code Amendments for Multi-App Support

**Project**: VC Studio - Multi-App Compatibility
**Purpose**: Guide for updating application code to support multi-app database schema
**Target**: Frontend/Backend developers implementing multi-app queries
**Status**: Implementation Guide

---

## Overview

After executing `PHASE-1a-Field-Extensions.sql`, the database schema now supports multiple independent applications. This document provides:

1. **Query Migration Patterns** - How to update existing queries
2. **API Changes** - Breaking and non-breaking changes
3. **App Context Management** - How to pass app_uuid through the application
4. **Code Examples** - Before/after comparisons for common operations
5. **Testing Strategy** - How to verify multi-app isolation

---

## Key Concepts

### App Context
Every user request should carry **app context** to identify which application is being accessed:

```typescript
interface AppContext {
  app_uuid: string;        // UUID from site_settings
  site_code: string;       // 'T2G', 'VC_STUDIO', 'BUILDBID', etc.
  domain_code: string;     // 'ADA', 'BDA', 'PDA'
}
```

### App Context Sources
1. **Hostname**: `t2g.vcstudio.com` → T2G app
2. **Subdomain**: `vcstudio.example.com` → VC_STUDIO app
3. **Path prefix**: `/apps/buildbid/...` → BUILDBID app
4. **User selection**: User chooses app from dropdown
5. **JWT claim**: App stored in authentication token

---

## Section 1: Query Migration Patterns

### Pattern 1: Simple SELECT (Add WHERE app_uuid)

**Before (Single App)**
```sql
SELECT * FROM blog_posts
WHERE status = 'published'
ORDER BY published_at DESC
LIMIT 10;
```

**After (Multi-App)**
```sql
SELECT * FROM blog_posts
WHERE app_uuid = $1 AND status = 'published'
ORDER BY published_at DESC
LIMIT 10;
```

**TypeScript Example**
```typescript
// Before
async function getBlogPosts() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(10);
  return data;
}

// After
async function getBlogPosts(appUuid: string) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('app_uuid', appUuid)  // ✓ Add app filter
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(10);
  return data;
}
```

---

### Pattern 2: INSERT (Add app_uuid Column)

**Before (Single App)**
```sql
INSERT INTO enquiries (name, email, message)
VALUES ($1, $2, $3)
RETURNING id;
```

**After (Multi-App)**
```sql
INSERT INTO enquiries (app_uuid, name, email, message)
VALUES ($1, $2, $3, $4)
RETURNING id;
```

**TypeScript Example**
```typescript
// Before
async function submitEnquiry(data: { name: string; email: string; message: string }) {
  const { data: result, error } = await supabase
    .from('enquiries')
    .insert({
      name: data.name,
      email: data.email,
      message: data.message,
    })
    .select()
    .single();
  return result;
}

// After
async function submitEnquiry(
  appUuid: string,
  data: { name: string; email: string; message: string }
) {
  const { data: result, error } = await supabase
    .from('enquiries')
    .insert({
      app_uuid: appUuid,  // ✓ Add app context
      name: data.name,
      email: data.email,
      message: data.message,
    })
    .select()
    .single();
  return result;
}
```

---

### Pattern 3: UPDATE (Ensure app_uuid in WHERE)

**Before (Single App)**
```sql
UPDATE enquiries
SET status = 'resolved'
WHERE id = $1;
```

**After (Multi-App) - CRITICAL for Security**
```sql
UPDATE enquiries
SET status = 'resolved'
WHERE id = $1 AND app_uuid = $2;  -- Prevents cross-app updates
```

**TypeScript Example**
```typescript
// Before
async function resolveEnquiry(enquiryId: string) {
  const { error } = await supabase
    .from('enquiries')
    .update({ status: 'resolved' })
    .eq('id', enquiryId);
}

// After (SECURE)
async function resolveEnquiry(appUuid: string, enquiryId: string) {
  const { error } = await supabase
    .from('enquiries')
    .update({ status: 'resolved' })
    .eq('id', enquiryId)
    .eq('app_uuid', appUuid);  // ✓ CRITICAL: Prevents cross-app updates
}
```

---

### Pattern 4: DELETE (Ensure app_uuid in WHERE)

**Before (Single App)**
```sql
DELETE FROM blog_posts
WHERE id = $1;
```

**After (Multi-App) - CRITICAL for Security**
```sql
DELETE FROM blog_posts
WHERE id = $1 AND app_uuid = $2;  -- Prevents cross-app deletes
```

**TypeScript Example**
```typescript
// Before
async function deleteBlogPost(postId: string) {
  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', postId);
}

// After (SECURE)
async function deleteBlogPost(appUuid: string, postId: string) {
  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', postId)
    .eq('app_uuid', appUuid);  // ✓ CRITICAL: Prevents cross-app deletes
}
```

---

### Pattern 5: JOIN with Parent Table

**Before (Single App)**
```sql
SELECT pi.*, ps.page_name
FROM page_images pi
JOIN page_settings ps ON pi.page_settings_id = ps.id
WHERE ps.page_name = 'home'
ORDER BY pi.display_order;
```

**After (Multi-App) - Option A: Join with app filter**
```sql
SELECT pi.*, ps.page_name
FROM page_images pi
JOIN page_settings ps ON pi.page_settings_id = ps.id
WHERE ps.app_uuid = $1 AND ps.page_name = 'home'
ORDER BY pi.display_order;
```

**After (Multi-App) - Option B: Direct filter (if denormalized)**
```sql
SELECT pi.*, ps.page_name
FROM page_images pi
JOIN page_settings ps ON pi.page_settings_id = ps.id
WHERE pi.app_uuid = $1 AND ps.page_name = 'home'  -- Faster (uses index)
ORDER BY pi.display_order;
```

**TypeScript Example**
```typescript
// Before
async function getPageImages(pageName: string) {
  const { data, error } = await supabase
    .from('page_images')
    .select(`
      *,
      page_settings(page_name)
    `)
    .eq('page_settings.page_name', pageName)
    .eq('is_active', true)
    .order('display_order');
  return data;
}

// After (Option B - Direct filter)
async function getPageImages(appUuid: string, pageName: string) {
  const { data, error } = await supabase
    .from('page_images')
    .select(`
      *,
      page_settings!inner(page_name)
    `)
    .eq('app_uuid', appUuid)  // ✓ Fast: Uses idx_page_images_app_uuid
    .eq('page_settings.page_name', pageName)
    .eq('is_active', true)
    .order('display_order');
  return data;
}
```

---

### Pattern 6: Lookup by Slug (Composite Unique Constraint)

**Before (Single App)**
```sql
SELECT * FROM blog_posts WHERE slug = $1;
```

**After (Multi-App) - REQUIRED**
```sql
SELECT * FROM blog_posts WHERE app_uuid = $1 AND slug = $2;
```

**TypeScript Example**
```typescript
// Before
async function getBlogPostBySlug(slug: string) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .single();
  return data;
}

// After
async function getBlogPostBySlug(appUuid: string, slug: string) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('app_uuid', appUuid)  // ✓ REQUIRED: Part of unique constraint
    .eq('slug', slug)
    .single();
  return data;
}
```

---

### Pattern 7: Notifications (User + App Context)

**Before (Single App)**
```sql
SELECT * FROM notifications
WHERE user_id = $1 AND read_at IS NULL
ORDER BY created_at DESC;
```

**After (Multi-App)**
```sql
-- Option A: Single app notifications
SELECT * FROM notifications
WHERE user_id = $1 AND app_uuid = $2 AND read_at IS NULL
ORDER BY created_at DESC;

-- Option B: All apps (cross-app dashboard)
SELECT n.*, ss.site_code, ss.site_name
FROM notifications n
LEFT JOIN site_settings ss ON n.app_uuid = ss.app_uuid
WHERE user_id = $1 AND read_at IS NULL
ORDER BY created_at DESC;
```

**TypeScript Example**
```typescript
// Before
async function getUserNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .is('read_at', null)
    .order('created_at', { ascending: false });
  return data;
}

// After - Single app
async function getUserNotifications(userId: string, appUuid: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('app_uuid', appUuid)  // ✓ Filter to current app
    .is('read_at', null)
    .order('created_at', { ascending: false });
  return data;
}

// After - Cross-app (admin dashboard)
async function getAllUserNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      site_settings(site_code, site_name)
    `)
    .eq('user_id', userId)
    .is('read_at', null)
    .order('created_at', { ascending: false });
  return data;
}
```

---

## Section 2: App Context Management

### Strategy A: Middleware/Context Provider

**Next.js Example (App Router)**
```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Get app context from hostname
  const hostname = req.headers.get('host') || '';
  const appContext = getAppContextFromHostname(hostname);

  // Store in headers for server components
  res.headers.set('x-app-uuid', appContext.app_uuid);
  res.headers.set('x-site-code', appContext.site_code);

  return res;
}

function getAppContextFromHostname(hostname: string): AppContext {
  const hostnameMap: Record<string, AppContext> = {
    't2g.vcstudio.com': {
      app_uuid: 'uuid-for-t2g',
      site_code: 'T2G',
      domain_code: 'ADA',
    },
    'vcstudio.com': {
      app_uuid: 'uuid-for-vc-studio',
      site_code: 'VC_STUDIO',
      domain_code: 'BDA',
    },
    // ... etc
  };

  return hostnameMap[hostname] || hostnameMap['vcstudio.com'];
}
```

**React Context Provider**
```typescript
// contexts/AppContext.tsx
import { createContext, useContext, ReactNode } from 'react';

interface AppContextType {
  app_uuid: string;
  site_code: string;
  domain_code: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({
  children,
  appContext,
}: {
  children: ReactNode;
  appContext: AppContextType;
}) {
  return <AppContext.Provider value={appContext}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
```

**Usage in Components**
```typescript
// components/BlogList.tsx
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';

export function BlogList() {
  const { app_uuid } = useApp();  // ✓ Get app context
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    async function fetchPosts() {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('app_uuid', app_uuid)  // ✓ Use app context
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      setPosts(data || []);
    }
    fetchPosts();
  }, [app_uuid]);

  return (
    <div>
      {posts.map(post => (
        <BlogCard key={post.id} post={post} />
      ))}
    </div>
  );
}
```

---

### Strategy B: API Wrapper Functions

**lib/api/blog.ts**
```typescript
import { supabase } from '@/lib/supabase';

// Wrapper functions that enforce app context
export const blogApi = {
  async getAll(appUuid: string) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('app_uuid', appUuid)
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getBySlug(appUuid: string, slug: string) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('app_uuid', appUuid)
      .eq('slug', slug)
      .single();

    if (error) throw error;
    return data;
  },

  async create(appUuid: string, post: Omit<BlogPost, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        ...post,
        app_uuid: appUuid,  // ✓ Always include app context
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(appUuid: string, postId: string, updates: Partial<BlogPost>) {
    const { data, error } = await supabase
      .from('blog_posts')
      .update(updates)
      .eq('id', postId)
      .eq('app_uuid', appUuid)  // ✓ Prevent cross-app updates
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(appUuid: string, postId: string) {
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', postId)
      .eq('app_uuid', appUuid);  // ✓ Prevent cross-app deletes

    if (error) throw error;
  },
};
```

**Usage**
```typescript
// pages/blog/[slug].tsx
import { blogApi } from '@/lib/api/blog';
import { useApp } from '@/contexts/AppContext';

export default function BlogPost({ slug }: { slug: string }) {
  const { app_uuid } = useApp();
  const [post, setPost] = useState(null);

  useEffect(() => {
    blogApi.getBySlug(app_uuid, slug).then(setPost);
  }, [app_uuid, slug]);

  return <article>{/* ... */}</article>;
}
```

---

### Strategy C: Row Level Security (RLS) Policies

**Supabase RLS Policies**
```sql
-- blog_posts: Users can only read posts from their app
CREATE POLICY "Users can read own app posts" ON blog_posts
FOR SELECT
USING (
  app_uuid = (
    SELECT app_uuid FROM site_settings
    WHERE site_code = current_setting('app.site_code', true)
  )
);

-- Set app context in session
-- In your API middleware:
-- await supabase.rpc('set_app_context', { site_code: 'T2G' });
```

**Set App Context Function**
```sql
CREATE OR REPLACE FUNCTION set_app_context(site_code TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.site_code', site_code, false);
END;
$$ LANGUAGE plpgsql;
```

---

## Section 3: Breaking Changes

### Breaking Change 1: Unique Constraints

**What Changed**
- `blog_posts.slug`: Changed from unique to composite unique `(app_uuid, slug)`
- `page_settings.page_name`: Changed from unique to composite unique `(app_uuid, page_name)`

**Impact**
- INSERT statements must now include `app_uuid`
- Queries by slug/page_name must include `app_uuid`

**Migration Path**
```typescript
// Before (WILL FAIL after migration)
const { data } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('slug', 'my-post')
  .single();

// After (REQUIRED)
const { data } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('app_uuid', appUuid)
  .eq('slug', 'my-post')
  .single();
```

---

### Breaking Change 2: Required app_uuid for Inserts

**What Changed**
- Several tables now require `app_uuid` on INSERT:
  - `blog_posts`
  - `page_settings`
  - `workflows`
  - `campaigns`

**Impact**
- INSERT without `app_uuid` will fail with constraint violation

**Migration Path**
```typescript
// Before (WILL FAIL)
await supabase.from('blog_posts').insert({
  title: 'My Post',
  slug: 'my-post',
  content: '...',
});

// After (REQUIRED)
await supabase.from('blog_posts').insert({
  app_uuid: appUuid,  // ✓ REQUIRED
  title: 'My Post',
  slug: 'my-post',
  content: '...',
});
```

---

## Section 4: Testing Strategy

### Test 1: App Isolation

**Verify data doesn't leak between apps**
```typescript
describe('Multi-app isolation', () => {
  it('should not return posts from other apps', async () => {
    // Create post in T2G app
    const t2gUuid = 'uuid-for-t2g';
    await blogApi.create(t2gUuid, {
      title: 'T2G Post',
      slug: 't2g-post',
      content: 'Test',
      status: 'published',
    });

    // Query from VC_STUDIO app
    const vcStudioUuid = 'uuid-for-vc-studio';
    const posts = await blogApi.getAll(vcStudioUuid);

    // Should NOT include T2G post
    expect(posts.find(p => p.slug === 't2g-post')).toBeUndefined();
  });

  it('should allow same slug in different apps', async () => {
    const t2gUuid = 'uuid-for-t2g';
    const vcStudioUuid = 'uuid-for-vc-studio';

    // Create post with same slug in both apps
    const t2gPost = await blogApi.create(t2gUuid, {
      title: 'About Us (T2G)',
      slug: 'about-us',
      content: 'T2G content',
    });

    const vcStudioPost = await blogApi.create(vcStudioUuid, {
      title: 'About Us (VC Studio)',
      slug: 'about-us',
      content: 'VC Studio content',
    });

    // Both should succeed
    expect(t2gPost.slug).toBe('about-us');
    expect(vcStudioPost.slug).toBe('about-us');
    expect(t2gPost.id).not.toBe(vcStudioPost.id);
  });
});
```

---

### Test 2: Cross-App Security

**Verify updates/deletes are blocked across apps**
```typescript
describe('Cross-app security', () => {
  it('should prevent updating posts from other apps', async () => {
    const t2gUuid = 'uuid-for-t2g';
    const vcStudioUuid = 'uuid-for-vc-studio';

    // Create post in T2G
    const post = await blogApi.create(t2gUuid, {
      title: 'T2G Post',
      slug: 't2g-post',
      content: 'Original',
    });

    // Try to update from VC_STUDIO (should fail)
    await expect(
      blogApi.update(vcStudioUuid, post.id, { title: 'Hacked' })
    ).rejects.toThrow();

    // Verify post unchanged
    const unchanged = await blogApi.getBySlug(t2gUuid, 't2g-post');
    expect(unchanged.title).toBe('T2G Post');
  });

  it('should prevent deleting posts from other apps', async () => {
    const t2gUuid = 'uuid-for-t2g';
    const vcStudioUuid = 'uuid-for-vc-studio';

    // Create post in T2G
    const post = await blogApi.create(t2gUuid, {
      title: 'T2G Post',
      slug: 't2g-post',
      content: 'Test',
    });

    // Try to delete from VC_STUDIO (should not delete)
    await blogApi.delete(vcStudioUuid, post.id);

    // Verify post still exists
    const stillExists = await blogApi.getBySlug(t2gUuid, 't2g-post');
    expect(stillExists).toBeDefined();
  });
});
```

---

### Test 3: Backward Compatibility

**Verify existing functionality still works**
```typescript
describe('Backward compatibility', () => {
  it('should maintain existing query results', async () => {
    const vcStudioUuid = 'uuid-for-vc-studio';

    // This query should return same results as before
    // (assuming all existing data was backfilled to VC_STUDIO)
    const posts = await supabase
      .from('blog_posts')
      .select('*')
      .eq('app_uuid', vcStudioUuid)
      .eq('status', 'published');

    expect(posts.data.length).toBeGreaterThan(0);
  });
});
```

---

## Section 5: Deployment Checklist

### Pre-Deployment
- [ ] Run `PHASE-1a-Field-Extensions.sql` in staging environment
- [ ] Verify all tables have `app_uuid` column
- [ ] Confirm backfill completed successfully (check NULL counts)
- [ ] Test existing queries still return correct results

### Code Updates
- [ ] Add app context provider/middleware
- [ ] Update all database queries to include `app_uuid`
- [ ] Add app context to all INSERT statements
- [ ] Add app context to all UPDATE/DELETE WHERE clauses
- [ ] Update unique constraint handling (slug lookups, etc.)
- [ ] Create API wrapper functions with app context
- [ ] Add app context to authentication/session

### Testing
- [ ] Run app isolation tests
- [ ] Run cross-app security tests
- [ ] Run backward compatibility tests
- [ ] Test multi-app user experience
- [ ] Verify RLS policies (if implemented)
- [ ] Load test with multiple apps

### Monitoring
- [ ] Add logging for app_uuid in requests
- [ ] Monitor for NULL app_uuid occurrences
- [ ] Track query performance (new indexes)
- [ ] Alert on cross-app access attempts
- [ ] Audit app isolation in production logs

### Documentation
- [ ] Update API documentation with app_uuid requirements
- [ ] Document app context management strategy
- [ ] Create developer guide for multi-app queries
- [ ] Update database schema documentation
- [ ] Document RLS policies (if applicable)

---

## Section 6: Common Pitfalls

### Pitfall 1: Forgetting app_uuid in WHERE Clauses

**Problem**
```typescript
// WRONG: Updates ALL apps' enquiries with this ID
await supabase
  .from('enquiries')
  .update({ status: 'resolved' })
  .eq('id', enquiryId);
```

**Solution**
```typescript
// CORRECT: Only updates enquiry in current app
await supabase
  .from('enquiries')
  .update({ status: 'resolved' })
  .eq('id', enquiryId)
  .eq('app_uuid', appUuid);  // ✓ ALWAYS include app context
```

---

### Pitfall 2: Hardcoding app_uuid

**Problem**
```typescript
// WRONG: Hardcoded UUID breaks when testing/deploying
const APP_UUID = '123e4567-e89b-12d3-a456-426614174000';
```

**Solution**
```typescript
// CORRECT: Get from context/environment
const { app_uuid } = useApp();
// OR
const APP_UUID = process.env.NEXT_PUBLIC_APP_UUID;
```

---

### Pitfall 3: Not Testing Cross-App Scenarios

**Problem**
Testing only with single app doesn't catch isolation bugs.

**Solution**
Always test with at least 2 apps to verify isolation:
```typescript
// Create T2G data
await blogApi.create(t2gUuid, { ... });

// Query from VC_STUDIO
const posts = await blogApi.getAll(vcStudioUuid);

// Verify T2G data NOT returned
expect(posts.find(p => p.app_uuid === t2gUuid)).toBeUndefined();
```

---

### Pitfall 4: Mixing Global and App-Specific Data

**Problem**
Assuming all data is app-specific when some is global (stakeholders, functions_registry).

**Solution**
```typescript
// Functions can be global (NULL app_uuid) or app-specific
const functions = await supabase
  .from('functions_registry')
  .select('*')
  .or(`app_uuid.is.null,app_uuid.eq.${appUuid}`);  // ✓ Include global + app-specific
```

---

## Appendix A: Database Type Definitions

**Update TypeScript types to include app_uuid**

```typescript
// types/database.ts

export interface Database {
  public: {
    Tables: {
      site_settings: {
        Row: {
          id: string;
          app_uuid: string;  // ✓ NEW
          site_code: string;  // ✓ NEW
          domain_code: string;  // ✓ NEW
          is_active_app: boolean;  // ✓ NEW
          site_name: string;
          site_tagline: string | null;
          // ... other fields
        };
        Insert: {
          id?: string;
          app_uuid?: string;
          site_code: string;
          domain_code: string;
          site_name: string;
          // ... other fields
        };
      };
      blog_posts: {
        Row: {
          id: string;
          app_uuid: string;  // ✓ NEW
          title: string;
          slug: string;
          content: string;
          status: string;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          app_uuid: string;  // ✓ REQUIRED
          title: string;
          slug: string;
          content: string;
          status?: string;
          // ... other fields
        };
      };
      enquiries: {
        Row: {
          id: string;
          app_uuid: string | null;  // ✓ NEW (nullable for historical)
          name: string;
          email: string;
          message: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          app_uuid?: string;  // ✓ Should provide for new enquiries
          name: string;
          email: string;
          message: string;
          // ... other fields
        };
      };
      // ... other tables
    };
  };
}
```

---

## Appendix B: Supabase CLI Type Generation

**Regenerate types after schema changes**

```bash
# Generate TypeScript types from Supabase schema
npx supabase gen types typescript --project-id <your-project-id> > types/database.ts
```

**Or use environment variable**
```bash
export SUPABASE_PROJECT_ID=<your-project-id>
npm run generate-types
```

**package.json**
```json
{
  "scripts": {
    "generate-types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > types/database.ts"
  }
}
```

---

## Appendix C: Migration Checklist by File

### Files to Update

#### Configuration
- [ ] `.env` - Add APP_UUID, SITE_CODE, DOMAIN_CODE
- [ ] `next.config.js` - Add hostname-to-app mapping

#### Middleware
- [ ] `middleware.ts` - Add app context extraction
- [ ] `lib/supabase.ts` - Add app context helpers

#### Contexts
- [ ] `contexts/AppContext.tsx` - Create app context provider
- [ ] `contexts/AuthContext.tsx` - Add app context to auth

#### API Wrappers
- [ ] `lib/api/blog.ts` - Add app_uuid to all queries
- [ ] `lib/api/enquiries.ts` - Add app_uuid to all queries
- [ ] `lib/api/pages.ts` - Add app_uuid to all queries
- [ ] `lib/api/notifications.ts` - Add app_uuid to all queries

#### Components
- [ ] All components using Supabase - Add `const { app_uuid } = useApp()`
- [ ] All database queries - Add `.eq('app_uuid', app_uuid)`

#### Server Actions
- [ ] `app/actions/blog.ts` - Add app_uuid parameter
- [ ] `app/actions/enquiries.ts` - Add app_uuid parameter

#### API Routes
- [ ] `app/api/blog/route.ts` - Extract app context from request
- [ ] `app/api/enquiries/route.ts` - Extract app context from request

---

**End of Application Code Amendments Guide**

**Next Steps**:
1. Execute `PHASE-1a-Field-Extensions.sql`
2. Update application code following patterns above
3. Run comprehensive tests
4. Deploy to staging
5. Monitor for issues
6. Deploy to production

For questions or issues, refer to `PHASE-1a-COMPATIBILITY-AUDIT.md` for detailed schema analysis.
