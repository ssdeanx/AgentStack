import { FilesystemEventType, FileType, Sandbox } from '@e2b/code-interpreter'
import { createTool } from '@mastra/core/tools'
import { trace, SpanStatusCode, context as otelContext, propagation, metrics } from '@opentelemetry/api'
import type { BaggageEntry, BaggageEntryMetadata, Baggage } from '@opentelemetry/api'
import z from 'zod'
import { log, logError, logToolExecution } from '../config/logger'
import type { RequestContext } from '@mastra/core/request-context'
import type { InferUITool, InferUITools } from "@mastra/core/tools";


export interface E2BRequestContext extends RequestContext {
    userId?: string
    sandboxLimits?: {
        maxTimeout: number
        maxFileSize: number
        maxExecutionTime: number
        allowedLanguages?: Array<'python' | 'javascript' | 'typescript'>
    }
}

const tracer = trace.getTracer('e2b-tools', '1.0.0')

// Initialize metrics
const meter = metrics.getMeter('e2b-tools', '1.0.0')
const toolExecutionCounter = meter.createCounter('e2b_tool_executions_total', {
    description: 'Total number of E2B tool executions'
})
const toolExecutionDuration = meter.createHistogram('e2b_tool_execution_duration', {
    description: 'Duration of E2B tool executions in milliseconds',
    unit: 'ms'
})
// Counter and histogram for sandbox-level operations (create/delete)
const sandboxOperationsCounter = meter.createCounter('e2b_sandbox_operations_total', {
    description: 'Total number of sandbox operations (create/delete)'
})
const sandboxOperationDuration = meter.createHistogram('e2b_sandbox_operation_duration', {
    description: 'Duration of sandbox operations in milliseconds',
    unit: 'ms'
})

// Enhanced logging utilities with centralized logger
// Helper: return active span context info (traceId, spanId)
const getActiveSpanContextInfo = () => {
    const span = trace.getActiveSpan()
    if (!span) {return { traceId: undefined, spanId: undefined }}
    const sc = span.spanContext()
    return { traceId: sc.traceId, spanId: sc.spanId }
}

// Helper: convert Baggage to simple object for logging
const BaggageToObject = (b: Baggage | null | undefined) => {
    if (b === null || b === undefined) {
        return {}
    }
    const obj: Record<string, string> = {}
    for (const [k, v] of b.getAllEntries()) {
        obj[k] = String(v.value)
    }
    return obj
}

// Helper: merge provided entries into the current Baggage and set it on the active context
const mergeAndSetBaggage = (entries: Record<string, string>) => {
    try {
        const ctx = otelContext.active()
        const currentBaggage = propagation.getBaggage(ctx)
        const merged: Record<string, BaggageEntry> = {}
        if (currentBaggage) {
            for (const entry of currentBaggage.getAllEntries()) {
                const [k, v] = entry
                merged[k] = { value: String(v.value), metadata: v.metadata }
            }
        }
        for (const k of Object.keys(entries)) {
            merged[k] = { value: entries[k] }
        }
        const bag = propagation.createBaggage(merged)
        const newCtx = propagation.setBaggage(ctx, bag)
        // Make the new baggage active for the current synchronous call and its children
        otelContext.with(newCtx, () => {})
        return bag
    } catch (err) {
        // Non-fatal - don't let baggage failures break execution
        log.error('Failed to set baggage', { error: err })
        return undefined
    }
}

const logToolStart = (toolName: string, input: any, toolContext?: any) => {
    const span = trace.getActiveSpan()
    if (span) {
        // Add span event for tool start
        span.addEvent('tool.start', {
            'tool.name': toolName,
            'tool.input_size': JSON.stringify(input).length,
            'user.id': toolContext?.requestContext?.userId,
        })

        // Merge into baggage for downstream services and traces
        mergeAndSetBaggage({ 'tool.name': toolName, 'tool.start_time': Date.now().toString() })

        // Also set attributes on the span so it's available in OTEL exporters
        try {
            span.setAttribute('tool.name', toolName)
            span.setAttribute('tool.input_size', JSON.stringify(input).length)
        } catch (err) {
            // ignore if span does not support setAttribute
        }
    }

    // Include trace info and baggage in the structured log
    const traceInfo = getActiveSpanContextInfo()
    const bag = propagation.getBaggage(otelContext.active())
    logToolExecution(toolName, { originalInput: input, _trace: traceInfo, _Baggage: BaggageToObject(bag), _userId: toolContext?.requestContext?.userId })
}

