import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { urlValidationTool } from '../../tools'

const inputSchema = z.object({
    url: z.string(),
    operations: z.array(z.enum(['validate', 'parse', 'normalize', 'shorten', 'check-reachability', 'extract-domain', 'get-metadata'])).optional(),
    options: z.object({ followRedirects: z.boolean().optional(), userAgent: z.string().optional(), timeout: z.number().optional() }).optional(),
})

const outputSchema = z.any()

const urlStep = createStep({
    id: 'utility-url',
    inputSchema,
    outputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `🔗 Validating URL: ${inputData.url}`, stage: 'utility-url' }, id: 'utility-url' })
        const executeUrl = urlValidationTool.execute as NonNullable<typeof urlValidationTool.execute>
        const result = await executeUrl(inputData, { writer, requestContext, tracingContext, abortSignal })
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ URL analysis complete', stage: 'utility-url' }, id: 'utility-url' })
        return result
    },
})

export const utilityUrlWorkflow = createWorkflow({
    id: 'utility-url-workflow',
    description: 'Validate and analyze URLs',
    inputSchema,
    outputSchema,
})
    .then(urlStep)
    .commit()
