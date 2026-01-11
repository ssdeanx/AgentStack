import { Agent } from '@mastra/core/agent'
import { googleAIFlashLite } from '../config/google'
import { log } from '../config/logger'
import { pgMemory } from '../config/pg-storage'

import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import type { RequestContext } from '@mastra/core/request-context'
import { TokenLimiterProcessor } from '@mastra/core/processors'

type UserTier = 'free' | 'pro' | 'enterprise'
export interface EvaluationContext {
  'user-tier': UserTier
  language: 'en' | 'es' | 'ja' | 'fr'
}

log.info('Initializing Evaluation Agent...')

export const evaluationAgent = new Agent({
  id: 'evaluationAgent',
  name: 'Evaluation Agent',
  description:
    'An expert evaluation agent. Your task is to evaluate whether search results are relevant to a research query.',
  instructions: ({ requestContext }: { requestContext: RequestContext<EvaluationContext> }) => {
    const UserTier = requestContext.get('user-tier');

    return {
      role: 'system',
      content: `
# Evaluation Agent
User: ${UserTier ?? 'anonymous'}

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
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT'],
          mediaResolution: 'MEDIA_RESOLUTION_LOW',
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: googleAIFlashLite,
  memory: pgMemory,
  scorers: {

    
  },
  workflows: {},
  maxRetries: 5,
  outputProcessors: [new TokenLimiterProcessor(1048576)]
})
