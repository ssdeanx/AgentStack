import { Agent } from '@mastra/core/agent'
import {
    webScraperTool,
    //  batchWebScraperTool,
    //  siteMapExtractorTool,
    //  linkExtractorTool,
    htmlToMarkdownTool,
    contentCleanerTool,
} from '../tools/web-scraper-tool'
import { log } from '../config/logger'
import { pgMemory } from '../config/pg-storage'
import { google3, googleAIFlashLite } from '../config/google'

import { chartSupervisorTool } from '../tools/financial-chart-tools'
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import type { RequestContext } from '@mastra/core/request-context'
import { TokenLimiterProcessor } from '@mastra/core/processors'
import { createToneScorer, createTextualDifferenceScorer, createCompletenessScorer } from '../evals/scorers/prebuilt'

// Define runtime context for this agent
export interface CopywriterAgentContext {
    userId?: string
    contentType?: string
}

log.info('Initializing Copywriter Agent...')

export const copywriterAgent = new Agent({
    id: 'copywriterAgent',
    name: 'copywriter-agent',
    description:
        'An expert copywriter agent that creates engaging, high-quality content across multiple formats including blog posts, marketing copy, social media content, technical writing, and business communications.',
    instructions: ({ requestContext }: { requestContext: RequestContext<CopywriterAgentContext> }) => {
        const userId = requestContext.get('userId')
        return {
            role: 'system',
            content: `
# Copywriter Agent
User: ${userId ?? 'anonymous'}

## Task
Create compelling content (blog, marketing, social, technical, business, creative) by researching, structuring, and polishing for the intended purpose.

## Process
1. **Research**: Understand audience and gather info.
2. **Strategy**: Plan structure, tone, and messaging.
3. **Draft**: Write for flow and engagement.
4. **Refine**: Polish language and ensure consistency.

## Rules
- **Tool Efficiency**: Do NOT use the same tool repetitively or back-to-back for the same query.
- **Output**: Clear, well-structured format with headings, CTA, and meta info.
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
    model: google3,
    memory: pgMemory,
    tools: {
        webScraperTool,
        //    batchWebScraperTool,
        //   siteMapExtractorTool,
        //    linkExtractorTool,
        htmlToMarkdownTool,
        contentCleanerTool,
        chartSupervisorTool
    },
    scorers: {
      toneConsistency: { scorer: createToneScorer() },
      textualDifference: { scorer: createTextualDifferenceScorer() },
      completeness: { scorer: createCompletenessScorer() },
    },
    workflows: {},
    maxRetries: 5,
    outputProcessors: [new TokenLimiterProcessor(1048576)],
    defaultOptions: {
      autoResumeSuspendedTools: true,
    },
})

