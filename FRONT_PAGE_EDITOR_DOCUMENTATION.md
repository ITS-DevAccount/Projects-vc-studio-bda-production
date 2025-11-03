# Front Page Editor - Implementation Documentation

## Overview
This document provides a complete guide to implementing the Front Page Editor system for the VC Studio BDA Production site. This system allows administrators to dynamically edit the front page content including hero video, text sections, and image galleries through an admin dashboard interface.

## System Architecture

### Database Schema

#### Table: `page_settings`
Stores all configurable content for page sections.

```sql
CREATE TABLE page_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_name VARCHAR(100) NOT NULL UNIQUE,

  -- Hero Section
  hero_video_url TEXT,
  hero_video_public_id TEXT,
  hero_title TEXT NOT NULL,
  hero_subtitle TEXT NOT NULL,
  hero_description TEXT,
  hero_cta_primary_text VARCHAR(50),
  hero_cta_secondary_text VARCHAR(50),

  -- Info Section
  info_section_title TEXT,
  info_section_subtitle TEXT,
  info_block_1_title VARCHAR(200),
  info_block_1_content TEXT,
  info_block_2_title VARCHAR(200),
  info_block_2_content TEXT,
  info_highlight_text TEXT,

  -- Gallery Section
  gallery_section_title TEXT,
  gallery_section_subtitle TEXT,

  -- Meta
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
```

#### Table: `page_images`
Stores gallery images with order and metadata.

```sql
CREATE TABLE page_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_settings_id UUID NOT NULL REFERENCES page_settings(id) ON DELETE CASCADE,

  -- Image Details
  cloudinary_url TEXT NOT NULL,
  public_id TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  title TEXT,
  caption TEXT,

  -- Display Settings
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

### Row Level Security (RLS) Policies

**page_settings:**
- Public users can read published pages only
- Authenticated users (admins) have full CRUD access
- Auto-update `updated_at` timestamp on modifications

**page_images:**
- Public users can read active images from published pages
- Authenticated users (admins) have full CRUD access
- Cascade deletion when parent page_settings is deleted

## File Structure

```
src/
├── app/
│   ├── page.tsx                          # Front page (reads from DB)
│   └── dashboard/
│       └── pages/
│           └── editor/
│               └── page.tsx              # Admin editor interface
└── components/
    └── media/
        ├── VideoPlayer.tsx               # Cloudinary video component
        └── ImageGallery.tsx              # Cloudinary image gallery component

supabase/
└── migrations/
    └── create_page_editor_tables.sql     # Database migration script
```

## Implementation Steps

### Step 1: Database Setup

1. **Run Migration in Supabase:**
   - Navigate to Supabase SQL Editor
   - Execute `supabase/migrations/create_page_editor_tables.sql`
   - This creates tables, policies, and seeds default data

2. **Verify Tables:**
   ```sql
   -- Check tables exist
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename IN ('page_settings', 'page_images');

   -- Check seed data
   SELECT * FROM page_settings WHERE page_name = 'home';
   SELECT * FROM page_images ORDER BY display_order;
   ```

### Step 2: Admin Editor Interface

**Location:** `/dashboard/pages/editor`

**Features:**
- ✅ Hero video upload (Cloudinary URL + Public ID)
- ✅ Hero text fields (title, subtitle, description, CTAs)
- ✅ Info section (2 content blocks + highlight text)
- ✅ Gallery manager (add, reorder via drag-drop, delete images)
- ✅ Live preview in split-screen view
- ✅ Save/publish functionality
- ✅ Status notifications (success/error)

**Key Components:**

```typescript
interface PageSettings {
  id?: string;
  page_name: string;
  hero_video_url: string;
  hero_video_public_id: string;
  hero_title: string;
  hero_subtitle: string;
  // ... other fields
  is_published: boolean;
}

