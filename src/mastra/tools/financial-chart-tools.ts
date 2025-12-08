import { AISpanType, InternalSpans } from '@mastra/core/ai-tracing';
import type { InferUITool} from "@mastra/core/tools";
import { createTool } from "@mastra/core/tools";
import { z } from 'zod';
import { log } from '../config/logger';

log.info('Initializing Financial Chart Tools...')

/**
 * Chart Supervisor Tool
 * Orchestrates the complete chart creation pipeline
 */
export const chartSupervisorTool = createTool({
  id: 'chart-supervisor',
  description:
    'Orchestrates the complete financial chart creation pipeline. Fetches real-time market data, processes it for visualization, selects optimal chart types, and generates production-ready Recharts React components.',
  inputSchema: z.object({
    symbols: z
      .array(z.string())
      .min(1)
      .describe('Stock symbols to visualize (e.g., ["AAPL", "GOOGL"])'),
    chartType: z
      .enum(['line', 'area', 'bar', 'composed', 'pie', 'scatter', 'auto'])
      .optional()
      .describe("Chart type to generate, or 'auto' for recommendation (defaults to 'auto')"),
    timeRange: z
      .enum(['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'])
      .optional()
      .describe("Time range for historical data (defaults to '1M')"),
    metrics: z
      .array(z.enum(['price', 'volume', 'rsi', 'macd', 'bollinger', 'earnings', 'fundamentals']))
      .optional()
      .describe("Metrics to include in the chart (defaults to ['price', 'volume'])"),
    theme: z
      .enum(['light', 'dark', 'corporate'])
      .optional()
      .describe("Color theme for the chart (defaults to 'light')"),
    responsive: z
      .boolean()
      .optional()
      .describe('Whether to generate responsive component (defaults to true)'),
    includeCode: z
      .boolean()
      .optional()
      .describe('Whether to include React component code (defaults to true)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: z
      .object({
        chartData: z.array(z.record(z.string(), z.unknown())).describe('Processed data for Recharts'),
        metadata: z.object({
          symbols: z.array(z.string()),
          timeRange: z.string(),
          dataPoints: z.number(),
          lastUpdated: z.string(),
        }),
      })
      .optional(),
    component: z
      .object({
        name: z.string(),
        code: z.string(),
        usage: z.string(),
        dependencies: z.array(z.string()),
      })
      .optional(),
    chartRecommendation: z
      .object({
        type: z.string(),
        reasoning: z.string(),
        components: z.array(z.string()),
      })
      .optional(),
    sources: z.array(z.object({
      provider: z.string(),
      timestamp: z.string(),
    })),
    error: z.string().optional(),
  }),
  execute: async ({ context, mastra, writer, runtimeContext, tracingContext }) => {
    const {
      symbols,
      chartType = 'auto',
      timeRange = '1M',
      metrics = ['price', 'volume'],
      theme = 'light',
      responsive = true,
      includeCode = true,
    } = context

    await writer?.write({
      type: 'progress',
      data: { message: `📊 Starting chart pipeline for ${symbols.join(', ')}` },
    })

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'chart-supervisor-tool',
      input: { symbols, chartType, timeRange, metrics, theme },
      tracingPolicy: { internal: InternalSpans.TOOL },
    })

    try {
      const agent = mastra!.getAgent('chartSupervisorAgent')

      const prompt = `Create a financial chart visualization with the following requirements:

**Symbols:** ${symbols.join(', ')}
**Time Range:** ${timeRange}
**Metrics:** ${metrics.join(', ')}
**Chart Type:** ${chartType === 'auto' ? 'Recommend the best chart type based on the data' : chartType}
**Theme:** ${theme}
**Responsive:** ${responsive}
**Include Component Code:** ${includeCode}

Please:
1. Fetch real-time and historical data for the specified symbols
2. Process the data into Recharts-compatible format
3. ${chartType === 'auto' ? 'Recommend the optimal chart type and explain why' : `Generate a ${chartType} chart`}
4. ${includeCode ? 'Generate the complete React TypeScript component code' : 'Skip component code generation'}
5. Include all data sources used with timestamps`

      await writer?.write({ type: 'progress', data: { message: '🔄 Fetching financial data...' } })
      const result = await agent.generate(prompt)

      let parsedResult
      try {
        const jsonMatch = /```json\s*([\s\S]*?)\s*```/.exec(result.text)
        if (jsonMatch?.[1] !== undefined) {
          parsedResult = JSON.parse(jsonMatch[1])
        } else {
          parsedResult = JSON.parse(result.text)
        }
      } catch {
        parsedResult = {
          chartData: [],
          metadata: {
            symbols,
            timeRange,
            dataPoints: 0,
            lastUpdated: new Date().toISOString(),
          },
          rawResponse: result.text,
        }
      }

      span?.end({
        output: {
          success: true,
          symbols,
          chartType: parsedResult.chartRecommendation?.type ?? chartType,
          dataPoints: parsedResult.data?.metadata?.dataPoints ?? 0,
        },
      })

      await writer?.write({ type: 'progress', data: { message: '✅ Chart generation complete' } })

      return {
        success: true,
        data: parsedResult.data,
        component: parsedResult.component,
        chartRecommendation: parsedResult.chartRecommendation,
        sources: parsedResult.sources ?? [
          { provider: 'Chart Supervisor', timestamp: new Date().toISOString() },
        ],
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      log.error('Chart supervisor tool error:', { error: errorMsg, symbols })
      span?.end({ metadata: { success: false, error: errorMsg } })
      return {
        success: false,
        sources: [],
        error: `Failed to generate chart: ${errorMsg}`,
      }
    }
  },
})

