'use client';

import React from 'react';

export interface ValueDisplayProps {
  value: any;
  renderingRule?: 'bullet_list' | 'nested_cards' | 'paragraph' | 'auto';
  depth?: number; // Prevent infinite recursion
  maxDepth?: number;
}

const MAX_DEPTH = 5; // Prevent infinite recursion

/**
 * Recursive component for rendering different data types
 * Handles arrays, objects, strings, numbers, booleans, null/undefined
 */
export default function ValueDisplay({ 
  value, 
  renderingRule = 'auto',
  depth = 0,
  maxDepth = MAX_DEPTH 
}: ValueDisplayProps) {
  // Prevent infinite recursion
  if (depth >= maxDepth) {
    return <span className="text-gray-500 italic">(max depth reached)</span>;
  }

  // Handle null/undefined
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">null</span>;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (renderingRule === 'bullet_list' || renderingRule === 'auto') {
      if (value.length === 0) {
        return <span className="text-gray-400 italic">(empty array)</span>;
      }
      return (
        <ul className="list-disc list-inside space-y-1 ml-2">
          {value.map((item, i) => (
            <li key={i} className="text-gray-700">
              <ValueDisplay value={item} renderingRule={renderingRule} depth={depth + 1} maxDepth={maxDepth} />
            </li>
          ))}
        </ul>
      );
    }
    // If not bullet_list, render as comma-separated
    return (
      <span className="text-gray-700">
        [{value.map((item, i) => (
          <React.Fragment key={i}>
            <ValueDisplay value={item} renderingRule={renderingRule} depth={depth + 1} maxDepth={maxDepth} />
            {i < value.length - 1 && ', '}
          </React.Fragment>
        ))}]
      </span>
    );
  }

  // Handle objects
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    
    if (entries.length === 0) {
      return <span className="text-gray-400 italic">(empty object)</span>;
    }

    if (renderingRule === 'nested_cards') {
      // Render as nested cards (for complex nested structures)
      return (
        <div className="space-y-2">
          {entries.map(([key, val]) => (
            <div key={key} className="ml-2">
              <span className="font-medium text-gray-700">{formatKey(key)}:</span>{' '}
              <ValueDisplay value={val} renderingRule={renderingRule} depth={depth + 1} maxDepth={maxDepth} />
            </div>
          ))}
        </div>
      );
    }

    // Default: render as key-value pairs
    return (
      <div className="ml-4 space-y-2 mt-1">
        {entries.map(([key, val]) => (
          <div key={key}>
            <span className="font-medium text-gray-700">{formatKey(key)}:</span>{' '}
            <ValueDisplay value={val} renderingRule={renderingRule} depth={depth + 1} maxDepth={maxDepth} />
          </div>
        ))}
      </div>
    );
  }

  // Handle primitives (string, number, boolean)
  if (typeof value === 'string') {
    if (renderingRule === 'paragraph' || renderingRule === 'auto') {
      // Split by newlines for multi-line strings
      const lines = value.split('\n');
      if (lines.length > 1) {
        return (
          <div className="space-y-1">
            {lines.map((line, i) => (
              <p key={i} className="text-gray-600">{line || '\u00A0'}</p>
            ))}
          </div>
        );
      }
      return <p className="text-gray-600">{value}</p>;
    }
    return <span className="text-gray-600">{value}</span>;
  }

  if (typeof value === 'number') {
    return <span className="text-gray-700 font-mono">{value}</span>;
  }

  if (typeof value === 'boolean') {
    return (
      <span className={`font-medium ${value ? 'text-green-600' : 'text-red-600'}`}>
        {value ? 'true' : 'false'}
      </span>
    );
  }

  // Fallback: convert to string
  return <span className="text-gray-600">{String(value)}</span>;
}

/**
 * Format key names for display (convert snake_case to Title Case)
 */
function formatKey(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

