
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
import { InternalSpans } from '@mastra/core/observability'
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
const supervisorTaskCompleteScorer = createScorer({
  id: 'supervisor-task-complete',
  name: 'Supervisor Task Completeness',
  description:
    'Checks whether the supervisor returned a structured, substantial, research-backed final response.',
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
    const paragraphCount = responseText.split(/\n\s*\n/).filter(Boolean).length

    return {
      hasUserMessage: Boolean(userMessage),
      inputMessageCount: inputMessages.length,
      systemMessageCount: systemMessages.length,
      systemPromptLength: systemPrompt.length,
      responseLength: responseText.length,
      paragraphCount,
      hasResponse: responseText.length > 0,
      hasReasoning: Boolean(reasoning),
      toolCount: tools.length,
      toolCallCount: toolCallInfos.length,
      hasEvidence:
        /source|sources|citation|citations|http|www\.|\b20\d{2}\b/i.test(
          responseText
        ),
      hasStructure:
        /^#{1,6}\s|^[-*]\s|^\d+\.\s/m.test(responseText) || paragraphCount >= 3,
      hasDirectAnswer:
        /summary|executive summary|top line|bottom line|direct answer|recommend/i.test(
          responseText
        ),
      hasNextSteps:
        /next step|next steps|action|follow-up|open question/i.test(responseText),
      hasCaveat:
        /risk|caveat|uncertain|unknown|assumption/i.test(responseText),
      mentionsSynthesis:
        /synthes|delegate|research|writing/i.test(responseText) ||
        /synthes|delegate|research|writing/i.test(systemPrompt),
    }
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) {
      return 0
    }

    let score = 0
    if (analysis.hasUserMessage) score += 0.05
    if (analysis.systemMessageCount > 0) score += 0.05
    if (analysis.responseLength >= 220) score += 0.15
    if (analysis.responseLength >= 600) score += 0.15
    if (analysis.paragraphCount >= 3) score += 0.15
    if (analysis.hasReasoning) score += 0.1
    if (analysis.toolCount > 0) score += 0.05
    if (analysis.hasEvidence) score += 0.15
    if (analysis.hasStructure) score += 0.05
    if (analysis.hasDirectAnswer) score += 0.05
    if (analysis.hasNextSteps) score += 0.05
    if (analysis.hasCaveat) score += 0.05

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    const parts: string[] = []

    if (!analysis?.hasResponse) {
      return 'No usable supervisor response was produced.'
    }

    if (analysis.hasDirectAnswer) parts.push('it starts with a direct synthesis')
    if (analysis.hasEvidence) parts.push('it includes evidence or source anchors')
    if (analysis.hasNextSteps) parts.push('it ends with next steps or follow-up guidance')
    if (analysis.hasCaveat) parts.push('it acknowledges uncertainty or caveats')
    if (analysis.hasReasoning) parts.push('it shows reasoning support')
    if (analysis.toolCount > 0) parts.push(`it used ${analysis.toolCount} tool call(s)`)

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This supervisor response is strong because ${parts.join(', ')}.` : 'The response is present but lacks several synthesis signals.'}`
  })

/**
 * Evaluates whether the supervisor delivered a user-ready synthesis with a
 * direct answer, actionable guidance, and explicit caveats or next steps.
 */
