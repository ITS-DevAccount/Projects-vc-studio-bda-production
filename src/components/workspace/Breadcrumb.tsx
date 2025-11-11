'use client';

// Breadcrumb Component
// Phase 1c: Component Registry & File System
// Shared breadcrumb navigation for workspace components

import { useFileSystem } from '@/contexts/FileSystemContext';

export default function Breadcrumb() {
  const { currentPath, navigateToPath, navigateToRoot } = useFileSystem();

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      navigateToRoot();
    } else {
      navigateToPath(index);
    }
  };

  return (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center text-sm text-blue-800">
        <button
          onClick={() => handleBreadcrumbClick(-1)}
          className="hover:text-blue-600 hover:underline transition-colors font-medium"
        >
          🏠 Home
        </button>
        {currentPath.map((pathItem, index) => (
          <span key={pathItem.id} className="flex items-center">
            <span className="mx-2 text-blue-400">/</span>
            <button
              onClick={() => handleBreadcrumbClick(index)}
              className={`hover:text-blue-600 hover:underline transition-colors ${
                index === currentPath.length - 1 ? 'font-semibold' : ''
              }`}
            >
              {pathItem.name}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
