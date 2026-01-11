import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { Agent } from '@mastra/core/agent'
import { BatchPartsProcessor, TokenLimiterProcessor, UnicodeNormalizer } from '@mastra/core/processors'
import type { RequestContext } from '@mastra/core/request-context'
import { PGVECTOR_PROMPT } from "@mastra/pg"
import { googleAI, googleAIFlashLite, pgMemory, pgQueryTool } from '../config'
import { log } from '../config/logger'
import { alphaVantageStockTool } from '../tools/alpha-vantage.tool'
import { chartDataProcessorTool, chartGeneratorTool, chartTypeAdvisorTool } from '../tools/financial-chart-tools'
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

type UserTier = 'free' | 'pro' | 'enterprise'
export interface ChartRuntimeContext {
  'user-tier': UserTier
  language: 'en' | 'es' | 'ja' | 'fr'
  chartStyle: 'detailed' | 'concise'
  colorScheme: 'dark' | 'light'
}

log.info('Initializing Financial Chart Agents...')

/**
 * Chart Type Advisor Agent
 * Recommends optimal chart types based on financial data characteristics
 */
export const chartTypeAdvisorAgent = new Agent({
  id: 'chartTypeAdvisorAgent',
  name: 'Chart Type Advisor',
  description: 'Expert in recommending optimal Recharts chart types for financial data visualization based on data characteristics and user requirements.',
  instructions: ({ requestContext }: { requestContext: RequestContext<ChartRuntimeContext> }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    const language = requestContext.get('language') ?? 'en'
    const chartStyle = requestContext.get('chartStyle') ?? 'detailed'
    const colorScheme = requestContext.get('colorScheme') ?? 'dark'
    return {
      role: 'system',
      content: `
<role>
User: ${userTier}
Language: ${language}
Chart Style: ${chartStyle}
Color Scheme: ${colorScheme}
You are a Financial Data Visualization Specialist focused on recommending optimal Recharts chart types.
</role>

<reasoning_protocol>
1. **Analyze Data**: Identify if data is time-series, categorical, hierarchical, or relational.
2. **Determine Goal**: Comparison, composition, distribution, or relationship.
3. **Select Chart**: Choose optimal Recharts component (Line, Area, Bar, Composed, Pie, Scatter, Treemap).
</reasoning_protocol>

<recharts_recommendations>
- **Trend**: LineChart (Stock prices)
- **Analysis**: ComposedChart (OHLC + Volume)
- **Composition**: PieChart (Portfolio allocation)
- **Comparison**: BarChart (Earnings)
- **Relationship**: ScatterChart (Price vs Volume)
- **Hierarchy**: Treemap (Market sectors)
</recharts_recommendations>

<rules>
- **Tool Efficiency**: Do NOT use the same tool repetitively or back-to-back for the same query.
- **Output**: Return recommendations as JSON with primaryChart, alternativeCharts, dataTransformation, and responsiveConfig.
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
  model: googleAIFlashLite,
  memory: pgMemory,
  maxRetries: 3,
  outputProcessors: [new TokenLimiterProcessor(1048576)]
})

/**
 * Chart Data Processor Agent
 * Transforms raw financial data into Recharts-compatible format
 */
export const chartDataProcessorAgent = new Agent({
  id: 'chartDataProcessorAgent',
  name: 'Chart Data Processor',
  description: 'Transforms raw financial API data into optimized Recharts-compatible data structures with proper formatting and calculations.',
  instructions: ({ requestContext }: { requestContext: RequestContext<ChartRuntimeContext> }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    const language = requestContext.get('language') ?? 'en'
    const chartStyle = requestContext.get('chartStyle') ?? 'detailed'
    const colorScheme = requestContext.get('colorScheme') ?? 'dark'
    return {
      role: 'system',
      content: `
<role>
User: ${userTier}
Language: ${language}
Chart Style: ${chartStyle}
Color Scheme: ${colorScheme}
You are a Financial Data Processing Specialist that transforms raw API data into Recharts-ready formats.
</role>

<capabilities>
1. **Normalize**: Convert API responses (Polygon, Finnhub, Alpha Vantage) to uniform format.
2. **Process**: Handle timestamps, intervals, and aggregation.
3. **Calculate**: Moving averages, % changes, and technical indicators.
4. **Validate**: Clean nulls and handle data gaps.
</capabilities>

<rules>
- **Tool Efficiency**: Do NOT use the same tool repetitively or back-to-back for the same query.
- **Output**: Return processed data as JSON with chartData, dataKeys, domain, metadata, and calculations.
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
  model: googleAIFlashLite,
  tools: {
    polygonStockQuotesTool,
    polygonStockAggregatesTool,
    finnhubQuotesTool,
    finnhubTechnicalTool,
    alphaVantageStockTool,
  },
  memory: pgMemory,
  options: {},
  maxRetries: 3,
  outputProcessors: [new TokenLimiterProcessor(1048576)]
})

/**
 * Chart Generator Agent
 * Generates complete Recharts React component code
 */
export const chartGeneratorAgent = new Agent({
  id: 'chartGeneratorAgent',
  name: 'Chart Generator',
  description: 'Generates production-ready Recharts React component code for financial data visualization with TypeScript support.',
  instructions: ({ requestContext }: { requestContext: RequestContext<ChartRuntimeContext> }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    const language = requestContext.get('language') ?? 'en'
    const chartStyle = requestContext.get('chartStyle') ?? 'detailed'
    const colorScheme = requestContext.get('colorScheme') ?? 'dark'

    return {
      role: 'system',
      content: `
<role>
User: ${userTier}
Language: ${language}
Chart Style: ${chartStyle}
Color Scheme: ${colorScheme}
You are a Senior React Developer specializing in Recharts financial visualization components.
</role>

<expertise>
- Generate TypeScript React components using Recharts v3.5.0+.
- Create responsive, accessible, and performant chart components.
- Implement proper data typing and prop interfaces.
- Follow React best practices and Recharts patterns.
</expertise>

<rules>
- **Tool Efficiency**: Do NOT use the same tool repetitively or back-to-back for the same query.
- **Output**: Return complete component code as JSON with componentName, code, props, dependencies, and usage.
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
  model: googleAI,
  memory: pgMemory,
  maxRetries: 3,
  outputProcessors: [new TokenLimiterProcessor(1048576)]
})

/**
 * Chart Supervisor Agent
 * Orchestrates the chart creation pipeline from data to component
 */
export const chartSupervisorAgent = new Agent({
  id: 'chartSupervisorAgent',
  name: 'Chart Supervisor',
  description: 'Orchestrates the complete financial chart creation pipeline, coordinating data fetching, processing, chart type selection, and component generation.',
  instructions: ({ requestContext }: { requestContext: RequestContext<ChartRuntimeContext> }) => {
    const userTier = requestContext.get('user-tier') ?? 'free'
    const language = requestContext.get('language') ?? 'en'
    const chartStyle = requestContext.get('chartStyle') ?? 'detailed'
    const colorScheme = requestContext.get('colorScheme') ?? 'dark'
    return {
      role: 'system',
      content: `
<role>
User: ${userTier}
Language: ${language}
Chart Style: ${chartStyle}
Color Scheme: ${colorScheme}
You are the Financial Chart Supervisor, orchestrating the complete chart creation pipeline.
</role>

<responsibilities>
1. **Analyze**: Understand visualization needs and constraints.
2. **Orchestrate**: Coordinate data fetching from financial APIs.
3. **Plan**: Determine optimal chart types and configurations.
4. **QA**: Validate data integrity and component correctness.
</responsibilities>

<pipeline_steps>
1. **Gather**: Identify symbols, ranges, and metrics.
2. **Collect**: Use Polygon, Finnhub, and Alpha Vantage tools for data.
3. **Select**: Recommend chart type (Line, Pie, Bar, Composed).
4. **Generate**: Create React component with TS interfaces and theming.
</pipeline_steps>

<rules>
- **Tool Efficiency**: Do NOT use the same tool repetitively or back-to-back for the same query.
- **Output**: Return comprehensive chart package as JSON with request, data, component, configuration, and sources.
${PGVECTOR_PROMPT}
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
  model: googleAI,
  tools: {
    polygonStockQuotesTool,
    polygonStockAggregatesTool,
    polygonStockFundamentalsTool,
    finnhubQuotesTool,
    finnhubCompanyTool,
    finnhubFinancialsTool,
    finnhubAnalysisTool,
    finnhubTechnicalTool,
    alphaVantageStockTool,
    googleFinanceTool,
    chartGeneratorTool,
    chartDataProcessorTool,
    chartTypeAdvisorTool,
    pgQueryTool
  },
  memory: pgMemory,
  options: {
  },
  scorers: {

  },
  inputProcessors: [
    new UnicodeNormalizer({
      stripControlChars: false,
      collapseWhitespace: true,
      preserveEmojis: true,
      trim: true,
    }),
  ],
  maxRetries: 5,
  outputProcessors: [new TokenLimiterProcessor(128000), new BatchPartsProcessor({
    batchSize: 5,
    maxWaitTime: 75,
    emitOnNonText: true
  })]
})
