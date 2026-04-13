import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { calculatorTool, dateTimeTool } from '../../tools'

const inputSchema = z.object({
    start: z.string(),
    hours: z.number().positive().default(1),
    timezone: z.string().optional(),
})

const outputSchema = z.any()

const timeboxStep = createStep({
    id: 'gen-timebox',
    inputSchema,
    outputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `⏱️ Building a timebox from ${inputData.start}`, stage: 'gen-timebox' }, id: 'gen-timebox' })
        const executeDateTime = dateTimeTool.execute as NonNullable<typeof dateTimeTool.execute>
        const end = await executeDateTime({ operation: 'add', input: inputData.start, amount: inputData.hours, unit: 'hours', timezone: inputData.timezone }, { writer, requestContext, tracingContext, abortSignal })
        const executeCalculator = calculatorTool.execute as NonNullable<typeof calculatorTool.execute>
        const score = await executeCalculator({ expression: 'hours * 60', variables: { hours: inputData.hours }, precision: 0 }, { writer, requestContext, tracingContext, abortSignal })
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Timebox generated', stage: 'gen-timebox' }, id: 'gen-timebox' })
        return { start: inputData.start, hours: inputData.hours, end, minutes: score }
    },
})

export const genTimeboxWorkflow = createWorkflow({
    id: 'gen-timebox-workflow',
    description: 'Generate a timeboxed schedule window',
    inputSchema,
    outputSchema,
})
    .then(timeboxStep)
    .commit()