/**
 * Chart Generator Tool
 * Generates Recharts React component code
 */
export const chartGeneratorTool = createTool({
  id: 'chart-generator',
  description:
    'Generates production-ready Recharts React component code for financial data visualization. Takes chart data and configuration, outputs TypeScript component.',
  inputSchema: z.object({
    chartType: z
      .enum(['LineChart', 'AreaChart', 'BarChart', 'ComposedChart', 'PieChart', 'ScatterChart', 'Treemap'])
      .describe('The Recharts chart type to generate'),
    data: z
      .array(z.record(z.string(), z.unknown()))
      .describe('The chart data array'),
    dataKeys: z
      .array(z.string())
      .describe('Data keys to visualize (e.g., ["price", "volume"])'),
    componentName: z
      .string()
      .optional()
      .describe("Name for the React component (defaults to 'FinancialChart')"),
    theme: z
      .enum(['light', 'dark', 'corporate'])
      .optional()
      .describe("Color theme (defaults to 'light')"),
    features: z
      .array(z.enum(['tooltip', 'legend', 'grid', 'brush', 'animation', 'responsive']))
      .optional()
      .describe("Features to include (defaults to ['tooltip', 'legend', 'grid', 'responsive'])"),
    xAxisKey: z
      .string()
      .optional()
      .describe("Data key for X axis (defaults to 'name')"),
    height: z
      .number()
      .optional()
      .describe('Chart height in pixels (defaults to 400)'),
  }),
  outputSchema: z.object({
    componentName: z.string(),
    code: z.string(),
    usage: z.string(),
    props: z.record(z.string(), z.unknown()),
    dependencies: z.array(z.string()),
  }),
  execute: async ({ context, mastra, writer, runtimeContext, tracingContext }) => {
    const {
      chartType,
      data,
      dataKeys,
      componentName = 'FinancialChart',
      theme = 'light',
      features = ['tooltip', 'legend', 'grid', 'responsive'],
      xAxisKey = 'name',
      height = 400,
    } = context

    await writer?.write({
      type: 'progress',
      data: { message: `⚛️ Generating ${chartType} component: ${componentName}` },
    })

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'chart-generator-tool',
      input: { chartType, componentName, dataKeysCount: dataKeys.length, theme },
      tracingPolicy: { internal: InternalSpans.TOOL },
    })

    try {
      const agent = mastra!.getAgent('chartGeneratorAgent')

      const prompt = `Generate a production-ready Recharts React component with these specifications:

**Component Name:** ${componentName}
**Chart Type:** ${chartType}
**Data Keys:** ${dataKeys.join(', ')}
**X-Axis Key:** ${xAxisKey}
**Theme:** ${theme}
**Height:** ${height}px
**Features:** ${features.join(', ')}
**Sample Data Structure:** ${JSON.stringify(data[0] ?? {}, null, 2)}

Requirements:
1. TypeScript with proper type definitions
2. Use ResponsiveContainer if 'responsive' feature is enabled
3. Apply ${theme} theme color palette
4. Include all specified features (${features.join(', ')})
5. Add proper prop interface and default values
6. Include usage example

Return JSON with: componentName, code, usage, props, dependencies`

      await writer?.write({ type: 'progress', data: { message: '🎨 Generating component code...' } })
      const result = await agent.generate(prompt)

      let parsedResult
      try {
        const jsonMatch = /```json\s*([\s\S]*?)\s*```/.exec(result.text)
        if (jsonMatch?.[1] !== undefined) {
          parsedResult = JSON.parse(jsonMatch[1])
        } else {
          parsedResult = JSON.parse(result.text)
        }
      } catch {
        const codeMatch = /```tsx?\s*([\s\S]*?)\s*```/.exec(result.text)
        parsedResult = {
          componentName,
          code: codeMatch?.[1] !== undefined ? codeMatch[1] : result.text,
          usage: `<${componentName} data={data} />`,
          props: { data: `${componentName}Data[]` },
          dependencies: ['recharts', 'react'],
        }
      }

      span?.end({
        output: {
          success: true,
          componentName: parsedResult.componentName,
          codeLength: parsedResult.code?.length ?? 0,
        },
      })

      await writer?.write({ type: 'progress', data: { message: '✅ Component generated' } })

      return {
        componentName: parsedResult.componentName ?? componentName,
        code: parsedResult.code ?? '',
        usage: parsedResult.usage ?? `<${componentName} data={data} />`,
        props: parsedResult.props ?? {},
        dependencies: parsedResult.dependencies ?? ['recharts', 'react'],
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      log.error('Chart generator tool error:', { error: errorMsg, chartType })
      span?.end({ metadata: { success: false, error: errorMsg } })
      throw new Error(`Failed to generate chart component: ${errorMsg}`)
    }
  },
})

