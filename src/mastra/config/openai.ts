import { createOpenAI } from '@ai-sdk/openai'
import { logError } from './logger'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// OpenAI configuration from environment variables
export const openAIConfig: { apiKey: string; baseURL: string; model: string } =
    {
        apiKey: process.env.OPENAI_API_KEY ?? '',
        baseURL: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
        model: process.env.OPENAI_MODEL ?? 'gpt-5-mini',
    }

// Create the OpenAI provider with configuration
export const openAIProvider = createOpenAI({
    apiKey: openAIConfig.apiKey,
    baseURL: openAIConfig.baseURL,
    // Add timeout configurations for reasoning model processing
    headers: {
        'X-Request-Timeout': '600000', // 600 seconds (10 minutes) per call
    },
    fetch: (url: string | URL | RequestInfo, options?: RequestInit) => {
        // Add custom fetch with extended timeout for reasoning models
        const controller: AbortController = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 600000) // 600 seconds (10 minutes)

        return fetch(url, {
            ...options,
            signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId))
    },
})

// Chat/Text Models - GPT Series
export const openAIChatModels = {
  // GPT-5.1 Series
  gpt51CodexMini: openAIProvider('gpt-5.1-codex-mini'),
  gpt51Codex: openAIProvider('gpt-5.1-codex'),
  gpt51ChatLatest: openAIProvider('gpt-5.1-chat-latest'),
  gpt51: openAIProvider('gpt-5.1'),
  // GPT-5 Series
  gpt5Pro: openAIProvider('gpt-5-pro'),
  gpt5: openAIProvider('gpt-5'),
  gpt5Mini: openAIProvider('gpt-5-mini'),
  gpt5Nano: openAIProvider('gpt-5-nano'),
  gpt5Codex: openAIProvider('gpt-5-codex'),
  gpt5ChatLatest: openAIProvider('gpt-5-chat-latest'),
  // GPT-4.1 Series
  gpt41: openAIProvider('gpt-4.1'),
  gpt41Mini: openAIProvider('gpt-4.1-mini'),
  gpt41Nano: openAIProvider('gpt-4.1-nano'),
  // GPT-4o Series
  gpt4o: openAIProvider('gpt-4o'),
  gpt4oMini: openAIProvider('gpt-4o-mini'),
};

// Model selector function
export function getOpenAIChatModel(modelId: keyof typeof openAIChatModels) {
  return openAIChatModels[modelId];
}

// Separate OpenAI configuration for embeddings (uses real OpenAI API)
export const openAIEmbeddingConfig: { apiKey: string; baseURL: string } = {
    apiKey:
        process.env.OPENAI_EMBEDDING_API_KEY ??
        process.env.OPENAI_API_KEY ??
        '',
    baseURL:
        process.env.OPENAI_EMBEDDING_BASE_URL ?? 'https://api.openai.com/v1',
}

// Create a separate OpenAI provider specifically for embeddings
export const openAIEmbeddingProvider = createOpenAI({
    apiKey: openAIEmbeddingConfig.apiKey,
    baseURL: openAIEmbeddingConfig.baseURL,
})

// Default model (backward compatibility)
export const openAIModel = openAIChatModels.gpt5Mini;
