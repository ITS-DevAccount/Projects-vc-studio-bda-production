'use client';

import { AuthProvider } from '@/lib/hooks/useAuth';
import { Suspense } from 'react';

export function AuthProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AuthProvider>{children}</AuthProvider>
    </Suspense>
  );
}
