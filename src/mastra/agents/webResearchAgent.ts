import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { Agent } from '@mastra/core/agent'
import {
    BatchPartsProcessor,
    TokenLimiterProcessor,
} from '@mastra/core/processors'
import type { RequestContext } from '@mastra/core/request-context'

import { google } from '../config/google'
import { log } from '../config/logger'
import { pgMemory } from '../config/pg-storage'

import {
    webScraperTool,
    siteMapExtractorTool,
    linkExtractorTool,
    htmlToMarkdownTool,
    contentCleanerTool,
    batchWebScraperTool,
    scrapingSchedulerTool,
} from '../tools/web-scraper-tool'

import { extractLearningsTool } from '../tools/extractLearningsTool'
import { InternalSpans } from '@mastra/core/observability'

type UserTier = 'free' | 'pro' | 'enterprise'

export interface WebResearchRuntimeContext {
    'user-tier': UserTier
    language: 'en' | 'es' | 'ja' | 'fr'
    // Optional runtime fields server middleware may populate
    userId?: string
    researchPhase?: 'initial' | 'followup' | 'validation' | string
}

log.info('Initializing Web Research Agent...')

export const webResearchAgent = new Agent({
    id: 'webResearchAgent',
    name: 'Web Research Agent',
    description:
        'Expert at web scraping and extracting structured data from websites. Handles single URL extraction, bulk scraping, and site maps.',
    instructions: ({
        requestContext,
    }: {
        requestContext: RequestContext<WebResearchRuntimeContext>
    }) => {
        const userTier = requestContext.get('user-tier') ?? 'free'
        const language = requestContext.get('language') ?? 'en'
        const researchPhase = requestContext.get('researchPhase') ?? 'initial'

        return {
            role: 'system',
            content: `
# Web Research Specialist
Tier: ${userTier} | Lang: ${language} | Phase: ${researchPhase}

## Expertise
- Web scraping and data extraction
- HTML parsing and conversion
- Site structure analysis
- Content cleaning and normalization

## Tool Selection Guide
- **Single URL**: Use 'webScraperTool' for one page.
- **Multiple URLs**: Use 'batchWebScraperTool' for 2+ URLs.
- **Site Discovery**: Use 'siteMapExtractorTool' to find all URLs on a domain.
- **Link Extraction**: Use 'linkExtractorTool' to find all links on a page.
- **HTML Processing**: Use 'htmlToMarkdownTool' for HTML to Markdown conversion.
- **Content Cleaning**: Use 'contentCleanerTool' to normalize text.
- **Scheduled Scraping**: Use 'scrapingSchedulerTool' for recurring tasks.

## Research Protocol
1. **Discovery**: Start with 'siteMapExtractorTool' to explore domain structure.
2. **Extraction**: Use appropriate scraper tool (single vs batch).
3. **Processing**: Convert HTML to Markdown and clean content.
4. **Analysis**: Use 'extractLearningsTool' to surface insights.

## Rules
- **Efficiency**: Batch requests when possible; avoid repetitive scraping.
- **Reliability**: Handle rate limits and errors gracefully.
- **Quality**: Always clean and normalize extracted content.
- **Citations**: Maintain source URLs and timestamps.
- **Feedback**: Use 'evaluateResultTool' to assess output quality.

## Output Format
Provide structured results with:
- Source URLs and metadata
- Extracted content (cleaned, Markdown)
- Key insights and learnings
- Confidence levels and data quality scores
`,
            providerOptions: {
                google: {
                    responseModalities: ['TEXT'],
                    thinkingConfig: {
                        includeThoughts: true,
                        thinkingLevel: 'medium',
                    },
                } satisfies GoogleGenerativeAIProviderOptions,
            },
        }
    },
    model: ({
        requestContext,
    }: {
        requestContext: RequestContext<WebResearchRuntimeContext>
    }) => {
        const userTier = requestContext.get('user-tier') ?? 'free'
        if (userTier === 'enterprise') {
            return google.chat('gemini-3-pro-preview')
        } else if (userTier === 'pro') {
            return 'google/gemini-3-flash-preview'
        }
        return google.chat('gemini-3-flash-preview')
    },
    tools: {
        webScraperTool,
        siteMapExtractorTool,
        linkExtractorTool,
        htmlToMarkdownTool,
        contentCleanerTool,
        batchWebScraperTool,
        scrapingSchedulerTool,
        extractLearningsTool,
    },
    memory: pgMemory,
    maxRetries: 5,
    options: {
        tracingPolicy: {
            internal: InternalSpans.ALL,
        },
    },
    outputProcessors: [
        new TokenLimiterProcessor(128000),
        new BatchPartsProcessor({
            batchSize: 10,
            maxWaitTime: 75,
            emitOnNonText: true,
        }),
    ],
    defaultOptions: {
        autoResumeSuspendedTools: true,
    },
})
