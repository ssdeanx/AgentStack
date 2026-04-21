import { libsqlQueryTool, libsqlgraphQueryTool } from './../config/libsql';
import { libsqlChunker, mdocumentChunker } from './../tools/document-chunking.tool';
import type { GoogleLanguageModelOptions } from '@ai-sdk/google'
import { Agent } from '@mastra/core/agent'
import { log } from '../config/logger'
import { researchAgentChannels } from '../config/channels'
import { evaluateResultTool } from '../tools/evaluateResultTool'
import { extractLearningsTool } from '../tools/extractLearningsTool'
import { fetchTool } from '../tools/fetch.tool'
import { binanceSpotMarketDataTool } from '../tools/binance-crypto-market.tool'
import { coinbaseExchangeMarketDataTool } from '../tools/coinbase-exchange-crypto.tool'
import { discordWebhookTool } from '../tools/discord-webhook.tool'
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
import { googleImagesTool } from '../tools/serpapi-images.tool'
import { googleLocalTool, googleMapsReviewsTool } from '../tools/serpapi-local-maps.tool'
import { googleSearchTool } from '../tools/serpapi-search.tool'
import { stooqStockQuotesTool } from '../tools/stooq-stock-market-data.tool'
import { yahooFinanceStockQuotesTool } from '../tools/yahoo-finance-stock.tool'
import {
  candlestickPatternTool,
  fibonacciTool,
  heikinAshiTool,
  ichimokuCloudTool,
  marketSummaryTool,
  momentumAnalysisTool,
  pivotPointsTool,
  statisticalAnalysisTool,
  technicalAnalysisTool,
  trendAnalysisTool,
  volatilityAnalysisTool,
  volumeAnalysisTool,
} from '../tools/technical-analysis.tool'

// Scorers
import { InternalSpans } from '@mastra/core/observability'
import {
  getLanguageFromContext,
  getRoleFromContext,
  type AgentRequestContext,
} from './request-context'
import { researchArxivDownloadWorkflow } from '../workflows/research/research-arxiv-download.workflow'
import { researchArxivSearchWorkflow } from '../workflows/research/research-arxiv-search.workflow'
import { LibsqlMemory } from '../config/libsql'
import { listRepositories } from '../tools/github';
import { google } from '../config/google'
import {
  TokenLimiter,
  TokenLimiterProcessor,
  ToolSearchProcessor,
  //TokenLimiter
} from '@mastra/core/processors'
import { googleAiOverviewTool } from '../tools/serpapi-search.tool';
import { amazonSearchTool, ebaySearchTool, homeDepotSearchTool, walmartSearchTool } from '../tools/serpapi-shopping.tool';
import { agentFsWorkspace } from '../workspaces';
import { agentBrowser } from '../browsers'
import { convexMemory } from '../config/convex'

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
  //mdocumentChunker,
  //libsqlChunker,
  //libsqlQueryTool,
  //libsqlgraphQueryTool,
  listRepositories,
  //extractLearningsTool,
  //evaluateResultTool,
  polygonStockQuotesTool,
  finnhubQuotesTool,
  googleFinanceTool,
  binanceSpotMarketDataTool,
  coinbaseExchangeMarketDataTool,
  //discordWebhookTool,
  googleImagesTool,
  //googleLocalTool,
  //googleMapsReviewsTool,
  stooqStockQuotesTool,
  yahooFinanceStockQuotesTool,
  ichimokuCloudTool,
  fibonacciTool,
  pivotPointsTool,
  trendAnalysisTool,
  momentumAnalysisTool,
  volatilityAnalysisTool,
  volumeAnalysisTool,
  statisticalAnalysisTool,
  //heikinAshiTool,
  marketSummaryTool,
  candlestickPatternTool,
  technicalAnalysisTool,
  amazonSearchTool, 
  walmartSearchTool, 
  ebaySearchTool, 
  //homeDepotSearchTool,
  googleSearchTool,
  googleAiOverviewTool,
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
- **Live browser verification**: Use the attached browser only when page state, interaction results, or live UI evidence materially matters more than static fetch output.
- **News/Trends**: 'googleNewsLiteTool', 'googleTrendsTool', 'googleFinanceTool'. 'googleSearchTool', 'googleAiOverviewTool',
- **Places/Business**: 'googleLocalTool' for nearby business discovery and 'googleMapsReviewsTool' for place review analysis.
- **Visual**: 'googleImagesTool' for structured image discovery and source lookups.
- **Academic**: 'googleScholarTool'.
- **Financial**: Use 'polygon*' for stocks/crypto.
- **Financial**: Use 'polygon*' for stocks/crypto when you need paid/commercial feeds; use 'binanceSpotMarketDataTool' for free crypto spot data and batch lookups of 1-10 symbols; use 'coinbaseExchangeMarketDataTool', 'stooqStockQuotesTool', and 'yahooFinanceStockQuotesTool' for free public market data.
- **Technical Analysis**: use 'ichimokuCloudTool', 'fibonacciTool', 'pivotPointsTool', 'trendAnalysisTool', 'momentumAnalysisTool', 'volatilityAnalysisTool', 'volumeAnalysisTool', 'statisticalAnalysisTool', 'heikinAshiTool', 'marketSummaryTool', 'candlestickPatternTool', and 'technicalAnalysisTool' for chart pattern and indicator analysis.
- **Internal**: 'libsqlChunker' for embedding any information, 'libsqlQueryTool' for querying embedded knowledge. 'libsqlgraphQueryTool' for complex relational queries.
- **Processing**: use workspace document tools for PDFs, Markdown, and any other filetype in the workspace;

