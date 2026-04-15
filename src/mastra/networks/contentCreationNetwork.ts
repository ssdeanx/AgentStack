import { Agent } from '@mastra/core/agent'

import { contentStrategistAgent } from '../agents/contentStrategistAgent'
import { copywriterAgent } from '../agents/copywriterAgent'
import { editorAgent } from '../agents/editorAgent'
import { evaluationAgent } from '../agents/evaluationAgent'
import { scriptWriterAgent } from '../agents/scriptWriterAgent'
import { googleAI3 } from '../config/google'
import { log } from '../config/logger'
import { createSupervisorPatternScorer } from '../scorers/supervisor-scorers'

import { contentReviewWorkflow } from '../workflows/content-review-workflow'
import { contentStudioWorkflow } from '../workflows/content-studio-workflow'
import { LibsqlMemory } from '../config/libsql'

log.info('Initializing Content Creation Network...')

/**
 * Checks that the content-creation network produces a usable content deliverable
 * or a concrete editorial plan.
 */
const contentCreationNetworkTaskCompleteScorer =
  createSupervisorPatternScorer({
    id: 'content-creation-network-task-complete',
    name: 'Content Creation Network Task Completeness',
    description:
      'Checks whether the network returned a substantial draft, edit, strategy, or quality review.',
    label: 'Content creation response',
    emptyReason: 'No usable content creation response was produced.',
    weakReason: 'The response is present but still needs creative detail.',
    strongReasonPrefix: 'This content response is strong because',
    signals: [
      {
        label: 'it includes content or editorial language',
        regex:
          /headline|audience|draft|edit|tone|script|cta|content|strategy|quality/i,
        weight: 0.4,
      },
    ],
    responseLengthThresholds: [
      { min: 70, weight: 0.2 },
      { min: 140, weight: 0.1 },
    ],
    minParagraphsForStructure: 999,
    structureWeight: 0.15,
    reasoningWeight: 0.05,
    toolWeight: 0.05,
  })

/**
 * Checks that the content-creation answer is delivery-ready with a draft,
 * editorial direction, or clear revision guidance.
 */
const contentCreationNetworkDeliveryScorer =
  createSupervisorPatternScorer({
    id: 'content-creation-network-delivery-readiness',
    name: 'Content Creation Network Delivery Readiness',
    description:
      'Checks whether the content response is ready to publish, revise, or hand off to the next editorial step.',
    label: 'Content delivery response',
    emptyReason: 'No usable content delivery response was produced.',
    weakReason: 'The response is present but still needs handoff detail.',
    strongReasonPrefix: 'This delivery response is strong because',
    signals: [
      {
        label: 'it includes draft or outline language',
        regex: /draft|outline|headline|script|copy/i,
        weight: 0.25,
      },
      {
        label: 'it addresses tone, audience, or positioning',
        regex: /tone|audience|positioning|voice/i,
        weight: 0.2,
      },
      {
        label: 'it includes delivery or revision guidance',
        regex: /next step|revise|publish|review|qa/i,
        weight: 0.2,
      },
    ],
    responseLengthThresholds: [
      { min: 140, weight: 0.2 },
      { min: 240, weight: 0.1 },
    ],
    minParagraphsForStructure: 999,
    structureWeight: 0.05,
    reasoningWeight: 0.03,
    toolWeight: 0.02,
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
