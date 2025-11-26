// Sprint 1d.7: FLM Building Workflow - Prompt Library List Component
// Phase A: AI Interface Foundation

'use client';

import { useState } from 'react';
import { PromptTemplate } from '@/lib/ai/types';
import Link from 'next/link';

interface PromptLibraryListProps {
  prompts: PromptTemplate[];
  onDelete?: (id: string) => Promise<void>;
  onDuplicate?: (id: string) => Promise<void>;
}

export default function PromptLibraryList({
  prompts,
  onDelete,
  onDuplicate
}: PromptLibraryListProps) {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const filteredPrompts = prompts.filter((prompt) => {
    // Category filter
    if (filter !== 'all' && prompt.category !== filter) {
      return false;
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        prompt.prompt_name.toLowerCase().includes(searchLower) ||
        prompt.prompt_code.toLowerCase().includes(searchLower) ||
        prompt.description?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'FLM':
        return 'bg-blue-100 text-blue-800';
      case 'AGM':
        return 'bg-green-100 text-green-800';
      case 'DOCUMENT':
        return 'bg-purple-100 text-purple-800';
      case 'ANALYSIS':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getModelBadge = (model: string) => {
    if (model.includes('haiku')) return 'Haiku';
    if (model.includes('sonnet')) return 'Sonnet';
    if (model.includes('opus')) return 'Opus';
    return 'Unknown';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search prompts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="FLM">FLM</option>
              <option value="AGM">AGM</option>
              <option value="DOCUMENT">DOCUMENT</option>
              <option value="ANALYSIS">ANALYSIS</option>
            </select>
            <Link
              href="/dashboard/admin/prompts/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              + New Prompt
            </Link>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredPrompts.length} of {prompts.length} prompts
      </div>

      {/* Prompts Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Model
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPrompts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No prompts found
                </td>
              </tr>
            ) : (
              filteredPrompts.map((prompt) => (
                <tr key={prompt.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono font-medium text-gray-900">
                      {prompt.prompt_code}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{prompt.prompt_name}</div>
                    {prompt.description && (
                      <div className="text-xs text-gray-500 truncate max-w-xs">
                        {prompt.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryBadgeColor(
                        prompt.category
                      )}`}
                    >
                      {prompt.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {getModelBadge(prompt.default_model)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {prompt.is_active ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(prompt.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/dashboard/admin/prompts/${prompt.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/dashboard/admin/prompts/test?promptCode=${prompt.prompt_code}`}
                        className="text-green-600 hover:text-green-900"
                      >
                        Test
                      </Link>
                      {onDuplicate && (
                        <button
                          onClick={() => onDuplicate(prompt.id)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Duplicate
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this prompt?')) {
                              onDelete(prompt.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
