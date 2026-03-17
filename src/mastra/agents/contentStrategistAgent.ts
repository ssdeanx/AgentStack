import { Agent } from '@mastra/core/agent'
import { pgMemory } from '../config/pg-storage'
import {
  scrapingSchedulerTool,
  webScraperTool,
} from '../tools/web-scraper-tool'

import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { InternalSpans } from '@mastra/core/observability'
import { TokenLimiterProcessor } from '@mastra/core/processors'
import {
  getUserTierFromContext,
  USER_ID_CONTEXT_KEY,
  type AgentRequestContext,
} from './request-context'
import {
  createCompletenessScorer,
  createTextualDifferenceScorer,
  createToneScorer,
} from '../evals/scorers/prebuilt'
import { chartSupervisorTool } from '../tools/financial-chart-tools'

const STAGGERED_OUTPUT_CONTEXT_KEY = 'staggeredOutput' as const
const SECTION_COUNT_CONTEXT_KEY = 'sectionCount' as const
const STRATEGY_CONTEXT_KEY = 'strategy' as const
const BACKUP_DATA_TOOLS_CONTEXT_KEY = 'backupDataTools' as const

export type ContentAgentContext = AgentRequestContext<{
  [STAGGERED_OUTPUT_CONTEXT_KEY]?: boolean
  [SECTION_COUNT_CONTEXT_KEY]?: number
  [STRATEGY_CONTEXT_KEY]?:
    | 'iceberg'
    | 'blue-ocean'
    | 'structured'
    | 'hybrid'
    | 'custom'
  [BACKUP_DATA_TOOLS_CONTEXT_KEY]?: string[]
}>

function getBooleanFromContext(
  requestContext: { get: (key: string) => unknown },
  key: string,
  fallback: boolean
): boolean {
  const value = requestContext.get(key)
  return typeof value === 'boolean' ? value : fallback
}

function getNumberFromContext(
  requestContext: { get: (key: string) => unknown },
  key: string,
  fallback: number
): number {
  const value = requestContext.get(key)
  return typeof value === 'number' ? value : fallback
}

function getStrategyFromContext(requestContext: {
  get: (key: string) => unknown
}): NonNullable<ContentAgentContext[typeof STRATEGY_CONTEXT_KEY]> {
  const strategy = requestContext.get(STRATEGY_CONTEXT_KEY)

  return strategy === 'blue-ocean' ||
    strategy === 'structured' ||
    strategy === 'hybrid' ||
    strategy === 'custom'
    ? strategy
    : 'iceberg'
}

function getBackupDataToolsFromContext(requestContext: {
  get: (key: string) => unknown
}): string[] {
  const backupDataTools = requestContext.get(BACKUP_DATA_TOOLS_CONTEXT_KEY)

  return Array.isArray(backupDataTools) && backupDataTools.every((tool) => typeof tool === 'string')
    ? backupDataTools
    : ['chartSupervisorTool']
}

const contentStrategistTools = {
  webScraperTool,
  chartSupervisorTool,
  scrapingSchedulerTool,
}

export const contentStrategistAgent = new Agent({
  id: 'contentStrategistAgent',
  name: 'Content Strategist',
  description:
    'Elite content strategist specializing in high-impact, data-driven content planning.',
  instructions: ({ requestContext }) => {
    const rawUserId = requestContext.get(USER_ID_CONTEXT_KEY)
    const userId = typeof rawUserId === 'string' ? rawUserId : 'anonymous'
    const userTier = getUserTierFromContext(requestContext)
    const staggeredOutput = getBooleanFromContext(
      requestContext,
      STAGGERED_OUTPUT_CONTEXT_KEY,
      false
    )
    const sectionCount = getNumberFromContext(
      requestContext,
      SECTION_COUNT_CONTEXT_KEY,
      5
    )
    const strategy = getStrategyFromContext(requestContext)
    const backupDataTools = getBackupDataToolsFromContext(requestContext)
    return {
      role: 'system',
      content: `
# Content Strategist
User: ${userId} | Tier: ${userTier} | Style: ${strategy}

## Approach
1. **Research**: Use 'webScraperTool' for trends, audience, and competitors.
2. **Analyze**: Identify gaps and opportunities.
3. **Plan**: Objectives, audience, KPIs, and calendar (Staggered: ${staggeredOutput}, Sections: ${sectionCount}).
4. **Execute**: Use backup tools: ${backupDataTools.join(', ')}.

## Methodology
- **Iceberg**: Keywords → Gaps → Psych triggers (FOMO/Curiosity).
- **Blue Ocean**: Contrarian angles + hyper-specificity.
- **Structure**: Hook → Value stack → Open loops.

## Rules
- **Tool Efficiency**: Do NOT use the same tool repetitively or back-to-back for the same query.
- **Titles**: FOMO/Urgency triggers, 60 char max.
- **Output**: JSON only; always cite sources.
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
  model: 'google/gemini-3.1-flash-preview',
  memory: pgMemory,
  tools: contentStrategistTools,
  options: {
    tracingPolicy: {
      internal: InternalSpans.ALL,
    },
  },
  scorers: {
    toneConsistency: { scorer: createToneScorer() },
    textualDifference: { scorer: createTextualDifferenceScorer() },
    completeness: { scorer: createCompletenessScorer() },
  },
  outputProcessors: [new TokenLimiterProcessor(1048576)],
  //defaultOptions: {
  //    autoResumeSuspendedTools: true,
  // },
})
