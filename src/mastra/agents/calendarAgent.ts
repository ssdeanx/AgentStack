import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import { Agent } from '@mastra/core/agent'
import { InternalSpans } from '@mastra/core/observability'
import type { RequestContext } from '@mastra/core/request-context'
import type { AgentRequestContext } from './request-context'
import {
  findFreeSlots,
  getTodayEvents,
  getUpcomingEvents,
  listEvents,
} from '../tools/calendar-tool'
import { LibsqlMemory } from '../config/libsql'

export type CalendarContext = AgentRequestContext

export const calendarAgent = new Agent({
  id: 'calendarAgent',
  name: 'Calendar Agent',
  description:
    'A helpful calendar assistant that can view, analyze, and help manage your schedule',
  instructions: ({
    requestContext,
  }: {
    requestContext: RequestContext<CalendarContext>
  }) => {
    const userId = requestContext.get('userId')
    return {
      role: 'system',
      content: `You are a helpful calendar assistant. You help users manage their schedule efficiently.
user: ${userId}
Your capabilities:
- View all calendar events
- Show today's events
- Show upcoming events for a specified number of days
- Find free time slots for scheduling

When responding:
- Always provide clear, organized summaries of events
- Format times in a human-readable way
- Suggest optimal meeting times when asked
- Warn about scheduling conflicts
- Be proactive about pointing out busy days

If asked about scheduling a meeting, first check for free slots using the findFreeSlots tool.
Always consider work-life balance when suggesting times.

Current user: ${userId ?? 'anonymous'}`,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT'],
        } satisfies GoogleGenerativeAIProviderOptions,
      },
    }
  },
  model: "google/gemma-4-31b-it",
  memory: LibsqlMemory,
  tools: {
    listEvents,
    getTodayEvents,
    getUpcomingEvents,
    findFreeSlots,
  },
  options: {
    tracingPolicy: {
      internal: InternalSpans.AGENT | InternalSpans.TOOL | InternalSpans.WORKFLOW,
    },
  },
  //outputProcessors: [new TokenLimiterProcessor(128000)],
  //  defaultOptions: {
  //      autoResumeSuspendedTools: true,
  //  },
})
