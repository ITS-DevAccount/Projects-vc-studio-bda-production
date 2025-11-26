// Sprint 1d.7: FLM Building Workflow - Prompt Library Page
// Phase A: AI Interface Foundation

import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PromptLibraryList from '@/components/ai/PromptLibraryList';
import Link from 'next/link';

export default async function PromptsPage() {
  const supabase = await createServerClient();

  // Check authentication
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Check if user is admin
  const { data: isAdmin } = await supabase.rpc('is_user_admin');

  if (!isAdmin) {
    redirect('/dashboard');
  }

  // Fetch all prompts
  const { data: prompts, error } = await supabase
    .from('prompt_templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching prompts:', error);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
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

        {/* Breadcrumb */}
        <div className="text-sm text-gray-600">
          <Link href="/dashboard/admin" className="hover:text-gray-900">
            Admin
          </Link>
          {' / '}
          <span className="text-gray-900 font-medium">AI Prompts</span>
        </div>
      </div>

      {/* List */}
      <PromptLibraryList prompts={prompts || []} />
    </div>
  );
}
