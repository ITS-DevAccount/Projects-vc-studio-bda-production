'use client';

// File System Context
// Shared state for file navigation and hierarchy

import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';

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
  const isHandlingPop = useRef(false);

  const currentParentId = currentPath.length > 0
    ? currentPath[currentPath.length - 1].id
    : null;

  const navigateToFolder = (folderId: string, folderName: string) => {
    const nextPath = [...currentPath, { id: folderId, name: folderName }];
    setCurrentPath(nextPath);
    if (typeof window !== 'undefined') {
      window.history.pushState({ fsPathLength: nextPath.length }, '');
    }
  };

  const navigateToPath = (index: number) => {
    const nextPath = currentPath.slice(0, index + 1);
    setCurrentPath(nextPath);
    if (typeof window !== 'undefined') {
      window.history.pushState({ fsPathLength: nextPath.length }, '');
    }
  };

  const navigateToRoot = () => {
    setCurrentPath([]);
    if (typeof window !== 'undefined') {
      window.history.pushState({ fsPathLength: 0 }, '');
    }
  };

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Seed history so back navigation stays within the file browser.
    window.history.replaceState({ fsPathLength: currentPath.length }, '');

    const handlePopState = () => {
      if (isHandlingPop.current) return;
      isHandlingPop.current = true;

      if (currentPath.length > 0) {
        // Go up one folder instead of leaving the app.
        setCurrentPath((prev) => prev.slice(0, Math.max(0, prev.length - 1)));
        window.history.pushState({ fsPathLength: Math.max(0, currentPath.length - 1) }, '');
      } else {
        // Already at root; keep user in app.
        window.history.pushState({ fsPathLength: 0 }, '');
      }

      setTimeout(() => {
        isHandlingPop.current = false;
      }, 0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentPath]);

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
