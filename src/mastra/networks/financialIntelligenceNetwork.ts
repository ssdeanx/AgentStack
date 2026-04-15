import { Agent } from '@mastra/core/agent'
import {
  chartDataProcessorAgent,
  chartGeneratorAgent,
  chartSupervisorAgent,
  chartTypeAdvisorAgent,
} from '../agents/recharts'
import { reportAgent } from '../agents/reportAgent'
import { researchAgent } from '../agents/researchAgent'
import { stockAnalysisAgent } from '../agents/stockAnalysisAgent'
import { googleAI3 } from '../config/google'
import { log } from '../config/logger'
import { createSupervisorPatternScorer } from '../scorers/supervisor-scorers'
import { financialReportWorkflow } from '../workflows/financial-report-workflow'
import { stockAnalysisWorkflow } from '../workflows/stock-analysis-workflow'
import { LibsqlMemory } from '../config/libsql'

log.info('Initializing Financial Intelligence Network...')

/**
 * Checks that the financial-intelligence network returns actionable market
 * analysis, chart guidance, or reporting output.
 */
const financialIntelligenceNetworkTaskCompleteScorer =
  createSupervisorPatternScorer({
    id: 'financial-intelligence-network-task-complete',
    name: 'Financial Intelligence Network Task Completeness',
    description:
      'Checks whether the network returned a substantive financial analysis or report.',
    label: 'Financial intelligence response',
    emptyReason: 'No usable financial intelligence response was produced.',
    weakReason:
      'The response is present but still needs more financial detail.',
    strongReasonPrefix: 'This financial response is strong because',
    signals: [
      {
        label: 'it includes financial analysis language',
        regex:
          /price|valuation|risk|chart|market|financial|report|trend|portfolio|disclaimer/i,
        weight: 0.4,
      },
    ],
    responseLengthThresholds: [{ min: 80, weight: 0.3 }],
    minParagraphsForStructure: 999,
    structureWeight: 0.15,
    reasoningWeight: 0.05,
    toolWeight: 0.05,
  })

/**
 * Checks that the financial-intelligence answer is investor-ready with thesis,
 * risk framing, and a clear next action or caveat.
 */
const financialIntelligenceNetworkDecisionScorer =
  createSupervisorPatternScorer({
    id: 'financial-intelligence-network-decision-readiness',
    name: 'Financial Intelligence Network Decision Readiness',
    description:
      'Checks whether the financial response includes thesis, risks, and decision-ready follow-up guidance.',
    label: 'Financial decision response',
    emptyReason: 'No investor-ready financial response was produced.',
    weakReason:
      'The response is present but still needs clearer thesis, risk framing, or follow-up guidance.',
    strongReasonPrefix: 'This financial decision response is strong because',
    signals: [
      {
        label: 'it includes an investment thesis or outlook',
        regex: /thesis|outlook|valuation|trend|support|resistance/i,
        weight: 0.25,
      },
      {
        label: 'it frames risks or uncertainty',
        regex: /risk|downside|volatility|uncertain|disclaimer/i,
        weight: 0.25,
      },
      {
        label: 'it includes a clear follow-up action',
        regex: /next step|watch|monitor|consider|review/i,
        weight: 0.25,
      },
    ],
    responseLengthThresholds: [{ min: 160, weight: 0.2 }],
  })

