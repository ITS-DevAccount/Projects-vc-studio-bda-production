// Sprint 1d.7: FLM Building Workflow - Prompt Template Form Component
// Phase A: AI Interface Foundation

'use client';

import { useState, useEffect } from 'react';
import { PromptTemplate } from '@/lib/ai/types';

interface PromptTemplateFormProps {
  prompt?: PromptTemplate;
  onSubmit: (data: Partial<PromptTemplate>) => Promise<void>;
  onCancel: () => void;
}

const STANDARD_TEMPLATE = {
  prompt_code: 'NEW_PROMPT_001',
  prompt_name: 'New Prompt',
  description: '',
  category: 'FLM' as const,
  system_prompt: 'You are an expert business analyst working within the Value Chain Evolution Framework (VCEF). Your role is to [DESCRIBE ROLE]. You must output [FORMAT].',
  user_prompt_template: 'Analyse the following input:\n\n{{input}}\n\nProvide your analysis covering:\n\n1. [ASPECT 1]\n2. [ASPECT 2]\n3. [ASPECT 3]\n\nOutput format:\n```json\n{\n  "field1": "...",\n  "field2": "..."\n}\n```',
  default_model: 'claude-sonnet-4-5-20250929',
  temperature: 0.7,
  max_tokens: 4096,
  output_format: 'json' as const,
  is_active: false
};

export default function PromptTemplateForm({
  prompt,
  onSubmit,
  onCancel
}: PromptTemplateFormProps) {
  const [formData, setFormData] = useState(prompt || STANDARD_TEMPLATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);

  useEffect(() => {
    // Extract variables from template
    const vars = extractVariables(formData.user_prompt_template);
    setDetectedVariables(vars);
  }, [formData.user_prompt_template, formData.system_prompt]);

  const extractVariables = (text: string): string[] => {
    const regex = /\{\{\s*(\w+)\s*\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

        <div>
          <label htmlFor="prompt_code" className="block text-sm font-medium text-gray-700 mb-1">
            Prompt Code *
          </label>
          <input
            type="text"
            id="prompt_code"
            value={formData.prompt_code}
            onChange={(e) => setFormData({ ...formData, prompt_code: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="BVS_TO_DBS"
            required
            disabled={!!prompt}
          />
          <p className="text-xs text-gray-500 mt-1">Unique identifier (cannot be changed after creation)</p>
        </div>

        <div>
          <label htmlFor="prompt_name" className="block text-sm font-medium text-gray-700 mb-1">
            Prompt Name *
          </label>
          <input
            type="text"
            id="prompt_name"
            value={formData.prompt_name}
            onChange={(e) => setFormData({ ...formData, prompt_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Business Value Summary to Domain Business Summary"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            placeholder="Describe what this prompt does..."
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="FLM">FLM</option>
            <option value="AGM">AGM</option>
            <option value="DOCUMENT">DOCUMENT</option>
            <option value="ANALYSIS">ANALYSIS</option>
          </select>
        </div>
      </div>

      {/* Prompt Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Prompt Content</h3>

        <div>
          <label htmlFor="system_prompt" className="block text-sm font-medium text-gray-700 mb-1">
            System Prompt
          </label>
          <textarea
            id="system_prompt"
            value={formData.system_prompt || ''}
            onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            rows={4}
            placeholder="You are an expert..."
          />
          <p className="text-xs text-gray-500 mt-1">Sets the AI's role and behavior</p>
        </div>

        <div>
          <label htmlFor="user_prompt_template" className="block text-sm font-medium text-gray-700 mb-1">
            User Prompt Template *
          </label>
          <textarea
            id="user_prompt_template"
            value={formData.user_prompt_template}
            onChange={(e) => setFormData({ ...formData, user_prompt_template: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            rows={12}
            placeholder="Analyse the following: {{input}}"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Use {`{{variableName}}`} for variables
          </p>
        </div>

        {detectedVariables.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">Detected Variables:</p>
            <div className="flex flex-wrap gap-2">
              {detectedVariables.map((variable) => (
                <span
                  key={variable}
                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-mono"
                >
                  {`{{${variable}}}`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Model Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Model Configuration</h3>

        <div>
          <label htmlFor="default_model" className="block text-sm font-medium text-gray-700 mb-1">
            Default Model *
          </label>
          <select
            id="default_model"
            value={formData.default_model}
            onChange={(e) => setFormData({ ...formData, default_model: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="claude-haiku-4-5-20251001">Haiku (Fast, Low Cost)</option>
            <option value="claude-sonnet-4-5-20250929">Sonnet (Balanced - Recommended)</option>
            <option value="claude-opus-4-1-20250514">Opus (Complex Reasoning)</option>
          </select>
        </div>

        <div>
          <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-1">
            Temperature: {formData.temperature}
          </label>
          <input
            type="range"
            id="temperature"
            min="0"
            max="1"
            step="0.1"
            value={formData.temperature}
            onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Focused (0)</span>
            <span>Creative (1)</span>
          </div>
        </div>

        <div>
          <label htmlFor="max_tokens" className="block text-sm font-medium text-gray-700 mb-1">
            Max Tokens
          </label>
          <input
            type="number"
            id="max_tokens"
            value={formData.max_tokens}
            onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="256"
            max="32000"
            step="256"
            required
          />
        </div>

        <div>
          <label htmlFor="output_format" className="block text-sm font-medium text-gray-700 mb-1">
            Output Format *
          </label>
          <select
            id="output_format"
            value={formData.output_format}
            onChange={(e) => setFormData({ ...formData, output_format: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="json">JSON</option>
            <option value="markdown">Markdown</option>
            <option value="text">Text</option>
          </select>
        </div>
      </div>

      {/* Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">Active</span>
        </label>
        <p className="text-xs text-gray-500 mt-1 ml-6">
          Inactive prompts cannot be executed
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Prompt'}
        </button>
      </div>
    </form>
  );
}
