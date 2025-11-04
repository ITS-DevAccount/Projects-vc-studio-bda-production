# Branding & Theme Configuration System

## Overview

This document explains the comprehensive branding and theme configuration system implemented in VC Studio. This system allows you to configure site-wide colors, logos, and branding through a database-driven admin interface.

## Architecture

### Components

1. **Database Table**: `site_settings` - Stores all branding configuration
2. **React Hook**: `useTheme()` - Reads and subscribes to theme settings
3. **Provider**: `ThemeProvider` - Applies CSS variables site-wide
4. **Logo Component**: Displays configured logo across all pages
5. **Admin Interface**: `/dashboard/settings/branding` - Configure all settings

### Data Flow

```
Supabase Database (site_settings table)
         ↓
  useTheme() Hook
         ↓
  ThemeProvider Component
         ↓
  CSS Variables (applied to :root)
         ↓
  All Components Use Variables
```

---

## Installation & Setup

### Step 1: Create Database Table

Run the migration in your Supabase SQL Editor:

```bash
# File location
supabase/migrations/create_site_settings_table.sql
```

This creates:
- `site_settings` table with all color, logo, and branding fields
- RLS policies (public read for active settings, authenticated for management)
- Triggers for auto-updating timestamps
- Trigger to ensure only one active setting at a time
- Default seed data

### Step 2: Verify Installation

1. Go to your Supabase dashboard
2. Navigate to Table Editor
3. Verify `site_settings` table exists
4. Check that one row exists with `is_active = true`

---

## Configuration

### Accessing the Branding Admin

1. Log in to your admin dashboard: `/auth/login`
2. Navigate to Dashboard
3. Click on "Pages" tab
4. Click "Branding & Theme Settings"
5. Or go directly to: `/dashboard/settings/branding`

### Configuring the Logo

#### Option 1: Full URL (Easier)
1. Upload your logo to Cloudinary
2. Copy the full URL (e.g., `https://res.cloudinary.com/your-cloud/image/upload/v123/logo.png`)
3. In the branding admin:
   - **Logo Public ID or Full URL**: Paste full URL
   - **Logo URL or Base URL**: Leave empty or add base URL
   - **Logo Width**: Set desired width in pixels (e.g., 180)
   - **Logo Height**: Set desired height in pixels (e.g., 60)

#### Option 2: Base URL + Public ID (Advanced)
1. Upload your logo to Cloudinary
2. Split the URL:
   - **Base URL**: `https://res.cloudinary.com/your-cloud/image/upload`
   - **Public ID**: `v123/logo` or `logo_file_id`
3. Enter both parts in the admin interface

### Configuring Colors

The branding admin provides color pickers for:

#### Primary Brand Colors
- **Primary Color**: Main brand color (buttons, links, accents)
- **Primary Hover**: Hover state for primary elements
- **Secondary Color**: Secondary brand color
- **Secondary Hover**: Hover state for secondary elements

#### Background Colors
- **Main Background**: Page background color
- **Subtle Background**: Alternate background for variety

#### Section Colors
- **Light Section**: Light section backgrounds
- **Subtle Section**: Subtle section backgrounds
- **Emphasis Section**: Emphasized/dark sections
- **Section Border**: Borders between sections

#### Text Colors
- **Primary Text**: Main text color
- **Secondary Text**: Secondary text (less emphasis)
- **Muted Text**: Muted/subtle text
- **Light Text**: Very light text (for dark backgrounds)

#### Semantic Colors
- **Success**: Success states, confirmations
- **Error**: Error states, warnings
- **Warning**: Warning states
- **Info**: Information states

### Saving Changes

1. Make your changes in the admin interface
2. Use the live preview panel to see changes
3. Click "Save Changes"
4. Theme will update automatically across all pages

---

## Usage in Code

### Using the Logo Component

The Logo component automatically displays your configured logo:

```tsx
import Logo from '@/components/branding/Logo';

// Default variant (full logo)
<Logo variant="default" linkTo="/" />

// Compact variant (smaller)
<Logo variant="compact" linkTo="/" />

// Icon only (just logo, no text)
<Logo variant="icon-only" linkTo="/" />

// With tagline
<Logo variant="default" showTagline={true} />
```

**Variants:**
- `default`: Full size logo (h-12)
- `compact`: Smaller logo (h-8)
- `icon-only`: Logo icon only (h-10 w-10)

**Props:**
- `variant`: Display variant
- `linkTo`: URL to link to (default: '/')
- `showTagline`: Show site tagline below logo
- `className`: Additional CSS classes

### Using the useTheme Hook

Access theme settings programmatically:

