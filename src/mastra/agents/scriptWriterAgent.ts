import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { google } from '@ai-sdk/google'
import { Agent } from '@mastra/core/agent'
import { InternalSpans } from '@mastra/core/observability'
import { TokenLimiterProcessor } from '@mastra/core/processors'
import { pgMemory } from '../config/pg-storage'
import { webScraperTool } from '../tools/web-scraper-tool'
import {
  getLanguageFromContext,
  getUserTierFromContext,
  type AgentRequestContext,
} from './request-context'

export type ScriptWriterRuntimeContext = AgentRequestContext

const scriptWriterTools = {
  webScraperTool,
}

export const scriptWriterAgent = new Agent({
  id: 'scriptWriterAgent',
  name: 'Script Writer',
  description:
    'Master scriptwriter focused on retention, pacing, and psychological engagement.',
  instructions: ({ requestContext }) => {
    const userTier = getUserTierFromContext(requestContext)
    const language = getLanguageFromContext(requestContext)
    return {
      role: 'system',
      content: `
# Master Scriptwriter
User: ${userTier} | Lang: ${language}

## Methodology
1. **Hook (0-15s)**: Pattern interrupt, stakes, and proof.
2. **Body**: Pacing, [VISUAL CUES], and "But... Therefore" causal chains.
3. **Payoff**: Deliver on promise and logical CTA.

## Formatting
- [BRACKETS] for directions.
- CAPITALS for emphasis.
- Short paragraphs; indicate tone shifts.

## Rules
- **Tool Efficiency**: Do NOT use the same tool repetitively or back-to-back for the same query.
`,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT'],
        } satisfies GoogleGenerativeAIProviderOptions,
      },
    }
  },
  model: ({ requestContext }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    if (userTier === 'enterprise') {
      // higher quality (chat style) for enterprise
      return google.chat('gemini-3.1-pro-preview')
    } else if (userTier === 'pro') {
      // Chat bison for pro as well
      return google.chat('gemini-3.1-flash-preview')
    }
    // cheaper/faster model for free tier
    return google.chat('gemini-3.1-flash-lite-preview')
  },
  memory: pgMemory,
  options: {
    tracingPolicy: {
      internal: InternalSpans.ALL,
    },
  },
  scorers: {},
  tools: scriptWriterTools,
  outputProcessors: [new TokenLimiterProcessor(1048576)],
  //  defaultOptions: {
  //      autoResumeSuspendedTools: true,
  //  },
})
