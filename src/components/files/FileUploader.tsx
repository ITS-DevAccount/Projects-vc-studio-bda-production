// Sprint 1d.7: FLM Building Workflow - File Uploader Component
// Phase B: Workflow Components

'use client';

import { useState, useRef } from 'react';

interface FileUploadConfig {
  allowedTypes: string[];
  maxFileSize: number; // in bytes
  categorization: Record<string, string>;
}

interface FileUploaderProps {
  config: FileUploadConfig;
  onUpload: (file: File, category: string) => Promise<void>;
  stakeholderId: string;
}

const DEFAULT_CONFIG: FileUploadConfig = {
  allowedTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/csv',
    'image/png',
    'image/jpeg'
  ],
  maxFileSize: 50 * 1024 * 1024, // 50MB
  categorization: {
    business_plan: 'Business Plan',
    financial_model: 'Financial Model',
    pitch_deck: 'Pitch Deck',
    market_research: 'Market Research',
    team_info: 'Team Information',
    legal: 'Legal Documents',
    other: 'Other'
  }
};

export default function FileUploader({
  config = DEFAULT_CONFIG,
  onUpload,
  stakeholderId: _stakeholderId
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!config.allowedTypes.includes(file.type)) {
      return `File type not allowed. Allowed types: ${getFileExtensions(config.allowedTypes).join(', ')}`;
    }

    // Check file size
    if (file.size > config.maxFileSize) {
      return `File too large. Maximum size: ${formatFileSize(config.maxFileSize)}`;
    }

    return null;
  };

  const getFileExtensions = (mimeTypes: string[]): string[] => {
    const extensions: string[] = [];
    mimeTypes.forEach((type) => {
      if (type === 'application/pdf') extensions.push('PDF');
      if (type.includes('spreadsheetml')) extensions.push('XLSX');
      if (type.includes('wordprocessingml')) extensions.push('DOCX');
      if (type.includes('presentationml')) extensions.push('PPTX');
      if (type === 'text/csv') extensions.push('CSV');
      if (type === 'image/png') extensions.push('PNG');
      if (type === 'image/jpeg') extensions.push('JPG');
    });
    return extensions;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    setError(null);
    setSuccess(false);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !category) {
      setError('Please select a file and category');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await onUpload(selectedFile, category);
      setSuccess(true);
      setSelectedFile(null);
      setCategory('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          className="hidden"
          accept={config.allowedTypes.join(',')}
        />

        <div className="space-y-2">
          <svg
            className={`mx-auto h-12 w-12 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`}
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="text-sm text-gray-600">
            <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
          </div>

          <p className="text-xs text-gray-500">
            {getFileExtensions(config.allowedTypes).join(', ')} up to{' '}
            {formatFileSize(config.maxFileSize)}
          </p>
        </div>
      </div>

      {/* Selected File */}
      {selectedFile && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg
                className="h-8 w-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Category Selection */}
          <div className="mt-4">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Select Category --</option>
              {Object.entries(config.categorization).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Upload Button */}
          <div className="mt-4">
            <button
              onClick={handleUpload}
              disabled={!category || uploading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4">
          <p className="text-sm">File uploaded successfully!</p>
        </div>
      )}
    </div>
  );
}
