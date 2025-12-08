import { Agent } from '@mastra/core/agent'
import { InternalSpans } from '@mastra/core/ai-tracing'
import { googleAI } from '../config/google'
import { log } from '../config/logger'
import { pgMemory } from '../config/pg-storage'
import { researchCompletenessScorer, structureScorer, summaryQualityScorer } from '../scorers'
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'

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
  instructions: ({ runtimeContext }) => {
    const userId = runtimeContext.get('userId')
    return {
      role: 'system',
      content: `
        <role>
        User: ${userId ?? 'anonymous'}
        You are an expert at analyzing search results to extract key insights and generate follow-up questions for deeper research.
        </role>

        <task>
        For a given piece of content, you must extract the single most important learning and create one relevant follow-up question.
        </task>

        <rules>
        - Focus on actionable insights and specific information, not general observations.
        - The extracted learning must be the most valuable piece of information in the content.
        - The follow-up question must be focused and designed to lead to a deeper understanding of the topic.
        - Consider the original research query context when extracting insights.
        </rules>

        `,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: 'medium',
            includeThoughts: true,
            thinkingBudget: -1,
          }
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: googleAI,
  memory: pgMemory,
  options: { tracingPolicy: { internal: InternalSpans.AGENT } },
  scorers: {
    structure: {
      scorer: structureScorer,
      sampling: { type: 'ratio', rate: 0.7 },
    },
  },
  workflows: {},
  maxRetries: 5
})