export const financialIntelligenceNetwork = new Agent({
  id: 'financial-intelligence-network',
  name: 'Financial Intelligence Network',
  description:
    'A routing agent that coordinates financial analysis agents for market intelligence and reporting. Routes requests to stock analysis, research, charting, and reporting agents.',
  instructions: `You are a Financial Intelligence Coordinator. Your role is to orchestrate financial analysis and market intelligence workflows by coordinating specialized financial agents.

## Available Agents

### stockAnalysisAgent
**Use for:** Stock analysis, market trends, investment recommendations
**Capabilities:** Technical analysis, fundamental analysis, risk assessment
**Output:** Comprehensive stock analysis reports with recommendations

### researchAgent
**Use for:** Market research, news analysis, economic data gathering
**Capabilities:** Web scraping, financial news, economic indicators
**Output:** Research findings and market intelligence

### chartSupervisorAgent
**Use for:** Chart creation orchestration, visualization strategy
**Capabilities:** Chart type selection, data visualization planning
**Output:** Coordinated chart generation workflows

### chartDataProcessorAgent
**Use for:** Financial data processing for charts, data transformation
**Capabilities:** Time series processing, indicator calculations
**Output:** Chart-ready financial data

### chartGeneratorAgent
**Use for:** Chart creation, visualization generation
**Capabilities:** Technical chart creation, interactive visualizations
**Output:** Charts and financial visualizations

### chartTypeAdvisorAgent
**Use for:** Chart type recommendations, visualization best practices
**Capabilities:** Data type analysis, visualization optimization
**Output:** Chart type recommendations and visualization strategies

### reportAgent
**Use for:** Financial report generation, summary creation
**Capabilities:** Report formatting, executive summaries, data synthesis
**Output:** Professional financial reports and summaries

## Available Workflows

### financialReportWorkflow
**Use for:** Multi-source financial reports with parallel data fetching
**Input:** Stock symbols, report type, timeframe
**Output:** Comprehensive financial analysis reports

### stockAnalysisWorkflow
**Use for:** Sequential stock analysis with data enrichment
**Input:** Stock symbol, analysis depth
**Output:** Detailed stock analysis with recommendations

## Financial Analysis Patterns

### Investment Research
1. researchAgent → Gather market news and economic data
2. stockAnalysisAgent → Analyze specific securities
3. chartDataProcessorAgent → Prepare data for visualization
4. chartGeneratorAgent → Create analysis charts
5. reportAgent → Generate investment report

### Market Intelligence Report
1. researchAgent → Collect market data and news
2. stockAnalysisAgent → Sector/company analysis
3. financialReportWorkflow → Multi-source report generation
4. chartSupervisorAgent → Coordinate visualizations

### Portfolio Analysis
1. stockAnalysisAgent → Individual stock analysis
2. chartDataProcessorAgent → Portfolio data aggregation
3. chartGeneratorAgent → Portfolio performance charts
4. reportAgent → Portfolio summary report

### Technical Analysis
1. chartDataProcessorAgent → Process price/volume data
2. chartTypeAdvisorAgent → Recommend chart types
3. chartGeneratorAgent → Generate technical charts
4. stockAnalysisAgent → Technical analysis interpretation

## Routing Decision Process

1. **Analyze Request Type**
   - Stock analysis → stockAnalysisAgent
   - Market research → researchAgent
   - Chart creation → chartSupervisorAgent/chartGeneratorAgent
   - Report generation → reportAgent
   - Data processing → chartDataProcessorAgent

2. **Consider Scope**
   - Single stock → stockAnalysisAgent + charts
   - Market research → researchAgent + analysis
   - Comprehensive reports → financialReportWorkflow
   - Visualization → chartSupervisorAgent coordination

3. **Data Sources**
   - Real-time quotes → Polygon/Finnhub APIs
   - Historical data → Chart data processing
   - News/analysis → Research agent web scraping
   - Custom data → Data processing agents

## Guidelines

- Always include data source attribution and timestamps
- Use appropriate chart types for different data types
- Include risk disclaimers for investment recommendations
- Provide both technical and fundamental analysis when possible
- Generate professional reports with executive summaries
- Include forward-looking disclaimers for market predictions

## Final Answer Contract

- Lead with the market view, thesis, or recommendation.
- Present the supporting data, chart logic, and major risks clearly.
- End with watch items, next review points, or explicit uncertainty/disclaimer language.
`,
  model: googleAI3,
  memory: LibsqlMemory,
  agents: {
    stockAnalysisAgent,
    researchAgent,
    chartSupervisorAgent,
    chartDataProcessorAgent,
    chartGeneratorAgent,
    chartTypeAdvisorAgent,
    reportAgent,
  },
  workflows: {
    financialReportWorkflow,
    stockAnalysisWorkflow,
  },
  tools: {},
  options: {},
  outputProcessors: [
//    new TokenLimiterProcessor(128000),
    //   new BatchPartsProcessor({
    //       batchSize: 20,
    //       maxWaitTime: 100,
    //      emitOnNonText: true,
    //    }),
  ],
  defaultOptions: {
    maxSteps: 20,
    delegation: {
      onDelegationStart: async context => {
        log.info('Financial intelligence network delegating', {
          primitiveId: context.primitiveId,
          iteration: context.iteration,
        })

        await Promise.resolve()

        if (context.primitiveId === 'stockAnalysisAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nReturn a market-aware analysis with thesis, time horizon, key drivers, major risks, and any data freshness caveats.`,
          }
        }

        if (context.primitiveId === 'researchAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nGather only the research that materially changes the financial view, and include source context for market-moving claims.`,
          }
        }

        if (context.primitiveId === 'chartSupervisorAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nCoordinate the visualization plan with chart purpose, audience, and the financial questions each chart should answer.`,
          }
        }

        if (context.primitiveId === 'chartDataProcessorAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nPrepare finance-ready chart data, note indicator assumptions, and preserve temporal integrity and units.`,
          }
        }

        if (context.primitiveId === 'chartGeneratorAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nGenerate clear, analysis-driven visual outputs with labels, timeframes, and presentation choices suited to financial review.`,
          }
        }

        if (context.primitiveId === 'chartTypeAdvisorAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nRecommend the chart type that best supports the decision, and explain trade-offs between readability and analytical precision.`,
          }
        }

        if (context.primitiveId === 'reportAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nProduce a professional financial report with executive summary, evidence-backed findings, risk notes, and clear disclaimers.`,
          }
        }

        return { proceed: true }
      },
      onDelegationComplete: async context => {
        log.info('Financial intelligence delegation complete', {
          primitiveId: context.primitiveId,
          success: context.success,
          duration: context.duration,
        })

        if (context.error) {
          context.bail()
          await Promise.resolve()
          return {
            feedback: `Delegation to ${context.primitiveId} failed: ${String(context.error)}. Continue with the validated market data and clearly state what is missing.`,
          }
        }

        await Promise.resolve()
      },
      messageFilter: ({ messages }) => {
        return messages
          .filter(
            message =>
              !message.content.parts.some(part => part.type === 'tool-invocation')
          )
          .slice(-6)
      },
    },
    isTaskComplete: {
      scorers: [financialIntelligenceNetworkTaskCompleteScorer, financialIntelligenceNetworkDecisionScorer],
      strategy: 'any',
      parallel: true,
      onComplete: async result => {
        log.info('Financial intelligence completion check', {
          complete: result.complete,
          score: result.scorers[0]?.score,
        })
        await Promise.resolve()
      },
      suppressFeedback: false,
    },
  },
})

log.info('Financial Intelligence Network initialized')
