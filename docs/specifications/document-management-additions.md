# Document Management Additions

**Version:** 1.0
**Date:** 2025-11-11
**Phase:** 1c - Component Registry & File System
**Status:** Implemented

---

## Executive Summary

This specification documents the implementation of three key document management features for the stakeholder workspace: multi-file drag & drop upload, file preview/viewer functionality, and folder/file counters. These additions enhance the user experience for managing documents within the hierarchical file system.

---

## 1. Multi-File Drag & Drop Upload

### Overview
Enhanced the `FileUploader` component to support multiple file uploads simultaneously through both traditional file selection and drag & drop interface.

### Component Location
- **File:** `src/components/workspace/FileUploader.tsx`

### Features Implemented

#### 1.1 Multi-File Selection
- Changed from single `file` state to `files: File[]` array
- Support for selecting multiple files via file input dialog
- File queue system allowing users to add/remove files before upload

#### 1.2 Drag & Drop Interface
- Visual drag zone with active state feedback
- Drag event handlers:
  - `handleDrag()` - Manages drag enter/over/leave states
  - `handleDrop()` - Processes dropped files
  - `dragActive` state - Visual feedback (blue border/background)
- Supports dropping multiple files at once

#### 1.3 File Validation
- Maximum file size: 100MB per file
- Real-time validation with error messaging
- Invalid files are rejected with specific error messages
- Valid files are queued for upload

#### 1.4 Upload Progress Tracking
- Individual progress tracking per file
- Progress state: `uploadProgress: { [fileName: string]: number }`
- Visual progress bars for each file (0%, 30%, 60%, 100%)
- Parallel upload using `Promise.all()`

#### 1.5 File Queue Management
- Display list of queued files before upload
- Show file name and size for each file
- Remove button for each queued file
- Upload button shows total count: "Upload X Files"

### Technical Implementation

```typescript
// State Management
const [files, setFiles] = useState<File[]>([]);
const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
const [dragActive, setDragActive] = useState(false);

// Validation Function
const validateAndAddFiles = (newFiles: FileList | File[]) => {
  const maxSize = 100 * 1024 * 1024; // 100MB
  // Validates each file and adds valid files to queue
};

// Upload Function
const uploadFile = async (file: File, stakeholder: any) => {
  // 1. Create storage path with timestamp
  // 2. Upload to Supabase Storage (workspace-files bucket)
  // 3. Create node entry in database
  // 4. Update progress at each stage (30%, 60%, 100%)
};

// Parallel Upload
const uploadPromises = files.map(file => uploadFile(file, stakeholder));
await Promise.all(uploadPromises);
```

### User Experience
1. User navigates to File Upload component from menu
2. Can either click to select or drag files onto the drop zone
3. Files appear in queue with size information
4. User can remove unwanted files
5. Click "Upload X Files" button
6. Progress bars show upload status for each file
7. Success message appears when complete
8. FileExplorer automatically refreshes to show new files

### Integration Points
- **FileSystemContext:** Uses `currentParentId` to upload to current folder location
- **Supabase Storage:** Uploads to `workspace-files` bucket
- **API Endpoint:** `/api/nodes` POST - Creates node entries for uploaded files
- **Storage Path Structure:** `{stakeholder.reference}/files/{timestamp}-{sanitizedFileName}`

---

## 2. File Viewer/Preview Component

### Overview
New modal component for previewing and downloading files directly in the browser without leaving the application.

### Component Location
- **File:** `src/components/workspace/FileViewer.tsx` (New)
- **Integration:** `src/components/workspace/FileExplorer.tsx` (Modified)

### Features Implemented

#### 2.1 File Preview Support