interface PageImage {
  id?: string;
  cloudinary_url: string;
  public_id: string;
  alt_text: string;
  title: string;
  caption: string;
  display_order: number;
  is_active: boolean;
}
```

**Save Logic:**
1. Update or insert `page_settings` record
2. Delete existing `page_images` for this page
3. Insert new `page_images` with updated order
4. Reload data to sync state with database

### Step 3: Front Page Dynamic Content

**Location:** `/` (src/app/page.tsx)

**Data Fetching:**
```typescript
const fetchPageSettings = async () => {
  // Fetch published page settings for 'home'
  const { data: settingsData } = await supabase
    .from('page_settings')
    .select('*')
    .eq('page_name', 'home')
    .eq('is_published', true)
    .single();

  // Fetch active gallery images
  const { data: imagesData } = await supabase
    .from('page_images')
    .select('*')
    .eq('page_settings_id', settingsData.id)
    .eq('is_active', true)
    .order('display_order', { ascending: true });
};
```

**Dynamic Rendering:**
- Hero section uses `pageSettings?.hero_*` fields
- Info section uses `pageSettings?.info_*` fields
- Gallery maps `galleryImages` array to `ImageGallery` component
- Fallback to default values if data not loaded

## Key Features

### 1. Hero Video Management
- Store Cloudinary base URL and video public ID
- VideoPlayer component handles responsive playback
- Overlay gradient for text readability
- Auto-play, loop, muted background video

### 2. Content Blocks
- Two customizable info blocks with titles and content
- Highlight text box with accent styling
- All fields support multi-line text

### 3. Gallery Manager
- **Add:** Click "Add Image" button
- **Reorder:** Drag and drop image cards
- **Edit:** Inline editing of all image metadata
- **Delete:** Remove with trash icon
- **Active/Inactive:** Toggle visibility without deletion

### 4. Live Preview
- Toggle split-screen view
- iframe loads actual front page
- Real-time preview (requires save to see changes)

### 5. Publishing Control
- Checkbox to publish/unpublish page
- Only published pages visible to public
- Admins can always view unpublished pages in editor

## Replication Guide for ADA/PDA

### Prerequisites
1. Next.js 15+ with TypeScript
2. Supabase project with authentication
3. Cloudinary account for media hosting
4. VideoPlayer and ImageGallery components

### Step-by-Step Replication

#### 1. Database Migration
```bash
# Copy migration file
cp supabase/migrations/create_page_editor_tables.sql [target-project]/supabase/migrations/

# Run in Supabase SQL Editor or CLI
supabase migration up
```

#### 2. Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### 3. Install Dependencies
```bash
npm install @supabase/supabase-js lucide-react
```

#### 4. Copy Components
```bash
# Media components (if not already present)
cp src/components/media/VideoPlayer.tsx [target]/src/components/media/
cp src/components/media/ImageGallery.tsx [target]/src/components/media/

# Editor page
cp src/app/dashboard/pages/editor/page.tsx [target]/src/app/dashboard/pages/editor/

# Update front page
# Manually merge changes from src/app/page.tsx
```

#### 5. Update Routes
Ensure dashboard layout protects the editor route:
```typescript
// src/app/dashboard/layout.tsx
// Should have authentication check
```

#### 6. Customize for Project
- Update default content in migration seed data
- Adjust color scheme to match project theme
- Modify field names/structure as needed
- Add additional sections if required

### Advanced Customization

#### Adding New Sections
1. **Database:** Add columns to `page_settings`
   ```sql
   ALTER TABLE page_settings
   ADD COLUMN new_section_title TEXT,
   ADD COLUMN new_section_content TEXT;
   ```

2. **Editor:** Add form fields in editor page
   ```tsx
   <input
     value={settings.new_section_title}
     onChange={(e) => handleSettingChange('new_section_title', e.target.value)}
   />
   ```

3. **Frontend:** Display in front page
   ```tsx
   <section>
     <h2>{pageSettings?.new_section_title}</h2>
     <p>{pageSettings?.new_section_content}</p>
   </section>
   ```

#### Multi-Page Support
To support multiple editable pages (e.g., About, Contact):

1. Create separate editor routes:
   ```
   /dashboard/pages/editor/[page_name]
   ```

2. Update query to use dynamic page name:
   ```typescript
   const { page_name } = useParams();
   const { data } = await supabase
     .from('page_settings')
     .select('*')
     .eq('page_name', page_name)
     .single();
   ```

3. Create corresponding frontend pages that read their specific page_name.

## API Integration Points

### Cloudinary Configuration
```typescript
// Video Player
<VideoPlayer
  cloudinaryUrl="https://res.cloudinary.com/your-cloud/video/upload"
  publicId="your-video-id"
