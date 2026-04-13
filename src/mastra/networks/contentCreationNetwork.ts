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

import { contentStrategistAgent } from '../agents/contentStrategistAgent'
import { copywriterAgent } from '../agents/copywriterAgent'
import { editorAgent } from '../agents/editorAgent'
import { evaluationAgent } from '../agents/evaluationAgent'
import { scriptWriterAgent } from '../agents/scriptWriterAgent'
import { googleAI3 } from '../config/google'
import { log } from '../config/logger'

import { contentReviewWorkflow } from '../workflows/content-review-workflow'
import { contentStudioWorkflow } from '../workflows/content-studio-workflow'
import { LibsqlMemory } from '../config/libsql'

log.info('Initializing Content Creation Network...')

/**
 * Checks that the content-creation network produces a usable content deliverable
 * or a concrete editorial plan.
 */
const contentCreationNetworkTaskCompleteScorer = createScorer({
  id: 'content-creation-network-task-complete',
  name: 'Content Creation Network Task Completeness',
  description:
    'Checks whether the network returned a substantial draft, edit, strategy, or quality review.',
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
      hasContentLanguage:
        /headline|audience|draft|edit|tone|script|cta|content|strategy|quality/i.test(
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
    if (analysis.hasContentLanguage) score += 0.4
    if (analysis.hasStructure) score += 0.15
    if (analysis.hasReasoning) score += 0.05
    if (analysis.toolCount > 0) score += 0.05

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) return 'No usable content creation response was produced.'

    const parts: string[] = []
    if (analysis.hasContentLanguage) parts.push('it includes content or editorial language')
    if (analysis.hasStructure) parts.push('it is structured for handoff')

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This content response is strong because ${parts.join(', ')}.` : 'The response is present but still needs creative detail.'}`
  })

/**
 * Checks that the content-creation answer is delivery-ready with a draft,
 * editorial direction, or clear revision guidance.
 */
const contentCreationNetworkDeliveryScorer = createScorer({
  id: 'content-creation-network-delivery-readiness',
  name: 'Content Creation Network Delivery Readiness',
  description:
    'Checks whether the content response is ready to publish, revise, or hand off to the next editorial step.',
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
      hasDraft:
        /draft|outline|headline|script|copy/i.test(responseText),
      hasVoice:
        /tone|audience|positioning|voice/i.test(responseText),
      hasDelivery:
        /next step|revise|publish|review|qa/i.test(responseText),
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
    if (analysis.hasDraft) score += 0.25
    if (analysis.hasVoice) score += 0.2
    if (analysis.hasDelivery) score += 0.2
    if (analysis.hasStructure) score += 0.05
    if (analysis.hasReasoning) score += 0.03
    if (analysis.toolCount > 0) score += 0.02

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) return 'No usable content delivery response was produced.'

    const parts: string[] = []
    if (analysis.hasDraft) parts.push('it includes draft or outline language')
    if (analysis.hasVoice) parts.push('it addresses tone, audience, or positioning')
    if (analysis.hasDelivery) parts.push('it includes delivery or revision guidance')

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This delivery response is strong because ${parts.join(', ')}.` : 'The response is present but still needs handoff detail.'}`
  })

