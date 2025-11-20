/**
 * Sprint 1d.4 - Layer 1: Function Registry Management Page
 * Location: /dashboard/admin/function-registry
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Search } from 'lucide-react';
import type {
  FunctionRegistryEntry,
  FunctionRegistryFilters,
  ImplementationType,
} from '@/lib/types/function-registry';

export default function FunctionRegistryPage() {
  const [entries, setEntries] = useState<FunctionRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<FunctionRegistryEntry | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [filters, setFilters] = useState<FunctionRegistryFilters>({});
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  // Fetch entries
  const fetchEntries = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: pageSize.toString(),
      });

      if (filters.implementation_type) params.append('implementation_type', filters.implementation_type);
      if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
      if (search) params.append('search', search);

      const response = await fetch(`/api/function-registry?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch function registry');
      }

      const data = await response.json();
      setEntries(data.data || []);
      setTotalCount(data.count || 0);
    } catch (err: any) {
      console.error('Error fetching function registry:', err);
      setError(err.message || 'Failed to load function registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [currentPage, filters]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchEntries();
  };

  const handleEdit = (entry: FunctionRegistryEntry) => {
    setSelectedEntry(entry);
    setShowEditModal(true);
  };

  const handleDelete = (entry: FunctionRegistryEntry) => {
    setSelectedEntry(entry);
    setShowDeleteModal(true);
  };

  const handleRefresh = () => {
    setSelectedEntry(null);
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
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

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Function Registry</h1>
        <p className="text-gray-600 mt-2">
          Manage workflow task definitions with input/output schemas and UI configurations
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
          {/* Search */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search functions..."
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Filter by implementation type */}
          <select
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setFilters({ ...filters, implementation_type: e.target.value as ImplementationType || undefined })}
            value={filters.implementation_type || ''}
          >
            <option value="">All Types</option>
            <option value="USER_TASK">User Task</option>
            <option value="SERVICE_TASK">Service Task</option>
            <option value="AI_AGENT_TASK">AI Agent Task</option>
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
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Function
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">Loading function registry...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">No functions found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Function Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-gray-900">{entry.function_code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{entry.description || '-'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      entry.implementation_type === 'USER_TASK' ? 'bg-blue-100 text-blue-800' :
                      entry.implementation_type === 'SERVICE_TASK' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {entry.implementation_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      entry.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {entry.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(entry)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(entry)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

      {/* Modals - Placeholder imports */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h2 className="text-xl font-bold mb-4">Create Function (Modal in progress...)</h2>
            <button onClick={handleRefresh} className="px-4 py-2 bg-gray-200 rounded">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
