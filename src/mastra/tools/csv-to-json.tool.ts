import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import type { TracingContext } from '@mastra/core/observability'
import type { RequestContext } from '@mastra/core/request-context'
import type { BaseToolRequestContext } from './request-context.utils.js'
import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import { parse } from 'csv-parse/sync'
import { z } from 'zod'
import { log } from '../config/logger'
import { localWorkspacePath, mainFilesystem, mainSandbox } from '../workspaces'

export interface CsvToJsonRequestContext {
    csvToolContext?: {
        maxRows?: number
    }
}

type CsvJsonValue = string | number | boolean | null | CsvJsonObject | CsvJsonValue[]

interface CsvJsonObject {
    [key: string]: CsvJsonValue
}

const csvJsonValueSchema: z.ZodType<CsvJsonValue> = z.lazy(() =>
    z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        z.array(csvJsonValueSchema),
        z.record(z.string(), csvJsonValueSchema),
    ])
)

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
    outputSchema: z.array(
        z.union([z.record(z.string(), csvJsonValueSchema), z.array(csvJsonValueSchema)])
    ),
    strict: true,
    execute: async (input, context) => {
        const writer = context.writer
        const requestContext = context.requestContext as
            | RequestContext<BaseToolRequestContext & CsvToJsonRequestContext>
            | undefined
        const abortSignal = context.abortSignal
        const tracingContext: TracingContext | undefined =
            context.tracingContext

        // Check if operation was already cancelled
        if (abortSignal?.aborted ?? false) {
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

        const userId = requestContext?.all.userId
        const workspaceId = requestContext?.all.workspaceId

        // Create root span using getOrCreateSpan (creates root OR attaches to parent)
        const rootSpan = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'csv-to-json',
            input,
            metadata: {
                'tool.id': 'csv-to-json',
                'tool.input.hasFilePath': (input.filePath ?? '') !== '',
                'tool.input.hasCsvData': (input.csvData ?? '') !== '',
                'user.id': userId,
                'workspace.id': workspaceId,
                'workspace.path': localWorkspacePath,
                'sandbox.id': mainSandbox.id,
            },
            requestContext: context.requestContext,
            tracingContext,
        })

        // Create child span for CSV conversion
        const csvSpan = rootSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'csv-to-json-conversion-operation',
            input,
            metadata: {
                'tool.id': 'csv-conversion',
                'operation.type': 'parse-csv',
            },
        })

        try {
            const config = requestContext?.get('csvToolContext')
            const maxRows = config?.maxRows

            // Check for cancellation before file operations
            if (abortSignal?.aborted ?? false) {
                const cancelError = new Error(
                    'Operation cancelled during file operations'
                )
                csvSpan?.error({
                    error: cancelError,
                    endSpan: true,
                })
                rootSpan?.error({
                    error: cancelError,
                    endSpan: true,
                })
                throw cancelError
            }

            let contentToParse = input.csvData

            if (input.filePath !== undefined && input.filePath !== '') {
                try {
                    // Basic sanitization
                    const relativePath = input.filePath.replace(/\.\./g, '')
                    contentToParse = await mainFilesystem.readFile(relativePath, { encoding: 'utf-8' }) as string
                } catch (err) {
                    throw new Error(
                        `Failed to read file at ${input.filePath}: ${(err as Error).message}`,
                        { cause: err }
                    )
                }
            }

            if (
                contentToParse === undefined ||
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
            }) as Array<Record<string, unknown> | unknown[]>

            if (maxRows !== undefined && records.length > maxRows) {
                throw new Error(
                    `Record count (${String(records.length)}) exceeds maximum allowed (${String(maxRows)})`
                )
            }

            await writer?.write({
                type: 'progress',
                data: { message: `✅ Converted ${String(records.length)} records` },
            })

            // Update spans with successful result
            csvSpan?.update({
                output: { data: records },
                metadata: {
                    'operation.completed': true,
                },
            })
            csvSpan?.end()

            rootSpan?.update({
                output: { success: true, recordCount: records.length },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.recordCount': records.length,
                },
            })
            rootSpan?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: '✅ CSV to JSON conversion completed',
                    stage: 'csv-to-json',
                },
                id: 'csv-to-json',
            })

            return records
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)

            // Record error in spans
            csvSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            rootSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `❌ CSV to JSON conversion failed: ${errorMessage}`,
                    stage: 'csv-to-json',
                },
                id: 'csv-to-json',
            })

            log.error(`CSV to JSON conversion failed: ${errorMessage}`)
            throw error
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('CSV to JSON tool input streaming started', {
            toolCallId,
            messageCount: messages?.length ?? 0,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('CSV to JSON tool received input chunk', {
            toolCallId,
            inputTextDelta,
            abortSignal: abortSignal?.aborted,
            messageCount: messages?.length ?? 0,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        const source = (input.filePath ?? '') !== ''
            ? `file:${input.filePath ?? ''}`
            : 'raw CSV data'
        const options = input.options ?? {}
        log.info('CSV to JSON received complete input', {
            toolCallId,
            messageCount: messages?.length ?? 0,
            abortSignal: abortSignal?.aborted,
            source,
            delimiter: options.delimiter,
            columns: options.columns,
            hook: 'onInputAvailable',
        })
    },
    toModelOutput: (output) => ({
        type: 'json',
        value: {
            recordCount: output.length,
            sampleRows: output.slice(0, 3),
        },
    }),
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        const recordsProcessed = Array.isArray(output) ? output.length : 0
        log.info('CSV to JSON conversion completed', {
            toolCallId,
            toolName,
            abortSignal: abortSignal?.aborted,
            recordsProcessed,
            hook: 'onOutput',
        })
    },
})

export type CsvToJsonUITool = InferUITool<typeof csvToJsonTool>
