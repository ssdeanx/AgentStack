import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { SpanType } from '@mastra/core/observability'
import type { TracingContext } from '@mastra/core/observability'

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
    execute: async ({ action }, context) => {
        const writer = context?.writer
        const tracingContext: TracingContext | undefined =
            context?.tracingContext

        const span = tracingContext?.currentSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'confirmation',
            input: { action },
            metadata: {
                'tool.id': 'confirmation-tool',
                'tool.input.action': action,
            },
            requestContext: context?.requestContext,
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

            span?.update({
                metadata: {
                    'tool.status': 'suspended',
                },
            })
            span?.end()

            return suspend?.({
                message: `Please confirm: ${action}`,
                action,
            })
        }

        const result = { confirmed: true, action }

        span?.update({
            output: result,
            metadata: {
                'tool.output.confirmed': true,
                'tool.status': 'completed',
            },
        })
        span?.end()

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
