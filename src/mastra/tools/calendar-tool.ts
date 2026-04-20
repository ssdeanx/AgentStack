import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

import { log } from '../config/logger'
import { BaseToolRequestContext } from './request-context.utils'
import { RequestContext } from '@mastra/core/request-context'


export interface CalendarEvent {
    title: string
    startDate: Date
    endDate: Date
    location?: string
    description?: string
}

type CalendarDataFormat = 'auto' | 'json' | 'ics'

const calendarAnnotations = {
    title: 'Calendar Data Lookup',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
} as const

const calendarEventOutputSchema = z.object({
    title: z.string(),
    startDate: z.iso.datetime({ offset: true }),
    endDate: z.iso.datetime({ offset: true }),
    location: z.string().optional(),
    description: z.string().optional(),
})

const calendarDataItemSchema = z.object({
    title: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    location: z.string().optional(),
    description: z.string().optional(),
})

const calendarDataInputSchema = z.object({
    calendarData: z.string().optional(),
    calendarFormat: z.enum(['auto', 'json', 'ics']).optional().default('auto'),
})

const calendarDateInputSchema = z.union([
    z.iso.datetime({ offset: true }),
    z.iso.date(),
])

const listEventsOutputSchema = z.object({
    content: z.string(),
    events: z.array(calendarEventOutputSchema).optional(),
    count: z.number().int().nonnegative().optional(),
})

const calendarEventListSchema = z.object({
    events: z.array(calendarEventOutputSchema),
    count: z.number().int().nonnegative(),
})

const freeSlotSchema = z.object({
    start: z.iso.datetime({ offset: true }),
    end: z.iso.datetime({ offset: true }),
    durationMinutes: z.number().int().positive(),
})

const busyPeriodSchema = z.object({
    title: z.string(),
    start: z.iso.datetime({ offset: true }),
    end: z.iso.datetime({ offset: true }),
})

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function parseCalendarDate(value: string): Date {
    const trimmed = value.trim()
    if (!trimmed) {
        return new Date('')
    }

    const dateOnly = trimmed.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/)
    if (dateOnly) {
        const [, year, month, day] = dateOnly
        return new Date(Number(year), Number(month) - 1, Number(day))
    }

    const compactDateOnly = trimmed.match(/^([0-9]{4})([0-9]{2})([0-9]{2})$/)
    if (compactDateOnly) {
        const [, year, month, day] = compactDateOnly
        return new Date(Number(year), Number(month) - 1, Number(day))
    }

    return new Date(trimmed)
}

function normalizeCalendarEvent(candidate: unknown): CalendarEvent | null {
    const parsed = calendarDataItemSchema.safeParse(candidate)
    if (!parsed.success) {
        return null
    }

    const title = parsed.data.title.trim()
    const startDate = parseCalendarDate(parsed.data.startDate)
    const endDate = parseCalendarDate(parsed.data.endDate ?? parsed.data.startDate)

    if (
        !title ||
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime())
    ) {
        return null
    }

    return {
        title,
        startDate,
        endDate,
        location: parsed.data.location?.trim() || undefined,
        description: parsed.data.description?.trim() || undefined,
    }
}

function sortCalendarEvents(events: Array<CalendarEvent>): CalendarEvent[] {
    return [...events].sort(
        (left, right) => left.startDate.getTime() - right.startDate.getTime()
    )
}

function parseCalendarJsonEvents(jsonContent: string): CalendarEvent[] {
    const trimmed = jsonContent.trim()
    if (!trimmed) {
        return []
    }

    let parsed: unknown
    try {
        parsed = JSON.parse(trimmed) as unknown
    } catch (error) {
        log.warn('Failed to parse calendar JSON data', {
            error: error instanceof Error ? error.message : String(error),
        })
        return []
    }

    const candidates = Array.isArray(parsed)
        ? parsed
        : isRecord(parsed) && Array.isArray(parsed.events)
          ? parsed.events
          : parsed && typeof parsed === 'object'
            ? [parsed]
            : []

    return sortCalendarEvents(
        candidates.flatMap((candidate) => {
            const event = normalizeCalendarEvent(candidate)
            return event ? [event] : []
        })
    )
}