/**
 * Chart Data Processor Tool
 * Transforms raw financial data into Recharts format
 */
export const chartDataProcessorTool = createTool({
  id: 'chart-data-processor',
  description:
    'Transforms raw financial API data (from Polygon, Finnhub, Alpha Vantage) into optimized Recharts-compatible data structures with proper formatting and calculations.',
  inputSchema: z.object({
    symbols: z
      .array(z.string())
      .min(1)
      .describe('Stock symbols to fetch and process'),
    timeRange: z
      .enum(['1D', '1W', '1M', '3M', '6M', '1Y'])
      .optional()
      .describe("Time range for data (defaults to '1M')"),
    metrics: z
      .array(z.enum(['price', 'volume', 'ohlc', 'rsi', 'macd', 'bollinger', 'sma', 'ema']))
      .optional()
      .describe("Metrics to include (defaults to ['price', 'volume'])"),
    aggregation: z
      .enum(['raw', 'daily', 'weekly', 'monthly'])
      .optional()
      .describe("Data aggregation level (defaults to 'daily')"),
    calculations: z
      .array(z.enum(['change', 'percentChange', 'movingAverage', 'volatility']))
      .optional()
      .describe('Additional calculations to perform'),
  }),
  outputSchema: z.object({
    chartData: z.array(z.record(z.string(), z.unknown())),
    dataKeys: z.array(z.string()),
    domain: z.object({
      x: z.array(z.unknown()),
      y: z.array(z.number()),
    }),
    metadata: z.object({
      symbols: z.array(z.string()),
      timeRange: z.string(),
      dataPoints: z.number(),
      lastUpdated: z.string(),
      interval: z.string(),
    }),
    calculations: z.record(z.string(), z.unknown()).optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context, mastra, writer, runtimeContext, tracingContext }) => {
    const {
      symbols,
      timeRange = '1M',
      metrics = ['price', 'volume'],
      aggregation = 'daily',
      calculations = [],
    } = context

    await writer?.write({
      type: 'progress',
      data: { message: `📈 Processing data for ${symbols.join(', ')}` },
    })

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'chart-data-processor-tool',
      input: { symbols, timeRange, metrics, aggregation },
      tracingPolicy: { internal: InternalSpans.TOOL },
    })

    try {
      const agent = mastra!.getAgent('chartDataProcessorAgent')

      const prompt = `Fetch and process financial data for Recharts visualization:

**Symbols:** ${symbols.join(', ')}
**Time Range:** ${timeRange}
**Metrics:** ${metrics.join(', ')}
**Aggregation:** ${aggregation}
**Calculations:** ${calculations.length > 0 ? calculations.join(', ') : 'None'}

Steps:
1. Use financial tools to fetch real-time and historical data for each symbol
2. Normalize data format across different API sources
3. Apply ${aggregation} aggregation
4. Calculate requested metrics: ${metrics.join(', ')}
5. ${calculations.length > 0 ? `Perform calculations: ${calculations.join(', ')}` : 'Skip additional calculations'}
6. Format as Recharts-compatible array with 'name' key for x-axis

Return JSON with:
- chartData: Array of { name: date, ...metrics }
- dataKeys: Array of metric keys
- domain: { x: [min, max], y: [min, max] }
- metadata: { symbols, timeRange, dataPoints, lastUpdated, interval }
- calculations: Object with any calculated values`

      await writer?.write({ type: 'progress', data: { message: '🔄 Fetching from financial APIs...' } })
      const result = await agent.generate(prompt)

      let parsedResult
      try {
        const jsonMatch = /```json\s*([\s\S]*?)\s*```/.exec(result.text)
        if (jsonMatch?.[1] !== undefined) {
          parsedResult = JSON.parse(jsonMatch[1])
        } else {
          parsedResult = JSON.parse(result.text)
        }
      } catch {
        parsedResult = {
          chartData: [],
          dataKeys: metrics,
          domain: { x: [], y: [0, 100] },
          metadata: {
            symbols,
            timeRange,
            dataPoints: 0,
            lastUpdated: new Date().toISOString(),
            interval: aggregation,
          },
          rawResponse: result.text,
        }
      }

      span?.end({
        output: {
          success: true,
          dataPoints: parsedResult.chartData?.length ?? 0,
          symbols,
        },
      })

      await writer?.write({
        type: 'progress',
        data: { message: `✅ Processed ${parsedResult.chartData?.length ?? 0} data points` },
      })

      return {
        chartData: parsedResult.chartData ?? [],
        dataKeys: parsedResult.dataKeys ?? metrics,
        domain: parsedResult.domain ?? { x: [], y: [0, 100] },
        metadata: parsedResult.metadata ?? {
          symbols,
          timeRange,
          dataPoints: 0,
          lastUpdated: new Date().toISOString(),
          interval: aggregation,
        },
        calculations: parsedResult.calculations,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      log.error('Chart data processor tool error:', { error: errorMsg, symbols })
      span?.end({ metadata: { success: false, error: errorMsg } })
      return {
        chartData: [],
        dataKeys: [],
        domain: { x: [], y: [0, 100] },
        metadata: {
          symbols,
          timeRange,
          dataPoints: 0,
          lastUpdated: new Date().toISOString(),
          interval: aggregation,
        },
        error: `Failed to process data: ${errorMsg}`,
      }
    }
  },
})

