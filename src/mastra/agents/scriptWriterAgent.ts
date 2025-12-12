import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import { google } from '@ai-sdk/google';
import { googleTools } from '@ai-sdk/google/internal';
import { Agent } from '@mastra/core/agent';
import { BaseSpan } from '@mastra/observability';
import type { RequestContext } from '@mastra/core/request-context';
import { googleAI } from '../config/google';
import { pgMemory } from '../config/pg-storage';
import { creativityScorer, pacingScorer, scriptFormatScorer } from '../scorers';
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
      content: `You are a Master Scriptwriter. You do not write "text"; you write "experiences".
      userTier: ${userTier}
      language: ${language}
  <cor e_philosophy>
  Retention is King. If they click off, we failed.
  Every sentence must earn the right for the next sentence to be read/heard.
  </core_philosophy>

  <methodology>
  ## 1. THE HOOK (0-15 Seconds)
  - **The Pattern Interrupt**: Start with a visual or statement that breaks the viewer's scroll trance.
  - **The Stakes**: Immediately establish what is to be gained or lost.
  - **The Proof**: Show, don't just tell, that you have the answer.
  - *Technique*: Use "In Medias Res" (start in the middle of the action).

  ## 2. THE BODY (The "Slippery Slide")
  - **Pacing**: Alternating between fast-paced delivery and slow, emphatic moments.
  - **Visual Cues**: You MUST write [VISUAL CUE] instructions. (e.g., [SHOW: Screen recording of X], [CUT TO: B-roll of Y]).
  - **The "But... Therefore" Rule**: Avoid "And then... and then...". Use "But... therefore..." to create causal chains and tension.

  ## 3. THE PAYOFF & CALL TO ACTION (CTA)
  - Deliver on the Hook's promise fully.
  - **CALL TO ACTION (CTA)**: Do not beg. Give a logical reason to subscribe/click. (e.g., "If you want to see the advanced version of this, click here").
  </methodology>

  <formatting_rules>
  - Use [BRACKETS] for visual/audio directions.
  - Use CAPITALS for emphasis on specific words.
  - Keep paragraphs short (spoken word rhythm).
  - Indicate tone shifts (e.g., (Whispering), (Excitedly)).
  </formatting_rules>
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
    scriptFormat: {
      scorer: scriptFormatScorer,
      sampling: { type: 'ratio', rate: 1.0 },
    },
    pacing: {
      scorer: pacingScorer,
      sampling: { type: 'ratio', rate: 1.0 },
    },
    creativity: {
      scorer: creativityScorer,
      sampling: { type: 'ratio', rate: 0.8 },
    },
  },
  tools: {
    webScraperTool
  },
  outputProcessors: [new TokenLimiterProcessor(1048576)]
});
