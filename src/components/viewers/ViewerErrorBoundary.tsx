'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import JsonTreeViewer from './JsonTreeViewer';

interface Props {
  children: ReactNode;
  data: any;
  fallbackViewer?: React.ComponentType<{ data: any; config?: any }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component for viewer rendering
 * Falls back to JsonTreeViewer if a viewer component fails to render
 */
class ViewerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Viewer rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackViewer = this.props.fallbackViewer || JsonTreeViewer;
      
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-yellow-800 text-sm font-medium">
              Viewer rendering error. Showing fallback:
            </span>
          </div>
          <FallbackViewer data={this.props.data} />
        </div>
      );
    }

    return this.props.children;
  }
}

export { ViewerErrorBoundary };
export default ViewerErrorBoundary;

