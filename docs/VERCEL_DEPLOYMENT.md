# Vercel Deployment Guide

## Quick Setup

### Method 1: Import Environment Variables (Recommended)

1. **Go to Vercel Dashboard**
   - Navigate to: Project → Settings → Environment Variables

2. **Import the .env.vercel file**
   - Click "Import .env" button (if available)
   - Or manually add each variable from `.env.vercel`

3. **Ensure all environments are selected**
   - ✅ Production
   - ✅ Preview
   - ✅ Development

4. **Redeploy**
   - Go to Deployments tab
   - Click Redeploy on latest deployment

### Method 2: Manual Configuration

Add these environment variables in Vercel:

| Variable Name | Value | Environments |
|--------------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ihebxuoyklkaimjtcwwq.supabase.co` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | See `.env.vercel` file | All |

## Important: Copy Values Carefully!

When copying the `NEXT_PUBLIC_SUPABASE_ANON_KEY`:
- ⚠️ **No extra spaces** before or after the value
- ⚠️ **No line breaks** or carriage returns (CR/LF)
- ⚠️ **Copy the entire key** - it's a long string
- ✅ Use Ctrl+A to select all, then Ctrl+C to copy from `.env.vercel`

## Common Issues

### "Failed to execute 'fetch' on 'Window': Invalid value"
**Cause**: Malformed environment variable (extra spaces, line breaks, or CR)

**Solution**:
1. Delete the variable in Vercel
2. Re-add it by carefully copying from `.env.vercel`
3. Ensure no extra whitespace
4. Redeploy

### "No data showing on deployed site"
**Cause**: Database hasn't been set up

**Solution**:
1. Go to Supabase SQL Editor
2. Run `supabase/insert_initial_data.sql`
3. Verify data exists with `SELECT * FROM page_settings WHERE page_name = 'home';`

### "Cannot login to admin dashboard"
**Cause**: No users exist in database

**Solution**:
1. Sign up through the deployed site's auth page
2. Or create user via Supabase Dashboard → Authentication → Add User

## Database Setup

After deploying, make sure to set up the database:

1. **Run migrations** in Supabase SQL Editor:
   ```sql
   -- Check if tables exist
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';
   ```

2. **Insert initial data** if needed:
   - Run `supabase/insert_initial_data.sql`

3. **Verify RLS policies**:
   - Run `supabase/diagnose_deployment.sql` to check everything

## Deployment Checklist

Before deploying:
- ✅ All code committed and pushed to GitHub
- ✅ Build passes locally (`npm run build`)
- ✅ Environment variables configured in Vercel
- ✅ Supabase database migrations run
- ✅ Initial data inserted in database
- ✅ RLS policies configured

After deploying:
- ✅ Site loads without errors
- ✅ Video/images load from database
- ✅ Can login to admin dashboard
- ✅ Content displays correctly

## Vercel Auto-Deploy

Vercel automatically deploys when you push to GitHub:
- **Main branch** → Production deployment
- **Other branches** → Preview deployments

To disable auto-deploy:
- Project Settings → Git → Deployment Protection

## Environment Variable Management

**Local Development:**
- Uses `.env.local` (not committed to git)
- Copy from `.env.example` and fill in values

**Vercel Deployment:**
- Uses environment variables set in Vercel dashboard
- Can import from `.env.vercel` file (kept locally, not committed)

**Security:**
- Never commit `.env.local` or `.env.vercel`
- Both are in `.gitignore`
- `.env.example` is safe to commit (no real values)

## Support

If deployment issues persist:
1. Check Vercel deployment logs
2. Check browser console on deployed site
3. Verify environment variables in Vercel dashboard
4. Test database connection with diagnostic SQL
