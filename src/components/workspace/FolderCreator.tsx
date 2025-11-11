'use client';

// Folder Creator Component
// Phase 1c: Component Registry & File System
// Modal component for creating new folders

import { useState } from 'react';

export default function FolderCreator() {
  const [folderName, setFolderName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleCreate = async () => {
    if (!folderName.trim()) {
      setError('Folder name is required');
      return;
    }

    // Validate folder name (no special characters except - and _)
    const validName = /^[a-zA-Z0-9-_ ]+$/.test(folderName);
    if (!validName) {
      setError('Folder name can only contain letters, numbers, spaces, hyphens, and underscores');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const folderData = {
        name: folderName.trim(),
        type: 'folder',
        description: description.trim() || undefined,
        parent_id: null // Create at root for now
      };

      const response = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create folder');
      }

      setSuccess(true);
      setFolderName('');
      setDescription('');

      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);

    } catch (err: any) {
      console.error('Error creating folder:', err);
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !creating) {
      handleCreate();
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Folder</h2>

        {/* Folder Name Input */}
        <div className="mb-4">
          <label htmlFor="folder-name" className="block text-sm font-medium text-gray-700 mb-2">
            Folder Name <span className="text-red-500">*</span>
          </label>
          <input
            id="folder-name"
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="My Documents"
            disabled={creating}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Description Input */}
        <div className="mb-6">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description for this folder..."
            disabled={creating}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600 text-sm">Folder created successfully!</p>
          </div>
        )}

        {/* Create Button */}
        <button
          onClick={handleCreate}
          disabled={!folderName.trim() || creating}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            !folderName.trim() || creating
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {creating ? 'Creating...' : 'Create Folder'}
        </button>

        {/* Help Text */}
        <p className="mt-4 text-xs text-gray-500 text-center">
          Folders will be created in your workspace root directory
        </p>
      </div>
    </div>
  );
}