function parseIcsDate(rawValue: string): Date {
    const value = rawValue.trim()
    if (!value) {
        return new Date('')
    }

    const isUtc = value.endsWith('Z')
    const normalizedValue = isUtc ? value.slice(0, -1) : value

    const dateOnly = normalizedValue.match(/^([0-9]{4})([0-9]{2})([0-9]{2})$/)
    if (dateOnly) {
        const [, year, month, day] = dateOnly
        return new Date(Number(year), Number(month) - 1, Number(day))
    }

    const dateTime = normalizedValue.match(
        /^([0-9]{4})([0-9]{2})([0-9]{2})T([0-9]{2})([0-9]{2})([0-9]{2})?$/
    )
    if (dateTime) {
        const [, year, month, day, hour, minute, second = '0'] = dateTime
        if (isUtc) {
            return new Date(
                Date.UTC(
                    Number(year),
                    Number(month) - 1,
                    Number(day),
                    Number(hour),
                    Number(minute),
                    Number(second)
                )
            )
        }

        return new Date(
            Number(year),
            Number(month) - 1,
            Number(day),
            Number(hour),
            Number(minute),
            Number(second)
        )
    }

    return new Date(value)
}

function unescapeIcsText(value: string): string {
    return value
        .replace(/\\n/gi, '\n')
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\\\/g, '\\')
}

function getIcsLineValue(line: string): string {
    const separatorIndex = line.indexOf(':')
    return separatorIndex === -1 ? '' : line.slice(separatorIndex + 1)
}

function unfoldIcsLines(content: string): Array<string> {
    const lines = content.replace(/\r\n/g, '\n').split('\n')
    const unfolded: Array<string> = []

    for (const line of lines) {
        if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
            unfolded[unfolded.length - 1] += line.slice(1)
        } else {
            unfolded.push(line)
        }
    }

    return unfolded
}

export function parseIcsCalendarEvents(icsContent: string): CalendarEvent[] {
    const events: Array<CalendarEvent> = []
    const lines = unfoldIcsLines(icsContent)

    let currentEvent: Partial<CalendarEvent> = {}
    let inEvent = false

    for (const line of lines) {
        if (line === 'BEGIN:VEVENT') {
            currentEvent = {}
            inEvent = true
            continue
        }

        if (line === 'END:VEVENT') {
            if (inEvent && currentEvent.title && currentEvent.startDate) {
                events.push({
                    title: currentEvent.title,
                    startDate: currentEvent.startDate,
                    endDate: currentEvent.endDate ?? currentEvent.startDate,
                    location: currentEvent.location,
                    description: currentEvent.description,
                })
            }

            currentEvent = {}
            inEvent = false
            continue
        }

        if (!inEvent) {
            continue
        }

        if (line.startsWith('SUMMARY')) {
            currentEvent.title = unescapeIcsText(getIcsLineValue(line).trim())
            continue
        }

        if (line.startsWith('DTSTART')) {
            currentEvent.startDate = parseIcsDate(getIcsLineValue(line))
            continue
        }

        if (line.startsWith('DTEND')) {
            currentEvent.endDate = parseIcsDate(getIcsLineValue(line))
            continue
        }

        if (line.startsWith('LOCATION')) {
            currentEvent.location = unescapeIcsText(getIcsLineValue(line).trim())
            continue
        }

        if (line.startsWith('DESCRIPTION')) {
            currentEvent.description = unescapeIcsText(getIcsLineValue(line).trim())
        }
    }

    return sortCalendarEvents(events)
}

export function resolveCalendarEvents(
    calendarData?: string,
    calendarFormat: CalendarDataFormat = 'auto'
): CalendarEvent[] {
    const trimmed = calendarData?.trim() ?? ''
    if (!trimmed) {
        return []
    }

    if (calendarFormat === 'json') {
        return parseCalendarJsonEvents(trimmed)
    }

    if (calendarFormat === 'ics') {
        return parseIcsCalendarEvents(trimmed)
    }

    return trimmed.startsWith('{') || trimmed.startsWith('[')
        ? parseCalendarJsonEvents(trimmed)
        : parseIcsCalendarEvents(trimmed)
}

