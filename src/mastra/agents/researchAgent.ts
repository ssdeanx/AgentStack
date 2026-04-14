import { libsqlQueryTool, libsqlgraphQueryTool } from './../config/libsql';
import { libsqlChunker, mdocumentChunker } from './../tools/document-chunking.tool';
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { Agent } from '@mastra/core/agent'
import { log } from '../config/logger'
import { evaluateResultTool } from '../tools/evaluateResultTool'
import { extractLearningsTool } from '../tools/extractLearningsTool'
import { fetchTool } from '../tools/fetch.tool'
import { binanceSpotMarketDataTool } from '../tools/binance-crypto-market.tool'
import { coinbaseExchangeMarketDataTool } from '../tools/coinbase-exchange-crypto.tool'
import { finnhubQuotesTool } from '../tools/finnhub-tools'
import { polygonStockQuotesTool } from '../tools/polygon-tools'
import {
  googleFinanceTool,
  googleScholarTool,
} from '../tools/serpapi-academic-local.tool'
import {
  googleNewsLiteTool,
  googleTrendsTool,
} from '../tools/serpapi-news-trends.tool'
import { stooqStockQuotesTool } from '../tools/stooq-stock-market-data.tool'
import { yahooFinanceStockQuotesTool } from '../tools/yahoo-finance-stock.tool'

// Scorers
import { InternalSpans } from '@mastra/core/observability'
import { mainWorkspace } from '../workspaces'
import {
  getLanguageFromContext,
  getRoleFromContext,
  type AgentRequestContext,
} from './request-context'
import { researchArxivDownloadWorkflow } from '../workflows/research/research-arxiv-download.workflow'
import { researchArxivSearchWorkflow } from '../workflows/research/research-arxiv-search.workflow'
import { LibsqlMemory } from '../config/libsql'
import { listRepositories } from '../tools/github';
import { stagehand } from '../browsers';

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
  libsqlChunker,
  libsqlQueryTool,
  libsqlgraphQueryTool,
  listRepositories,
  extractLearningsTool,
  evaluateResultTool,
  polygonStockQuotesTool,
  finnhubQuotesTool,
  googleFinanceTool,
  binanceSpotMarketDataTool,
  coinbaseExchangeMarketDataTool,
  stooqStockQuotesTool,
  yahooFinanceStockQuotesTool,
}

/**
 * Research Agent.
 *
 * Conducts multi-step web research, synthesis, and citation-backed analysis.
 */
export const researchAgent = new Agent({
  id: 'researchAgent',
  name: 'Research Agent',
  description:
    'An expert research agent that conducts thorough research using web search and analysis tools.',
  instructions: ({ requestContext }) => {
    // runtimeContext is read at invocation time
    const role = getRoleFromContext(requestContext)
    const language = getLanguageFromContext(requestContext)
    const researchPhase = getResearchPhaseFromContext(requestContext)

    return {
      role: 'system',
      content: `
# Senior Research Analyst
Role: ${role} | Lang: ${language} | Phase: ${researchPhase}

## Research Protocol
1. **Plan**: Deconstruct topic into 2-3 specific queries.
2. **Search**: Select the best tool from the Guide for each query.
3. **Process**: Use 'extractLearningsTool' on results to get insights and follow-up questions.
4. **Follow-up**: Execute one round of follow-up research based on Phase 1 insights.
5. **Synthesize**: Provide final answer with citations and confidence levels. STOP after Phase 2.

## Tool Selection Guide
- **Web**: Prefer 'fetchTool' for reliable URL fetch/search to markdown.
- **News/Trends**: 'googleNewsTool', 'googleTrendsTool', 'googleFinanceTool'.
- **Academic**: 'googleScholarTool'.
- **Financial**: Use 'polygon*' for stocks/crypto.
- **Financial**: Use 'polygon*' for stocks/crypto when you need paid/commercial feeds; use 'binanceSpotMarketDataTool', 'coinbaseExchangeMarketDataTool', 'stooqStockQuotesTool', and 'yahooFinanceStockQuotesTool' for free public market data.
- **Internal**: 'libsqlChunker' for embedding any information, 'libsqlQueryTool' for querying embedded knowledge. 'libsqlgraphQueryTool' for complex relational queries.
- **Processing**: use workspace document tools for PDFs, Markdown, and any other filetype in the workspace;

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
    url: "https://api.kilo.ai/api/gateway",
    id:'kilo/x-ai/grok-code-fast-1:optimized:free',
    apiKey: process.env.KILO_API_KEY,
    provider: 'kilo',
  },
  tools: researchAgentTools,
  workflows: { researchArxivDownloadWorkflow, researchArxivSearchWorkflow },
  memory: LibsqlMemory,
  scorers: {
    //  toneConsistency: { scorer: createToneScorer() },
    //  textualDifference: { scorer: createTextualDifferenceScorer() },
    //  completeness: { scorer: createCompletenessScorer() },
  },
  maxRetries: 5,
  options: {
    tracingPolicy: {
      internal: InternalSpans.AGENT,
    },
  },
  //voice: gvoice,
  outputProcessors: [
  //  new TokenLimiterProcessor(128000),
    //     new BatchPartsProcessor({
    //         batchSize: 10,
    //        maxWaitTime: 75,
    //        emitOnNonText: true,
    //     }),
  ],
  workspace: mainWorkspace,
  browser: stagehand,
  //  defaultOptions: {
  //      autoResumeSuspendedTools: true,
  //  },
})
