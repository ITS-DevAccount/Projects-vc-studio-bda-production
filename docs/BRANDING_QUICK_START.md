# Branding System - Quick Start Guide

## 5-Minute Setup

### Step 1: Run Database Migration (1 minute)

1. Open Supabase SQL Editor
2. Copy contents of `supabase/migrations/create_site_settings_table.sql`
3. Paste and run
4. Verify: Table Editor should show `site_settings` with 1 row

### Step 2: Configure Your Branding (3 minutes)

1. **Access Admin**:
   - Go to `http://localhost:3002/auth/login`
   - Log in with your admin credentials
   - Navigate to Dashboard → Pages tab
   - Click "Branding & Theme Settings"

2. **Upload Logo**:
   - Upload your logo to Cloudinary
   - Copy the full URL
   - Paste into "Logo Public ID or Full URL" field
   - Set width (recommended: 180px) and height (recommended: 60px)

3. **Set Colors**:
   - Click each color picker
   - Choose your brand colors
   - Watch live preview update

4. **Save**:
   - Click "Save Changes"
   - Theme updates site-wide instantly!

### Step 3: Verify (1 minute)

1. Visit home page - Logo should appear in navigation
2. Visit `/auth/login` - Logo should appear
3. Check all pages - Colors should match your theme

## That's It!

Your site now has:
- ✅ Custom logo across all pages
- ✅ Brand colors site-wide
- ✅ Easy-to-update branding
- ✅ Real-time theme updates
- ✅ Database-driven configuration

## Next Steps

- Read full documentation: `docs/BRANDING_SYSTEM.md`
- Customize more colors
- Add favicon
- Configure typography

## Need Help?

**Logo not showing?**
- Check Cloudinary URL is public
- Verify dimensions are reasonable (max 300px)
- Clear browser cache

**Colors not updating?**
- Hard refresh (Ctrl+Shift+R)
- Check you clicked "Save Changes"
- Verify you're logged in

## Quick Reference

- **Admin URL**: `/dashboard/settings/branding`
- **Database Table**: `site_settings`
- **Logo Component**: `import Logo from '@/components/branding/Logo'`
- **Theme Hook**: `import { useTheme } from '@/hooks/useTheme'`
- **CSS Variables**: `var(--color-primary)`, `var(--color-secondary)`, etc.

---

**Complete documentation**: `docs/BRANDING_SYSTEM.md`
