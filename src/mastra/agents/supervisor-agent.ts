
import { Agent } from '@mastra/core/agent'
import { InternalSpans } from '@mastra/core/observability'
import { browserAgent } from './browserAgent'
import { researchAgent } from './researchAgent'
import { copywriterAgent } from './copywriterAgent'
import { libsqlgraphQueryTool, LibsqlMemory, libsqlQueryTool, libsqlvector } from '../config/libsql'
import { log } from '../config/logger'
import { AgentFSFilesystem } from '@mastra/agentfs'
//import { AgentFS } from 'agentfs-sdk'
import { Workspace, LocalSandbox } from '@mastra/core/workspace';
import type { GoogleLanguageModelOptions } from '@ai-sdk/google'
import {
  baseAgentRequestContextSchema,
  getLanguageFromContext,
  getUserIdFromContext,
  getRoleFromContext,
  getWorkspaceIdFromContext,
} from './request-context'
import { embed } from 'ai';
import { ModelRouterEmbeddingModel } from '@mastra/core/llm';
import { createSupervisorAgentPatternScorer } from '../scorers/supervisor-scorers'

const workspace = new Workspace({
  id: 'supervisor-workspace',
  name: 'Supervisor Workspace',
  filesystem: new AgentFSFilesystem({
    id: 'supervisor-filesystem',
    agentId: 'supervisor-agent',
  }),
  sandbox: new LocalSandbox({
    workingDirectory: './agentfs-sandbox',
    nativeSandbox: {
    allowNetwork: true, // Block network access (default)
    readWritePaths: ['/tmp/extra',
      '../.agents/**/skills'
    ], // Additional writable paths
  },
  }),
  lsp: true, // Enable LSP support for agents
  skills: ['/skills'],
//  skillSource: new VersionedSkillSource(tree: SkillVersionTree, blobStore: BlobStore, versionCreatedAt: Date): VersionedSkillSource
  vectorStore: libsqlvector,
      embedder: async (text: string) => {
      const { embedding } = await embed({
        model: new ModelRouterEmbeddingModel(
                'google/gemini-embedding-2-preview'
            ),
        value: text,
      })
      return embedding
  },
  bm25: true,
})

/**
 * Evaluates whether the supervisor produced a complete research-backed final answer
 * instead of stopping at a partial delegation summary.
 */
const supervisorTaskCompleteScorer = createSupervisorAgentPatternScorer({
  id: 'supervisor-task-complete',
  name: 'Supervisor Task Completeness',
  description:
    'Checks whether the supervisor returned a structured, substantial, research-backed final response.',
  label: 'supervisor completeness',
  emptyReason: 'No usable supervisor response was produced.',
  weakReason: 'The response is present but lacks several synthesis signals.',
  strongReasonPrefix: 'This supervisor response is strong because',
  responseLengthThresholds: [
    { min: 220, weight: 0.15 },
    { min: 600, weight: 0.15 },
  ],
  minParagraphsForStructure: 3,
  structureWeight: 0.15,
  reasoningWeight: 0.1,
  toolWeight: 0.05,
  userMessageWeight: 0.05,
  systemMessageWeight: 0.05,
  signals: [
    {
      label: 'it starts with a direct synthesis',
      regex: /summary|executive summary|top line|bottom line|direct answer|recommend/i,
      weight: 0.05,
    },
    {
      label: 'it includes evidence or source anchors',
      regex: /source|sources|citation|citations|http|www\.|\b20\d{2}\b/i,
      weight: 0.15,
    },
    {
      label: 'it ends with next steps or follow-up guidance',
      regex: /next step|next steps|action|follow-up|open question/i,
      weight: 0.05,
    },
    {
      label: 'it acknowledges uncertainty or caveats',
      regex: /risk|caveat|uncertain|unknown|assumption/i,
      weight: 0.05,
    },
  ],
})

/**
 * Evaluates whether the supervisor delivered a user-ready synthesis with a
 * direct answer, actionable guidance, and explicit caveats or next steps.
 */
