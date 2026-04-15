import { Agent } from '@mastra/core/agent'
import { log } from '../config/logger'

import type { GoogleLanguageModelOptions } from '@ai-sdk/google'
import { InternalSpans } from '@mastra/core/observability'
import {
  TokenLimiterProcessor
} from '@mastra/core/processors'
import {
  getLanguageFromContext,
  getRoleFromContext,
  type AgentRequestContext,
} from './request-context'
import { LibsqlMemory } from '../config/libsql'

export type ReportRuntimeContext = AgentRequestContext
log.info('Initializing Report Agent...')

export const reportAgent = new Agent({
  id: 'reportAgent',
  name: 'Report Agent',
  description:
    'An expert researcher agent that generates comprehensive reports based on research data.',
  instructions: ({ requestContext }) => {
    // runtimeContext is read at invocation time
    const role = getRoleFromContext(requestContext)
    const language = getLanguageFromContext(requestContext)
    return {
      role: 'system',
      content: `
        <role>
        Role: ${role} | Lang: ${language}
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
            thinkingLevel: 'medium',
          },
          mediaResolution: 'MEDIA_RESOLUTION_MEDIUM',
          responseModalities: ['TEXT'],
        } satisfies GoogleLanguageModelOptions,
      },
    }
  },
  model: ({ requestContext }) => {
    const role = requestContext.get('role') ?? 'user'
    if (role === 'admin') {
      // higher quality (chat style) for enterprise
      return "google/gemini-3.1-flash-lite-preview"
    }
    // cheaper/faster model for free tier
    return "google/gemini-3.1-flash-lite-preview"
  },
  memory: LibsqlMemory,
  tools: {},
  options: {
    tracingPolicy: {
      internal: InternalSpans.AGENT,
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
