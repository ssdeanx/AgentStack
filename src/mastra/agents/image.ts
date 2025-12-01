import { Agent } from '@mastra/core/agent'
import { InternalSpans } from '@mastra/core/ai-tracing'
import { RuntimeContext } from '@mastra/core/runtime-context'
import { imageGen, pgMemory } from '../config'
import { log } from '../config/logger'


export type UserTier = 'free' | 'pro' | 'enterprise'
export type ImageRuntimeContext = {
  'user-tier': UserTier
  language: 'en' | 'es' | 'ja' | 'fr'
  aspectratio: '16:9' | '4:3' | '1:1'
  resolution: '2K' | '1K'
  numberOfImages: 1 | 2 | 4
}

log.info('Initializing Financial Chart Agents...')

const aspectRatio = '16:9';
const AspectRatio2K = '4:3';
const resolution = '2K';
const resolution1K = '1K';

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
    const aspectratioX = runtimeContext.get('aspectratio') ?? '16:9'
    const resolutionY = runtimeContext.get('resolution') ?? '2K'
    return {
      role: 'system',
      content: `You are an expert in generating images based on user requirements.
      tier: ${userTier}
      language: ${language}
      aspect ratio: ${aspectratioX}
      resolution: ${resolutionY}
      Your task is to create visually appealing and informative images that accurately represent the data provided by the user. Consider the user's preferences, such as color scheme and chart style, to ensure the image is both aesthetically pleasing and informative.`,
      providerOptions: {
        google: {
          numberOfImages: 4,
          imageConfig: {
          aspectRatio: aspectRatio || AspectRatio2K,
          imageSize: resolution || resolution1K,
          },
        }
      }
    }
  },
  model: imageGen,
  memory: pgMemory,
  options: { tracingPolicy: { internal: InternalSpans.AGENT } },
  maxRetries: 3
})
