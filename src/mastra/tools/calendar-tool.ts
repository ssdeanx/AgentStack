import { AISpanType, InternalSpans } from '@mastra/core/ai-tracing';
import { createTool } from "@mastra/core/tools";
import { execSync } from 'child_process';
import { z } from 'zod';
import { log } from '../config/logger';

interface CalendarEvent {
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  description?: string;
}

class LocalCalendarReader {
  async getEvents(): Promise<CalendarEvent[]> {
    const script = `
          tell application "Calendar"
            set eventList to {}
            set startDate to (current date) - 7 * days
            set endDate to (current date) + 365 * days

            repeat with calendarAccount in calendars
              set eventList to eventList & (every event of calendarAccount whose start date is greater than or equal to startDate and start date is less than or equal to endDate)
            end repeat

            set output to ""
            repeat with anEvent in eventList
              set theTitle to summary of anEvent
              set theStart to start date of anEvent as string
              set theEnd to end date of anEvent as string
              set theLoc to location of anEvent
              set theDesc to description of anEvent

              if theLoc is missing value then
                set theLoc to ""
              end if
              if theDesc is missing value then
                set theDesc to ""
              end if

              set output to output & theTitle & "|" & theStart & "|" & theEnd & "|" & theLoc & "|" & theDesc & "
    "
            end repeat

            return output
          end tell
        `;

    try {
      const result = execSync(`osascript -e '${script}'`).toString();
      return this.parseAppleScriptOutput(result);
    } catch (error) {
      if (error instanceof Error) {
        log.info(`Raw AppleScript error: ${error.message}`);
        throw new Error(`Failed to read Mac calendar: ${error.message}`);
      } else {
        log.info('An unknown error occurred');
        throw new Error('Failed to read Mac calendar');
      }
    }
  }

  private parseAppleScriptOutput(output: string): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    const lines = output.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const [title, startDateStr, endDateStr, location, description] = line.split('|');

        const startStandardized = startDateStr
          ?.split(',')?.[1] // Remove day name
          ?.replace(' at ', ' ') // Remove 'at'
          ?.trim(); // 'January 3, 2025 9:00:00 AM'

        const startDate = new Date(startStandardized || '');

        const endStandardized = endDateStr
          ?.split(',')?.[1] // Remove day name
          ?.replace(' at ', ' ') // Remove 'at'
          ?.trim(); // 'January 3, 2025 9:00:00 AM'
        const endDate = new Date(endStandardized || '');

        const event: CalendarEvent = {
          title: title?.trim(),
          startDate,
          endDate,
          location: location?.trim() || '',
          description: description?.trim() || '',
        };

        events.push(event);
      } catch (error) {
        log.error('Failed to parse event line', {
          line,
          message: (error as Error).message,
        });
      }
    }

    return events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }
}

const reader = new LocalCalendarReader();

export const listEvents = createTool({
  id: 'listEvents',
  description: 'List all calendar events from the local macOS Calendar app within a date range',
  inputSchema: z.object({
    startDate: z.string().describe('Start date filter (ISO string format)'),
  }),
  outputSchema: z.object({
    content: z.string(),
    events: z.array(z.object({
      title: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      location: z.string().optional(),
      description: z.string().optional(),
    })).optional(),
    count: z.number().optional(),
  }),
  execute: async ({ tracingContext, writer, runtimeContext, context }) => {
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'list-calendar-events',
      input: context,
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    await writer?.write({ type: 'progress', data: { message: '📅 Reading local calendar events...' } });
    try {
      const events = await reader.getEvents();

      const formattedEvents = events.map(event => ({
        title: event.title || '',
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        location: event.location,
        description: event.description,
      }));

      log.info(`Found ${events.length} calendar events`);

      await writer?.write({ type: 'progress', data: { message: `✅ Found ${events.length} events` } });
      span?.end({ output: { success: true, eventCount: events.length } });

      return {
        content: JSON.stringify(formattedEvents, null, 2),
        events: formattedEvents,
        count: events.length,
      };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`Calendar read failed: ${errorMsg}`);
      span?.error({ error: e instanceof Error ? e : new Error(errorMsg), endSpan: true });
      return { content: `Error: ${errorMsg}` };
    }
  },
});

export const getTodayEvents = createTool({
  id: 'getTodayEvents',
  description: 'Get all calendar events for today',
  inputSchema: z.object({}),
  outputSchema: z.object({
    events: z.array(z.object({
      title: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      location: z.string().optional(),
      description: z.string().optional(),
    })),
    count: z.number(),
  }),
  execute: async ({ tracingContext, writer, context, runtimeContext }) => {
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'get-today-events',
      input: context,
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    await writer?.write({ type: 'progress', data: { message: '📅 Getting today\'s events...' } });

    try {
      const allEvents = await reader.getEvents();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayEvents = allEvents.filter(event => {
        const eventStart = new Date(event.startDate);
        return eventStart >= today && eventStart < tomorrow;
      });

      const formattedEvents = todayEvents.map(event => ({
        title: event.title || '',
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        location: event.location,
        description: event.description,
      }));

      await writer?.write({ type: 'progress', data: { message: `✅ Found ${todayEvents.length} events for today` } });
      span?.end({ output: { success: true, eventCount: todayEvents.length } });

      return { events: formattedEvents, count: todayEvents.length };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`Today events read failed: ${errorMsg}`);
      span?.error({ error: e instanceof Error ? e : new Error(errorMsg), endSpan: true });
      return { events: [], count: 0 };
    }
  },
});

