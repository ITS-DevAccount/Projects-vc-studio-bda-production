'use client';

import JsonView from '@uiw/react-json-view';

export interface JsonTreeViewerProps {
  data: any;
  config?: {
    collapsible?: boolean;
    copy_button?: boolean;
    theme?: string;
    collapsed?: number | boolean;
    [key: string]: any;
  };
}

/**
 * Generic JSON tree viewer component
 * Used as fallback for any JSON output or when viewer_code is not found
 */
export default function JsonTreeViewer({ data, config: _config = {} }: JsonTreeViewerProps) {
  // Config options are available but JsonView API is limited
  // Keeping config parameter for future extensibility and interface consistency

  // Handle null/undefined data
  if (data === null || data === undefined) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <p className="text-gray-500 text-sm">No data to display</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-x-auto">
      <JsonView
        value={data}
        style={{
          backgroundColor: 'transparent',
          fontSize: '13px',
          fontFamily: 'monospace'
        }}
      />
    </div>
  );
}

