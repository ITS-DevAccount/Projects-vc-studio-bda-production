'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminMenu from '@/components/admin/AdminMenu';
import Link from 'next/link';

export default function PromptConfigurationPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminMenu />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link
            href="/dashboard/admin/prompts"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition mb-4"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to AI Prompts
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuration Editor</h1>
          <p className="text-gray-600">Edit and configure AI prompt settings and parameters</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <p className="text-gray-600">Configuration editor coming soon...</p>
        </div>
      </main>
    </div>
  );
}






