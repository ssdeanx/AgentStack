import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { BatchPartsProcessor, TokenLimiterProcessor } from '@mastra/core/processors';
import type { RequestContext } from '@mastra/core/request-context';

import { google } from '../config/google';
import { log } from '../config/logger';
import { pgMemory } from '../config/pg-storage';
import { alphaVantageCryptoTool, alphaVantageStockTool } from '../tools/alpha-vantage.tool';
import { mdocumentChunker } from '../tools/document-chunking.tool';
import { evaluateResultTool } from '../tools/evaluateResultTool';
import { extractLearningsTool } from '../tools/extractLearningsTool';
import { finnhubAnalysisTool, finnhubCompanyTool, finnhubFinancialsTool, finnhubQuotesTool, finnhubTechnicalTool } from '../tools/finnhub-tools';
import { pdfToMarkdownTool } from '../tools/pdf-data-conversion.tool';
import { polygonCryptoAggregatesTool, polygonCryptoQuotesTool, polygonCryptoSnapshotsTool, polygonStockAggregatesTool, polygonStockFundamentalsTool, polygonStockQuotesTool } from '../tools/polygon-tools';
import { googleFinanceTool, googleScholarTool } from '../tools/serpapi-academic-local.tool';
import { googleNewsLiteTool, googleTrendsTool } from '../tools/serpapi-news-trends.tool';
import {
  batchWebScraperTool,
  contentCleanerTool,
  htmlToMarkdownTool,
  linkExtractorTool,
  siteMapExtractorTool,
  webScraperTool,
} from '../tools/web-scraper-tool';

// Scorers
import { createCompletenessScorer, createTextualDifferenceScorer, createToneScorer } from '../evals/scorers/prebuilt';

type UserTier = 'free' | 'pro' | 'enterprise'
export interface ResearchRuntimeContext {
  'user-tier': UserTier
  language: 'en' | 'es' | 'ja' | 'fr'
  // Optional runtime fields the server middleware may populate
  userId?: string
  researchPhase?: 'initial' | 'followup' | 'validation' | string
}
log.info('Initializing Research Agent...')

export const researchAgent = new Agent({
  id: 'researchAgent',
  name: 'Research Agent',
  description:
    'An expert research agent that conducts thorough research using web search and analysis tools.',
  instructions: ({ requestContext }: { requestContext: RequestContext<ResearchRuntimeContext> }) => {
    // runtimeContext is read at invocation time
    const userTier = requestContext.get('user-tier') ?? 'free'
    const language = requestContext.get('language') ?? 'en'
    const researchPhase = requestContext.get('researchPhase') ?? 'initial'

    return {
      role: 'system',
      content: `
# Senior Research Analyst
Tier: ${userTier} | Lang: ${language} | Phase: ${researchPhase}

## Research Protocol
1. **Plan**: Deconstruct topic into 2-3 specific queries.
2. **Search**: Select the best tool from the Guide for each query.
3. **Process**: Use 'extractLearningsTool' on results to get insights and follow-up questions.
4. **Follow-up**: Execute one round of follow-up research based on Phase 1 insights.
5. **Synthesize**: Provide final answer with citations and confidence levels. STOP after Phase 2.

## Tool Selection Guide
- **Web**: 'webScraperTool' (single URL), 'batchWebScraperTool' (multiple).
- **News/Trends**: 'googleNewsTool', 'googleTrendsTool', 'googleFinanceTool'.
- **Academic**: 'googleScholarTool'.
- **Financial**: Use 'polygon*', 'finnhub*', or 'alphaVantage*' for stocks/crypto.
- **Internal**: 'pgQueryTool' for previously indexed knowledge.
- **Processing**: 'pdfToMarkdownTool' for PDFs; 'evaluateResultTool' for quality checks.

## Rules
- **Efficiency**: No repetitive or back-to-back tool calls for the same query.
- **Specificity**: Use focused queries; cite sources with confidence levels.
- **Fallback**: If tools fail, use internal knowledge and state failure.
`,
      providerOptions: {
        google: {
          responseModalities: ['TEXT'],
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: 'medium',
          }
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: ({ requestContext }: { requestContext: RequestContext<ResearchRuntimeContext> }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    if (userTier === 'enterprise') {
      // higher quality (chat style) for enterprise
      return google.chat('gemini-3-pro-preview')
    } else if (userTier === 'pro') {
      // cheaper/faster model for pro tier
      return 'google/gemini-3-flash-preview'
    }
    // cheaper/faster model for free tier
    return google.chat('gemini-3-flash-preview')
  },
  tools: {
    webScraperTool,
    siteMapExtractorTool,
    linkExtractorTool,
    htmlToMarkdownTool,
    contentCleanerTool,
    batchWebScraperTool,
    mdocumentChunker,
    evaluateResultTool,
    extractLearningsTool,
    googleScholarTool,
    googleTrendsTool,
    googleFinanceTool,
    googleNewsLiteTool,

    alphaVantageCryptoTool,
    alphaVantageStockTool,
    polygonCryptoQuotesTool,
    polygonCryptoAggregatesTool,
    polygonCryptoSnapshotsTool,

    pdfToMarkdownTool,
    finnhubAnalysisTool,
    polygonStockQuotesTool,
    polygonStockAggregatesTool,
    polygonStockFundamentalsTool,
    finnhubQuotesTool,
    finnhubCompanyTool,
    finnhubFinancialsTool,
    finnhubTechnicalTool,
  },
  memory: pgMemory,
  scorers: {
    toneConsistency: { scorer: createToneScorer() },
    textualDifference: { scorer: createTextualDifferenceScorer() },
    completeness: { scorer: createCompletenessScorer() }
  },
  maxRetries: 5,
  //voice: gvoice,
  outputProcessors: [
    new TokenLimiterProcessor(128000),
    new BatchPartsProcessor({
      batchSize: 10,
      maxWaitTime: 75,
      emitOnNonText: true
    }),
  ],
  defaultOptions: {
    autoResumeSuspendedTools: true,
  },
})
