'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import PromptLibraryList from '@/components/ai/PromptLibraryList';
import Link from 'next/link';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminMenu from '@/components/admin/AdminMenu';

export default function PromptLibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [prompts, setPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
      return;
    }
    if (user) {
      loadPrompts();
    }
  }, [user, authLoading]);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
    } catch (err) {
      console.error('Error fetching prompts:', err);
    } finally {
      setLoading(false);
    }
  };

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

