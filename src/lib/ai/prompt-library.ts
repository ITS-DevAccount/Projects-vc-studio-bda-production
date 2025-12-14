// Sprint 1d.7: FLM Building Workflow - Prompt Library
// Phase A: AI Interface Foundation

import { createServerClient } from '@/lib/supabase/server';
import { getLLMClient } from './llm-client-factory';
import { getSchemaValidator } from './schema-validator';
import {
  PromptTemplate,
  PromptExecution,
  RenderedPrompt,
  ExecutionContext,
  PromptResponse,
  ValidationResult,
  LLMClient,
  LLMProvider
} from './types';

export class PromptLibrary {
  private supabase: any;
  private validator: any;
  private app_uuid?: string;

  constructor(supabaseClient: any, app_uuid?: string) {
    this.supabase = supabaseClient;
    this.validator = getSchemaValidator();
    this.app_uuid = app_uuid;
  }

  /**
   * Get prompt template by code
   */
  async getPromptTemplate(promptCode: string): Promise<PromptTemplate | null> {
    let query = this.supabase
      .from('prompt_templates')
      .select('*')
      .eq('prompt_code', promptCode)
      .eq('is_active', true);

    // Filter by app_uuid if provided
    if (this.app_uuid) {
      query = query.eq('app_uuid', this.app_uuid);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('Error fetching prompt template:', error);
      return null;
    }

    return data;
  }

  /**
   * Render template with variables
   */
  renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;

