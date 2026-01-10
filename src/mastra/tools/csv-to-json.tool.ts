import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import type { RequestContext } from '@mastra/core/request-context'
import { SpanType } from '@mastra/core/observability'
import { parse } from 'csv-parse/sync'
import * as fs from 'node:fs/promises'
import { z } from 'zod'
import { log } from '../config/logger'

export interface CsvToJsonRequestContext extends RequestContext {
    csvToolContext?: {
        maxRows?: number
    }
}

export const csvToJsonTool = createTool({
    id: 'csv-to-json',
    description:
        'Convert CSV data to JSON format. Accepts either a raw CSV string or a file path.',
    inputSchema: z.object({
        csvData: z.string().optional().describe('Raw CSV string data'),
        filePath: z.string().optional().describe('Absolute path to a CSV file'),
        options: z
            .object({
                delimiter: z
                    .string()
                    .default(',')
                    .describe('CSV delimiter character'),
                columns: z
                    .boolean()
                    .default(true)
                    .describe('Treat first row as headers'),
                trim: z
                    .boolean()
                    .default(true)
                    .describe('Trim whitespace from values'),
                skip_empty_lines: z
                    .boolean()
                    .default(true)
                    .describe('Skip empty lines'),
            })
            .optional()
            .default({
                delimiter: ',',
                columns: true,
                trim: true,
                skip_empty_lines: true,
            }),
    }),
    execute: async (input, context) => {
        const writer = context?.writer
        const requestContext = context?.requestContext as CsvToJsonRequestContext | undefined
        const abortSignal = context?.abortSignal
        const tracingContext = context?.tracingContext

        // Check if operation was already cancelled
        if (abortSignal?.aborted) {
            throw new Error('CSV to JSON conversion cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: '📊 Starting CSV to JSON conversion',
                stage: 'csv-to-json',
            },
            id: 'csv-to-json',
        })

        // Create child span for CSV conversion
        const csvSpan = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'csv-to-json-conversion',
            input,
            metadata: {
                'tool.id': 'csv-to-json',
                'tool.input.hasFilePath': !!input.filePath,
                'tool.input.hasCsvData': !!input.csvData,
            },
        })

        try {
            const config = requestContext?.csvToolContext
            const maxRows = config?.maxRows

            // Check for cancellation before file operations
            if (abortSignal?.aborted) {
                csvSpan?.error({
                    error: new Error('Operation cancelled during file operations'),
                    endSpan: true,
                })
                throw new Error(
                    'CSV to JSON conversion cancelled during file operations'
                )
            }

            let contentToParse = input.csvData

            if (
                input.filePath !== undefined &&
                input.filePath !== null
            ) {
                try {
                    contentToParse = await fs.readFile(
                        input.filePath,
                        'utf-8'
                    )
                } catch (err) {
                    throw new Error(
                        `Failed to read file at ${input.filePath}: ${(err as Error).message}`
                    )
                }
            }

            if (
                contentToParse === undefined ||
                contentToParse === null ||
                contentToParse === ''
            ) {
                throw new Error('Either csvData or filePath must be provided')
            }

            const options = input.options ?? {
                delimiter: ',',
                columns: true,
                trim: true,
                skip_empty_lines: true,
            }

            const records = parse(contentToParse, {
                delimiter: options.delimiter,
                columns: options.columns,
                trim: options.trim,
                skip_empty_lines: options.skip_empty_lines,
            })

            if (maxRows !== undefined && records.length > maxRows) {
                throw new Error(
                    `Record count (${records.length}) exceeds maximum allowed (${maxRows})`
                )
            }

            await writer?.write({
                type: 'progress',
                data: { message: `✅ Converted ${records.length} records` },
            })
            csvSpan?.update({
                output: { data: records },
                metadata: {
                    'tool.output.recordCount': records.length,
                    'tool.output.success': true,
                },
            })
            csvSpan?.end()
            return { data: records }
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Unknown error parsing CSV'

            // Handle AbortError specifically
            if (error instanceof Error && error.name === 'AbortError') {
                const cancelMessage = `CSV to JSON conversion cancelled`
                csvSpan?.error({
                    error: new Error(cancelMessage),
                    endSpan: true,
                })

                await writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'done',
                        message: `🛑 ${cancelMessage}`,
                        stage: 'csv-to-json',
                    },
                    id: 'csv-to-json',
                })

                log.warn(cancelMessage)
                throw new Error(cancelMessage)
            }

            csvSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            throw error instanceof Error ? error : new Error(errorMessage)
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('CSV to JSON tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('CSV to JSON tool received input chunk', {
            toolCallId,
            inputTextDelta,
            abortSignal: abortSignal?.aborted,
            messageCount: messages.length,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        const source = input.filePath ? `file:${input.filePath}` : 'raw CSV data'
        const options = input.options ?? {}
        log.info('CSV to JSON received complete input', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            source,
            delimiter: options.delimiter,
            columns: options.columns,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('CSV to JSON conversion completed', {
            toolCallId,
            toolName,
            abortSignal: abortSignal?.aborted,
            recordsProcessed: output.data.length,
            hook: 'onOutput',
        })
    },
})

export type CsvToJsonUITool = InferUITool<typeof csvToJsonTool>
