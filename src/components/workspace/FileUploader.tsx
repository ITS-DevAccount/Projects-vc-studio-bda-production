'use client';

// File Uploader Component
// Phase 1c: Component Registry & File System
// Modal component for uploading files to Supabase Storage + creating nodes

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (max 100MB as per spec)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (selectedFile.size > maxSize) {
        setError('File size exceeds 100MB limit');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Get stakeholder
      const { data: stakeholder } = await supabase
        .from('stakeholders')
        .select('id, reference')
        .eq('auth_user_id', user.id)
        .single();

      if (!stakeholder) {
        throw new Error('Stakeholder not found');
      }

      // Create storage path
      const timestamp = Date.now();
      const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${stakeholder.reference}/files/${timestamp}-${fileName}`;

      // Upload to Supabase Storage
      setProgress(30);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('workspace-files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setProgress(60);

      // Create node entry
      const nodeData = {
        name: file.name,
        type: 'file',
        file_storage_path: storagePath,
        size_bytes: file.size,
        mime_type: file.type || 'application/octet-stream',
        parent_id: null, // Upload to root for now
        description: `Uploaded on ${new Date().toLocaleDateString()}`
      };

      const response = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nodeData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create node');
      }

      setProgress(100);
      setSuccess(true);
      setFile(null);

      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Upload File</h2>

        {/* File Input */}
        <div className="mb-6">
          <label
            htmlFor="file-input"
            className="block w-full p-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
          >
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                {file ? file.name : 'Click to select file or drag and drop'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Maximum file size: 100MB
              </p>
            </div>
            <input
              id="file-input"
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        </div>

        {/* File Info */}
        {file && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">File:</span> {file.name}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">Size:</span>{' '}
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">Type:</span> {file.type || 'Unknown'}
            </p>
          </div>
        )}

        {/* Progress Bar */}
        {uploading && (
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2 text-center">
              Uploading... {progress}%
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600 text-sm">File uploaded successfully!</p>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            !file || uploading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
      </div>
    </div>
  );
}