export const getUpcomingEvents = createTool({
  id: 'getUpcomingEvents',
  description: 'Get upcoming calendar events within a specified number of days',
  inputSchema: z.object({
    days: z.number().default(7).describe('Number of days to look ahead'),
    limit: z.number().optional().default(10).describe('Maximum number of events to return'),
  }),
  outputSchema: z.object({
    events: z.array(z.object({
      title: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      location: z.string().optional(),
      description: z.string().optional(),
      daysFromNow: z.number(),
    })),
    count: z.number(),
  }),
  execute: async ({ context, tracingContext, writer, runtimeContext }) => {
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'get-upcoming-events',
      input: { days: context.days, limit: context.limit },
      tracingPolicy: { internal: InternalSpans.ALL },
      runtimeContext,
    });

    await writer?.write({ type: 'progress', data: { message: `📅 Getting events for next ${context.days} days...` } });

    try {
      const allEvents = await reader.getEvents();
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + (context.days ?? 7));

      const upcomingEvents = allEvents
        .filter(event => {
          const eventStart = new Date(event.startDate);
          return eventStart >= now && eventStart <= futureDate;
        })
        .slice(0, context.limit ?? 10);

      const formattedEvents = upcomingEvents.map(event => {
        const eventDate = new Date(event.startDate);
        const diffTime = eventDate.getTime() - now.getTime();
        const daysFromNow = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          title: event.title || '',
          startDate: event.startDate.toISOString(),
          endDate: event.endDate.toISOString(),
          location: event.location,
          description: event.description,
          daysFromNow,
        };
      });

      await writer?.write({ type: 'progress', data: { message: `✅ Found ${upcomingEvents.length} upcoming events` } });
      span?.end({ output: { success: true, eventCount: upcomingEvents.length } });

      return { events: formattedEvents, count: upcomingEvents.length };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`Upcoming events read failed: ${errorMsg}`);
      span?.error({ error: e instanceof Error ? e : new Error(errorMsg), endSpan: true });
      return { events: [], count: 0 };
    }
  },
});

export const findFreeSlots = createTool({
  id: 'findFreeSlots',
  description: 'Find free time slots in your calendar for scheduling',
  inputSchema: z.object({
    date: z.string().describe('Date to find free slots for (ISO string)'),
    workdayStart: z.number().optional().default(9).describe('Workday start hour (0-23)'),
    workdayEnd: z.number().optional().default(17).describe('Workday end hour (0-23)'),
    minimumSlotMinutes: z.number().optional().default(30).describe('Minimum slot duration in minutes'),
  }),
  outputSchema: z.object({
    freeSlots: z.array(z.object({
      start: z.string(),
      end: z.string(),
      durationMinutes: z.number(),
    })),
    busyPeriods: z.array(z.object({
      title: z.string(),
      start: z.string(),
      end: z.string(),
    })),
  }),
  execute: async ({ context, tracingContext, writer, runtimeContext }) => {
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'find-free-slots',
      input: { date: context.date },
      tracingPolicy: { internal: InternalSpans.ALL },
      runtimeContext,
    });

    await writer?.write({ type: 'progress', data: { message: '📅 Finding free time slots...' } });

    try {
      const allEvents = await reader.getEvents();
      const targetDate = new Date(context.date);
      targetDate.setHours(0, 0, 0, 0);

      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayEvents = allEvents.filter(event => {
        const eventStart = new Date(event.startDate);
        return eventStart >= targetDate && eventStart < nextDay;
      }).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

      const workStart = new Date(targetDate);
      workStart.setHours(context.workdayStart ?? 9, 0, 0, 0);

      const workEnd = new Date(targetDate);
      workEnd.setHours(context.workdayEnd ?? 17, 0, 0, 0);

      const freeSlots: Array<{ start: string; end: string; durationMinutes: number }> = [];
      const busyPeriods: Array<{ title: string; start: string; end: string }> = [];

      let currentTime = workStart;

      for (const event of dayEvents) {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);

        if (eventStart > currentTime) {
          const slotDuration = (eventStart.getTime() - currentTime.getTime()) / (1000 * 60);
          if (slotDuration >= (context.minimumSlotMinutes ?? 30)) {
            freeSlots.push({
              start: currentTime.toISOString(),
              end: eventStart.toISOString(),
              durationMinutes: Math.round(slotDuration),
            });
          }
        }

        busyPeriods.push({
          title: event.title || 'Busy',
          start: eventStart.toISOString(),
          end: eventEnd.toISOString(),
        });

        if (eventEnd > currentTime) {
          currentTime = eventEnd;
        }
      }

      if (currentTime < workEnd) {
        const slotDuration = (workEnd.getTime() - currentTime.getTime()) / (1000 * 60);
        if (slotDuration >= (context.minimumSlotMinutes ?? 30)) {
          freeSlots.push({
            start: currentTime.toISOString(),
            end: workEnd.toISOString(),
            durationMinutes: Math.round(slotDuration),
          });
        }
      }

      await writer?.write({ type: 'progress', data: { message: `✅ Found ${freeSlots.length} free slots` } });
      span?.end({ output: { success: true, freeSlotCount: freeSlots.length } });

      return { freeSlots, busyPeriods };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`Free slots search failed: ${errorMsg}`);
      span?.error({ error: e instanceof Error ? e : new Error(errorMsg), endSpan: true });
      return { freeSlots: [], busyPeriods: [] };
    }
  },
});
