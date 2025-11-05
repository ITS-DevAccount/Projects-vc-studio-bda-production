# Application Code Audit - Multi-App Compatibility

**Date**: 2025-11-04
**Status**: Database migration complete, application code needs updates
**Purpose**: Identify all files that need updating for multi-app support

---

## Executive Summary

**Files Found**: 9 files making Supabase database queries
**Tables Affected**: 5 tables (site_settings, page_settings, page_images, blog_posts, enquiries)
**Priority Level**: HIGH - All queries need app_uuid filtering
**Breaking Changes**: None (backward compatible with current data)

---

## Critical Files Requiring Updates

### 🔴 HIGH PRIORITY (Core Functionality)

#### 1. `src/app/page.tsx` - Landing Page
**Location**: `C:\Users\ian\ITS-Development\Projects\vc-studio-bda-production\src\app\page.tsx`
**Operations**: SELECT, INSERT
**Tables**: page_settings, page_images, blog_posts, enquiries

**Current Queries:**
```typescript
// page_settings - NEEDS app_uuid filter
const { data: pageData } = await supabase
  .from('page_settings')
  .select('*')
  .eq('page_name', 'home')
  .eq('is_published', true)
  .single();

// page_images - NEEDS app_uuid filter
const { data: images } = await supabase
  .from('page_images')
  .select('*')
  .eq('page_settings_id', pageData.id)
  .eq('is_active', true)
  .order('display_order');

// blog_posts - NEEDS app_uuid filter
const { data: posts } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('status', 'published')
  .eq('is_featured', true)
  .order('published_at', { ascending: false })
  .limit(3);

// enquiries - NEEDS app_uuid on INSERT
const { error } = await supabase
  .from('enquiries')
  .insert({
    name, email, phone, message, status: 'new'
  });
```

**Required Changes:**
- Add app_uuid filter to page_settings query
- Add app_uuid filter to blog_posts query
- Add app_uuid to enquiries INSERT
- page_images inherits from page_settings (OK)

**Impact**: Homepage will show wrong content if multiple apps exist

---

#### 2. `src/app/dashboard/page.tsx` - Admin Dashboard
**Location**: `C:\Users\ian\ITS-Development\Projects\vc-studio-bda-production\src\app\dashboard\page.tsx`
**Operations**: SELECT, DELETE
**Tables**: blog_posts, enquiries

**Current Queries:**
```typescript
// blog_posts - NEEDS app_uuid filter
const { data: posts } = await supabase
  .from('blog_posts')
  .select('*')
  .order('created_at', { ascending: false });

// enquiries - NEEDS app_uuid filter
const { data: enquiries } = await supabase
  .from('enquiries')
  .select('*')
  .order('created_at', { ascending: false });

// DELETE - NEEDS app_uuid in WHERE clause (SECURITY!)
await supabase
  .from('blog_posts')
  .delete()
  .eq('id', postId);

await supabase
  .from('enquiries')
  .delete()
  .eq('id', enquiryId);
```

**Required Changes:**
- Add app_uuid filter to all SELECT queries
- Add app_uuid to DELETE WHERE clauses (prevent cross-app deletion)

**Impact**: Dashboard will show data from ALL apps, deletion could affect wrong app

---

#### 3. `src/app/dashboard/blog/new/page.tsx` - Blog Creation
**Location**: `C:\Users\ian\ITS-Development\Projects\vc-studio-bda-production\src\app\dashboard\blog\new\page.tsx`
**Operations**: INSERT
**Tables**: blog_posts

**Current Query:**
```typescript
// NEEDS app_uuid on INSERT
const { error } = await supabase
  .from('blog_posts')
  .insert({
    title, excerpt, content, featured_image_url,
    is_featured, status, published_at, slug
  });
```

**Required Changes:**
- Add app_uuid to INSERT

**Impact**: New blog posts won't be assigned to correct app

---

#### 4. `src/app/dashboard/blog/[id]/page.tsx` - Blog Editor
**Location**: `C:\Users\ian\ITS-Development\Projects\vc-studio-bda-production\src\app\dashboard\blog\[id]\page.tsx`
**Operations**: SELECT, UPDATE
**Tables**: blog_posts

