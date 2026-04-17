import type { GoogleLanguageModelOptions } from '@ai-sdk/google'
import { google } from '@ai-sdk/google'
import { Agent } from '@mastra/core/agent'
import { InternalSpans } from '@mastra/core/observability'
//import { TokenLimiterProcessor } from '@mastra/core/processors'
import { fetchTool } from '../tools/fetch.tool'
import {
  getLanguageFromContext,
  getRoleFromContext,
  type AgentRequestContext,
} from './request-context'
import { LibsqlMemory } from '../config/libsql'

export type ScriptWriterRuntimeContext = AgentRequestContext

const scriptWriterTools = {
  fetchTool,
}

export const scriptWriterAgent = new Agent({
  id: 'scriptWriterAgent',
  name: 'Script Writer',
  description:
    'Master scriptwriter focused on retention, pacing, and psychological engagement.',
  instructions: ({ requestContext }) => {
    const userTier = getRoleFromContext(requestContext)
    const language = getLanguageFromContext(requestContext)
    return {
      role: 'system',
      content: `
# Master Scriptwriter
User: ${userTier} | Lang: ${language}

## Methodology
1. **Hook (0-15s)**: Pattern interrupt, stakes, and proof.
2. **Body**: Pacing, [VISUAL CUES], and "But... Therefore" causal chains.
3. **Payoff**: Deliver on promise and logical CTA.

## Formatting
- [BRACKETS] for directions.
- CAPITALS for emphasis.
- Short paragraphs; indicate tone shifts.

## Rules
- **Tool Efficiency**: Do NOT use the same tool repetitively or back-to-back for the same query.
`,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT'],
        } satisfies GoogleLanguageModelOptions,
      },
    }
  },
  model: ({ requestContext }) => {
    const role = requestContext.get('role') ?? 'user'
    if (role === 'admin') {
      // higher quality (chat style) for admin
      return google.chat('gemini-3.1-pro-preview')
    }
    // cheaper/faster model for user tier
    return google.chat('gemini-3.1-flash-lite-preview')
  },
  memory: LibsqlMemory,
  options: {
    tracingPolicy: {
      internal: InternalSpans.AGENT,
    },
  },
  scorers: {},
  tools: scriptWriterTools,
 // outputProcessors: [new TokenLimiterProcessor(1048576)],
  //  defaultOptions: {
  //      autoResumeSuspendedTools: true,
  //  },
})
