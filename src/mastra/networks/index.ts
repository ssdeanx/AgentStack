import { Agent } from '@mastra/core/agent'
import { copywriterAgent } from '../agents/copywriterAgent'
import { editorAgent } from '../agents/editorAgent'
import { reportAgent } from '../agents/reportAgent'
import { researchAgent } from '../agents/researchAgent'
import { stockAnalysisAgent } from '../agents/stockAnalysisAgent'
import { weatherAgent } from '../agents/weather-agent'

// Orphaned agents now registered
import { customerSupportAgent } from '../agents/customerSupportAgent'
import { projectManagementAgent } from '../agents/projectManagementAgent'
import { seoAgent } from '../agents/seoAgent'
import { socialMediaAgent } from '../agents/socialMediaAgent'
import { translationAgent } from '../agents/translationAgent'

import { LibsqlMemory } from '../config/libsql'
import { googleAI } from '../config/google'
import { log } from '../config/logger'
import { createSupervisorPatternScorer } from '../scorers/supervisor-scorers'
import { weatherWorkflow } from '../workflows/weather-workflow'

// CSV/Data Pipeline Networks
export { dataPipelineNetwork } from './dataPipelineNetwork'
export { reportGenerationNetwork } from './reportGenerationNetwork'

// Research Pipeline Network
export { researchPipelineNetwork } from './researchPipelineNetwork'

// Coding Team Network
export { codingTeamNetwork } from './codingTeamNetwork'

// Content Creation Network
export { contentCreationNetwork } from './contentCreationNetwork'

// Financial Intelligence Network
export { financialIntelligenceNetwork } from './financialIntelligenceNetwork'

// Learning Network
export { learningNetwork } from './learningNetwork'

// Marketing Automation Network
export { marketingAutomationNetwork } from './marketingAutomationNetwork'

// DevOps Network
export { devopsNetwork } from './devopsNetwork'

// Business Intelligence Network
export { businessIntelligenceNetwork } from './businessIntelligenceNetwork'

// Security Network
export { securityNetwork } from './securityNetwork'

import {
  TokenLimiterProcessor
} from '@mastra/core/processors'

/**
 * Checks that the primary network returns a useful routed answer instead of
 * stopping at a vague handoff explanation.
 */
const agentNetworkTaskCompleteScorer = createSupervisorPatternScorer({
  id: 'primary-network-task-complete',
  name: 'Primary Network Task Completeness',
  description:
    'Checks whether the primary network returned a concrete answer or actionable routed result.',
  label: 'Primary network response',
  emptyReason: 'No usable routed answer was produced.',
  weakReason: 'The response is present but still needs more routing detail.',
  strongReasonPrefix: 'This primary network response is strong because',
  signals: [
    {
      label: 'it includes useful routing language',
      regex:
        /recommend|summary|analysis|report|plan|translation|support|seo|next step/i,
      weight: 0.3,
    },
    {
      label: 'it reads like a complete routed answer',
      regex: /(?:[^.!?]+[.!?]){2,}/s,
      weight: 0.2,
    },
  ],
  responseLengthThresholds: [{ min: 40, weight: 0.2 }],
  minParagraphsForStructure: 999,
  structureWeight: 0.1,
  reasoningWeight: 0.05,
  toolWeight: 0.05,
})

/**
 * Checks that the primary network answer is user-ready, concise, and ends with
 * a clear resolution path or next action.
 */
const agentNetworkResolutionScorer = createSupervisorPatternScorer({
  id: 'primary-network-resolution-readiness',
  name: 'Primary Network Resolution Readiness',
  description:
    'Checks whether the primary network returned a direct answer with clear next steps or decision guidance.',
  label: 'Primary network resolution',
  emptyReason: 'No resolution-ready response was produced.',
  weakReason:
    'The response is present but still needs clearer next steps or decision guidance.',
  strongReasonPrefix: 'This primary network resolution is strong because',
  signals: [
    {
      label: 'it includes a direct answer or recommendation',
      regex: /recommend|suggest|best option|answer/i,
      weight: 0.25,
    },
    {
      label: 'it includes next-step guidance',
      regex: /next step|follow-up|if needed|you can/i,
      weight: 0.25,
    },
    {
      label: 'it explains the reasoning behind the recommendation',
      regex: /because|based on|given that/i,
      weight: 0.25,
    },
  ],
  responseLengthThresholds: [{ min: 120, weight: 0.2 }],
})

