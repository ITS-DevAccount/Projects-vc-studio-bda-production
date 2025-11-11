'use client';

// File Uploader Component
// Phase 1c: Component Registry & File System
// Modal component for uploading files to Supabase Storage + creating nodes

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useFileSystem } from '@/contexts/FileSystemContext';
import Breadcrumb from './Breadcrumb';

export default function FileUploader() {
  const { currentPath, currentParentId, triggerRefresh } = useFileSystem();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const validateAndAddFiles = (newFiles: FileList | File[]) => {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const fileArray = Array.from(newFiles);
    const validFiles: File[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      if (file.size > maxSize) {
        errors.push(`${file.name} exceeds 100MB limit`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setError(errors.join(', '));
    } else {
      setError(null);
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      setSuccess(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File, stakeholder: any) => {
    const supabase = createClient();

    // Create storage path
    const timestamp = Date.now();
    const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${stakeholder.reference}/files/${timestamp}-${fileName}`;

    // Upload to Supabase Storage
    setUploadProgress(prev => ({ ...prev, [file.name]: 30 }));
    const { error: uploadError } = await supabase.storage
      .from('workspace-files')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`${file.name}: ${uploadError.message}`);
    }

    setUploadProgress(prev => ({ ...prev, [file.name]: 60 }));

    // Create node entry at current location
    const nodeData = {
      name: file.name,
      type: 'file',
      file_storage_path: storagePath,
      size_bytes: file.size,
      mime_type: file.type || 'application/octet-stream',
      parent_id: currentParentId,
      description: `Uploaded on ${new Date().toLocaleDateString()}`
    };

    const response = await fetch('/api/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nodeData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`${file.name}: ${errorData.error || 'Failed to create node'}`);
    }

    setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select files');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress({});

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

      // Upload all files
      const uploadPromises = files.map(file => uploadFile(file, stakeholder));
      await Promise.all(uploadPromises);

      setSuccess(`Successfully uploaded ${files.length} file${files.length > 1 ? 's' : ''}!`);
      setFiles([]);
      setUploadProgress({});

      // Trigger file explorer refresh
      triggerRefresh();

      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);

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
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <Breadcrumb />
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-6">Upload File</h2>

        {/* Drag & Drop Zone */}
        <div
          className="mb-6"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <label
            htmlFor="file-input"
            className={`block w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-500'
            }`}
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
              <p className="mt-2 text-sm font-medium text-gray-700">
                {dragActive ? 'Drop files here' : 'Drag & drop files or click to select'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Multiple files supported • Max 100MB per file
              </p>
            </div>
            <input
              id="file-input"
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        </div>

        {/* Files List */}
        {files.length > 0 && (
          <div className="mb-6 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Files to upload ({files.length})
            </h3>
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                    {uploadProgress[file.name] !== undefined && (
                      <span className="ml-2">• {uploadProgress[file.name]}%</span>
                    )}
                  </p>
                  {uploadProgress[file.name] !== undefined && (
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress[file.name]}%` }}
                      />
                    </div>
                  )}
                </div>
                {!uploading && (
                  <button
                    onClick={() => removeFile(index)}
                    className="ml-2 text-red-500 hover:text-red-700 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
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
            <p className="text-green-600 text-sm">{success}</p>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            files.length === 0 || uploading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {uploading
            ? `Uploading ${Object.keys(uploadProgress).length}/${files.length}...`
            : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`
          }
        </button>
      </div>
    </div>
  );
}
