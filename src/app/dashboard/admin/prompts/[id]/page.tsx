// Sprint 1d.7: FLM Building Workflow - Edit Prompt Page
// Phase A: AI Interface Foundation

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import PromptTemplateForm from '@/components/ai/PromptTemplateForm';
import Link from 'next/link';
import { PromptTemplate } from '@/lib/ai/types';

export default function EditPromptPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [prompt, setPrompt] = useState<PromptTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPrompt();
  }, [id]);

  const fetchPrompt = async () => {
    try {
      const response = await fetch(`/api/prompts/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch prompt');
      }
      const data = await response.json();
      setPrompt(data.prompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update prompt');
      }

      // Redirect to list page
      router.push('/dashboard/admin/prompts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update prompt');
      throw err;
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/admin/prompts');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading prompt...</div>
        </div>
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          {error || 'Prompt not found'}
        </div>
        <div className="mt-4">
          <Link
            href="/dashboard/admin/prompts"
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Prompts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Edit Prompt</h1>

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
          <span className="text-gray-900 font-medium">{prompt.prompt_code}</span>
        </div>
      </div>

      {/* Form */}
      <PromptTemplateForm
        prompt={prompt}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}
