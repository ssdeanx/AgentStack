import { createTool } from '@mastra/core/tools'
import { SpanType } from '@mastra/core/observability'
import { promises as fsPromises } from 'node:fs'
import { z } from 'zod'
import { log } from '../config/logger'
import type { RequestContext } from '@mastra/core/request-context'

export interface FsToolContext extends RequestContext {
    userId?: string
}

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
        const requestContext = context?.requestContext as FsToolContext | undefined
        const tracingContext = context?.tracingContext

        if (abortSignal?.aborted === true) {
            throw new Error('FS operation cancelled')
        }

        // Create child span for FS operation
        const fsSpan = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'fs-operation',
            input: inputData,
            metadata: {
                'tool.id': 'fsTool',
                'tool.input.action': inputData.action,
                'tool.input.file': inputData.file,
            },
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
                fsSpan?.error({
                    error: new Error('Operation cancelled during file operations'),
                    endSpan: true,
                })
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
            fsSpan?.update({
                output: { message: 'Success' },
                metadata: {
                    'tool.output.success': true,
                },
            })
            fsSpan?.end()
            return { message: 'Success' }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)

            // Handle AbortError specifically
            if (e instanceof Error && e.name === 'AbortError') {
                const cancelMessage = `FS operation cancelled`
                fsSpan?.error({
                    error: new Error(cancelMessage),
                    endSpan: true,
                })

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
            fsSpan?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true,
            })
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