**Current Queries:**
```typescript
// SELECT - NEEDS app_uuid filter
const { data: post } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('id', id)
  .single();

// UPDATE - NEEDS app_uuid in WHERE (SECURITY!)
const { error } = await supabase
  .from('blog_posts')
  .update({ title, excerpt, content, ... })
  .eq('id', id);
```

**Required Changes:**
- Add app_uuid filter to SELECT
- Add app_uuid to UPDATE WHERE clause (prevent cross-app updates)

**Impact**: Could edit/view posts from other apps

---

#### 5. `src/app/dashboard/pages/editor/page.tsx` - Front Page Editor
**Location**: `C:\Users\ian\ITS-Development\Projects\vc-studio-bda-production\src\app\dashboard\pages\editor\page.tsx`
**Operations**: SELECT, INSERT, UPDATE, DELETE
**Tables**: page_settings, page_images

**Current Queries:**
```typescript
// page_settings SELECT - NEEDS app_uuid filter
const { data: pageData } = await supabase
  .from('page_settings')
  .select('*, page_images(*)')
  .eq('page_name', 'home')
  .single();

// page_settings INSERT/UPDATE - NEEDS app_uuid
const { data, error } = await supabase
  .from('page_settings')
  .upsert({
    page_name: 'home',
    hero_title, hero_subtitle, ...
  });

// page_images DELETE - NEEDS app_uuid (SECURITY!)
await supabase
  .from('page_images')
  .delete()
  .eq('page_settings_id', pageSettingsId);

// page_images INSERT - inherits app_uuid from page_settings via trigger
const { error } = await supabase
  .from('page_images')
  .insert(imagesToInsert);
```

**Required Changes:**
- Add app_uuid filter to page_settings SELECT
- Add app_uuid to page_settings UPSERT
- Add app_uuid to page_images DELETE (security)
- page_images INSERT OK (trigger auto-fills)

**Impact**: Could edit pages from other apps

---

#### 6. `src/app/dashboard/settings/branding/page.tsx` - Branding Settings
**Location**: `C:\Users\ian\ITS-Development\Projects\vc-studio-bda-production\src\app\dashboard\settings\branding\page.tsx`
**Operations**: SELECT, INSERT, UPDATE
**Tables**: site_settings

**Current Queries:**
```typescript
// SELECT - NEEDS site_code or app_uuid filter
const { data: settings } = await supabase
  .from('site_settings')
  .select('*')
  .eq('is_active', true)
  .single();

// UPDATE/INSERT - NEEDS to target specific app
const { error } = await supabase
  .from('site_settings')
  .upsert({
    site_name, site_tagline, logo_url, ...colors
  });
```

**Required Changes:**
- Add site_code or app_uuid filter to SELECT
- Ensure UPSERT targets correct app record

**Impact**: Could update branding for wrong app

---

### 🟡 MEDIUM PRIORITY (Public-Facing)

#### 7. `src/app/blog/[id]/page.tsx` - Blog Detail Page
**Location**: `C:\Users\ian\ITS-Development\Projects\vc-studio-bda-production\src\app\blog\[id]\page.tsx`
**Operations**: SELECT
**Tables**: blog_posts

**Current Query:**
```typescript
// NEEDS app_uuid filter
const { data: post } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('id', id)
  .single();
```

**Required Changes:**
- Add app_uuid filter (or use slug with composite unique)

**Impact**: Could show blog posts from other apps

---

### 🟢 LOW PRIORITY (Infrastructure)

#### 8. `src/hooks/useTheme.ts` - Theme Hook
**Location**: `C:\Users\ian\ITS-Development\Projects\vc-studio-bda-production\src\hooks\useTheme.ts`
**Operations**: SELECT, SUBSCRIBE
**Tables**: site_settings

**Current Queries:**
```typescript
// SELECT - NEEDS site_code or app_uuid filter
const { data } = await supabase
  .from('site_settings')
  .select('*')
  .eq('is_active', true)
  .single();

// SUBSCRIBE - NEEDS to filter to current app
const subscription = supabase
  .channel('site_settings_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'site_settings'
  }, handleChange)
  .subscribe();
```

**Required Changes:**
- Add site_code/app_uuid filter to both SELECT and SUBSCRIBE
- Filter subscription to only current app's settings

**Impact**: Theme could change based on other apps' branding updates

---

#### 9. `src/lib/supabase/client.ts` - Supabase Client
**Location**: `C:\Users\ian\ITS-Development\Projects\vc-studio-bda-production\src\lib\supabase\client.ts`
**Operations**: Client initialization
**Tables**: None

