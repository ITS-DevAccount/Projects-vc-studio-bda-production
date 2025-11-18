/**
 * Registry Table Component
 * Sprint 10.1d.2: Registry Consolidation & Management
 */

'use client';

import type { RegistryEntry } from '@/lib/types/registry';

interface RegistryTableProps {
  entries: RegistryEntry[];
  loading: boolean;
  onEdit: (entry: RegistryEntry) => void;
  onDelete: (entry: RegistryEntry) => void;
}

export function RegistryTable({ entries, loading, onEdit, onDelete }: RegistryTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">Loading registry entries...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">No registry entries found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Component
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Code
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Version
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
                <div className="flex items-center">
                  {entry.icon_name && (
                    <span className="mr-2 text-gray-400">{entry.icon_name}</span>
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {entry.component_name}
                    </div>
                    {entry.description && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {entry.description}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm font-mono text-gray-600">
                  {entry.component_code}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {entry.registry_type?.replace('_', ' ')}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    entry.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {entry.is_active ? 'Active' : 'Inactive'}
                </span>
                {entry.is_beta && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Beta
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                v{entry.version}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onEdit(entry)}
                  className="text-blue-600 hover:text-blue-900 mr-4"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(entry)}
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
  );
}
