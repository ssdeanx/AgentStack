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
import { documentProcessingAgent } from '../agents/documentProcessingAgent'
import { evaluationAgent } from '../agents/evaluationAgent'
import { knowledgeIndexingAgent } from '../agents/knowledgeIndexingAgent'
import { learningExtractionAgent } from '../agents/learningExtractionAgent'
import { researchAgent } from '../agents/researchAgent'
import { googleAI3 } from '../config/google'
import { log } from '../config/logger'
import { learningExtractionWorkflow } from '../workflows/learning-extraction-workflow'
import { researchSynthesisWorkflow } from '../workflows/research-synthesis-workflow'
import { LibsqlMemory } from '../config/libsql'

log.info('Initializing Learning Network...')

/**
 * Checks that the learning network returns actionable learning outcomes,
 * knowledge-organization guidance, or research-backed educational output.
 */
const learningNetworkTaskCompleteScorer = createScorer({
  id: 'learning-network-task-complete',
  name: 'Learning Network Task Completeness',
  description:
    'Checks whether the learning network returned concrete learnings, indexed knowledge guidance, or educational recommendations.',
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
      hasLearningLanguage:
        /learning|knowledge|insight|objective|resource|curriculum|index|research|assessment/i.test(
          responseText
        ),
      hasStructure:
        /^[-*]\s|^\d+\.\s|^#{1,6}\s/m.test(responseText),
    }
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) return 0

    let score = 0
    if (analysis.responseLength >= 70) score += 0.2
    if (analysis.responseLength >= 140) score += 0.1
    if (analysis.hasLearningLanguage) score += 0.4
    if (analysis.hasStructure) score += 0.15
    if (analysis.hasReasoning) score += 0.05
    if (analysis.toolCount > 0) score += 0.05

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) return 'No usable learning network response was produced.'

    const parts: string[] = []
    if (analysis.hasLearningLanguage) parts.push('it includes learning or knowledge language')
    if (analysis.hasStructure) parts.push('it is structured for handoff')

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This learning response is strong because ${parts.join(', ')}.` : 'The response is present but still needs educational detail.'}`
  })

/**
 * Checks that the learning answer is instructionally useful with outcomes,
 * structure, and a recommended next study step.
 */
const learningNetworkOutcomeScorer = createScorer({
  id: 'learning-network-outcome-readiness',
  name: 'Learning Network Outcome Readiness',
  description:
    'Checks whether the learning response includes practical takeaways, learning structure, and next-study guidance.',
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
      hasTakeaway:
        /takeaway|learning|objective|insight|concept/i.test(responseText),
      hasSequence:
        /step|sequence|curriculum|resource|practice/i.test(responseText),
      hasNextStep:
        /next step|study next|review|apply/i.test(responseText),
      hasStructure:
        /^[-*]\s|^\d+\.\s|^#{1,6}\s/m.test(responseText),
    }
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) return 0

    let score = 0
    if (analysis.responseLength >= 140) score += 0.2
    if (analysis.responseLength >= 240) score += 0.1
    if (analysis.hasTakeaway) score += 0.25
    if (analysis.hasSequence) score += 0.2
    if (analysis.hasNextStep) score += 0.2
    if (analysis.hasStructure) score += 0.05
    if (analysis.hasReasoning) score += 0.03
    if (analysis.toolCount > 0) score += 0.02

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) return 'No usable learning outcome response was produced.'

    const parts: string[] = []
    if (analysis.hasTakeaway) parts.push('it includes practical takeaways')
    if (analysis.hasSequence) parts.push('it lays out a learning sequence or structure')
    if (analysis.hasNextStep) parts.push('it suggests the next study action')

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This learning outcome response is strong because ${parts.join(', ')}.` : 'The response is present but still needs clearer learning direction.'}`
  })