function createReadOnlyHooks(
    toolLabel: string,
    inputSummary: (input: unknown) => Record<string, unknown>,
    outputSummary: (output: unknown) => Record<string, unknown>
) {
    return {
        onInputStart: ({ toolCallId, messages, abortSignal }: { toolCallId: string; messages?: Array<unknown>; abortSignal?: AbortSignal }) => {
            log.info(`${toolLabel} tool input streaming started`, {
                toolCallId,
                messageCount: messages?.length ?? 0,
                abortSignal: abortSignal?.aborted,
                hook: 'onInputStart',
            })
        },
        onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }: { inputTextDelta: string; toolCallId: string; messages?: Array<unknown>; abortSignal?: AbortSignal }) => {
            log.info(`${toolLabel} tool received input chunk`, {
                toolCallId,
                inputTextDelta,
                messageCount: messages?.length ?? 0,
                abortSignal: abortSignal?.aborted,
                hook: 'onInputDelta',
            })
        },
        onInputAvailable: ({ input, toolCallId, messages, abortSignal }: { input: unknown; toolCallId: string; messages?: Array<unknown>; abortSignal?: AbortSignal }) => {
            log.info(`${toolLabel} tool received input`, {
                toolCallId,
                inputData: inputSummary(input),
                messageCount: messages?.length ?? 0,
                abortSignal: abortSignal?.aborted,
                hook: 'onInputAvailable',
            })
        },
        onOutput: ({ output, toolCallId, toolName, abortSignal }: { output?: unknown; toolCallId: string; toolName: string; abortSignal?: AbortSignal }) => {
            log.info(`${toolLabel} tool completed`, {
                toolCallId,
                toolName,
                outputData: outputSummary(output),
                abortSignal: abortSignal?.aborted,
                hook: 'onOutput',
            })
        },
    }
}

