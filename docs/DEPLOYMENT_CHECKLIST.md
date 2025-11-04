# Deployment Checklist for Vercel

## Prerequisites
- ✅ Code pushed to GitHub
- ✅ Vercel project connected to GitHub repository
- ✅ Environment variables configured in Vercel

## Database Setup (Required First!)

Your deployment is live but showing no data because the database hasn't been set up yet. Follow these steps:

### 1. Run Database Migrations

Go to your **Supabase SQL Editor** at: https://ihebxuoyklkaimjtcwwq.supabase.co/project/ihebxuoyklkaimjtcwwq/sql

Run these SQL scripts **in order**:

#### Step 1: Create Tables (if not already done)
Run the entire contents of: `supabase/migrations/create_page_editor_tables.sql`

This creates:
- `page_settings` table for homepage content
- `page_images` table for gallery images

#### Step 2: Fix RLS Policies and Add Initial Data
Run the entire contents of: `supabase/fix_page_settings_access.sql`

This will:
- Set up Row Level Security policies
- Allow anonymous users to read published pages
- Allow authenticated users full access
- Insert initial home page data (if it doesn't exist)

#### Step 3: Create Site Settings Table
Run the entire contents of: `supabase/migrations/create_site_settings_table.sql`

This creates:
- `site_settings` table for branding/theming

### 2. Verify Tables Exist

Run this query in Supabase SQL Editor:

```sql
-- Check if all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('page_settings', 'page_images', 'site_settings', 'users', 'enquiries', 'blog_posts')
ORDER BY table_name;
```

You should see:
- blog_posts
- enquiries
- page_images
- page_settings
- site_settings
- users

### 3. Check RLS Policies

Run this query to verify policies are set up:

```sql
-- Check RLS policies
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 4. Verify Initial Data

Run these queries to check if data exists:

```sql
-- Check page_settings
SELECT page_name, is_published, hero_title
FROM page_settings;

-- Check if users table has data
SELECT id, email, full_name
FROM users;

-- Check blog posts
SELECT title, status
FROM blog_posts;

-- Check enquiries
SELECT name, subject, status
FROM enquiries;
```

### 5. Create Your First User (if needed)

If you don't have any users, you need to sign up through Supabase Auth:

**Option A: Use Supabase Auth UI**
1. Go to your deployed site: `https://your-site.vercel.app/auth/login`
2. Click "Sign Up" (if you have a sign-up page)
3. Create an account with your email

**Option B: Create user via SQL**
```sql
-- This only works if you have the user's auth.users ID
-- You'll need to sign up first through the auth flow
```

**Option C: Use Supabase Dashboard**
1. Go to **Authentication** → **Users** in Supabase Dashboard
2. Click **Invite User** or **Add User**
3. Enter email and password
4. After user is created in auth.users, insert into your users table:

```sql
-- Replace with actual auth user ID and details
INSERT INTO users (id, email, full_name, role)
VALUES (
  'auth-user-id-from-auth-users-table',
  'your-email@example.com',
  'Your Name',
  'admin'
);
```

## Common Issues

### Issue: "No data showing on deployed site"

**Cause**: Database tables haven't been created or RLS policies are blocking access

**Solution**:
1. Run all migrations (steps above)
2. Check RLS policies allow anonymous read access
3. Verify `is_published = true` for page_settings

### Issue: "Cannot login to admin dashboard"

**Cause**: No users exist in the database

**Solution**:
1. Sign up through the auth flow on your site
2. Or create user via Supabase Dashboard → Authentication

### Issue: "Video not loading"

**Cause**: No page_settings data for 'home' page

**Solution**:
Run this query:

```sql
-- Check if home page exists
SELECT * FROM page_settings WHERE page_name = 'home';

-- If empty, run the fix_page_settings_access.sql script
```

## Environment Variables Checklist

Make sure these are set in **Vercel** → **Settings** → **Environment Variables**:

- ✅ `NEXT_PUBLIC_SUPABASE_URL` = `https://ihebxuoyklkaimjtcwwq.supabase.co`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `your-anon-key`

## Post-Deployment Verification

After setting up the database, verify everything works:

1. **Homepage** (`/`):
   - ✅ Video loads from database
   - ✅ Logo appears
   - ✅ Gallery images show
   - ✅ Blog posts display

2. **Auth** (`/auth/login`):
   - ✅ Can navigate to login page
   - ✅ Can log in with credentials

3. **Dashboard** (`/dashboard`):
   - ✅ Can access after login
   - ✅ Enquiries load
   - ✅ Users list shows

4. **Page Editor** (`/dashboard/pages/editor`):
   - ✅ Current settings load
   - ✅ Can edit and save
   - ✅ Changes reflect on homepage

## Quick Setup Script

Run this entire script in Supabase SQL Editor for a fresh setup:

```sql
-- 1. Verify tables exist
SELECT 'Tables:' as info, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('page_settings', 'page_images', 'site_settings');

-- 2. Check RLS status
SELECT 'RLS Status:' as info, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- 3. If page_settings is empty, insert home page
INSERT INTO page_settings (
  page_name, hero_video_url, hero_video_public_id,
  hero_title, hero_subtitle, is_published
)
SELECT 'home',
  'https://res.cloudinary.com/demo/video/upload',
  'sea-turtle',
  'Value Chain Studio',
  'Systematic business transformation',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM page_settings WHERE page_name = 'home'
);

-- 4. Verify data
SELECT 'Home Page Data:' as info, * FROM page_settings WHERE page_name = 'home';
```

## Need Help?

If issues persist:
1. Check browser console for errors
2. Check Supabase logs: **Project Settings** → **Logs**
3. Verify RLS policies aren't blocking access
4. Ensure `is_published = true` for content you want visible
