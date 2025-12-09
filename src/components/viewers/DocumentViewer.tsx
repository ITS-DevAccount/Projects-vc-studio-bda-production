'use client';

import React from 'react';

export interface DocumentViewerProps {
  data: string | any;
  config?: {
    format?: 'markdown' | 'text' | 'html';
    [key: string]: any;
  };
}

/**
 * Viewer for markdown/text document outputs
 * Supports basic markdown rendering (without external library for now)
 * Can be enhanced with markdown library later if needed
 */
export default function DocumentViewer({ data, config = {} }: DocumentViewerProps) {
  // Extract text content
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const format = config.format || 'text';

  if (!text || text.trim().length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-500 text-sm">No content to display</p>
      </div>
    );
  }

  // For now, render as formatted text with basic markdown-like styling
  // Can be enhanced with a markdown library later
  if (format === 'markdown') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 prose prose-sm max-w-none">
        <MarkdownContent content={text} />
      </div>
    );
  }

  // Plain text rendering
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
        {text}
      </pre>
    </div>
  );
}

/**
 * Basic markdown rendering component
 * Handles common markdown patterns without external library
 */
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentParagraph: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      elements.push(
        <p key={elements.length} className="mb-4 text-gray-700">
          {currentParagraph.join(' ')}
        </p>
      );
      currentParagraph = [];
    }
  };

  const flushCodeBlock = () => {
    if (codeBlockContent.length > 0) {
      elements.push(
        <pre key={elements.length} className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
          <code className="text-sm">{codeBlockContent.join('\n')}</code>
        </pre>
      );
      codeBlockContent = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Code blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        flushParagraph();
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      return;
    }

    // Headers
    if (trimmed.startsWith('# ')) {
      flushParagraph();
      elements.push(
        <h1 key={index} className="text-2xl font-bold mb-4 text-gray-900">
          {trimmed.substring(2)}
        </h1>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushParagraph();
      elements.push(
        <h2 key={index} className="text-xl font-semibold mb-3 text-gray-900">
          {trimmed.substring(3)}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushParagraph();
      elements.push(
        <h3 key={index} className="text-lg font-semibold mb-2 text-gray-900">
          {trimmed.substring(4)}
        </h3>
      );
      return;
    }

    // Lists
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      flushParagraph();
      elements.push(
        <li key={index} className="ml-4 mb-1 text-gray-700">
          {trimmed.substring(2)}
        </li>
      );
      return;
    }

    // Empty line
    if (trimmed === '') {
      flushParagraph();
      return;
    }

    // Regular paragraph text
    currentParagraph.push(line);
  });

  flushParagraph();
  flushCodeBlock();

  return <div>{elements}</div>;
}








