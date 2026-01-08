import { createTool } from '@mastra/core/tools'
import { SpanStatusCode, trace } from '@opentelemetry/api'
import { promises as fsPromises } from 'node:fs'
import { z } from 'zod'
import { log } from '../config/logger'

export const fsTool = createTool({
    id: 'fsTool',
    description: 'File System Tool',
    inputSchema: z.object({
        action: z.string(),
        file: z.string(),
        data: z.string(),
    }),
    outputSchema: z.object({
        message: z.string(),
    }),
    execute: async (inputData, context) => {
        const writer = context?.writer
        const abortSignal = context?.abortSignal

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('FS operation cancelled')
        }

        const tracer = trace.getTracer('tools/fs-tool')
        const span = tracer.startSpan('fs-tool', {
            attributes: { action: inputData.action, file: inputData.file },
        })

        const { action, file, data } = inputData
        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `💾 FS ${action} on ${file}`,
                stage: 'fsTool',
            },
            id: 'fsTool',
        })
        try {
            // Check for cancellation before file operations
            if (abortSignal?.aborted) {
                span?.setStatus({
                    code: 2,
                    message: 'Operation cancelled during file operations',
                })
                span?.end()
                throw new Error('FS operation cancelled during file operations')
            }

            switch (action) {
                case 'write':
                    await fsPromises.writeFile(file, data)
                    break
                case 'read': {
                    const readContent = await fsPromises.readFile(file, 'utf8')
                    return { message: readContent }
                }
                case 'append':
                    await fsPromises.appendFile(file, data)
                    break
                default:
                    return { message: 'Invalid action' }
            }
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: '✅ FS operation complete',
                    stage: 'fsTool',
                },
                id: 'fsTool',
            })
            span?.setAttribute('success', true)
            span?.end()
            return { message: 'Success' }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)

            // Handle AbortError specifically
            if (e instanceof Error && e.name === 'AbortError') {
                const cancelMessage = `FS operation cancelled`
                span?.setStatus({ code: 2, message: cancelMessage })
                span?.end()

                await writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'done',
                        message: `🛑 ${cancelMessage}`,
                        stage: 'fsTool',
                    },
                    id: 'fsTool',
                })

                log.warn(cancelMessage)
                return {
                    message: `Error: ${cancelMessage}`,
                }
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `❌ FS error: ${errorMsg}`,
                    stage: 'fsTool',
                },
                id: 'fsTool',
            })
            log.error(`FS operation failed: ${errorMsg}`)
            span?.recordException(e instanceof Error ? e : new Error(errorMsg))
            span?.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg })
            span?.end()
            return {
                message: `Error: ${errorMsg}`,
            }
        }
    },
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('FS tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('FS tool received input chunk', {
            toolCallId,
            inputTextDelta,
            abortSignal: abortSignal?.aborted,
            messageCount: messages.length,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('FS tool received input', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            action: input.action,
            file: input.file,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        const isSuccess = !output.message.startsWith('Error:')
        const logLevel = isSuccess ? 'info' : 'warn'
        const message =
            output.message.length > 100
                ? output.message.substring(0, 100) + '...'
                : output.message

        log[logLevel]('FS tool operation completed', {
            toolCallId,
            toolName,
            abortSignal: abortSignal?.aborted,
            success: isSuccess,
            message,
            hook: 'onOutput',
        })
    },
})
