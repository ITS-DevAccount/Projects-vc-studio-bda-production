// Sprint 1d.7: FLM Building Workflow - Prompt Test Harness Component
// Phase A: AI Interface Foundation

'use client';

import { useState, useEffect } from 'react';
import { PromptTemplate } from '@/lib/ai/types';
import ViewerRegistry from '@/components/viewers/ViewerRegistry';

interface PromptTestHarnessProps {
  prompts: PromptTemplate[];
  initialPromptCode?: string;
}

interface TestResult {
  success: boolean;
  data: any;
  rawResponse: string;
  tokensUsed: {
    input: number;
    output: number;
  };
  costEstimate: number;
  durationMs: number;
  error?: string;
}

export default function PromptTestHarness({
  prompts,
  initialPromptCode
}: PromptTestHarnessProps) {
  const [selectedPromptCode, setSelectedPromptCode] = useState<string>(
    initialPromptCode || ''
  );
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [modelOverride, setModelOverride] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [showRendered, setShowRendered] = useState(false);
  const [selectedViewer, setSelectedViewer] = useState<string | null>(null);
  const [showRawResponse, setShowRawResponse] = useState(false);

  useEffect(() => {
    if (selectedPromptCode) {
      const prompt = prompts.find((p) => p.prompt_code === selectedPromptCode);
      setSelectedPrompt(prompt || null);

      // Extract variables from template
      if (prompt) {
        const vars = extractVariables(
          prompt.system_prompt + ' ' + prompt.user_prompt_template
        );
        const initialVars: Record<string, string> = {};
        vars.forEach((v) => {
          initialVars[v] = '';
        });
        setVariables(initialVars);
      }
    }
  }, [selectedPromptCode, prompts]);

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

  const renderTemplate = (template: string, vars: Record<string, string>): string => {
    let rendered = template;
    Object.entries(vars).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      rendered = rendered.replace(regex, value);
    });
    return rendered;
  };

  const handleExecute = async () => {
    if (!selectedPrompt) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/prompts/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          promptCode: selectedPromptCode,
          inputData: variables,
          modelOverride: modelOverride || undefined
        })
      });

      const data = await response.json();
      setResult(data);
      
      // Set viewer code from prompt template's default_viewer_code
      if (data.success && selectedPrompt) {
        const viewerCode = (selectedPrompt as any).default_viewer_code || 'JSON_TREE_VIEWER';
        setSelectedViewer(viewerCode);
      }
    } catch (error) {
      setResult({
        success: false,
        data: null,
        rawResponse: '',
        tokensUsed: { input: 0, output: 0 },
        costEstimate: 0,
        durationMs: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getRenderedPrompt = () => {
    if (!selectedPrompt) return '';

    const systemPrompt = selectedPrompt.system_prompt
      ? renderTemplate(selectedPrompt.system_prompt, variables)
      : '';
    const userPrompt = renderTemplate(selectedPrompt.user_prompt_template, variables);

    return `SYSTEM:\n${systemPrompt}\n\nUSER:\n${userPrompt}`;
  };

  return (
    <div className="space-y-6">
      {/* Prompt Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Prompt</h3>
        <select
          value={selectedPromptCode}
          onChange={(e) => setSelectedPromptCode(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">-- Select a prompt --</option>
          {prompts.map((prompt) => (
            <option key={prompt.id} value={prompt.prompt_code}>
              {prompt.prompt_code} - {prompt.prompt_name}
            </option>
          ))}
        </select>
      </div>

      {selectedPrompt && (
        <>
          {/* Prompt Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-900">Category:</span>{' '}
                <span className="text-blue-700">{selectedPrompt.category}</span>
              </div>
              <div>
                <span className="font-medium text-blue-900">Model:</span>{' '}
                <span className="text-blue-700">
                  {selectedPrompt.default_model.includes('haiku')
                    ? 'Haiku'
                    : selectedPrompt.default_model.includes('sonnet')
                    ? 'Sonnet'
                    : 'Opus'}
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-900">Output Format:</span>{' '}
                <span className="text-blue-700">{selectedPrompt.output_format}</span>
              </div>
              <div>
                <span className="font-medium text-blue-900">Max Tokens:</span>{' '}
                <span className="text-blue-700">{selectedPrompt.max_tokens}</span>
              </div>
            </div>
          </div>

          {/* Variables */}
          {Object.keys(variables).length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Input Variables</h3>
              <div className="space-y-4">
                {Object.keys(variables).map((varName) => (
                  <div key={varName}>
                    <label
                      htmlFor={varName}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {varName}
                    </label>
                    <textarea
                      id={varName}
                      value={variables[varName]}
                      onChange={(e) =>
                        setVariables({ ...variables, [varName]: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      rows={3}
                      placeholder={`Enter value for ${varName}...`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Model Override */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h3>
            <div>
              <label htmlFor="modelOverride" className="block text-sm font-medium text-gray-700 mb-1">
                Model Override (optional)
              </label>
              <select
                id="modelOverride"
                value={modelOverride}
                onChange={(e) => setModelOverride(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Use default ({selectedPrompt.default_model.includes('haiku') ? 'Haiku' : selectedPrompt.default_model.includes('sonnet') ? 'Sonnet' : 'Opus'})</option>
                <option value="claude-haiku-4-5-20251001">Haiku (Fast, Low Cost)</option>
                <option value="claude-sonnet-4-5-20250929">Sonnet (Balanced)</option>
                <option value="claude-opus-4-1-20250514">Opus (Complex)</option>
              </select>
            </div>
          </div>

          {/* Rendered Prompt Preview */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Rendered Prompt</h3>
              <button
                onClick={() => setShowRendered(!showRendered)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showRendered ? 'Hide' : 'Show'}
              </button>
            </div>
            {showRendered && (
              <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap">
                {getRenderedPrompt()}
              </pre>
            )}
          </div>

          {/* Execute Button */}
          <div className="flex justify-end">
            <button
              onClick={handleExecute}
              disabled={loading || Object.values(variables).some((v) => !v)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Executing...' : 'Execute Prompt'}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Results</h3>

              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                {result.success ? (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    Success
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                    Failed
                  </span>
                )}
              </div>

              {/* Metrics */}
              {result.success && (
                <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-xs text-gray-500">Input Tokens</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {result.tokensUsed.input.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Output Tokens</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {result.tokensUsed.output.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Cost Estimate</div>
                    <div className="text-lg font-semibold text-gray-900">
                      ${result.costEstimate.toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Duration</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {(result.durationMs / 1000).toFixed(2)}s
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {result.error && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
                  <p className="font-medium">Error:</p>
                  <p className="text-sm mt-1">{result.error}</p>
                </div>
              )}

              {/* Rendered Output */}
              {result.success && result.data && (
                <div className="mt-6 border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">Rendered Output</h4>
                    
                    {/* Viewer selector */}
                    <div className="flex items-center gap-3">
                      <label htmlFor="viewer-select" className="text-sm text-gray-600">
                        Viewer:
                      </label>
                      <select
                        id="viewer-select"
                        value={selectedViewer || 'JSON_TREE_VIEWER'}
                        onChange={(e) => setSelectedViewer(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="DBS_CARD_VIEW">Card View</option>
                        <option value="L0_DOMAIN_VIEWER">L0 Domain Viewer</option>
                        <option value="JSON_TREE_VIEWER">JSON Tree</option>
                        <option value="TABLE_VIEWER">Table</option>
                        <option value="DOCUMENT_VIEWER">Document</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Viewer rendering */}
                  <ViewerRegistry 
                    viewerCode={selectedViewer || 'JSON_TREE_VIEWER'}
                    data={result.data}
                  />
                </div>
              )}

              {/* Raw Response Toggle */}
              {result.success && (
                <div className="mt-6 border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">Raw Response</h4>
                    <button
                      onClick={() => setShowRawResponse(!showRawResponse)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {showRawResponse ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {showRawResponse && (
                    <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap border border-gray-200">
                      {result.rawResponse}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
