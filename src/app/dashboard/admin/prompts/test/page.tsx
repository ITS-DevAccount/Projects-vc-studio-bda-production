// Sprint 1d.7: FLM Building Workflow - Prompt Test Harness Page
// Phase A: AI Interface Foundation

import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PromptTestHarness from '@/components/ai/PromptTestHarness';
import Link from 'next/link';

export default async function PromptTestPage({
  searchParams
}: {
  searchParams: Promise<{ promptCode?: string }>;
}) {
  const supabase = await createServerClient();
  const params = await searchParams;

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

  // Fetch all active prompts
  const { data: prompts, error } = await supabase
    .from('prompt_templates')
    .select('*')
    .eq('is_active', true)
    .order('prompt_name', { ascending: true });

  if (error) {
    console.error('Error fetching prompts:', error);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Prompt Test Harness</h1>

        {/* Breadcrumb */}
        <div className="text-sm text-gray-600">
          <Link href="/dashboard/admin" className="hover:text-gray-900">
            Admin
          </Link>
          {' / '}
          <Link href="/dashboard/admin/prompts" className="hover:text-gray-900">
            AI Prompts
          </Link>
          {' / '}
          <span className="text-gray-900 font-medium">Test Harness</span>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-900">
          <strong>Test Harness:</strong> Execute prompts interactively to validate behavior before
          workflow integration. All executions are logged with metrics.
        </p>
      </div>

      {/* Test Harness */}
      <PromptTestHarness
        prompts={prompts || []}
        initialPromptCode={params.promptCode}
      />
    </div>
  );
}