const supervisorSynthesisScorer = createSupervisorAgentPatternScorer({
  id: 'supervisor-synthesis-readiness',
  name: 'Supervisor Synthesis Readiness',
  description:
    'Checks whether the supervisor response is actionable, synthesized, and ready for the user without another iteration.',
  label: 'supervisor synthesis',
  emptyReason: 'No usable supervisor response was produced.',
  weakReason: 'The response is present but lacks several synthesis signals.',
  strongReasonPrefix: 'This supervisor response is strong because',
  responseLengthThresholds: [
    { min: 220, weight: 0.2 },
    { min: 600, weight: 0.1 },
  ],
  minParagraphsForStructure: 3,
  structureWeight: 0.15,
  reasoningWeight: 0.1,
  toolWeight: 0.05,
  userMessageWeight: 0.05,
  systemMessageWeight: 0.05,
  signals: [
    {
      label: 'the answer starts with a direct synthesis',
      regex: /summary|in short|bottom line|recommend|recommended/i,
      weight: 0.05,
    },
    {
      label: 'it includes evidence or source anchors',
      regex: /source|sources|citation|citations|http|www\.|\b20\d{2}\b/i,
      weight: 0.15,
    },
    {
      label: 'it ends with next steps or follow-up guidance',
      regex: /next step|next steps|action|follow-up/i,
      weight: 0.05,
    },
    {
      label: 'it acknowledges uncertainty or caveats',
      regex: /risk|caveat|uncertain|unknown|assumption/i,
      weight: 0.05,
    },
  ],
})

