'use client';

import React from 'react';

export interface TableViewerProps {
  data: any[];
  config?: {
    columns?: Array<{
      key: string;
      label: string;
      format?: (value: any) => React.ReactNode;
    }>;
    showIndex?: boolean;
    responsive?: boolean;
    [key: string]: any;
  };
}

/**
 * Viewer for array data rendered as tables
 * Supports column configuration and responsive design
 */
export default function TableViewer({ data, config = {} }: TableViewerProps) {
  // Ensure data is an array
  if (!Array.isArray(data)) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">
          TableViewer expects array data, but received: {typeof data}
        </p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-500 text-sm">No data to display</p>
      </div>
    );
  }

  // Determine columns
  const columns = config.columns || getDefaultColumns(data[0]);
  const showIndex = config.showIndex !== false; // Default to true
  const responsive = config.responsive !== false; // Default to true

  return (
    <div className={`${responsive ? 'overflow-x-auto' : ''} border border-gray-200 rounded-lg`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {showIndex && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50">
              {showIndex && (
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {index + 1}
                </td>
              )}
              {columns.map((col) => {
                const value = row[col.key];
                const displayValue = col.format && typeof col.format === 'function' 
                  ? col.format(value) 
                  : formatValue(value);
                
                return (
                  <td
                    key={col.key}
                    className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap"
                  >
                    {displayValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Get default columns from first row of data
 */
function getDefaultColumns(firstRow: any): Array<{ key: string; label: string; format?: (value: any) => React.ReactNode }> {
  if (!firstRow || typeof firstRow !== 'object') {
    return [];
  }

  return Object.keys(firstRow).map((key) => ({
    key,
    label: formatKey(key),
  }));
}

/**
 * Format key names for display
 */
function formatKey(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format value for display
 */
function formatValue(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">—</span>;
  }

  if (typeof value === 'boolean') {
    return (
      <span className={`font-medium ${value ? 'text-green-600' : 'text-red-600'}`}>
        {value ? 'Yes' : 'No'}
      </span>
    );
  }

  if (typeof value === 'object') {
    return (
      <span className="text-gray-500 italic">
        {Array.isArray(value) ? `[${value.length} items]` : '[object]'}
      </span>
    );
  }

  return String(value);
}

