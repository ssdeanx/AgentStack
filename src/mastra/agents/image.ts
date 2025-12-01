import { Agent } from '@mastra/core/agent'
import { InternalSpans } from '@mastra/core/ai-tracing'
import { RuntimeContext } from '@mastra/core/runtime-context'
import { imageGen, pgMemory } from '../config'
import { log } from '../config/logger'

export type UserTier = 'free' | 'pro' | 'enterprise'
export type ImageRuntimeContext = {
  'user-tier': UserTier
  language: 'en' | 'es' | 'ja' | 'fr'
}

log.info('Initializing Financial Chart Agents...')

/**
 * Chart Type Advisor Agent
 * Recommends optimal chart types based on financial data characteristics
 */
export const imageAgent = new Agent({
  id: 'image',
  name: 'Image Generator',
  description: 'Expert in generating images based on user requirements.',
  instructions: ({ runtimeContext }: { runtimeContext: RuntimeContext<ImageRuntimeContext> }) => {
    // runtimeContext is read at invocation time
    const userTier = runtimeContext.get('user-tier') ?? 'free'
    const language = runtimeContext.get('language') ?? 'en'
    return {
      role: 'system',
      content: `You are an expert in generating images based on user requirements.
      tier: ${userTier}
      language: ${language}
      Your task is to create visually appealing and informative images that accurately represent the data provided by the user. Consider the user's preferences, such as color scheme and chart style, to ensure the image is both aesthetically pleasing and informative.`,
      providerOptions: {
        google: {
          numberOfImages: 4,
          
        }
      }
    }
  },
  model: imageGen,
  memory: pgMemory,
  options: { tracingPolicy: { internal: InternalSpans.AGENT } },
  maxRetries: 3
})
