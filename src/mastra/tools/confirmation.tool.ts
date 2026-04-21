import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import type { RequestContext } from '@mastra/core/request-context'
import type { TracingContext } from '@mastra/core/observability'
import type { BaseToolRequestContext } from './request-context.utils'
import { log } from '../config/logger'

const confirmationTool = createTool({
    id: 'confirmation-tool',
    description: 'Requests user confirmation before proceeding',
    inputSchema: z.object({
        action: z.string(),
    }),
    outputSchema: z.object({
        confirmed: z.boolean(),
        action: z.string(),
    }),
    suspendSchema: z.object({
        message: z.string(),
        action: z.string(),
    }),
    resumeSchema: z.object({
        confirmed: z.boolean(),
    }),
    strict: true,
    onInputStart: ({ toolCallId, messages }) => {
        log.info('Confirmation tool input streaming started', {
            toolCallId,
            messages: messages ?? [],
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages }) => {
        log.info('Confirmation tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messages: messages ?? [],
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages }) => {
        log.info('Confirmation tool received input', {
            toolCallId,
            messages: messages ?? [],
            inputData: { action: input.action },
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName }) => {
        log.info('Confirmation tool completed', {
            toolCallId,
            toolName,
            outputData:
                output && 'confirmed' in output ? { confirmed: output.confirmed } : {},
            hook: 'onOutput',
        })
    },
    execute: async ({ action }, context) => {
        const writer = context.writer
        const tracingContext: TracingContext | undefined =
            context.tracingContext
        const requestContext = context.requestContext as
            | RequestContext<BaseToolRequestContext>
            | undefined

        const userId = requestContext?.all.userId
        const workspaceId = requestContext?.all.workspaceId

        // Create root span using getOrCreateSpan (creates root OR attaches to parent)
        const rootSpan = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'confirmation',
            input: { action },
            metadata: {
                'tool.id': 'confirmation-tool',
                'tool.input.action': action,
                'user.id': userId,
                'workspace.id': workspaceId,
            },
            requestContext: context.requestContext,
            tracingContext,
        })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Input: action="${action}" - ❓ Requesting confirmation`,
                stage: 'confirmation-tool',
            },
            id: 'confirmation-tool',
        })

        const { resumeData, suspend } = context?.agent ?? {}

        // Explicitly check for true to avoid nullable boolean in condition
        if (resumeData?.confirmed !== true) {
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Input: action="${action}" - ⏸️ Execution suspended for confirmation`,
                    stage: 'confirmation-tool',
                },
                id: 'confirmation-tool',
            })

            rootSpan?.update({
                metadata: {
                    'tool.status': 'suspended',
                },
            })
            rootSpan?.end()

            if (typeof suspend === 'function') {
                await suspend({
                    message: `Please confirm: ${action}`,
                    action,
                })
            }

            return { confirmed: false, action }
        }

        const result = { confirmed: true, action }

        rootSpan?.update({
            output: result,
            metadata: {
                'tool.output.confirmed': true,
                'tool.status': 'completed',
                'tool.output.success': true,
            },
        })
        rootSpan?.end()

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'done',
                message: `Input: action="${action}" - ✅ Confirmed`,
                stage: 'confirmation-tool',
            },
            id: 'confirmation-tool',
        })

        return result
    },
})

export { confirmationTool }
