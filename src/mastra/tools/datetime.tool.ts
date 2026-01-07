import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { trace } from '@opentelemetry/api'
import { z } from 'zod'
import { log } from '../config/logger'

// Define the Zod schema for the runtime context
const dateTimeToolContextSchema = z.object({
    defaultTimezone: z.string().default('UTC'),
    defaultLocale: z.string().default('en-US'),
    allowFutureDates: z.boolean().default(true),
})

// Infer the TypeScript type from the Zod schema
export type DateTimeToolContext = z.infer<typeof dateTimeToolContextSchema>

export const dateTimeTool = createTool({
    id: 'datetime',
    description: 'Parse, format, and manipulate dates and times',
    inputSchema: z.object({
        operation: z
            .enum([
                'parse',
                'format',
                'add',
                'subtract',
                'diff',
                'now',
                'validate',
            ])
            .describe('Date/time operation to perform'),
        input: z
            .string()
            .optional()
            .describe('Input date/time string for parse/format operations'),
        format: z
            .string()
            .optional()
            .describe(
                'Output format (e.g., "YYYY-MM-DD", "MM/DD/YYYY HH:mm:ss")'
            ),
        amount: z
            .number()
            .optional()
            .describe('Amount for add/subtract operations'),
        unit: z
            .enum([
                'years',
                'months',
                'weeks',
                'days',
                'hours',
                'minutes',
                'seconds',
                'milliseconds',
            ])
            .optional()
            .describe('Time unit for calculations'),
        fromDate: z
            .string()
            .optional()
            .describe('Start date for diff operation'),
        toDate: z.string().optional().describe('End date for diff operation'),
        timezone: z
            .string()
            .optional()
            .describe(
                'Timezone for operations (e.g., "America/New_York", "UTC")'
            ),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        result: z
            .union([
                z.string(),
                z.number(),
                z.boolean(),
                z.object({
                    years: z.number().optional(),
                    months: z.number().optional(),
                    days: z.number().optional(),
                    hours: z.number().optional(),
                    minutes: z.number().optional(),
                    seconds: z.number().optional(),
                }),
            ])
            .nullable(),
        operation: z.string(),
        input: z.string().optional(),
        message: z.string().optional(),
    }),
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('DateTime tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            hook: 'onInputStart',
            abortSignal: abortSignal?.aborted,
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('DateTime tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            hook: 'onInputDelta',
            abortSignal: abortSignal?.aborted,
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('DateTime tool received complete input', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            inputData: {
                operation: input.operation,
                input: input.input,
                format: input.format,
            },
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('DateTime tool completed', {
            toolCallId,
            toolName,
            abortSignal: abortSignal?.aborted,
            outputData: {
                success: output.success,
                operation: output.operation,
            },
            hook: 'onOutput',
        })
    },
    execute: async (inputData, context) => {
        const writer = context?.writer
        const requestContext = context?.requestContext

        const { defaultTimezone, defaultLocale } =
            dateTimeToolContextSchema.parse(
                requestContext?.get('dateTimeToolContext')
            )

        const tracer = trace.getTracer('datetime-tool', '1.0.0')
        const span = tracer.startSpan('datetime-operation', {
            attributes: {
                'tool.id': 'datetime',
                'tool.input.operation': inputData.operation,
                'tool.input.input': inputData.input,
            },
        })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `📅 Performing ${inputData.operation} operation...`,
                stage: 'datetime',
            },
            id: 'datetime',
        })

        try {
            let result: any

            switch (inputData.operation) {
                case 'now': {
                    const now = new Date()
                    result = now.toISOString()
                    break
                }

                case 'parse': {
                    if (!inputData.input) {
                        throw new Error(
                            'Input date string required for parse operation'
                        )
                    }
                    const parsed = new Date(inputData.input)
                    if (isNaN(parsed.getTime())) {
                        throw new Error(
                            `Invalid date format: ${inputData.input}`
                        )
                    }
                    result = parsed.toISOString()
                    break
                }

                case 'format': {
                    if (!inputData.input) {
                        throw new Error(
                            'Input date string required for format operation'
                        )
                    }
                    if (!inputData.format) {
                        throw new Error(
                            'Format string required for format operation'
                        )
                    }

                    const date = new Date(inputData.input)
                    if (isNaN(date.getTime())) {
                        throw new Error(`Invalid date: ${inputData.input}`)
                    }

                    result = formatDate(date, inputData.format)
                    break
                }

                case 'add': {
                    if (!inputData.input) {
                        throw new Error(
                            'Input date string required for add operation'
                        )
                    }
                    if (inputData.amount === undefined || !inputData.unit) {
                        throw new Error(
                            'Amount and unit required for add operation'
                        )
                    }

                    const date = new Date(inputData.input)
                    if (isNaN(date.getTime())) {
                        throw new Error(`Invalid date: ${inputData.input}`)
                    }

                    const newDate = addTime(
                        date,
                        inputData.amount,
                        inputData.unit
                    )
                    result = newDate.toISOString()
                    break
                }

                case 'subtract': {
                    if (!inputData.input) {
                        throw new Error(
                            'Input date string required for subtract operation'
                        )
                    }
                    if (inputData.amount === undefined || !inputData.unit) {
                        throw new Error(
                            'Amount and unit required for subtract operation'
                        )
                    }

                    const date = new Date(inputData.input)
                    if (isNaN(date.getTime())) {
                        throw new Error(`Invalid date: ${inputData.input}`)
                    }

                    const newDate = addTime(
                        date,
                        -inputData.amount,
                        inputData.unit
                    )
                    result = newDate.toISOString()
                    break
                }

                case 'diff': {
                    if (!inputData.fromDate || !inputData.toDate) {
                        throw new Error(
                            'Both fromDate and toDate required for diff operation'
                        )
                    }

                    const from = new Date(inputData.fromDate)
                    const to = new Date(inputData.toDate)

                    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
                        throw new Error('Invalid date format in diff operation')
                    }

                    result = calculateDateDiff(from, to)
                    break
                }

                case 'validate': {
                    if (!inputData.input) {
                        throw new Error(
                            'Input date string required for validate operation'
                        )
                    }

                    const date = new Date(inputData.input)
                    result = !isNaN(date.getTime())
                    break
                }

                default:
                    throw new Error(`Unknown operation: ${inputData.operation}`)
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ DateTime ${inputData.operation} completed`,
                    stage: 'datetime',
                },
                id: 'datetime',
            })

            span.setAttributes({
                'tool.output.success': true,
                'tool.output.operation': inputData.operation,
            })
            span.end()

            return {
                success: true,
                result,
                operation: inputData.operation,
                input: inputData.input,
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)
            log.error(`DateTime operation failed: ${errorMsg}`)

            if (e instanceof Error) {
                span.recordException(e)
            }
            span.setStatus({ code: 2, message: errorMsg })
            span.end()

            return {
                success: false,
                result: null,
                operation: inputData.operation,
                input: inputData.input,
                message: errorMsg,
            }
        }
    },
})

export const timeZoneTool = createTool({
    id: 'timezone',
    description: 'Convert times between timezones and get timezone information',
    inputSchema: z.object({
        operation: z
            .enum(['convert', 'list', 'info'])
            .describe('Timezone operation'),
        fromTimezone: z.string().optional().describe('Source timezone'),
        toTimezone: z.string().optional().describe('Target timezone'),
        dateTime: z.string().optional().describe('Date/time to convert'),
        timezone: z.string().optional().describe('Timezone for info operation'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        result: z
            .union([
                z.string(),
                z.array(z.string()),
                z.object({
                    name: z.string(),
                    offset: z.string(),
                    abbreviation: z.string(),
                    dst: z.boolean(),
                }),
            ])
            .nullable(),
        operation: z.string(),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const writer = context?.writer

        const tracer = trace.getTracer('timezone-tool', '1.0.0')
        const span = tracer.startSpan('timezone-operation', {
            attributes: {
                'tool.id': 'timezone',
                'tool.input.operation': inputData.operation,
            },
        })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🌍 Performing timezone ${inputData.operation}...`,
                stage: 'timezone',
            },
            id: 'timezone',
        })

        try {
            let result: any

            switch (inputData.operation) {
                case 'convert': {
                    if (
                        !inputData.dateTime ||
                        !inputData.fromTimezone ||
                        !inputData.toTimezone
                    ) {
                        throw new Error(
                            'dateTime, fromTimezone, and toTimezone required for convert operation'
                        )
                    }

                    const date = new Date(inputData.dateTime)
                    if (isNaN(date.getTime())) {
                        throw new Error(
                            `Invalid date/time: ${inputData.dateTime}`
                        )
                    }

                    result = convertTimezone(
                        date,
                        inputData.fromTimezone,
                        inputData.toTimezone
                    )
                    break
                }

                case 'list': {
                    result = getAvailableTimezones()
                    break
                }

                case 'info': {
                    if (!inputData.timezone) {
                        throw new Error('Timezone required for info operation')
                    }

                    result = getTimezoneInfo(inputData.timezone)
                    break
                }

                default:
                    throw new Error(`Unknown operation: ${inputData.operation}`)
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Timezone ${inputData.operation} completed`,
                    stage: 'timezone',
                },
                id: 'timezone',
            })

            span.setAttributes({
                'tool.output.success': true,
                'tool.output.operation': inputData.operation,
            })
            span.end()

            return {
                success: true,
                result,
                operation: inputData.operation,
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)
            log.error(`Timezone operation failed: ${errorMsg}`)

            if (e instanceof Error) {
                span.recordException(e)
            }
            span.setStatus({ code: 2, message: errorMsg })
            span.end()

            return {
                success: false,
                result: null,
                operation: inputData.operation,
                message: errorMsg,
            }
        }
    },
})

// Helper functions
function formatDate(date: Date, format: string): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    return format
        .replace(/YYYY/g, String(year))
        .replace(/MM/g, month)
        .replace(/DD/g, day)
        .replace(/HH/g, hours)
        .replace(/mm/g, minutes)
        .replace(/ss/g, seconds)
}

function addTime(date: Date, amount: number, unit: string): Date {
    const newDate = new Date(date)

    switch (unit) {
        case 'years':
            newDate.setFullYear(newDate.getFullYear() + amount)
            break
        case 'months':
            newDate.setMonth(newDate.getMonth() + amount)
            break
        case 'weeks':
            newDate.setDate(newDate.getDate() + amount * 7)
            break
        case 'days':
            newDate.setDate(newDate.getDate() + amount)
            break
        case 'hours':
            newDate.setHours(newDate.getHours() + amount)
            break
        case 'minutes':
            newDate.setMinutes(newDate.getMinutes() + amount)
            break
        case 'seconds':
            newDate.setSeconds(newDate.getSeconds() + amount)
            break
        case 'milliseconds':
            newDate.setMilliseconds(newDate.getMilliseconds() + amount)
            break
        default:
            throw new Error(`Unknown time unit: ${unit}`)
    }

    return newDate
}

function calculateDateDiff(from: Date, to: Date) {
    const diffMs = to.getTime() - from.getTime()

    const years = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25))
    const months = Math.floor(
        (diffMs % (1000 * 60 * 60 * 24 * 365.25)) /
            (1000 * 60 * 60 * 24 * 30.44)
    )
    const days = Math.floor(
        (diffMs % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24)
    )
    const hours = Math.floor(
        (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    )
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)

    return {
        years: years || undefined,
        months: months || undefined,
        days: days || undefined,
        hours: hours || undefined,
        minutes: minutes || undefined,
        seconds: seconds || undefined,
    }
}

function convertTimezone(date: Date, fromTz: string, toTz: string): string {
    // For now, we'll use a simple approach. In a real implementation,
    // you'd want to use a proper timezone library like 'date-fns-tz' or 'luxon'
    // This is a simplified version that assumes UTC offsets

    // Get timezone offsets (this is approximate and not production-ready)
    const fromOffset = getTimezoneOffset(fromTz)
    const toOffset = getTimezoneOffset(toTz)

    const utcTime = date.getTime() - fromOffset * 60 * 1000
    const targetTime = utcTime + toOffset * 60 * 1000

    return new Date(targetTime).toISOString()
}

function getTimezoneOffset(timezone: string): number {
    // Simplified timezone offset mapping (not comprehensive)
    const offsets: Record<string, number> = {
        UTC: 0,
        'America/New_York': -5, // EST, -4 for EDT
        'America/Los_Angeles': -8, // PST, -7 for PDT
        'Europe/London': 0, // GMT, +1 for BST
        'Europe/Paris': 1, // CET, +2 for CEST
        'Asia/Tokyo': 9,
        'Australia/Sydney': 10, // AEDT, +11 for AEDT
    }

    return offsets[timezone] || 0
}

function getAvailableTimezones(): string[] {
    // Return a list of common timezones
    return [
        'UTC',
        'America/New_York',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Paris',
        'Asia/Tokyo',
        'Australia/Sydney',
        'Asia/Shanghai',
        'Asia/Kolkata',
        'Pacific/Auckland',
    ]
}

function getTimezoneInfo(timezone: string) {
    const offset = getTimezoneOffset(timezone)
    const now = new Date()
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000
    const localTime = utcTime + offset * 60 * 60 * 1000
    const localDate = new Date(localTime)

    // Determine if DST (simplified - checks if offset differs from standard)
    const isDST = Math.abs(offset) > Math.abs(getTimezoneOffset(timezone))

    return {
        name: timezone,
        offset: `UTC${offset >= 0 ? '+' : ''}${offset}`,
        abbreviation: getTimezoneAbbrev(timezone, isDST),
        dst: isDST,
    }
}

function getTimezoneAbbrev(timezone: string, isDST: boolean): string {
    const abbrevs: Record<string, string> = {
        UTC: 'UTC',
        'America/New_York': isDST ? 'EDT' : 'EST',
        'America/Los_Angeles': isDST ? 'PDT' : 'PST',
        'Europe/London': isDST ? 'BST' : 'GMT',
        'Europe/Paris': isDST ? 'CEST' : 'CET',
        'Asia/Tokyo': 'JST',
        'Australia/Sydney': isDST ? 'AEDT' : 'AEST',
    }

    return abbrevs[timezone] || 'UTC'
}

export type DateTimeUITool = InferUITool<typeof dateTimeTool>
export type TimeZoneUITool = InferUITool<typeof timeZoneTool>
