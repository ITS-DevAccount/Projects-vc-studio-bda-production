# Step 3: Update Database Queries - IN PROGRESS

**Status**: 2 of 9 files completed
**Priority**: High-security files first (DELETE/UPDATE operations)

---

## ✅ Completed Files

### 1. src/app/dashboard/page.tsx ✅
**Changes Made:**
- ✅ Added `useAppUuid()` hook import
- ✅ Added app_uuid filter to blog_posts SELECT (line 56)
- ✅ Added app_uuid filter to enquiries SELECT (line 80)
- ✅ Added app_uuid to DELETE blog_posts (line 108) - **SECURITY**
- ✅ Added app_uuid to DELETE enquiries (line 124) - **SECURITY**
- ✅ Added app_uuid to refreshBlogs() (line 167)
- ✅ Added app_uuid to refreshEnquiries() (line 144)
- ✅ Added dependency `[appUuid]` to useEffects

**Security Improvements:**
- Prevents deleting blog posts from other apps
- Prevents deleting enquiries from other apps
- Dashboard now only shows current app's data

---

### 2. src/app/dashboard/blog/[id]/page.tsx ✅
**Changes Made:**
- ✅ Added `useAppUuid()` hook import
- ✅ Added app_uuid filter to fetchBlog SELECT (line 37)
- ✅ Added app_uuid to UPDATE query (line 111) - **SECURITY**
- ✅ Added dependency `[appUuid]` to useEffect

**Security Improvements:**
- Prevents editing blog posts from other apps
- Prevents viewing blog posts from other apps
- Prevents cross-app UPDATE operations

---

## 🔄 Remaining Files (7 files)

### HIGH PRIORITY (4 files)

#### 3. src/app/dashboard/pages/editor/page.tsx
**Status**: PENDING
**Operations**: SELECT, INSERT, UPDATE, DELETE
**Tables**: page_settings, page_images
**Security Risk**: DELETE/UPDATE without app_uuid filtering
**Changes Needed:**
- Add `useAppUuid()` hook
- Add app_uuid to page_settings SELECT
- Add app_uuid to page_settings UPSERT
- Add app_uuid to page_images DELETE (SECURITY)
- page_images INSERT inherits from trigger (OK)

---

#### 4. src/app/dashboard/blog/new/page.tsx
**Status**: PENDING
**Operations**: INSERT
**Tables**: blog_posts
**Changes Needed:**
- Add `useAppUuid()` hook
- Add app_uuid to INSERT query

---

#### 5. src/app/page.tsx (Landing Page)
**Status**: PENDING
**Operations**: SELECT, INSERT
**Tables**: page_settings, page_images, blog_posts, enquiries
**Changes Needed:**
- Add `useAppUuid()` hook
- Add app_uuid to page_settings SELECT
- Add app_uuid to blog_posts SELECT
- Add app_uuid to enquiries INSERT

---

#### 6. src/app/dashboard/settings/branding/page.tsx
**Status**: PENDING
**Operations**: SELECT, INSERT, UPDATE
**Tables**: site_settings
**Changes Needed:**
- Add `useApp()` hook (needs site_code, not just uuid)
- Add site_code filter to SELECT
- Ensure UPSERT targets correct app

---

### MEDIUM PRIORITY (2 files)

#### 7. src/app/blog/[id]/page.tsx
**Status**: PENDING
**Operations**: SELECT
**Tables**: blog_posts
**Changes Needed:**
- Add `useAppUuid()` hook
- Add app_uuid filter to SELECT

---

#### 8. src/hooks/useTheme.ts
**Status**: PENDING
**Operations**: SELECT, SUBSCRIBE
**Tables**: site_settings
**Changes Needed:**
- Add `useApp()` hook (needs site_code)
- Add site_code filter to SELECT
- Filter realtime subscription to current app

---

### INFRASTRUCTURE (1 file)

#### 9. src/lib/supabase/client.ts
**Status**: NO CHANGES NEEDED ✅
**Reason**: Infrastructure only, app helpers already created

---

## Next Steps

1. **Continue with remaining HIGH PRIORITY files** (3-6)
2. **Update MEDIUM PRIORITY files** (7-8)
3. **Test the application** with current app (VC_STUDIO)
4. **Create test data** for a second app (T2G)
5. **Verify isolation** between apps

---

## How to Continue

Run through remaining files in this order:
1. `src/app/dashboard/pages/editor/page.tsx` (DELETE/UPDATE security)
2. `src/app/dashboard/blog/new/page.tsx` (INSERT)
3. `src/app/page.tsx` (Landing page - high visibility)
4. `src/app/dashboard/settings/branding/page.tsx` (Settings)
5. `src/app/blog/[id]/page.tsx` (Public blog detail)
6. `src/hooks/useTheme.ts` (Theme system)

---

## Testing Checklist (After All Updates)

- [ ] App loads without errors
- [ ] Dashboard shows only current app's blogs
- [ ] Dashboard shows only current app's enquiries
- [ ] Can create new blog post (assigned to current app)
- [ ] Can edit blog post (only from current app)
- [ ] Can delete blog post (only from current app)
- [ ] Cannot delete posts from other apps
- [ ] Landing page shows current app's content
- [ ] Branding settings load correctly
- [ ] Theme loads for current app

---

**Ready to continue? Let me know and I'll update the remaining files!**