const supervisorSynthesisScorer = createScorer({
  id: 'supervisor-synthesis-readiness',
  name: 'Supervisor Synthesis Readiness',
  description:
    'Checks whether the supervisor response is actionable, synthesized, and ready for the user without another iteration.',
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
    const paragraphCount = responseText.split(/\n\s*\n/).filter(Boolean).length

    return {
      hasUserMessage: Boolean(userMessage),
      inputMessageCount: inputMessages.length,
      systemMessageCount: systemMessages.length,
      systemPromptLength: systemPrompt.length,
      responseLength: responseText.length,
      paragraphCount,
      hasResponse: responseText.length > 0,
      hasReasoning: Boolean(reasoning),
      toolCount: tools.length,
      toolCallCount: toolCallInfos.length,
      hasEvidence:
        /source|sources|citation|citations|http|www\.|\b20\d{2}\b/i.test(
          responseText
        ),
      hasStructure:
        /^#{1,6}\s|^[-*]\s|^\d+\.\s/m.test(responseText) || paragraphCount >= 3,
      hasDirectAnswer:
        /summary|in short|bottom line|recommend|recommended/i.test(responseText),
      hasNextSteps:
        /next step|next steps|action|follow-up/i.test(responseText),
      hasCaveat:
        /risk|caveat|uncertain|unknown|assumption/i.test(responseText),
      mentionsDelegation:
        /research|writing|delegate|synthes/i.test(responseText) ||
        /research|writing|delegate|synthes/i.test(systemPrompt),
      hasSupportSignal: Boolean(responseText.trim()),
    }
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) {
      return 0
    }

    let score = 0
    if (analysis.hasUserMessage) score += 0.05
    if (analysis.systemMessageCount > 0) score += 0.05
    if (analysis.responseLength >= 220) score += 0.2
    if (analysis.responseLength >= 600) score += 0.1
    if (analysis.paragraphCount >= 3) score += 0.15
    if (analysis.hasReasoning) score += 0.1
    if (analysis.toolCount > 0) score += 0.05
    if (analysis.hasEvidence) score += 0.15
    if (analysis.hasStructure) score += 0.05
    if (analysis.hasDirectAnswer) score += 0.05
    if (analysis.hasNextSteps) score += 0.05
    if (analysis.hasCaveat) score += 0.05

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    const parts: string[] = []

    if (!analysis?.hasResponse) {
      return 'No usable supervisor response was produced.'
    }

    if (analysis.hasDirectAnswer) parts.push('the answer starts with a direct synthesis')
    if (analysis.hasEvidence) parts.push('it includes evidence or source anchors')
    if (analysis.hasNextSteps) parts.push('it ends with next steps or follow-up guidance')
    if (analysis.hasCaveat) parts.push('it acknowledges uncertainty or caveats')
    if (analysis.hasReasoning) parts.push('it shows reasoning support')
    if (analysis.toolCount > 0) parts.push(`it used ${analysis.toolCount} tool call(s)`)

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This supervisor response is strong because ${parts.join(', ')}.` : 'The response is present but lacks several synthesis signals.'}`
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
- writing-agent: Transforms research into well-structured articles (returns full paragraphs)
- judge: Evaluates the quality and completeness of the supervisor agent's output

Delegation strategy:
1. For research requests: Delegate to research-agent first to gather facts
2. For writing requests: Delegate to writing-agent with any available research context
3. For comprehensive reports: Delegate to research-agent first, then writing-agent
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
- Preserve user language when possible.
- If evidence is weak, say so explicitly instead of overcommitting.
- Do not return raw delegation summaries as the final answer; convert them into a single coherent response.`,
    }
  },
  model: {
    url: "https://api.kilo.ai/api/gateway",
    id:'kilo/x-ai/grok-code-fast-1:optimized:free',
    apiKey: process.env.KILO_API_KEY,
  },
  tools: {libsqlgraphQueryTool, libsqlQueryTool,
  },
  agents: {
    researchAgent,
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
    maxSteps: 10,
    providerOptions: {
      anthropic: {
        sendReasoning: true,
        thinking: {
          type: 'adaptive',
        },
      },
      google: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: 'medium',
        },
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
            modifiedPrompt: `${context.prompt}\n\nReturn concise research notes with sources, dated evidence, unresolved gaps, and the most decision-relevant findings first. Focus on recent developments from 2024-2026 unless the user explicitly asks for historical coverage.`,
            modifiedInstructions:
              'Act as a senior research analyst. Prioritize evidence quality, source attribution, dated findings, and unresolved gaps. Return only research-ready material for synthesis.',
            modifiedMaxSteps: 8,
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