    // Replace {{variable}} placeholders
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      const replacement = typeof value === 'string'
        ? value
        : JSON.stringify(value, null, 2);
      rendered = rendered.replace(regex, replacement);
    });

    return rendered;
  }

  /**
   * Get and render a prompt
   */
  async getPrompt(
    promptCode: string,
    variables: Record<string, any>
  ): Promise<RenderedPrompt | null> {
    const template = await this.getPromptTemplate(promptCode);
    if (!template) {
      return null;
    }

    const systemPrompt = template.system_prompt
      ? this.renderTemplate(template.system_prompt, variables)
      : '';

    const userPrompt = this.renderTemplate(template.user_prompt_template, variables);

    return {
      systemPrompt,
      userPrompt,
      model: template.default_model,
      temperature: template.temperature,
      maxTokens: template.max_tokens,
      outputFormat: template.output_format,
      outputSchema: template.output_schema
    };
  }

  /**
   * Validate input data against prompt's input schema
   */
  validateInput(data: any, schema: object): ValidationResult {
    if (!schema || Object.keys(schema).length === 0) {
      return { valid: true, data };
    }
    return this.validator.validate(data, schema);
  }

  /**
   * Validate output data against prompt's output schema
   */
  validateOutput(data: any, schema: object): ValidationResult {
    if (!schema || Object.keys(schema).length === 0) {
      return { valid: true, data };
    }
    return this.validator.validate(data, schema);
  }

  /**
   * Execute prompt with full logging
   */
  async executePrompt(
    promptCode: string,
    variables: Record<string, any>,
    context: ExecutionContext = {}
  ): Promise<PromptResponse> {
    const startTime = Date.now();

    // Get template
    const template = await this.getPromptTemplate(promptCode);
    if (!template) {
      return {
        success: false,
        data: null,
        rawResponse: '',
        tokensUsed: { input: 0, output: 0 },
        costEstimate: 0,
        durationMs: Date.now() - startTime,
        error: `Prompt template '${promptCode}' not found`
      };
    }

    // Validate input
    const inputValidation = this.validateInput(variables, template.input_schema);
    if (!inputValidation.valid) {
      return {
        success: false,
        data: null,
        rawResponse: '',
        tokensUsed: { input: 0, output: 0 },
        costEstimate: 0,
        durationMs: Date.now() - startTime,
        error: `Input validation failed: ${inputValidation.errors?.join(', ')}`
      };
    }

    // Render prompt
    const rendered = await this.getPrompt(promptCode, variables);
    if (!rendered) {
      return {
        success: false,
        data: null,
        rawResponse: '',
        tokensUsed: { input: 0, output: 0 },
        costEstimate: 0,
        durationMs: Date.now() - startTime,
        error: 'Failed to render prompt'
      };
    }

    // Use override from context, or fall back to template's default
    const llmInterfaceId = context.llmInterfaceId || template.default_llm_interface_id;

    // Load LLM interface if specified (get full interface including default_model)
    // Do this before creating execution log so we can log the correct model
    let provider: LLMProvider = 'anthropic'; // Default fallback
    let interfaceDefaultModel: string | undefined;
    
    if (llmInterfaceId) {
      const { data: llmInterface, error: interfaceError } = await this.supabase
        .from('llm_interfaces')
        .select('provider, default_model')
        .eq('id', llmInterfaceId)
        .single();

      if (interfaceError) {
        console.error('Error loading LLM interface:', interfaceError);
        throw new Error(`Failed to load LLM interface: ${interfaceError.message}`);
      }

      if (llmInterface) {
        provider = llmInterface.provider as LLMProvider;
        interfaceDefaultModel = llmInterface.default_model || undefined;
      } else {
        throw new Error(`LLM interface with ID ${llmInterfaceId} not found`);
      }
    }

    // Determine which model will be used (for logging)
    // Use interface's default_model if available, otherwise use prompt template's model
    const modelToUse = context.modelOverride || interfaceDefaultModel || rendered.model;

    // Create execution log record (pending)
    const executionId = await this.createExecutionLog({
      prompt_template_id: template.id,
      llm_interface_id: llmInterfaceId || undefined,
      stakeholder_id: context.stakeholderId,
      workflow_instance_id: context.workflowInstanceId,
      task_id: context.taskId,
      input_data: variables,
      rendered_prompt: `${rendered.systemPrompt}\n\n${rendered.userPrompt}`,
      model_used: modelToUse,
      temperature: rendered.temperature,
      max_tokens: rendered.maxTokens,
      status: 'running',
      started_at: new Date().toISOString()
    });

    try {
      // Get LLM client based on prompt template configuration
      // Note: LLM interfaces are shared across all apps (not app-specific)
      let llmClient: LLMClient;

      // Get LLM client from factory (interfaces are shared across all apps)
      llmClient = await getLLMClient(
        provider,
        llmInterfaceId
      );

      // Execute prompt
      // Use interface's default_model if available, otherwise use prompt template's model
      // modelOverride always takes precedence
      const model = context.modelOverride || interfaceDefaultModel || rendered.model;
      let response: PromptResponse;

      if (template.output_format === 'json') {
        response = await llmClient.executePromptForJson(
          rendered.systemPrompt,
          rendered.userPrompt,
          model,
          rendered.temperature,
          rendered.maxTokens
        );
      } else {
        response = await llmClient.executeRaw(
          rendered.systemPrompt,
          rendered.userPrompt,
          model,
          rendered.temperature,
          rendered.maxTokens
        );
      }

      // Validate output if schema exists and format is JSON
      if (response.success && template.output_format === 'json' && rendered.outputSchema) {
        const outputValidation = this.validateOutput(response.data, rendered.outputSchema);
        if (!outputValidation.valid) {
          response.success = false;
          response.error = `Output validation failed: ${outputValidation.errors?.join(', ')}`;
        }
      }

      // Update execution log (include llm_interface_id if available)
      if (executionId) {
        await this.updateExecutionLog(executionId, {
          llm_interface_id: llmInterfaceId || undefined,
          output_data: response.data,
          raw_response: response.rawResponse,
          status: response.success ? 'completed' : 'failed',
          error_message: response.error,
          tokens_input: response.tokensUsed.input,
          tokens_output: response.tokensUsed.output,
          cost_estimate: response.costEstimate,
          duration_ms: response.durationMs,
          completed_at: new Date().toISOString()
        });
      }

      return response;
    } catch (error) {
      // Update execution log with error (if log was created)
      if (executionId) {
        await this.updateExecutionLog(executionId, {
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString()
        });
      }

      return {
        success: false,
        data: null,
        rawResponse: '',
        tokensUsed: { input: 0, output: 0 },
        costEstimate: 0,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create execution log record
   */
  private async createExecutionLog(data: Partial<PromptExecution>): Promise<string> {
    try {
      const { data: execution, error } = await this.supabase
        .from('prompt_executions')
        .insert(data)
        .select('id')
        .single();

      if (error) {
        console.error('Error creating execution log:', error);
        // Don't throw - return empty string so execution can continue
        // Logging failures shouldn't break prompt execution
        return '';
      }

      return execution?.id || '';
    } catch (err) {
      console.error('Unexpected error creating execution log:', err);
      return '';
    }
  }

  /**
   * Update execution log record
   */
  private async updateExecutionLog(id: string, data: Partial<PromptExecution>): Promise<void> {
    const { error } = await this.supabase
      .from('prompt_executions')
      .update(data)
      .eq('id', id);

    if (error) {
      console.error('Error updating execution log:', error);
    }
  }

  /**
   * Extract variables from template
   */
  extractVariables(template: string): string[] {
    const regex = /\{\{\s*(\w+)\s*\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(template)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }
}

/**
 * Get PromptLibrary instance
 */
export async function getPromptLibrary(app_uuid?: string): Promise<PromptLibrary> {
  const supabase = await createServerClient();
  
  // If app_uuid not provided, try to get it from app context
  if (!app_uuid) {
    try {
      const { getAppContext } = await import('@/lib/server/getAppUuid');
      const appContext = await getAppContext();
      app_uuid = appContext.app_uuid;
    } catch (error) {
      console.warn('Could not get app_uuid for PromptLibrary:', error);
      // Continue without app_uuid filtering (for backwards compatibility)
    }
  }
  
  return new PromptLibrary(supabase, app_uuid);
}
