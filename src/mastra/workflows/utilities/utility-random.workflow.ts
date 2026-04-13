import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { randomGeneratorTool } from '../../tools'

const inputSchema = z.object({
    type: z.enum(['string', 'number', 'boolean', 'date', 'uuid', 'email', 'name', 'address', 'array', 'object']),
    count: z.number().int().positive().optional(),
    options: z
        .object({
            min: z.number().optional(),
            max: z.number().optional(),
            length: z.number().optional(),
            format: z.string().optional(),
            includeSpecial: z.boolean().optional(),
            locale: z.string().optional(),
        })
        .optional(),
})

const outputSchema = z.any()

const randomStep = createStep({
    id: 'utility-random',
    inputSchema,
    outputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `🎲 Generating random ${inputData.type}${inputData.count ? ` x${inputData.count}` : ''}`, stage: 'utility-random' }, id: 'utility-random' })
        const executeRandom = randomGeneratorTool.execute as NonNullable<typeof randomGeneratorTool.execute>
        const result = await executeRandom(inputData, { writer, requestContext, tracingContext, abortSignal })
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Random data generated', stage: 'utility-random' }, id: 'utility-random' })
        return result
    },
})

export const utilityRandomWorkflow = createWorkflow({
    id: 'utility-random-workflow',
    description: 'Generate random data for testing and development',
    inputSchema,
    outputSchema,
})
    .then(randomStep)
    .commit()
