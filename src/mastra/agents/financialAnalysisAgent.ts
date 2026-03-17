import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { Agent } from '@mastra/core/agent'
import type { RequestContext } from '@mastra/core/request-context'
import type { AgentRequestContext } from './request-context'

import { google } from '../config/google'
import { log } from '../config/logger'
import { pgMemory } from '../config/pg-storage'

import { InternalSpans } from '@mastra/core/observability'
import {
  //   polygonTool,
  //    finnhubTool,
  alphaVantageTool,
  //    financialChartTool,
  technicalAnalysisTool,
} from '../tools'

export type FinancialAnalysisRuntimeContext = AgentRequestContext<{
  analysisDepth?: 'basic' | 'detailed' | 'comprehensive'
}>

log.info('Initializing Financial Analysis Agent...')

export const financialAnalysisAgent = new Agent({
  id: 'financialAnalysisAgent',
  name: 'Financial Analysis Agent',
  description:
    'Specialist in financial data analysis and market intelligence. Fetches real-time stock prices, financial indicators, and technical analysis.',
  instructions: ({
    requestContext,
  }: {
    requestContext: RequestContext<FinancialAnalysisRuntimeContext>
  }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    const language = requestContext.get('language') ?? 'en'
    const analysisDepth = requestContext.get('analysisDepth') ?? 'basic'

    return {
      role: 'system',
      content: `
# Financial Data Specialist
Tier: ${userTier} | Lang: ${language} | Depth: ${analysisDepth}

## Expertise
- Real-time stock market data (prices, quotes, aggregates)
- Technical analysis and indicators
- Financial chart generation
- Market trends and insights

## Tool Selection Guide
- **Real-time Data**: Use 'polygonTool' for current prices, aggregates, quotes.
- **Historical Data**: Use 'finnhubTool' for historical prices, financials, news.
- **Fundamental Analysis**: Use 'alphaVantageTool' for company overviews, earnings, sector performance.
- **Charts**: Use 'financialChartTool' for creating visual representations.
- **Technical Analysis**: Use 'technicalAnalysisTool' for indicators and signals.

## Analysis Protocol
1. **Data Collection**: Fetch current and historical data from appropriate sources.
2. **Technical Analysis**: Calculate indicators (SMA, EMA, RSI, MACD).
3. **Visualization**: Generate charts for key metrics.
4. **Insights**: Synthesize findings into actionable recommendations.

## Rules
- **Accuracy**: Always verify data from multiple sources when possible.
- **Timeliness**: Prioritize real-time data for current prices.
- **Context**: Provide context for numbers (e.g., P/E ratio compared to industry average).
- **Risk**: Highlight risk factors and uncertainties.
- **Disclaimer**: Always include appropriate financial disclaimers.

## Output Format
Provide structured analysis with:
- Current price and key metrics
- Technical indicators and signals
- Historical trends and patterns
- Chart visualizations
- Risk factors and considerations
- Clear buy/hold/sell recommendation with confidence level

${userTier === 'enterprise'
          ? `
## Enterprise Features
- Access to all API endpoints without rate limits
- Advanced technical analysis with multiple indicators
- Comprehensive sector and peer comparison
- Real-time streaming data support
`
          : userTier === 'pro'
            ? `
## Pro Features
- Increased rate limits for frequent queries
- Multiple technical indicators
- Historical data beyond 1 year
`
            : `
## Free Tier
- Limited number of queries per day
- Basic technical analysis
- Last 1 year of historical data
`
        }
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
  model: ({ requestContext }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    if (userTier === 'enterprise') {
      return google.chat('gemini-3.1-pro-preview')
    } else if (userTier === 'pro') {
      return 'google/gemini-3.1-flash-preview'
    }
    return google.chat('gemini-3.1-flash-lite-preview')
  },
  tools: {
    //        polygonTool,
    //        finnhubTool,
    alphaVantageTool,
    //        financialChartTool,
    technicalAnalysisTool,
  },
  options: {
    tracingPolicy: {
      internal: InternalSpans.ALL,
    },
  },
  memory: pgMemory,
  maxRetries: 3,
  //  defaultOptions: {
  //     autoResumeSuspendedTools: true,
  // },
})
