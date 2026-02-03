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

interface LLMInterface {
  id: string;
  provider: string;
  name: string;
  default_model: string;
  is_active: boolean;
  is_default: boolean;
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
  const [selectedLLMInterfaceId, setSelectedLLMInterfaceId] = useState<string>('');
  const [llmInterfaces, setLlmInterfaces] = useState<LLMInterface[]>([]);
  const [loadingInterfaces, setLoadingInterfaces] = useState(true);

  // Available models per provider
  const getAvailableModels = (provider: string): Array<{ value: string; label: string }> => {
    switch (provider) {
      case 'anthropic':
        return [
          { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Fast, Simple)' },
          { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5 (Standard)' },
          { value: 'claude-opus-4-1-20250514', label: 'Claude Opus 4.1 (Complex)' },
        ];
      case 'deepseek':
        return [
          { value: 'deepseek-chat', label: 'DeepSeek Chat' },
          { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
        ];
      case 'openai':
        return [
          { value: 'gpt-4o', label: 'GPT-4o' },
          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
          { value: 'gpt-4', label: 'GPT-4' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        ];
      case 'gemini':
        return [
          { value: 'gemini-pro', label: 'Gemini Pro' },
          { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' },
        ];
      default:
        return [];
    }
  };

  const selectedInterface = llmInterfaces.find(i => i.id === selectedLLMInterfaceId);
  const availableModels = selectedInterface ? getAvailableModels(selectedInterface.provider) : [];
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [showRendered, setShowRendered] = useState(false);
  const [selectedViewer, setSelectedViewer] = useState<string | null>(null);
  const [showRawResponse, setShowRawResponse] = useState(false);

  // Load LLM interfaces
  useEffect(() => {
    const loadLLMInterfaces = async () => {
      try {
        const response = await fetch('/api/llm-interfaces');
        if (response.ok) {
          const result = await response.json();
          // API returns { interfaces: [...] }
          const interfaces = result.interfaces || result || [];
          setLlmInterfaces(Array.isArray(interfaces) ? interfaces : []);
          
          // Set default to first default interface if available
          if (Array.isArray(interfaces) && interfaces.length > 0) {
            const defaultInterface = interfaces.find((i: LLMInterface) => i.is_default && i.is_active);
            if (defaultInterface) {
              setSelectedLLMInterfaceId(defaultInterface.id);
            }
          }
        }
      } catch (error) {
        console.error('Error loading LLM interfaces:', error);
        setLlmInterfaces([]);
      } finally {
        setLoadingInterfaces(false);
      }
    };
    loadLLMInterfaces();
  }, []);

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
          modelOverride: modelOverride || undefined,
          llmInterfaceId: selectedLLMInterfaceId || undefined
        })
      });

      // Check if response is OK before parsing JSON
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Response is not JSON, use status text
          const text = await response.text().catch(() => '');
          errorMessage = text || errorMessage;
        }
        
        setResult({
          success: false,
          data: null,
          rawResponse: '',
          tokensUsed: { input: 0, output: 0 },
          costEstimate: 0,
          durationMs: 0,
          error: errorMessage
        });
        return;
      }

      // Parse JSON response
      let data;
      try {
        const text = await response.text();
        if (!text) {
          throw new Error('Empty response from server');
        }
        data = JSON.parse(text);
      } catch (parseError) {
        setResult({
          success: false,
          data: null,
          rawResponse: '',
          tokensUsed: { input: 0, output: 0 },
          costEstimate: 0,
          durationMs: 0,
          error: `Failed to parse response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`
        });
        return;
      }
      
      setResult(data);
      
      // Set viewer code from prompt template's default_viewer_code
      if (data.success && selectedPrompt) {
        const viewerCode = (selectedPrompt as any).default_viewer_code || 'JSON_TREE_VIEWER';
        setSelectedViewer(viewerCode);
      }
    } catch (error) {
      console.error('Error executing prompt:', error);
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

          {/* LLM Interface Selection */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">LLM Configuration</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="llmInterface" className="block text-sm font-medium text-gray-700 mb-1">
                  LLM Interface (optional)
                </label>
                <select
                  id="llmInterface"
                  value={selectedLLMInterfaceId}
                  onChange={(e) => setSelectedLLMInterfaceId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loadingInterfaces}
                >
                  <option value="">Use default (no interface)</option>
                  {Array.isArray(llmInterfaces) && llmInterfaces
                    .filter(i => i.is_active)
                    .map((interfaceItem) => (
                      <option key={interfaceItem.id} value={interfaceItem.id}>
                        {interfaceItem.name} ({interfaceItem.provider}) - {interfaceItem.default_model}
                        {interfaceItem.is_default ? ' [Default]' : ''}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select an interface to use for this test, or leave empty to use defaults.
                </p>
              </div>
              
              <div>
                <label htmlFor="modelOverride" className="block text-sm font-medium text-gray-700 mb-1">
                  Model Override (optional)
                </label>
                {selectedLLMInterfaceId && availableModels.length > 0 ? (
                  <>
                    <select
                      id="modelOverride"
                      value={modelOverride}
                      onChange={(e) => setModelOverride(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Use interface default ({selectedInterface?.default_model})</option>
                      {availableModels.map((model) => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Select a model or leave as default. You can also type a custom model name below.
                    </p>
                    <input
                      type="text"
                      value={modelOverride}
                      onChange={(e) => setModelOverride(e.target.value)}
                      className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Or type a custom model name..."
                    />
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      id="modelOverride"
                      value={modelOverride}
                      onChange={(e) => setModelOverride(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={selectedLLMInterfaceId 
                        ? llmInterfaces.find(i => i.id === selectedLLMInterfaceId)?.default_model || selectedPrompt?.default_model || ''
                        : selectedPrompt?.default_model || ''}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedLLMInterfaceId 
                        ? 'Select an LLM interface above to see available models'
                        : 'Override the default model (e.g., claude-sonnet-4-5-20250929, gpt-4, deepseek-chat, gemini-pro)'}
                    </p>
                  </>
                )}
              </div>
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
