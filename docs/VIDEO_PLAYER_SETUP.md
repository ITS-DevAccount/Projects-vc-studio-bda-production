# Video Player Component - Setup & Usage Guide

## Overview

The VideoPlayer component is a reusable React component for displaying Cloudinary videos with custom controls. It supports both full Cloudinary URLs and base URL + public ID combinations.

## Features

- ✅ Supports full Cloudinary video URLs (e.g., `https://res.cloudinary.com/.../video.mp4`)
- ✅ Supports base URL + public ID construction
- ✅ Automatic video reload when props change
- ✅ Custom playback controls (play/pause, mute, fullscreen)
- ✅ Multiple aspect ratio support (16:9, 4:3, 1:1, 21:9)
- ✅ Autoplay, loop, and muted options
- ✅ Hover-to-show controls interface
- ✅ Loading state while video URL is being determined

## Recent Fixes (2025-11-03)

### Issue: Video Not Loading from Database
**Problem**: Video player was showing fallback demo video instead of loading the actual video from the database.

**Root Causes**:
1. Component wasn't reacting to prop changes after initial render
2. Video URL wasn't being recalculated when database data loaded
3. Empty string being passed to video src attribute on initial render
4. Full Cloudinary URLs with file extensions weren't being handled correctly

**Solutions Applied**:
1. **Reactive URL Calculation**: Added `useEffect` to recalculate video URL when `cloudinaryUrl` or `publicId` props change
2. **Automatic Video Reload**: Component now calls `video.load()` when URL changes to reload the video element
3. **Proper Initialization**: Video URL is calculated immediately using state initializer function
4. **Full URL Detection**: Component detects if cloudinaryUrl is a complete video URL (ends with .mp4, .mov, etc.) and uses it directly
5. **Empty String Protection**: Video element only renders when URL is available, preventing empty src errors

## Usage

### Database Setup

The video player is integrated with the `page_settings` table. To use it:

1. **Run Database Migrations**:
   - Open Supabase SQL Editor
   - Run `supabase/migrations/create_page_editor_tables.sql`
   - Run `supabase/migrations/fix_page_editor_policies.sql`

2. **Configure Video Settings**:
   - Option A: Store full Cloudinary URL in `hero_video_url`:
     ```sql
     UPDATE page_settings
     SET hero_video_url = 'https://res.cloudinary.com/your-cloud/video/upload/v1234567890/your-video.mp4',
         hero_video_public_id = 'your-video-name'
     WHERE page_name = 'home';
     ```

   - Option B: Store base URL and public ID separately:
     ```sql
     UPDATE page_settings
     SET hero_video_url = 'https://res.cloudinary.com/your-cloud/video/upload',
         hero_video_public_id = 'v1234567890/your-video'
     WHERE page_name = 'home';
     ```

### Component Props

```typescript
interface VideoPlayerProps {
  cloudinaryUrl: string;       // Full URL or base Cloudinary URL
  publicId: string;            // Video public ID (or display name if using full URL)
  title?: string;              // Accessibility title (default: 'Video')
  autoplay?: boolean;          // Auto-start playback (default: false)
  loop?: boolean;              // Loop video (default: false)
  muted?: boolean;             // Mute audio (default: false)
  controls?: boolean;          // Show custom controls (default: true)
  className?: string;          // Additional CSS classes
  aspectRatio?: '16:9' | '4:3' | '1:1' | '21:9'; // Default: '16:9'
  poster?: string;             // Poster image URL
}
```

### Example Usage

#### In Hero Section (Background Video)
```tsx
<VideoPlayer
  cloudinaryUrl={pageSettings?.hero_video_url || "https://res.cloudinary.com/demo/video/upload"}
  publicId={pageSettings?.hero_video_public_id || "dog"}
  autoplay={true}
  loop={true}
  muted={true}
  controls={false}
  className="w-full h-full"
  aspectRatio="16:9"
/>
```

#### Standalone Video Player
```tsx
<VideoPlayer
  cloudinaryUrl="https://res.cloudinary.com/your-cloud/video/upload"
  publicId="v1234567890/my-video"
  title="Demo Video"
  autoplay={false}
  loop={false}
  muted={false}
  controls={true}
  aspectRatio="16:9"
/>
```

## URL Construction Logic

The component automatically detects the URL format:

1. **Full URL** (contains `.mp4`, `.mov`, `.avi`, `.webm`, or `.mkv`):
   - Uses the `cloudinaryUrl` as-is
   - Example: `https://res.cloudinary.com/demo/video/upload/v123/video.mp4`

2. **Base URL + Public ID**:
   - Constructs: `${cloudinaryUrl}/q_auto,f_auto/${publicId}`
   - Example: `https://res.cloudinary.com/demo/video/upload/q_auto,f_auto/dog`

## Troubleshooting

### Video Shows Demo "Dog" Instead of My Video

**Check**:
1. Browser console for "Page Settings Fetch" log - verify data is loading
2. Database has correct `hero_video_url` and `hero_video_public_id`
3. `is_published = true` in page_settings table
4. RLS policies allow anonymous read access (see `fix_page_settings_access.sql`)

**Solution**:
Run `supabase/fix_page_settings_access.sql` in Supabase SQL Editor to ensure:
- RLS policies are correctly configured
- Home page data exists with `is_published = true`

### Empty String Error in Console

**Error**: `An empty string ("") was passed to the src attribute`

**Cause**: Video URL wasn't calculated before first render

**Solution**: Already fixed - component now initializes URL in state and only renders video when URL is available

### Video Doesn't Update When Database Changes

**Cause**: Component not reacting to prop changes

**Solution**: Already fixed - `useEffect` with `cloudinaryUrl` and `publicId` dependencies ensures video reloads when props change

### Video Fails to Load

**Check Console**:
- "Video failed to load" error shows the attempted URL
- "Video loaded successfully" confirms successful load

**Common Issues**:
1. Incorrect Cloudinary cloud name in URL
2. Video doesn't exist at the specified public ID
3. Video privacy settings in Cloudinary blocking access
4. CORS issues (rare with Cloudinary)

## File Locations

- **Component**: `src/components/media/VideoPlayer.tsx`
- **Usage**: `src/app/page.tsx` (lines 252-260)
- **Database Migration**: `supabase/migrations/create_page_editor_tables.sql`
- **RLS Policies**: `supabase/migrations/fix_page_editor_policies.sql`
- **Quick Fix Script**: `supabase/fix_page_settings_access.sql`

## Related Components

- **ImageGallery**: `src/components/media/ImageGallery.tsx` - Similar pattern for images
- **Logo**: `src/components/branding/Logo.tsx` - Handles site branding images

## Browser Compatibility

- Modern browsers with HTML5 video support
- Fallback message for unsupported browsers
- Autoplay may be blocked by browser policies (automatically handled with error catch)
