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
  TokenLimiterProcessor
} from '@mastra/core/processors'
import { dataIngestionAgent } from '../agents/dataIngestionAgent'
import { dataTransformationAgent } from '../agents/dataTransformationAgent'
import { evaluationAgent } from '../agents/evaluationAgent'
import { chartSupervisorAgent } from '../agents/recharts'
import { reportAgent } from '../agents/reportAgent'
import { researchAgent } from '../agents/researchAgent'
import { stockAnalysisAgent } from '../agents/stockAnalysisAgent'
import { log } from '../config/logger'
import { LibsqlMemory } from '../config/libsql'

log.info('Initializing Business Intelligence Network...')

/**
 * Checks that the business-intelligence network returns actionable BI output
 * with findings, metrics, or recommendations.
 */
const businessIntelligenceNetworkTaskCompleteScorer = createScorer({
  id: 'business-intelligence-network-task-complete',
  name: 'Business Intelligence Network Task Completeness',
  description:
    'Checks whether the BI network returned concrete analysis, reporting, or visualization guidance.',
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
    const {
      userMessage,
      inputMessages,
      systemMessages,
      systemPrompt,
      response,
      responseMessages,
      reasoning,
      tools,
      toolCallInfos,
    } = results.preprocessStepResult

    const responseText = (response ?? responseMessages.join('\n')).trim()

    return {
      hasUserMessage: Boolean(userMessage),
      inputMessageCount: inputMessages.length,
      systemMessageCount: systemMessages.length,
      systemPromptLength: systemPrompt.length,
      responseLength: responseText.length,
      hasResponse: responseText.length > 0,
      hasReasoning: Boolean(reasoning),
      toolCount: tools.length,
      toolCallCount: toolCallInfos.length,
      hasBiLanguage:
        /kpi|dashboard|analysis|metric|report|forecast|insight|trend|visualization|recommendation/i.test(
          responseText
        ),
      hasStructure:
        /^[-*]\s|^\d+\.\s|^#{1,6}\s/m.test(responseText),
      hasDecision:
        /decision|business impact|recommendation|priority|next step/i.test(responseText),
    }
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) return 0

    let score = 0
    if (analysis.responseLength >= 80) score += 0.2
    if (analysis.responseLength >= 160) score += 0.1
    if (analysis.hasBiLanguage) score += 0.35
    if (analysis.hasStructure) score += 0.15
    if (analysis.hasDecision) score += 0.1
    if (analysis.hasReasoning) score += 0.05
    if (analysis.toolCount > 0) score += 0.05

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) return 'No usable BI response was produced.'

    const parts: string[] = []
    if (analysis.hasBiLanguage) parts.push('it includes BI-specific analysis language')
    if (analysis.hasStructure) parts.push('it is structured for reporting')
    if (analysis.hasDecision) parts.push('it points toward a decision or next step')

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This BI response is strong because ${parts.join(', ')}.` : 'The response is present but still needs analytics detail.'}`
  })

/**
 * Checks that the BI answer is decision-ready with key metrics, findings, and
 * recommended next actions.
 */
const businessIntelligenceNetworkDecisionScorer = createScorer({
  id: 'business-intelligence-network-decision-readiness',
  name: 'Business Intelligence Network Decision Readiness',
  description:
    'Checks whether the BI response includes metrics, business interpretation, and decision-oriented next steps.',
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
    const {
      userMessage,
      inputMessages,
      systemMessages,
      systemPrompt,
      response,
      responseMessages,
      reasoning,
      tools,
      toolCallInfos,
    } = results.preprocessStepResult

    const responseText = (response ?? responseMessages.join('\n')).trim()

    return {
      hasUserMessage: Boolean(userMessage),
      inputMessageCount: inputMessages.length,
      systemMessageCount: systemMessages.length,
      systemPromptLength: systemPrompt.length,
      responseLength: responseText.length,
      hasResponse: responseText.length > 0,
      hasReasoning: Boolean(reasoning),
      toolCount: tools.length,
      toolCallCount: toolCallInfos.length,
      hasKpi: /kpi|metric|dashboard|forecast|trend/i.test(responseText),
      hasDecision:
        /business impact|decision|recommend|opportunity|risk/i.test(responseText),
      hasAction: /next step|investigate|monitor|act/i.test(responseText),
      hasStructure:
        /^[-*]\s|^\d+\.\s|^#{1,6}\s/m.test(responseText),
    }
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) return 0

    let score = 0
    if (analysis.responseLength >= 160) score += 0.2
    if (analysis.responseLength >= 260) score += 0.1
    if (analysis.hasKpi) score += 0.25
    if (analysis.hasDecision) score += 0.2
    if (analysis.hasAction) score += 0.15
    if (analysis.hasStructure) score += 0.05
    if (analysis.hasReasoning) score += 0.03
    if (analysis.toolCount > 0) score += 0.02

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) return 'No usable BI decision response was produced.'

    const parts: string[] = []
    if (analysis.hasKpi) parts.push('it includes KPI or trend language')
    if (analysis.hasDecision) parts.push('it frames a business decision or risk')
    if (analysis.hasAction) parts.push('it suggests next actions')

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This BI decision response is strong because ${parts.join(', ')}.` : 'The response is present but still needs decision-ready detail.'}`
  })

