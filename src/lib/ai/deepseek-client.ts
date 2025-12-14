// DeepSeek API Client
// DeepSeek uses OpenAI-compatible API, so we extend OpenAIClient with custom base URL

import { OpenAIClient } from './openai-client';
import { LLMClientConfig, LLMProvider } from './types';

export class DeepSeekClient extends OpenAIClient {
  public readonly provider: LLMProvider = 'deepseek';

  constructor(config: LLMClientConfig & { baseUrl?: string }) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://api.deepseek.com/v1',
      defaultModel: config.defaultModel || 'deepseek-reasoner'
    });
  }

  // Note: Cost calculation uses OpenAI's pricing structure
  // DeepSeek pricing is typically lower, but we use OpenAI client's calculation
  // This can be enhanced later if needed
}

