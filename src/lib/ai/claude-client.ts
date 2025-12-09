// Sprint 1d.7: FLM Building Workflow - Claude API Client
// Phase A: AI Interface Foundation

import Anthropic from '@anthropic-ai/sdk';
import {
  ClaudeClientConfig,
  PromptResponse,
  ModelComplexity,
  MODEL_MAP,
  MODEL_COSTS
} from './types';

export class ClaudeClient {
  private client: Anthropic;
  private defaultModel: string;
  private maxRetries: number;

  constructor(config: ClaudeClientConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey
    });
    this.defaultModel = config.defaultModel || MODEL_MAP.standard;
    this.maxRetries = config.maxRetries || 3;
    // Note: timeout is stored in config but not currently used in API calls
  }

  /**
   * Select model based on complexity level
   */
  selectModel(complexity: ModelComplexity): string {
    return MODEL_MAP[complexity];
  }

  /**
   * Execute raw prompt (for testing)
   */
  async executeRaw(
    systemPrompt: string,
    userPrompt: string,
    model?: string,
    temperature?: number,
    maxTokens?: number
  ): Promise<PromptResponse> {
    const startTime = Date.now();
    const modelToUse = model || this.defaultModel;

    try {
      const response = await this.retryWithBackoff(async () => {
        return await this.client.messages.create({
          model: modelToUse,
          max_tokens: maxTokens || 4096,
          temperature: temperature || 0.7,
          system: systemPrompt || undefined,
          messages: [
            {
              role: 'user',
              content: userPrompt
            }
          ]
        });
      });

      const durationMs = Date.now() - startTime;
      const rawResponse = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      const tokensUsed = {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens
      };

      const costEstimate = this.calculateCost(
        modelToUse,
        tokensUsed.input,
        tokensUsed.output
      );

      return {
        success: true,
        data: rawResponse,
        rawResponse,
        tokensUsed,
        costEstimate,
        durationMs
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      return {
        success: false,
        data: null,
        rawResponse: '',
        tokensUsed: { input: 0, output: 0 },
        costEstimate: 0,
        durationMs,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute prompt with JSON output expectation
   */
  async executePromptForJson(
    systemPrompt: string,
    userPrompt: string,
    model?: string,
    temperature?: number,
    maxTokens?: number
  ): Promise<PromptResponse> {
    const response = await this.executeRaw(
      systemPrompt,
      userPrompt,
      model,
      temperature,
      maxTokens
    );

    if (!response.success) {
      return response;
    }

    try {
      // Try to extract and parse JSON from response
      const jsonData = this.extractJson(response.rawResponse);
      return {
        ...response,
        data: jsonData
      };
    } catch (error) {
      return {
        ...response,
        success: false,
        error: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Extract JSON from response (handles markdown code blocks)
   */
  private extractJson(text: string): any {
    // Remove markdown code blocks if present
    let cleaned = text.trim();

    // Remove ```json or ``` markers
    cleaned = cleaned.replace(/^```json\s*/i, '');
    cleaned = cleaned.replace(/^```\s*/, '');
    cleaned = cleaned.replace(/\s*```$/, '');

    // Find JSON object or array
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      cleaned = jsonMatch[1];
    }

    return JSON.parse(cleaned);
  }

  /**
   * Calculate estimated cost based on token usage
   */
  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const costs = MODEL_COSTS[model as keyof typeof MODEL_COSTS];
    if (!costs) {
      return 0;
    }

    const inputCost = (inputTokens / 1000000) * costs.input;
    const outputCost = (outputTokens / 1000000) * costs.output;

    return inputCost + outputCost;
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        // If we've exhausted retries, throw
        if (i === retries) {
          throw lastError;
        }

        // Exponential backoff: 1s, 2s, 4s, 8s
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Retry failed');
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetryableError(error: any): boolean {
    // Don't retry on validation errors, authentication errors, etc.
    const nonRetryableStatuses = [400, 401, 403, 404];

    if (error?.status && nonRetryableStatuses.includes(error.status)) {
      return true;
    }

    return false;
  }
}

/**
 * Get Claude client instance with API key from environment
 */
export function getClaudeClient(): ClaudeClient {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  return new ClaudeClient({
    apiKey,
    defaultModel: process.env.CLAUDE_DEFAULT_MODEL,
    maxRetries: parseInt(process.env.CLAUDE_MAX_RETRIES || '3'),
    timeout: parseInt(process.env.CLAUDE_TIMEOUT_MS || '60000')
  });
}
