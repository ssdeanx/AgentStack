import { Agent } from '@mastra/core/agent'
import { google3, googleAIFlashLite, googleAIPro } from '../config/google'
import { log } from '../config/logger'
import { pgMemory } from '../config/pg-storage'

import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { BatchPartsProcessor, TokenLimiterProcessor } from '@mastra/core/processors'
import type { RequestContext } from '@mastra/core/request-context'

type UserTier = 'free' | 'pro' | 'enterprise'
export interface ReportRuntimeContext {
  'user-tier': UserTier
  language: 'en' | 'es' | 'ja' | 'fr'
}
log.info('Initializing Report Agent...')

export const reportAgent = new Agent({
  id: 'reportAgent',
  name: 'Report Agent',
  description:
    'An expert researcher agent that generates comprehensive reports based on research data.',
  instructions: ({ requestContext }: { requestContext: RequestContext<ReportRuntimeContext> }) => {
    // runtimeContext is read at invocation time
    const userTier = requestContext.get('user-tier') ?? 'free'
    const language = requestContext.get('language') ?? 'en'
    return {
      role: 'system',
      content: `
        <role>
        User: ${userTier} | Lang: ${language}
        You are an expert report generator. Synthesize research findings into a clear, comprehensive Markdown report.
        </role>

        <output_format>
        # Research Report
        ## 1. Executive Summary
        Brief summary of key findings and critical insights.
        ## 2. Key Learnings
        - **Insight:** [Insight]
        ## 3. Detailed Findings
        - [Finding] (Source: [URL])
        ## 4. Appendix: Research Process
        - **Initial Queries:** [Queries]
        - **Follow-ups:** [Questions]
        - **Sources:** [Source] (URL)
        </output_format>
            `,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          },
          mediaResolution: 'MEDIA_RESOLUTION_MEDIUM',
          responseModalities: ['TEXT'],
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: ({ requestContext }: { requestContext: RequestContext<ReportRuntimeContext> }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    if (userTier === 'enterprise') {
      // higher quality (chat style) for enterprise
      return googleAIPro
    } else if (userTier === 'pro') {
      // Chat bison for pro as well
      return google3
    }
    // cheaper/faster model for free tier
    return googleAIFlashLite
  },
  memory: pgMemory,
  options: {},
  scorers: {

  },
  tools: {},
  workflows: {},
  maxRetries: 5,
  outputProcessors: [new TokenLimiterProcessor(1048576), new BatchPartsProcessor({
    batchSize: 5,
    maxWaitTime: 75,
    emitOnNonText: true
  })]
})

// --- IGNORE ---
// defaultGenerateOptions: {
//   output: reportOutputSchema,
// },
// --- IGNORE ---