export const listEvents = createTool({
    id: 'listEvents',
    description: 'List calendar events from provided calendar data within a date range',
    strict: true,
    inputSchema: calendarDataInputSchema.extend({
        startDate: calendarDateInputSchema.describe('Start date filter (ISO date or datetime string)'),
    }),
    outputSchema: listEventsOutputSchema,
    mcp: { annotations: calendarAnnotations },
    execute: async (inputData, context) => {
        const writer = context.writer
        const requestContext = context.requestContext as
            | RequestContext<BaseToolRequestContext>
            | undefined
        const span = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'calendar-list-events',
            input: inputData,
            metadata: {
                'tool.id': 'calendar-list-events',
                'tool.input.startDate': inputData.startDate,
                'user.id': requestContext?.all.userId,
                'workspace.id': requestContext?.all.workspaceId,
            },
            requestContext: context.requestContext,
            tracingContext: context.tracingContext,
        })

        await writer?.custom({
            type: 'data-tool-progress',
            transient: true,
            data: {
                status: 'in-progress',
                message: '📅 Reading calendar data',
                stage: 'listEvents',
            },
            id: 'listEvents',
        })

        try {
            const requestedStartDate = new Date(inputData.startDate)
            const events = resolveCalendarEvents(
                inputData.calendarData,
                inputData.calendarFormat ?? 'auto'
            ).filter((event) => event.startDate >= requestedStartDate)

            const formattedEvents = events.map((event) => ({
                title: event.title,
                startDate: event.startDate.toISOString(),
                endDate: event.endDate.toISOString(),
                location: event.location,
                description: event.description,
            }))

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Found ${String(events.length)} events`,
                    stage: 'listEvents',
                },
                id: 'listEvents',
            })
            span?.update({
                output: { eventCount: events.length },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.eventCount': events.length,
                },
            })
            span?.end()

            return {
                content: JSON.stringify(formattedEvents, null, 2),
                events: formattedEvents,
                count: events.length,
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            log.error(`Calendar read failed: ${errorMsg}`)
            span?.error({
                error: error instanceof Error ? error : new Error(errorMsg),
                endSpan: true,
            })
            return { content: `Error: ${errorMsg}` }
        }
    },
    toModelOutput: (output) => ({
        type: 'json',
        value: {
            count: output.count,
            titles: output.events?.slice(0, 5).map((event) => event.title) ?? [],
        },
    }),
    ...createReadOnlyHooks(
        'Calendar list events',
        (input) => (isRecord(input) ? { startDate: input.startDate } : {}),
        (output) => (isRecord(output) ? { count: output.count ?? 0 } : { count: 0 })
    ),
})

export const getTodayEvents = createTool({
    id: 'getTodayEvents',
    description: 'Get all calendar events for today from provided calendar data',
    strict: true,
    inputSchema: calendarDataInputSchema,
    outputSchema: calendarEventListSchema,
    mcp: { annotations: calendarAnnotations },
    execute: async (inputData, context) => {
        const writer = context.writer
        const requestContext = context.requestContext as
            | RequestContext<BaseToolRequestContext>
            | undefined
        const span = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'calendar-today-events',
            input: inputData,
            metadata: {
                'tool.id': 'calendar-today-events',
                'user.id': requestContext?.all.userId,
                'workspace.id': requestContext?.all.workspaceId,
            },
            requestContext: context.requestContext,
        })

        await writer?.write({
            type: 'progress',
            data: { message: '📅 Getting today\'s events...' },
        })

        try {
            const allEvents = resolveCalendarEvents(
                inputData.calendarData,
                inputData.calendarFormat ?? 'auto'
            )
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const tomorrow = new Date(today)
            tomorrow.setDate(tomorrow.getDate() + 1)

            const todayEvents = allEvents.filter((event) => {
                const eventStart = new Date(event.startDate)
                return eventStart >= today && eventStart < tomorrow
            })

            const formattedEvents = todayEvents.map((event) => ({
                title: event.title,
                startDate: event.startDate.toISOString(),
                endDate: event.endDate.toISOString(),
                location: event.location,
                description: event.description,
            }))

            await writer?.write({
                type: 'progress',
                data: {
                    message: `✅ Found ${String(todayEvents.length)} events for today`,
                },
            })
            span?.update({
                output: { eventCount: todayEvents.length },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.eventCount': todayEvents.length,
                },
            })
            span?.end()

            return { events: formattedEvents, count: todayEvents.length }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            log.error(`Today events read failed: ${errorMsg}`)
            span?.error({
                error: error instanceof Error ? error : new Error(errorMsg),
                endSpan: true,
            })
            return { events: [], count: 0 }
        }
    },
    toModelOutput: (output) => ({
        type: 'content',
        value: [
            {
                type: 'text' as const,
                text: `Today's calendar events: ${String(output.count)}`,
            },
            output.events.length
                ? {
                      type: 'text' as const,
                      text: `Titles:\n- ${output.events
                          .slice(0, 5)
                          .map((event) => event.title)
                          .join('\n- ')}`,
                  }
                : undefined,
        ].filter(
            (part): part is { type: 'text'; text: string } => Boolean(part)
        ),
    }),
    ...createReadOnlyHooks(
        'Today events',
        () => ({}),
        (output) => (isRecord(output) ? { count: output.count ?? 0 } : { count: 0 })
    ),
})

