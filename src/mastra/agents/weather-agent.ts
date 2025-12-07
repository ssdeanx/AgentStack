import { Agent } from '@mastra/core/agent';
import { InternalSpans } from '@mastra/core/ai-tracing';
import type { RuntimeContext } from '@mastra/core/runtime-context';
import { googleAI, googleAIFlashLite, googleAIPro } from '../config/google';
import { pgMemory } from '../config/pg-storage';
import { scorers } from '../scorers/weather-scorer';
import { mdocumentChunker } from '../tools/document-chunking.tool';
import { weatherTool } from '../tools/weather-tool';
import { webScraperTool } from '../tools/web-scraper-tool';
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
export type UserTier = 'free' | 'pro' | 'enterprise'
export interface WeatherRuntimeContext {
  'user-tier': UserTier
  language: 'en' | 'es' | 'ja' | 'fr'
}

export const weatherAgent = new Agent({
  name: 'Weather Agent',
  id: 'weather-agent',
  description: `A weather agent showcasing an API-based tool chain: fetch weather, validate results, and format a response.`,
  instructions: ({ runtimeContext }) => {
    const userId = runtimeContext.get('userId');
    return {
      role: 'system',
      content: `
      You are a helpful weather assistant that provides accurate weather information and can help planning activities based on the weather.

      Your primary function is to help users get weather details for specific locations. When responding:
      - Always ask for a location if none is provided
      - If the location name isn't in English, please translate it
      - If giving a location with multiple parts (e.g. "New York, NY"), use the most relevant part (e.g. "New York")
      - Include relevant details like humidity, wind conditions, and precipitation
      - Keep responses concise but informative
      - If the user asks for activities and provides the weather forecast, suggest activities based on the weather forecast.
      - If the user asks for activities, respond in the format they request.

      Use the weatherTool to fetch current weather data.
`,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: 'low',
            includeThoughts: true,
            thinkingBudget: -1,
          }
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: ({ runtimeContext }: { runtimeContext: RuntimeContext<WeatherRuntimeContext> }) => {
    const userTier = runtimeContext.get('user-tier') ?? 'free'
    if (userTier === 'enterprise') {
      // higher quality (chat style) for enterprise
      return googleAIPro
    } else if (userTier === 'pro') {
      // Chat bison for pro as well
      return googleAI
    }
    // cheaper/faster model for free tier
    return googleAIFlashLite
  },
  tools: { weatherTool, webScraperTool, mdocumentChunker },
  scorers: {
    toolCallAppropriateness: {
      scorer: scorers.toolCallAppropriatenessScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
    completeness: {
      scorer: scorers.completenessScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
    translation: {
      scorer: scorers.translationScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
  },
  memory: pgMemory,
  options: { tracingPolicy: { internal: InternalSpans.MODEL } },
  maxRetries: 5
});
