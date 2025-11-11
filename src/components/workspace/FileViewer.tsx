'use client';

// File Viewer Component
// Phase 1c: Component Registry & File System
// Modal component for viewing/previewing files

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Download, ExternalLink } from 'lucide-react';

interface FileViewerProps {
  fileName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  onClose: () => void;
}

export default function FileViewer({
  fileName,
  filePath,
  mimeType,
  sizeBytes,
  onClose
}: FileViewerProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFileUrl();
  }, [filePath]);

  const fetchFileUrl = async () => {
    try {
      const supabase = createClient();

      // Get signed URL (valid for 1 hour)
      const { data, error } = await supabase.storage
        .from('workspace-files')
        .createSignedUrl(filePath, 3600);

      if (error) {
        throw new Error(`Failed to load file: ${error.message}`);
      }

      setFileUrl(data.signedUrl);
    } catch (err: any) {
      console.error('Error loading file:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!fileUrl) return;

    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download file');
    }
  };

  const handleOpenInNewTab = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  const formatFileSize = (bytes: number): string => {
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading file...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-red-600 text-4xl mb-4">⚠️</div>
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchFileUrl}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (!fileUrl) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-600">Unable to load file</p>
        </div>
      );
    }

    // Image preview
    if (mimeType.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-900 p-4">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      );
    }

    // PDF preview
    if (mimeType === 'application/pdf') {
      return (
        <iframe
          src={fileUrl}
          className="w-full h-full border-0"
          title={fileName}
        />
      );
    }

    // Text file preview
    if (mimeType.startsWith('text/') || mimeType === 'application/json') {
      return (
        <iframe
          src={fileUrl}
          className="w-full h-full border-0 bg-white"
          title={fileName}
        />
      );
    }

    // Video preview
    if (mimeType.startsWith('video/')) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-900">
          <video
            src={fileUrl}
            controls
            className="max-w-full max-h-full"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // Audio preview
    if (mimeType.startsWith('audio/')) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-6xl mb-4">🎵</div>
            <audio src={fileUrl} controls className="mx-auto" />
          </div>
        </div>
      );
    }

    // Fallback for unsupported types
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <p className="text-gray-600 mb-2">Preview not available</p>
          <p className="text-sm text-gray-500 mb-4">
            This file type cannot be previewed in the browser
          </p>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Download to View
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white rounded-lg shadow-2xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-800 truncate">
              {fileName}
            </h2>
            <p className="text-sm text-gray-500">
              {mimeType} • {formatFileSize(sizeBytes)}
            </p>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={handleOpenInNewTab}
              disabled={!fileUrl}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
              title="Open in new tab"
            >
              <ExternalLink className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownload}
              disabled={!fileUrl}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
              title="Download file"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
              title="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-hidden">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
}