**Current Implementation:**
```typescript
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

**Required Changes:**
- No changes needed to client itself
- Add app context helper functions here

**Impact**: None (infrastructure only)

---

## Tables Not Currently Used

These tables exist in database but have NO application code yet:
- ❌ stakeholders
- ❌ relationships
- ❌ notifications
- ❌ workflows
- ❌ campaigns
- ❌ capabilities
- ❌ stakeholder_capabilities
- ❌ function_calls_log
- ❌ AI agent tables
- ❌ configuration
- ❌ users

**Action**: When you build features for these tables, ensure they include app_uuid from the start.

---

## Query Pattern Summary

### Current Pattern (Single App)
```typescript
// SELECT
const { data } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('status', 'published');

// INSERT
await supabase
  .from('blog_posts')
  .insert({ title, content });

// UPDATE
await supabase
  .from('blog_posts')
  .update({ title })
  .eq('id', postId);

// DELETE
await supabase
  .from('blog_posts')
  .delete()
  .eq('id', postId);
```

### Required Pattern (Multi-App)
```typescript
// Need app context available
const { app_uuid } = useApp(); // or from middleware

// SELECT - Add app_uuid filter
const { data } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('app_uuid', app_uuid)
  .eq('status', 'published');

// INSERT - Include app_uuid
await supabase
  .from('blog_posts')
  .insert({ app_uuid, title, content });

// UPDATE - Add app_uuid to WHERE
await supabase
  .from('blog_posts')
  .update({ title })
  .eq('id', postId)
  .eq('app_uuid', app_uuid); // CRITICAL for security

// DELETE - Add app_uuid to WHERE
await supabase
  .from('blog_posts')
  .delete()
  .eq('id', postId)
  .eq('app_uuid', app_uuid); // CRITICAL for security
```

---

## Security Concerns

### 🚨 CRITICAL: Cross-App Data Modification

**Without app_uuid in WHERE clauses, users could:**
- Update blog posts from other apps
- Delete enquiries from other apps
- Modify page settings for other apps

**Files with DELETE operations:**
- `src/app/dashboard/page.tsx` (blog_posts, enquiries)
- `src/app/dashboard/pages/editor/page.tsx` (page_images)

**Files with UPDATE operations:**
- `src/app/dashboard/blog/[id]/page.tsx` (blog_posts)
- `src/app/dashboard/pages/editor/page.tsx` (page_settings)
- `src/app/dashboard/settings/branding/page.tsx` (site_settings)

**All UPDATE and DELETE queries MUST include app_uuid in WHERE clause!**

---

## Implementation Strategy

### Phase 1: Add App Context (Step 2 in plan)
- Create app context provider
- Add middleware to detect current app
- Make app_uuid available throughout application

### Phase 2: Update Queries (Step 3 in plan)
- Start with HIGH priority files
- Add app_uuid to all SELECT, INSERT, UPDATE, DELETE
- Test each file after updating

### Phase 3: Testing (Step 4 in plan)
- Test with single app (VC_STUDIO) - should work unchanged
- Add second app (T2G) - verify data isolation
- Test cross-app security (can't modify other app's data)

---

## Next Steps

1. ✅ Database migration complete
2. ⏳ **Create app context provider** (Step 2)
3. ⏳ **Update queries in 9 files** (Step 3)
4. ⏳ **Test multi-app functionality** (Step 4)

---

## File Update Checklist

- [ ] `src/app/page.tsx` - Landing page queries
- [ ] `src/app/dashboard/page.tsx` - Dashboard queries + DELETE security
- [ ] `src/app/dashboard/blog/new/page.tsx` - Blog creation
- [ ] `src/app/dashboard/blog/[id]/page.tsx` - Blog editor + UPDATE security
- [ ] `src/app/dashboard/pages/editor/page.tsx` - Page editor + DELETE/UPDATE security
- [ ] `src/app/dashboard/settings/branding/page.tsx` - Branding settings
- [ ] `src/app/blog/[id]/page.tsx` - Blog detail page
- [ ] `src/hooks/useTheme.ts` - Theme subscription
- [ ] Test all changes with VC_STUDIO app
- [ ] Add second app and verify isolation

---

**End of Audit Report**
**Ready to proceed to Step 2: Create App Context Provider**
