import { createGateway } from '@ai-sdk/gateway'
import { logError } from './logger'

// AI Gateway Configuration
export const aiGatewayConfig = {
  apiKey: process.env.AI_GATEWAY_API_KEY ?? '',
  baseURL: process.env.AI_GATEWAY_BASE_URL ?? 'https://ai-gateway.vercel.sh/v1/ai',
  metadataCacheRefreshMillis: parseInt(process.env.AI_GATEWAY_CACHE_REFRESH ?? '300000'), // 5 minutes
}

// Create AI Gateway provider instance
export const aiGateway = createGateway({
  apiKey: aiGatewayConfig.apiKey,
  baseURL: aiGatewayConfig.baseURL,
  metadataCacheRefreshMillis: aiGatewayConfig.metadataCacheRefreshMillis,
})

// Popular AI Gateway models organized by provider
export const aiGatewayModels = {
  // OpenAI models
  openaiGpt5: aiGateway('openai/gpt-5'),
  openaiGpt5Mini: aiGateway('openai/gpt-5-mini'),
  openaiGpt5Nano: aiGateway('openai/gpt-5-nano'),
  openaiGpt4o: aiGateway('openai/gpt-4o'),
  openaiGpt4oMini: aiGateway('openai/gpt-4o-mini'),

  // Anthropic models
  anthropicClaudeSonnet4: aiGateway('anthropic/claude-sonnet-4'),
  anthropicClaudeOpus4: aiGateway('anthropic/claude-opus-4'),
  anthropicClaudeHaiku4: aiGateway('anthropic/claude-haiku-4'),
  anthropicClaude37Sonnet: aiGateway('anthropic/claude-3-7-sonnet'),

  // Google models
  googleGemini25Flash: aiGateway('google/gemini-2.5-flash'),
  googleGemini25Pro: aiGateway('google/gemini-2.5-pro'),
  googleGemini3Pro: aiGateway('google/gemini-3-pro-preview'),

  // xAI models
  xaiGrok3: aiGateway('xai/grok-3'),
  xaiGrok4: aiGateway('xai/grok-4'),

  // Meta models
  metaLlama3370b: aiGateway('meta-llama/llama-3.3-70b-instruct'),
  metaLlama3211b: aiGateway('meta-llama/llama-3.2-11b-vision-instruct'),

  // Mistral models
  mistralMistralMedium: aiGateway('mistralai/mistral-medium-3.1'),
  mistralCodestral: aiGateway('mistralai/codestral-2508'),

  // DeepSeek models
  deepseekR1: aiGateway('deepseek/deepseek-r1'),
  deepseekChatV3: aiGateway('deepseek/deepseek-chat-v3.1'),
}

// Model selector function
export function getAIGatewayModel(modelId: keyof typeof aiGatewayModels) {
  return aiGatewayModels[modelId]
}

// Dynamic model discovery functions
export async function getAvailableModels() {
  try {
    return await aiGateway.getAvailableModels()
  } catch (error) {
    logError('Failed to fetch available AI Gateway models', error)
    return { models: [] }
  }
}

export async function getCredits() {
  try {
    return await aiGateway.getCredits()
  } catch (error) {
    logError('Failed to fetch AI Gateway credits', error)
    return { balance: 0, total_used: 0 }
  }
}

// Default model
export const aiGatewayModel = aiGatewayModels.openaiGpt5

export default aiGateway
