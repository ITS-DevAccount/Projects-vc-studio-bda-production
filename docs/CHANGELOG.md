# Changelog

All notable changes to this project will be documented in this file.

## [2025-11-03] - Video Player Fixes

### Fixed
- **VideoPlayer Component**: Fixed video not loading from database
  - Component now reacts to prop changes and reloads video when data updates
  - Added proper URL detection for full Cloudinary URLs vs base URL + public ID
  - Fixed empty string being passed to video src attribute on initial render
  - Video now automatically reloads when cloudinaryUrl or publicId props change
  - Added loading state while video URL is being determined

- **Supabase Client**: Fixed AuthApiError for stale refresh tokens
  - Added automatic cleanup of invalid refresh tokens
  - Improved auth state change handling
  - Added proper auth session configuration

### Added
- **Documentation**: Created comprehensive VIDEO_PLAYER_SETUP.md guide
  - Usage examples for both full URLs and base URL + public ID
  - Troubleshooting section for common issues
  - Database setup instructions
  - URL construction logic explanation

- **Database Scripts**:
  - `check_page_settings.sql` - Diagnostic script for page_settings table
  - `fix_page_settings_access.sql` - One-step fix for RLS and initial data

### Changed
- **VideoPlayer Component** (`src/components/media/VideoPlayer.tsx`):
  - Refactored URL calculation into `calculateVideoUrl` helper function
  - Added `useEffect` to watch for prop changes
  - Improved console logging with detailed debug information
  - Added conditional rendering to prevent empty src errors

- **Supabase Client** (`src/lib/supabase/client.ts`):
  - Enhanced with auth configuration options
  - Added auth state change listener
  - Added automatic stale token cleanup

### Technical Details
- Video player now properly handles dynamic content from database
- RLS policies allow anonymous users to read published page settings
- Component lifecycle properly manages video element reload
- Full support for both Cloudinary URL formats

## Previous Changes

See git history for earlier changes.
