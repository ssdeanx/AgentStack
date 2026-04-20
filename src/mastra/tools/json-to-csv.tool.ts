import type { RequestContext } from '@mastra/core/request-context'
import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import type { TracingContext } from '@mastra/core/observability'
import { z } from 'zod'
import { stringify } from 'csv-stringify/sync'
import { log } from '../config/logger'

export interface JsonToCsvRequestContext extends RequestContext {
    csvToolContext?: {
        maxRows?: number
    }
}

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]

interface JsonObject {
    [key: string]: JsonValue
}

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
    z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        z.array(jsonValueSchema),
        z.record(z.string(), jsonValueSchema),
    ])
)

const jsonToCsvToolOutputSchema = z.object({
    csv: z.string().describe('Generated CSV content'),
})

export const jsonToCsvTool = createTool({
    id: 'json-to-csv',
    description: 'Convert JSON data to CSV format. Handles arrays of objects.',
    inputSchema: z.object({
        data: z
            .array(z.record(z.string(), jsonValueSchema))
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
    outputSchema: jsonToCsvToolOutputSchema,
    strict: true,
    execute: async (input, context) => {
        const writer = context?.writer
        const requestContext = context?.requestContext as
            | JsonToCsvRequestContext
            | undefined
        const abortSignal = context?.abortSignal
        const tracingContext: TracingContext | undefined = context?.tracingContext

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

        // Create root span using getOrCreateSpan (creates root OR attaches to parent)
        const rootSpan = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'json-to-csv',
            input,
            metadata: {
                'tool.id': 'json-to-csv',
                'tool.input.recordCount': input.data.length,
            },
            requestContext: context?.requestContext,
            tracingContext,
        })

        // Create child span for JSON to CSV conversion
        const jsonCsvSpan = rootSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'json-to-csv-conversion-operation',
            input,
            metadata: {
                'tool.id': 'json-csv-conversion',
                'operation.type': 'json-to-csv',
            },
        })

        try {
            const { data, options } = input
            if (data === undefined || data === null || data.length === 0) {
                jsonCsvSpan?.end()
                return { csv: '' }
            }
            const resolvedOptions = options ?? {
                delimiter: ',',
                includeHeaders: true,
            }

            const config = requestContext?.csvToolContext
            const maxRows = config?.maxRows

            if (maxRows !== undefined && data.length > maxRows) {
                throw new Error(
                    `Data length (${data.length}) exceeds maximum allowed (${maxRows})`
                )
            }

            const delimiter = resolvedOptions.delimiter || ','
            const headers = Array.from(
                new Set(data.flatMap((row) => Object.keys(row)))
            )

            const normalizedRows = data.map((record) => {
                const normalizedRecord: Record<string, string> = {}

                for (const header of headers) {
                    const value = record[header]
                    normalizedRecord[header] =
                        value === null || value === undefined
                            ? ''
                            : typeof value === 'object'
                              ? JSON.stringify(value)
                              : String(value)
                }

                return normalizedRecord
            })

            const csvOutput = stringify(normalizedRows, {
                header: resolvedOptions.includeHeaders,
                columns: headers,
                delimiter,
            })

            // Update spans with successful result
            jsonCsvSpan?.update({
                output: { csv: csvOutput },
                metadata: {
                    'operation.completed': true,
                },
            })
            jsonCsvSpan?.end()

            rootSpan?.update({
                output: { csv: csvOutput },
                metadata: {
                    'tool.output.csvLength': csvOutput.length,
                    'tool.output.success': true,
                },
            })
            rootSpan?.end()

            return { csv: csvOutput }
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Unknown error converting to CSV'

            // Handle AbortError specifically
            if (error instanceof Error && error.name === 'AbortError') {
                const cancelMessage = `JSON to CSV conversion cancelled`
                jsonCsvSpan?.error({
                    error: new Error(cancelMessage),
                    endSpan: true,
                })
                rootSpan?.error({
                    error: new Error(cancelMessage),
                    endSpan: true,
                })

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
                throw new Error(cancelMessage, { cause: error })
            }

            // Record error in both spans
            jsonCsvSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            rootSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            throw new Error(errorMessage, { cause: error })
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('JSON to CSV tool input streaming started', {
            toolCallId,
            messageCount: messages?.length ?? 0,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('JSON to CSV tool received input chunk', {
            toolCallId,
            inputTextDelta,
            abortSignal: abortSignal?.aborted,
            messageCount: messages?.length ?? 0,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        const options = input.options ?? {}
        log.info('JSON to CSV received complete input', {
            toolCallId,
            messageCount: messages?.length ?? 0,
            abortSignal: abortSignal?.aborted,
            recordCount: input.data.length,
            delimiter: options.delimiter,
            includeHeaders: options.includeHeaders,
            hook: 'onInputAvailable',
        })
    },
    toModelOutput: (output) => ({
        type: 'text',
        value: output.csv,
    }),
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        const parsed = jsonToCsvToolOutputSchema.safeParse(output)
        const csvOutput = parsed.success
            ? parsed.data.csv
            : typeof output === 'object' &&
                output !== null &&
                'csv' in output &&
                typeof (output as { csv?: string }).csv === 'string'
              ? (output as { csv: string }).csv
              : ''
        const csvLines = csvOutput.split('\n').length
        log.info('JSON to CSV conversion completed', {
            toolCallId,
            toolName,
            abortSignal: abortSignal?.aborted,
            csvLines,
            csvLength: csvOutput.length,
            hook: 'onOutput',
        })
    },
})

export type JsonToCsvUITool = InferUITool<typeof jsonToCsvTool>
