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
import { reportAgent } from '../agents/reportAgent'
import { researchAgent } from '../agents/researchAgent'
import { googleAI3 } from '../config/google'
import { log } from '../config/logger'
import { financialReportWorkflow } from '../workflows/financial-report-workflow'
import { learningExtractionWorkflow } from '../workflows/learning-extraction-workflow'
import { researchSynthesisWorkflow } from '../workflows/research-synthesis-workflow'
import { weatherWorkflow } from '../workflows/weather-workflow'
import { LibsqlMemory } from '../config/libsql'

log.info('Initializing Report Generation Network...')

/**
 * Checks whether the report-generation coordinator returned a concrete report
 * artifact, synthesis, or actionable report plan.
 */
const reportGenerationNetworkTaskCompleteScorer = createScorer({
  id: 'report-generation-network-task-complete',
  name: 'Report Generation Network Task Completeness',
  description:
    'Checks whether the network returned a structured report outcome with findings or next actions.',
  type: 'agent',
}).generateScore(async context => {
  const normalizedText = (
    getAssistantMessageFromRunOutput(context.run.output) ??
    String(context.run.output ?? '')
  ).trim()
  const hasReportLanguage =
    /report|summary|findings|sources|analysis|recommendation|executive/i.test(
      normalizedText
    )
  const paragraphCount = normalizedText
    .split(/\n\s*\n/)
    .filter(Boolean).length

  return normalizedText.length >= 80 && (hasReportLanguage || paragraphCount >= 2)
    ? 1
    : 0
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
      hasReportLanguage:
        /report|summary|findings|sources|analysis|recommendation|executive/i.test(
          responseText
        ),
      paragraphCount: responseText.split(/\n\s*\n/).filter(Boolean).length,
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
    if (analysis.responseLength >= 80) score += 0.25
    if (analysis.hasReportLanguage) score += 0.35
    if (analysis.paragraphCount >= 2) score += 0.15
    if (analysis.hasStructure) score += 0.1
    if (analysis.hasReasoning) score += 0.05
    if (analysis.toolCount > 0) score += 0.05

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) return 'No usable report-generation response was produced.'

    const parts: string[] = []
    if (analysis.hasReportLanguage) parts.push('it includes report or synthesis language')
    if (analysis.hasStructure) parts.push('it is structured and readable')

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This report response is strong because ${parts.join(', ')}.` : 'The response is present but still needs more report detail.'}`
  })

/**
 * Checks that the report-generation answer is synthesis-ready with findings,
 * evidence framing, and clear follow-up guidance.
 */
const reportGenerationNetworkSynthesisScorer = createScorer({
  id: 'report-generation-network-synthesis-readiness',
  name: 'Report Generation Network Synthesis Readiness',
  description:
    'Checks whether the report answer contains findings, supporting rationale, and next actions.',
  type: 'agent',
}).generateScore(async context => {
  const normalizedText = (
    getAssistantMessageFromRunOutput(context.run.output) ??
    String(context.run.output ?? '')
  ).trim()
  const categoryMatches = [
    /finding|insight|summary|executive/i.test(normalizedText),
    /source|evidence|data|based on/i.test(normalizedText),
    /next step|recommend|follow-up|decision/i.test(normalizedText),
  ].filter(Boolean).length

  return normalizedText.length >= 150 && categoryMatches >= 2 ? 1 : 0
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
      hasReportLanguage:
        /finding|insight|summary|executive/i.test(responseText),
      hasEvidence:
        /source|evidence|data|based on/i.test(responseText),
      hasNextAction:
        /next step|recommend|follow-up|decision/i.test(responseText),
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
    if (analysis.responseLength >= 150) score += 0.25
    if (analysis.hasReportLanguage) score += 0.25
    if (analysis.hasEvidence) score += 0.2
    if (analysis.hasNextAction) score += 0.15
    if (analysis.hasStructure) score += 0.05
    if (analysis.hasReasoning) score += 0.05
    if (analysis.toolCount > 0) score += 0.05

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) return 'No usable pipeline execution result was produced.'

    const parts: string[] = []
    if (analysis.hasReportLanguage) parts.push('it communicates report-ready output')
    if (analysis.hasEvidence) parts.push('it includes evidence or data grounding')
    if (analysis.hasNextAction) parts.push('it includes clear next actions')

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This execution response is strong because ${parts.join(', ')}.` : 'The response is present but still needs more execution detail.'}`
  })

