import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { calculatorTool } from '../../tools'

const inputSchema = z.object({
    expression: z.string(),
    variables: z.record(z.string(), z.number()).optional(),
    precision: z.number().int().min(0).max(12).optional(),
})

const outputSchema = z.any()

const calculatorStep = createStep({
    id: 'utility-calculator',
    inputSchema,
    outputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `🔢 Evaluating expression: ${inputData.expression}`, stage: 'utility-calculator' }, id: 'utility-calculator' })
        const executeCalculator = calculatorTool.execute as NonNullable<typeof calculatorTool.execute>
        const result = await executeCalculator(inputData, { writer, requestContext, tracingContext, abortSignal })
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Expression evaluated', stage: 'utility-calculator' }, id: 'utility-calculator' })
        return result
    },
})

export const utilityCalculatorWorkflow = createWorkflow({
    id: 'utility-calculator-workflow',
    description: 'Evaluate a math expression with optional variables',
    inputSchema,
    outputSchema,
})
    .then(calculatorStep)
    .commit()