##### Supported File Types:
- **Images** (image/*): Full image preview with zoom-to-fit
- **PDFs** (application/pdf): Embedded PDF viewer
- **Text Files** (text/*): Inline text preview
- **JSON** (application/json): Inline JSON preview
- **Videos** (video/*): HTML5 video player with controls
- **Audio** (audio/*): HTML5 audio player with controls
- **Other Types**: Fallback UI with download option

#### 2.2 Modal Interface
- Full-screen modal overlay (90vh height)
- Close button (X icon)
- Download button (Download icon)
- Open in new tab button (ExternalLink icon)
- File metadata display: name, MIME type, size

#### 2.3 File Access & Security
- Uses Supabase Storage signed URLs
- URL validity: 1 hour (3600 seconds)
- Respects RLS policies (stakeholder-owned files only)
- Automatic URL generation on modal open

#### 2.4 Error Handling
- Loading state with spinner
- Error state with retry button
- Graceful fallback for unsupported file types

### Technical Implementation

```typescript
// Component Interface
interface FileViewerProps {
  fileId: string;
  fileName: string;
  filePath: string;      // Storage path
  mimeType: string;
  sizeBytes: number;
  onClose: () => void;
}

// Signed URL Generation
const { data, error } = await supabase.storage
  .from('workspace-files')
  .createSignedUrl(filePath, 3600);

// Conditional Rendering by MIME Type
if (mimeType.startsWith('image/')) {
  return <img src={fileUrl} />;
} else if (mimeType === 'application/pdf') {
  return <iframe src={fileUrl} />;
} else if (mimeType.startsWith('video/')) {
  return <video src={fileUrl} controls />;
}
// ... etc
```

### FileExplorer Integration

```typescript
// Added State
const [selectedFile, setSelectedFile] = useState<Node | null>(null);

// Click Handler
const handleNodeClick = (node: Node) => {
  if (node.type === 'folder') {
    navigateToFolder(node.id, node.name);
  } else if (node.type === 'file') {
    setSelectedFile(node);  // Opens viewer
  }
};

// Modal Rendering
{selectedFile && selectedFile.type === 'file' && (
  <FileViewer
    fileId={selectedFile.id}
    fileName={selectedFile.name}
    filePath={selectedFile.file_storage_path || ''}
    mimeType={selectedFile.mime_type || 'application/octet-stream'}
    sizeBytes={selectedFile.size_bytes || 0}
    onClose={() => setSelectedFile(null)}
  />
)}
```

### User Experience
1. User clicks on a file in FileExplorer
2. Modal opens with file preview (if supported)
3. User can:
   - View the file content
   - Download the file
   - Open in a new browser tab
   - Close the modal (X button or backdrop click)
4. For unsupported types, download button is prominently displayed

### Dependencies
- **lucide-react:** Icons (X, Download, ExternalLink)
- **Supabase Storage:** Signed URL generation
- **Browser APIs:** Blob download, window.open()

---

## 3. Folder/File Counters

### Overview
Added real-time counters to the FileExplorer header showing the number of folders and files at the current navigation level.

### Component Location
- **File:** `src/components/workspace/FileExplorer.tsx` (Modified)

### Features Implemented

#### 3.1 Counter Display
- Badge-style counter next to "File Explorer" title
- Format: "X folders, Y files"
- Appears only when data is loaded (not during loading state)
- Conditional display:
  - If folders > 0: Shows folder count
  - If files > 0: Shows file count
  - If both are 0: Shows "Empty"

#### 3.2 Smart Pluralization
- Singular: "1 folder", "1 file"
- Plural: "2 folders", "5 files"
- Combined: "3 folders, 2 files"

#### 3.3 Real-Time Updates
- Automatically updates when:
  - Navigating into folders
  - Navigating back via breadcrumb
  - Creating new folders
  - Uploading new files
  - Refreshing the view

### Technical Implementation

```typescript
// Counter Calculation Function
const getCounts = () => {
  const folderCount = nodes.filter(node => node.type === 'folder').length;
  const fileCount = nodes.filter(node => node.type === 'file').length;
  return { folderCount, fileCount };
};

// UI Rendering
{!loading && (
  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
    {(() => {
      const { folderCount, fileCount } = getCounts();
      const parts = [];
      if (folderCount > 0) parts.push(`${folderCount} folder${folderCount !== 1 ? 's' : ''}`);
      if (fileCount > 0) parts.push(`${fileCount} file${fileCount !== 1 ? 's' : ''}`);
      return parts.length > 0 ? parts.join(', ') : 'Empty';
    })()}
  </span>
)}
```

### User Experience
1. User opens FileExplorer
2. Counter badge shows total at current level
3. User navigates into a folder
4. Counter updates to show contents of that folder
5. User uploads a file
6. Counter increments file count automatically
7. User creates a folder
8. Counter increments folder count automatically

### Visual Design
- Background: Light gray (`bg-gray-100`)
- Text: Medium gray (`text-gray-500`)
- Shape: Rounded pill (`rounded-full`)
- Padding: Compact (`px-3 py-1`)
- Position: Next to main title

---

## Architecture & Integration

### File System Context
All three features integrate with the existing `FileSystemContext`:

```typescript
interface FileSystemContextType {
  currentPath: PathItem[];           // Breadcrumb path
  currentParentId: string | null;    // Current folder ID
  navigateToFolder: (id, name) => void;
  navigateToPath: (index) => void;
  navigateToRoot: () => void;
  refreshTrigger: number;            // Increment to refresh
  triggerRefresh: () => void;
}
```

### Refresh Flow
1. FileUploader completes upload → calls `triggerRefresh()`
2. FolderCreator creates folder → calls `triggerRefresh()`
3. FileExplorer listens to `refreshTrigger` → refetches nodes
4. Counters automatically update with new node data

### Storage Architecture
```
Supabase Storage: workspace-files bucket
├── {stakeholder.reference}/
│   └── files/
│       ├── {timestamp}-{file1.pdf}
│       ├── {timestamp}-{file2.jpg}
│       └── ...
```

### Database Schema Integration
```sql
-- nodes table (existing)
CREATE TABLE nodes (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('file', 'folder', 'component')),
  parent_id UUID REFERENCES nodes(id),
  file_storage_path TEXT,        -- Path in storage bucket
  size_bytes BIGINT,
  mime_type TEXT,
  owner_id UUID REFERENCES stakeholders(id),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  description TEXT,
  tags TEXT[],
  is_shared BOOLEAN DEFAULT false
);
```

### API Endpoints Used
- **POST `/api/nodes`** - Create file/folder nodes
- **GET `/api/nodes?parent_id=null`** - Get root level nodes
- **GET `/api/nodes/{parentId}`** - Get child nodes

### RLS Policies (Existing)
- Stakeholders can only upload to their own folder in storage
- Stakeholders can only read their own files
- Stakeholders can only create nodes they own
- All enforced at database level

---

## Testing Considerations

### Manual Testing Checklist

#### Multi-File Upload
- [ ] Select single file via file input
- [ ] Select multiple files via file input
- [ ] Drag single file onto drop zone
- [ ] Drag multiple files onto drop zone
- [ ] Try to upload file > 100MB (should show error)
- [ ] Remove files from queue before upload
- [ ] Upload completes with progress bars
- [ ] Files appear in FileExplorer after upload
- [ ] Files upload to correct folder in hierarchy

#### File Viewer
- [ ] Click on image file (should preview)
- [ ] Click on PDF file (should preview)
- [ ] Click on text file (should preview)
- [ ] Click on video file (should play)
- [ ] Click on unsupported file (should show download option)
- [ ] Download button works
- [ ] Open in new tab works
- [ ] Close button closes modal
- [ ] ESC key closes modal (if implemented)

#### Folder/File Counters
- [ ] Counter shows correct count at root
- [ ] Counter updates when navigating into folder
- [ ] Counter updates when navigating back
- [ ] Counter shows "Empty" when no files/folders
- [ ] Counter updates after file upload
- [ ] Counter updates after folder creation
- [ ] Plural/singular grammar is correct

### Edge Cases Handled
- Empty folders (shows "Empty")
- Single items (correct singular grammar)
- Large file rejection (validation)
- Unsupported file types (fallback UI)
- Failed uploads (error messaging)
- Missing file metadata (default values)
- Null/undefined file paths (guards)

---

## Browser Compatibility

### Supported Features
- **Drag & Drop API:** All modern browsers (Chrome, Firefox, Safari, Edge)
- **FileReader API:** All modern browsers
- **Blob API:** All modern browsers
- **HTML5 Video/Audio:** All modern browsers

### Known Limitations
- PDF preview requires browser PDF viewer support
- Some MIME types may not preview on older browsers
- Drag & drop not supported on mobile browsers (fallback to file input)

---

## Performance Considerations

### Optimizations Implemented
1. **Parallel Uploads:** Files upload simultaneously using `Promise.all()`
2. **Progress Tracking:** UI updates only on progress change
3. **Lazy Loading:** FileViewer component only renders when opened
4. **Signed URLs:** 1-hour cache reduces API calls
5. **Counter Calculation:** O(n) filter operation, acceptable for typical folder sizes

### Performance Metrics (Expected)
- **Upload Speed:** Limited by network bandwidth
- **Preview Load Time:** 1-2 seconds for typical files
- **Counter Update:** < 10ms for folders with < 1000 items

---

## Security Considerations

### File Upload Security
- **Size Limits:** 100MB per file enforced client and server-side
- **Storage Bucket:** Private bucket with RLS policies
- **Filename Sanitization:** Special characters replaced with underscores
- **Path Structure:** Stakeholder-scoped folders prevent cross-access

### File Access Security
- **Signed URLs:** Time-limited access (1 hour)
- **RLS Policies:** Database-level access control
- **Authentication Required:** All operations require auth.uid()
- **Stakeholder Ownership:** Files owned by stakeholder, not app-scoped

### MIME Type Handling
- **Client Validation:** Uses file.type from browser
- **Server Storage:** Stores MIME type in database
- **Preview Rendering:** MIME type determines preview method
- **No Execution:** Files never executed server-side

---

## Future Enhancements (Not Implemented)

### Potential Additions
1. **File Sharing:** Share files with other stakeholders
2. **File Versioning:** Track file revisions
3. **Bulk Operations:** Select multiple files for download/delete
4. **Search Functionality:** Search files by name, tags, content
5. **File Thumbnails:** Generate thumbnails for images/documents
6. **Folder Size:** Calculate and display folder sizes
7. **File Metadata Editing:** Rename, add tags, edit descriptions
8. **Drag & Drop Reorganization:** Move files between folders
9. **Upload Resume:** Resume interrupted uploads
10. **File Compression:** Automatic compression for large files

---

## Component Hierarchy

```
StakeholderDashboardPage
└── FileSystemProvider
    ├── FileExplorer
    │   ├── Breadcrumb Navigation
    │   ├── Folder/File Counters    [NEW]
    │   ├── Node List (Folders & Files)
    │   └── FileViewer (Modal)       [NEW]
    ├── FileUploader                 [ENHANCED]
    │   ├── Drag & Drop Zone
    │   ├── File Queue List
    │   ├── Progress Tracking
    │   └── Upload Button
    └── FolderCreator
        └── Folder Creation Form
```

---

## Dependencies Added

### NPM Packages
- **lucide-react:** Icon components (already installed)
- **@supabase/ssr:** Cookie-based auth (already installed)

### No New Dependencies Required
All features built using existing project dependencies.

---

## Migration/Database Changes

### No Database Changes Required
All features use existing schema:
- `nodes` table (no modifications)
- `stakeholders` table (no modifications)
- `workspace-files` storage bucket (already created)

### Storage Bucket Configuration
```sql
-- Already exists from previous migration
-- File: 20251111_create_workspace_files_bucket.sql

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-files',
  'workspace-files',
  false,
  104857600,  -- 100MB
  NULL
);
```

---

## Configuration

### Environment Variables
No new environment variables required. Uses existing:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Component Registry
All components already registered in dashboard:
- `file_explorer` → FileExplorer
- `file_uploader` → FileUploader
- `folder_creator` → FolderCreator

---

## User Documentation

### For End Users

#### Uploading Files
1. Click "Upload File" from the sidebar menu
2. Either:
   - Click the upload zone and select files (multiple selection supported)
   - Drag one or more files onto the upload zone
3. Review the file queue (remove unwanted files if needed)
4. Click "Upload X Files"
5. Wait for progress bars to complete
6. Files will appear in File Explorer

#### Viewing Files
1. Click "File Explorer" from the sidebar menu
2. Navigate to the folder containing your file
3. Click on the file name
4. The file will open in a preview window
5. Use the download button if needed
6. Close the viewer by clicking the X button

#### Understanding Counters
- The badge next to "File Explorer" shows how many folders and files are in the current location
- Navigate into folders to see counts at each level
- "Empty" means the current folder has no contents

---

## Troubleshooting

### Common Issues

#### Files Not Uploading
- **Check:** File size under 100MB?
- **Check:** Authenticated and session valid?
- **Check:** Browser console for errors
- **Solution:** Refresh page and retry

#### File Preview Not Working
- **Check:** Supported file type?
- **Check:** Storage URL accessible?
- **Solution:** Use download button instead

#### Counters Not Updating
- **Check:** FileExplorer refreshed?
- **Solution:** Click the "Refresh" button

---

## Changelog

### Version 1.0 (2025-11-11)
- ✅ Implemented multi-file drag & drop upload
- ✅ Created file viewer/preview component
- ✅ Added folder/file counters to FileExplorer
- ✅ Integrated all features with FileSystemContext
- ✅ Updated FileUploader with progress tracking
- ✅ Enhanced FileExplorer with click-to-preview

---

## Sign-off

**Implemented By:** Claude Code
**Reviewed By:** [Pending]
**Approved By:** [Pending]
**Date:** 2025-11-11

---

## References

### Related Files
- `src/components/workspace/FileUploader.tsx`
- `src/components/workspace/FileExplorer.tsx`
- `src/components/workspace/FileViewer.tsx` (new)
- `src/contexts/FileSystemContext.tsx`
- `src/app/dashboard/stakeholder/page.tsx`
- `supabase/migrations/20251111_create_workspace_files_bucket.sql`

### Related Specifications
- Phase 1c: Component Registry & File System
- Stakeholder-Centric Architecture
- RLS Policy Documentation

---

**END OF SPECIFICATION**