```tsx
import { useTheme } from '@/hooks/useTheme';

function MyComponent() {
  const { settings, loading, error } = useTheme();

  return (
    <div style={{ color: settings.primary_color }}>
      {settings.site_name}
    </div>
  );
}
```

**Hook Returns:**
- `settings`: Complete site settings object
- `loading`: Boolean indicating if settings are loading
- `error`: Error message if fetch failed
- `refreshSettings()`: Manually refresh settings
- `applyTheme()`: Manually reapply theme

### Using CSS Variables

The ThemeProvider automatically applies all colors as CSS variables:

```css
/* In your CSS or Tailwind */
.my-button {
  background-color: var(--color-primary);
  color: white;
}

.my-button:hover {
  background-color: var(--color-primary-hover);
}
```

**Available CSS Variables:**

Colors:
- `--color-primary`
- `--color-primary-hover`
- `--color-secondary`
- `--color-secondary-hover`
- `--color-background`
- `--color-background-subtle`
- `--color-section-light`
- `--color-section-subtle`
- `--color-section-emphasis`
- `--color-section-border`
- `--color-text-primary`
- `--color-text-secondary`
- `--color-text-muted`
- `--color-text-light`
- `--color-success`
- `--color-error`
- `--color-warning`
- `--color-info`

Typography:
- `--font-heading`
- `--font-body`

Other:
- `--border-radius`

---

## Implementation Details

### File Structure

```
src/
├── components/
│   ├── branding/
│   │   └── Logo.tsx              # Logo component
│   └── providers/
│       └── ThemeProvider.tsx     # Theme provider
├── hooks/
│   └── useTheme.ts               # Theme hook
├── app/
│   ├── layout.tsx                # Root layout with ThemeProvider
│   ├── page.tsx                  # Home page with Logo
│   ├── auth/
│   │   └── login/page.tsx        # Login page with Logo
│   └── dashboard/
│       ├── page.tsx              # Dashboard with branding link
│       └── settings/
│           └── branding/
│               └── page.tsx      # Branding admin interface
└── supabase/
    └── migrations/
        └── create_site_settings_table.sql

docs/
└── BRANDING_SYSTEM.md            # This documentation
```

### Database Schema

```sql
CREATE TABLE site_settings (
  id UUID PRIMARY KEY,
  site_name VARCHAR(200),
  site_tagline TEXT,
  logo_url TEXT,
  logo_public_id TEXT,
  logo_width INTEGER,
  logo_height INTEGER,
  favicon_url TEXT,
  primary_color VARCHAR(7),
  primary_hover VARCHAR(7),
  secondary_color VARCHAR(7),
  secondary_hover VARCHAR(7),
  background_color VARCHAR(7),
  background_subtle VARCHAR(7),
  section_light VARCHAR(7),
  section_subtle VARCHAR(7),
  section_emphasis VARCHAR(7),
  section_border VARCHAR(7),
  text_primary VARCHAR(7),
  text_secondary VARCHAR(7),
  text_muted VARCHAR(7),
  text_light VARCHAR(7),
  success_color VARCHAR(7),
  error_color VARCHAR(7),
  warning_color VARCHAR(7),
  info_color VARCHAR(7),
  font_heading VARCHAR(100),
  font_body VARCHAR(100),
  border_radius VARCHAR(20),
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID
);
```

### Real-Time Updates

The system uses Supabase Realtime to automatically update when settings change:

1. Admin changes settings in `/dashboard/settings/branding`
2. Changes saved to `site_settings` table
3. `useTheme()` hook subscribes to changes
4. All components using the hook automatically re-render
5. `ThemeProvider` updates CSS variables
6. Entire site reflects new theme instantly

---

## Replicating for New Domain/Application

### Quick Setup Checklist

- [ ] Run `create_site_settings_table.sql` migration in Supabase
- [ ] Verify table created with default data
- [ ] Copy `src/hooks/useTheme.ts` to your project
- [ ] Copy `src/components/providers/ThemeProvider.tsx`
- [ ] Copy `src/components/branding/Logo.tsx`
- [ ] Copy `src/app/dashboard/settings/branding/page.tsx`
- [ ] Add `<ThemeProvider>` to your root layout
- [ ] Replace hardcoded logos with `<Logo>` component
- [ ] Update colors to use CSS variables
- [ ] Configure branding in admin interface
- [ ] Upload logo to Cloudinary
- [ ] Test on all pages

### Per-Domain Customization

The system is designed to support multi-domain deployments:

1. **Option A**: One setting per domain
   - Add `domain` field to `site_settings` table
   - Filter by domain in `useTheme()` hook
   - Each domain gets its own branding

2. **Option B**: Environment-based
   - Use environment variables to determine active setting
   - Different settings for dev/staging/production

