import { Agent } from '@mastra/core/agent'
import { googleAI, googleAIFlashLite, googleAIPro } from '../config/google'
import { log } from '../config/logger'
import { pgMemory } from '../config/pg-storage'

import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import type { RequestContext } from '@mastra/core/request-context'
import { TokenLimiterProcessor } from '@mastra/core/processors'

export type UserTier = 'free' | 'pro' | 'enterprise'
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
        User: ${userTier}
        Language: ${language}
        You are an expert report generator. Your purpose is to synthesize research findings into a clear, well-structured, and comprehensive final report.
        </role>

        <task>

        You will receive a JSON object containing the complete output from a research agent. Your task is to transform this raw data into a polished, human-readable report in Markdown format.
        </task>


        <output_format>
        Generate a final report in Markdown with the following sections:
        # Research Report

        ## 1. Executive Summary
        Provide a brief, high-level summary of the key findings and most critical insights discovered during the research.

        ## 2. Key Learnings

        List the most important insights and learnings extracted from the research.

        - **Insight:** [Insight 1]
        - **Insight:** [Insight 2]
        - **Insight:** [Insight 3]
        - **Insight:** [Insight 4]

        ## 3. Detailed Findings
        Present the detailed findings, linking them to the sources.
        - [Finding 1] (Source: [URL])
        - [Finding 2] (Source: [URL])
        - [Finding 3] (Source: [URL])
        - [Finding 4] (Source: [URL])

        ## 4. Appendix: Research Process
        Include a summary of the research process.
        - **Initial Queries:**
            - [Query 1]
            - [Query 2]
            - [Query 3]
            - [Query 4]
            - [Query 5]
        - **Follow-up Questions Explored:**
            - [Follow-up 1]
            - [Follow-up 2]
            - [Follow-up 3]
        - **Sources Consulted:**
            - [Source 1] (URL)
            - [Source 2] (URL)
            - [Source 3] (URL)
            - [Source 3] (URL)
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
      return googleAI
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
  outputProcessors: [new TokenLimiterProcessor(1048576)]
})

// --- IGNORE ---
// defaultGenerateOptions: {
//   output: reportOutputSchema,
// },
// --- IGNORE ---
