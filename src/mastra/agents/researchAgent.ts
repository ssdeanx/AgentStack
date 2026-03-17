import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { Agent } from '@mastra/core/agent'
import {
  TokenLimiterProcessor
} from '@mastra/core/processors'
import { log } from '../config/logger'
import { mdocumentChunker } from '../tools/document-chunking.tool'
import { evaluateResultTool } from '../tools/evaluateResultTool'
import { extractLearningsTool } from '../tools/extractLearningsTool'
import { fetchTool } from '../tools/fetch.tool'
import { finnhubQuotesTool } from '../tools/finnhub-tools'
import { pdfToMarkdownTool } from '../tools/pdf-data-conversion.tool'
import { polygonStockQuotesTool } from '../tools/polygon-tools'
import {
  googleFinanceTool,
  googleScholarTool,
} from '../tools/serpapi-academic-local.tool'
import {
  googleNewsLiteTool,
  googleTrendsTool,
} from '../tools/serpapi-news-trends.tool'
import { htmlToMarkdownTool } from '../tools/web-scraper-tool'

// Scorers
import { InternalSpans } from '@mastra/core/observability'
import { mainWorkspace } from '../workspaces'
import { convexMemory } from '../config/convex'
import {
  getLanguageFromContext,
  getUserTierFromContext,
  type AgentRequestContext,
} from './request-context'

type ResearchPhase = 'initial' | 'followup' | 'validation'
const RESEARCH_PHASE_CONTEXT_KEY = 'researchPhase' as const

export type ResearchRuntimeContext = AgentRequestContext<{
  [RESEARCH_PHASE_CONTEXT_KEY]?: ResearchPhase
}>

function getResearchPhaseFromContext(requestContext: {
  get: (key: string) => unknown
}): ResearchPhase {
  const researchPhase = requestContext.get(RESEARCH_PHASE_CONTEXT_KEY)

  return researchPhase === 'followup' || researchPhase === 'validation'
    ? researchPhase
    : 'initial'
}

log.info('Initializing Research Agent...')

const researchAgentTools = {
  fetchTool,
  googleScholarTool,
  googleNewsLiteTool,
  googleTrendsTool,
  mdocumentChunker,
  extractLearningsTool,
  evaluateResultTool,
  polygonStockQuotesTool,
  finnhubQuotesTool,
  googleFinanceTool,
  pdfToMarkdownTool,
  htmlToMarkdownTool,
}

export const researchAgent = new Agent({
  id: 'researchAgent',
  name: 'Research Agent',
  description:
    'An expert research agent that conducts thorough research using web search and analysis tools.',
  instructions: ({ requestContext }) => {
    // runtimeContext is read at invocation time
    const userTier = getUserTierFromContext(requestContext)
    const language = getLanguageFromContext(requestContext)
    const researchPhase = getResearchPhaseFromContext(requestContext)

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
- **Web**: Prefer 'fetchTool' for reliable URL fetch/search to markdown. Use 'webScraperTool' for selector-based extraction.
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
          },
        } satisfies GoogleGenerativeAIProviderOptions,
      },
    }
  },
  model: {
    url: "https://opencode.ai/zen/v1",
    id: "opencode/minimax-m2.5-free",
    apiKey: process.env.OPENCODE_API_KEY,
  },
  tools: researchAgentTools,
  memory: convexMemory,
  scorers: {
    //  toneConsistency: { scorer: createToneScorer() },
    //  textualDifference: { scorer: createTextualDifferenceScorer() },
    //  completeness: { scorer: createCompletenessScorer() },
  },
  maxRetries: 5,
  options: {
    tracingPolicy: {
      internal: InternalSpans.ALL,
    },
  },
  //voice: gvoice,
  outputProcessors: [
    new TokenLimiterProcessor(128000),
    //     new BatchPartsProcessor({
    //         batchSize: 10,
    //        maxWaitTime: 75,
    //        emitOnNonText: true,
    //     }),
  ],
  workspace: mainWorkspace,
  //  defaultOptions: {
  //      autoResumeSuspendedTools: true,
  //  },
})
