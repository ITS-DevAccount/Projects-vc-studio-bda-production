'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import PromptLibraryList from '@/components/ai/PromptLibraryList';
import Link from 'next/link';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminMenu from '@/components/admin/AdminMenu';

export default function PromptLibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [prompts, setPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (!authLoading && !user) {
      router.replace('/auth/login');
      return;
    }
    if (user) {
      loadPrompts();
    }
  }, [user, authLoading, mounted]);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/prompts');
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(errorText || `Failed to load prompts (${response.status})`);
      }

      const payload = await response.json();
      setPrompts(payload.prompts || []);
      setError(null);
    } catch (err: any) {
      const errorMessage = err?.message || err?.error?.message || 'Failed to load prompts. Please check your connection and try again.';
      console.error('Error fetching prompts:', {
        message: errorMessage,
        error: err,
        errorType: typeof err,
        errorString: String(err)
      });
      setError(errorMessage);
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <AdminMenu />

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Prompt Library</h1>
              <p className="text-gray-600 mt-1">
                Manage prompt templates for FLM creation and document generation
              </p>
            </div>
            <Link
              href="/dashboard/admin/prompts/test"
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Test Harness
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
            <p className="font-medium">Error</p>
            <p className="text-sm mt-1">{error}</p>

          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading prompts...</div>
        ) : (
          <PromptLibraryList prompts={prompts} />
        )}
      </main>
    </div>
  );
}

