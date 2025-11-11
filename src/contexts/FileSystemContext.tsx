'use client';

// File System Context
// Shared state for file navigation and hierarchy

import { createContext, useContext, useState, ReactNode } from 'react';

interface PathItem {
  id: string;
  name: string;
}

interface FileSystemContextType {
  currentPath: PathItem[];
  currentParentId: string | null;
  navigateToFolder: (folderId: string, folderName: string) => void;
  navigateToPath: (index: number) => void;
  navigateToRoot: () => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const FileSystemContext = createContext<FileSystemContextType | undefined>(undefined);

export function FileSystemProvider({ children }: { children: ReactNode }) {
  const [currentPath, setCurrentPath] = useState<PathItem[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const currentParentId = currentPath.length > 0
    ? currentPath[currentPath.length - 1].id
    : null;

  const navigateToFolder = (folderId: string, folderName: string) => {
    setCurrentPath([...currentPath, { id: folderId, name: folderName }]);
  };

  const navigateToPath = (index: number) => {
    setCurrentPath(currentPath.slice(0, index + 1));
  };

  const navigateToRoot = () => {
    setCurrentPath([]);
  };

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <FileSystemContext.Provider
      value={{
        currentPath,
        currentParentId,
        navigateToFolder,
        navigateToPath,
        navigateToRoot,
        refreshTrigger,
        triggerRefresh,
      }}
    >
      {children}
    </FileSystemContext.Provider>
  );
}

export function useFileSystem() {
  const context = useContext(FileSystemContext);
  if (context === undefined) {
    throw new Error('useFileSystem must be used within FileSystemProvider');
  }
  return context;
}