/>

// Image Gallery
<ImageGallery
  cloudinaryUrl="https://res.cloudinary.com/your-cloud/image/upload"
  images={[{ publicId: 'image-id', ... }]}
/>
```

### Supabase Client
```typescript
import { supabase } from '@/lib/supabase/client';

// All queries use RLS policies automatically
// Public users get published content only
// Authenticated users get full access
```

## Security Considerations

1. **RLS Policies:** Prevent unauthorized access at database level
2. **Authentication:** Editor route requires authentication
3. **Input Validation:** Sanitize user inputs (consider adding validation)
4. **XSS Protection:** React automatically escapes text content
5. **SQL Injection:** Supabase client uses parameterized queries

## Testing Checklist

### Database
- [ ] Tables created successfully
- [ ] RLS policies prevent unauthorized access
- [ ] Seed data inserted correctly
- [ ] Foreign key constraints work (cascade delete)

### Admin Editor
- [ ] Page loads with existing data
- [ ] All form fields editable
- [ ] Image drag-and-drop reordering works
- [ ] Add/delete images functional
- [ ] Save updates database correctly
- [ ] Success/error messages display
- [ ] Live preview toggle works

### Front Page
- [ ] Fetches published page settings
- [ ] Displays hero video correctly
- [ ] All text fields render from database
- [ ] Gallery images display in order
- [ ] Fallbacks work when no data
- [ ] Unpublished changes not visible to public

## Troubleshooting

### Issue: RLS blocks authenticated user
**Solution:** Check user is properly authenticated
```typescript
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);
```

### Issue: Images not displaying
**Solution:** Verify Cloudinary URLs and public IDs
- Check URL format matches Cloudinary account
- Ensure public IDs exist in Cloudinary
- Test direct image URL in browser

### Issue: Save fails silently
**Solution:** Check browser console for errors
```typescript
const { data, error } = await supabase.from('page_settings').update(...);
if (error) console.error('Save error:', error);
```

### Issue: Preview not updating
**Solution:** Preview shows live site, requires save
- Save changes in editor
- Refresh preview iframe
- Check `is_published` is true

## Performance Optimization

1. **Database Indexes:** Already included in migration
2. **Image Optimization:** Use Cloudinary transformations
   ```typescript
   // Example: resize images
   `${cloudinaryUrl}/w_800,h_600,c_fill/${publicId}`
   ```
3. **Caching:** Consider implementing cache-control headers
4. **Lazy Loading:** Gallery images lazy-load by default

## Future Enhancements

### Potential Additions
- [ ] Rich text editor for content blocks
- [ ] Direct Cloudinary upload widget integration
- [ ] Version history and rollback
- [ ] Multi-language support
- [ ] SEO metadata fields
- [ ] Preview unpublished changes before save
- [ ] Scheduled publishing
- [ ] Audit log for changes

### Integration Ideas
- Webhook to trigger build on publish
- Analytics tracking for edited content
- A/B testing different content versions
- Email notifications for page updates

## Support and Maintenance

### Regular Tasks
1. **Monitor Database:** Check table sizes and query performance
2. **Cloudinary Cleanup:** Remove unused media assets
3. **Backup:** Regular database backups (Supabase handles this)
4. **Updates:** Keep dependencies updated

### Contact Information
For questions about this implementation:
- Project: VC Studio BDA Production
- Created: 2025-11-03
- Location: C:\Users\ian\ITS-Development\Projects\vc-studio-bda-production

## Conclusion

This Front Page Editor system provides a complete, production-ready solution for dynamic content management. The architecture is scalable, secure, and easy to replicate across ADA and PDA projects.

### Key Benefits
✅ **No Code Deployment:** Content changes without code commits
✅ **User-Friendly:** Intuitive admin interface
✅ **Secure:** Database-level security with RLS
✅ **Scalable:** Easy to extend with new sections/pages
✅ **Replicable:** Clear documentation for other projects

---

**End of Documentation**
