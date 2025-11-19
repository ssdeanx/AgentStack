import { Agent } from '@mastra/core/agent';
import { weatherTool } from '../tools/weather-tool';
import { scorers } from '../scorers/weather-scorer';
import { googleAIFlashLite } from '../config/google';
import { webScraperTool } from '../tools/web-scraper-tool';
import { mdocumentChunker } from '../tools/document-chunking.tool';
import { pgMemory } from '../config/pg-storage';
import { InternalSpans } from '@mastra/core/ai-tracing';

export const weatherAgent = new Agent({
  name: 'Weather Agent',
  id: 'weather-agent',
  description: `A weather agent showcasing an API-based tool chain: fetch weather, validate results, and format a response.`,
  instructions: `
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
  model: googleAIFlashLite,
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
  options: { tracingPolicy: { internal: InternalSpans.ALL } },
  maxRetries: 5
});
