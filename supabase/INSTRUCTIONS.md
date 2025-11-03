# Supabase RLS Policy Fix Instructions

## Problem
Infinite recursion detected in Supabase Row Level Security (RLS) policies on the users table, blocking all database queries.

## Solution
Run the SQL migration to fix the policies.

## Steps to Fix

### Option 1: Run in Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Run the SQL**
   - Open the file: `supabase/migrations/fix_rls_policies.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" or press Ctrl+Enter

4. **Verify Success**
   - Check the output at the bottom of the SQL Editor
   - You should see the verification queries showing your tables and policies
   - No errors should appear

### Option 2: Quick Disable (Development Only - NOT for Production)

If you just want to test quickly and deal with security later:

```sql
-- WARNING: This disables all security - only use in development!
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries DISABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts DISABLE ROW LEVEL SECURITY;
```

To re-enable later:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
```

## What the Fix Does

### Users Table
- ✅ Fixes infinite recursion by using direct comparison (`auth.uid() = id`)
- ✅ Allows authenticated users to read/update their own record only
- ✅ No circular policy references

### Enquiries Table
- ✅ Allows anonymous users to submit enquiries (contact form)
- ✅ Only authenticated users (admins) can read/update/delete enquiries
- ✅ Supports your admin dashboard

### Blog Posts Table
- ✅ Everyone can read blog posts (public)
- ✅ Only authenticated users (admins) can create/edit/delete posts
- ✅ Supports both public website and admin dashboard

## Testing After Fix

1. Refresh your application at http://localhost:3000
2. Navigate to the dashboard
3. Click on the "Enquiries" tab
4. Click "Refresh" button
5. Your enquiries should now appear
6. Check browser console - no more RLS errors

## Common Issues

### "permission denied for table users"
- RLS is enabled but no policies exist
- Run the migration SQL to create policies

### "new row violates row-level security policy"
- The WITH CHECK clause is too restrictive
- The migration fixes this with `WITH CHECK (true)` for appropriate operations

### Still seeing recursion errors
- Old policies weren't properly dropped
- Manually delete all policies in Supabase Dashboard > Database > Policies
- Then run the migration again

## Support

If you encounter issues:
1. Check the browser console for specific error messages
2. Check Supabase Dashboard > Database > Policies to see current policies
3. Check Supabase Dashboard > Logs to see query errors