export const contentCreationNetwork = new Agent({
  id: 'content-creation-network',
  name: 'Content Creation Network',
  description:
    'A routing agent that coordinates content creation agents for writing, editing, and content strategy. Routes requests to copywriter, editor, strategist, and script writer agents.',
  instructions: `You are a Content Creation Coordinator. Your role is to orchestrate content creation workflows by coordinating specialized content agents.

## Available Agents

### copywriterAgent
**Use for:** Creating original content, blog posts, marketing copy, articles
**Capabilities:** Creative writing, persuasive copy, brand voice adaptation
**Output:** Draft content ready for editing

### editorAgent
**Use for:** Reviewing, proofreading, improving existing content
**Capabilities:** Grammar correction, style improvement, clarity enhancement
**Output:** Polished, publication-ready content

### contentStrategistAgent
**Use for:** Content planning, audience analysis, topic strategy
**Capabilities:** SEO optimization, audience targeting, content calendars
**Output:** Strategic content plans and recommendations

### scriptWriterAgent
**Use for:** Writing scripts, video content, presentations
**Capabilities:** Script formatting, dialogue writing, narrative structure
**Output:** Formatted scripts and video content

### evaluationAgent
**Use for:** Quality assessment, content scoring, improvement suggestions
**Capabilities:** Content analysis, quality metrics, feedback generation
**Output:** Detailed content evaluations and scores

## Available Workflows

### contentStudioWorkflow
**Use for:** Full content creation pipeline with research and strategy
**Input:** Topic, content type, target audience
**Output:** Complete content package with research and drafts

### contentReviewWorkflow
**Use for:** Iterative content improvement with quality checks
**Input:** Content draft, quality threshold
**Output:** Refined content meeting quality standards

## Content Creation Patterns

### Blog Post Creation
1. contentStrategistAgent → Research topic and audience
2. copywriterAgent → Write initial draft
3. editorAgent → Review and polish
4. evaluationAgent → Quality assessment

### Marketing Campaign
1. contentStrategistAgent → Strategy and messaging
2. copywriterAgent → Create campaign copy
3. scriptWriterAgent → Video scripts if needed
4. editorAgent → Final review

### Content Audit & Improvement
1. evaluationAgent → Assess existing content
2. contentStrategistAgent → Strategic recommendations
3. editorAgent → Implement improvements

## Routing Decision Process

1. **Analyze Request Type**
   - Writing new content → copywriterAgent
   - Improving existing content → editorAgent
   - Planning content strategy → contentStrategistAgent
   - Creating scripts/videos → scriptWriterAgent
   - Evaluating content quality → evaluationAgent

2. **Consider Complexity**
   - Simple requests → Single agent
   - Complex projects → Multi-agent workflow
   - Quality-critical → Include evaluation

3. **Select Workflow Pattern**
   - Full content creation → contentStudioWorkflow
   - Iterative improvement → contentReviewWorkflow
   - Custom coordination → Manual agent chaining

## Guidelines

- Always explain which agents are being used and why
- For multi-step processes, provide progress updates
- Include quality metrics when evaluationAgent is used
- Suggest workflow usage for complex content projects
- Preserve author's voice while improving clarity and impact

## Final Answer Contract

- Start with the deliverable type and target audience.
- Provide content or editorial guidance that is immediately usable.
- End with revision priorities, publishing guidance, or the next creative step.
`,
  model: googleAI3,
  memory: LibsqlMemory,
  agents: {
    copywriterAgent,
    editorAgent,
    contentStrategistAgent,
    scriptWriterAgent,
    evaluationAgent,
  },
  workflows: {
    contentStudioWorkflow,
    contentReviewWorkflow,
  },
  options: {},
  tools: {},
  outputProcessors: [
//    new TokenLimiterProcessor(128000),
    //     new BatchPartsProcessor({
    //          batchSize: 20,
    //        maxWaitTime: 100,
    //        emitOnNonText: true,
    //    }),
  ],
  defaultOptions: {
    maxSteps: 18,
    delegation: {
      onDelegationStart: async context => {
        log.info('Content creation network delegating', {
          primitiveId: context.primitiveId,
          iteration: context.iteration,
        })

        await Promise.resolve()

        if (context.primitiveId === 'copywriterAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nWrite audience-aware content with a strong opening, clear flow, and specific value delivery instead of generic filler.`,
          }
        }

        if (context.primitiveId === 'editorAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nEdit for clarity, grammar, tone consistency, and readability while preserving the author's intent and format.`,
          }
        }

        if (context.primitiveId === 'contentStrategistAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nReturn a practical content strategy with audience positioning, channel fit, SEO considerations, and concrete next actions.`,
          }
        }

        if (context.primitiveId === 'scriptWriterAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nProduce a presentation-ready script with pacing, scene or section flow, and language tailored to the intended speaker and format.`,
          }
        }

        if (context.primitiveId === 'evaluationAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nAssess the content with concrete strengths, weaknesses, scoring rationale, and revision priorities rather than vague feedback.`,
          }
        }

        return { proceed: true }
      },
      onDelegationComplete: async context => {
        log.info('Content creation delegation complete', {
          primitiveId: context.primitiveId,
          success: context.success,
          duration: context.duration,
        })

        if (context.error) {
          context.bail()
          await Promise.resolve()
          return {
            feedback: `Delegation to ${context.primitiveId} failed: ${String(context.error)}. Narrow the content scope or continue with the remaining editorial stages.`,
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
      scorers: [contentCreationNetworkTaskCompleteScorer, contentCreationNetworkDeliveryScorer],
      strategy: 'any',
      parallel: true,
      onComplete: async result => {
        log.info('Content creation completion check', {
          complete: result.complete,
          score: result.scorers[0]?.score,
        })
        await Promise.resolve()
      },
      suppressFeedback: false,
    },
  },
})

log.info('Content Creation Network initialized')
