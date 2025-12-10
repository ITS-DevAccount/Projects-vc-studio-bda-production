# Homepage CTA Buttons Setup Guide

This guide explains how to configure hero CTA buttons on the homepage using the Page Editor system.

## Overview

The homepage hero section uses the same CTA placement system as all other pages. CTAs are managed through the Page Editor - no code changes or environment variables needed.

## How It Works

1. **Homepage is just another page** in the system
2. **Page Editor** manages which CTAs appear where
3. **Homepage queries** `/api/page-settings/{page_id}/cta-placements` for hero section CTAs
4. **All configuration** happens through the admin UI

## Setup Steps

### Step 1: Create CTA Buttons (if not already created)

1. Go to `/dashboard/admin/cta-buttons`
2. Click "Create New CTA Button"

**Create "Book a Call" Button:**
- **Label**: `Book a Call`
- **URL/Href**: `/book-call` (or your call scheduling URL)
- **Variant**: `primary`
- **Icon Name**: (optional)
- **Analytics Event**: `hero_book_call_clicked` (optional)
- Click "Create"

**Create "Learn More" Button:**
- **Label**: `Learn More`
- **URL/Href**: `/learn-more` (or relevant page)
- **Variant**: `outline`
- **Icon Name**: (optional)
- **Analytics Event**: `hero_learn_more_clicked` (optional)
- Click "Create"

### Step 2: Assign CTAs to Homepage via Page Editor

1. Navigate to `/dashboard/pages/editor`
2. Select the "Homepage" page (or the page with `page_name = 'home'`)
3. Scroll to the **"CTA Placements"** section
4. Click "Add CTA Button to Page"
5. **For "Book a Call":**
   - Select "Book a Call" from dropdown
   - Select Section: `hero`
   - Click "Add to Page"
6. **For "Learn More":**
   - Select "Learn More" from dropdown
   - Select Section: `hero`
   - Click "Add to Page"
7. The buttons will automatically sort by `sort_order` (you can reorder if needed)

### Step 3: Verify on Homepage

1. Navigate to homepage (`/`)
2. Verify both buttons appear in hero section
3. Check browser console for any errors
4. Click buttons to verify links work
5. Check console for analytics events (if configured)

## How to Update Buttons

**No code changes needed!** All updates happen through the admin UI:

1. **Change button text**: Edit CTA button in `/dashboard/admin/cta-buttons`
2. **Change button URL**: Edit CTA button href
3. **Change button order**: Reorder in Page Editor's CTA Placements section
4. **Add/remove buttons**: Use Page Editor's CTA Placements section
5. **Changes reflect immediately** on homepage after saving

## Fallback Behavior

If no hero placements exist for the homepage (page with `page_name = 'home'`), the homepage will show an empty button container. The homepage automatically uses the page settings record where `page_name = 'home'` - no environment variables needed.

## Troubleshooting

### Buttons Don't Appear

1. **Verify homepage page settings exist**:
   - Check that a page_settings record exists with `page_name = 'home'`
   - Verify the page is published (`is_published = true`)
   - Check browser console for warnings

2. **Verify placements exist**:
   - Go to Page Editor → CTA Placements section
   - Confirm buttons are assigned to `hero` section
   - Check `sort_order` values

3. **Check API response**:
   - Open DevTools → Network tab
   - Look for `/api/page-settings/{id}/cta-placements` request
   - Verify response includes hero section placements

### Wrong Button Order

- Go to Page Editor → CTA Placements section
- Reorder buttons (they sort by `sort_order`)
- Lower numbers appear first

### Analytics Not Tracking

- Verify `analytics_event` field is set on CTA button records
- Currently logs to console - integrate with your analytics service
- Edit `src/app/page.tsx` HeroButtons component to add analytics integration

## Architecture

**Component**: `HeroButtons` function in `src/app/page.tsx`

**API Endpoint**: `/api/page-settings/{page_settings_id}/cta-placements`

**Database Tables**:
- `cta_buttons` - Button definitions
- `page_cta_placements` - Button placements per page/section

**No Extra Files Needed**:
- ✅ No separate component files
- ✅ No config files
- ✅ No environment variables for CTA IDs
- ✅ Everything managed through Page Editor

## Benefits

✅ **Consistent**: Same system for all pages  
✅ **Simple**: All management through admin UI  
✅ **Scalable**: Works for PDA, ADA domains automatically  
✅ **Maintainable**: No code changes needed to update buttons  
✅ **Spec-compliant**: Matches approved architecture  

## Related Files

- `src/app/page.tsx` - Homepage with HeroButtons component
- `src/app/api/page-settings/[id]/cta-placements/route.ts` - Placements API
- `src/components/page-editor/CTAPlacementsSection.tsx` - Page Editor UI