export const getUpcomingEvents = createTool({
    id: 'getUpcomingEvents',
    description: 'Get upcoming calendar events within a specified number of days',
    strict: true,
    inputSchema: calendarDataInputSchema.extend({
        days: z.number().int().positive().max(365).default(7),
        limit: z.number().int().positive().max(100).default(10),
    }),
    outputSchema: z.object({
        events: z.array(
            z.object({
                title: z.string(),
                startDate: z.string().datetime({ offset: true }),
                endDate: z.string().datetime({ offset: true }),
                location: z.string().optional(),
                description: z.string().optional(),
                daysFromNow: z.number().int().nonnegative(),
            })
        ),
        count: z.number().int().nonnegative(),
    }),
    mcp: { annotations: calendarAnnotations },
    execute: async (inputData, context) => {
        const writer = context.writer
        const requestContext = context.requestContext as
            | RequestContext<BaseToolRequestContext>
            | undefined
        const span = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'calendar-upcoming-events',
            input: inputData,
            metadata: {
                'tool.id': 'calendar-upcoming-events',
                'tool.input.days': inputData.days,
                'tool.input.limit': inputData.limit,
                'user.id': requestContext?.all.userId,
                'workspace.id': requestContext?.all.workspaceId,
            },
            requestContext: context.requestContext,
        })

        await writer?.write({
            type: 'progress',
            data: { message: '📅 Looking ahead for upcoming events...' },
        })

        try {
            const allEvents = resolveCalendarEvents(
                inputData.calendarData,
                inputData.calendarFormat ?? 'auto'
            )
            const now = new Date()
            const futureDate = new Date(now)
            futureDate.setDate(futureDate.getDate() + inputData.days)

            const upcomingEvents = allEvents
                .filter((event) => event.startDate >= now && event.startDate <= futureDate)
                .slice(0, inputData.limit)

            const formattedEvents = upcomingEvents.map((event) => {
                const diffTime = event.startDate.getTime() - now.getTime()
                const daysFromNow = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

                return {
                    title: event.title,
                    startDate: event.startDate.toISOString(),
                    endDate: event.endDate.toISOString(),
                    location: event.location,
                    description: event.description,
                    daysFromNow,
                }
            })

            await writer?.write({
                type: 'progress',
                data: {
                    message: `✅ Found ${String(upcomingEvents.length)} upcoming events`,
                },
            })
            span?.update({
                output: { eventCount: upcomingEvents.length },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.eventCount': upcomingEvents.length,
                },
            })
            span?.end()

            return { events: formattedEvents, count: upcomingEvents.length }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            log.error(`Upcoming events read failed: ${errorMsg}`)
            span?.error({
                error: error instanceof Error ? error : new Error(errorMsg),
                endSpan: true,
            })
            return { events: [], count: 0 }
        }
    },
    toModelOutput: (output) => ({
        type: 'content',
        value: [
            {
                type: 'text' as const,
                text: `Upcoming events found: ${String(output.count)}`,
            },
            output.events.length
                ? {
                      type: 'text' as const,
                      text: `Titles:\n- ${output.events
                          .slice(0, 5)
                          .map((event) => event.title)
                          .join('\n- ')}`,
                  }
                : undefined,
        ].filter(
            (part): part is { type: 'text'; text: string } => Boolean(part)
        ),
    }),
    ...createReadOnlyHooks(
        'Upcoming events',
        (input) => (isRecord(input) ? { days: input.days, limit: input.limit } : {}),
        (output) => (isRecord(output) ? { count: output.count ?? 0 } : { count: 0 })
    ),
})

