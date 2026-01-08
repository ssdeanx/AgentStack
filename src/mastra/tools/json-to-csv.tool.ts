import type { RequestContext } from '@mastra/core/request-context'
import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { trace } from '@opentelemetry/api'
import { z } from 'zod'
import { log } from '../config/logger'

export interface JsonToCsvRequestContext extends RequestContext {
    csvToolContext?: {
        maxRows?: number
    }
}

export const jsonToCsvTool = createTool({
    id: 'json-to-csv',
    description: 'Convert JSON data to CSV format. Handles arrays of objects.',
    inputSchema: z.object({
        data: z
            .array(z.record(z.string(), z.any()))
            .describe('Array of JSON objects to convert'),
        options: z
            .object({
                delimiter: z
                    .string()
                    .default(',')
                    .describe('CSV delimiter character'),
                includeHeaders: z
                    .boolean()
                    .default(true)
                    .describe('Include header row'),
            })
            .optional()
            .default({
                delimiter: ',',
                includeHeaders: true,
            }),
    }),
    execute: async (input, context) => {
        const writer = context?.writer
        const requestContext = context?.requestContext as JsonToCsvRequestContext | undefined
        const abortSignal = context?.abortSignal

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('JSON to CSV conversion cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `📊 Converting ${input.data.length} JSON records to CSV`,
                stage: 'json-to-csv',
            },
            id: 'json-to-csv',
        })

        const tracer = trace.getTracer('json-to-csv', '1.0.0')
        const rootSpan = tracer.startSpan('json-to-csv', {
            attributes: {
                'tool.id': 'json-to-csv',
                'tool.input.recordCount': input.data.length,
            },
        })

        try {
            const { data, options } = input
            if (data === undefined || data === null || data.length === 0) {
                rootSpan.end()
                return { csv: '' }
            }

            const config = requestContext?.csvToolContext
            const maxRows = config?.maxRows

            if (maxRows !== undefined && data.length > maxRows) {
                throw new Error(
                    `Data length (${data.length}) exceeds maximum allowed (${maxRows})`
                )
            }

            // Collect all unique keys for headers
            const headers = Array.from(
                new Set(data.flatMap((row) => Object.keys(row)))
            )
            const delimiter = options.delimiter || ','

            const escapeValue = (value: unknown): string => {
                if (value === null || value === undefined) {
                    return ''
                }
                let stringValue = ''
                if (typeof value === 'object') {
                    stringValue = JSON.stringify(value)
                } else {
                    stringValue = String(value)
                }

                // If value contains delimiter, quote, or newline, escape it
                if (
                    stringValue.includes(delimiter) ||
                    stringValue.includes('"') ||
                    stringValue.includes('\n') ||
                    stringValue.includes('\r')
                ) {
                    return `"${stringValue.replace(/"/g, '""')}"`
                }
                return stringValue
            }

            const rows: string[] = []

            if (options.includeHeaders) {
                rows.push(headers.map((h) => escapeValue(h)).join(delimiter))
            }

            for (const record of data) {
                const typedRecord = record as Record<string, unknown>
                const row = headers.map((header) =>
                    escapeValue(typedRecord[header])
                )
                rows.push(row.join(delimiter))
            }

            const csvOutput = rows.join('\n')

            rootSpan.setAttributes({
                'tool.output.csvLength': csvOutput.length,
            })
            rootSpan.end()
            return { csv: csvOutput }
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Unknown error converting to CSV'

            // Handle AbortError specifically
            if (error instanceof Error && error.name === 'AbortError') {
                const cancelMessage = `JSON to CSV conversion cancelled`
                rootSpan.setStatus({ code: 2, message: cancelMessage })
                rootSpan.end()

                await writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'done',
                        message: `🛑 ${cancelMessage}`,
                        stage: 'json-to-csv',
                    },
                    id: 'json-to-csv',
                })

                log.warn(cancelMessage)
                throw new Error(cancelMessage)
            }

            rootSpan.recordException(
                error instanceof Error ? error : new Error(errorMessage)
            )
            rootSpan.setStatus({ code: 2, message: errorMessage })
            rootSpan.end()
            throw new Error(errorMessage)
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('JSON to CSV tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('JSON to CSV tool received input chunk', {
            toolCallId,
            inputTextDelta,
            abortSignal: abortSignal?.aborted,
            messageCount: messages.length,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        const options = input.options || {}
        log.info('JSON to CSV received complete input', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            recordCount: input.data.length,
            delimiter: options.delimiter,
            includeHeaders: options.includeHeaders,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        const csvLines = output.csv.split('\n').length
        log.info('JSON to CSV conversion completed', {
            toolCallId,
            toolName,
            abortSignal: abortSignal?.aborted,
            csvLines,
            csvLength: output.csv.length,
            hook: 'onOutput',
        })
    },
})

export type JsonToCsvUITool = InferUITool<typeof jsonToCsvTool>
