import { Agent } from '@mastra/core/agent'
import { log } from '../config/logger'

import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { InternalSpans } from '@mastra/core/observability'
import { getRoleFromContext, type AgentRequestContext } from './request-context'
import { LibsqlMemory } from '../config/libsql'

export type EvaluationContext = AgentRequestContext

log.info('Initializing Evaluation Agent...')

/**
 * Evaluation Agent.
 *
 * Scores search results for relevance against a research query.
 */
export const evaluationAgent = new Agent({
    id: 'evaluationAgent',
    name: 'Evaluation Agent',
    description:
        'An expert evaluation agent. Your task is to evaluate whether search results are relevant to a research query.',
    instructions: ({ requestContext }) => {
        const role = getRoleFromContext(requestContext)

        return {
            role: 'system',
            content: `
# Evaluation Agent
User: ${role}

## Task
Evaluate search result relevance to a research query.

## Criteria
- **Direct Relevance**: Topical alignment.
- **Usefulness**: Helps answer the query.
- **Credibility**: Authoritative source.
- **Currency**: Up-to-date info.

## Process
1. Analyze query and result (title, URL, snippet).
2. Decision: Boolean (true/false).
3. Reason: Brief and specific.

## Rules
- **Tool Efficiency**: Do NOT use the same tool repetitively or back-to-back for the same query.
`,
            providerOptions: {
                google: {
                    thinkingConfig: {
                        includeThoughts: true,
                        thinkingLevel: 'low',
                    },
                    responseModalities: ['TEXT'],
                    mediaResolution: 'MEDIA_RESOLUTION_LOW',
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
//    outputProcessors: [new TokenLimiterProcessor(1048576)],
})
