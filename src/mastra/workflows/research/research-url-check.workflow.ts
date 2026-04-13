import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { urlValidationTool } from '../../tools'

const inputSchema = z.object({
    url: z.string(),
    operations: z.array(z.enum(['validate', 'parse', 'normalize', 'shorten', 'check-reachability', 'extract-domain', 'get-metadata'])).default(['validate', 'parse', 'extract-domain']),
})

const outputSchema = z.any()

const urlCheckStep = createStep({
    id: 'research-url-check',
    inputSchema,
    outputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `🔗 Validating research URL: ${inputData.url}`, stage: 'research-url-check' }, id: 'research-url-check' })
        const executeUrl = urlValidationTool.execute as NonNullable<typeof urlValidationTool.execute>
        const result = await executeUrl({ url: inputData.url, operations: inputData.operations }, { writer, requestContext, tracingContext, abortSignal })
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ URL validation complete', stage: 'research-url-check' }, id: 'research-url-check' })
        return result
    },
})

export const researchUrlCheckWorkflow = createWorkflow({
    id: 'research-url-check-workflow',
    description: 'Validate and inspect research URLs',
    inputSchema,
    outputSchema,
})
    .then(urlCheckStep)
    .commit()
