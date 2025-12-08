import { createAnthropic } from '@ai-sdk/anthropic'
import { logError } from './logger'

const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
})

// Claude Models organized by series and capabilities
export const anthropicChatModels = {
  // Claude 4.5 Series (Latest)
  claudeOpus45: anthropic('claude-opus-4-5'),
  claudeHaiku45: anthropic('claude-haiku-4-5'),
  claudeSonnet45: anthropic('claude-sonnet-4-5'),
  // Claude 4.1 Series
  claudeOpus41: anthropic('claude-opus-4-1'),
  // Claude 4.0 Series
  claudeOpus40: anthropic('claude-opus-4-0'),
  claudeSonnet40: anthropic('claude-sonnet-4-0'),
  // Claude 3.7 Series
  claude37SonnetLatest: anthropic('claude-3-7-sonnet-latest'),
  // Claude 3.5 Series
  claude35HaikuLatest: anthropic('claude-3-5-haiku-latest'),
};

// Model selector function
export function getAnthropicChatModel(modelId: keyof typeof anthropicChatModels) {
  return anthropicChatModels[modelId];
}

// Backward compatibility exports
export const anthropicClaude4 = anthropicChatModels.claudeOpus40; // Maps to claude-4 equivalent
export const anthropicClaude45 = anthropicChatModels.claudeSonnet45; // Maps to claude-4-5
export const anthropicHaiku45 = anthropicChatModels.claudeHaiku45; // Maps to haiku-4-5

export default anthropic;


