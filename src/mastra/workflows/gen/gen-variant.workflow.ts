import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { calculatorTool, randomGeneratorTool } from '../../tools'

const inputSchema = z.object({
    seed: z.string(),
    count: z.number().int().positive().default(3),
})

const outputSchema = z.any()

const hasData = (value: unknown): value is { data: unknown } =>
    typeof value === 'object' && value !== null && 'data' in value

const toStringList = (value: unknown) =>
    Array.isArray(value) ? value.map((item) => String(item)) : value == null ? [] : [String(value)]

const variantStep = createStep({
    id: 'gen-variant',
    inputSchema,
    outputSchema,
    execute: async ({ inputData, writer, requestContext, tracingContext, abortSignal }) => {
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `🎛️ Generating variants from ${inputData.seed}`, stage: 'gen-variant' }, id: 'gen-variant' })
        const executeRandom = randomGeneratorTool.execute as NonNullable<typeof randomGeneratorTool.execute>
        const variants = await executeRandom({ type: 'string', count: inputData.count, options: { length: 20 } }, { writer, requestContext, tracingContext, abortSignal })
        const executeCalculator = calculatorTool.execute as NonNullable<typeof calculatorTool.execute>
        const sizeScore = await executeCalculator({ expression: 'count * 10', variables: { count: inputData.count }, precision: 0 }, { writer, requestContext, tracingContext, abortSignal })
        await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Variants generated', stage: 'gen-variant' }, id: 'gen-variant' })
        return { seed: inputData.seed, variants: toStringList(hasData(variants) ? variants.data : null), sizeScore }
    },
})

export const genVariantWorkflow = createWorkflow({
    id: 'gen-variant-workflow',
    description: 'Generate seeded variants for creative tasks',
    inputSchema,
    outputSchema,
})
    .then(variantStep)
    .commit()
