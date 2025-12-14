// Google Gemini API Client
// Implements LLMClient interface for Google Gemini API

import { LLMClient, PromptResponse, LLMClientConfig, LLMProvider, ModelComplexity } from './types';

export class GeminiClient implements LLMClient {
  public readonly provider: LLMProvider = 'gemini';
  private apiKey: string;
  private defaultModel: string;
  private maxRetries: number;
  private timeout: number;

  constructor(config: LLMClientConfig) {
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel || 'gemini-pro';
    this.maxRetries = config.maxRetries || 3;
    this.timeout = config.timeout || 60000;
  }

  /**
   * Select model based on complexity level
   */
  selectModel(complexity: ModelComplexity): string {
    const modelMap: Record<ModelComplexity, string> = {
      simple: 'gemini-1.5-flash',
      standard: 'gemini-pro',
      complex: 'gemini-1.5-pro'
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
          // Gemini API endpoint
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${this.apiKey}`;

          // Combine system prompt and user prompt for Gemini
          const combinedPrompt = systemPrompt 
            ? `${systemPrompt}\n\n${userPrompt}`
            : userPrompt;

          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: combinedPrompt
                }]
              }],
              generationConfig: {
                temperature: temperature || 0.7,
                maxOutputTokens: maxTokens || 4096
              }
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(`Gemini API error: ${res.status} ${res.statusText} - ${JSON.stringify(errorData)}`);
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
      const rawResponse = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const usageMetadata = response.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };

      const tokensUsed = {
        input: usageMetadata.promptTokenCount || 0,
        output: usageMetadata.candidatesTokenCount || 0
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
    // Add JSON output instruction to system prompt
    const jsonSystemPrompt = systemPrompt 
      ? `${systemPrompt}\n\nIMPORTANT: Respond with valid JSON only.`
      : 'IMPORTANT: Respond with valid JSON only.';

    const response = await this.executeRaw(
      jsonSystemPrompt,
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
   * Calculate estimated cost (approximate, Gemini pricing)
   */
  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    // Approximate Gemini pricing per 1M tokens (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gemini-pro': { input: 0.50, output: 1.50 },
      'gemini-pro-vision': { input: 0.25, output: 1.00 },
      'gemini-1.5-pro': { input: 1.25, output: 5.00 },
      'gemini-1.5-flash': { input: 0.075, output: 0.30 }
    };

    const costs = pricing[model] || { input: 0.50, output: 1.50 };
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
    const errorMessage = error?.message || '';

    // Check for HTTP status codes in error message
    if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('404')) {
      return true;
    }

    // Check for authentication errors
    if (errorMessage.includes('Invalid API key') || errorMessage.includes('API key not valid')) {
      return true;
    }

    return false;
  }
}

