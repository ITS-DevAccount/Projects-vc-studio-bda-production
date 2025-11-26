// Sprint 1d.7: FLM Building Workflow - New Prompt Page
// Phase A: AI Interface Foundation

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PromptTemplateForm from '@/components/ai/PromptTemplateForm';
import Link from 'next/link';

export default function NewPromptPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create prompt');
      }

      // Redirect to list page
      router.push('/dashboard/admin/prompts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create prompt');
      throw err;
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/admin/prompts');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Create New Prompt</h1>

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
          <span className="text-gray-900 font-medium">New</span>
        </div>
      </div>

      {/* Global Error */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Form */}
      <PromptTemplateForm onSubmit={handleSubmit} onCancel={handleCancel} />
    </div>
  );
}
