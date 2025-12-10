'use client';

import React, { Suspense, ComponentType } from 'react';
import { useViewerConfig } from '@/hooks/useViewerConfig';
import JsonTreeViewer from './JsonTreeViewer';
import { ViewerErrorBoundary } from './ViewerErrorBoundary';

// Lazy load viewers to improve initial bundle size
const DomainBusinessSummaryViewer = React.lazy(() => import('./DomainBusinessSummaryViewer'));
const L0DomainStudyViewer = React.lazy(() => import('./L0DomainStudyViewer'));
const TableViewer = React.lazy(() => import('./TableViewer'));
const DocumentViewer = React.lazy(() => import('./DocumentViewer'));

export interface ViewerRegistryProps {
  viewerCode: string | null | undefined;
  data: any; // The parsed output_data from prompt_executions
  config?: any; // Optional viewer config override (if not provided, will fetch from DB)
}

interface ViewerComponentProps {
  data: any;
  config?: any;
}

// Map viewer codes to components
const viewerComponents: Record<string, ComponentType<ViewerComponentProps>> = {
  'DBS_CARD_VIEW': DomainBusinessSummaryViewer as ComponentType<ViewerComponentProps>,
  'L0_DOMAIN_VIEWER': L0DomainStudyViewer as ComponentType<ViewerComponentProps>,
  'JSON_TREE_VIEWER': JsonTreeViewer,
  'TABLE_VIEWER': TableViewer as ComponentType<ViewerComponentProps>,
  'DOCUMENT_VIEWER': DocumentViewer as ComponentType<ViewerComponentProps>,
};

/**
 * Main registry component that routes to the appropriate viewer based on viewer_code
 * 
 * Flow:
 * 1. Fetches viewer config from components_registry if not provided
 * 2. Maps viewer_code to React component
 * 3. Renders the appropriate viewer with data and config
 * 4. Falls back to JsonTreeViewer if viewer_code not found or component fails
 */
export default function ViewerRegistry({ viewerCode, data, config: providedConfig }: ViewerRegistryProps) {
  // Fetch config from database if not provided
  // IMPORTANT: Hooks must be called before any early returns
  const { config: fetchedConfig, loading, error } = useViewerConfig(viewerCode);
  
  // Handle empty/null data
  if (data === null || data === undefined) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <p className="text-gray-500 text-sm">No data to display</p>
      </div>
    );
  }
  
  // Use provided config if available, otherwise use fetched config
  const config = providedConfig || fetchedConfig;

  // Determine which viewer component to use
  // Default to JSON_TREE_VIEWER if viewer_code is missing or not found
  const effectiveViewerCode = viewerCode || 'JSON_TREE_VIEWER';
  const ViewerComponent = viewerComponents[effectiveViewerCode] || JsonTreeViewer;

  // Loading state
  if (loading && !providedConfig) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
          <span className="text-sm text-gray-600">Loading viewer configuration...</span>
        </div>
      </div>
    );
  }

  // Error state (non-fatal, still render with default config)
  if (error && !providedConfig) {
    console.warn('Error loading viewer config, using defaults:', error);
  }

  // Render viewer with error boundary
  return (
    <ViewerErrorBoundary data={data} fallbackViewer={JsonTreeViewer}>
      <Suspense
        fallback={
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              <span className="text-sm text-gray-600">Loading viewer...</span>
            </div>
          </div>
        }
      >
        <ViewerComponent data={data} config={config} />
      </Suspense>
    </ViewerErrorBoundary>
  );
}

