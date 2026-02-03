'use client';

// File Explorer Component
// Phase 1c: Component Registry & File System
// Displays files and folders from nodes table

import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { File, Folder, Settings, FileUp, FolderPlus, Share2, Trash2, X } from 'lucide-react';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import FileViewer from './FileViewer';
import Breadcrumb from './Breadcrumb';
import FileUploader from './FileUploader';
import FolderCreator from './FolderCreator';

interface NodeShare {
  id: string;
  permission: 'view' | 'edit' | 'admin';
  stakeholder?: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface Node {
  id: string;
  name: string;
  type: 'file' | 'folder' | 'component';
  parent_id: string | null;
  owner?: {
    id: string;
    name: string | null;
    email: string | null;
  };
  file_storage_path?: string;
  size_bytes?: number;
  mime_type?: string;
  created_at: string;
  updated_at: string;
  description?: string;
  tags?: string[];
  is_shared: boolean;
  shares?: NodeShare[];
  child_counts?: {
    folders: number;
    files: number;
  };
}

export default function FileExplorer() {
  const { currentParentId, navigateToFolder, refreshTrigger } = useFileSystem();
  const { currentWorkspace } = useWorkspace();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<Node | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [shareNode, setShareNode] = useState<Node | null>(null);
  const [shareList, setShareList] = useState<NodeShare[]>([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [sharePermission, setSharePermission] = useState<'view' | 'edit' | 'admin'>('view');
  const [shareStakeholderId, setShareStakeholderId] = useState('');
  const [publicToggle, setPublicToggle] = useState(false);
  const [specialCounts, setSpecialCounts] = useState<{ public: number; shared: number }>({
    public: 0,
    shared: 0
  });
  const [stakeholderQuery, setStakeholderQuery] = useState('');
  const [stakeholderResults, setStakeholderResults] = useState<Array<{ id: string; name?: string | null; email?: string | null }>>([]);
  const [stakeholderLoading, setStakeholderLoading] = useState(false);
  const [currentStakeholderId, setCurrentStakeholderId] = useState<string | null>(null);

  useEffect(() => {
    fetchNodes(currentParentId);
  }, [currentParentId, refreshTrigger, currentWorkspace]);

  useEffect(() => {
    const loadStakeholder = async () => {
      try {
        const response = await fetch('/api/stakeholders/me');
        const data = await response.json();
        if (response.ok && data?.stakeholder) {
          setCurrentStakeholderId(data.stakeholder.stakeholder_id || data.stakeholder.id || null);
        }
      } catch {
        setCurrentStakeholderId(null);
      }
    };
    loadStakeholder();
  }, []);

  useEffect(() => {
    if (!stakeholderQuery || stakeholderQuery.trim().length < 2) {
      setStakeholderResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      setStakeholderLoading(true);
      try {
        const params = new URLSearchParams({ q: stakeholderQuery.trim(), pageSize: '10' });
        const response = await fetch(`/api/stakeholders?${params.toString()}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to search stakeholders');
        }
        const results = data.data || [];
        const filteredResults = currentStakeholderId
          ? results.filter((stakeholder: any) => stakeholder.id !== currentStakeholderId)
          : results;
        setStakeholderResults(filteredResults);
      } catch (err) {
        setStakeholderResults([]);
      } finally {
        setStakeholderLoading(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [stakeholderQuery, currentStakeholderId]);

  const fetchNodes = async (parentId: string | null) => {
    setLoading(true);
    setError(null);

    try {
      // Build URL with workspace filter if workspace is selected
      let url: string;
      const params = new URLSearchParams();

      if (parentId) {
        url = `/api/nodes/${parentId}`;
      } else {
        params.set('parent_id', 'null');
        url = `/api/nodes`;
      }

      // Add workspace_id filter if a workspace is currently selected
      if (currentWorkspace?.id) {
        params.set('workspace_id', currentWorkspace.id);
      }

      // Append query parameters if any
      const queryString = params.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }

      const response = await fetch(
        url + (url.includes('?') ? '&' : '?') + 'include_shares=1&include_counts=1&include_owner=1',
        { credentials: 'include' }
      );
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to load files');
      }
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(text || 'Unexpected response');
      }
      const data = await response.json();

      if (!parentId) {
        const [publicRes, sharedRes] = await Promise.all([
          fetch(`/api/nodes/public?include_counts=1&include_owner=1`, { credentials: 'include' }),
          fetch(`/api/nodes/shared?include_counts=1&include_owner=1`, { credentials: 'include' })
        ]);

        const publicCount = publicRes.ok ? (await publicRes.json()).count || 0 : 0;
        const sharedCount = sharedRes.ok ? (await sharedRes.json()).count || 0 : 0;
        setSpecialCounts({ public: publicCount, shared: sharedCount });

        const virtualNodes: Node[] = [
          {
            id: 'public',
            name: 'Public',
            type: 'folder',
            parent_id: null,
            created_at: '',
            updated_at: '',
            is_shared: false,
            child_counts: { folders: 0, files: publicCount }
          },
          {
            id: 'shared',
            name: 'Shared with me',
            type: 'folder',
            parent_id: null,
            created_at: '',
            updated_at: '',
            is_shared: false,
            child_counts: { folders: 0, files: sharedCount }
          }
        ];

        setNodes([...virtualNodes, ...(data.nodes || [])]);
      } else {
        setNodes(data.nodes || []);
      }

    } catch (err: any) {
      console.error('Error loading files:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folder: Node) => {
    navigateToFolder(folder.id, folder.name);
  };

  const handleFileClick = (file: Node) => {
    setSelectedFile(file);
  };

  const handleNodeClick = (node: Node) => {
    if (node.type === 'folder') {
      handleFolderClick(node);
    } else if (node.type === 'file') {
      handleFileClick(node);
    }
  };

  const handleDelete = async (node: Node, event: MouseEvent) => {
    event.stopPropagation();
    if (node.id === 'public' || node.id === 'shared') {
      return;
    }
    const confirmed = window.confirm(`Delete "${node.name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/nodes/${node.id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete');
      }
      if (selectedFile?.id === node.id) {
        setSelectedFile(null);
      }
      fetchNodes(currentParentId);
    } catch (err: any) {
      console.error('Error deleting node:', err);
      setError(err.message || 'Failed to delete item');
    }
  };

  const openShareModal = async (node: Node, event: MouseEvent) => {
    event.stopPropagation();
    if (node.id === 'public' || node.id === 'shared') {
      return;
    }
    setShareNode(node);
    setPublicToggle(!!node.is_shared);
    setShareError(null);
    setShareLoading(true);

    try {
      const response = await fetch(`/api/nodes/shares?node_id=${node.id}`);
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to load shares');
      }
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(text || 'Unexpected response');
      }
      const data = await response.json();
      setShareList(data.shares || []);
      setStakeholderQuery('');
      setStakeholderResults([]);
    } catch (err: any) {
      setShareError(err.message || 'Failed to load shares');
    } finally {
      setShareLoading(false);
    }
  };

  const handlePublicToggle = async (value: boolean) => {
    if (!shareNode) return;
    setPublicToggle(value);
    try {
      const response = await fetch(`/api/nodes?node_id=${shareNode.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_shared: value })
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to update sharing');
      }
      await fetchNodes(currentParentId);
    } catch (err: any) {
      setShareError(err.message || 'Failed to update sharing');
    }
  };

  const handleAddShare = async () => {
    if (!shareNode || !shareStakeholderId.trim()) return;
    if (currentStakeholderId && shareStakeholderId.trim() === currentStakeholderId) {
      setShareError('You cannot share with yourself.');
      return;
    }
    setShareError(null);
    try {
      const response = await fetch(`/api/nodes/shares?node_id=${shareNode.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stakeholder_id: shareStakeholderId.trim(),
          permission: sharePermission
        })
      });
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to add share');
      }
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(text || 'Unexpected response');
      }
      const data = await response.json();
      setShareList((prev) => [...prev, data.share]);
      setShareStakeholderId('');
      await fetchNodes(currentParentId);
    } catch (err: any) {
      setShareError(err.message || 'Failed to add share');
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    if (!shareNode) return;
    setShareError(null);
    try {
      const response = await fetch(`/api/nodes/shares?node_id=${shareNode.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_id: shareId })
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to remove share');
      }
      setShareList((prev) => prev.filter((share) => share.id !== shareId));
      await fetchNodes(currentParentId);
    } catch (err: any) {
      setShareError(err.message || 'Failed to remove share');
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

  const getFileBadge = (node: Node) => {
    if (node.type === 'folder') return { label: 'DIR', tone: 'bg-yellow-100 text-yellow-700' };
    if (node.type === 'component') return { label: 'CMP', tone: 'bg-gray-200 text-gray-700' };
    const name = node.name.toLowerCase();
    const mime = node.mime_type || '';
    if (mime.includes('pdf') || name.endsWith('.pdf')) return { label: 'PDF', tone: 'bg-red-100 text-red-700' };
    if (mime.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) {
      return { label: 'W', tone: 'bg-blue-100 text-blue-700' };
    }
    if (mime.includes('spreadsheet') || mime.includes('excel') || name.endsWith('.xls') || name.endsWith('.xlsx')) {
      return { label: 'X', tone: 'bg-green-100 text-green-700' };
    }
    if (mime.includes('presentation') || name.endsWith('.ppt') || name.endsWith('.pptx')) {
      return { label: 'P', tone: 'bg-orange-100 text-orange-700' };
    }
    if (mime.includes('image') || /\.(png|jpg|jpeg|gif|webp|svg)$/.test(name)) {
      return { label: 'IMG', tone: 'bg-sky-100 text-sky-700' };
    }
    if (mime.includes('audio') || /\.(mp3|wav|aac|m4a|flac)$/.test(name)) {
      return { label: 'AUD', tone: 'bg-purple-100 text-purple-700' };
    }
    if (mime.includes('video') || /\.(mp4|mov|avi|mkv)$/.test(name)) {
      return { label: 'VID', tone: 'bg-indigo-100 text-indigo-700' };
    }
    if (name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z')) {
      return { label: 'ZIP', tone: 'bg-amber-100 text-amber-700' };
    }
    if (mime.includes('json') || name.endsWith('.json')) return { label: 'JSON', tone: 'bg-gray-200 text-gray-700' };
    if (mime.includes('text') || name.endsWith('.txt') || name.endsWith('.md')) {
      return { label: 'TXT', tone: 'bg-gray-100 text-gray-700' };
    }
    return { label: 'FILE', tone: 'bg-gray-100 text-gray-700' };
  };

  const getShareBadge = (node: Node) => {
    if (node.is_shared) {
      return { label: 'P', title: 'Public (any authenticated user)' };
    }
    if (node.shares && node.shares.length > 0) {
      return { label: 'S', title: 'Shared with specific stakeholders' };
    }
    return null;
  };

  const getCounts = () => {
    const folderCount = nodes.filter(node => node.type === 'folder').length;
    const fileCount = nodes.filter(node => node.type === 'file').length;
    return { folderCount, fileCount };
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
      {/* Breadcrumb Navigation */}
      <div className="p-4 pb-0">
        <Breadcrumb />
      </div>

      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-800">File Explorer</h2>
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
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCreateFolder(true)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                title="New folder"
              >
                <FolderPlus className="w-4 h-4" />
                New Folder
              </button>
              <button
                type="button"
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                title="Upload file"
              >
                <FileUp className="w-4 h-4" />
                Upload
              </button>
              <button
                onClick={() => fetchNodes(currentParentId)}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Refresh
              </button>
            </div>
          </div>
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
                  node.type === 'folder' || node.type === 'file' ? 'cursor-pointer' : ''
                }`}
                onClick={() => handleNodeClick(node)}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div className="relative group">
  <div className={`w-10 h-7 rounded-md text-[11px] font-semibold flex items-center justify-center ${getFileBadge(node).tone}`}>
    {getFileBadge(node).label}
  </div>
  {(() => {
    const badge = getShareBadge(node);
    if (!badge) return null;
    return (
      <span
        className="absolute -bottom-1 -right-1 rounded-full bg-gray-900 text-white text-[10px] w-4 h-4 flex items-center justify-center"
        title={badge.title}
      >
        {badge.label}
      </span>
    );
  })()}
  {node.shares && node.shares.length > 0 && !node.is_shared && (
    <div className="absolute left-8 top-0 z-20 hidden group-hover:block">
      <div className="bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-2 text-xs text-gray-700">
        <div className="font-semibold mb-1">Shared with</div>
        <div className="space-y-1">
          {node.shares.slice(0, 5).map((share) => (
            <div key={share.id}>{share.stakeholder?.name || share.stakeholder?.email || share.stakeholder?.id}</div>
          ))}
          {node.shares.length > 5 && (
            <div>+{node.shares.length - 5} more</div>
          )}
        </div>
      </div>
    </div>
  )}
</div>
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
                    {node.type === 'folder' && node.child_counts && (
                      <p className="text-xs text-gray-500 mt-1">
                        {node.child_counts.folders} folders - {node.child_counts.files} files
                      </p>
                    )}
                    {(currentParentId === 'public' || currentParentId === 'shared') && node.owner && (
                      <p className="text-xs text-gray-500 mt-1">
                        Owner: {node.owner.name || node.owner.email || node.owner.id}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  {node.type === "file" && (
                    <span className="w-20 text-right">{formatFileSize(node.size_bytes)}</span>
                  )}
                  <span className="w-32 text-right">{node.id === 'public' || node.id === 'shared' ? '-' : formatDate(node.created_at)}</span>
                  {node.is_shared && (
                    <span className="text-blue-600">Shared</span>
                  )}
                  {node.id !== 'public' && node.id !== 'shared' && (
                  <button
                    type="button"
                    onClick={(event) => openShareModal(node, event)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-600"
                    title="Share"
                    aria-label={`Share ${node.name}`}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  )}
                  {node.id !== 'public' && node.id !== 'shared' && (
                  <button
                    type="button"
                    onClick={(event) => handleDelete(node, event)}
                    className="p-1 rounded hover:bg-red-50 text-red-600"
                    title="Delete"
                    aria-label={`Delete ${node.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File Viewer Modal */}
      {selectedFile && selectedFile.type === 'file' && (
        <FileViewer
          fileName={selectedFile.name}
          filePath={selectedFile.file_storage_path || ''}
          mimeType={selectedFile.mime_type || 'application/octet-stream'}
          sizeBytes={selectedFile.size_bytes || 0}
          onClose={() => setSelectedFile(null)}
        />
      )}

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <span className="text-sm font-medium text-gray-700">Upload Files</span>
              <button
                type="button"
                onClick={() => setShowUpload(false)}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <FileUploader
                compact
                onClose={() => setShowUpload(false)}
                onComplete={() => fetchNodes(currentParentId)}
              />
            </div>
          </div>
        </div>
      )}

      {showCreateFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <span className="text-sm font-medium text-gray-700">New Folder</span>
              <button
                type="button"
                onClick={() => setShowCreateFolder(false)}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <FolderCreator
                compact
                onClose={() => setShowCreateFolder(false)}
                onComplete={() => fetchNodes(currentParentId)}
              />
            </div>
          </div>
        </div>
      )}

      {shareNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <span className="text-sm font-medium text-gray-700">Sharing - {shareNode.name}</span>
              <button
                type="button"
                onClick={() => {
                  setShareNode(null);
                  setShareList([]);
                  setShareStakeholderId('');
                  setShareError(null);
                }}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div>
                  <div className="text-sm font-medium text-gray-900">Public</div>
                  <div className="text-xs text-gray-500">Any authenticated user can access</div>
                </div>
                <input
                  type="checkbox"
                  checked={publicToggle}
                  onChange={(event) => handlePublicToggle(event.target.checked)}
                />
              </div>

              <div className="rounded-lg border border-gray-200 p-3 space-y-3">
                <div className="text-sm font-medium text-gray-900">Share with stakeholder</div>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <div className="flex-1 min-w-[220px]">
                      <input
                        type="text"
                        value={stakeholderQuery}
                        onChange={(event) => setStakeholderQuery(event.target.value)}
                        placeholder="Search stakeholder name or email"
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                      {stakeholderLoading && (
                        <div className="text-xs text-gray-500 mt-1">Searching...</div>
                      )}
                      {!stakeholderLoading && stakeholderResults.length > 0 && (
                        <div className="mt-2 rounded border border-gray-200 bg-white shadow-sm max-h-40 overflow-auto">
                          {stakeholderResults.map((stakeholder) => (
                            <button
                              key={stakeholder.id}
                              type="button"
                              onClick={() => {
                                setShareStakeholderId(stakeholder.id);
                                setStakeholderQuery(stakeholder.name || stakeholder.email || stakeholder.id);
                                setStakeholderResults([]);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              <div className="font-medium text-gray-800">
                                {stakeholder.name || stakeholder.email || stakeholder.id}
                              </div>
                              {stakeholder.email && (
                                <div className="text-xs text-gray-500">{stakeholder.email}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <select
                      value={sharePermission}
                      onChange={(event) => setSharePermission(event.target.value as 'view' | 'edit' | 'admin')}
                      className="rounded border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="view">View</option>
                      <option value="edit">Edit</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddShare}
                      className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                      disabled={!shareStakeholderId.trim()}
                    >
                      Add
                    </button>
                  </div>
                  {shareStakeholderId && (
                    <div className="text-xs text-gray-500">
                      Selected stakeholder ID: {shareStakeholderId}
                    </div>
                  )}
                </div>

                {shareError && (
                  <div className="text-sm text-red-600">{shareError}</div>
                )}

                {shareLoading ? (
                  <div className="text-sm text-gray-500">Loading shares...</div>
                ) : (
                  <div className="space-y-2">
                    {shareList.length === 0 ? (
                      <div className="text-sm text-gray-500">No selective shares.</div>
                    ) : (
                      shareList.map((share) => (
                        <div
                          key={share.id}
                          className="flex items-center justify-between rounded border border-gray-100 px-3 py-2"
                        >
                          <div>
                            <div className="text-sm text-gray-800">
                              {share.stakeholder?.name || share.stakeholder?.email || share.stakeholder?.id}
                            </div>
                            <div className="text-xs text-gray-500">{share.permission}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveShare(share.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
