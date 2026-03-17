import { Agent } from '@mastra/core/agent'
import type { RequestContext } from '@mastra/core/request-context'
import { googleAI, googleAIFlashLite, googleAIPro } from '../config/google'
import { pgMemory } from '../config/pg-storage'
import { mdocumentChunker } from '../tools/document-chunking.tool'
import { weatherTool } from '../tools/weather-tool'
import { webScraperTool } from '../tools/web-scraper-tool'
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { TokenLimiterProcessor } from '@mastra/core/processors'
import { InternalSpans } from '@mastra/core/observability'
import { mainWorkspace } from '../workspaces'
import type { AgentRequestContext } from './request-context'

export type WeatherRuntimeContext = AgentRequestContext

export const weatherAgent = new Agent({
    name: 'Weather Agent',
    id: 'weatherAgent',
    description: `A weather agent showcasing an API-based tool chain: fetch weather, validate results, and format a response.`,
    instructions: ({ requestContext }) => {
        const userIdValue = requestContext.get('userId')
        const userId =
            typeof userIdValue === 'string' && userIdValue.length > 0
                ? userIdValue
                : 'unknown'
        return {
            role: 'system',
            content: `
      You are a helpful weather assistant that provides accurate weather information and can help planning activities based on the weather.
      userId: ${userId}
      Your primary function is to help users get weather details for specific locations. When responding:
      - Always ask for a location if none is provided
      - If the location name isn't in English, please translate it
      - If giving a location with multiple parts (e.g. "New York, NY"), use the most relevant part (e.g. "New York")
      - Include relevant details like humidity, wind conditions, and precipitation
      - Keep responses concise but informative
      - If the user asks for activities and provides the weather forecast, suggest activities based on the weather forecast.
      - If the user asks for activities, respond in the format they request.

      - **Tool Efficiency:** Do NOT use the same tool repetitively or back-to-back for the same query.

      Use the weatherTool to fetch current weather data.
`,
            providerOptions: {
                google: {
                    thinkingConfig: {
                        includeThoughts: true,
                        thinkingBudget: -1,
                    },
                    cachedContent: "Location data cached for weather queries",
                } satisfies GoogleGenerativeAIProviderOptions,
            },
        }
    },
    model: ({ requestContext }) => {
        const userTier = requestContext.get('user-tier') ?? 'free'
        if (userTier === 'enterprise') {
            // higher quality (chat style) for enterprise
            return "google/gemini-3.1-pro-preview"
        } else if (userTier === 'pro') {
            // Chat bison for pro as well
            return "google/gemini-3.1-flash-preview"
        }
        // cheaper/faster model for free tier
        return "google/gemini-3.1-flash-lite-preview"
    },
    tools: { weatherTool, webScraperTool, mdocumentChunker },
    scorers: {},
    outputProcessors: [new TokenLimiterProcessor(128000)],
    memory: pgMemory,
    options: {
        tracingPolicy: {
            internal: InternalSpans.ALL,
        },
    },
    maxRetries: 5,
    workspace: mainWorkspace,

  //  defaultOptions: {
//       autoResumeSuspendedTools: true,
 //   },
})