/**
 * Chart Type Advisor Tool
 * Recommends optimal chart types based on data
 */
export const chartTypeAdvisorTool = createTool({
  id: 'chart-type-advisor',
  description:
    'Recommends the optimal Recharts chart type based on financial data characteristics, visualization goals, and user requirements.',
  inputSchema: z.object({
    dataDescription: z
      .string()
      .describe('Description of the data to visualize'),
    visualizationGoal: z
      .enum(['trend', 'comparison', 'composition', 'distribution', 'relationship', 'realtime'])
      .describe('Primary goal of the visualization'),
    dataCharacteristics: z
      .object({
        isTimeSeries: z.boolean().optional(),
        seriesCount: z.number().optional(),
        dataPoints: z.number().optional(),
        hasNegativeValues: z.boolean().optional(),
        hasCategoricalData: z.boolean().optional(),
      })
      .optional()
      .describe('Characteristics of the data'),
    constraints: z
      .object({
        maxComplexity: z.enum(['simple', 'moderate', 'complex']).optional(),
        mobileOptimized: z.boolean().optional(),
        animationRequired: z.boolean().optional(),
      })
      .optional()
      .describe('Constraints for the visualization'),
  }),
  outputSchema: z.object({
    primaryRecommendation: z.object({
      chartType: z.string(),
      components: z.array(z.string()),
      reasoning: z.string(),
      confidence: z.number(),
    }),
    alternatives: z.array(z.object({
      chartType: z.string(),
      useCase: z.string(),
    })),
    configuration: z.object({
      responsive: z.boolean(),
      animations: z.boolean(),
      suggestedHeight: z.number(),
    }),
  }),
  execute: async ({ context, mastra, writer, runtimeContext, tracingContext }) => {
    const { dataDescription, visualizationGoal, dataCharacteristics, constraints } = context

    await writer?.write({
      type: 'progress',
      data: { message: `🎯 Analyzing visualization requirements...` },
    })

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'chart-type-advisor-tool',
      input: { visualizationGoal, dataCharacteristics },
      tracingPolicy: { internal: InternalSpans.TOOL },
    })

    try {
      const agent = mastra!.getAgent('chartTypeAdvisorAgent')

      const prompt = `Recommend the optimal Recharts chart type:

**Data Description:** ${dataDescription}
**Visualization Goal:** ${visualizationGoal}
**Data Characteristics:**
${JSON.stringify(dataCharacteristics ?? {}, null, 2)}
**Constraints:**
${JSON.stringify(constraints ?? {}, null, 2)}

Analyze and recommend:
1. Primary chart type with Recharts components needed
2. Reasoning for the recommendation
3. Alternative chart types for different use cases
4. Configuration suggestions

Return JSON with: primaryRecommendation, alternatives, configuration`

      const result = await agent.generate(prompt)

      let parsedResult
      try {
        const jsonMatch = /```json\s*([\s\S]*?)\s*```/.exec(result.text)
        if (jsonMatch?.[1] !== undefined) {
          parsedResult = JSON.parse(jsonMatch[1])
        } else {
          parsedResult = JSON.parse(result.text)
        }
      } catch {
        parsedResult = {
          primaryRecommendation: {
            chartType: 'LineChart',
            components: ['Line', 'XAxis', 'YAxis', 'Tooltip', 'CartesianGrid'],
            reasoning: 'Default recommendation for time series financial data',
            confidence: 0.7,
          },
          alternatives: [
            { chartType: 'AreaChart', useCase: 'When emphasizing volume or magnitude' },
            { chartType: 'ComposedChart', useCase: 'When combining multiple metrics' },
          ],
          configuration: {
            responsive: true,
            animations: true,
            suggestedHeight: 400,
          },
        }
      }

      span?.end({
        output: {
          success: true,
          recommendedType: parsedResult.primaryRecommendation?.chartType,
        },
      })

      await writer?.write({
        type: 'progress',
        data: { message: `✅ Recommended: ${parsedResult.primaryRecommendation?.chartType}` },
      })

      return {
        primaryRecommendation: parsedResult.primaryRecommendation ?? {
          chartType: 'LineChart',
          components: ['Line', 'XAxis', 'YAxis', 'Tooltip'],
          reasoning: 'Default for financial data',
          confidence: 0.5,
        },
        alternatives: parsedResult.alternatives ?? [],
        configuration: parsedResult.configuration ?? {
          responsive: true,
          animations: true,
          suggestedHeight: 400,
        },
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      log.error('Chart type advisor tool error:', { error: errorMsg })
      span?.end({ metadata: { success: false, error: errorMsg } })
      throw new Error(`Failed to recommend chart type: ${errorMsg}`)
    }
  },
})


export type ChartSupervisorUITool = InferUITool<typeof chartSupervisorTool>;
export type ChartGeneratorUITool = InferUITool<typeof chartGeneratorTool>;
export type ChartDataProcessorUITool = InferUITool<typeof chartDataProcessorTool>;

export type ChartTypeAdvisorUITool = InferUITool<typeof chartTypeAdvisorTool>;
