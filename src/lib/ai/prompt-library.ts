// Sprint 1d.7: FLM Building Workflow - Prompt Library
// Phase A: AI Interface Foundation

import { createServerClient } from '@/lib/supabase/server';
import { ClaudeClient, getClaudeClient } from './claude-client';
import { getSchemaValidator } from './schema-validator';
import {
  PromptTemplate,
  PromptExecution,
  RenderedPrompt,
  ExecutionContext,
  PromptResponse,
  ValidationResult
} from './types';

export class PromptLibrary {
  private supabase: any;
  private claudeClient: ClaudeClient;
  private validator: any;

  constructor(supabaseClient: any, claudeClient?: ClaudeClient) {
    this.supabase = supabaseClient;
    this.claudeClient = claudeClient || getClaudeClient();
    this.validator = getSchemaValidator();
  }

  /**
   * Get prompt template by code
   */
  async getPromptTemplate(promptCode: string): Promise<PromptTemplate | null> {
    const { data, error } = await this.supabase
      .from('prompt_templates')
      .select('*')
      .eq('prompt_code', promptCode)
      .eq('is_active', true)
      .single();

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

    // Create execution log record (pending)
    const executionId = await this.createExecutionLog({
      prompt_template_id: template.id,
      stakeholder_id: context.stakeholderId,
      workflow_instance_id: context.workflowInstanceId,
      task_id: context.taskId,
      input_data: variables,
      rendered_prompt: `${rendered.systemPrompt}\n\n${rendered.userPrompt}`,
      model_used: context.modelOverride || rendered.model,
      temperature: rendered.temperature,
      max_tokens: rendered.maxTokens,
      status: 'running',
      started_at: new Date().toISOString()
    });

    try {
      // Execute prompt
      const model = context.modelOverride || rendered.model;
      let response: PromptResponse;

      if (template.output_format === 'json') {
        response = await this.claudeClient.executePromptForJson(
          rendered.systemPrompt,
          rendered.userPrompt,
          model,
          rendered.temperature,
          rendered.maxTokens
        );
      } else {
        response = await this.claudeClient.executeRaw(
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

      // Update execution log
      await this.updateExecutionLog(executionId, {
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

      return response;
    } catch (error) {
      // Update execution log with error
      await this.updateExecutionLog(executionId, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      });

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
    const { data: execution, error } = await this.supabase
      .from('prompt_executions')
      .insert(data)
      .select('id')
      .single();

    if (error) {
      console.error('Error creating execution log:', error);
      throw error;
    }

    return execution.id;
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
export async function getPromptLibrary(): Promise<PromptLibrary> {
  const supabase = await createServerClient();
  return new PromptLibrary(supabase);
}
