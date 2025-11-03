'use client';

import { useAuth } from '@/lib/hooks/useAuth';

export default function TestAuthPage() {
  try {
    const auth = useAuth();

    return (
      <div className="min-h-screen bg-black text-white p-8">
        <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
        <div className="space-y-2">
          <p>Loading: {auth.loading ? 'Yes' : 'No'}</p>
          <p>Authenticated: {auth.isAuthenticated ? 'Yes' : 'No'}</p>
          <p>User: {auth.user?.email || 'None'}</p>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <h1 className="text-2xl font-bold mb-4 text-red-500">Auth Error</h1>
        <pre className="bg-gray-900 p-4 rounded">
          {error instanceof Error ? error.message : 'Unknown error'}
        </pre>
      </div>
    );
  }
}
