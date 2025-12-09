'use client';

import React from 'react';
import Card from './shared/Card';
import ValueDisplay from './shared/ValueDisplay';
import JsonTreeViewer from './JsonTreeViewer';

export interface L0DomainStudyViewerProps {
  data: any;
  config?: {
    layout?: {
      columns?: number;
      spacing?: 'small' | 'medium' | 'large';
    };
    sections?: Array<{
      key: string;
      title: string;
      icon?: string;
      color?: string;
    }>;
    [key: string]: any;
  };
}

/**
 * Viewer for L0 Domain Study outputs
 * Structure will be determined by actual output format
 * For now, uses card-based layout similar to DBS viewer
 */
export default function L0DomainStudyViewer({ data, config = {} }: L0DomainStudyViewerProps) {
  // If data is an object with multiple sections, render as cards
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const sections = config.sections || Object.keys(data).map(key => ({
      key,
      title: formatKey(key),
      icon: 'FileText',
      color: 'blue',
    }));

    const layout = config.layout || {};
    const columns = layout.columns || 2;
    const spacing = layout.spacing || 'large';

    const spacingClasses = {
      small: 'gap-4',
      medium: 'gap-6',
      large: 'gap-6',
    };

    // Map columns to Tailwind classes (dynamic classes don't work with JIT)
    const gridColsMap: Record<number, string> = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-4',
    };

    const gridCols = gridColsMap[columns] || gridColsMap[2];

    return (
      <div className={`grid ${gridCols} ${spacingClasses[spacing]}`}>
        {sections.map((section) => {
          const sectionData = data[section.key];
          
          if (!sectionData) {
            return null;
          }

          return (
            <Card
              key={section.key}
              title={section.title}
              icon={section.icon}
              color={section.color as any}
            >
              <ValueDisplay value={sectionData} />
            </Card>
          );
        })}
      </div>
    );
  }

  // Fallback to JSON tree viewer for unknown structures
  return <JsonTreeViewer data={data} config={config} />;
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

