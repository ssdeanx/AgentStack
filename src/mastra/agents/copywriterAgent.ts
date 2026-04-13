import { Agent } from '@mastra/core/agent'
import { log } from '../config/logger'
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { InternalSpans } from '@mastra/core/observability'
import {
  USER_ID_CONTEXT_KEY,
//  USER_TIER_CONTEXT_KEY,
  type AgentRequestContext,
} from './request-context'
//import {
 // createCompletenessScorer,
 // createTextualDifferenceScorer,
 // createToneScorer,
//} from '../evals/scorers/prebuilt'
import { chartSupervisorTool } from '../tools/financial-chart-tools'
import { fetchTool } from '../tools'
import { google } from '../config'
import { LibsqlMemory } from '../config/libsql'
// Define runtime context for this agent
export type CopywriterAgentContext = AgentRequestContext<{
  contentType?: string
}>

log.info('Initializing Copywriter Agent...')

const copywriterTools = {
  fetchTool,
  chartSupervisorTool,
  google_search: google.tools.googleSearch({}),
  url_context: google.tools.urlContext({}),
}

export const copywriterAgent = new Agent({
  id: 'copywriterAgent',
  name: 'copywriter-agent',
  description:
    'An expert copywriter agent that creates engaging, high-quality content across multiple formats including blog posts, marketing copy, social media content, technical writing, and business communications.',
  instructions: ({ requestContext }) => {
    const userId = requestContext.get(USER_ID_CONTEXT_KEY)
    return {
      role: 'system',
      content: `
# Copywriter Agent
User: ${userId ?? 'anonymous'}

## Task
Create compelling content (blog, marketing, social, technical, business, creative) by researching, structuring, and polishing for the intended purpose.

## Process
1. **Research**: Understand audience and gather info.
2. **Strategy**: Plan structure, tone, and messaging.
3. **Draft**: Write for flow and engagement.
4. **Refine**: Polish language and ensure consistency.

## Rules
- **Tool Efficiency**: Do NOT use the same tool repetitively or back-to-back for the same query.
- **Output**: Clear, well-structured format with headings, CTA, and meta info.
`,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: 'medium',
          },
          responseModalities: ['TEXT'],
          mediaResolution: 'MEDIA_RESOLUTION_LOW',
        } satisfies GoogleGenerativeAIProviderOptions,
      },
    }
  },
  model: 'google/gemini-3.1-flash-lite-preview',
  memory: LibsqlMemory,
  tools: copywriterTools,
  scorers: {
   // toneConsistency: { scorer: createToneScorer() },
   // textualDifference: { scorer: createTextualDifferenceScorer() },
   // completeness: { scorer: createCompletenessScorer() },
  },
  options: {
    tracingPolicy: {
      internal: InternalSpans.AGENT,
    },
  },
  workflows: {},
  maxRetries: 5,
  //  defaultOptions: {
  //     autoResumeSuspendedTools: true,
  // },
})
