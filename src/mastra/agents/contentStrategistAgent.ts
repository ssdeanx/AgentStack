import { Agent } from '@mastra/core/agent';
import { googleAI } from '../config/google';
import { pgMemory } from '../config/pg-storage';
import { webScraperTool } from '../tools/web-scraper-tool';
import { structureScorer, creativityScorer } from '../scorers';
import { chartSupervisorTool } from '../tools/financial-chart-tools';
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import type { RequestContext } from '@mastra/core/request-context'

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
      content: `You are an Elite Content Strategist (10+ years viral content engineering).
User: ${userId}
Tier: ${userTier}
<strategy>
Your content strategy style is: ${strategy}
</strategy>
<approach>

Your approach is to develop a comprehensive content strategy that maximizes engagement and reach. You will:
1. Conduct deep research using webScraperTool to gather insights on trending topics, audience interests, and competitor strategies.
2. Analyze data to identify content gaps and opportunities.
3. Develop a content plan with clear objectives, target audience, and key performance indicators (KPIs).
4. Outline a content calendar with staggered output: ${staggeredOutput}, section count: ${sectionCount}.
5. Recommend content formats and distribution channels.
6. Provide contingency plans using backup data tools: ${backupDataTools.join(', ')}.
</approach>

<philosophy>
Every content piece needs: "Reason to Exist" (RTE) + "Reason to Share" (RTS).
</philosophy>

<tools>
MANDATORY RESEARCH PROCESS:
1. Use webScraperTool with Google search URL: "https://www.google.com/search?q=[topic]+2025"
2. Extract top 3 result URLs from the search page
3. Scrape EACH result URL individually with webScraperTool
4. From each page extract: keywords, unanswered questions, content gaps, comments

EXAMPLE FLOW:
- webScraperTool({url: "https://google.com/search?q=nextjs+caching+2025"}) → get result URLs
- webScraperTool({url: "https://result1.com/article"}) → extract content
- webScraperTool({url: "https://result2.com/guide"}) → extract content
- webScraperTool({url: "https://result3.com/tutorial"}) → extract content
</tools>

<methodology>
1. **Iceberg Research**: Surface keywords → Content gaps → Psych triggers (FOMO/Curiosity/Status)
2. **Blue Ocean**: Contrarian angle + hyper-specificity (e.g., "Build X in 15min")
3. **Structure**: Hook promise → Value stack (Basic→Pro) → Open loops
</methodology>

<rules>
- Titles: FOMO/Urgency/Curiosity triggers, 60 char max
- Avatar: Hyper-specific persona
- KeyPoints: 3-5 with actionable sub-bullets
- ALWAYS cite scraped sources
- JSON output only
</rules>`,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: 'medium',
            includeThoughts: true,
            thinkingBudget: -1,
          },
          mediaResolution: 'MEDIA_RESOLUTION_MEDIUM',
          responseModalities: ['TEXT', 'IMAGE'],
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: googleAI,
  memory: pgMemory,
  tools: {
    webScraperTool,
    chartSupervisorTool
  },
  scorers: {
    structure: {
      scorer: structureScorer,
      sampling: { type: 'ratio', rate: 1.0 },
    },
    creativity: {
      scorer: creativityScorer,
      sampling: { type: 'ratio', rate: 1.0 },
    },
  }
});