export const findFreeSlots = createTool({
    id: 'findFreeSlots',
    description: 'Find free time slots in provided calendar data for scheduling',
    strict: true,
    inputSchema: calendarDataInputSchema.extend({
        date: calendarDateInputSchema,
        workdayStart: z.number().int().min(0).max(23).optional().default(9),
        workdayEnd: z.number().int().min(0).max(23).optional().default(17),
        minimumSlotMinutes: z.number().int().positive().optional().default(30),
    }),
    outputSchema: z.object({
        freeSlots: z.array(freeSlotSchema),
        busyPeriods: z.array(busyPeriodSchema),
    }),
    mcp: { annotations: calendarAnnotations },
    execute: async (inputData, context) => {
        const writer = context.writer
        const requestContext = context.requestContext as
            | RequestContext<BaseToolRequestContext>
            | undefined
        const span = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'calendar-free-slots',
            input: inputData,
            metadata: {
                'tool.id': 'calendar-free-slots',
                'tool.input.date': inputData.date,
                'user.id': requestContext?.all.userId,
                'workspace.id': requestContext?.all.workspaceId,
            },
            requestContext: context.requestContext,
        })

        await writer?.write({
            type: 'progress',
            data: { message: '📅 Finding free time slots...' },
        })

        try {
            const allEvents = resolveCalendarEvents(
                inputData.calendarData,
                inputData.calendarFormat ?? 'auto'
            )
            const targetDate = new Date(inputData.date)
            targetDate.setHours(0, 0, 0, 0)

            const nextDay = new Date(targetDate)
            nextDay.setDate(nextDay.getDate() + 1)

            const dayEvents = allEvents
                .filter((event) => event.startDate >= targetDate && event.startDate < nextDay)
                .sort((left, right) => left.startDate.getTime() - right.startDate.getTime())

            const workStart = new Date(targetDate)
            workStart.setHours(inputData.workdayStart ?? 9, 0, 0, 0)

            const workEnd = new Date(targetDate)
            workEnd.setHours(inputData.workdayEnd ?? 17, 0, 0, 0)

            const freeSlots: Array<{ start: string; end: string; durationMinutes: number }> = []
            const busyPeriods: Array<{ title: string; start: string; end: string }> = []

            let currentTime = workStart

            for (const event of dayEvents) {
                const eventStart = new Date(event.startDate)
                const eventEnd = new Date(event.endDate)

                if (eventStart > currentTime) {
                    const slotDuration =
                        (eventStart.getTime() - currentTime.getTime()) / (1000 * 60)
                    if (slotDuration >= (inputData.minimumSlotMinutes ?? 30)) {
                        freeSlots.push({
                            start: currentTime.toISOString(),
                            end: eventStart.toISOString(),
                            durationMinutes: Math.round(slotDuration),
                        })
                    }
                }

                busyPeriods.push({
                    title: event.title || 'Busy',
                    start: eventStart.toISOString(),
                    end: eventEnd.toISOString(),
                })

                if (eventEnd > currentTime) {
                    currentTime = eventEnd
                }
            }

            if (currentTime < workEnd) {
                const slotDuration = (workEnd.getTime() - currentTime.getTime()) / (1000 * 60)
                if (slotDuration >= (inputData.minimumSlotMinutes ?? 30)) {
                    freeSlots.push({
                        start: currentTime.toISOString(),
                        end: workEnd.toISOString(),
                        durationMinutes: Math.round(slotDuration),
                    })
                }
            }

            await writer?.write({
                type: 'progress',
                data: { message: `✅ Found ${String(freeSlots.length)} free slots` },
            })
            span?.update({
                output: { freeSlotCount: freeSlots.length },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.freeSlotCount': freeSlots.length,
                },
            })
            span?.end()

            return { freeSlots, busyPeriods }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            log.error(`Free slots search failed: ${errorMsg}`)
            span?.error({
                error: error instanceof Error ? error : new Error(errorMsg),
                endSpan: true,
            })
            return { freeSlots: [], busyPeriods: [] }
        }
    },
    toModelOutput: (output) => ({
        type: 'content',
        value: [
            {
                type: 'text' as const,
                text: `Free slots found: ${String(output.freeSlots.length)}; busy periods: ${String(output.busyPeriods.length)}`,
            },
            output.freeSlots.length
                ? {
                      type: 'text' as const,
                      text: `First free slots:\n- ${output.freeSlots
                          .slice(0, 3)
                          .map(
                              (slot) =>
                                  `${slot.start} → ${slot.end} (${String(slot.durationMinutes)} min)`
                          )
                          .join('\n- ')}`,
                  }
                : undefined,
        ].filter(
            (part): part is { type: 'text'; text: string } => Boolean(part)
        ),
    }),
    ...createReadOnlyHooks(
        'Find free slots',
        (input) => (isRecord(input) ? { date: input.date } : {}),
        (output) =>
            isRecord(output)
                ? {
                      freeSlotCount: Array.isArray(output.freeSlots)
                          ? output.freeSlots.length
                          : 0,
                  }
                : { freeSlotCount: 0 }
    ),
})