export const supervisorAgent = new Agent({
  id: 'supervisor-agent',
  name: 'Supervisor Agent',
  description: 'You coordinate research and writing tasks using specialized agents.',
  instructions: ({ requestContext }) => {
    const userTier = getRoleFromContext(requestContext)
    const language = getLanguageFromContext(requestContext)
    const userId = getUserIdFromContext(requestContext) ?? 'anonymous'
    const workspaceId = getWorkspaceIdFromContext(requestContext) ?? 'default'

    return {
      role: 'system',
      content: `# Supervisor Agent
User: ${userId} | Tier: ${userTier} | Lang: ${language} | Workspace: ${workspaceId}

You coordinate research and writing tasks using specialized agents.

Available resources:
- researchAgent: Gathers factual data and sources (returns bullet points)
- browserAgent: Verifies live pages, browser state, and web claims when static research is not enough
- writing-agent: Transforms research into well-structured articles (returns full paragraphs)
- judge: Evaluates the quality and completeness of the supervisor agent's output

Delegation strategy:
1. For research requests: Delegate to research-agent first to gather facts, and use browserAgent when live verification, page inspection, or browser-state evidence would materially improve confidence
2. For writing requests: Delegate to writing-agent with any available research context
3. For comprehensive reports: Delegate to research-agent first, then writing-agent, and pull in browserAgent only for high-value verification
4. Always ensure you have gathered sufficient information before producing final output

Success criteria:
- All aspects of the user's request are addressed
- Information is accurate and well-sourced
- Final output is well-formatted and complete
- If anything is missing or uncertain, continue gathering information

Final answer contract:
- Start with a direct answer or concise executive summary.
- Synthesize delegated findings into one user-ready response instead of exposing internal routing chatter.
- Include evidence for material claims and end with next steps, caveats, or open questions when relevant.

Operating rules:
- Prefer the minimum number of delegations needed for a trustworthy answer.
- Use browserAgent only when live verification will materially improve the answer; do not browse by default.
- Preserve user language when possible.
- If evidence is weak, say so explicitly instead of overcommitting.
- Do not return raw delegation summaries as the final answer; convert them into a single coherent response.`,
    }
  },
  model: 'google/gemma-4-31b-it:free',
  tools: {libsqlgraphQueryTool, libsqlQueryTool,
  },
  agents: {
    researchAgent,
    browserAgent,
    copywriterAgent,
  },
  memory: LibsqlMemory,
  requestContextSchema: baseAgentRequestContextSchema,
  workspace,
  options: {
    tracingPolicy: {
      internal: InternalSpans.AGENT,
    },
  },
  defaultOptions: {
    maxSteps: 20,
    providerOptions: {
      anthropic: {
        sendReasoning: true,
        thinking: {
          type: 'adaptive',
        },
        cacheControl: { type: 'ephemeral' }
      },
      google: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: 'medium',
        },
        responseModalities: ['TEXT', 'IMAGE'],
        mediaResolution: 'MEDIA_RESOLUTION_MEDIUM',
      } satisfies GoogleLanguageModelOptions,
      openai: {
        parallelToolCalls: true,
        reasoningEffort: 'medium',
      },
      xai: {
        temperature: 0.2,
      },
    },
    toolCallConcurrency: 5,
    toolChoice: 'auto',
    includeRawChunks: true,
    returnScorerData: true,
    tracingOptions: {
      metadata: {
        agentName: 'supervisor-agent',
        userId: 'user.id',
        experimentId: 'session.data.experimentId',
        workspaceId: 'workspace.id',
      },
      tags: ['supervisor-agent', 'subagents', 'delegation', 'supervision', 'evaluation', 'research', 'writing'],
    },
    onIterationComplete: async context => {
      const feedback: string[] = []
      const text = context.text.trim()

      if (!/summary|in short|bottom line|recommend/i.test(text)) {
        feedback.push('Add a direct summary or recommendation near the top of the answer.')
      }

      if (!/source|citation|http|www\.|\b20\d{2}\b/i.test(text)) {
        feedback.push('Ground material claims with evidence, source anchors, or dated context.')
      }

      if (!/next step|caveat|uncertain|risk|open question/i.test(text)) {
        feedback.push('End with next steps, caveats, or open questions when useful.')
      }

      log.info('Iteration complete', {
        iteration: context.iteration,
        finishReason: context.finishReason,
        responseLength: context.text.length,
      })
      await Promise.resolve()
      return {
        continue: true,
        feedback: feedback.length > 0 ? feedback.join(' ') : undefined,
      }
    },

    delegation: {
      onDelegationStart: async context => {
        log.info('Delegating to primitive', {
          primitiveId: context.primitiveId,
        })

        await Promise.resolve()

        if (context.primitiveId === 'researchAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nReturn concise research notes with sources, dated evidence, unresolved gaps, and the most decision-relevant findings first. If live page verification or browser-state evidence would materially improve confidence, explicitly say that browserAgent should verify it. Focus on recent developments from 2024-2026 unless the user explicitly asks for historical coverage.`,
            modifiedInstructions:
              'Act as a senior research analyst. Prioritize evidence quality, source attribution, dated findings, and unresolved gaps. Return only research-ready material for synthesis.',
            modifiedMaxSteps: 8,
          }
        }

        if (context.primitiveId === 'browserAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nUse deterministic browser verification to confirm live claims, page behavior, or browser-state details. Prefer the minimum navigation needed, capture concrete evidence such as URLs, timestamps, visible page text, or interaction results, and clearly separate verified facts from anything still unresolved.`,
            modifiedInstructions:
              'Act as a deterministic browser verification specialist. Verify only what matters, avoid exploratory browsing, and return concise evidence that the supervisor can synthesize for the user.',
            modifiedMaxSteps: 6,
          }
        }

        if (context.primitiveId === 'copywriterAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nUse only the provided research context and clearly mark any uncertainty instead of inventing facts. Produce publication-ready writing with a strong opening, clear section flow, and a concise closing summary.`,
            modifiedInstructions:
              'Act as an expert writer refining verified research into a clear user-ready deliverable. Preserve accuracy, state uncertainty explicitly, and optimize for readability.',
            modifiedMaxSteps: 6,
          }
        }

        return { proceed: true }
      },

      onDelegationComplete: async context => {
        log.info('Delegation complete', {
          primitiveId: context.primitiveId,
        })

        if (context.error) {
          log.error('Delegation failed:', context.error)
          context.bail() // Stop further delegations
          await Promise.resolve()
          return {
            feedback: `Delegation to ${context.primitiveId} failed: ${String(context.error)}. Try a different approach.`,
          }
        }

        await Promise.resolve()
      },

      messageFilter: ({ messages }) => {
        // Pass only the last 5 messages, excluding tool calls
        return messages
          .filter(
            (message) =>
              !message.content.parts.some(
                (part) => part.type === 'tool-invocation'
              )
          )
          .slice(-5)
      },
    },
    // Validate task completion
    isTaskComplete: {
      scorers: [supervisorTaskCompleteScorer, supervisorSynthesisScorer],
      strategy: 'any', // Mark as complete if any scorer indicates completion
      parallel: true,
      onComplete: async result => {
        log.info('Completion check', {
          complete: result.complete,
          scores: result.scorers.map((scorer, index) => ({
            scorerIndex: index,
            score: scorer.score,
          })),
        })
        await Promise.resolve()
      },
      suppressFeedback: false, // Show feedback from the scorer
    },
  },
})
