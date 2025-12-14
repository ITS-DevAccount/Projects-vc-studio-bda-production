// LLM Configuration System - Client Factory
// Loads LLM configuration from database and returns appropriate client instance

import { createServerClient } from '@/lib/supabase/server';
import { ClaudeClient } from './claude-client';
import { OpenAIClient } from './openai-client';
import { DeepSeekClient } from './deepseek-client';
import { GeminiClient } from './gemini-client';
import {
  LLMClient,
  LLMProvider,
  LLMInterface,
  LLMClientConfig
} from './types';

/**
 * Get LLM client instance from database configuration
 * Falls back to environment variables if no database config found
 * Note: LLM interfaces are shared across all apps (not app-specific)
 */
export async function getLLMClient(
  provider: LLMProvider,
  interfaceId?: string,
  accessToken?: string
): Promise<LLMClient> {
  const supabase = await createServerClient(accessToken);

  let llmInterface: LLMInterface | null = null;

  // Try to load from database
  if (interfaceId) {
    // Load specific interface by ID (shared across all apps)
    const { data, error } = await supabase
      .from('llm_interfaces')
      .select('*')
      .eq('id', interfaceId)
      .eq('is_active', true)
      .single();

    if (!error && data) {
      llmInterface = data as LLMInterface;
    }
  } else {
    // Load default interface for provider (shared across all apps)
    const { data, error } = await supabase
      .from('llm_interfaces')
      .select('*')
      .eq('provider', provider)
      .eq('is_active', true)
      .eq('is_default', true)
      .single();

    if (!error && data) {
      llmInterface = data as LLMInterface;
    }
  }

  // If database config found, decrypt API key and create client
  if (llmInterface) {
    // Decrypt API key using Node.js decryption (server-side only)
    try {
      const { decryptApiKey } = await import('./encryption');
      
      // Check if encryption key is set
      if (!process.env.LLM_ENCRYPTION_KEY) {
        throw new Error('LLM_ENCRYPTION_KEY environment variable is not set. Please add it to your .env.local file.');
      }
      
      const decryptedKey = decryptApiKey(llmInterface.api_key_enc);

      const config: LLMClientConfig = {
        apiKey: decryptedKey,
        baseUrl: llmInterface.base_url || undefined,
        defaultModel: llmInterface.default_model,
        maxRetries: 3,
        timeout: 60000
      };

      return createClientForProvider(provider, config);
    } catch (decryptError: any) {
      console.error('Failed to decrypt API key:', decryptError);
      console.error('Decryption error details:', {
        message: decryptError.message,
        stack: decryptError.stack,
        hasEncryptionKey: !!process.env.LLM_ENCRYPTION_KEY
      });
      
      // Re-throw with more context if it's a missing key error
      if (decryptError.message?.includes('LLM_ENCRYPTION_KEY')) {
        throw decryptError;
      }
      
      // Fall through to environment variable fallback for other decryption errors
      console.warn('Falling back to environment variable for API key');
    }
  }

  // Fallback to environment variables
  return getLLMClientFromEnv(provider);
}

/**
 * Create client instance for specific provider
 */
function createClientForProvider(
  provider: LLMProvider,
  config: LLMClientConfig
): LLMClient {
  switch (provider) {
    case 'anthropic':
      return new ClaudeClient({
        apiKey: config.apiKey,
        defaultModel: config.defaultModel,
        maxRetries: config.maxRetries,
        timeout: config.timeout
      });

    case 'openai':
      return new OpenAIClient({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        defaultModel: config.defaultModel,
        maxRetries: config.maxRetries,
        timeout: config.timeout
      });

    case 'deepseek':
      return new DeepSeekClient({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl || 'https://api.deepseek.com',
        defaultModel: config.defaultModel,
        maxRetries: config.maxRetries,
        timeout: config.timeout
      });

    case 'gemini':
      return new GeminiClient({
        apiKey: config.apiKey,
        defaultModel: config.defaultModel,
        maxRetries: config.maxRetries,
        timeout: config.timeout
      });

    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

/**
 * Fallback: Get client from environment variables
 */
function getLLMClientFromEnv(provider: LLMProvider): LLMClient {
  switch (provider) {
    case 'anthropic': {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is not set and no database config found');
      }
      return new ClaudeClient({
        apiKey,
        defaultModel: process.env.CLAUDE_DEFAULT_MODEL,
        maxRetries: parseInt(process.env.CLAUDE_MAX_RETRIES || '3'),
        timeout: parseInt(process.env.CLAUDE_TIMEOUT_MS || '60000')
      });
    }

    case 'openai': {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set and no database config found');
      }
      return new OpenAIClient({
        apiKey,
        defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4',
        maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3'),
        timeout: parseInt(process.env.OPENAI_TIMEOUT_MS || '60000')
      });
    }

    case 'deepseek': {
      const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('DEEPSEEK_API_KEY or OPENAI_API_KEY environment variable is not set and no database config found');
      }
      return new DeepSeekClient({
        apiKey,
        baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
        defaultModel: process.env.DEEPSEEK_DEFAULT_MODEL || 'deepseek-reasoner',
        maxRetries: parseInt(process.env.DEEPSEEK_MAX_RETRIES || '3'),
        timeout: parseInt(process.env.DEEPSEEK_TIMEOUT_MS || '60000')
      });
    }

    case 'gemini': {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not set and no database config found');
      }
      return new GeminiClient({
        apiKey,
        defaultModel: process.env.GEMINI_DEFAULT_MODEL || 'gemini-pro',
        maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || '3'),
        timeout: parseInt(process.env.GEMINI_TIMEOUT_MS || '60000')
      });
    }

    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

/**
 * Get LLM interface by ID (for admin/testing)
 */
export async function getLLMInterface(
  interfaceId: string,
  accessToken?: string
): Promise<LLMInterface | null> {
  const supabase = await createServerClient(accessToken);

  const { data, error } = await supabase
    .from('llm_interfaces')
    .select('*')
    .eq('id', interfaceId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as LLMInterface;
}

