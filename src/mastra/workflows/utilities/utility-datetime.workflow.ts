import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { dateTimeTool } from '../../tools'

const inputSchema = z.object({
    operation: z.enum(['parse', 'format', 'add', 'subtract', 'diff', 'now', 'validate']),
    input: z.string().optional(),
    format: z.string().optional(),
    amount: z.number().optional(),
    unit: z.enum(['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds']).optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    timezone: z.string().optional(),
})

const outputSchema = z.any()

const dateTimeStep = createStep({
    id: 'utility-datetime',
    inputSchema,
    outputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `📅 Running datetime operation: ${inputData.operation}`, stage: 'utility-datetime' }, id: 'utility-datetime' })
        const executeDateTime = dateTimeTool.execute as NonNullable<typeof dateTimeTool.execute>
        const result = await executeDateTime(inputData, { writer, requestContext, tracingContext, abortSignal })
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Datetime operation complete', stage: 'utility-datetime' }, id: 'utility-datetime' })
        return result
    },
})

export const utilityDateTimeWorkflow = createWorkflow({
    id: 'utility-datetime-workflow',
    description: 'Parse, format, and manipulate dates and times',
    inputSchema,
    outputSchema,
})
    .then(dateTimeStep)
    .commit()
