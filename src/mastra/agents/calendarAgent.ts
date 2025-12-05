import { Agent } from '@mastra/core/agent';
import { InternalSpans } from '@mastra/core/ai-tracing';
import { listEvents, getTodayEvents, getUpcomingEvents, findFreeSlots } from '../tools/calendar-tool';
import { googleAIFlashLite, pgMemory } from '../config';

export const calendarAgent = new Agent({
  id: 'calendar-agent',
  name: 'Calendar Agent',
  description: 'A helpful calendar assistant that can view, analyze, and help manage your schedule',
  instructions: ({ runtimeContext }) => {
    const userId = runtimeContext?.get('userId');
    return {
      role: 'system',
      content: `You are a helpful calendar assistant. You help users manage their schedule efficiently.

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
            thinkingLevel: 'low',
            includeThoughts: true,
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT', 'IMAGE'],
        },
      },
    };
  },
  model: googleAIFlashLite,
  memory: pgMemory,
  tools: {
    listEvents,
    getTodayEvents,
    getUpcomingEvents,
    findFreeSlots,
  },
  options: { tracingPolicy: { internal: InternalSpans.AGENT } },
});
