import { Agent } from '@mastra/core/agent';
import { google3, googleAI } from '../config/google';
import { pgMemory } from '../config/pg-storage';
import { webScraperTool } from '../tools/web-scraper-tool';

import { chartSupervisorTool } from '../tools/financial-chart-tools';
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import type { RequestContext } from '@mastra/core/request-context'
import { TokenLimiterProcessor } from '@mastra/core/processors';

export type UserTier = 'free' | 'pro' | 'enterprise'
export interface ContentAgentContext {
    userId?: string
    'user-tier': UserTier
    staggeredOutput?: boolean
    sectionCount?: number
    strategy?: 'iceberg' | 'blue-ocean' | 'structured' | 'hybrid' | 'custom'
    backupDataTools?: string[]
}

export const contentStrategistAgent = new Agent({
  id: 'contentStrategistAgent',
  name: 'Content Strategist',
  description: 'Elite content strategist specializing in high-impact, data-driven content planning.',
  instructions: ({ requestContext }: { requestContext: RequestContext<ContentAgentContext> }) => {
    const userId = requestContext.get('userId') ?? 'anonymous';
    const userTier = requestContext.get('user-tier') ?? 'free';
    const staggeredOutput = requestContext.get('staggeredOutput') ?? false;
    const sectionCount = requestContext.get('sectionCount') ?? 5;
    const strategy = requestContext.get('strategy') ?? 'iceberg';
    const backupDataTools = requestContext.get('backupDataTools') ?? ['chartSupervisorTool'];
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
      }
    }
  },
  model: google3,
  memory: pgMemory,
  tools: {
    webScraperTool,
    chartSupervisorTool
  },
  scorers: {

  },
  outputProcessors: [new TokenLimiterProcessor(1048576)],
  defaultOptions: {
    autoResumeSuspendedTools: true,
  },
});
