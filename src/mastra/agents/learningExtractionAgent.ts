import { Agent } from '@mastra/core/agent'
import { googleAI } from '../config/google'
import { log } from '../config/logger'
import { pgMemory } from '../config/pg-storage'

import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { TokenLimiterProcessor } from '@mastra/core/processors'
import type { RequestContext } from '@mastra/core/request-context'

export type UserTier = 'free' | 'pro' | 'enterprise'
export interface LearningExtractionAgentContext {
  userId?: string
  researchPhase?: string
  'user-tier': UserTier
  language: 'en' | 'es' | 'ja' | 'fr'
}

log.info('Initializing Learning Extraction Agent...')

export const learningExtractionAgent = new Agent({
  id: 'learningExtractionAgent',
  name: 'Learning Extraction Agent',
  description:
    'An expert at analyzing search results and extracting key insights to deepen research understanding.',
  instructions: ({ requestContext }: { requestContext: RequestContext<LearningExtractionAgentContext> }) => {
    const userId = requestContext.get('userId')
    const userTier = requestContext.get('user-tier') ?? 'free'
    const language = requestContext.get('language') ?? 'en'
    const researchPhase = requestContext.get('researchPhase') ?? 'initial'

    return {
      role: 'system',
      content: `
# Learning Extraction Agent
User: ${userId ?? 'anonymous'} | Tier: ${userTier} | Phase: ${researchPhase}

## Task
Extract the single most important learning and create one relevant follow-up question from the provided content.

## Rules
- **Tool Efficiency**: Do NOT use the same tool repetitively or back-to-back for the same query.
- **Focus**: Actionable insights and specific info only.
- **Context**: Consider the original research query.
`,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          }
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: googleAI,
  memory: pgMemory,
  scorers: {

  },
  workflows: {},
  maxRetries: 5,
  outputProcessors: [new TokenLimiterProcessor(128000)]
})
