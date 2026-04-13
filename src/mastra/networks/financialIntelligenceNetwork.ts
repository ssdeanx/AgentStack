import { Agent } from '@mastra/core/agent'
import { createScorer } from '@mastra/core/evals'
import {
  extractAgentResponseMessages,
  extractInputMessages,
  extractToolCalls,
  getAssistantMessageFromRunOutput,
  getCombinedSystemPrompt,
  getReasoningFromRunOutput,
  getSystemMessagesFromRunInput,
  getUserMessageFromRunInput,
} from '@mastra/evals/scorers/utils'
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
import { financialReportWorkflow } from '../workflows/financial-report-workflow'
import { stockAnalysisWorkflow } from '../workflows/stock-analysis-workflow'
import { LibsqlMemory } from '../config/libsql'

log.info('Initializing Financial Intelligence Network...')

/**
 * Checks that the financial-intelligence network returns actionable market
 * analysis, chart guidance, or reporting output.
 */
const financialIntelligenceNetworkTaskCompleteScorer = createScorer({
  id: 'financial-intelligence-network-task-complete',
  name: 'Financial Intelligence Network Task Completeness',
  description:
    'Checks whether the network returned a substantive financial analysis or report.',
  type: 'agent',
})
  .preprocess(({ run }) => {
    const userMessage = getUserMessageFromRunInput(run.input)
    const inputMessages = extractInputMessages(run.input)
    const systemMessages = getSystemMessagesFromRunInput(run.input)
    const systemPrompt = getCombinedSystemPrompt(run.input)
    const response = getAssistantMessageFromRunOutput(run.output)
    const responseMessages = extractAgentResponseMessages(run.output)
    const reasoning = getReasoningFromRunOutput(run.output)
    const { tools, toolCallInfos } = extractToolCalls(run.output)

    return {
      userMessage,
      inputMessages,
      systemMessages,
      systemPrompt,
      response,
      responseMessages,
      reasoning,
      tools,
      toolCallInfos,
    }
  })
  .analyze(({ results }) => {
    const { response, responseMessages, reasoning, tools, toolCallInfos } =
      results.preprocessStepResult
    const responseText = (response ?? responseMessages.join('\n')).trim()

    return {
      hasResponse: responseText.length > 0,
      responseLength: responseText.length,
      hasFinanceLanguage:
        /price|valuation|risk|chart|market|financial|report|trend|portfolio|disclaimer/i.test(
          responseText
        ),
      hasStructure: /^[-*]\s|^\d+\.\s|^#{1,6}\s/m.test(responseText),
      hasReasoning: Boolean(reasoning),
      toolCount: tools.length,
      toolCallCount: toolCallInfos.length,
    }
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) return 0

    let score = 0
    if (analysis.responseLength >= 80) score += 0.3
    if (analysis.hasFinanceLanguage) score += 0.4
    if (analysis.hasStructure) score += 0.15
    if (analysis.hasReasoning) score += 0.05
    if (analysis.toolCount > 0) score += 0.05

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) return 'No usable financial intelligence response was produced.'

    const parts: string[] = []
    if (analysis.hasFinanceLanguage) parts.push('it includes financial analysis language')
    if (analysis.hasStructure) parts.push('it is structured for review')

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This financial response is strong because ${parts.join(', ')}.` : 'The response is present but still needs more financial detail.'}`
  })

/**
 * Checks that the financial-intelligence answer is investor-ready with thesis,
 * risk framing, and a clear next action or caveat.
 */
const financialIntelligenceNetworkDecisionScorer = createScorer({
  id: 'financial-intelligence-network-decision-readiness',
  name: 'Financial Intelligence Network Decision Readiness',
  description:
    'Checks whether the financial response includes thesis, risks, and decision-ready follow-up guidance.',
  type: 'agent',
}).generateScore(async context => {
  const normalizedText = (
    getAssistantMessageFromRunOutput(context.run.output) ??
    String(context.run.output ?? '')
  ).trim()
  const categoryMatches = [
    /thesis|outlook|valuation|trend|support|resistance/i.test(normalizedText),
    /risk|downside|volatility|uncertain|disclaimer/i.test(normalizedText),
    /next step|watch|monitor|consider|review/i.test(normalizedText),
  ].filter(Boolean).length

  return normalizedText.length >= 160 && categoryMatches >= 2 ? 1 : 0
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
