import { Agent } from '@mastra/core/agent'
import { InternalSpans } from '@mastra/core/observability'
import { researchAgent } from './researchAgent'
import { copywriterAgent } from './copywriterAgent'
import { taskCompleteScorer } from '../evals/scorers/task-complete-scorer'
import { libsqlgraphQueryTool, LibsqlMemory, libsqlQueryTool } from '../config/libsql'
import { log } from '../config/logger'
import { AgentFSFilesystem } from '@mastra/agentfs'
//import { AgentFS } from 'agentfs-sdk'
import { Workspace, LocalSandbox } from '@mastra/core/workspace';

const workspace = new Workspace({
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
  skills: ['/skills'],
//  skillSource: new VersionedSkillSource(tree: SkillVersionTree, blobStore: BlobStore, versionCreatedAt: Date): VersionedSkillSource
  bm25: true,
})
export const supervisorAgent = new Agent({
  id: 'supervisor-agent',
  name: 'Supervisor Agent',
  description: 'You coordinate research and writing tasks using specialized agents.',
  instructions: `You coordinate research and writing tasks using specialized agents.

Available resources:
- researchAgent: Gathers factual data and sources (returns bullet points)
- writing-agent: Transforms research into well-structured articles (returns full paragraphs)

Delegation strategy:
1. For research requests: Delegate to research-agent first to gather facts
2. For writing requests: Delegate to writing-agent with any available research context
3. For comprehensive reports: Delegate to research-agent first, then writing-agent
4. Always ensure you have gathered sufficient information before producing final output

Success criteria:
- All aspects of the user's request are addressed
- Information is accurate and well-sourced
- Final output is well-formatted and complete
- If anything is missing or uncertain, continue gathering information`,
  model: 'opencode/minimax-m2.5-free',
  tools: {libsqlgraphQueryTool, libsqlQueryTool},
  agents: {
    researchAgent,
    copywriterAgent,
  },
  memory: LibsqlMemory,
  workspace,
  options: {
    tracingPolicy: {
      internal: InternalSpans.ALL,
    },
  },
  defaultOptions: {
    maxSteps: 25,
    providerOptions: {
      anthropic: {
      },
      google: {
        temperature: 0.2,
      },
      openai: {
        temperature: 0.2,
      },
      xai: {
        temperature: 0.2,
      },
    },

    onIterationComplete: async context => {
      log.info('Iteration complete', {
        iteration: context.iteration,
        finishReason: context.finishReason,
        responseLength: context.text.length,
      })
      await Promise.resolve()
      return { continue: true }
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
            modifiedPrompt: `${context.prompt}\n\nFocus on recent developments (2024-2025) and include statistics.`,
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
          .filter(m => !m.content.parts.some(p => p.type === 'tool-invocation'))
          .slice(-5)
      },
    },
    // Validate task completion
    isTaskComplete: {
      scorers: [taskCompleteScorer],
      strategy: 'all',
      parallel: true,
      onComplete: async result => {
        log.info('Completion check', {
          complete: result.complete,
          score: result.scorers[0]?.score,
        })
        await Promise.resolve()
      },
      suppressFeedback: false, // Show feedback from the scorer
    },
  },
})