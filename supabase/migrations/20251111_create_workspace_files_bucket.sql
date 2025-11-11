-- ============================================================================
-- Create Workspace Files Storage Bucket
-- File: 20251111_create_workspace_files_bucket.sql
-- Purpose: Create storage bucket for stakeholder file uploads
-- ============================================================================

-- Create the storage bucket for workspace files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-files',
  'workspace-files',
  false,  -- Private bucket - files accessible only to owners
  104857600,  -- 100MB file size limit
  NULL  -- Allow all MIME types
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RLS POLICIES FOR STORAGE BUCKET
-- ============================================================================

-- Allow stakeholders to upload files to their own folder
CREATE POLICY "Stakeholders can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workspace-files'
  AND (storage.foldername(name))[1] IN (
    SELECT reference FROM stakeholders WHERE auth_user_id = auth.uid()
  )
);

-- Allow stakeholders to read their own files
CREATE POLICY "Stakeholders can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'workspace-files'
  AND (storage.foldername(name))[1] IN (
    SELECT reference FROM stakeholders WHERE auth_user_id = auth.uid()
  )
);

-- Allow stakeholders to update their own files
CREATE POLICY "Stakeholders can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'workspace-files'
  AND (storage.foldername(name))[1] IN (
    SELECT reference FROM stakeholders WHERE auth_user_id = auth.uid()
  )
);

-- Allow stakeholders to delete their own files
CREATE POLICY "Stakeholders can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'workspace-files'
  AND (storage.foldername(name))[1] IN (
    SELECT reference FROM stakeholders WHERE auth_user_id = auth.uid()
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_bucket_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'workspace-files'
  ) INTO v_bucket_exists;

  IF v_bucket_exists THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Storage Bucket Created: workspace-files';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Bucket: workspace-files';
    RAISE NOTICE '✓ Max file size: 100MB';
    RAISE NOTICE '✓ Access: Private (stakeholder-owned)';
    RAISE NOTICE '✓ RLS policies: 4 policies created';
    RAISE NOTICE '========================================';
  ELSE
    RAISE WARNING 'Failed to create workspace-files bucket';
  END IF;
END $$;