const logToolComplete = (
    toolName: string,
    output: any,
    duration: number,
    toolContext?: any
) => {
    const span = trace.getActiveSpan()
    if (span) {
        // Add span event for tool completion
        span.addEvent('tool.complete', {
            'tool.name': toolName,
            'tool.duration_ms': duration,
            'tool.output_size': JSON.stringify(output).length,
            'user.id': toolContext?.requestContext?.userId,
        })

        // Update baggage
        mergeAndSetBaggage({ 'tool.duration': duration.toString(), 'tool.completed_at': Date.now().toString() })

        // Set attributes on span
        try {
            span.setAttribute('tool.duration_ms', duration)
            span.setAttribute('tool.output_size', JSON.stringify(output).length)
        } catch (err) {
            // ignore
        }
    }

    // Record metrics
    toolExecutionCounter.add(1, {
        'tool.name': toolName,
        'tool.status': 'success',
        'user.id': toolContext?.requestContext?.userId,
    })
    toolExecutionDuration.record(duration, {
        'tool.name': toolName,
        'tool.status': 'success',
        'user.id': toolContext?.requestContext?.userId,
    })

    const traceInfo = getActiveSpanContextInfo()
    const bag = propagation.getBaggage(otelContext.active())

    logToolExecution(
        toolName,
        { _trace: traceInfo, _Baggage: BaggageToObject(bag), _userId: toolContext?.requestContext?.userId },
        output
    )
}

const logToolError = (toolName: string, error: any, context?: any) => {
    const span = trace.getActiveSpan()
    if (span) {
        // Add span event for tool error
        span.addEvent('tool.error', {
            'tool.name': toolName,
            'error.message': error instanceof Error ? error.message : String(error),
            'error.stack': error instanceof Error ? error.stack : undefined,
            'user.id': context?.requestContext?.userId
        })

        // Record error in span
        span.recordException(error instanceof Error ? error : new Error(String(error)))
    }

    // Record error metrics
    toolExecutionCounter.add(1, {
        'tool.name': toolName,
        'tool.status': 'error',
        'error.type': error instanceof Error ? error.constructor.name : 'Unknown'
    })

    logError(toolName, error, {
        toolName,
        userId: context?.requestContext?.userId
    })
}

