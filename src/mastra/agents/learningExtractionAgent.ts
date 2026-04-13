import { Agent } from '@mastra/core/agent'
import { log } from '../config/logger'

import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { TokenLimiterProcessor } from '@mastra/core/processors'
import { InternalSpans } from '@mastra/core/observability'
import {
    getRoleFromContext,
    USER_ID_CONTEXT_KEY,
    type AgentRequestContext,
} from './request-context'
import { LibsqlMemory } from '../config/libsql'

export type LearningExtractionAgentContext = AgentRequestContext<{
    researchPhase?: string
}>

const RESEARCH_PHASE_CONTEXT_KEY = 'researchPhase' as const

log.info('Initializing Learning Extraction Agent...')

/**
 * Learning Extraction Agent.
 *
 * Extracts the most important learning from research results and generates a follow-up question.
 */
export const learningExtractionAgent = new Agent({
    id: 'learningExtractionAgent',
    name: 'Learning Extraction Agent',
    description:
        'An expert at analyzing search results and extracting key insights to deepen research understanding.',
    instructions: ({ requestContext }) => {
        const rawUserId = requestContext.get(USER_ID_CONTEXT_KEY)
        const rawResearchPhase = requestContext.get(RESEARCH_PHASE_CONTEXT_KEY)

        const userId = typeof rawUserId === 'string' ? rawUserId : undefined
        const role = getRoleFromContext(requestContext)
        const researchPhase =
            typeof rawResearchPhase === 'string' ? rawResearchPhase : 'initial'

        return {
            role: 'system',
            content: `
# Learning Extraction Agent
User: ${userId ?? 'anonymous'} | Role: ${role} | Phase: ${researchPhase}

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
                    },
                } satisfies GoogleGenerativeAIProviderOptions,
            },
        }
    },
    model: "google/gemini-3.1-flash-lite-preview",
    memory: LibsqlMemory,
    tools: {},
    scorers: {},
    options: {
        tracingPolicy: {
            internal: InternalSpans.AGENT,
        },
    },
    workflows: {},
    maxRetries: 5,
    outputProcessors: [new TokenLimiterProcessor(128000)],
})
