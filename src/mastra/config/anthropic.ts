import { createAnthropic } from '@ai-sdk/anthropic'
import { logError } from './logger'

const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
})

// Expose new Anthropic model instances (Claude 4 / 4.5 and Haiku 4.5)
export const anthropicClaude4 = anthropic('claude-4')
export const anthropicClaude45 = anthropic('claude-4-5')
export const anthropicHaiku45 = anthropic('haiku-4-5')
export default anthropic