export const createSandbox = createTool({
    id: 'createSandbox',
    description: 'Create an e2b sandbox',
    inputSchema: z.object({
        metadata: z
            .record(z.string(), z.string())
            .optional()
            .describe('Custom metadata for the sandbox'),
        envs: z.record(z.string(), z.string()).optional().describe(`
      Custom environment variables for the sandbox.
      Used when executing commands and code in the sandbox.
      Can be overridden with the \`envs\` argument when executing commands or code.
    `),
        timeoutMS: z.number().optional().describe(`
      Timeout for the sandbox in **milliseconds**.
      Maximum time a sandbox can be kept alive is 24 hours (86_400_000 milliseconds) for Pro users and 1 hour (3_600_000 milliseconds) for Hobby users.
      @default 300_000 // 5 minutes
    `),
    }),
    outputSchema: z.object({
        sandboxId: z.string(),
    }),
    execute: async (inputData, context) => {
        const span = tracer.startSpan('createSandbox')
        const startTime = Date.now()
        const requestContext = context?.requestContext as E2BRequestContext
        const userId = requestContext?.userId
        if (userId && userId.length > 0) {
            span.setAttribute('user.id', userId)
        }

        // Add custom resource attributes
        span.setAttribute('service.name', 'e2b-tools')
        span.setAttribute('service.version', '1.0.0')
        span.setAttribute('sandbox.operation', 'create')

        // Set baggage for cross-service context propagation
        const currentBaggage = propagation.getBaggage(otelContext.active())
        if (currentBaggage) {
            const keys = Array.from(currentBaggage.getAllEntries()).map(([key]) => key)
            span.setAttribute('baggage.keys', keys.join(','))
        }

        // Add span event for input validation
        span.addEvent('input.validation', {
            'input.has_metadata': !!inputData.metadata,
            'input.has_envs': !!inputData.envs,
            'input.timeout_ms': inputData.timeoutMS ?? 300000
        })

        try {
            // Add start event and input size
            const inputSize = JSON.stringify(inputData).length
            span.addEvent('tool.start', {
                ts: Date.now(),
                input_size: inputSize,
            })
            span.setAttribute('tool.input_size', inputSize)

            await context?.writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `Creating sandbox...`,
                    stage: 'createSandbox',
                },
                id: 'createSandbox',
            })

            logToolStart('createSandbox', inputData, context)

            const sandbox = await Sandbox.create(inputData)

            // Record successful sandbox creation metrics
            const creationDuration = Date.now() - startTime
            sandboxOperationsCounter.add(1, {
                'operation.type': 'create',
                'operation.status': 'success',
                'sandbox.id': sandbox.sandboxId,
            })
            sandboxOperationDuration.record(creationDuration, {
                'operation.type': 'create',
                'operation.status': 'success',
                'sandbox.id': sandbox.sandboxId,
            })

            span.setStatus({ code: SpanStatusCode.OK })
            span.setAttribute('sandbox.id', sandbox.sandboxId)
            span.setAttribute('sandbox.created', true)

            // Add span event for successful creation
            span.addEvent('sandbox.created', {
                'sandbox.id': sandbox.sandboxId,
                'creation.time_ms': Date.now() - startTime
            })

            const result = {
                sandboxId: sandbox.sandboxId,
            }

            // Output size attribute & complete event
            const outputSize = JSON.stringify(result).length
            span.setAttribute('tool.output_size', outputSize)
            span.addEvent('tool.complete', {
                duration_ms: Date.now() - startTime,
            })

            await context?.writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Sandbox created: ${sandbox.sandboxId}`,
                    stage: 'createSandbox',
                },
                id: 'createSandbox',
            })

            logToolComplete(
                'createSandbox',
                result,
                Date.now() - startTime,
                context
            )
            return result
        } catch (e) {
            // Record error metrics
            sandboxOperationsCounter.add(1, {
                'operation.type': 'create',
                'operation.status': 'error',
                'error.type': e instanceof Error ? e.constructor.name : 'Unknown'
            })

            if (e instanceof Error) {
                span.recordException(e)
                span.addEvent('sandbox.creation.failed', {
                    'error.message': e.message,
                    'error.stack': e.stack?.slice(0, 500)
                })
            } else {
                span.recordException(new Error(String(e)))
            }
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: e instanceof Error ? e.message : String(e),
            })
            logToolError('createSandbox', e, context)
            const errObj =
                e instanceof Error
                    ? { message: e.message, stack: e.stack }
                    : { message: String(e) }
            throw new Error(JSON.stringify(errObj))
        } finally {
            span.end()
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Create sandbox tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Create sandbox received complete input', {
            toolCallId,
            messageCount: messages.length,
            hasMetadata: !!input.metadata,
            hasEnvs: !!input.envs,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Create sandbox completed', {
            toolCallId,
            toolName,
            sandboxId: output.sandboxId,
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

export const writeFile = createTool({
    id: 'writeFile',
    description: 'Write a file to the e2b sandbox',
    inputSchema: z.object({
        sandboxId: z
            .string()
            .describe('The sandboxId for the sandbox to write the file to'),
        path: z.string().describe('The path where the file should be written'),
        content: z.string().describe('The content to write to the file'),
    }),
    outputSchema: z.object({
        success: z
            .boolean()
            .describe('Whether the file was written successfully'),
        path: z.string().describe('The path where the file was written'),
    }),
    execute: async (inputData, context) => {
        const span = tracer.startSpan('writeFile')
        const startTime = Date.now()

        try {
            logToolStart('writeFile', inputData, context)

            const sandbox = await Sandbox.connect(inputData.sandboxId)
            await sandbox.files.write(inputData.path, inputData.content)

            span.setStatus({ code: SpanStatusCode.OK })
            span.setAttribute('sandbox.id', inputData.sandboxId)
            span.setAttribute('file.path', inputData.path)
            span.setAttribute('file.size', inputData.content.length)

            const result = {
                success: true,
                path: inputData.path,
            }

            logToolComplete(
                'writeFile',
                result,
                Date.now() - startTime,
                context
            )
            return result
        } catch (e) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: e instanceof Error ? e.message : String(e),
            })
            logToolError('writeFile', e, context)
            const errObj =
                e instanceof Error
                    ? { message: e.message, stack: e.stack }
                    : { message: String(e) }
            throw new Error(JSON.stringify(errObj))
        } finally {
            span.end()
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Write file tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Write file received complete input', {
            toolCallId,
            messageCount: messages.length,
            sandboxId: input.sandboxId,
            path: input.path,
            contentLength: input.content.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Write file completed', {
            toolCallId,
            toolName,
            success: output.success,
            path: output.path,
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

export const writeFiles = createTool({
    id: 'writeFiles',
    description: 'Write multiple files to the e2b sandbox',
    inputSchema: z.object({
        sandboxId: z
            .string()
            .describe('The sandboxId for the sandbox to write files to'),
        files: z
            .array(
                z.object({
                    path: z
                        .string()
                        .describe('The path where the file should be written'),
                    data: z
                        .string()
                        .describe('The content to write to the file'),
                })
            )
            .describe('Array of files to write, each with path and data'),
    }),
    outputSchema: z.object({
        success: z
            .boolean()
            .describe('Whether all files were written successfully'),
        filesWritten: z
            .array(z.string())
            .describe('Array of file paths that were written'),
    }),
    execute: async (inputData, context) => {
        const span = tracer.startSpan('writeFiles')
        const startTime = Date.now()

        try {
            logToolStart('writeFiles', inputData, context)

            const sandbox = await Sandbox.connect(inputData.sandboxId)
            await sandbox.files.write(inputData.files)

            span.setStatus({ code: SpanStatusCode.OK })
            span.setAttribute('sandbox.id', inputData.sandboxId)
            span.setAttribute('files.count', inputData.files.length)
            span.setAttribute(
                'files.total_size',
                inputData.files.reduce((sum, file) => sum + file.data.length, 0)
            )

            const result = {
                success: true,
                filesWritten: inputData.files.map((file) => file.path),
            }

            logToolComplete(
                'writeFiles',
                result,
                Date.now() - startTime,
                context
            )
            return result
        } catch (e) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: e instanceof Error ? e.message : String(e),
            })
            logToolError('writeFiles', e, context)
            const errObj =
                e instanceof Error
                    ? { message: e.message, stack: e.stack }
                    : { message: String(e) }
            throw new Error(JSON.stringify(errObj))
        } finally {
            span.end()
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Write files tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Write files received complete input', {
            toolCallId,
            messageCount: messages.length,
            sandboxId: input.sandboxId,
            fileCount: input.files.length,
            totalContentSize: input.files.reduce(
                (sum, file) => sum + file.data.length,
                0
            ),
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Write files completed', {
            toolCallId,
            toolName,
            success: output.success,
            filesWrittenCount: output.filesWritten.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

export const listFiles = createTool({
    id: 'listFiles',
    description: 'List files and directories in a path within the e2b sandbox',
    inputSchema: z.object({
        sandboxId: z
            .string()
            .describe('The sandboxId for the sandbox to list files from'),
        path: z
            .string()
            .default('/')
            .describe('The directory path to list files from'),
    }),
    outputSchema: z.object({
        files: z
            .array(
                z.object({
                    name: z
                        .string()
                        .describe('The name of the file or directory'),
                    path: z
                        .string()
                        .describe('The full path of the file or directory'),
                    isDirectory: z
                        .boolean()
                        .describe('Whether this is a directory'),
                })
            )
            .describe('Array of files and directories'),
        path: z.string().describe('The path that was listed'),
    }),
    execute: async (inputData, context) => {
        const span = tracer.startSpan('listFiles')
        const startTime = Date.now()

        try {
            logToolStart('listFiles', inputData, context)

            const sandbox = await Sandbox.connect(inputData.sandboxId)
            const fileList = await sandbox.files.list(inputData.path)

            span.setStatus({ code: SpanStatusCode.OK })
            span.setAttribute('sandbox.id', inputData.sandboxId)
            span.setAttribute('list.path', inputData.path)
            span.setAttribute('list.file_count', fileList.length)
            span.setAttribute(
                'list.directory_count',
                fileList.filter((f) => f.type === FileType.DIR).length
            )

            const result = {
                files: fileList.map((file) => ({
                    name: file.name,
                    path: file.path,
                    isDirectory: file.type === FileType.DIR,
                })),
                path: inputData.path,
            }

            logToolComplete(
                'listFiles',
                result,
                Date.now() - startTime,
                context
            )
            return result
        } catch (e) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: e instanceof Error ? e.message : String(e),
            })
            logToolError('listFiles', e, context)
            const errObj =
                e instanceof Error
                    ? { message: e.message, stack: e.stack }
                    : { message: String(e) }
            throw new Error(JSON.stringify(errObj))
        } finally {
            span.end()
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('List files tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('List files received complete input', {
            toolCallId,
            messageCount: messages.length,
            sandboxId: input.sandboxId,
            path: input.path,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('List files completed', {
            toolCallId,
            toolName,
            fileCount: output.files.length,
            directoryCount: output.files.filter((f) => f.isDirectory).length,
            path: output.path,
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

export const deleteFile = createTool({
    id: 'deleteFile',
    description: 'Delete a file or directory from the e2b sandbox',
    inputSchema: z.object({
        sandboxId: z
            .string()
            .describe('The sandboxId for the sandbox to delete the file from'),
        path: z
            .string()
            .describe('The path to the file or directory to delete'),
    }),
    outputSchema: z.object({
        success: z
            .boolean()
            .describe('Whether the file was deleted successfully'),
        path: z.string().describe('The path that was deleted'),
    }),
    execute: async (inputData, context) => {
        const span = tracer.startSpan('deleteFile')
        const startTime = Date.now()

        try {
            logToolStart('deleteFile', inputData, context)

            const sandbox = await Sandbox.connect(inputData.sandboxId)
            await sandbox.files.remove(inputData.path)

            span.setStatus({ code: SpanStatusCode.OK })
            span.setAttribute('sandbox.id', inputData.sandboxId)
            span.setAttribute('file.path', inputData.path)

            const result = {
                success: true,
                path: inputData.path,
            }

            logToolComplete(
                'deleteFile',
                result,
                Date.now() - startTime,
                context
            )
            return result
        } catch (e) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: e instanceof Error ? e.message : String(e),
            })
            logToolError('deleteFile', e, context)
            const errObj =
                e instanceof Error
                    ? { message: e.message, stack: e.stack }
                    : { message: String(e) }
            throw new Error(JSON.stringify(errObj))
        } finally {
            span.end()
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Delete file tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Delete file received complete input', {
            toolCallId,
            messageCount: messages.length,
            sandboxId: input.sandboxId,
            path: input.path,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Delete file completed', {
            toolCallId,
            toolName,
            success: output.success,
            path: output.path,
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

export const createDirectory = createTool({
    id: 'createDirectory',
    description: 'Create a directory in the e2b sandbox',
    inputSchema: z.object({
        sandboxId: z
            .string()
            .describe(
                'The sandboxId for the sandbox to create the directory in'
            ),
        path: z
            .string()
            .describe('The path where the directory should be created'),
    }),
    outputSchema: z.object({
        success: z
            .boolean()
            .describe('Whether the directory was created successfully'),
        path: z.string().describe('The path where the directory was created'),
    }),
    execute: async (inputData, context) => {
        const span = tracer.startSpan('createDirectory')
        const startTime = Date.now()

        try {
            logToolStart('createDirectory', inputData, context)

            const sandbox = await Sandbox.connect(inputData.sandboxId)
            await sandbox.files.makeDir(inputData.path)

            span.setStatus({ code: SpanStatusCode.OK })
            span.setAttribute('sandbox.id', inputData.sandboxId)
            span.setAttribute('directory.path', inputData.path)

            const result = {
                success: true,
                path: inputData.path,
            }

            logToolComplete(
                'createDirectory',
                result,
                Date.now() - startTime,
                context
            )
            return result
        } catch (e) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: e instanceof Error ? e.message : String(e),
            })
            logToolError('createDirectory', e, context)
            const errObj =
                e instanceof Error
                    ? { message: e.message, stack: e.stack }
                    : { message: String(e) }
            throw new Error(JSON.stringify(errObj))
        } finally {
            span.end()
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Create directory tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Create directory received complete input', {
            toolCallId,
            messageCount: messages.length,
            sandboxId: input.sandboxId,
            path: input.path,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Create directory completed', {
            toolCallId,
            toolName,
            success: output.success,
            path: output.path,
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

export const getFileInfo = createTool({
    id: 'getFileInfo',
    description:
        'Get detailed information about a file or directory in the e2b sandbox',
    inputSchema: z.object({
        sandboxId: z
            .string()
            .describe(
                'The sandboxId for the sandbox to get file information from'
            ),
        path: z
            .string()
            .describe(
                'The path to the file or directory to get information about'
            ),
    }),
    outputSchema: z.object({
        name: z.string().describe('The name of the file or directory'),
        type: z
            .enum(FileType)
            .optional()
            .describe('Whether this is a file or directory'),
        path: z.string().describe('The full path of the file or directory'),
        size: z.number().describe('The size of the file or directory in bytes'),
        mode: z
            .number()
            .describe('The file mode (permissions as octal number)'),
        permissions: z.string().describe('Human-readable permissions string'),
        owner: z.string().describe('The owner of the file or directory'),
        group: z.string().describe('The group of the file or directory'),
        modifiedTime: z
            .date()
            .optional()
            .describe('The last modified time in ISO string format'),
        symlinkTarget: z
            .string()
            .optional()
            .describe('The target path if this is a symlink, null otherwise'),
    }),
    execute: async (inputData, context) => {
        const span = tracer.startSpan('getFileInfo')
        const startTime = Date.now()

        try {
            logToolStart('getFileInfo', inputData, context)

            const sandbox = await Sandbox.connect(inputData.sandboxId)
            const info = await sandbox.files.getInfo(inputData.path)

            span.setStatus({ code: SpanStatusCode.OK })
            span.setAttribute('sandbox.id', inputData.sandboxId)
            span.setAttribute('file.path', inputData.path)
            span.setAttribute('file.size', info.size)
            if (info.type !== null && info.type !== undefined) {
                span.setAttribute('file.type', info.type)
            }
            span.setAttribute('file.permissions', info.permissions)

            const result = {
                name: info.name,
                type: info.type,
                path: info.path,
                size: info.size,
                mode: info.mode,
                permissions: info.permissions,
                owner: info.owner,
                group: info.group,
                modifiedTime: info.modifiedTime,
                symlinkTarget: info.symlinkTarget,
            }

            logToolComplete(
                'getFileInfo',
                result,
                Date.now() - startTime,
                context
            )
            return result
        } catch (e) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: e instanceof Error ? e.message : String(e),
            })
            logToolError('getFileInfo', e, context)
            const errObj =
                e instanceof Error
                    ? { message: e.message, stack: e.stack }
                    : { message: String(e) }
            throw new Error(JSON.stringify(errObj))
        } finally {
            span.end()
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Get file info tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Get file info received complete input', {
            toolCallId,
            messageCount: messages.length,
            sandboxId: input.sandboxId,
            path: input.path,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Get file info completed', {
            toolCallId,
            toolName,
            name: output.name,
            size: output.size,
            fileType: output.type,
            permissions: output.permissions,
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

export const checkFileExists = createTool({
    id: 'checkFileExists',
    description: 'Check if a file or directory exists in the e2b sandbox',
    inputSchema: z.object({
        sandboxId: z
            .string()
            .describe(
                'The sandboxId for the sandbox to check file existence in'
            ),
        path: z.string().describe('The path to check for existence'),
    }),
    outputSchema: z
        .object({
            exists: z
                .boolean()
                .describe('Whether the file or directory exists'),
            path: z.string().describe('The path that was checked'),
            type: z
                .enum(FileType)
                .optional()
                .describe('The type if the path exists'),
        })
        .or(
            z.object({
                error: z
                    .string()
                    .describe('The error from a failed existence check'),
            })
        ),
    execute: async (inputData, context) => {
        const span = tracer.startSpan('checkFileExists')
        const startTime = Date.now()

        try {
            logToolStart('checkFileExists', inputData, context)

            const sandbox = await Sandbox.connect(inputData.sandboxId)

            try {
                const info = await sandbox.files.getInfo(inputData.path)

                span.setStatus({ code: SpanStatusCode.OK })
                span.setAttribute('sandbox.id', inputData.sandboxId)
                span.setAttribute('file.path', inputData.path)
                span.setAttribute('file.exists', true)
                if (info.type !== null && info.type !== undefined) {
                    span.setAttribute('file.type', info.type)
                }

                const result = {
                    exists: true,
                    path: inputData.path,
                    type: info.type,
                }

                logToolComplete(
                    'checkFileExists',
                    result,
                    Date.now() - startTime,
                    context
                )
                return result
            } catch {
                // If getInfo fails, the file doesn't exist
                span.setStatus({ code: SpanStatusCode.OK })
                span.setAttribute('sandbox.id', inputData.sandboxId)
                span.setAttribute('file.path', inputData.path)
                span.setAttribute('file.exists', false)

                const result = {
                    exists: false,
                    path: inputData.path,
                }

                logToolComplete(
                    'checkFileExists',
                    result,
                    Date.now() - startTime,
                    context
                )
                return result
            }
        } catch (e) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: e instanceof Error ? e.message : String(e),
            })
            logToolError('checkFileExists', e, context)
            const errObj =
                e instanceof Error
                    ? { message: e.message, stack: e.stack }
                    : { message: String(e) }
            throw new Error(JSON.stringify(errObj))
        } finally {
            span.end()
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Check file exists tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Check file exists received complete input', {
            toolCallId,
            messageCount: messages.length,
            sandboxId: input.sandboxId,
            path: input.path,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Check file exists completed', {
            toolCallId,
            toolName,
            exists: 'exists' in output ? output.exists : false,
            path: 'path' in output ? output.path : '',
            fileType: 'type' in output ? output.type : undefined,
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

export const getFileSize = createTool({
    id: 'getFileSize',
    description: 'Get the size of a file or directory in the e2b sandbox',
    inputSchema: z.object({
        sandboxId: z
            .string()
            .describe('The sandboxId for the sandbox to get file size from'),
        path: z.string().describe('The path to the file or directory'),
        humanReadable: z
            .boolean()
            .default(false)
            .describe(
                "Whether to return size in human-readable format (e.g., '1.5 KB', '2.3 MB')"
            ),
    }),
    outputSchema: z
        .object({
            size: z.number().describe('The size in bytes'),
            humanReadableSize: z
                .string()
                .optional()
                .describe('Human-readable size string if requested'),
            path: z.string().describe('The path that was checked'),
            type: z
                .enum(FileType)
                .optional()
                .describe('Whether this is a file or directory'),
        })
        .or(
            z.object({
                error: z
                    .string()
                    .describe('The error from a failed size check'),
            })
        ),
    execute: async (inputData, context) => {
        const span = tracer.startSpan('getFileSize')
        const startTime = Date.now()

        try {
            logToolStart('getFileSize', inputData, context)

            const sandbox = await Sandbox.connect(inputData.sandboxId)
            const info = await sandbox.files.getInfo(inputData.path)

            let humanReadableSize: string | undefined

            if (inputData.humanReadable) {
                const bytes = info.size
                const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
                if (bytes === 0) {
                    humanReadableSize = '0 B'
                } else {
                    const i = Math.floor(Math.log(bytes) / Math.log(1024))
                    const size = (bytes / Math.pow(1024, i)).toFixed(1)
                    humanReadableSize = `${size} ${sizes[i]}`
                }
            }

            span.setStatus({ code: SpanStatusCode.OK })
            span.setAttribute('sandbox.id', inputData.sandboxId)
            span.setAttribute('file.path', inputData.path)
            span.setAttribute('file.size', info.size)
            if (info.type !== null && info.type !== undefined) {
                span.setAttribute('file.type', info.type)
            }
            span.setAttribute('humanReadable', inputData.humanReadable)

            const result = {
                size: info.size,
                humanReadableSize,
                path: inputData.path,
                type: info.type,
            }

            logToolComplete(
                'getFileSize',
                result,
                Date.now() - startTime,
                context
            )
            return result
        } catch (e) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: e instanceof Error ? e.message : String(e),
            })
            logToolError('getFileSize', e, context)
            const errObj =
                e instanceof Error
                    ? { message: e.message, stack: e.stack }
                    : { message: String(e) }
            throw new Error(JSON.stringify(errObj))
        } finally {
            span.end()
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Get file size tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Get file size received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Get file size received complete input', {
            toolCallId,
            messageCount: messages.length,
            sandboxId: input.sandboxId,
            path: input.path,
            humanReadable: input.humanReadable,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Get file size completed', {
            toolCallId,
            toolName,
            size: 'size' in output ? output.size : 0,
            path: 'path' in output ? output.path : '',
            humanReadable:
                'humanReadable' in output ? output.humanReadable : false,
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

export const watchDirectory = createTool({
    id: 'watchDirectory',
    description: 'Watch a directory for filesystem events in the e2b sandbox',
    inputSchema: z.object({
        sandboxId: z
            .string()
            .describe('The sandboxId for the sandbox to watch directory in'),
        path: z
            .string()
            .describe('The directory path to watch for events'),
        recursive: z
            .boolean()
            .default(false)
            .describe('Whether to watch subdirectories recursively'),
        watchDuration: z
            .number()
            .default(5000)
            .describe('How long to watch for events in milliseconds'),
    }),
    outputSchema: z
        .object({
            watchStarted: z
                .boolean()
                .describe('Whether the watch was started successfully'),
            path: z.string().describe('The path that was watched'),
            events: z
                .array(
                    z.object({
                        type: z
                            .enum(FilesystemEventType)
                            .describe(
                                'The type of filesystem event (WRITE, CREATE, DELETE, etc.)'
                            ),
                        name: z
                            .string()
                            .describe('The name of the file that changed'),
                        timestamp: z
                            .string()
                            .describe('When the event occurred'),
                    })
                )
                .describe(
                    'Array of filesystem events that occurred during the watch period'
                ),
        })
        .or(
            z.object({
                error: z
                    .string()
                    .describe('The error from a failed directory watch'),
            })
        ),
    execute: async (inputData, context) => {
        const span = tracer.startSpan('watchDirectory')
        const startTime = Date.now()

        try {
            logToolStart('watchDirectory', inputData, context)

            const sandbox = await Sandbox.connect(inputData.sandboxId)
            const events: Array<{
                type: FilesystemEventType
                name: string
                timestamp: string
            }> = []

            // Start watching the directory
            const handle = await sandbox.files.watchDir(
                inputData.path,
                async (event) => {
                    events.push({
                        type: event.type,
                        name: event.name,
                        timestamp: new Date().toISOString(),
                    })
                },
                {
                    recursive: inputData.recursive,
                }
            )

            // Watch for the specified duration
            await new Promise((resolve) =>
                setTimeout(resolve, inputData.watchDuration)
            )

            // Stop watching
            await handle.stop()

            span.setStatus({ code: SpanStatusCode.OK })
            span.setAttribute('sandbox.id', inputData.sandboxId)
            span.setAttribute('watch.path', inputData.path)
            span.setAttribute('watch.recursive', inputData.recursive)
            span.setAttribute('watch.duration', inputData.watchDuration)
            span.setAttribute('events.count', events.length)

            const result = {
                watchStarted: true,
                path: inputData.path,
                events,
            }

            logToolComplete(
                'watchDirectory',
                result,
                Date.now() - startTime,
                context
            )
            return result
        } catch (e) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: e instanceof Error ? e.message : String(e),
            })
            logToolError('watchDirectory', e, context)
            const errObj =
                e instanceof Error
                    ? { message: e.message, stack: e.stack }
                    : { message: String(e) }
            throw new Error(JSON.stringify(errObj))
        } finally {
            span.end()
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Watch directory tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Watch directory received complete input', {
            toolCallId,
            messageCount: messages.length,
            sandboxId: input.sandboxId,
            path: input.path,
            recursive: input.recursive,
            watchDuration: input.watchDuration,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Watch directory completed', {
            toolCallId,
            toolName,
            watchStarted:
                'watchStarted' in output ? output.watchStarted : false,
            eventCount: 'events' in output ? output.events.length : 0,
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

export const runCommand = createTool({
    id: 'runCommand',
    description: 'Run a shell command in the e2b sandbox',
    inputSchema: z.object({
        sandboxId: z
            .string()
            .describe('The sandboxId for the sandbox to run the command in'),
        command: z.string().describe('The shell command to execute'),
        workingDirectory: z
            .string()
            .optional()
            .describe('The working directory to run the command in'),
        timeoutMs: z
            .number()
            .default(30000)
            .describe('Timeout for the command execution in milliseconds'),
        captureOutput: z
            .boolean()
            .default(true)
            .describe('Whether to capture stdout and stderr output'),
    }),
    outputSchema: z.object({
        success: z
            .boolean()
            .describe('Whether the command executed successfully'),
        exitCode: z.number().describe('The exit code of the command'),
        stdout: z.string().describe('The standard output from the command'),
        stderr: z.string().describe('The standard error from the command'),
        command: z.string().describe('The command that was executed'),
        executionTime: z
            .number()
            .describe('How long the command took to execute in milliseconds'),
    }),
    execute: async (inputData, context) => {
        const span = tracer.startSpan('runCommand')
        const startTime = Date.now()

        try {
            logToolStart('runCommand', inputData, context)

            const sandbox = await Sandbox.connect(inputData.sandboxId)

            const result = await sandbox.commands.run(inputData.command, {
                cwd: inputData.workingDirectory,
                timeoutMs: inputData.timeoutMs,
            })

            const executionTime = Date.now() - startTime

            span.setStatus({ code: SpanStatusCode.OK })
            span.setAttribute('sandbox.id', inputData.sandboxId)
            span.setAttribute('command.text', inputData.command)
            span.setAttribute('command.cwd', inputData.workingDirectory ?? '/')
            span.setAttribute('command.exit_code', result.exitCode)
            span.setAttribute('command.execution_time', executionTime)
            span.setAttribute(
                'command.stdout_length',
                (result.stdout ?? '').length
            )
            span.setAttribute(
                'command.stderr_length',
                (result.stderr ?? '').length
            )

            const output = {
                success: result.exitCode === 0,
                exitCode: result.exitCode,
                stdout: result.stdout ?? '',
                stderr: result.stderr ?? '',
                command: inputData.command,
                executionTime,
            }

            logToolComplete('runCommand', output, executionTime, context)
            return output
        } catch (e) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: e instanceof Error ? e.message : String(e),
            })
            logToolError('runCommand', e, context)
            const errObj =
                e instanceof Error
                    ? { message: e.message, stack: e.stack }
                    : { message: String(e) }
            throw new Error(JSON.stringify(errObj))
        } finally {
            span.end()
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Run command tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Run command received complete input', {
            toolCallId,
            messageCount: messages.length,
            sandboxId: input.sandboxId,
            command: input.command,
            workingDirectory: input.workingDirectory,
            timeoutMs: input.timeoutMs,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Run command completed', {
            toolCallId,
            toolName,
            success: output.success,
            exitCode: output.exitCode,
            executionTime: output.executionTime,
            stdoutLength: output.stdout.length,
            stderrLength: output.stderr.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

export const runCode = createTool({
    id: 'runCode',
    description: 'Execute code in the e2b sandbox',
    inputSchema: z.object({
        sandboxId: z
            .string()
            .describe('The sandboxId for the sandbox to run code in'),
        code: z.string().describe('The code to execute'),
        runCodeOpts: z
            .object({
                language: z
                    .enum(['python', 'javascript', 'typescript'])
                    .default('python')
                    .describe('The programming language of the code'),
            })
            .optional()
            .describe('Options for code execution'),
    }),
    outputSchema: z.object({
        execution: z.string().describe('JSON string containing execution results'),
    }),
    execute: async (inputData, context) => {
        const span = tracer.startSpan('runCode')
        const startTime = Date.now()

        try {
            logToolStart('runCode', inputData, context)

            const sandbox = await Sandbox.connect(inputData.sandboxId)

            // Execute code using the appropriate interpreter based on language
            const language = inputData.runCodeOpts?.language ?? 'python'
            let command: string

            if (language === 'python') {
                command = `python -c "${inputData.code.replace(/"/g, '\\"')}"`
            } else if (language === 'javascript') {
                command = `node -e "${inputData.code.replace(/"/g, '\\"')}"`
            } else if (language === 'typescript') {
                // For TypeScript, we need to compile and run
                command = `npx tsx -e "${inputData.code.replace(/"/g, '\\"')}"`
            } else {
                throw new Error(`Unsupported language: ${language}`)
            }

            const result = await sandbox.commands.run(command)

            span.setStatus({ code: SpanStatusCode.OK })
            span.setAttribute('sandbox.id', inputData.sandboxId)
            span.setAttribute('code.language', language)
            span.setAttribute('code.length', inputData.code.length)

            // Format result to match expected structure with logs.stdout and logs.stderr as arrays
            const executionResult = {
                logs: {
                    stdout: result.stdout ? result.stdout.split('\n') : [],
                    stderr: result.stderr ? result.stderr.split('\n') : [],
                },
                exitCode: result.exitCode,
                success: result.exitCode === 0,
            }

            const output = {
                execution: JSON.stringify(executionResult),
            }

            logToolComplete('runCode', output, Date.now() - startTime, context)
            return output
        } catch (e) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: e instanceof Error ? e.message : String(e),
            })
            logToolError('runCode', e, context)
            const errObj =
                e instanceof Error
                    ? { message: e.message, stack: e.stack }
                    : { message: String(e) }
            throw new Error(JSON.stringify(errObj))
        } finally {
            span.end()
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Run code tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Run code received complete input', {
            toolCallId,
            messageCount: messages.length,
            sandboxId: input.sandboxId,
            codeLength: input.code.length,
            language: input.runCodeOpts?.language ?? 'python',
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Run code completed', {
            toolCallId,
            toolName,
            executionLength: output.execution.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

// Type exports for UI components using InferUITool
export type CreateSandboxUITool = InferUITool<typeof createSandbox>
export type WriteFileUITool = InferUITool<typeof writeFile>
export type WriteFilesUITool = InferUITool<typeof writeFiles>
export type ListFilesUITool = InferUITool<typeof listFiles>
export type DeleteFileUITool = InferUITool<typeof deleteFile>
export type CreateDirectoryUITool = InferUITool<typeof createDirectory>
export type GetFileInfoUITool = InferUITool<typeof getFileInfo>
export type CheckFileExistsUITool = InferUITool<typeof checkFileExists>
export type GetFileSizeUITool = InferUITool<typeof getFileSize>
export type WatchDirectoryUITool = InferUITool<typeof watchDirectory>
export type RunCommandUITool = InferUITool<typeof runCommand>
export type RunCodeUITool = InferUITool<typeof runCode>

// Type union for all E2B UI tools
export type E2BUITools =
    | CreateSandboxUITool
    | WriteFileUITool
    | WriteFilesUITool
    | ListFilesUITool
    | DeleteFileUITool
    | CreateDirectoryUITool
    | GetFileInfoUITool
    | CheckFileExistsUITool
    | GetFileSizeUITool
    | WatchDirectoryUITool
    | RunCommandUITool
    | RunCodeUITool

// Tool set for all E2B tools
export const e2bToolSet = {
    createSandbox,
    writeFile,
    writeFiles,
    listFiles,
    deleteFile,
    createDirectory,
    getFileInfo,
    checkFileExists,
    getFileSize,
    watchDirectory,
    runCommand,
    runCode,
} as const

// Type inference for the entire E2B tool set using InferUITools
export type E2BUIToolSet = InferUITools<typeof e2bToolSet>
