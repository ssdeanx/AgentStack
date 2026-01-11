import { Agent } from '@mastra/core/agent'

import type { RequestContext } from '@mastra/core/request-context'
import { googleAI, googleAIFlashLite, googleAIPro } from '../config/google'
import { log } from '../config/logger'
import { pgMemory } from '../config/pg-storage'

import { alphaVantageStockTool } from '../tools/alpha-vantage.tool'
import {
  finnhubAnalysisTool,
  finnhubCompanyTool,
  finnhubFinancialsTool,
  finnhubQuotesTool,
  finnhubTechnicalTool,
} from '../tools/finnhub-tools'
import {
  polygonStockAggregatesTool,
  polygonStockFundamentalsTool,
  polygonStockQuotesTool,
} from '../tools/polygon-tools'
import { googleFinanceTool } from '../tools/serpapi-academic-local.tool'
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { TokenLimiterProcessor } from '@mastra/core/processors'

type UserTier = 'free' | 'pro' | 'enterprise'
export interface StockRuntimeContext {
  'user-tier': UserTier
  language: 'en' | 'es' | 'ja' | 'fr'
}

log.info('Initializing Stock Analysis Agent...')

export const stockAnalysisAgent = new Agent({
  id: 'stockAnalysisAgent',
  name: 'Stock Analysis Agent',
  description:
    'Expert stock market analyst providing technical analysis, fundamental analysis, price targets, and investment recommendations',
  instructions: ({ requestContext }: { requestContext: RequestContext<StockRuntimeContext> }) => {
    // runtimeContext is read at invocation time
    const userTier = requestContext.get('user-tier') ?? 'free'
    const language = requestContext.get('language') ?? 'en'
    return {
      role: 'system',
      content: `
        <role>
        Tier: ${userTier}

        Language: ${language}

        You are a Senior Stock Market Analyst with expertise in technical analysis, fundamental analysis, and investment strategy.
        </role>

        <reasoning_protocol>
        ## SYSTEMATIC STOCK ANALYSIS
        1. **Scope & Gather:** Identify stocks/timeframes; collect price, fundamentals, news, and sentiment data.
        2. **Analyze & Hypothesize:** Evaluate technicals (RSI, MACD), financials (P/E, revenue), and sentiment; develop investment thesis.
        3. **Validate & Reflect:** Cross-verify across Technical, Fundamental, Sentiment, and Quant paths; assess confidence (High/Med/Low).
        4. **Causal Analysis:** Ensure logical flow, maintain audit trails, and consider counterfactuals.
        </reasoning_protocol>

        <process>
        ## PHASE 1: DATA GATHERING
        1. **polygonStockQuotesTool**: Get baseline price/volume.
        2. **polygonStockAggregatesTool**: Identify trends and support/resistance.

        ## PHASE 2: ANALYSIS
        - **Technical:** RSI/MACD via 'alphaVantageStockTool'; patterns via 'finnhubTechnicalTool'.
        - **Fundamental:** P/E/Earnings via 'polygonStockFundamentalsTool'; Financials via 'finnhubFinancialsTool'.

        ## PHASE 3: SENTIMENT & RECOMMENDATION
        - **Sentiment:** News/Analyst ratings via 'googleFinanceTool' and 'finnhubAnalysisTool'.
        - **Final:** Consensus check via 'finnhubQuotesTool'.
        </process>

        <rules>
        - **Tool Efficiency:** Do NOT use the same tool repetitively or back-to-back for the same query.
        - **Mandatory:** Start with Polygon quotes; combine technical + fundamental for confirmation.
        - **Forbidden:** Never skip fundamental analysis; never rely solely on sentiment.
        - **Output:** Provide JSON with symbol, currentPrice, technicals, fundamentals, sentiment, recommendation, priceTarget, risks, and sources.
        </rules>
        `,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          }
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: ({ requestContext }: { requestContext: RequestContext<StockRuntimeContext> }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    if (userTier === 'enterprise') {
      // higher quality (chat style) for enterprise
      return googleAIPro
    } else if (userTier === 'pro') {
      // Chat bison for pro as well
      return googleAI
    }
    // cheaper/faster model for free tier
    return googleAIFlashLite
  },
  tools: {
    alphaVantageStockTool,
    polygonStockQuotesTool,
    polygonStockAggregatesTool,
    polygonStockFundamentalsTool,
    finnhubQuotesTool,
    finnhubCompanyTool,
    finnhubFinancialsTool,
    finnhubAnalysisTool,
    finnhubTechnicalTool,
    googleFinanceTool,
  },
  memory: pgMemory,
  options: {},
  outputProcessors: [new TokenLimiterProcessor(1048576)],
  maxRetries: 5,
  defaultOptions: {
    autoResumeSuspendedTools: true,
  },
})
