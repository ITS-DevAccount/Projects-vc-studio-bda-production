'use client';

import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';

export interface DashboardStatusContextType {
  /** Status value from the active component. Null when component has not set anything. */
  status: string | null;
  /** Set the status display. Components call this to show context (e.g. "Editing document X"). Resets on component change. */
  setStatus: (value: string | null) => void;
}

const DashboardStatusContext = createContext<DashboardStatusContextType | undefined>(undefined);

interface DashboardStatusProviderProps {
  children: ReactNode;
  /** When this changes, status is reset. Pass activeComponent from the dashboard. */
  activeComponent?: string;
}

export function DashboardStatusProvider({ children, activeComponent }: DashboardStatusProviderProps) {
  const [status, setStatusState] = useState<string | null>(null);
  const setStatus = useCallback((value: string | null) => {
    setStatusState(value);
  }, []);

  useEffect(() => {
    setStatusState(null);
  }, [activeComponent, setStatus]);

  return (
    <DashboardStatusContext.Provider value={{ status, setStatus }}>
      {children}
    </DashboardStatusContext.Provider>
  );
}

export function useDashboardStatus() {
  const context = useContext(DashboardStatusContext);
  if (context === undefined) {
    throw new Error('useDashboardStatus must be used within DashboardStatusProvider');
  }
  return context;
}

/** Safe hook for consumers that may be outside provider (e.g. DashboardNavMenu). Returns null status when outside provider. */
export function useDashboardStatusOptional(): DashboardStatusContextType | { status: null; setStatus: () => void } {
  const context = useContext(DashboardStatusContext);
  if (context === undefined) {
    return { status: null, setStatus: () => {} };
  }
  return context;
}