- **Stores**: 'amazonSearchTool', 'walmartSearchTool', 'ebaySearchTool', 'homeDepotSearchTool', for product research.

## Rules
- **Efficiency**: No repetitive or back-to-back tool calls for the same query.
- **Specificity**: Use focused queries; cite sources with confidence levels.
- **Fallback**: If tools fail, use internal knowledge and state failure.
- **GitHub channel delivery**: If the request arrives from a GitHub issue or PR comment thread, respond in concise GitHub-flavored Markdown with a direct answer, bullet findings, source links, and the clearest next action or blocker.
`,
      providerOptions: {
     // google: {
         //responseModalities: ['TEXT'],
         // thinkingConfig: {
         //    includeThoughts: true,
         //    thinkingLevel: 'medium',
         //  },
       // satisfies GoogleLanguageModelOptions,
      },
    }
  },
  model: ({ requestContext }) => {
    const role = getRoleFromContext(requestContext)

    if (role === 'admin') {
      return 'google/gemini-3.1-flash-preview'
    }

    return 'kilo/x-ai/grok-code-fast-1:optimized:free'
  },
  tools: researchAgentTools,
  workflows: { researchArxivDownloadWorkflow, researchArxivSearchWorkflow },
  memory: convexMemory,
  scorers: {
    //  toneConsistency: { scorer: createToneScorer() },
    //  textualDifference: { scorer: createTextualDifferenceScorer() },
    //  completeness: { scorer: createCompletenessScorer() },
  },
  maxRetries: 5,
  options: {
    tracingPolicy: {
      //internal: InternalSpans.MODEL,
    },
  },
  //voice: gvoice,
  inputProcessors: [
    new ToolSearchProcessor({
      tools: researchAgentTools,
      search: { topK: 5 },
    }),
    new TokenLimiter(12000),
  ],
  outputProcessors: [
    new TokenLimiterProcessor(300000),
    //     new BatchPartsProcessor({
    //         batchSize: 10,
    //        maxWaitTime: 75,
    //        emitOnNonText: true,
    //     }),
  ],
  workspace: agentFsWorkspace,
  browser: agentBrowser,
  channels: researchAgentChannels,
  //voice: new GoogleVoice(), // Add OpenAI voice provider with default configuration
  defaultOptions: {
        //autoResumeSuspendedTools: true,
        //includeRawChunks: true,
        modelSettings: {
            temperature: 0.2,
            //maxOutputTokens: 64000,
            topK: 40,
            topP: 0.95,
            //stopSequences: ['\n\n'],
            maxRetries: 5,
        },
        providerOptions: {
        //google: {
         // responseModalities: ['TEXT', 'IMAGE'],
         // thinkingConfig: {
         //   includeThoughts: true,
         //   thinkingLevel: 'medium',
         // },
          //cachedContent: "Use cached content when available to reduce latency and costs, but ensure freshness for time-sensitive queries. Prefer cached data for static information and use real-time fetches for news, trends, and financial data.",
          //streamFunctionCallArguments: true,
          //mediaResolution: "MEDIA_RESOLUTION_MEDIUM",
          //threshold: 'OFF', // Set to 'OFF' to disable thresholding and allow all tool calls
          //labels: "research-agent",
          //serviceTier: 'standard',
       // } satisfies GoogleLanguageModelOptions,
    },
  },
})
