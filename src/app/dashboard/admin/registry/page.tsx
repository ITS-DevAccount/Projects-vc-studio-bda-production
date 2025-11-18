/**
 * Registry Management Dashboard
 * Sprint 10.1d.2: Registry Consolidation & Management
 * Location: /dashboard/admin/registry
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { RegistryTable } from './RegistryTable';
import { RegistryCreateModal } from './RegistryCreateModal';
import { RegistryEditModal } from './RegistryEditModal';
import { RegistryDeleteConfirmation } from './RegistryDeleteConfirmation';
import type { RegistryEntry, RegistryFilters } from '@/lib/types/registry';

export default function RegistryManagementPage() {
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<RegistryEntry | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [filters, setFilters] = useState<RegistryFilters>({});
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Fetch registry entries
  const fetchEntries = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: pageSize.toString(),
      });

      if (filters.registry_type) params.append('registry_type', filters.registry_type);
      if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/registry?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch registry entries');
      }

      const data = await response.json();
      setEntries(data.data || []);
      setTotalCount(data.count || 0);
    } catch (err: any) {
      console.error('Error fetching registry:', err);
      setError(err.message || 'Failed to load registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [currentPage, filters]);

  const handleCreate = () => {
    setShowCreateModal(true);
  };

  const handleEdit = (entry: RegistryEntry) => {
    setSelectedEntry(entry);
    setShowEditModal(true);
  };

  const handleDelete = (entry: RegistryEntry) => {
    setSelectedEntry(entry);
    setShowDeleteModal(true);
  };

  const handleCreated = () => {
    setShowCreateModal(false);
    fetchEntries();
  };

  const handleUpdated = () => {
    setShowEditModal(false);
    setSelectedEntry(null);
    fetchEntries();
  };

  const handleDeleted = () => {
    setShowDeleteModal(false);
    setSelectedEntry(null);
    fetchEntries();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-6">
      {/* Back Navigation */}
      <div className="mb-4">
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin Dashboard
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Registry Management</h1>
        <p className="text-gray-600 mt-2">
          Manage components, AI functions, and workflow tasks in the system registry
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="mb-4 flex justify-between items-center">
        <div className="flex gap-4 items-center">
          {/* Search */}
          <input
            type="text"
            placeholder="Search components..."
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />

          {/* Filter by type */}
          <select
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setFilters({ ...filters, registry_type: e.target.value as any })}
            value={filters.registry_type || ''}
          >
            <option value="">All Types</option>
            <option value="UI_COMPONENT">UI Component</option>
            <option value="AI_FUNCTION">AI Function</option>
            <option value="WORKFLOW_TASK">Workflow Task</option>
            <option value="ADMIN_TOOL">Admin Tool</option>
          </select>

          {/* Filter by status */}
          <select
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setFilters({ ...filters, is_active: e.target.value === '' ? undefined : e.target.value === 'true' })}
            value={filters.is_active === undefined ? '' : filters.is_active.toString()}
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          + Create Component
        </button>
      </div>

      <RegistryTable
        entries={entries}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <RegistryCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}

      {showEditModal && selectedEntry && (
        <RegistryEditModal
          entry={selectedEntry}
          onClose={() => {
            setShowEditModal(false);
            setSelectedEntry(null);
          }}
          onUpdated={handleUpdated}
        />
      )}

      {showDeleteModal && selectedEntry && (
        <RegistryDeleteConfirmation
          entry={selectedEntry}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedEntry(null);
          }}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
