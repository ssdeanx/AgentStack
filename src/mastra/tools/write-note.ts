import type { RequestContext } from '@mastra/core/request-context'
import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import { z } from 'zod'
import { log } from '../config/logger'
import { localWorkspacePath, mainFilesystem, mainSandbox } from '../workspaces'

export interface WriteNoteContext extends RequestContext {
    userId?: string
    workspaceId?: string
}

export const writeNoteTool = createTool({
    id: 'write',
    description: 'Write a new note or overwrite an existing one.',
    inputSchema: z.object({
        title: z
            .string()
            .nonempty()
            .describe('The title of the note. This will be the filename.'),
        content: z
            .string()
            .nonempty()
            .describe('The markdown content of the note.'),
    }),
    outputSchema: z.string().nonempty(),
     onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('writeNoteTool tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('writeNoteTool received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('writeNoteTool received input', {
            toolCallId,
            messageCount: messages.length,
            inputData: {
                title: input.title,
                content: input.content,
            },
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('writeNoteTool completed', {
            toolCallId,
            toolName,
            outputData: output,
            abortSignal: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
    execute: async (inputData, { writer, abortSignal, tracingContext, requestContext }) => {
        const requestCtx = requestContext as WriteNoteContext

        // Check if operation was already cancelled
        if (abortSignal?.aborted === true) {
            throw new Error('Write note operation cancelled')
        }

        const { userId, workspaceId } = requestCtx

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Input: title="${inputData.title}" - 📝 Starting note write operation`,
                stage: 'write',
            },
            id: 'write',
        })

        // Create child span for note writing operation
        const noteSpan = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'write-note',
            input: {
                title: inputData.title,
                contentLength: inputData.content.length,
            },
            metadata: {
                'tool.id': 'write',
                'tool.input.title': inputData.title,
                'tool.input.contentLength': inputData.content.length,
                'user.id': userId,
                'workspace.id': workspaceId,
                'workspace.path': localWorkspacePath,
                'sandbox.id': mainSandbox.id,
            },
            tracingContext,
        })

        const startTime = Date.now()

        try {
            const { title, content } = inputData
            
            // Basic sanitization to prevent path traversal
            const safeTitle = title.replace(/\.\./g, '').replace(/[\\/]/g, '_')
            const relativePath = `notes/${safeTitle}.md`

            // LocalFilesystem handles recursive directory creation and resolves relative to basePath
            await mainFilesystem.writeFile(relativePath, content)

            const result = `Successfully wrote to note "${title}".`

            // Update span with successful result
            noteSpan?.update({
                output: { success: true, relativePath },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.relativePath': relativePath,
                    'tool.output.processingTimeMs': Date.now() - startTime,
                },
            })
            noteSpan?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Input: title="${inputData.title}" - ✅ Note written successfully`,
                    stage: 'write',
                },
                id: 'write',
            })

            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)

            // Record error in span
            noteSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Input: title="${inputData.title}" - ❌ Note write failed: ${errorMessage}`,
                    stage: 'write',
                },
                id: 'write',
            })

            log.error(
                `Failed to write note "${inputData.title}": ${errorMessage}`
            )
            throw error
        }
    },
   
})

export type WriteNoteUITool = InferUITool<typeof writeNoteTool>
