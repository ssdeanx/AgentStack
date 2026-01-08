import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import { google } from '@ai-sdk/google';
import { googleTools } from '@ai-sdk/google/internal';
import { Agent } from '@mastra/core/agent';
import { BaseSpan } from '@mastra/observability';
import type { RequestContext } from '@mastra/core/request-context';
import { googleAI } from '../config/google';
import { pgMemory } from '../config/pg-storage';
import { webScraperTool } from '../tools/web-scraper-tool';
import { TokenLimiterProcessor } from '@mastra/core/processors';
export type UserTier = 'free' | 'pro' | 'enterprise'
export interface ScriptWriterRuntimeContext {
  'user-tier': UserTier
  language: 'en' | 'es' | 'ja' | 'fr'
}

export const scriptWriterAgent = new Agent({
  id: 'scriptWriterAgent',
  name: 'Script Writer',
  description: 'Master scriptwriter focused on retention, pacing, and psychological engagement.',
  instructions: ({ requestContext }: { requestContext: RequestContext<ScriptWriterRuntimeContext> }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    const language = requestContext.get('language') ?? 'en'
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
      }
    }
  },
  model: ({ requestContext }: { requestContext: RequestContext<ScriptWriterRuntimeContext> }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    if (userTier === 'enterprise') {
      // higher quality (chat style) for enterprise
      return google.chat('gemini-3-pro-preview')
    } else if (userTier === 'pro') {
      // Chat bison for pro as well
      return googleAI
    }
    // cheaper/faster model for free tier
    return google.chat('gemini-2.5-flash-preview-09-2025')
  },
  memory: pgMemory,
  options: {},
  scorers: {
  },
  tools: {
    webScraperTool
  },
  outputProcessors: [new TokenLimiterProcessor(1048576)],
  defaultOptions: {
    autoResumeSuspendedTools: true,
  },
});
