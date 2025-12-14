// OpenAI API Client
// Implements LLMClient interface for OpenAI-compatible APIs

import { LLMClient, PromptResponse, LLMClientConfig, LLMProvider, ModelComplexity } from './types';

export class OpenAIClient implements LLMClient {
  public readonly provider: LLMProvider = 'openai';
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;
  private maxRetries: number;
  private timeout: number;

  constructor(config: LLMClientConfig & { baseUrl?: string }) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.defaultModel = config.defaultModel || 'gpt-4';
    this.maxRetries = config.maxRetries || 3;
    this.timeout = config.timeout || 60000;
  }

  /**
   * Select model based on complexity level
   */
  selectModel(complexity: ModelComplexity): string {
    const modelMap: Record<ModelComplexity, string> = {
      simple: 'gpt-4o-mini',
      standard: 'gpt-4o',
      complex: 'gpt-4-turbo'
    };
    return modelMap[complexity];
  }

  /**
   * Execute raw prompt
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          const res = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
              model: modelToUse,
              messages: [
                ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                { role: 'user', content: userPrompt }
              ],
              temperature: temperature || 0.7,
              max_tokens: maxTokens || 4096
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(`OpenAI API error: ${res.status} ${res.statusText} - ${JSON.stringify(errorData)}`);
          }

          return await res.json();
        } catch (error: any) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            throw new Error('Request timeout');
          }
          throw error;
        }
      });

      const durationMs = Date.now() - startTime;
      const rawResponse = response.choices[0]?.message?.content || '';
      const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0 };

      const tokensUsed = {
        input: usage.prompt_tokens || 0,
        output: usage.completion_tokens || 0
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
    let cleaned = text.trim();

    // Remove markdown code blocks if present
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
   * Calculate estimated cost (approximate, OpenAI pricing)
   */
  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    // Approximate OpenAI pricing per 1M tokens (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 30.00, output: 60.00 },
      'gpt-4-turbo': { input: 10.00, output: 30.00 },
      'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
      'gpt-4o': { input: 5.00, output: 15.00 },
      'gpt-4o-mini': { input: 0.15, output: 0.60 }
    };

    const costs = pricing[model] || { input: 0, output: 0 };
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
    const nonRetryableStatuses = [400, 401, 403, 404];
    const errorMessage = error?.message || '';
    const statusCode = error?.status || error?.statusCode;

    // Check for HTTP status codes
    if (statusCode && nonRetryableStatuses.includes(statusCode)) {
      return true;
    }

    // Check for HTTP status codes in error message
    if (nonRetryableStatuses.some(status => errorMessage.includes(status.toString()))) {
      return true;
    }

    // Check for authentication errors
    if (errorMessage.includes('Invalid API key') || errorMessage.includes('Unauthorized')) {
      return true;
    }

    return false;
  }
}