export const learningNetwork = new Agent({
  id: 'learning-network',
  name: 'Learning Network',
  description:
    'A routing agent that coordinates learning and knowledge agents for educational content and knowledge management. Routes requests to learning extraction, knowledge indexing, and research agents.',
  instructions: `You are a Learning Coordinator. Your role is to orchestrate knowledge acquisition and learning workflows by coordinating specialized educational agents.

## Available Agents

### learningExtractionAgent
**Use for:** Extracting key learnings from content, summarizing insights
**Capabilities:** Content analysis, key point extraction, learning synthesis
**Output:** Structured learning outcomes and key insights

### knowledgeIndexingAgent
**Use for:** Building knowledge bases, semantic search, content indexing
**Capabilities:** Document indexing, vector search, knowledge retrieval
**Output:** Indexed knowledge bases with search capabilities

### researchAgent
**Use for:** Research synthesis, information gathering, topic exploration
**Capabilities:** Web research, academic sources, comprehensive analysis
**Output:** Research findings and synthesized information

### documentProcessingAgent
**Use for:** Document analysis, content chunking, format conversion
**Capabilities:** PDF processing, text extraction, document structuring
**Output:** Processed and structured documents

### evaluationAgent
**Use for:** Content quality assessment, learning evaluation, feedback
**Capabilities:** Quality scoring, effectiveness measurement, improvement suggestions
**Output:** Quality assessments and improvement recommendations

## Available Workflows

### learningExtractionWorkflow
**Use for:** Extract learnings with human-in-the-loop approval
**Input:** Content to analyze, extraction parameters
**Output:** Validated learnings with human approval checkpoints

### researchSynthesisWorkflow
**Use for:** Multi-topic research synthesis using concurrent processing
**Input:** Research topics, synthesis requirements
**Output:** Comprehensive research reports across topics

## Learning Workflow Patterns

### Knowledge Base Construction
1. documentProcessingAgent → Process source documents
2. knowledgeIndexingAgent → Index content into vector store
3. learningExtractionAgent → Extract key learnings
4. evaluationAgent → Assess knowledge quality

### Research-Based Learning
1. researchAgent → Gather information on topics
2. learningExtractionAgent → Extract key concepts and learnings
3. knowledgeIndexingAgent → Build searchable knowledge base
4. evaluationAgent → Validate learning outcomes

### Content Analysis & Learning
1. documentProcessingAgent → Analyze educational content
2. learningExtractionWorkflow → Extract learnings with approval
3. knowledgeIndexingAgent → Index for future retrieval
4. researchAgent → Supplement with additional context

### Skill Development Planning
1. researchAgent → Research skill development approaches
2. learningExtractionAgent → Extract best practices
3. evaluationAgent → Assess learning effectiveness
4. knowledgeIndexingAgent → Build personalized learning path

## Routing Decision Process

1. **Analyze Learning Goal**
   - Extract insights → learningExtractionAgent
   - Build knowledge base → knowledgeIndexingAgent
   - Research topics → researchAgent
   - Process documents → documentProcessingAgent
   - Evaluate quality → evaluationAgent

2. **Consider Content Type**
   - Academic papers → researchAgent + documentProcessingAgent
   - Educational content → learningExtractionAgent + evaluationAgent
   - Large knowledge bases → knowledgeIndexingAgent + documentProcessingAgent
   - Multi-topic research → researchSynthesisWorkflow

3. **Quality Assurance**
   - Include evaluation for educational content
   - Use learningExtractionWorkflow for critical learning outcomes
   - Validate knowledge base accuracy and completeness

## Guidelines

- Focus on actionable, practical learnings over theoretical knowledge
- Include assessment and validation steps for educational content
- Build reusable knowledge bases for future learning
- Provide clear learning objectives and outcomes
- Include progress tracking and milestone achievements
- Suggest additional resources for deeper learning

## Final Answer Contract

- Start with the learning goal or the core insight.
- Present the material as structured takeaways, steps, or indexed knowledge.
- End with the next study action, validation step, or deeper resource to use.
`,
  model: googleAI3,
  memory: LibsqlMemory,
  agents: {
    learningExtractionAgent,
    knowledgeIndexingAgent,
    researchAgent,
    documentProcessingAgent,
    evaluationAgent,
  },
  workflows: {
    learningExtractionWorkflow,
    researchSynthesisWorkflow,
  },
  // tools: { confirmationTool },
  options: {},
  outputProcessors: [
    new TokenLimiterProcessor(128000),
    //   new BatchPartsProcessor({
    //       batchSize: 20,
    //       maxWaitTime: 100,
    //       emitOnNonText: true,
    //   }),
  ],
  defaultOptions: {
    maxSteps: 18,
    delegation: {
      onDelegationStart: async context => {
        log.info('Learning network delegating', {
          primitiveId: context.primitiveId,
          iteration: context.iteration,
        })

        await Promise.resolve()

        if (context.primitiveId === 'learningExtractionAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nExtract the highest-value learnings, make them actionable, and separate core takeaways from optional deeper study.`,
          }
        }

        if (context.primitiveId === 'knowledgeIndexingAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nFocus on how the content should be indexed, retrieved, and organized for future learning efficiency and accuracy.`,
          }
        }

        if (context.primitiveId === 'researchAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nGather research that strengthens the learning objective, citing reliable sources and highlighting practical application.`,
          }
        }

        if (context.primitiveId === 'documentProcessingAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nPreserve educational structure, surface extraction issues, and prepare the material for clean downstream learning workflows.`,
          }
        }

        if (context.primitiveId === 'evaluationAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nEvaluate the learning output for clarity, correctness, usefulness, and measurable learning progress.`,
          }
        }

        return { proceed: true }
      },
      onDelegationComplete: async context => {
        log.info('Learning delegation complete', {
          primitiveId: context.primitiveId,
          success: context.success,
          duration: context.duration,
        })

        if (context.error) {
          context.bail()
          await Promise.resolve()
          return {
            feedback: `Delegation to ${context.primitiveId} failed: ${String(context.error)}. Continue with the validated learning artifacts and note any missing educational coverage.`,
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
      scorers: [learningNetworkTaskCompleteScorer, learningNetworkOutcomeScorer],
      strategy: 'any',
      parallel: true,
      onComplete: async result => {
        log.info('Learning completion check', {
          complete: result.complete,
          score: result.scorers[0]?.score,
        })
        await Promise.resolve()
      },
      suppressFeedback: false,
    },
  },
})

log.info('Learning Network initialized')