export const agentNetwork = new Agent({
  id: 'agent-network',
  name: 'Primary Agent Network',
  description:
    'A routing agent that coordinates specialized agents and workflows.',
  instructions: `
     You are a Primary Network Coordinator. Your goal is to route user requests to most appropriate specialist agent or workflow.

     Available Capabilities:
     - **Research**: For deep research topics, finding facts, and gathering information.
     - **Stock Analysis**: For financial data, market analysis, and stock trends.
     - **Weather Workflow**: For comprehensive weather forecasts combined with activity planning.
     - **Weather Agent**: For quick weather checks.
     - **Copywriting**: For generating marketing copy, blog posts, and creative writing.
     - **Editor**: For refining, proofreading, and improving existing text.
     - **Report**: For generating formal reports.
     - **Social Media**: For creating social media content and engagement strategies.
     - **SEO**: For search engine optimization and content strategy.
     - **Translation**: For translating content between languages.
     - **Customer Support**: For answering customer questions and providing support.
     - **Project Management**: For task tracking, project planning, and coordination.

     Routing Logic:
     - If user asks for a weather forecast *and* what to do, delegate to 'weather-workflow'.
     - If user asks for deep research or "find out about X", delegate to 'researchAgent'.
     - If user asks about stocks, crypto, or finance, delegate to 'stockAnalysisAgent'.
     - If user wants text written, delegate to 'copywriterAgent'.
     - If user wants text checked or fixed, delegate to 'editorAgent'.
     - If user needs social media content or strategy, delegate to 'socialMediaAgent'.
     - If user asks about SEO or content optimization, delegate to 'seoAgent'.
     - If user needs translation, delegate to 'translationAgent'.
     - If user has customer questions or support needs, delegate to 'customerSupportAgent'.
     - If user needs project management or task tracking, delegate to 'projectManagementAgent'.
     - If user request is simple, general, or conversational (like "hello", "what's up"), respond directly and naturally to user without explaining your routing logic.

     Final answer contract:
     - Lead with the direct answer, recommendation, or routed result.
     - Keep internal routing chatter minimal and synthesize specialist output for the user.
     - End with next steps, caveats, or a clarifying ask only when genuinely needed.
   `,
  model: googleAI,
  memory: LibsqlMemory, // Required for network capabilities
  options: {},
  agents: {
    researchAgent,
    stockAnalysisAgent,
    weatherAgent,
    copywriterAgent,
    editorAgent,
    reportAgent,
    socialMediaAgent,
    seoAgent,
    translationAgent,
    customerSupportAgent,
    projectManagementAgent,
  },
  //  tools: { confirmationTool },
  scorers: {},
  workflows: { weatherWorkflow },
  outputProcessors: [
    new TokenLimiterProcessor(128000),
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
        log.info('Primary network delegating', {
          primitiveId: context.primitiveId,
          iteration: context.iteration,
        })

        await Promise.resolve()

        if (context.primitiveId === 'researchAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nFocus on the user's exact question, lead with the highest-confidence findings, include source-aware evidence, and flag any unresolved uncertainty instead of speculating.`,
          }
        }

        if (context.primitiveId === 'stockAnalysisAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nReturn a concise market-oriented answer with clear assumptions, time horizon, primary risks, and an explicit note when data may be delayed or incomplete.`,
          }
        }

        if (context.primitiveId === 'copywriterAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nProduce polished user-facing copy with a strong opening, clear structure, and wording tailored to the requested audience and format.`,
          }
        }

        if (context.primitiveId === 'editorAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nPrioritize clarity, correctness, tone consistency, and concrete edit rationale when the user asks for revisions or proofreading.`,
          }
        }

        if (context.primitiveId === 'socialMediaAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nReturn platform-aware social content, engagement tactics, and any needed CTA or posting guidance without generic filler.`,
          }
        }

        if (context.primitiveId === 'seoAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nRespond with search-intent-aware recommendations, target keyword rationale, and concrete optimization actions rather than broad SEO theory.`,
          }
        }

        if (context.primitiveId === 'translationAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nPreserve meaning, tone, and format. Call out any idioms, ambiguity, or localization choices that affect the translation quality.`,
          }
        }

        if (context.primitiveId === 'customerSupportAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nAnswer like a senior support lead: resolve the issue directly, ask only for missing blockers, and end with clear next steps or escalation guidance.`,
          }
        }

        if (context.primitiveId === 'projectManagementAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nReturn a delivery-focused plan with priorities, dependencies, risks, ownership guidance, and concrete milestones where applicable.`,
          }
        }

        return { proceed: true }
      },
      onDelegationComplete: async context => {
        log.info('Primary network delegation complete', {
          primitiveId: context.primitiveId,
          success: context.success,
          duration: context.duration,
        })

        if (context.error) {
          context.bail()
          await Promise.resolve()
          return {
            feedback: `Delegation to ${context.primitiveId} failed: ${String(context.error)}. Recover by answering directly if possible or choose another specialist.`,
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
      scorers: [agentNetworkTaskCompleteScorer, agentNetworkResolutionScorer],
      strategy: 'any',
      parallel: true,
      onComplete: async result => {
        log.info('Primary network completion check', {
          complete: result.complete,
          score: result.scorers[0]?.score,
        })
        await Promise.resolve()
      },
      suppressFeedback: false,
    },
  },
})
