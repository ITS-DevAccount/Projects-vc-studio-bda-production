'use client';

// File Explorer Component
// Phase 1c: Component Registry & File System
// Displays files and folders from nodes table

import { useEffect, useState } from 'react';

interface Node {
  id: string;
  name: string;
  type: 'file' | 'folder' | 'component';
  parent_id: string | null;
  file_storage_path?: string;
  size_bytes?: number;
  mime_type?: string;
  created_at: string;
  updated_at: string;
  description?: string;
  tags?: string[];
  is_shared: boolean;
}

export default function FileExplorer() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNodes(currentParentId);
  }, [currentParentId]);

  const fetchNodes = async (parentId: string | null) => {
    setLoading(true);
    setError(null);

    try {
      const url = parentId
        ? `/api/nodes/${parentId}`
        : `/api/nodes?parent_id=null`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to load files');
      }

      const data = await response.json();
      setNodes(data.nodes || []);

    } catch (err: any) {
      console.error('Error loading files:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folder: Node) => {
    setCurrentPath([...currentPath, folder.name]);
    setCurrentParentId(folder.id);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      // Go to root
      setCurrentPath([]);
      setCurrentParentId(null);
    } else {
      // Go to specific level
      setCurrentPath(currentPath.slice(0, index + 1));
      // This would need to track folder IDs, simplified for now
      setCurrentParentId(null);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (node: Node): string => {
    if (node.type === 'folder') return '📁';
    if (node.type === 'component') return '🔧';
    if (node.mime_type?.includes('pdf')) return '📄';
    if (node.mime_type?.includes('image')) return '🖼️';
    if (node.mime_type?.includes('spreadsheet') || node.mime_type?.includes('excel')) return '📊';
    if (node.mime_type?.includes('document') || node.mime_type?.includes('word')) return '📝';
    return '📄';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading files...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error: {error}</p>
        <button
          onClick={() => fetchNodes(currentParentId)}
          className="mt-2 text-sm text-red-600 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">File Explorer</h2>

            {/* Breadcrumb */}
            <div className="flex items-center mt-2 text-sm text-gray-600">
              <button
                onClick={() => handleBreadcrumbClick(-1)}
                className="hover:text-blue-600 transition-colors"
              >
                Home
              </button>
              {currentPath.map((folder, index) => (
                <span key={index}>
                  <span className="mx-2">/</span>
                  <button
                    onClick={() => handleBreadcrumbClick(index)}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {folder}
                  </button>
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={() => fetchNodes(currentParentId)}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* File List */}
      <div className="p-4">
        {nodes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No files or folders</p>
            <p className="text-sm mt-2">Upload files or create folders to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {nodes.map((node) => (
              <div
                key={node.id}
                className={`flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${
                  node.type === 'folder' ? 'cursor-pointer' : ''
                }`}
                onClick={() => node.type === 'folder' && handleFolderClick(node)}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <span className="text-2xl">{getFileIcon(node)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {node.name}
                    </p>
                    {node.description && (
                      <p className="text-sm text-gray-500 truncate">
                        {node.description}
                      </p>
                    )}
                    {node.tags && node.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {node.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  {node.type === 'file' && (
                    <span className="w-20 text-right">{formatFileSize(node.size_bytes)}</span>
                  )}
                  <span className="w-32 text-right">{formatDate(node.created_at)}</span>
                  {node.is_shared && (
                    <span className="text-blue-600">🔗 Shared</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
