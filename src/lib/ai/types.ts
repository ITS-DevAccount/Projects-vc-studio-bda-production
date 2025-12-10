// Sprint 1d.7: FLM Building Workflow - AI Types
// Phase A: AI Interface Foundation

export interface ClaudeClientConfig {
  apiKey: string;
  defaultModel?: string;
  maxRetries?: number;
  timeout?: number;
}

export interface PromptRequest {
  promptCode: string;
  inputData: Record<string, any>;
  modelOverride?: string;
  temperatureOverride?: number;
  maxTokensOverride?: number;
  stakeholderId?: string;
  workflowInstanceId?: string;
  taskId?: string;
}

export interface PromptResponse {
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

export interface RenderedPrompt {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  outputFormat: 'json' | 'markdown' | 'text';
  outputSchema?: object;
}

export interface ExecutionContext {
  stakeholderId?: string;
  workflowInstanceId?: string;
  taskId?: string;
  modelOverride?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  data?: any;
}

export interface PromptTemplate {
  id: string;
  app_uuid: string;
  prompt_code: string;
  prompt_name: string;
  description?: string;
  category: 'FLM' | 'AGM' | 'DOCUMENT' | 'ANALYSIS';
  system_prompt?: string;
  user_prompt_template: string;
  default_llm_interface_id?: string;
  default_model: string;
  temperature: number;
  max_tokens: number;
  input_schema: object;
  output_schema: object;
  output_format: 'json' | 'markdown' | 'text';
  version: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PromptExecution {
  id: string;
  prompt_template_id?: string;
  llm_interface_id?: string;
  stakeholder_id?: string;
  workflow_instance_id?: string;
  task_id?: string;
  input_data: object;
  rendered_prompt?: string;
  model_used?: string;
  temperature?: number;
  max_tokens?: number;
  output_data?: object;
  raw_response?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error_message?: string;
  tokens_input?: number;
  tokens_output?: number;
  cost_estimate?: number;
  duration_ms?: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export type ModelComplexity = 'simple' | 'standard' | 'complex';

export const MODEL_MAP: Record<ModelComplexity, string> = {
  simple: 'claude-haiku-4-5-20251001',
  standard: 'claude-sonnet-4-5-20250929',
  complex: 'claude-opus-4-1-20250514'
};

// Cost per 1M tokens (in USD) - approximate values
export const MODEL_COSTS = {
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00 },
  'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00 },
  'claude-opus-4-1-20250514': { input: 15.00, output: 75.00 }
};