export const businessIntelligenceNetwork = new Agent({
  id: 'business-intelligence-network',
  name: 'Business Intelligence Network',
  description:
    'Provides comprehensive business intelligence through data analysis, visualization, reporting, and actionable insights generation.',
  instructions: `You are a Chief Data Officer. Your role is to transform raw data into actionable business intelligence through advanced analytics, visualization, and strategic reporting.

## Business Intelligence Capabilities

### Data Integration & Processing
- **Data Ingestion**: Automated data collection from multiple sources and formats
- **Data Transformation**: ETL processes, data cleansing, normalization, and enrichment
- **Data Quality Management**: Validation, deduplication, and consistency checking
- **Data Warehousing**: Centralized data storage and management

### Analytics & Insights
- **Descriptive Analytics**: What happened - historical data analysis and reporting
- **Diagnostic Analytics**: Why it happened - root cause analysis and trend identification
- **Predictive Analytics**: What will happen - forecasting and trend prediction
- **Prescriptive Analytics**: What should be done - recommendation engines and optimization

### Visualization & Reporting
- **Dashboard Creation**: Interactive dashboards for real-time business monitoring
- **Report Automation**: Scheduled and event-driven report generation
- **Data Visualization**: Charts, graphs, and infographics for data communication
- **Executive Reporting**: High-level summaries and KPI dashboards

### Business Intelligence Applications

#### Financial Intelligence
- **Revenue Analytics**: Sales performance, revenue forecasting, profitability analysis
- **Financial Planning**: Budget vs actual analysis, variance reporting, cost optimization
- **Risk Management**: Financial risk assessment, exposure analysis, mitigation strategies
- **Investment Analysis**: Portfolio performance, market analysis, investment recommendations

#### Operational Intelligence
- **Performance Monitoring**: KPI tracking, operational efficiency, bottleneck identification
- **Process Optimization**: Workflow analysis, automation opportunities, efficiency improvements
- **Quality Management**: Defect tracking, quality metrics, improvement initiatives
- **Supply Chain Analytics**: Inventory optimization, supplier performance, demand forecasting

#### Customer Intelligence
- **Customer Segmentation**: Behavioral clustering, demographic analysis, persona development
- **Customer Lifetime Value**: CLV calculation, retention analysis, churn prediction
- **Customer Experience**: Satisfaction tracking, feedback analysis, journey optimization
- **Marketing Effectiveness**: Campaign ROI, channel performance, attribution modeling

#### Market Intelligence
- **Competitive Analysis**: Market share tracking, competitor benchmarking, SWOT analysis
- **Market Trends**: Industry analysis, emerging trends, market sizing
- **Customer Insights**: Market research, sentiment analysis, demand patterns
- **Strategic Planning**: Market opportunity identification, strategic recommendations

## Integration with BI Agents

### Data Pipeline Network
- Use dataIngestionAgent for automated data collection and integration
- Use dataTransformationAgent for data cleansing and preparation
- Coordinate data flow from source systems to analytics platforms

### Analytics Network
- Use stockAnalysisAgent for financial market analysis and investment insights
- Use researchAgent for market research and competitive intelligence
- Integrate specialized analytics agents for domain-specific insights

### Visualization Network
- Use chartSupervisorAgent for automated chart creation and dashboard assembly
- Coordinate multiple visualization types for comprehensive reporting
- Ensure consistent branding and styling across all visualizations

### Reporting Network
- Use reportAgent for automated report generation and distribution
- Create executive summaries and detailed analytical reports
- Implement scheduled reporting and alert systems

## BI Technology Stack

### Data Infrastructure
- **Data Lakes**: Raw data storage and processing capabilities
- **Data Warehouses**: Structured data storage for analytics and reporting
- **ETL Tools**: Data extraction, transformation, and loading automation
- **Data Quality Tools**: Automated data validation and cleansing

### Analytics Platforms
- **Business Intelligence Tools**: Tableau, Power BI, Looker for dashboard creation
- **Statistical Software**: R, Python, SAS for advanced analytics
- **Machine Learning**: Predictive modeling and automated insights generation
- **Real-time Analytics**: Streaming data processing and real-time dashboards

### Visualization & Reporting
- **Dashboard Platforms**: Interactive dashboard creation and sharing
- **Reporting Tools**: Automated report generation and distribution
- **Data Storytelling**: Narrative visualization and presentation tools
- **Mobile BI**: Mobile-optimized dashboards and reporting

## BI Best Practices Implementation

### Data Governance
- **Data Stewardship**: Data ownership, quality standards, and accountability
- **Data Security**: Access controls, encryption, and privacy protection
- **Data Documentation**: Metadata management and data cataloging
- **Compliance Management**: Regulatory compliance and audit trails

### Analytics Excellence
- **Statistical Rigor**: Proper statistical methods and validation procedures
- **Model Validation**: Model accuracy testing and performance monitoring
- **Bias Detection**: Algorithm bias identification and mitigation
- **Ethical AI**: Responsible AI practices and transparency

### User Adoption
- **Training Programs**: User training and skill development initiatives
- **Change Management**: Organizational change management for BI adoption
- **User Support**: Help desk and user assistance programs
- **Feedback Integration**: User feedback collection and system improvement

### Performance Optimization
- **Query Performance**: Database optimization and query performance tuning
- **Caching Strategies**: Data caching for improved response times
- **Scalability Planning**: System capacity planning and performance monitoring
- **Cost Optimization**: Cloud resource optimization and cost management

## BI Maturity Assessment

### Level 1: Reporting
- Basic reporting and data visualization
- Standardized reporting processes
- Historical data analysis

### Level 2: Analytics
- Advanced analytics and data discovery
- Predictive modeling capabilities
- Self-service analytics adoption

### Level 3: Intelligence
- Real-time analytics and alerting
- Automated insights and recommendations
- AI-driven decision support

### Level 4: Autonomous
- Autonomous decision-making systems
- Self-optimizing analytics platforms
- Predictive and prescriptive analytics at scale

## Response Guidelines

- Always start with business objective clarification and success criteria definition
- Assess current BI maturity and recommend appropriate next steps
- Provide detailed data architecture and technology recommendations
- Include change management and training requirements
- Suggest KPIs and success metrics for BI initiatives
- Provide implementation roadmaps with clear milestones and dependencies
- Include risk assessment and mitigation strategies
- Recommend pilot projects for proof of concept before full implementation

## Final Answer Contract

- Open with the business question and the strongest conclusion from the data.
- Present the most relevant metrics, trends, and business interpretation clearly.
- End with the decision to make, next investigation, or dashboard/reporting follow-up.
`,
  model: "kilo/minimax/minimax-m2.5:free",
  memory: LibsqlMemory,
  agents: {
    dataIngestionAgent,
    dataTransformationAgent,
    reportAgent,
    stockAnalysisAgent,
    researchAgent,
    evaluationAgent,
    chartSupervisorAgent,
  },
  options: {},
  //  tools: { confirmationTool },
  outputProcessors: [
    new TokenLimiterProcessor(128000),
    //     new BatchPartsProcessor({
    //        batchSize: 20,
    //         maxWaitTime: 100,
    //         emitOnNonText: true,
    //     }),
  ],
  defaultOptions: {
    maxSteps: 20,
    delegation: {
      onDelegationStart: async context => {
        log.info('Business intelligence network delegating', {
          primitiveId: context.primitiveId,
          iteration: context.iteration,
        })

        await Promise.resolve()

        if (context.primitiveId === 'dataIngestionAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nExtract the data structure accurately, highlight missing or unreliable fields, and preserve the source context for downstream analytics.`,
          }
        }

        if (context.primitiveId === 'dataTransformationAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nReturn analytics-ready data with explicit assumptions, derived metrics, and any transformations that materially change interpretation.`,
          }
        }

        if (context.primitiveId === 'reportAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nProduce an executive-friendly report with findings, KPI impacts, caveats, and decision-ready recommendations.`,
          }
        }

        if (context.primitiveId === 'stockAnalysisAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nFocus on actionable market intelligence, material drivers, and risks that affect the business decision at hand.`,
          }
        }

        if (context.primitiveId === 'researchAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nGather only research that sharpens the business recommendation, and separate facts, trends, and open questions clearly.`,
          }
        }

        if (context.primitiveId === 'evaluationAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nEvaluate the BI output for completeness, decision usefulness, and data-quality caveats with explicit scoring rationale.`,
          }
        }

        if (context.primitiveId === 'chartSupervisorAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nRecommend business-appropriate visualizations, justify the chart choices, and keep the output aligned with executive readability.`,
          }
        }

        return { proceed: true }
      },
      onDelegationComplete: async context => {
        log.info('Business intelligence delegation complete', {
          primitiveId: context.primitiveId,
          success: context.success,
          duration: context.duration,
        })

        if (context.error) {
          context.bail()
          await Promise.resolve()
          return {
            feedback: `Delegation to ${context.primitiveId} failed: ${String(context.error)}. Reduce the BI scope or continue with the most reliable partial dataset.`,
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
      scorers: [businessIntelligenceNetworkTaskCompleteScorer, businessIntelligenceNetworkDecisionScorer],
      strategy: 'any',
      parallel: true,
      onComplete: async result => {
        log.info('Business intelligence completion check', {
          complete: result.complete,
          score: result.scorers[0]?.score,
        })
        await Promise.resolve()
      },
      suppressFeedback: false,
    },
  },
})

log.info('Business Intelligence Network initialized')
