import { Agent } from '@mastra/core/agent'

import { dataExportAgent } from '../agents/dataExportAgent'
import { dataIngestionAgent } from '../agents/dataIngestionAgent'
import { dataTransformationAgent } from '../agents/dataTransformationAgent'
import { reportAgent } from '../agents/reportAgent'
import { log } from '../config/logger'
import { createSupervisorPatternScorer } from '../scorers/supervisor-scorers'
import { confirmationTool } from '../tools/confirmation.tool'
import { stockAnalysisWorkflow } from '../workflows/stock-analysis-workflow'
import { LibsqlMemory } from '../config/libsql'

log.info('Initializing Data Pipeline Network...')

/**
 * Validates that the data pipeline network returns a concrete pipeline outcome
 * instead of only describing a potential handoff.
 */
const dataPipelineNetworkTaskCompleteScorer = createSupervisorPatternScorer({
  id: 'data-pipeline-network-task-complete',
  name: 'Data Pipeline Network Task Completeness',
  description:
    'Checks whether the network returned a concrete import, transform, export, or reporting outcome.',
  label: 'Data pipeline response',
  emptyReason: 'No usable data pipeline response was produced.',
  weakReason: 'The response is present but still needs more report detail.',
  strongReasonPrefix: 'This pipeline response is strong because',
  signals: [
    {
      label: 'it includes pipeline or transformation language',
      regex: /csv|json|xml|transform|schema|columns|rows|report|summary|file/i,
      weight: 0.4,
    },
  ],
  responseLengthThresholds: [{ min: 60, weight: 0.25 }],
  minParagraphsForStructure: 999,
  structureWeight: 0.15,
  reasoningWeight: 0.05,
  toolWeight: 0.05,
})

/**
 * Checks that the data pipeline answer is execution-ready with explicit output,
 * validation, or next-step guidance.
 */
const dataPipelineNetworkExecutionScorer =
  createSupervisorPatternScorer({
    id: 'data-pipeline-network-execution-readiness',
    name: 'Data Pipeline Network Execution Readiness',
    description:
      'Checks whether the data-pipeline response tells the user what was produced, what changed, and what to do next.',
    label: 'Data pipeline execution response',
    emptyReason: 'No usable pipeline execution result was produced.',
    weakReason: 'The response is present but still needs more execution detail.',
    strongReasonPrefix: 'This execution response is strong because',
    signals: [
      {
        label: 'it includes pipeline or transformation language',
        regex: /output|result|generated|exported|transformed/i,
        weight: 0.35,
      },
      {
        label: 'it covers validation detail',
        regex: /validation|mismatch|missing|error|warning/i,
        weight: 0.1,
      },
      {
        label: 'it covers follow-up actions',
        regex: /next step|download|import|review|fix/i,
        weight: 0.1,
      },
    ],
    responseLengthThresholds: [{ min: 120, weight: 0.25 }],
    reasoningWeight: 0.05,
    toolWeight: 0.05,
  })