export const reportGenerationNetwork = new Agent({
  id: 'report-generation-network',
  name: 'Report Generation Network',
  description:
    'A routing agent that coordinates research, data transformation, and report generation. Use for complex multi-step report workflows that require data gathering, processing, and formatted output.',
  instructions: `You are a Report Generation Coordinator. Your role is to orchestrate multi-step report generation workflows by coordinating specialized agents.

## Available Agents

### researchAgent
**Use for:** Gathering data from web, academic sources, financial APIs, news
**Capabilities:** Web scraping, scholarly research, financial data, news analysis
**Output:** Raw research findings, sources, key insights

### DataIngestionAgent
**Use for:** Reading and parsing data files (CSV, structured data)
**Capabilities:** CSV parsing, file reading, data validation
**Output:** Structured JSON data from files

### DataTransformationAgent
**Use for:** Converting and restructuring data between formats
**Capabilities:** CSV↔JSON↔XML, flattening, type conversion
**Output:** Transformed data in target format

### reportAgent
**Use for:** Generating formatted reports and summaries
**Capabilities:** Document generation, analysis summaries, markdown output
**Output:** Formatted reports, executive summaries

## Available Workflows

### weatherWorkflow
**Use for:** Weather-based reports and activity planning
**Input:** City name
**Output:** Weather forecast with activity suggestions

### financialReportWorkflow
**Use for:** Multi-source financial reports with parallel data fetching
**Input:** Stock symbols, report type (daily/weekly/quarterly)
**Output:** Comprehensive financial report with analysis

### researchSynthesisWorkflow
**Use for:** Multi-topic research synthesis using foreach iteration
**Input:** List of topics, synthesis type
**Output:** Synthesized research report across all topics

### learningExtractionWorkflow
**Use for:** Extract learnings with human-in-the-loop approval
**Input:** Content to analyze, extraction depth
**Output:** Validated learnings with report

## Report Generation Patterns

### Research Report
1. researchAgent → Gather data on topic
2. DataTransformationAgent → Normalize and structure findings
3. reportAgent → Generate formatted report

### Data Analysis Report
1. DataIngestionAgent → Import data file
2. DataTransformationAgent → Clean and transform
3. reportAgent → Generate analysis summary

### Weather Activity Report
1. weatherWorkflow → Get weather and activities
2. reportAgent → Format into shareable report

### Multi-Source Report
1. researchAgent → Web/academic research
2. DataIngestionAgent → Import local data
3. DataTransformationAgent → Merge and normalize
4. reportAgent → Comprehensive report

## Workflow Coordination

1. **Analyze Request**
   - Identify the type of report needed
   - Determine required data sources
   - Plan the agent sequence

2. **Execute Pipeline**
   - Start with data gathering (research or ingestion)
   - Apply transformations as needed
   - Generate final report

3. **Quality Check**
   - Verify all sources are included
   - Ensure data consistency
   - Validate report completeness

## Guidelines

- Always start by understanding the report requirements
- Chain agents in logical data flow order
- Preserve source attribution throughout the pipeline
- Use weatherWorkflow for weather-related reports
- Combine multiple data sources when comprehensive coverage is needed
- Explain each step in the workflow to the user

## Final Answer Contract

- Open with the report purpose and the top-line conclusion.
- Present key findings with source or data context where it matters.
- End with recommendations, next steps, or missing inputs that block a stronger report.
`,
  model: googleAI3,
  memory: LibsqlMemory,
  //    options: {
  //        tracingPolicy: { internal: InternalSpans.ALL },
  //   },
  agents: {
    dataIngestionAgent,
    dataTransformationAgent,
    researchAgent,
    reportAgent,
  },
  //  tools: { confirmationTool },
  workflows: {
    weatherWorkflow,
    financialReportWorkflow,
    researchSynthesisWorkflow,
    learningExtractionWorkflow,
  },
  outputProcessors: [
    new TokenLimiterProcessor(128000),
    //    new BatchPartsProcessor({
    //        batchSize: 20,
    //        maxWaitTime: 100,
    //         emitOnNonText: true,
    //     }),
  ],
  defaultOptions: {
    maxSteps: 20,
    delegation: {
      onDelegationStart: async context => {
        log.info('Report generation network delegating', {
          primitiveId: context.primitiveId,
          iteration: context.iteration,
        })

        await Promise.resolve()

        if (context.primitiveId === 'researchAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nCollect only report-relevant evidence, preserve source attribution, and prioritize facts that materially affect the requested report conclusion.`,
          }
        }

        if (context.primitiveId === 'dataIngestionAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nExtract the usable structure from the supplied data source, note missing fields, and make parsing assumptions explicit for downstream reporting.`,
          }
        }

        if (context.primitiveId === 'dataTransformationAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nNormalize the data into report-ready structure, highlight derived fields, and preserve source lineage wherever possible.`,
          }
        }

        if (context.primitiveId === 'reportAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nProduce a polished report with a brief executive summary, key findings, clear evidence attribution, and concrete next steps.`,
          }
        }

        return { proceed: true }
      },
      onDelegationComplete: async context => {
        log.info('Report generation delegation complete', {
          primitiveId: context.primitiveId,
          success: context.success,
          duration: context.duration,
        })

        if (context.error) {
          context.bail()
          await Promise.resolve()
          return {
            feedback: `Delegation to ${context.primitiveId} failed: ${String(context.error)}. Re-scope the report or fall back to a simpler synthesis path.`,
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
      scorers: [reportGenerationNetworkTaskCompleteScorer, reportGenerationNetworkSynthesisScorer],
      strategy: 'any',
      parallel: true,
      onComplete: async result => {
        log.info('Report generation completion check', {
          complete: result.complete,
          score: result.scorers[0]?.score,
        })
        await Promise.resolve()
      },
      suppressFeedback: false,
    },
  },
})

log.info('Report Generation Network initialized')
