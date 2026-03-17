import { Agent } from '@mastra/core/agent'
import { log } from '../config/logger'
import { pgMemory } from '../config/pg-storage'

import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { InternalSpans } from '@mastra/core/observability'
import {
  TokenLimiterProcessor
} from '@mastra/core/processors'
import {
  getLanguageFromContext,
  getUserTierFromContext,
  type AgentRequestContext,
} from './request-context'

export type ReportRuntimeContext = AgentRequestContext
log.info('Initializing Report Agent...')

export const reportAgent = new Agent({
  id: 'reportAgent',
  name: 'Report Agent',
  description:
    'An expert researcher agent that generates comprehensive reports based on research data.',
  instructions: ({ requestContext }) => {
    // runtimeContext is read at invocation time
    const userTier = getUserTierFromContext(requestContext)
    const language = getLanguageFromContext(requestContext)
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
      },
    }
  },
  model: ({ requestContext }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    if (userTier === 'enterprise') {
      // higher quality (chat style) for enterprise
      return "google/gemini-3.1-flash-lite-preview"
    } else if (userTier === 'pro') {
      // Chat bison for pro as well
      return "google/gemini-3.1-flash-lite-preview"
    }
    // cheaper/faster model for free tier
    return "google/gemini-3.1-flash-lite-preview"
  },
  memory: pgMemory,
  tools: {},
  options: {
    tracingPolicy: {
      internal: InternalSpans.ALL,
    },
  },
  scorers: {},
  workflows: {},
  maxRetries: 5,
  outputProcessors: [
    new TokenLimiterProcessor(1048576),
    //   new BatchPartsProcessor({
    //       batchSize: 5,
    //       maxWaitTime: 75,
    //       emitOnNonText: true,
    //   }),
  ],
})

// --- IGNORE ---
// defaultGenerateOptions: {
//   output: reportOutputSchema,
// },
// --- IGNORE ---