export const dataPipelineNetwork = new Agent({
  id: 'data-pipeline-network',
  name: 'Data Pipeline Network',
  description:
    'A routing agent that coordinates data processing agents for CSV/JSON operations. Routes requests to DataExportAgent, DataIngestionAgent, DataTransformationAgent, or reportAgent based on the task.',
  instructions: `You are a Data Pipeline Routing Agent. Your role is to analyze user requests and delegate to the appropriate specialist agent.

## Available Agents

### DataExportAgent
**Use for:** Creating CSV files, exporting data, converting JSON to CSV, saving structured data
**Triggers:** "export", "create csv", "save as csv", "convert to csv", "download data"

### DataIngestionAgent
**Use for:** Reading CSV files, parsing CSV data, importing data, validating CSV structure
**Triggers:** "import", "read csv", "parse csv", "load data", "open file"

### DataTransformationAgent
**Use for:** Converting between formats (CSV/JSON/XML), complex transformations, restructuring data
**Triggers:** "convert", "transform", "change format", "restructure", "flatten", "xml"

### reportAgent
**Use for:** Generating reports, summarizing data, creating documentation, analysis summaries
**Triggers:** "report", "summary", "analyze", "document", "overview"

## Routing Logic

1. **Analyze Intent**
   - Parse the user's request to identify the primary action
   - Look for trigger keywords and context clues

2. **Select Agent**
   - Match intent to the most appropriate agent
   - Consider the data flow (input → processing → output)

3. **Delegate**
   - Pass the request to the selected agent
   - Include any relevant context from the original request

4. **Synthesize Response**
   - Combine agent output with routing context
   - Explain which agent handled the request

## Multi-Agent Workflows

For complex requests requiring multiple agents:

1. **Import then Transform:** DataIngestionAgent → DataTransformationAgent
2. **Transform then Export:** DataTransformationAgent → DataExportAgent
3. **Full Pipeline:** DataIngestionAgent → DataTransformationAgent → DataExportAgent
4. **Analysis Pipeline:** DataIngestionAgent → reportAgent
5. **Stock Analysis:** Use stockAnalysisWorkflow for financial data processing

## Available Workflows

### stockAnalysisWorkflow
**Use for:** Sequential stock analysis with data enrichment
**Input:** Stock symbol, analysis depth (quick/standard/deep)
**Output:** Comprehensive stock analysis report with recommendation

## Guidelines

- Always explain which agent you're delegating to and why
- For ambiguous requests, ask for clarification
- Chain agents when the task requires multiple steps
- Preserve context when passing between agents

## Final Answer Contract

- State the input, transformation, and output path clearly.
- Call out validation issues, dropped fields, or lossy conversions explicitly.
- End with the next pipeline step, delivery artifact, or review action.
`,
  model: "google/gemini-3.1-flash-lite-preview",
  memory: LibsqlMemory,
  options: {},
  agents: {
    dataExportAgent,
    dataIngestionAgent,
    dataTransformationAgent,
    reportAgent,
  },
  tools: { confirmationTool },
  workflows: {
    stockAnalysisWorkflow,
  },
  outputProcessors: [
//    new TokenLimiterProcessor(128000),
    //  new BatchPartsProcessor({
    //      batchSize: 20,
    //      maxWaitTime: 100,
    //      emitOnNonText: true,
    //  }),
  ],
  defaultOptions: {
    maxSteps: 18,
    delegation: {
      onDelegationStart: async context => {
        log.info('Data pipeline network delegating', {
          primitiveId: context.primitiveId,
          iteration: context.iteration,
        })

        await Promise.resolve()

        if (context.primitiveId === 'dataExportAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nReturn export-ready results with explicit output format, field order assumptions, and any validation issues that would block a clean CSV or file export.`,
          }
        }

        if (context.primitiveId === 'dataIngestionAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nFocus on parsing accuracy, schema mismatches, missing values, and the exact structure extracted from the input source.`,
          }
        }

        if (context.primitiveId === 'dataTransformationAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nDescribe the transformation clearly, preserve data integrity, and call out lossy conversions, inferred types, or normalization choices.`,
          }
        }

        if (context.primitiveId === 'reportAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nSummarize the processed data in a report-friendly format with key findings, anomalies, and recommended next actions.`,
          }
        }

        return { proceed: true }
      },
      onDelegationComplete: async context => {
        log.info('Data pipeline delegation complete', {
          primitiveId: context.primitiveId,
          success: context.success,
          duration: context.duration,
        })

        if (context.error) {
          context.bail()
          await Promise.resolve()
          return {
            feedback: `Delegation to ${context.primitiveId} failed: ${String(context.error)}. Choose a smaller pipeline step or request the missing data explicitly.`,
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
      scorers: [dataPipelineNetworkTaskCompleteScorer, dataPipelineNetworkExecutionScorer],
      strategy: 'any',
      parallel: true,
      onComplete: async result => {
        log.info('Data pipeline completion check', {
          complete: result.complete,
          score: result.scorers[0]?.score,
        })
        await Promise.resolve()
      },
      suppressFeedback: false,
    },
  },
})

log.info('Data Pipeline Network initialized')