3. **Option C**: Multiple active settings
   - Remove unique constraint on `is_active`
   - Add domain routing logic
   - Each subdomain uses different branding

### Migration for Existing Projects

1. **Backup existing theme config**
2. **Run database migration**
3. **Copy new components/hooks**
4. **Update root layout** with ThemeProvider
5. **Find/replace hardcoded logos** with Logo component
6. **Find/replace hardcoded colors** with CSS variables
7. **Test thoroughly** on all pages
8. **Configure branding** via admin interface

---

## Common Tasks

### Adding a New Color

1. Add column to `site_settings` table:
```sql
ALTER TABLE site_settings ADD COLUMN my_new_color VARCHAR(7) DEFAULT '#000000';
```

2. Update TypeScript interface in `useTheme.ts`:
```typescript
export interface SiteSettings {
  // ... existing fields
  my_new_color: string;
}
```

3. Add to ThemeProvider CSS variable application:
```typescript
root.style.setProperty('--color-my-new', settings.my_new_color);
```

4. Add color picker to branding admin page
5. Use in components: `var(--color-my-new)`

### Changing Logo Size

1. Go to `/dashboard/settings/branding`
2. Update "Logo Width" and "Logo Height" fields
3. Click "Save Changes"
4. Logo size updates across all pages

### Adding Logo to New Page

```tsx
import Logo from '@/components/branding/Logo';

export default function MyPage() {
  return (
    <nav>
      <Logo variant="compact" linkTo="/" />
      {/* Rest of navigation */}
    </nav>
  );
}
```

---

## Troubleshooting

### Logo Not Displaying

1. Check console for image loading errors
2. Verify Cloudinary URL is correct
3. Check logo dimensions are reasonable
4. Verify `is_active = true` in database
5. Clear browser cache

### Colors Not Updating

1. Check `useTheme()` hook is fetching data
2. Verify ThemeProvider is in root layout
3. Check browser DevTools > Elements > :root for CSS variables
4. Hard refresh browser (Ctrl+Shift+R)
5. Check RLS policies allow reading `site_settings`

### Theme Changes Not Saving

1. Verify user is authenticated
2. Check browser console for errors
3. Verify RLS policies allow updates
4. Check `updated_by` is set correctly
5. Verify only one setting is active

### Multiple Active Settings

Only one setting should be active at a time. To fix:

```sql
-- Deactivate all
UPDATE site_settings SET is_active = false;

-- Activate desired one
UPDATE site_settings SET is_active = true WHERE id = 'your-setting-id';
```

---

## Security Considerations

### RLS Policies

- **Public Read**: Anyone can read active settings (required for public site)
- **Authenticated Read All**: Logged-in users can see all settings
- **Authenticated Write**: Only logged-in users can create/update/delete

### Recommendations

1. **Limit Admin Access**: Only grant admin access to trusted users
2. **Validate Cloudinary URLs**: Ensure URLs are from your Cloudinary account
3. **Sanitize Inputs**: Color picker ensures valid hex codes
4. **Audit Trail**: Track `created_by` and `updated_by` for changes
5. **Backup Settings**: Export branding config before major changes

---

## Performance Optimization

### Caching

The `useTheme()` hook:
- Caches settings in React state
- Only refetches on realtime updates
- Uses Supabase connection pooling

### Image Optimization

Logo images use Cloudinary transformations:
- Automatic format selection (`f_auto`)
- Quality optimization (`q_auto`)
- Responsive sizing (`w_X,h_X,c_fit`)

### CSS Variables

- Applied once on mount
- No re-renders for color changes
- Performant updates via CSS custom properties

---

## Future Enhancements

Potential additions to the branding system:

1. **Multiple Themes**: Light/dark mode support
2. **Font Upload**: Upload custom fonts to Cloudinary
3. **Favicon Management**: Upload/manage favicons
4. **Theme Preview**: Preview before saving
5. **Theme Export/Import**: JSON export for backup/sharing
6. **A/B Testing**: Multiple active themes for testing
7. **Scheduled Changes**: Auto-apply theme at specific times
8. **User Preferences**: Let users choose themes
9. **Gradient Support**: Configure gradient backgrounds
10. **Animation Settings**: Configure transition speeds

---

## Support & Contact

For issues or questions about the branding system:

1. Check this documentation
2. Review component source code
3. Check Supabase logs for errors
4. Review browser console for client errors
5. Contact development team

---

## Changelog

### v1.0.0 (Current)
- Initial implementation
- Database table and migrations
- React hooks and providers
- Logo component with variants
- Admin interface with color pickers
- Real-time updates
- Comprehensive documentation

---

**Last Updated**: 2025-01-03
**Version**: 1.0.0
**Maintainer**: VC Studio Development Team
